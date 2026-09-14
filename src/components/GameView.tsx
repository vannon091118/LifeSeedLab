// Owner: UI (GameView). LOC ≤ 400.
// UI reads state, sends commands. All game logic lives in SimulationRoot.

import { useRef, useEffect, useState, useCallback } from 'react';
import type { SimState } from '../simulation/state';
import { SimulationRoot, makeCommand } from '../simulation/root';
import { hashState, type HashableState } from '../core/hash';
import { saveRun, loadRun, clearRun } from '../persistence/runSave';
import { Renderer } from '../render/renderer';
import { Camera } from '../render/camera';
import { VisualObserver } from '../observers/visualObserver';
import { ParticlePool } from '../observers/particles';
import { useI18n } from '../i18n';
import { PLANTS_SOURCE } from '../config/plants.source';

interface Props {
  seed: number;
  onExit: () => void;
}

interface DebugInfo {
  hash: string;
  tick: number;
  phase: string;
  wave: number;
  score: number;
  combo: number;
  energy: number;
  lives: number;
  enemies: number;
  particles: number;
  eventsPerSec: number;
}

export function GameView({ seed, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<SimulationRoot | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const observerRef = useRef<VisualObserver | null>(null);
  const particlesRef = useRef<ParticlePool | null>(null);
  const selectedRef = useRef<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [hud, setHud] = useState<DebugInfo | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [fxOn, setFxOn] = useState(true);
  const { t } = useI18n();
  const cmdSeq = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // simulation
    const root = new SimulationRoot({ seed });
    rootRef.current = root;
    const eventOffset = 0;

    // presentation
    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;
    const camera = new Camera();
    cameraRef.current = camera;
    const observer = new VisualObserver(camera, true);
    observerRef.current = observer;
    const particles = new ParticlePool();
    particlesRef.current = particles;

    // events → observer (read-only pipeline)
    for (const type of ['PROJECTILE_HIT', 'ENEMY_DIED', 'PLANT_PLACED', 'WAVE_COMPLETED', 'GAME_OVER', 'CRITICAL_HIT', 'PLACEMENT_REJECTED'] as const) {
      root.bus.subscribe(type, e => observer.observe(e));
    }

    // resize
    const onResize = () => renderer.resize();
    window.addEventListener('resize', onResize);

    // main loop (fixed timestep via SimulationRoot.advance)
    let raf = 0;
    let last = performance.now();
    let saveAccum = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      root.advance(dt);

      // observers + particles
      for (const c of observer.drain()) {
        if (c.type === 'SpawnParticleBurst') {
          const profileColor = c.profile === 'impact_ring' ? '#fde68a' : c.profile === 'death_pop' ? '#f87171' : '#e2e8f0';
          particles.burst(c.profile, c.x, c.y, profileColor, c.seed, c.intensity / 2);
        } else if (c.type === 'CameraShake') {
          camera.shake(c.intensity);
        }
      }
      particles.update();
      camera.update();

      // render
      renderer.render(root.getSnapshot(), particles);

      // HUD throttled (10 Hz)
      saveAccum += dt;
      if (saveAccum > 100) {
        saveAccum = 0;
        const s = root.getSnapshot();
        setHud({
          hash: hashState(hashInputOf(s)),
          tick: s.clock.tick,
          phase: s.phase,
          wave: s.wave.number,
          score: s.score,
          combo: s.combo.count,
          energy: s.resources.energy,
          lives: s.lives,
          enemies: s.enemies.length,
          particles: particles.activeCount,
          eventsPerSec: root.bus.publishCount,
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // autosave every 10s (phase-safe)
    const saveTimer = setInterval(() => saveRun(root.getSnapshot()), 10000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(saveTimer);
      window.removeEventListener('resize', onResize);
      saveRun(root.getSnapshot());
    };
  }, [seed]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    const root = rootRef.current;
    if (!renderer || !root || !selectedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cell = renderer.gridFromPixel(e.clientX - rect.left, e.clientY - rect.top);
    if (!cell) return;
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', ++cmdSeq.current, {
      variantId: selectedRef.current, gx: cell.gx, gy: cell.gy,
    }));
  }, []);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // hover highlighting arrives with placement preview (Phase 14.2)
  }, []);

  const handleStartWave = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', 1, {}));
  }, []);

  const handleReset = useCallback(() => {
    clearRun();
    window.location.reload();
  }, []);

  const plantIds = Object.keys(PLANTS_SOURCE);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={styles.topBar}>
        <span style={styles.logo}>🌱 LifeGamePlant</span>
        <div style={styles.topRight}>
          <span style={styles.seedBadge}>Seed: {seed}</span>
          <button onClick={handleStartWave} style={styles.btn}>{t('game.startWave')}</button>
          <button onClick={() => setFxOn(v => { const n = !v; observerRef.current?.setFxEnabled(n); return n; })} style={styles.btn}>
            FX {fxOn ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setDebugVisible(v => !v)} style={styles.btn}>[D]</button>
          <button onClick={onExit} style={styles.btn}>{t('game.exitRun')}</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          style={{ width: '100%', height: '100%', cursor: selected ? 'crosshair' : 'default' }}
        />

        {hud && (
          <div style={styles.hud}>
            <span>⚡ {hud.energy}</span>
            <span style={{ color: '#f87171' }}>❤️ {hud.lives}</span>
            <span style={{ color: '#60a5fa' }}>{t('game.waveOf')} {hud.wave}</span>
            <span style={{ color: '#a78bfa' }}>Score {hud.score}</span>
            {hud.combo > 1 && <span style={{ color: '#fbbf24' }}>Combo ×{hud.combo}</span>}
            <span style={{ color: '#4ade80' }}>{hud.phase}</span>
          </div>
        )}

        {/* Tower tray */}
        <div style={styles.tray}>
          {plantIds.map(id => {
            const count = hud
              ? (rootRef.current?.getSnapshot().inventory[id] ?? 0)
              : 0;
            return (
              <button
                key={id}
                onClick={() => { setSelected(prev => prev === id ? null : id); selectedRef.current = selectedRef.current === id ? null : id; }}
                style={{ ...styles.trayItem, borderColor: selected === id ? '#4ade80' : 'transparent' }}
              >
                <span style={styles.trayName}>{id}</span>
                <span style={styles.trayCount}>×{count}</span>
              </button>
            );
          })}
        </div>

        {debugVisible && hud && (
          <div style={styles.debug}>
            <div><strong>{t('debug.title')}</strong></div>
            <div>Hash: {hud.hash}</div>
            <div>Tick: {hud.tick}</div>
            <div>Phase: {hud.phase}</div>
            <div>Enemies: {hud.enemies} | Particles: {hud.particles}</div>
            <div>Events total: {hud.eventsPerSec}</div>
            <div style={{ marginTop: 8, color: '#475569' }}>Seed-Input: der Run startet über das Hauptmenü mit festem Seed</div>
          </div>
        )}
      </div>
    </div>
  );
}

function hashInputOf(s: SimState): HashableState {
  return {
    seed: s.seed,
    clock: s.clock,
    wave: { number: s.wave.number },
    resources: s.resources,
    plants: s.plants.map(p => ({ id: p.id, gx: p.gx, gy: p.gy, hp: p.hp, variantId: p.variantId, lastShot: p.lastShot })),
    enemies: s.enemies.map(e => ({ id: e.id, hp: e.hp, px: e.px, py: e.py, pathIndex: e.pathIndex })),
    projectiles: s.projectiles.map(p => ({ id: p.id, px: p.px, py: p.py, dx: p.dx, dy: p.dy })),
    score: s.score,
    combo: s.combo,
  };
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b',
  },
  logo: { fontSize: 16, fontWeight: 700, color: '#4ade80' },
  topRight: { display: 'flex', gap: 8, alignItems: 'center' },
  seedBadge: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace' },
  btn: {
    padding: '6px 12px', background: '#1f2937', border: '1px solid #374151',
    borderRadius: 6, color: '#e5e7eb', fontSize: 12, cursor: 'pointer',
  },
  hud: {
    position: 'absolute', top: 8, left: 12, display: 'flex', gap: 14,
    fontSize: 13, color: '#fbbf24', fontWeight: 600,
  },
  tray: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: 8, padding: '8px 12px',
    background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b',
    borderRadius: 12, backdropFilter: 'blur(8px)',
  },
  trayItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '8px 14px', background: '#0f172a', border: '2px solid transparent',
    borderRadius: 8, cursor: 'pointer', color: '#e5e7eb', fontSize: 12,
  },
  trayName: { fontSize: 11, color: '#9ca3af' },
  trayCount: { fontSize: 10, color: '#6b7280' },
  debug: {
    position: 'absolute', bottom: 40, right: 12, width: 260,
    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #1e293b',
    borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11,
    color: '#94a3b8',
  },
};
