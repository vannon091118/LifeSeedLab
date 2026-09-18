import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import type { PlaceMode } from './placementController';
import { plantLabelKey, plantLabelFallback, tileLabelKey, tileLabelFallback } from './plantLabels';
import { useI18n } from '../i18n';

// Owner: UI (PlacementTray). LOC ≤ 400.
// B3: Tray-Karten wählen per pointerdown aus (kein Hover, kein click-Pfad) — Desktop und
// Touch teilen dieselbe Pipeline. Der Karten-Tap ist reine Auswahl; gelegt wird auf dem Feld.

export interface PlacementTrayProps {
  plantIds: string[];
  inventory: Record<string, number>;
  energy: number;
  mode: PlaceMode;
  variantId: string | null;
  onSelectPlant: (variantId: string, count: number) => void;
  onSelectTile: (tile: MapTileType) => void;
  /** B36: Nachkauf im Lauf — Energie → 1× Pflanze ins Inventar (Playtest R2 #2). */
  onBuyPlant: (variantId: string) => void;
  /** Preis pro Nachkauf-Kauf (Pflanzenkosten × Aufschlag, aus der Source abgeleitet). */
  restockPrice: (variantId: string) => number;
  /** D3: i18n-Sektions-Labels — die Tray trennt KAMPF (Pflanzen) von FELD (Tiles). */
  trayPlantsLabel: string;
  trayFieldLabel: string;
}

export function PlacementTray({ plantIds, inventory, energy, mode, variantId, onSelectPlant, onSelectTile, onBuyPlant, restockPrice, trayPlantsLabel, trayFieldLabel }: PlacementTrayProps) {
  const { t } = useI18n();
  // F4: Labels über i18n-Auflösung (Source-i18nKey → Fallback-Kette in plantLabels.ts).
  const plantLabel = (id: string): string => {
    const key = plantLabelKey(id);
    return key ? t(key) : plantLabelFallback(id);
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
      {/* D3: Sektions-Trennung — Pflanzen (Kampf) und Feld-Tiles (Infrastruktur) sind
          verschiedene Spielfunktionen und werden nicht mehr als identische Knöpfe
          in einer Zeile gemischt. Trenner: TrayDivider. */}
      <div style={styles.traySection} aria-label={trayPlantsLabel}>
        <span style={styles.sectionLabel} aria-hidden>{trayPlantsLabel}</span>
        <div style={styles.sectionRow}>
        {plantIds.map(id => {
        const count = inventory[id] ?? 0;
        const isSelected = variantId === id && mode === 'plant';
        const disabled = count <= 0;
        const label = plantLabel(id);
        return (
          <Fragment key={id}>
          <button
            onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); onSelectPlant(id, count); }}
            data-tut={id === firstPlayable ? 'card' : undefined}
            data-plant={id}
            style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}), ...(disabled ? styles.trayItemDisabled : {}) }}
            aria-pressed={isSelected} aria-disabled={disabled} title={label}
          >
            <span style={styles.trayDot} aria-hidden/>
            <span style={styles.trayName}>{label}</span>
            <span style={styles.trayCount}>×{count}</span>
          </button>
          {/* B36: Bei leerem Vorrat ein Kauf-Knopf — der Lauf endet nie am leeren Inventar,
              solange Energie da ist (Playtest R2: „ich kann nur noch zusehen“).
              Lauf-3-Bericht: Karte zeigt Name + Preis, nicht nur „+ 80“ — der Kauf soll
              lesbar sein, ohne den Tooltip zu bemühen. */}
          {count <= 0 && (
            <button
              key={`${id}-buy`}
              onPointerDown={(e) => { e.stopPropagation(); (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); onBuyPlant(id); }}
              data-restock={id}
              style={{ ...styles.trayItem, ...(energy < restockPrice(id) ? styles.trayItemDisabled : {}) }}
              aria-label={`${label} nachkaufen (${restockPrice(id)})`}
              title={`+1 ${label} — ${restockPrice(id)} Energie`}
            >
              <span style={styles.trayName}>{label}</span>
              <span style={styles.trayCount}>+{restockPrice(id)}⚡</span>
            </button>
          )}
          </Fragment>
        );
        })}
        </div>
      </div>

      <div style={styles.trayDivider} aria-hidden/>

      {/* P5/D3: Feld-Sektion — Wege lenken Gegner, Töpfe tragen Pflanzen, Findlinge blockieren */}
      <div style={styles.traySection} aria-label={trayFieldLabel}>
        <span style={styles.sectionLabel} aria-hidden>{trayFieldLabel}</span>
        <div style={styles.sectionRow}>
        {(Object.keys(MAP_TILES_SOURCE) as MapTileType[]).map(tile => {
        const isSelected = mode === tile;
        const affordable = energy >= MAP_TILES_SOURCE[tile].cost;
        return (
          <button
            key={tile}
            onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); onSelectTile(tile); }}
            style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}), ...(affordable ? {} : styles.trayItemDisabled) }}
            aria-pressed={isSelected} aria-disabled={!affordable}
            title={`${tileLabel(tile)} (${MAP_TILES_SOURCE[tile].cost} Energie)`}
          >
            <span style={{ ...styles.trayDot, background: tileSwatch(tile) }} aria-hidden/>
            <span style={styles.trayName}>{tileLabel(tile)}</span>
            <span style={styles.trayCount}>{MAP_TILES_SOURCE[tile].cost}⚡</span>
          </button>
        );
        })}
        </div>
      </div>
    </div>
  );
}

/** Tile-Farben der Tray-Punkte (Präsentation der Auswahl, nicht der Welt). */
function tileSwatch(tile: MapTileType): string {
  switch (tile) {
    case 'path': return '#d9c9a3';
    case 'pot': return '#c96f3b';
    case 'boulder': return '#9a948a';
    default: return '#c96f8e';
  }
}

const styles: Record<string, CSSProperties> = {
  tray: { position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: '10px 12px', background: '#fbf6e9', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink)', maxWidth: 'calc(100% - 20px)', overflowX: 'auto' },
  // Q2 (QA): touchAction none — der Drag aus der Tray darf dem Browser nicht als Scroll-Geste
  // gestohlen werden; releasePointerCapture im Handler lässt die Pointer-Events zum Canvas.
  trayItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px', background: '#fff', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--ink)', borderRadius: 10, cursor: 'pointer', color: 'var(--ink)', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)', minWidth: 76, flexShrink: 0, lineHeight: 1.1, minHeight: 64, touchAction: 'none' as const },
  trayItemSelected: { background: '#f0fdf4', borderColor: 'var(--leaf)', boxShadow: '2px 2px 0 var(--leaf-dark)' },
  trayItemDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  trayDot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--leaf)', border: '1.5px solid var(--ink)', flexShrink: 0 },
  trayName: { fontSize: 11, color: 'var(--ink)', textAlign: 'center', wordBreak: 'break-word', maxWidth: 72 },
  trayCount: { fontSize: 11, color: '#6b6250', fontWeight: 800 },
  // D3: Sektionen — vertikale Stapel pro Funktionsgruppe, schmale Labels oben
  traySection: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  sectionRow: { display: 'flex', gap: 8 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.5, color: '#8a8065', fontWeight: 800 },
  trayDivider: { width: 2, alignSelf: 'stretch', background: 'var(--ink)', opacity: 0.25, borderRadius: 2 },
};
