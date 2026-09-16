import type { CSSProperties } from 'react';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import { PLANTS_SOURCE, type PlantTypeId } from '../config/plants.source';
import type { PlaceMode } from './placementController';

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
}

export function PlacementTray({ plantIds, inventory, energy, mode, variantId, onSelectPlant, onSelectTile }: PlacementTrayProps) {
  return (
    <div style={styles.tray} role="toolbar" aria-label="Pflanzenauswahl">
      {plantIds.map(id => {
        const count = inventory[id] ?? 0;
        const isSelected = variantId === id && mode === 'plant';
        const disabled = count <= 0;
        const label = PLANTS_SOURCE[id as PlantTypeId]?.label ?? id;
        return (
          <button
            key={id}
            onPointerDown={() => onSelectPlant(id, count)}
            style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}), ...(disabled ? styles.trayItemDisabled : {}) }}
            aria-pressed={isSelected} aria-disabled={disabled} title={label}
          >
            <span style={styles.trayDot} aria-hidden/>
            <span style={styles.trayName}>{label}</span>
            <span style={styles.trayCount}>×{count}</span>
          </button>
        );
      })}
      {/* P5: Map-Tiles — Wege lenken Gegner, Töpfe tragen Pflanzen, Findlinge blockieren */}
      {(Object.keys(MAP_TILES_SOURCE) as MapTileType[]).map(tile => {
        const isSelected = mode === tile;
        const affordable = energy >= MAP_TILES_SOURCE[tile].cost;
        return (
          <button
            key={tile}
            onPointerDown={() => onSelectTile(tile)}
            style={{ ...styles.trayItem, ...(isSelected ? styles.trayItemSelected : {}), ...(affordable ? {} : styles.trayItemDisabled) }}
            aria-pressed={isSelected} aria-disabled={!affordable}
            title={`${MAP_TILES_SOURCE[tile].label} (${MAP_TILES_SOURCE[tile].cost} Energie)`}
          >
            <span style={{ ...styles.trayDot, background: tileSwatch(tile) }} aria-hidden/>
            <span style={styles.trayName}>{MAP_TILES_SOURCE[tile].label}</span>
            <span style={styles.trayCount}>{MAP_TILES_SOURCE[tile].cost}⚡</span>
          </button>
        );
      })}
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
  trayItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, cursor: 'pointer', color: 'var(--ink)', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)', minWidth: 76, flexShrink: 0, lineHeight: 1.1, minHeight: 64 },
  trayItemSelected: { background: '#f0fdf4', borderColor: 'var(--leaf)', boxShadow: '2px 2px 0 var(--leaf-dark)' },
  trayItemDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  trayDot: { width: 10, height: 10, borderRadius: '50%', background: 'var(--leaf)', border: '1.5px solid var(--ink)', flexShrink: 0 },
  trayName: { fontSize: 11, color: 'var(--ink)', textAlign: 'center', wordBreak: 'break-word', maxWidth: 72 },
  trayCount: { fontSize: 11, color: '#6b6250', fontWeight: 800 },
};
