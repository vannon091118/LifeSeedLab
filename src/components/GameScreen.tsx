import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, PlantVariant, WorkerOutMessage, GameMode } from '../types';
import { GameRenderer } from '../renderer';
import { createBaseVariants } from '../genome';
import { useI18n } from '../i18n';
import { recordRunEnd } from '../meta';
import { DebugPanel } from './DebugPanel';

type Props = {
  mode: GameMode;
  loadout: PlantVariant[];
  onExit: (summary: { waveReached: number; nektarEarned: number } | null) => void;
};

export function GameScreen({ mode, loadout, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [fps, setFps] = useState(0);
  const [debugVisible, setDebugVisible] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<PlantVariant | null>(null);
  const [runOver, setRunOver] = useState<{ waveReached: number; nektarEarned: number } | null>(null);
  const { t } = useI18n();

  // ── Worker lifecycle ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new GameRenderer(canvas);
    rendererRef.current = renderer;
    const handleResize = () => renderer.resize();
    window.addEventListener('resize', handleResize);

    const worker = new Worker(new URL('../simulation.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.type === 'state') {
        gameStateRef.current = msg.state;
        setGameState(msg.state);
        rendererRef.current?.render(msg.state);
      } else if (msg.type === 'tick_done') {
        setFps(msg.fps);
      } else if (msg.type === 'game_over') {
        recordRunEnd(msg.waveReached, msg.nektarEarned);
        setRunOver({ waveReached: msg.waveReached, nektarEarned: msg.nektarEarned });
      }
    };

    // Seed worker with base + loadout inventory
    const inventory: Record<string, number> = {};
    const discovered: string[] = [];
    for (const v of createBaseVariants()) {
      inventory[v.id] = (inventory[v.id] || 0) + 2;
      if (!discovered.includes(v.id)) discovered.push(v.id);
    }
    for (const v of loadout) {
      inventory[v.id] = (inventory[v.id] || 0) + 1;
      if (!discovered.includes(v.id)) discovered.push(v.id);
    }

    worker.postMessage({ type: 'set_state', state: { discoveredVariants: discovered, inventory } });
    worker.postMessage({ type: 'tick' });

    return () => {
      window.removeEventListener('resize', handleResize);
      worker.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Canvas interaction ─────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    const worker = workerRef.current;
    if (!renderer || !worker) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const grid = renderer.getGridFromPixel(e.clientX - rect.left, e.clientY - rect.top);
    if (!grid || !selectedVariant) return;

    worker.postMessage({
      type: 'place_tower',
      variant: selectedVariant,
      gridX: grid.x,
      gridY: grid.y,
    });
  }, [selectedVariant]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    renderer.setHover(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const handleStartWave = useCallback(() => {
    workerRef.current?.postMessage({ type: 'start_wave' });
  }, []);

  const handleExit = useCallback(() => {
    const s = gameStateRef.current;
    if (s && s.phase !== 'gameover') {
      recordRunEnd(s.wave, s.nektarEarned);
      onExit({ waveReached: s.wave, nektarEarned: s.nektarEarned });
    } else {
      onExit(null);
    }
  }, [onExit]);

  const inventory = gameState?.inventory || {};
  const trayVariants: PlantVariant[] = [...createBaseVariants(), ...loadout];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <span style={styles.logo}>🌱 LifeGameLab</span>
          {selectedVariant && (
            <span style={styles.selectedInfo}>
              {t('game.placing')} <strong style={{ color: selectedVariant.color }}>{selectedVariant.name}</strong>
              <span style={{ color: '#6b7280' }}> {t('game.clickGrid')}</span>
            </span>
          )}
        </div>
        <div style={styles.topRight}>
          <span style={styles.modeBadge}>{mode === 'pvp' ? '⚔️ PvP' : '🌊 Endless'}</span>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          style={{ width: '100%', height: '100%', cursor: selectedVariant ? 'crosshair' : 'default' }}
        />

        {/* Tower tray */}
        <div style={styles.tray}>
          {trayVariants.map(v => {
            const count = inventory[v.id] || 0;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(prev => (prev?.id === v.id ? null : v))}
                style={{
                  ...styles.trayItem,
                  borderColor: selectedVariant?.id === v.id ? v.color : 'transparent',
                  opacity: count === 0 ? 0.45 : 1,
                }}
                title={`${v.name} — ${v.traits.join(', ')}`}
              >
                <div style={{ ...styles.trayPreview, background: v.color }} />
                <span style={styles.trayName}>{v.name}</span>
                <span style={styles.trayCount}>×{count}</span>
                <span style={styles.trayCost}>⚡{v.cost}</span>
              </button>
            );
          })}
        </div>

        {/* Run summary overlay */}
        {runOver && (
          <div style={styles.gameOverOverlay}>
            <div style={styles.gameOverCard}>
              <h2 style={styles.gameOverTitle}>{t('over.title')}</h2>
              <div style={styles.summaryRow}>
                <span>{t('over.waveReached')}</span>
                <strong>{runOver.waveReached}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>{t('over.nektarEarned')}</span>
                <strong style={{ color: '#fbbf24' }}>🍯 {runOver.nektarEarned}</strong>
              {gameState && <span style={styles.hudWaveSmall}>{t('game.waveOf')} {gameState.wave}</span>}
            </div>
              <button onClick={() => onExit(runOver)} style={styles.toMenuBtn}>
                {t('over.toMenu')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HUD bar */}
      {gameState && (
        <div style={styles.hudBar}>
          <span style={styles.hudEnergy}>⚡ {gameState.money}</span>
          <span style={styles.hudLives}>❤️ {gameState.lives}</span>
          <span style={styles.hudNektar}>🍯 {gameState.nektarEarned}</span>
          <span style={styles.hudWave}>{t('game.waveOf')} {gameState.wave}</span>
          {gameState.phase === 'prep' && (
            <>
              <span style={styles.hudPrep}>{t('game.prep')}</span>
              <button onClick={handleStartWave} style={styles.waveBtn}>
                ▶ {t('game.startWave')} {gameState.wave + 1}
              </button>
              <button onClick={handleExit} style={styles.exitBtn}>
                {t('game.exitRun')}
              </button>
            </>
          )}
        </div>
      )}

      {gameState && (
        <DebugPanel
          state={gameState}
          fps={fps}
          visible={debugVisible}
          onToggle={() => setDebugVisible(v => !v)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  topRight: {
    display: 'flex',
    gap: 8,
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: '#4ade80',
  },
  selectedInfo: {
    fontSize: 13,
    color: '#9ca3af',
  },
  modeBadge: {
    fontSize: 12,
    color: '#6b7280',
  },
  tray: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 6,
    padding: '8px 12px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid #1e293b',
    borderRadius: 12,
    backdropFilter: 'blur(8px)',
    flexWrap: 'wrap',
    maxWidth: '90%',
    justifyContent: 'center',
  },
  trayItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '8px 12px',
    border: '2px solid transparent',
    borderRadius: 8,
    cursor: 'pointer',
    minWidth: 72,
    background: '#0f172a',
  },
  trayPreview: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  trayName: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: 500,
  },
  trayCount: {
    fontSize: 10,
    color: '#6b7280',
  },
  trayCost: {
    fontSize: 10,
    color: '#fbbf24',
  },
  gameOverOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  },
  gameOverCard: {
    padding: 40,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 16,
    textAlign: 'center',
    minWidth: 320,
  },
  gameOverTitle: {
    fontSize: 32,
    color: '#f87171',
    margin: '0 0 16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    fontSize: 14,
    color: '#9ca3af',
    padding: '4px 0',
  },
  toMenuBtn: {
    marginTop: 20,
    padding: '10px 32px',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    border: 'none',
    borderRadius: 10,
    color: '#0a0a0f',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  hudBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    padding: '8px 16px',
    background: '#0f172a',
    borderTop: '1px solid #1e293b',
    fontSize: 14,
  },
  hudEnergy: { color: '#fbbf24' },
  hudLives: { color: '#f87171' },
  hudNektar: { color: '#a78bfa' },
  hudWave: { color: '#60a5fa', fontWeight: 600 },
  hudPrep: {
    flex: 1,
    textAlign: 'center',
    color: '#4ade80',
    fontSize: 12,
  },
  waveBtn: {
    padding: '6px 14px',
    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    border: '1px solid #3b82f6',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  exitBtn: {
    padding: '6px 12px',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 6,
    color: '#9ca3af',
    fontSize: 13,
    cursor: 'pointer',
  },
};
