// Owner: UI (GameView). LOC ≤ 400.
// UI reads state, sends commands. All game logic lives in SimulationRoot.
// Papercraft: Welt = Papierfläche mit Drop-Shadow, HUD = Notizzettel, Tray = Pappschild mit Büroklammer.

import { useRef, useEffect, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { MetaSave } from '../types';
import { SimulationRoot, makeCommand } from '../simulation/root';
import { saveRun } from '../persistence/runSave';
import { Renderer } from '../render/renderer';
import { Camera } from '../render/camera';
import { FeedbackLayer } from '../render/layers/feedback';
import { VisualObserver } from '../observers/visualObserver';
import { executeVisualCommand } from '../observers/visualExecutor';
import { ParticlePool } from '../observers/particles';
import { resolveBredVisuals } from '../visual/generator';
import { useI18n } from '../i18n';
import { PLANTS_SOURCE } from '../config/plants.source';
import { recordRunEnd, advanceCrossMaturation } from '../meta';

interface Props {
  seed: number;
  runId: number;
  loadout: string[];
  savedVariants: MetaSave['savedVariants'];
  bredStats: NonNullable<MetaSave['bredStats']>;
  onMetaChange: (meta: MetaSave) => void;
  onExit: () => void;
}

interface HudSnapshot {
  wave: number;
  energy: number;
  lives: number;
  combo: number;
  inventory: Record<string, number>;
}

function DropIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5C7 1.5 2.8 6 2.8 9.1A4.2 4.2 0 0011.2 9.1C11.2 6 7 1.5 7 1.5Z" fill="#d9a441" stroke="#2b2b26" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="5.4" cy="7.2" r="1" fill="white" opacity="0.85" />
    </svg>
  );
}
function LeafHeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 11.2C7 11.2 2.3 8.4 2.3 5.6A2.7 2.7 0 017 3.1A2.7 2.7 0 0111.7 5.6C11.7 8.4 7 11.2 7 11.2Z" fill="#5a8f4e" stroke="#2b2b26" strokeWidth="1.2" />
      <path d="M7 3.1C7 3.1 7.8 4.6 7 6" stroke="#2b2b26" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function WaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1.5 7 Q3.5 3.5 5.5 7 T9.5 7 T12.5 7" stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M1.5 9 Q3.5 5.5 5.5 9 T9.5 9 T12.5 9" stroke="#2b2b26" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

export function GameView({ seed, runId, loadout, savedVariants, bredStats, onMetaChange, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<SimulationRoot | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const runEndedRef = useRef(false);

  const [selected, setSelected] = useState<string | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const { t } = useI18n();
  const selectedRef = useRef<string | null>(null);
  const cmdSeq = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const root = new SimulationRoot({ seed, runId, loadout, bredStats });
    rootRef.current = root;

    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;
    renderer.prepareTerrain(seed);
    renderer.setBredVisuals(resolveBredVisuals(
      savedVariants.filter(variant => loadout.includes(variant.id)),
      seed,
    ));
    const camera = new Camera();
    cameraRef.current = camera;
    const observer = new VisualObserver(camera, true);
    const particles = new ParticlePool();
    const feedback = new FeedbackLayer();

    for (const type of ['PROJECTILE_HIT', 'ENEMY_DIED', 'PLANT_PLACED', 'WAVE_COMPLETED', 'GAME_OVER', 'CRITICAL_HIT', 'PLACEMENT_REJECTED', 'DAMAGE_DEALT', 'WAVE_STARTED', 'NIGHT_STARTED', 'DAY_STARTED'] as const) {
      root.bus.subscribe(type, e => observer.observe(e));
    }

    const onResize = () => renderer.resize();
    window.addEventListener('resize', onResize);

    let raf = 0;
    let last = performance.now();
    let saveAccum = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      root.advance(dt);

      for (const command of observer.drain()) {
        executeVisualCommand(command, particles, camera, feedback);
      }
      particles.update();
      feedback.update();
      camera.update();

      const camState = camera.get();
      renderer.render(root.getSnapshot(), particles, feedback, camState.shakeOffset.x, camState.shakeOffset.y);

      saveAccum += dt;
      if (saveAccum > 100) {
        saveAccum = 0;
        const state = root.getSnapshot();
        if (state.phase === 'gameover' && !runEndedRef.current) {
          runEndedRef.current = true;
          const nextMeta = recordRunEnd(state.wave.number, state.nektarEarned);
          advanceCrossMaturation(state.wave.number);
          onMetaChange(nextMeta);
        }
        setHud({
          wave: state.wave.number,
          energy: state.resources.energy,
          lives: state.lives,
          combo: state.combo.count,
          inventory: { ...state.inventory },
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const saveTimer = setInterval(() => saveRun(root.getSnapshot()), 10000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(saveTimer);
      window.removeEventListener('resize', onResize);
      saveRun(root.getSnapshot());
    };
  }, [seed, runId, loadout, savedVariants, bredStats, onMetaChange]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    const root = rootRef.current;
    if (!renderer || !root || !selectedRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cell = renderer.gridFromPixel(event.clientX - rect.left, event.clientY - rect.top);
    if (!cell) return;
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', ++cmdSeq.current, {
      variantId: selectedRef.current,
      gx: cell.gx,
      gy: cell.gy,
    }));
  }, []);

  const handleStartWave = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', ++cmdSeq.current, {}));
  }, []);

  const plantIds = Array.from(new Set([...Object.keys(PLANTS_SOURCE), ...loadout]));

  return (
    <div style={styles.shell}>
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={styles.logo}>LifeSeedLab</span>
          <span style={styles.sub}>Forschungsbuch • Welle {hud?.wave ?? 1}</span>
        </div>
        <div style={styles.topRight}>
          <button onClick={handleStartWave} style={{ ...styles.btn, ...styles.btnPrimary }}>{t('game.startWave')}</button>
          <button onClick={onExit} style={styles.btn}>{t('game.exitRun')}</button>
        </div>
      </div>

      <div style={styles.stage}>
        <div style={styles.canvasFrame}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ ...styles.canvas, cursor: selected ? 'crosshair' : 'default' }}
          />
          {hud && (
            <div style={styles.hud} aria-label="Spielstatus">
              <span style={styles.hudChip}><DropIcon /> {hud.energy}</span>
              <span style={styles.hudChip}><LeafHeartIcon /> {hud.lives}</span>
              <span style={styles.hudChip}><WaveIcon /> W {hud.wave}</span>
              {hud.combo > 1 && <span style={{ ...styles.hudChip, ...styles.hudChipCombo }}>×{hud.combo}</span>}
            </div>
          )}
          <div style={styles.tray} role="toolbar" aria-label="Pflanzenauswahl">
            {plantIds.map(id => {
              const count = hud?.inventory[id] ?? 0;
              const isSelected = selected === id;
              const disabled = count <= 0;
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (disabled) return;
                    const next = selectedRef.current === id ? null : id;
                    selectedRef.current = next;
                    setSelected(next);
                  }}
                  style={{
                    ...styles.trayItem,
                    ...(isSelected ? styles.trayItemSelected : {}),
                    ...(disabled ? styles.trayItemDisabled : {}),
                  }}
                  aria-pressed={isSelected}
                  aria-disabled={disabled}
                  title={id}
                >
                  <span style={styles.trayDot} aria-hidden />
                  <span style={styles.trayName}>{id}</span>
                  <span style={styles.trayCount}>×{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={styles.paperNote} aria-hidden>
          <span style={styles.paperNotePin} /> Tippe eine Pflanze unten an, dann aufs Feld — die Welt ist Papier, die Pflanzen sind lebendig.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    background: 'var(--paper)', position: 'relative',
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    padding: '10px 14px', background: '#fbf6e9', borderBottom: '2px solid var(--ink)',
    boxShadow: '0 2px 0 rgba(43,43,38,0.06)', zIndex: 2,
  },
  topLeft: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  logo: { fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0.3 },
  sub: { fontSize: 11, color: '#6b6250', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' },
  topRight: { display: 'flex', gap: 8, alignItems: 'center' },
  btn: {
    padding: '8px 14px', background: '#fff', border: '2px solid var(--ink)',
    borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '3px 3px 0 var(--ink)', lineHeight: 1,
  },
  btnPrimary: {
    background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)',
  },
  stage: {
    flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 14px 10px',
    background: 'var(--paper)',
  },
  canvasFrame: {
    position: 'relative', width: '100%', maxWidth: 860, flex: 1, minHeight: 0,
    background: '#fff', border: '2px solid var(--ink)', borderRadius: 14,
    boxShadow: '4px 4px 0 var(--ink), 0 14px 32px rgba(43,43,38,0.16)', overflow: 'hidden',
    display: 'flex',
  },
  canvas: { width: '100%', height: '100%', display: 'block', touchAction: 'none', flex: 1 },
  hud: {
    position: 'absolute', top: 10, left: 10, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 1,
  },
  hudChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
    background: '#fff', border: '2px solid var(--ink)', borderRadius: 10,
    boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 800, color: 'var(--ink)', lineHeight: 1,
  },
  hudChipCombo: {
    background: 'var(--paper-warm)', borderColor: 'var(--ink)', color: 'var(--ink)',
  },
  tray: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: 8, padding: '10px 12px',
    background: '#fbf6e9', border: '2px solid var(--ink)', borderRadius: 14,
    boxShadow: '4px 4px 0 var(--ink)', maxWidth: 'calc(100% - 20px)', overflowX: 'auto',
  },
  trayItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 12px', background: '#fff', border: '2px solid var(--ink)',
    borderRadius: 10, cursor: 'pointer', color: 'var(--ink)', fontSize: 12, fontWeight: 700,
    boxShadow: '2px 2px 0 var(--ink)', minWidth: 76, flexShrink: 0, lineHeight: 1.1,
  },
  trayItemSelected: {
    background: '#f0fdf4', borderColor: 'var(--leaf)', boxShadow: '2px 2px 0 var(--leaf-dark)',
  },
  trayItemDisabled: {
    opacity: 0.45, cursor: 'not-allowed',
  },
  trayDot: {
    width: 10, height: 10, borderRadius: '50%', background: 'var(--leaf)', border: '1.5px solid var(--ink)', flexShrink: 0,
  },
  trayName: { fontSize: 11, color: 'var(--ink)', textAlign: 'center', wordBreak: 'break-word', maxWidth: 72 },
  trayCount: { fontSize: 11, color: '#6b6250', fontWeight: 800 },
  paperNote: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 10,
    boxShadow: '2px 2px 0 var(--ink)', fontSize: 11, color: '#6b6250', fontWeight: 600,
    maxWidth: 860, width: '100%', justifyContent: 'center', textAlign: 'center' as const,
  },
  paperNotePin: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--nektar)', border: '1.5px solid var(--ink)', display: 'inline-block', flexShrink: 0,
  },
};
