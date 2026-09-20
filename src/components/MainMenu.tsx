import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { MetaSave, PlantVariant, GameMode } from '../types';
import { createBaseVariants } from '../genome';
import { toggleLoadout } from '../meta';
import { useI18n } from '../i18n';
import { APP_VERSION_LABEL } from '../version';
import { SproutIcon, WaveIcon, BookIcon, SwordIcon, SeedIcon, BugIcon } from './MenuIcons';
import type { MenuScreen } from './NavIndicators';
import { mainMenuStyles as styles } from './mainMenuStyles';
import { PlantVariantThumb } from './PhenotypeCanvas';
import { resumeCostFor } from '../config/economy.source';

// Owner: UI (MainMenu = Hub-Kärtchen). LOC ≤ 200.
// MainMenu ist NUR noch das Tor: illustrierte Karten navigieren auf EIGENE
// Screens (Greenhouse/SeedShop/BeetleLab/Codex leben top-level in App.tsx).
// Basis der Sammlung = createBaseVariants (eine Quelle — A2).
// Gacha: Gewächshaus = Samen-Shop + Aussaat; keine Elternwahl.
// Styles: mainMenuStyles.ts (Präsentation getrennt — Muster gameViewStyles.ts).

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
  // Fortsetzen ist ein KAUF (Entscheidung 19.09.2026): 25 Nektar je erreichter Welle, ohne Cap.
  // Ein Abbruch beendet den Lauf — ohne Nektar gibt es kein Wiedereinsteigen, und die Karte sagt das.
  const resumeCost = resumeWave === null || resumeWave === undefined ? 0 : resumeCostFor(resumeWave);
  const resumeAffordable = resumeCost === 0 || meta.nektar >= resumeCost;
  // B18: der Hub schreibt jetzt genau EIN Meta — den Loadout-Toggle (A19.6). Alles andere
  // bleibt read-only; die Writer-Regel gilt pro Feld, nicht pro Screen.

  // Statische Basis-Liste: nur einmal bauen, nicht pro Render (Godfile-Audit).
  const bases = useMemo(() => createBaseVariants(), []);

  const allVariants = useMemo(
    () => [...bases, ...meta.savedVariants],
    [bases, meta.savedVariants],
  );
  const ownedVariants = useMemo(
    () => allVariants.filter(v => (meta.variantCounts[v.id] || 0) > 0),
    [allVariants, meta.variantCounts],
  );
  const loadoutVariants = useMemo(
    () => meta.loadout
      .map(id => ownedVariants.find(v => v.id === id))
      .filter((v): v is PlantVariant => v !== undefined),
    [meta.loadout, ownedVariants],
  );

  return (
    <div>
      <div style={styles.marquee} aria-hidden>{t('menu.marquee')}</div>

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
        <div style={{ position: 'relative', paddingTop: '14px', display: 'inline-block' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14px', ...styles.modeCardMarketAwning }} />
          <ModeCard
            icon={<SeedIcon />}
            title={t('menu.shop')}
            desc={t('menu.shopDesc')}
            onClick={() => onNavigate('seedshop')}
            style={{ ...styles.modeCard, ...styles.modeCardMarket, order: -1 }}
          />
        </div>
        <ModeCard
          icon={<BugIcon />}
          title={t('menu.beetleLab')}
          desc={t('menu.beetleLabDesc')}
          onClick={() => onNavigate('beetlelab')}
          style={{ ...styles.modeCardNest, order: 99 }}
        />
        {onResume && resumeWave ? (
          <ModeCard
            icon={<WaveIcon />}
            title={t('menu.resume')}
            desc={t('menu.resumeDesc')
              .replace('{n}', String(resumeWave))
              .replace('{cost}', String(resumeCost))}
            onClick={resumeAffordable ? onResume : () => undefined}
            disabled={!resumeAffordable}
            highlight={resumeAffordable}
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
          {/* B25: Zähler und Liste aus EINER Wahrheit (loadoutVariants) — vorher zählte der
              Zähler meta.loadout, die Liste filterte nach Besitz. Ein Eintrag ohne Bestand
              zählte mit, erschien aber nicht: "(3/4), aber zwei Pflanzen" (zwei Berichte). */}
          {t('menu.loadout')} ({loadoutVariants.length}/4) — {t('menu.collection')} ({ownedVariants.length})
        </h3>
        <div style={styles.collectionGrid}>
          {loadoutVariants.map(v => (
            <button
              key={v.id}
              style={styles.loadoutItem}
              onClick={() => onMetaChange(toggleLoadout(v.id))}
              aria-label={`${t('menu.leave')}: ${v.name}`}
            >
              <span style={styles.thumb}>
                <PlantVariantThumb variant={v} size={44} />
              </span>
              <span style={styles.name}>{v.name}</span>
              <span style={styles.count}>✓</span>
            </button>
          ))}
          {ownedVariants.filter(v => !meta.loadout.includes(v.id)).map(v => (
            <button
              key={v.id}
              style={{ ...styles.collectionItem, ...(loadoutVariants.length >= 4 ? styles.loadoutFull : {}) }}
              onClick={() => onMetaChange(toggleLoadout(v.id))}
              disabled={loadoutVariants.length >= 4}
              aria-label={`${t('menu.take')}: ${v.name}`}
            >
              <span style={styles.thumb}>
                <PlantVariantThumb variant={v} size={44} />
              </span>
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
        {t('menu.footer').replace('{v}', APP_VERSION_LABEL)}
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

function ModeCard({ icon, title, desc, onClick, disabled, highlight, tut, style }: {
  icon: React.ReactNode; title: string; desc: string;
  onClick: () => void; disabled?: boolean; highlight?: boolean;
  /** B21.3: Cue-Ziel des Onboardings (`data-tut`) — die Karte bleibt Eigentum des Hubs. */
  tut?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-tut={tut}
      style={{ ...styles.modeCard, ...(highlight ? styles.modeCardHighlight : {}), ...(disabled ? styles.modeCardDisabled : {}), ...style }}
    >
      <div style={styles.modeIcon}>{icon}</div>
      <div style={styles.modeTitle}>{title}</div>
      <div style={styles.modeDesc}>{desc}</div>
    </button>
  );
}
