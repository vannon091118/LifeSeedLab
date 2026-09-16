// Owner: UI (GameView). LOC ≤ 400.
// B3/B7.4/B9: Pointer-Workflow über PlacementController (idle→selected→ghost→placed/rejected),
// 390×844 portrait, B2 suspend/resume, B8 AudioObserver, B11 night grade via events.
// HUD max 5 Elemente. DevGate: ?dev=1 / #dev — Release hat 0 Dev-Surface.
// Ausgelagert: PlacementTray (Karten), GameOverlays (Game Over / Fortsetzen),
// GameIcons (HUD-Glyphen) und gameViewStyles (Präsentations-Styling).
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { MetaSave, BeetleSpecimen } from '../types';
import { SimulationRoot, makeCommand } from '../simulation/root';
import { saveRun, clearRun, type RunSave } from '../persistence/runSave';
import { Renderer } from '../render/renderer';
import { ghostForRender } from './ghostPreview';
import { Camera } from '../render/camera';
import { FeedbackLayer } from '../render/layers/feedback';
import { VisualObserver } from '../observers/visualObserver';
import { AudioObserver } from '../observers/audioObserver';
import { executeVisualCommand } from '../observers/visualExecutor';
import { ParticlePool } from '../observers/particles';
import { resolveBredVisuals, resolveVisual } from '../visual/generator';
import { strHash } from '../core/rng';
import { makePlacementRejected } from '../bus/commands';
import { resolvePlantStats } from '../simulation/plantSystem';
import { PlacementController, type PlacementState, type UiRejectReason } from './placementController';
import { PlacementTray } from './PlacementTray';
import { GameOverlays } from './GameOverlays';
import { useI18n } from '../i18n';
import { PLANTS_SOURCE } from '../config/plants.source';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import { recordRunEnd, advanceCrossMaturation, updateMeta } from '../meta';
import { GameDevPanel } from './GameDevPanel';
import { GameTopBar } from './GameTopBar';
import { TutorialLayer } from './tutorial/TutorialLayer';
import { DropChipIcon, LivesChipIcon, WaveChipIcon } from './GameIcons';
import { gameViewStyles as styles } from './gameViewStyles';
import { hudOf, type HudSnapshot } from './hudSnapshot';
import { isDevActive } from '../dev/gate';
import { bindSimRoot, installTestHooks, unbindSimRoot } from '../dev/testHooks';

interface Props {
  seed: number; runId: number;
  loadout: string[]; savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  beetles: BeetleSpecimen[];
  audioOn: boolean;
  /** B2: gespeicherter Run-Zustand — nur gesetzt, wenn der Spieler „Fortsetzen" wählt. */
  resume?: RunSave | null;
  onMetaChange: (meta: MetaSave) => void; onExit: () => void;
}

const IDLE: PlacementState = { mode: 'plant', variantId: null, ghost: null, rejection: null };

export function GameView({ seed, runId, loadout, savedVariants, bredStats, beetles, audioOn, resume, onMetaChange, onExit }: Props){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<SimulationRoot | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const particlesRef = useRef<ParticlePool | null>(null);
  const observerRef = useRef<VisualObserver | null>(null);
  const audioRef = useRef<AudioObserver | null>(null);
  const placementRef = useRef<PlacementController | null>(null);
  const pausedRef = useRef(false); const holdRef = useRef(false); // B21: Tutorial-Hold (Präsentation)
  const runEndedRef = useRef(false);

  const [placement, setPlacement] = useState<PlacementState>(IDLE);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [fxOn, setFxOn] = useState(audioOn); // B8: audioOn aus dem Meta-Save ist der Startwert
  const [devTick, setDevTick] = useState(0);
  const [placedCount, setPlacedCount] = useState(0); // B21: UI-Zähler angenommener Drops
  const [dpr, setDpr] = useState(1);
  const { t } = useI18n();
  const cmdSeq = useRef(0);
  const placementMirror = useRef<PlacementState>(IDLE);
  const devActive = useMemo(() => isDevActive(), []);
  // B21: Der Hold ist das einzige, was das Onboarding von hier braucht — Sichtbarkeit, Schritt
  // und Persistenz besitzt der Screen-Router (TutorialProvider). Kein zweiter Zustand.
  const tutorialHold = useCallback((hold: boolean) => { holdRef.current = hold; }, []);

  const ghostVisual = useCallback((variantId: string) => {
    const bred = resolveBredVisuals(savedVariants.filter(v => loadout.includes(v.id)), seed).get(variantId);
    if (bred) return bred;
    const baseId = variantId === 'rootwall' ? 'BASE_ROOT' : variantId === 'mycelia' ? 'BASE_MUSHROOM' : 'BASE_THORN';
    return resolveVisual({ baseId: baseId as never, extraIds: [], effectIds: [], visualSeed: strHash(`plant:${seed}:${variantId}`) });
  }, [seed, loadout, savedVariants]);

  /** Einzige Brücke vom Controller in den React-Render (Mirror hält den Render-Loop aktuell). */
  const applyPlacement = useCallback((next: PlacementState) => {
    placementMirror.current = next;
    setPlacement(next);
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
    const root = new SimulationRoot({ seed, runId, loadout, bredStats, beetles, resume: resume ?? undefined });
    rootRef.current = root;
    installTestHooks(); bindSimRoot(root); // DevGate-only E2E-Brücke (Release: no-op)
    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;
    // B16.1: kein Terrain-Prime mehr — der Bake hängt an (Seed, aktive Route) und
    // passiert lazy im Render aus dem State (leere Map ⇒ DEFAULT-Pfad, wie bisher).
    renderer.setBredVisuals(resolveBredVisuals(savedVariants.filter(v => loadout.includes(v.id)), seed));
    const camera = new Camera();
    const observer = new VisualObserver(camera, fxOn);
    observerRef.current = observer;
    const audio = new AudioObserver(fxOn);
    audioRef.current = audio;
    const particles = new ParticlePool();
    particlesRef.current = particles;
    const feedback = new FeedbackLayer();

    // B3: Zustandsmaschine liest Sim (read-only) und Präsentation — sie schreibt nichts.
    const controller = new PlacementController({
      visualFor: (variantId) => ghostVisual(variantId),
      statsFor: (variantId) => {
        const stats = resolvePlantStats(root.getSnapshot(), variantId);
        return stats ? { cost: stats.cost, range: stats.range } : null;
      },
      board: () => {
        const snap = root.getSnapshot();
        return {
          plants: snap.plants.map(p => ({ gx: p.gx, gy: p.gy })),
          inventory: snap.inventory,
          energy: snap.resources.energy,
          mapTiles: snap.mapTiles,
        };
      },
      tileCost: (tile) => MAP_TILES_SOURCE[tile].cost,
      tick: () => root.getSnapshot().clock.tick,
    });
    placementRef.current = controller;
    applyPlacement(controller.getState());
    // B22: Erst-Anzeige sofort — sonst zeigt die Tray bis zum ersten HUD-Takt „×0" und alle
    // Karten sind `aria-disabled`, obwohl der Bestand längst in der Sim liegt.
    setHud(hudOf(root.getSnapshot(), pausedRef.current));

    for (const type of ['PROJECTILE_HIT','ENEMY_DIED','PLANT_PLACED','WAVE_COMPLETED','GAME_OVER','CRITICAL_HIT','PLACEMENT_REJECTED','TILE_REJECTED','DAMAGE_DEALT','WAVE_STARTED','NIGHT_STARTED','DAY_STARTED','SCORE_CHANGED','COMBO_CHANGED','REWARD_GRANTED','COINS_GRANTED','PLANT_GROWN','PLANT_WEAKENED','PLANT_WITHERED','PLANT_PROPAGATED','PLANT_FERTILIZED','BEETLE_DEPLOYED','BEETLE_DOWN','BEETLE_REJECTED'] as const){
      root.bus.subscribe(type, (e) => { observer.observe(e as never); audio.observe(e as never); });
    }
    root.bus.subscribe('NIGHT_STARTED', () => renderer.setNight(true));
    root.bus.subscribe('DAY_STARTED', () => renderer.setNight(false));
    // B17.4: die Reifung zählt die ANGEBROCHENE Welle — WAVE_STARTED feuert genau einmal pro
    // Welle (nur startWave), also keine Doppelzählung: Tod in Welle 1 bringt genau +1 (A19.5).
    // Ein Writer: meta/economy.ts.
    root.bus.subscribe('WAVE_STARTED', () => { advanceCrossMaturation(1); });
    // Run-Ende ist eventgetrieben (BUS = Handover, B7.5): recordRunEnd genau einmal im Event-Ack,
    // Guard nur gegen StrictMode-Remount. Kein advanceCrossMaturation: Wellen sind schon gezählt.
    root.bus.subscribe('GAME_OVER', (e) => {
      if (runEndedRef.current) return;
      runEndedRef.current = true;
      try {
        const next = recordRunEnd(e.payload.wave, root.getSnapshot().nektarEarned);
        onMetaChange(next);
        void clearRun(); // B2: ein beendeter Run ist nicht resumierbar
      } catch { /* meta persist must never break the run screen */ }
      setShowGameOver(true);
    });

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
      if (!pausedRef.current && !holdRef.current) root.advance(dt);
      for (const c of observer.drain()) executeVisualCommand(c, particles, camera, feedback);
      particles.update(); feedback.update(); camera.update(); adaptBudget();
      const cs = camera.get();
      renderer.render(root.getSnapshot(), particles, feedback, cs.shakeOffset.x, cs.shakeOffset.y, ghostForRender(placementMirror.current, root.getSnapshot().clock.tick));
      saveAccum += dt; hudAccum += dt;
      if (hudAccum > 100) {
        hudAccum = 0;
        const s = root.getSnapshot();
        setHud(hudOf(s, pausedRef.current));
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
      placementRef.current = null;
      unbindSimRoot(root);
    };
    // fxOn is deliberately NOT a dependency: FX is presentation-only and must never tear down +
    // rebuild the root (that restarts the run); observers toggle live via setFxEnabled/setEnabled.
    // loadout/savedVariants/bredStats/resume are NOT dependencies either: the sim is built from
    // meta AT RUN START (A19). A mid-run onMetaChange (GAME_OVER banking, FX toggle, B21
    // onboarding) must not rebuild it — a rebuild resurrects a fresh root BEHIND the Game-Over
    // overlay (zombie sim: auto-started waves inflate totalWavesSurvived, saveRun overwrites the
    // dead run and makes it resumable). New runs remount via key={meta.runId} in App.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, runId, onMetaChange, devActive]);

  /** Ablehnung der UI zeigt exakt die FX der Sim-Ablehnung (eine FX-Wahrheit, kein Bus-Write). */
  const emitRejectionFx = useCallback((reason: UiRejectReason, gx: number, gy: number) => {
    const root = rootRef.current; const observer = observerRef.current;
    if (!root || !observer) return;
    const contract = reason === 'no_energy_tile' || reason === 'unknown' ? 'on_path' : reason;
    const event = makePlacementRejected(root.getSnapshot().clock.tick, ++cmdSeq.current, gx, gy, contract);
    observer.observe(event as never);
    audioRef.current?.observe(event as never);
  }, []);

  const cellFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current; if (!renderer) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    return renderer.gridFromPixel(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const controller = placementRef.current; if (!controller) return;
    applyPlacement(controller.hover(cellFromEvent(e)));
  }, [applyPlacement, cellFromEvent]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const controller = placementRef.current; const root = rootRef.current;
    if (!controller || !root) return;
    const cell = cellFromEvent(e); if (!cell) return;
    const decision = controller.drop(cell);
    if (decision.kind === 'plant') {
      setPlacedCount(n => n + 1); // B21: UI-Signal — greift auch, solange das Tutorial die Sim hält.
      root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', ++cmdSeq.current, { variantId: decision.variantId, gx: decision.gx, gy: decision.gy }));
    } else if (decision.kind === 'tile') {
      // Tiles entscheidet die Sim (TILE_REJECTED fängt Baubereich/Korridor ab) — gleicher Command-Pfad.
      root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_TILE', ++cmdSeq.current, { gx: decision.gx, gy: decision.gy, tile: decision.tile }));
    } else if (decision.kind === 'reject') {
      emitRejectionFx(decision.reason, decision.gx, decision.gy);
    }
    applyPlacement(controller.getState());
  }, [applyPlacement, cellFromEvent, emitRejectionFx]);

  const cancelPlacement = useCallback(() => {
    const controller = placementRef.current; if (!controller) return;
    applyPlacement(controller.cancel());
  }, [applyPlacement]);

  const selectPlant = useCallback((variantId: string, count: number) => {
    const controller = placementRef.current; if (!controller) return;
    applyPlacement(controller.selectFromTray(variantId, count));
  }, [applyPlacement]);

  const selectTile = useCallback((tile: MapTileType) => {
    const controller = placementRef.current; if (!controller) return;
    applyPlacement(controller.selectTile(tile));
  }, [applyPlacement]);

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
  const inspectorVisual = placement.ghost?.visual ?? (placement.variantId ? ghostVisual(placement.variantId) : null);
  const inspectorLabel = placement.ghost ? `ghost ${placement.ghost.gx},${placement.ghost.gy}` : (placement.variantId ?? '—');

  return (
    <div style={styles.shell}>
      <GameTopBar
        wave={hud?.wave ?? 1}
        paused={hud?.paused ?? false}
        canDeployBeetle={beetles.length > 0 && !hud?.beetleDeployed}
        deployLabel={beetles[beetles.length - 1]?.name ?? ''}
        onTogglePause={togglePause}
        onStartWave={handleStartWave}
        onDeployBeetle={handleDeployBeetle}
        onExit={onExit}
      />

      <div style={styles.stage}>
        <div style={styles.canvasFrame}>
          <canvas
            ref={canvasRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => placementRef.current && applyPlacement(placementRef.current.hover(null))}
            data-tut="board"
            style={{ ...styles.canvas, cursor: placement.variantId ? 'crosshair' : 'default' }}
          />
          {hud && (
            <div style={styles.hud} aria-label="Spielstatus" data-tut="hud">
              <span style={styles.hudChip}><DropChipIcon/> {hud.energy}</span>
              <span style={styles.hudChip}><LivesChipIcon/> {hud.lives}</span>
              <span style={styles.hudChip}><WaveChipIcon/> W {hud.wave}</span>
              {hud.combo > 1 && <span style={{ ...styles.hudChip, ...styles.hudChipCombo }}>×{hud.combo}</span>}
              {hud.paused && <span style={{ ...styles.hudChip, background: '#fef3c7' }}>Pause</span>}
            </div>
          )}
          {placement.variantId !== null || placement.mode !== 'plant' ? (
            <button onClick={cancelPlacement} style={styles.cancelBtn} aria-label="Platzierung abbrechen">✕ Abbrechen</button>
          ) : null}
          <GameDevPanel
            active={devActive && rootRef.current !== null}
            revision={devTick}
            dpr={dpr}
            fxEnabled={fxOn}
            onToggleFx={toggleFx}
            getSnapshot={() => rootRef.current!.getSnapshot()}
            busRecent={() => rootRef.current!.bus.getRecent()}
            particleInfo={() => {
              const p = particlesRef.current;
              return { active: p?.activeCount ?? 0, cap: p?.cap ?? 0, budget: p?.budgetName ?? 'NORMAL' };
            }}
            visual={inspectorVisual}
            entityLabel={inspectorLabel}
          />
          <PlacementTray
            plantIds={plantIds}
            inventory={hud?.inventory ?? {}}
            energy={hud?.energy ?? 0}
            mode={placement.mode}
            variantId={placement.variantId}
            onSelectPlant={selectPlant}
            onSelectTile={selectTile}
          />
          <GameOverlays
            gameOver={showGameOver}
            suspended={suspended}
            wave={hud?.wave ?? 0}
            score={rootRef.current?.getSnapshot().score ?? 0}
            onNewRun={() => { setShowGameOver(false); rootRef.current = null; onExit(); }}
            onMenu={onExit}
            onResume={() => { setSuspended(false); pausedRef.current = false; rootRef.current?.clock.setPaused(false); }}
          />
        </div>
        <TutorialLayer
          run={{ selectedVariant: placement.variantId, placements: placedCount, phase: hud?.phase ?? 'prep', paused: hud?.paused ?? false }}
          onHold={tutorialHold}
        />
        <div style={styles.paperNote} aria-hidden><span style={styles.paperNotePin}/> {t('game.hint')}</div>
      </div>
    </div>
  );
}
