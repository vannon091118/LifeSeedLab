import { useState } from 'react';
import { Fragment } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import type { PlaceMode } from './placementController';
import { plantLabelKey, plantLabelFallback, tileLabelKey, tileLabelFallback } from './plantLabels';
import { useI18n } from '../i18n';

// Owner: UI (PlacementTray). LOC ≤ 400.
// B3: Tray-Karten wählen per pointerdown aus (kein Hover) — Desktop und Touch teilen dieselbe
// Pipeline. Der Karten-Tap ist reine Auswahl; gelegt wird auf dem Feld.
// Spieltest v0.0.71: `pointerdown` allein ließ Tastatur, Screenreader und synthetische
// Klick-Events stumm — der Aktivierungsvertrag steht deshalb in `cardPress` (Pointer + Klick).
//
// Mapbuilder-Umschalter (Playtest R2-Diagonal): PFLANZEN und BAU sind zwei getrennte
// Werkzeugkästen des Map-Builders — NUR der aktive Kasten ist sichtbar (Tab-Regie, kein
// Misch-Karussell). Der Modus folgt dem Tab: ein Tile-Tab schließt die Pflanzen-Auswahl,
// ein Pflanzen-Tab schließt den Verkaufs-/Tile-Modus (eine Wahrheit `mode` im Controller).

type TrayTab = 'plants' | 'build';

interface PlacementTrayProps {
  plantIds: string[];
  inventory: Record<string, number>;
  mode: PlaceMode;
  variantId: string | null;
  onSelectPlant: (variantId: string, count: number) => void;
  onSelectTile: (tile: MapTileType) => void;
  /** Juggling: Verkaufsmodus — Tap auf ein gebautes Tile kassiert 50% Refund. */
  onSelectSell: () => void;
  /** D3: i18n-Sektions-Labels — die Tray trennt KAMPF (Pflanzen) von FELD (Tiles). */
  trayPlantsLabel: string;
  trayFieldLabel: string;
  /** QA v0.0.53 #3: gezüchtete Varianten stehen nicht in `PLANTS_SOURCE` — ohne diese Namen
   *  fiel die Karte auf die Roh-ID zurück („seed_0 ×1" im Run, während das Gewächshaus
   *  „Spross (Keim 1)" zeigte: zwei Screens, zwei Wahrheiten über dieselbe Pflanze). */
  names?: Record<string, string>;
}

export function PlacementTray({ plantIds, inventory, mode, variantId, onSelectPlant, onSelectTile, onSelectSell, trayPlantsLabel, trayFieldLabel, names }: PlacementTrayProps) {
  const { t } = useI18n();
  // Tab-Regie: 'sell' gehört zum BAU-Kasten, ein MapTileType ebenfalls; 'plant' zum
  // PFLANZEN-Kasten. Der sichtbare Tab leitet sich aus dem Modus AB (kein zweiter
  // Auswahl-State) — wählt der Spieler eine Pflanze, springt der Kasten auf PFLANZEN;
  // ein Tile/Verkauf auf BAU.
  const tab: TrayTab = mode === 'plant' ? 'plants' : 'build';
  const [manualTab, setManualTab] = useState<TrayTab | null>(null);
  const active: TrayTab = manualTab ?? tab;
  // F4: Labels über i18n-Auflösung (Source-i18nKey → Fallback-Kette in plantLabels.ts).
  const plantLabel = (id: string): string => {
    const key = plantLabelKey(id);
    if (key) return t(key);
    // Besitz-Bibliothek des Spielers vor der Roh-ID: eine gezüchtete Pflanze hat einen Namen.
    return names?.[id] ?? plantLabelFallback(id);
  };
  const tileLabel = (tile: MapTileType): string => {
    const key = tileLabelKey(tile);
    return key ? t(key) : tileLabelFallback(tile);
  };
  // LEERE KARTEN VERSCHWINDEN (Playtest-Befund „Wurzelmauer ×0"): ein Kartenplatz ohne Bestand
  // ist kein Werkzeug, sondern Rauschen — er ist nicht wählbar (`aria-disabled`), belegt aber
  // Platz und sieht wie eine Option aus. Beide Kästen folgen derselben Regel: im Kasten steht,
  // was man HAT. Dass dabei kein Zombie-Zustand entsteht, garantiert der Controller, nicht die
  // Tray: er bricht die Auswahl selbst ab, sobald der Bestand auf 0 fällt
  // (`placementController.ts`, Q17 — nach der letzten Einheit ist `variantId` null).
  const plantCards = cardsWithStock(plantIds, inventory);
  const tileCards = cardsWithStock(Object.keys(MAP_TILES_SOURCE) as MapTileType[], inventory);
  // B21: Die ERSTE Karte mit Bestand ist das Cue-Ziel des Onboardings (`data-tut="card"`) — genau
  // ein Element, damit der blinkende Ring eindeutig ist. Kein State, keine Auswahl-Logik.
  const firstPlayable = plantCards[0] ?? null;
  return (
    <div style={styles.tray} role="toolbar" aria-label="Pflanzenauswahl">
      {/* Mapbuilder-Tabs: zwei Werkzeugkästen, genau EINER sichtbar. aria-pressed statt
          aria-selected (Knopf-Sprache wie der Rest der Tray, E2E liest pressed). */}
      <div style={styles.tabRow}>
        <button
          {...cardPress(() => setManualTab('plants'))}
          style={{ ...styles.tab, ...(active === 'plants' ? styles.tabActive : {}) }}
          aria-pressed={active === 'plants'}
          title={trayPlantsLabel}
        >
          <span style={styles.tabDot} aria-hidden/>
          {trayPlantsLabel}
        </button>
        <button
          {...cardPress(() => setManualTab('build'))}
          style={{ ...styles.tab, ...(active === 'build' ? styles.tabActive : {}) }}
          aria-pressed={active === 'build'}
          title={trayFieldLabel}
        >
          <span style={{ ...styles.tabDot, background: '#c96f3b' }} aria-hidden/>
          {trayFieldLabel}
        </button>
      </div>

      {/* PFLANZEN-Kasten (Kampf) — nur im Pflanzen-Tab sichtbar, und nur mit Bestand: ein leeres
          Rasterfeld wird nicht als Karte gezeigt (Befund „Wurzelmauer ×0"). */}
      {active === 'plants' && plantCards.length > 0 && (
        <div style={styles.traySection} aria-label={trayPlantsLabel}>
          <div style={styles.sectionRow}>
          {plantCards.map(id => {
          const count = inventory[id] ?? 0;
          const isSelected = variantId === id && mode === 'plant';
          const label = plantLabel(id);
          return (
            <Fragment key={id}>
            <button
              {...cardPress(() => { onSelectPlant(id, count); setManualTab(null); })}
              data-tut={id === firstPlayable ? 'card' : undefined}
              data-plant={id}
              style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}) }}
              aria-pressed={isSelected} title={label}
            >
              <span style={styles.trayDot} aria-hidden/>
              <span style={styles.trayName}>{label}</span>
              <span style={styles.trayCount}>×{count}</span>
            </button>
            </Fragment>
          );
          })}
          </div>
        </div>
      )}

      {/* VERKAUF: ein EIGENER Knopf OBERHALB des Werkzeugkastens (Playtest R2-Befund:
          „Verkaufen ist kein Unterpunkt" — vorher hing es als vierte Karte im Tile-Row und
          wurde als Tile missverstanden). Er wählt den Verkaufsmodus direkt aus; `aria-pressed`
          ist der Auswahlzustand, den E2E liest. */}
      {active === 'build' && (
        <button
          {...cardPress(onSelectSell)}
          aria-pressed={mode === 'sell'}
          data-tool="sell"
          style={{ ...styles.sellButton, ...(mode === 'sell' ? styles.sellButtonActive : {}) }}
          title={t('game.sellHint')}
        >
          <span style={styles.sellDot} aria-hidden/>
          <span>{t('game.sellTool')}</span>
          <span style={styles.sellNote}>{t('game.sellRefund')}</span>
        </button>
      )}

      {/* BAU-Kasten (Mapbuilder) — Tiles + Verkauf, nur im Bau-Tab sichtbar.
          Töpfe tragen Pflanzen und blockieren — der Weg kommt aus dem Pathfinding. */}
      {active === 'build' && tileCards.length > 0 && (
        <div style={styles.traySection} aria-label={trayFieldLabel}>
          <div style={styles.sectionRow}>
          {tileCards.map(tile => {
          const isSelected = mode === tile;
          return (
            <button
              key={tile}
              {...cardPress(() => onSelectTile(tile))}
              style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}) }}
              aria-pressed={isSelected}
              // Der Topf erklärt seine vier Farben dort, wo man ihn auswählt (der Titel nennt
              // die Wirkung; keine schwebende Blase, die die Karten verdecken würde).
              title={tile === 'pot'
                ? `${t('map.potHint')} ${POT_LEGEND_KEYS.map(k => t(k)).join(' · ')}`
                : `${tileLabel(tile)} — im Pool: ${inventory[tile] ?? 0}`}
            >
              <span style={{ ...styles.trayDot, background: tileSwatch(tile) }} aria-hidden/>
              <span style={styles.trayName}>{tileLabel(tile)}</span>
              <span style={styles.trayCount}>×{inventory[tile] ?? 0}</span>
            </button>
          );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Die Karten EINES Kastens, die Bestand haben — leere Felder sind kein Werkzeug (Playtest-Befund
 * „Wurzelmauer ×0"): sie sind nicht wählbar, belegen aber Platz und sehen wie eine Option aus.
 * EINE Regel für beide Kästen (Pflanzen und Bau), damit die Tray nicht zwei Wahrheiten über
 * „leer" trägt. Der Zustand kommt aus dem Run-Inventar, nicht aus einer zweiten Kopie.
 */
export function cardsWithStock<T extends string>(ids: readonly T[], inventory: Record<string, number>): T[] {
  return ids.filter(id => (inventory[id] ?? 0) > 0);
}

/**
 * Der EINE Aktivierungsvertrag jeder Tray-Karte: Pointer UND Klick.
 *
 * `pointerdown` bleibt der Pfad für Maus und Touch (B3: eine Pipeline für beide, und der
 * `releasePointerCapture`-Griff lässt den Drag aus der Tray zum Brett durch). Aber ein `<button>`
 * wird von TASTATUR (Enter/Space), Screenreader und synthetischen Klick-Events über `click`
 * aktiviert — dort feuert nie ein `pointerdown`, die Karte war also stumm (Befund der
 * Spieltestsession v0.0.71: „reagieren nicht auf Klick-Events").
 *
 * Die Herkunft unterscheidet der `detail`-Wert des Klicks: echte Zeigegeräte liefern `detail >= 1`
 * (der pointerdown-Pfad hat schon ausgewählt — ein zweites Auslösen würde die Auswahl sofort
 * wieder umschalten), Tastatur/Screenreader/synthetische Klicks liefern `detail === 0`.
 */
export function cardPress(activate: () => void): {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onClick: (e: { detail: number }) => void;
} {
  return {
    onPointerDown: (e) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      activate();
    },
    onClick: (e) => {
      if (e.detail === 0) activate();
    },
  };
}

/** Die vier Topffarben als Punkt: der Topf ist ein Booster, seine Farbe sagt wie (s. Palette). */
const POT_SWATCH = 'conic-gradient(#f0b775 0 25%, #c8a4e0 0 50%, #a8cd86 0 75%, #d99b84 0) ';

/** i18n-Keys der Topf-Wirkungen (Reihenfolge = POT_COLORS-Ableitung). */
const POT_LEGEND_KEYS = ['pot.amber', 'pot.violet', 'pot.moss', 'pot.rust'] as const;

/** Tile-Farben der Tray-Punkte (Präsentation der Auswahl, nicht der Welt). */
function tileSwatch(tile: MapTileType): string {
  switch (tile) {
    case 'pot': return POT_SWATCH;
    default: return '#c96f8e';
  }
}

const styles: Record<string, CSSProperties> = {
  tray: { position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px 10px', background: '#fbf6e9', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink)', maxWidth: 'calc(100% - 20px)' },
  // Mapbuilder-Tabs: kleine Schalterreihe über dem aktiven Kasten
  tabRow: { display: 'flex', gap: 6, justifyContent: 'center' },
  tab: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 999, color: 'var(--ink)', fontSize: 10, fontWeight: 800, letterSpacing: 1.2, cursor: 'pointer', boxShadow: '1.5px 1.5px 0 var(--ink)', minHeight: 30 },
  tabActive: { background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)', boxShadow: '1.5px 1.5px 0 var(--ink)' },
  tabDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--leaf)', border: '1.5px solid var(--ink)', flexShrink: 0 },
  // Q2 (QA): touchAction none — der Drag aus der Tray darf dem Browser nicht als Scroll-Geste
  // gestohlen werden; releasePointerCapture im Handler lässt die Pointer-Events zum Canvas.
  trayItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px', background: '#fff', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--ink)', borderRadius: 10, cursor: 'pointer', color: 'var(--ink)', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)', minWidth: 76, flexShrink: 0, lineHeight: 1.1, minHeight: 64, touchAction: 'none' as const },
  trayItemSelected: { background: '#f0fdf4', borderColor: 'var(--leaf)', boxShadow: '2px 2px 0 var(--leaf-dark)' },
  trayDot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--leaf)', border: '1.5px solid var(--ink)', flexShrink: 0 },
  trayName: { fontSize: 11, color: 'var(--ink)', textAlign: 'center', wordBreak: 'break-word', maxWidth: 72 },
  trayCount: { fontSize: 11, color: '#6b6250', fontWeight: 800 },
  // D3: Sektionen — vertikale Stapel pro Funktionsgruppe
  traySection: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  sectionRow: { display: 'flex', gap: 8, overflowX: 'auto', maxWidth: '100%' },
  // Verkauf: eigener, voll breiter Werkzeug-Knopf ÜBER dem Tile-Kasten
  sellButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, cursor: 'pointer', color: 'var(--ink)', fontSize: 12, fontWeight: 800, letterSpacing: 0.6, boxShadow: '2px 2px 0 var(--ink)', minHeight: 40, touchAction: 'none' as const },
  sellButtonActive: { background: '#fde8d8', borderColor: '#c96f3b', boxShadow: '2px 2px 0 #c96f3b' },
  sellDot: { width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(135deg, #c96f3b 50%, #d9c9a3 50%)', border: '1.5px solid var(--ink)', flexShrink: 0 },
  sellNote: { fontSize: 10, color: '#6b6250', fontWeight: 700 },
};
