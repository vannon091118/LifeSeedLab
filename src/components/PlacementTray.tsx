import { useState } from 'react';
import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import type { PlaceMode } from './placementController';
import { plantLabelKey, plantLabelFallback, tileLabelKey, tileLabelFallback } from './plantLabels';
import { useI18n } from '../i18n';

// Owner: UI (PlacementTray). LOC ≤ 400.
// B3: Tray-Karten wählen per pointerdown aus (kein Hover, kein click-Pfad) — Desktop und
// Touch teilen dieselbe Pipeline. Der Karten-Tap ist reine Auswahl; gelegt wird auf dem Feld.
//
// Mapbuilder-Umschalter (Playtest R2-Diagonal): PFLANZEN und BAU sind zwei getrennte
// Werkzeugkästen des Map-Builders — NUR der aktive Kasten ist sichtbar (Tab-Regie, kein
// Misch-Karussell). Der Modus folgt dem Tab: ein Tile-Tab schließt die Pflanzen-Auswahl,
// ein Pflanzen-Tab schließt den Verkaufs-/Tile-Modus (eine Wahrheit `mode` im Controller).

type TrayTab = 'plants' | 'build';

export interface PlacementTrayProps {
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
  // B21: Die ERSTE Karte mit Bestand ist das Cue-Ziel des Onboardings (`data-tut="card"`) — genau
  // ein Element, damit der blinkende Ring eindeutig ist. Kein State, keine Auswahl-Logik.
  const firstPlayable = plantIds.find(id => (inventory[id] ?? 0) > 0) ?? null;
  return (
    <div style={styles.tray} role="toolbar" aria-label="Pflanzenauswahl">
      {/* Mapbuilder-Tabs: zwei Werkzeugkästen, genau EINER sichtbar. aria-pressed statt
          aria-selected (Knopf-Sprache wie der Rest der Tray, E2E liest pressed). */}
      <div style={styles.tabRow}>
        <button
          onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); setManualTab('plants'); }}
          style={{ ...styles.tab, ...(active === 'plants' ? styles.tabActive : {}) }}
          aria-pressed={active === 'plants'}
          title={trayPlantsLabel}
        >
          <span style={styles.tabDot} aria-hidden/>
          {trayPlantsLabel}
        </button>
        <button
          onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); setManualTab('build'); }}
          style={{ ...styles.tab, ...(active === 'build' ? styles.tabActive : {}) }}
          aria-pressed={active === 'build'}
          title={trayFieldLabel}
        >
          <span style={{ ...styles.tabDot, background: '#c96f3b' }} aria-hidden/>
          {trayFieldLabel}
        </button>
      </div>

      {/* PFLANZEN-Kasten (Kampf) — nur im Pflanzen-Tab sichtbar */}
      {active === 'plants' && (
        <div style={styles.traySection} aria-label={trayPlantsLabel}>
          <div style={styles.sectionRow}>
          {plantIds.map(id => {
          const count = inventory[id] ?? 0;
          const isSelected = variantId === id && mode === 'plant';
          const disabled = count <= 0;
          const label = plantLabel(id);
          return (
            <Fragment key={id}>
            <button
              onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); onSelectPlant(id, count); setManualTab(null); }}
              data-tut={id === firstPlayable ? 'card' : undefined}
              data-plant={id}
              style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}), ...(disabled ? styles.trayItemDisabled : {}) }}
              aria-pressed={isSelected} aria-disabled={disabled} title={label}
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
          onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); onSelectSell(); }}
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
          Wege lenken Gegner, Töpfe tragen Pflanzen, Findlinge blockieren. */}
      {active === 'build' && (
        <div style={styles.traySection} aria-label={trayFieldLabel}>
          <div style={styles.sectionRow}>
          {(Object.keys(MAP_TILES_SOURCE) as MapTileType[]).map(tile => {
          const isSelected = mode === tile;
          // #4: bezahlbar = im POOL vorhanden (kein Energie-Guthaben mehr).
          const affordable = (inventory[tile] ?? 0) > 0;
          return (
            <button
              key={tile}
              onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); onSelectTile(tile); }}
              style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}), ...(affordable ? {} : styles.trayItemDisabled) }}
              aria-pressed={isSelected} aria-disabled={!affordable}
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

/** Die vier Topffarben als Punkt: der Topf ist ein Booster, seine Farbe sagt wie (s. Palette). */
const POT_SWATCH = 'conic-gradient(#f0b775 0 25%, #c8a4e0 0 50%, #a8cd86 0 75%, #d99b84 0) ';

/** i18n-Keys der Topf-Wirkungen (Reihenfolge = POT_COLORS-Ableitung). */
const POT_LEGEND_KEYS = ['pot.amber', 'pot.violet', 'pot.moss', 'pot.rust'] as const;

/** Tile-Farben der Tray-Punkte (Präsentation der Auswahl, nicht der Welt). */
function tileSwatch(tile: MapTileType): string {
  switch (tile) {
    case 'path': return '#d9c9a3';
    case 'pot': return POT_SWATCH;
    case 'boulder': return '#9a948a';
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
  trayItemDisabled: { opacity: 0.45, cursor: 'not-allowed' },
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
