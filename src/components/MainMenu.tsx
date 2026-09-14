import { useState } from 'react';
import { useI18n } from '../i18n';
import type { MetaSave, PlantVariant, GameMode } from '../types';
import { createBaseVariants } from '../genome';
import { Greenhouse } from './Greenhouse';
import { SeedShop } from './SeedShop';
import { BeetleLab } from './BeetleLab';
import { Codex } from './Codex';
import { MenuScene } from './MenuScene';
import { SproutIcon, WaveIcon, BookIcon, SwordIcon, SeedIcon, BugIcon } from './MenuIcons';

// Owner: UI (MainMenu screen). LOC ≤ 400.
// B9/§40: Papier-Panels mit Büroklammer, trashig selbstironische Kopie, keine Blur-Glass-Karten.
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
  const [showShop, setShowShop] = useState(false);
  const [showBeetleLab, setShowBeetleLab] = useState(false);
  const [showCodex, setShowCodex] = useState(false);

  const bases: PlantVariant[] = createBaseVariants();
  const allVariants = [...bases, ...meta.savedVariants];
  const ownedVariants = allVariants.filter(v => (meta.variantCounts[v.id] || 0) > 0);

  return (
    <div style={styles.wrap}>
      {/* Spielszene als Menü-Hintergrund (P3): Papierhügel + Weg + Pflanze —
          das Menü FÜHLT sich wie das Spiel an, nicht wie ein Debug-Panel. */}
      <MenuScene />
      <div style={styles.panel}>
        <div style={styles.clip} aria-hidden />
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}>←</button>
          <h1 style={styles.title}>{t('menu.title')}</h1>
          <div style={styles.nektarBadge}>
            {t('menu.nektar')}: <strong>{meta.nektar}</strong>
          </div>
        </div>

        <div style={styles.marquee} aria-hidden>
          *** WILLKOMMEN IM LABOR *** DEIN GENOM, DEIN GLUECK *** KEINE HAFTUNG FUER MUTATIONEN ***
        </div>

        <div style={styles.statsRow}>
          <StatBox label={t('menu.bestWave')} value={meta.bestWave} />
          <StatBox label={t('menu.runs')} value={meta.runs} />
          <StatBox label={t('menu.collection')} value={ownedVariants.length} />
        </div>

        <div style={styles.modes}>
          <ModeCard
            icon={<SproutIcon />}
            title={t('menu.greenhouse')}
            desc={t('menu.greenhouseDesc')}
            onClick={() => setShowGreenhouse(true)}
            disabled={ownedVariants.length < 2}
          />
          <ModeCard
            icon={<SeedIcon />}
            title={t('menu.shop')}
            desc={t('menu.shopDesc')}
            onClick={() => setShowShop(true)}
          />
          <ModeCard
            icon={<BugIcon />}
            title={t('menu.beetleLab')}
            desc={t('menu.beetleLabDesc')}
            onClick={() => setShowBeetleLab(true)}
          />
          <ModeCard
            icon={<WaveIcon />}
            title={t('menu.endless')}
            desc={t('menu.endlessDesc')}
            onClick={() => onStartRun('endless')}
            highlight
          />
          <ModeCard
            icon={<BookIcon />}
            title={t('codex.title')}
            desc={t('codex.subtitle')}
            onClick={() => setShowCodex(true)}
          />
          <ModeCard
            icon={<SwordIcon />}
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

        <p style={styles.footer} aria-hidden>
          LifeSeedLab v0.1 — hier wurde nicht gespart, hier wurde gesparst. popup-blocker empfohlen.
        </p>
      </div>

      {showGreenhouse && (
        <Greenhouse
          meta={meta}
          onMetaChange={onMetaChange}
          onClose={() => setShowGreenhouse(false)}
        />
      )}
      {showShop && (
        <SeedShop
          meta={meta}
          onMetaChange={onMetaChange}
          onClose={() => setShowShop(false)}
        />
      )}
      {showBeetleLab && (
        <BeetleLab
          meta={meta}
          onMetaChange={onMetaChange}
          onClose={() => setShowBeetleLab(false)}
        />
      )}
      {showCodex && <Codex onClose={() => setShowCodex(false)} />}
    </div>
  );
}

// Icons (B9) leben in MenuIcons.tsx — eine Präsentations-Verantwortung pro Datei.

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick, disabled, highlight }: {
  icon: React.ReactNode; title: string; desc: string;
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'var(--paper)',
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(43,43,38,0.025) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 70% 10%, rgba(217,164,65,0.10), transparent 55%)',
    overflow: 'auto',
    position: 'relative',
  },
  panel: {
    position: 'relative',
    width: '92vw',
    maxWidth: 860,
    padding: 26,
    background: 'var(--paper-warm)',
    border: '2.5px solid var(--ink)',
    borderRadius: 6,
    boxShadow: '6px 6px 0 var(--ink)',
    margin: '20px 0 28px',
  },
  clip: {
    position: 'absolute',
    top: -14,
    left: 40,
    width: 44,
    height: 26,
    border: '3px solid #8a8a80',
    borderTop: 'none',
    borderRadius: '0 0 22px 22px',
    background: 'transparent',
    boxShadow: 'inset 0 -2px 0 rgba(43,43,38,0.25)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 8,
    color: 'var(--ink)',
    fontSize: 18,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '2px 2px 0 var(--ink)',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    color: 'var(--ink)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nektarBadge: {
    padding: '8px 14px',
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 8,
    boxShadow: '2px 2px 0 var(--ink)',
    color: 'var(--ink)',
    fontSize: 14,
    fontWeight: 600,
  },
  marquee: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    background: 'var(--ink)',
    color: 'var(--nektar)',
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: 11,
    letterSpacing: 1,
    padding: '5px 8px',
    borderRadius: 4,
    marginBottom: 18,
    textOverflow: 'ellipsis',
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: '10px 14px',
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 8,
    boxShadow: '3px 3px 0 var(--ink)',
    textAlign: 'center',
    transform: 'rotate(-0.4deg)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--leaf-dark)',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b6250',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
    fontWeight: 700,
  },
  modes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
    marginBottom: 22,
  },
  modeCard: {
    position: 'relative',
    textAlign: 'left',
    padding: 16,
    background: '#fff',
    border: '2.5px solid var(--ink)',
    borderRadius: 6,
    boxShadow: '4px 4px 0 var(--ink)',
    cursor: 'pointer',
    transition: 'transform 0.08s',
    color: 'var(--ink)',
    minHeight: 44,
  },
  modeCardHighlight: {
    background: '#eef7e6',
    borderColor: 'var(--leaf-dark)',
    boxShadow: '4px 4px 0 var(--leaf-dark)',
    transform: 'rotate(0.4deg)',
  },
  modeCardDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  modeIcon: {
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 12,
    color: '#6b6250',
    lineHeight: 1.4,
    fontWeight: 600,
  },
  collectionSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#6b6250',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    fontWeight: 800,
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
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 6,
    boxShadow: '2px 2px 0 var(--ink)',
    fontSize: 12,
    color: 'var(--ink)',
    fontWeight: 600,
  },
  preview: {
    width: 18,
    height: 18,
    borderRadius: 5,
    border: '1.5px solid var(--ink)',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    color: 'var(--ink)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  count: {
    color: '#6b6250',
    fontSize: 11,
    fontWeight: 800,
  },
  empty: {
    color: '#6b6250',
    fontSize: 13,
    padding: 12,
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTop: '1.5px dashed #b7ab8d',
    fontSize: 11,
    color: '#8a8065',
    fontStyle: 'italic',
  },
};
