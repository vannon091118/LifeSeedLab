import type { GameState } from '../types';
import { useI18n } from '../i18n';

type Props = {
  state: GameState;
  fps: number;
  visible: boolean;
  onToggle: () => void;
};

export function DebugPanel({ state, fps, visible, onToggle }: Props) {
  const { t } = useI18n();

  return (
    <>
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          padding: '6px 12px',
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: 6,
          color: '#6b7280',
          fontSize: 11,
          cursor: 'pointer',
          zIndex: 50,
          fontFamily: 'monospace',
        }}
      >
        [D] {visible ? 'HIDE' : 'SHOW'}
      </button>

      {visible && (
        <div style={styles.panel}>
          <h3 style={styles.title}>{t('debug.title')}</h3>

          <Row label="FPS" value={String(fps)} color={fps > 25 ? '#4ade80' : fps > 15 ? '#fbbf24' : '#f87171'} />
          <Row label={t('debug.tick')} value={String(state.tick)} />
          <Row label={t('debug.phase')} value={state.phase} />
          <Row label="Energy" value={String(state.money)} />
          <Row label="Lives" value={String(state.lives)} />
          <Row label="Nectar+" value={String(state.nektarEarned)} />

          <div style={styles.divider} />
          <Row label={t('debug.towers')} value={String(state.towers.length)} />
          <Row label={t('debug.enemies')} value={String(state.enemies.length)} />
          <Row label={t('debug.projectiles')} value={String(state.projectiles.length)} />
          <Row label={t('debug.spawnQueue')} value={String(state.spawnQueue.length)} />

          <div style={styles.divider} />
          <Row label={t('debug.variants')} value={String(state.discoveredVariants.length)} />

          <div style={styles.sectionTitle}>{t('debug.inventory')}</div>
          {Object.entries(state.inventory).map(([id, count]) => (
            <Row key={id} label={id.slice(0, 18)} value={`×${count}`} />
          ))}

          <div style={styles.sectionTitle}>{t('debug.activeTowers')}</div>
          {state.towers.map(tow => (
            <div key={tow.id} style={styles.towerRow}>
              <span style={{ color: tow.variant.color }}>●</span>
              <span style={styles.label}>{tow.variant.name}</span>
              <span style={styles.value}>{Math.round(tow.hp)}/{tow.variant.stats.hp}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, ...(color ? { color } : {}) }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    bottom: 40,
    right: 12,
    width: 240,
    maxHeight: '60vh',
    overflow: 'auto',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#94a3b8',
    zIndex: 40,
  },
  title: {
    fontSize: 13,
    color: '#a78bfa',
    margin: '0 0 8px 0',
    fontWeight: 600,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  label: { color: '#6b7280' },
  value: { color: '#e5e7eb', fontWeight: 500 },
  divider: {
    height: 1,
    background: '#1e293b',
    margin: '6px 0',
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  towerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 0',
  },
};
