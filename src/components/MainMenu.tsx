import type { MetaSave, PlantVariant, GameMode } from '../types';
import { createBaseVariants } from '../genome';
import { toggleLoadout } from '../meta';
import { useI18n } from '../i18n';
import { SproutIcon, WaveIcon, BookIcon, SwordIcon, SeedIcon, BugIcon } from './MenuIcons';
import type { MenuScreen } from './NavIndicators';

// Owner: UI (MainMenu = Hub-Kärtchen). LOC ≤ 400.
// MainMenu ist NUR noch das Tor: illustrierte Karten navigieren auf EIGENE
// Screens (Greenhouse/SeedShop/BeetleLab/Codex leben top-level in App.tsx).
// Basis der Sammlung = createBaseVariants (eine Quelle — A2).
// Gacha: Gewächshaus = Samen-Shop + Aussaat; keine Elternwahl.



type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onStartRun: (mode: GameMode) => void;
  onNavigate: (s: MenuScreen) => void;
  /** B2: Welle des gespeicherten Runs (null = kein fortsetzbarer Run). */
  resumeWave?: number | null;
  onResume?: () => void;
};

export function MainMenu({ meta, onMetaChange, onStartRun, onNavigate, resumeWave, onResume }: Props) {
  const { t } = useI18n();
  // B18: der Hub schreibt jetzt genau EIN Meta — den Loadout-Toggle (A19.6). Alles andere
  // bleibt read-only; die Writer-Regel gilt pro Feld, nicht pro Screen.

  const bases: PlantVariant[] = createBaseVariants();
  const allVariants = [...bases, ...meta.savedVariants];
  const ownedVariants = allVariants.filter(v => (meta.variantCounts[v.id] || 0) > 0);
  const loadoutVariants = meta.loadout
    .map(id => ownedVariants.find(v => v.id === id))
    .filter((v): v is PlantVariant => v !== undefined);

  return (
    <div>
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
          onClick={() => onNavigate('greenhouse')}
          disabled={ownedVariants.length < 2}
        />
        <ModeCard
          icon={<SeedIcon />}
          title={t('menu.shop')}
          desc={t('menu.shopDesc')}
          onClick={() => onNavigate('seedshop')}
        />
        <ModeCard
          icon={<BugIcon />}
          title={t('menu.beetleLab')}
          desc={t('menu.beetleLabDesc')}
          onClick={() => onNavigate('beetlelab')}
        />
        {onResume && resumeWave ? (
          <ModeCard
            icon={<WaveIcon />}
            title={t('menu.resume')}
            desc={t('menu.resumeDesc').replace('{n}', String(resumeWave))}
            onClick={onResume}
            highlight
          />
        ) : null}
        <ModeCard
          icon={<WaveIcon />}
          title={t('menu.endless')}
          desc={t('menu.endlessDesc')}
          onClick={() => onStartRun('endless')}
          highlight={!onResume}
          tut="endless"
        />
        <ModeCard
          icon={<BookIcon />}
          title={t('codex.title')}
          desc={t('codex.subtitle')}
          onClick={() => onNavigate('codex')}
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
        <h3 style={styles.sectionTitle}>
          {t('menu.loadout')} ({meta.loadout.length}/4) — {t('menu.collection')} ({ownedVariants.length})
        </h3>
        <div style={styles.collectionGrid}>
          {loadoutVariants.map(v => (
            <button
              key={v.id}
              style={styles.loadoutItem}
              onClick={() => onMetaChange(toggleLoadout(v.id))}
              aria-label={`${t('menu.leave')}: ${v.name}`}
            >
              <div style={{ ...styles.preview, background: v.color }} />
              <span style={styles.name}>{v.name}</span>
              <span style={styles.count}>✓</span>
            </button>
          ))}
          {ownedVariants.filter(v => !meta.loadout.includes(v.id)).map(v => (
            <button
              key={v.id}
              style={{ ...styles.collectionItem, ...(meta.loadout.length >= 4 ? styles.loadoutFull : {}) }}
              onClick={() => onMetaChange(toggleLoadout(v.id))}
              disabled={meta.loadout.length >= 4}
              aria-label={`${t('menu.take')}: ${v.name}`}
            >
              <div style={{ ...styles.preview, background: v.color }} />
              <span style={styles.name}>{v.name}</span>
              <span style={styles.count}>×{meta.variantCounts[v.id]}</span>
            </button>
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

function ModeCard({ icon, title, desc, onClick, disabled, highlight, tut }: {
  icon: React.ReactNode; title: string; desc: string;
  onClick: () => void; disabled?: boolean; highlight?: boolean;
  /** B21.3: Cue-Ziel des Onboardings (`data-tut`) — die Karte bleibt Eigentum des Hubs. */
  tut?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-tut={tut}
      style={{ ...styles.modeCard, ...(highlight ? styles.modeCardHighlight : {}), ...(disabled ? styles.modeCardDisabled : {}) }}
    >
      <div style={styles.modeIcon}>{icon}</div>
      <div style={styles.modeTitle}>{title}</div>
      <div style={styles.modeDesc}>{desc}</div>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    marginBottom: 16,
    textOverflow: 'ellipsis',
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 18,
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
    cursor: 'pointer',
    minHeight: 44,
  },
  loadoutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: '#eef7e6',
    border: '2px solid var(--leaf-dark)',
    borderRadius: 6,
    boxShadow: '2px 2px 0 var(--leaf-dark)',
    fontSize: 12,
    color: 'var(--ink)',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 44,
  },
  loadoutFull: {
    opacity: 0.45,
    cursor: 'not-allowed',
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
