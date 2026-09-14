// Owner: UI (GameView). LOC ≤ 400.
// B3/B7.4/B9: pointer workflow idle→selected→ghost→placed/rejected, 390×844 portrait,
// B2 suspend/resume, B8 AudioObserver, B11 night grade via events. HUD max 5 Elemente.
// DevGate: ?dev=1 / #dev zeigt Seed/Hash/Tick/EventLog/Particles/Inspector — Release hat 0 Dev-Surface.
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { MetaSave, BeetleSpecimen } from '../types';
import { SimulationRoot, makeCommand } from '../simulation/root';
import { saveRun } from '../persistence/runSave';
import { Renderer } from '../render/renderer';
import { Camera } from '../render/camera';
import { FeedbackLayer } from '../render/layers/feedback';
import { VisualObserver } from '../observers/visualObserver';
import { AudioObserver } from '../observers/audioObserver';
import { executeVisualCommand } from '../observers/visualExecutor';
import { ParticlePool } from '../observers/particles';
import { resolveBredVisuals, resolveVisual } from '../visual/generator';
import { strHash } from '../core/rng';
import { useI18n } from '../i18n';
import { PLANTS_SOURCE } from '../config/plants.source';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import { recordRunEnd, advanceCrossMaturation, updateMeta } from '../meta';
import { isDevActive } from '../dev/gate';
import { DevOverlay } from '../dev/DevOverlay';
import { Inspector } from '../dev/Inspector';

interface Props {
  seed: number; runId: number;
  loadout: string[]; savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  beetles: BeetleSpecimen[];
  audioOn: boolean;
  onMetaChange: (meta: MetaSave) => void; onExit: () => void;
}
interface HudSnapshot { wave: number; energy: number; lives: number; combo: number; inventory: Record<string, number>; paused: boolean; phase: import('../simulation/state').RunPhase; beetleDeployed: boolean; }
type Ghost = { visual: import('../visual/generator').ResolvedVisual; gx: number; gy: number; valid: boolean } | null;

function DropIcon(){ return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 1.5C7 1.5 2.8 6 2.8 9.1A4.2 4.2 0 0011.2 9.1C11.2 6 7 1.5 7 1.5Z" fill="#d9a441" stroke="#2b2b26" strokeWidth="1.2" strokeLinejoin="round"/><circle cx="5.4" cy="7.2" r="1" fill="white" opacity="0.85"/></svg>; }
function LeafHeartIcon(){ return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 11.2C7 11.2 2.3 8.4 2.3 5.6A2.7 2.7 0 017 3.1A2.7 2.7 0 0111.7 5.6C11.7 8.4 7 11.2 7 11.2Z" fill="#5a8f4e" stroke="#2b2b26" strokeWidth="1.2"/><path d="M7 3.1C7 3.1 7.8 4.6 7 6" stroke="#2b2b26" strokeWidth="0.9" strokeLinecap="round"/></svg>; }
function WaveIcon(){ return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M1.5 7 Q3.5 3.5 5.5 7 T9.5 7 T12.5 7" stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" fill="none"/><path d="M1.5 9 Q3.5 5.5 5.5 9 T9.5 9 T12.5 9" stroke="#2b2b26" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/></svg>; }

export function GameView({ seed, runId, loadout, savedVariants, bredStats, beetles, audioOn, onMetaChange, onExit }: Props){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<SimulationRoot | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const particlesRef = useRef<ParticlePool | null>(null);
  const observerRef = useRef<VisualObserver | null>(null);
  const audioRef = useRef<AudioObserver | null>(null);
  const pausedRef = useRef(false);
  const runEndedRef = useRef(false);

  const [selected, setSelected] = useState<string | null>(null);
  // P5: Platzier-Modus — 'plant' (Tray) oder ein Map-Tile-Typ. EIN Workflow, zwei Objekt-Klassen.
  const [placeMode, setPlaceMode] = useState<'plant' | MapTileType>('plant');
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [ghost, setGhost] = useState<Ghost>(null);
  const [suspended, setSuspended] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [fxOn, setFxOn] = useState(audioOn); // B8: audioOn aus dem Meta-Save ist der Startwert
  const [devTick, setDevTick] = useState(0);
  const [dpr, setDpr] = useState(1);
  const { t } = useI18n();
  const selectedRef = useRef<string | null>(null);
  const ghostRef = useRef<Ghost>(null);
  const cmdSeq = useRef(0);
  const placeModeRef = useRef<'plant' | MapTileType>('plant');
  const devActive = useMemo(() => isDevActive(), []);

  const ghostVisual = useCallback((variantId: string) => {
    const bred = resolveBredVisuals(savedVariants.filter(v => loadout.includes(v.id)), seed).get(variantId);
    if (bred) return bred;
    const baseId = variantId === 'rootwall' ? 'BASE_ROOT' : variantId === 'mycelia' ? 'BASE_MUSHROOM' : 'BASE_THORN';
    return resolveVisual({ baseId: baseId as never, extraIds: [], effectIds: [], visualSeed: strHash(`plant:${seed}:${variantId}`) });
  }, [seed, loadout, savedVariants]);

  const cancelPlacement = useCallback(() => {
    selectedRef.current = null; setSelected(null);
    ghostRef.current = null; setGhost(null);
    setPlaceMode('plant');
  }, []);

  const handleSelect = useCallback((id: string, count: number) => {
    if (count <= 0) return;
    const next = selectedRef.current === id ? null : id;
    selectedRef.current = next; setSelected(next);
    setPlaceMode('plant'); placeModeRef.current = 'plant';
    if (!next) { ghostRef.current = null; setGhost(null); }
  }, []);

  /** P5: Map-Tile für den Platzier-Modus wählen (kostet Energie, kein Inventar). */
  const handleSelectTile = useCallback((tile: MapTileType) => {
    const next = (selectedRef.current === tile && placeModeRef.current !== 'plant') ? null : tile;
    selectedRef.current = next; setSelected(next);
    setPlaceMode(next ?? 'plant'); placeModeRef.current = next ?? 'plant';
    if (!next) { ghostRef.current = null; setGhost(null); }
  }, []);

  const toggleFx = useCallback(() => {
    setFxOn(v => {
      const next = !v;
      observerRef.current?.setFxEnabled(next);
      audioRef.current?.setEnabled(next);
      // B8-Kopplung: der Toggle persistiert im Meta-Save (einziger Writer: persistence/).
      onMetaChange(updateMeta({ audioOn: next }));
      return next;
    });
  }, [onMetaChange]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const root = new SimulationRoot({ seed, runId, loadout, bredStats, beetles });
    rootRef.current = root;
    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;
    renderer.prepareTerrain(seed);
    renderer.setBredVisuals(resolveBredVisuals(savedVariants.filter(v => loadout.includes(v.id)), seed));
    const camera = new Camera();
    const observer = new VisualObserver(camera, fxOn);
    observerRef.current = observer;
    const audio = new AudioObserver(fxOn);
    audioRef.current = audio;
    const particles = new ParticlePool();
    particlesRef.current = particles;
    const feedback = new FeedbackLayer();

    for (const type of ['PROJECTILE_HIT','ENEMY_DIED','PLANT_PLACED','WAVE_COMPLETED','GAME_OVER','CRITICAL_HIT','PLACEMENT_REJECTED','DAMAGE_DEALT','WAVE_STARTED','NIGHT_STARTED','DAY_STARTED','SCORE_CHANGED','COMBO_CHANGED','REWARD_GRANTED','COINS_GRANTED','PLANT_GROWN','PLANT_WEAKENED','PLANT_WITHERED','PLANT_PROPAGATED','PLANT_FERTILIZED','BEETLE_DEPLOYED','BEETLE_DOWN','BEETLE_REJECTED'] as const){
      root.bus.subscribe(type, (e) => { observer.observe(e as never); audio.observe(e as never); });
    }
    root.bus.subscribe('NIGHT_STARTED', () => renderer.setNight(true));
    root.bus.subscribe('DAY_STARTED', () => renderer.setNight(false));
    root.bus.subscribe('GAME_OVER', () => setShowGameOver(true));

    const onResize = () => {
      renderer.resize();
      setDpr(Math.min(window.devicePixelRatio || 1, 2));
    };
    window.addEventListener('resize', onResize);
    onResize();

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pausedRef.current = true; root.clock.setPaused(true);
        saveRun(root.getSnapshot());
        setSuspended(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const adaptBudget = () => {
      const n = particles.activeCount;
      if (n > 70) particles.setBudget('CHAOS');
      else if (n > 40) particles.setBudget('BUSY');
      else particles.setBudget('NORMAL');
    };

    let raf = 0; let last = performance.now(); let saveAccum = 0; let hudAccum = 0;
    const tick = (now: number) => {
      const dt = now - last; last = now;
      if (!pausedRef.current) root.advance(dt);
      for (const c of observer.drain()) executeVisualCommand(c, particles, camera, feedback);
      particles.update(); feedback.update(); camera.update(); adaptBudget();
      const cs = camera.get();
      renderer.render(root.getSnapshot(), particles, feedback, cs.shakeOffset.x, cs.shakeOffset.y, ghostRef.current);
      saveAccum += dt; hudAccum += dt;
      if (hudAccum > 100) {
        hudAccum = 0;
        const s = root.getSnapshot();
        if (s.phase === 'gameover' && !runEndedRef.current) {
          runEndedRef.current = true;
          const next = recordRunEnd(s.wave.number, s.nektarEarned);
          advanceCrossMaturation(s.wave.number);
          onMetaChange(next);
        }
        setHud({ wave: s.wave.number, energy: s.resources.energy, lives: s.lives, combo: s.combo.count, inventory: { ...s.inventory }, paused: pausedRef.current, phase: s.phase, beetleDeployed: s.deployedBeetle !== null });
        if (devActive) setDevTick(v => v + 1);
      }
      if (saveAccum > 10000) { saveAccum = 0; saveRun(root.getSnapshot()); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const unlockOnce = () => { audio.unlock(); window.removeEventListener('pointerdown', unlockOnce); };
    window.addEventListener('pointerdown', unlockOnce, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', unlockOnce);
      saveRun(root.getSnapshot());
    };
    // fxOn is deliberately NOT a dependency: FX is presentation-only and must never
    // tear down + rebuild the simulation root (that would restart the run). The
    // observers expose setFxEnabled/setEnabled for live toggling instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, runId, loadout, savedVariants, bredStats, onMetaChange, devActive]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedRef.current) return;
    const renderer = rendererRef.current; if (!renderer) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const cell = renderer.gridFromPixel(e.clientX - rect.left, e.clientY - rect.top);
    if (!cell) { ghostRef.current = null; setGhost(null); return; }
    const snap = rootRef.current?.getSnapshot();
    // Tile-Modus: Zelle frei von Pflanzen genügt; Plant-Modus: Zelle frei von Pflanzen
    const occupied = snap?.plants.some(p => p.gx === cell.gx && p.gy === cell.gy) ?? false;
    const valid = !occupied;
    const visual = ghostVisual(selectedRef.current);
    const next = { visual, gx: cell.gx, gy: cell.gy, valid };
    ghostRef.current = next; setGhost(next);
  }, [ghostVisual]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedRef.current) return;
    const renderer = rendererRef.current; const root = rootRef.current;
    if (!renderer || !root) return;
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const cell = renderer.gridFromPixel(e.clientX - rect.left, e.clientY - rect.top);
    if (!cell) return;
    if (placeModeRef.current !== 'plant') {
      // P5: Map-Tile platzieren — gleicher Command-Pfad, andere Command-Art
      root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_TILE', ++cmdSeq.current, { gx: cell.gx, gy: cell.gy, tile: placeModeRef.current }));
      return;
    }
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', ++cmdSeq.current, { variantId: selectedRef.current!, gx: cell.gx, gy: cell.gy }));
  }, []);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    rootRef.current?.clock.setPaused(pausedRef.current);
    setHud(h => h ? { ...h, paused: pausedRef.current } : h);
  }, []);

  const handleStartWave = useCallback(() => {
    const root = rootRef.current; if (!root) return;
    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', ++cmdSeq.current, {}));
  }, []);

  /** P6: Brutling einsetzen — eigener Command-Pfad (Spawns während Welle oder Vorbereitung). */
  const handleDeployBeetle = useCallback(() => {
    const root = rootRef.current; if (!root) return;
    const brood = beetles[beetles.length - 1];
    if (!brood) return;
    root.commands.push(makeCommand(root.clock.get().tick, 'DEPLOY_BEETLE', ++cmdSeq.current, { beetleId: brood.id }));
  }, [beetles]);

  const plantIds = Array.from(new Set([...Object.keys(PLANTS_SOURCE), ...loadout]));
  const inspectorVisual = ghost?.visual ?? (selected ? ghostVisual(selected) : null);
  const inspectorLabel = ghost ? `ghost ${ghost.gx},${ghost.gy}` : (selected ?? '—');

  return (
    <div style={styles.shell}>
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={styles.logo}>LifeSeedLab</span>
          <span style={styles.sub}>Forschungsbuch • Welle {hud?.wave ?? 1}</span>
        </div>
        <div style={styles.topRight}>
          <button onClick={togglePause} style={styles.btn} aria-label={hud?.paused ? 'Fortsetzen' : 'Pause'}>{hud?.paused ? '▶' : '❚❚'}</button>
          <button onClick={handleStartWave} style={{ ...styles.btn, ...styles.btnPrimary }}>{t('game.startWave')}</button>
          <button onClick={onExit} style={styles.btn}>{t('game.exitRun')}</button>
          {beetles.length > 0 && !hud?.beetleDeployed && (
            <button onClick={handleDeployBeetle} style={{ ...styles.btn, ...styles.btnBeetle }} title={`${beetles[beetles.length - 1].name} einsetzen`}>
              {t('game.deployBeetle')}
            </button>
          )}
        </div>
      </div>

      <div style={styles.stage}>
        <div style={styles.canvasFrame}>
          <canvas
            ref={canvasRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => { ghostRef.current = null; setGhost(null); }}
            style={{ ...styles.canvas, cursor: selected ? 'crosshair' : 'default' }}
          />
          {hud && (
            <div style={styles.hud} aria-label="Spielstatus">
              <span style={styles.hudChip}><DropIcon/> {hud.energy}</span>
              <span style={styles.hudChip}><LeafHeartIcon/> {hud.lives}</span>
              <span style={styles.hudChip}><WaveIcon/> W {hud.wave}</span>
              {hud.combo > 1 && <span style={{ ...styles.hudChip, ...styles.hudChipCombo }}>×{hud.combo}</span>}
              {hud.paused && <span style={{ ...styles.hudChip, background: '#fef3c7' }}>Pause</span>}
            </div>
          )}
          {selected && (
            <button onClick={cancelPlacement} style={styles.cancelBtn} aria-label="Platzierung abbrechen">✕ Abbrechen</button>
          )}
          {devActive && rootRef.current !== null && (
            <>
              <DevOverlay
                revision={devTick}
                getSnapshot={() => rootRef.current!.getSnapshot()}
                busRecent={() => rootRef.current!.bus.getRecent()}
                particleInfo={() => {
                  const p = particlesRef.current;
                  return { active: p?.activeCount ?? 0, cap: p?.cap ?? 0, budget: p?.budgetName ?? 'NORMAL' };
                }}
                fxEnabled={fxOn}
                onToggleFx={toggleFx}
                dpr={dpr}
              />
              <Inspector visual={inspectorVisual} entityLabel={inspectorLabel} />
            </>
          )}
          <div style={styles.tray} role="toolbar" aria-label="Pflanzenauswahl">
            {plantIds.map(id => {
              const count = hud?.inventory[id] ?? 0;
              const isSel = selected === id && placeMode === 'plant'; const disabled = count <= 0;
              return (
                <button
                  key={id}
                  onClick={() => handleSelect(id, count)}
                  style={{ ...styles.trayItem, ...(isSel ? styles.trayItemSelected : {}), ...(disabled ? styles.trayItemDisabled : {}) }}
                  aria-pressed={isSel} aria-disabled={disabled} title={id}
                >
                  <span style={styles.trayDot} aria-hidden/>
                  <span style={styles.trayName}>{id}</span>
                  <span style={styles.trayCount}>×{count}</span>
                </button>
              );
            })}
            {/* P5: Map-Tiles — Wege lenken Gegner, Töpfe tragen Pflanzen, Findlinge blockieren */}
            {(Object.keys(MAP_TILES_SOURCE) as MapTileType[]).map(tile => {
              const isSel = selected === tile && placeMode === tile;
              const affordable = (hud?.energy ?? 0) >= MAP_TILES_SOURCE[tile].cost;
              return (
                <button
                  key={tile}
                  onClick={() => handleSelectTile(tile)}
                  style={{ ...styles.trayItem, ...(isSel ? styles.trayItemSelected : {}), ...(affordable ? {} : styles.trayItemDisabled) }}
                  aria-pressed={isSel} aria-disabled={!affordable} title={`${tile} (${MAP_TILES_SOURCE[tile].cost} Energie)`}
                >
                  <span style={{ ...styles.trayDot, background: tile === 'path' ? '#d9c9a3' : tile === 'pot' ? '#c96f3b' : tile === 'boulder' ? '#9a948a' : '#c96f8e' }} aria-hidden/>
                  <span style={styles.trayName}>{tile}</span>
                  <span style={styles.trayCount}>{MAP_TILES_SOURCE[tile].cost}⚡</span>
                </button>
              );
            })}
          </div>
          {showGameOver && (
            <div style={styles.gameOver}>
              <div style={styles.gameOverCard}>
                <div style={styles.gameOverTitle}>Game Over</div>
                <div style={styles.gameOverSub}>Welle {hud?.wave ?? 0} • Score {rootRef.current?.getSnapshot().score ?? 0}</div>
                <div style={styles.gameOverRow}>
                  <button onClick={() => { setShowGameOver(false); rootRef.current = null; onExit(); }} style={{ ...styles.btn, ...styles.btnPrimary }}>Neuer Run</button>
                  <button onClick={onExit} style={styles.btn}>Menü</button>
                </div>
              </div>
            </div>
          )}
          {suspended && (
            <button onClick={() => { setSuspended(false); pausedRef.current = false; rootRef.current?.clock.setPaused(false); }} style={styles.resumeOverlay} aria-label="Fortsetzen">
              <span style={styles.resumeCard}>Tippen zum Fortsetzen</span>
            </button>
          )}
        </div>
        <div style={styles.paperNote} aria-hidden><span style={styles.paperNotePin}/> Tippe eine Pflanze unten, ziehe den Geist übers Feld — Tap platziert, ✕ bricht ab. Welt ist Papier, Pflanzen sind lebendig.</div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', position: 'relative' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: '#fbf6e9', borderBottom: '2px solid var(--ink)', boxShadow: '0 2px 0 rgba(43,43,38,0.06)', zIndex: 2 },
  topLeft: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  logo: { fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0.3 },
  sub: { fontSize: 11, color: '#6b6250', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' },
  topRight: { display: 'flex', gap: 8, alignItems: 'center' },
  btn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', lineHeight: 1, minHeight: 44, minWidth: 44 },
  btnPrimary: { background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)' },
  btnBeetle: { background: '#d9a441', color: '#2b2b26', borderColor: 'var(--ink)' },
  stage: { flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 10px 8px', background: 'var(--paper)' },
  canvasFrame: { position: 'relative', width: '100%', maxWidth: 860, flex: 1, minHeight: 0, background: '#fff', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink), 0 14px 32px rgba(43,43,38,0.16)', overflow: 'hidden', display: 'flex' },
  canvas: { width: '100%', height: '100%', display: 'block', touchAction: 'none', flex: 1 },
  hud: { position: 'absolute', top: 10, left: 10, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 1 },
  hudChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 },
  hudChipCombo: { background: 'var(--paper-warm)', borderColor: 'var(--ink)', color: 'var(--ink)' },
  cancelBtn: { position: 'absolute', top: 10, right: 10, zIndex: 2, padding: '8px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, boxShadow: '2px 2px 0 var(--ink)', fontSize: 12, fontWeight: 800, cursor: 'pointer', minHeight: 44 },
  tray: { position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: '10px 12px', background: '#fbf6e9', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink)', maxWidth: 'calc(100% - 20px)', overflowX: 'auto' },
  trayItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, cursor: 'pointer', color: 'var(--ink)', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)', minWidth: 76, flexShrink: 0, lineHeight: 1.1, minHeight: 64 },
  trayItemSelected: { background: '#f0fdf4', borderColor: 'var(--leaf)', boxShadow: '2px 2px 0 var(--leaf-dark)' },
  trayItemDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  trayDot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--leaf)', border: '1.5px solid var(--ink)', flexShrink: 0 },
  trayName: { fontSize: 11, color: 'var(--ink)', textAlign: 'center', wordBreak: 'break-word', maxWidth: 72 },
  trayCount: { fontSize: 11, color: '#6b6250', fontWeight: 800 },
  gameOver: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,43,38,0.45)', zIndex: 3 },
  gameOverCard: { background: '#fbf6e9', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minWidth: 260 },
  gameOverTitle: { fontSize: 22, fontWeight: 800, color: 'var(--ink)' },
  gameOverSub: { fontSize: 13, color: '#6b6250', fontWeight: 600 },
  gameOverRow: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  resumeOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,239,220,0.75)', zIndex: 3, border: 'none', cursor: 'pointer', width: '100%', height: '100%' },
  resumeCard: { background: '#fff', border: '2px solid var(--ink)', borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', padding: '14px 18px', fontSize: 14, fontWeight: 800, color: 'var(--ink)' },
  paperNote: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 10, boxShadow: '2px 2px 0 var(--ink)', fontSize: 11, color: '#6b6250', fontWeight: 600, maxWidth: 860, width: '100%', justifyContent: 'center', textAlign: 'center' as const },
  paperNotePin: { width: 8, height: 8, borderRadius: '50%', background: 'var(--nektar)', border: '1.5px solid var(--ink)', display: 'inline-block', flexShrink: 0 },
};
