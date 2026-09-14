import { useState } from 'react';
import { useI18n } from '../i18n';
import type { MetaSave, PlantVariant, GameMode } from '../types';
import { createBaseVariants } from '../genome';
import { Greenhouse } from './Greenhouse';

// Owner: UI (MainMenu screen). LOC ≤ 400.
// Basis der Sammlung = createBaseVariants (eine Quelle — Dublette gelöscht, A2).
// Gacha: Gewächshaus = Samen-Shop + Aussaat; keine Elternwahl.

export const BREED_NEKTAR_COST = 40; // Anzeige Legacy; Preise kommen aus economy.source

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onStartRun: (mode: GameMode) => void;
  onBack: () => void;
};

export function MainMenu({ meta, onMetaChange, onStartRun, onBack }: Props) {
  const { t } = useI18n();
  const [showGreenhouse, setShowGreenhouse] = useState(false);

  const bases: PlantVariant[] = createBaseVariants();
  const allVariants = [...bases, ...meta.savedVariants];
  const ownedVariants = allVariants.filter(v => (meta.variantCounts[v.id] || 0) > 0);

  return (
    <div style={styles.wrap}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}>←</button>
          <h1 style={styles.title}>{t('menu.title')}</h1>
          <div style={styles.nektarBadge}>
            🍯 {t('menu.nektar')}: <strong>{meta.nektar}</strong>
          </div>
        </div>

        <div style={styles.statsRow}>
          <StatBox label={t('menu.bestWave')} value={meta.bestWave} />
          <StatBox label={t('menu.runs')} value={meta.runs} />
          <StatBox label={t('menu.collection')} value={ownedVariants.length} />
        </div>

        <div style={styles.modes}>
          <ModeCard
            icon="🌱"
            title={t('menu.greenhouse')}
            desc={t('shop.desc')}
            onClick={() => setShowGreenhouse(true)}
            disabled={ownedVariants.length < 2}
          />
          <ModeCard
            icon="🌊"
            title={t('menu.endless')}
            desc={t('menu.endlessDesc')}
            onClick={() => onStartRun('endless')}
            highlight
          />
          <ModeCard
            icon="⚔️"
            title={t('menu.pvp')}
            desc={t('menu.pvpDesc')}
            onClick={() => {}}
            disabled
          />
        </div>

        <div style={styles.collectionSection}>
          <h3 style={styles.sectionTitle}>{t('menu.loadout')} ({ownedVariants.length})</h3>
          <div style={styles.collectionGrid}>
            {ownedVariants.map(v => (
              <div key={v.id} style={styles.collectionItem}>
                <div style={{ ...styles.preview, background: v.color }} />
                <span style={styles.name}>{v.name}</span>
                <span style={styles.count}>×{meta.variantCounts[v.id]}</span>
              </div>
            ))}
            {ownedVariants.length === 0 && (
              <span style={styles.empty}>{t('common.empty')}</span>
            )}
          </div>
        </div>
      </div>

      {showGreenhouse && (
        <Greenhouse
          meta={meta}
          onMetaChange={onMetaChange}
          onClose={() => setShowGreenhouse(false)}
        />
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick, disabled, highlight }: {
  icon: string; title: string; desc: string;
  onClick: () => void; disabled?: boolean; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles.modeCard, ...(highlight ? styles.modeCardHighlight : {}), ...(disabled ? styles.modeCardDisabled : {}) }}
    >
      <div style={styles.modeIcon}>{icon}</div>
      <div style={styles.modeTitle}>{title}</div>
      <div style={styles.modeDesc}>{desc}</div>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 70% 30%, #1a1f2f 0%, #0a0a0f 60%)',
    overflow: 'auto',
  },
  panel: {
    width: '92vw',
    maxWidth: 860,
    padding: 28,
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid #1e293b',
    borderRadius: 20,
    backdropFilter: 'blur(12px)',
    margin: '20px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: 8,
    color: '#9ca3af',
    fontSize: 16,
    cursor: 'pointer',
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    color: '#e5e7eb',
  },
  nektarBadge: {
    padding: '8px 16px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: 10,
    color: '#fbbf24',
    fontSize: 14,
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: '12px 16px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 10,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#4ade80',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  modes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 24,
  },
  modeCard: {
    textAlign: 'left',
    padding: 18,
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'all 0.15s',
    color: '#e5e7eb',
  },
  modeCardHighlight: {
    borderColor: '#4ade80',
    background: 'rgba(74, 222, 128, 0.06)',
  },
  modeCardDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  collectionSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  collectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 8,
  },
  collectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 8,
    fontSize: 12,
  },
  preview: {
    width: 18,
    height: 18,
    borderRadius: 5,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    color: '#d1d5db',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  count: {
    color: '#6b7280',
    fontSize: 11,
  },
  empty: {
    color: '#475569',
    fontSize: 13,
    padding: 12,
  },
};
