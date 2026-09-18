// Owner: Source/Config (Map-Layout, serialisiert). LOC ≤ 200.
// B34-Split aus map.source.ts (Cap 200 überschritten): Die Serialized-Map-Sektion
// (PvP-Vertrag, geteilte/geladene Maps) ist eine eigene Verantwortung — der Tile-/
// Bau-/Korridor-Teil bleibt in map.source.ts. Einzige Quelle für MapLayout + Validierung.

import { MAP_TILES_SOURCE, MAP_TILE_IDS, defaultMapTiles, type MapTileType } from './map.source';

/** Serialized Map-Layout (Spieler-Maps, P5/PvP): tiles als "x,y":type-Map. */
export interface MapLayout {
  version: 1;
  tiles: Record<string, MapTileType>;
}

export function emptyMapLayout(): MapLayout {
  return { version: 1, tiles: defaultMapTiles() };
}

export function isValidTileType(t: string): t is MapTileType {
  return t in MAP_TILES_SOURCE;
}

/** Layout-Validierung für geteilte/geladene Maps (maxCounts, Typen, Raster). */
export function validateMapLayout(
  layout: MapLayout,
  isInside: (gx: number, gy: number) => boolean,
): { ok: true } | { ok: false; reason: string } {
  if (layout.version !== 1) return { ok: false, reason: 'version' };
  const counts: Partial<Record<MapTileType, number>> = {};
  for (const [key, type] of Object.entries(layout.tiles)) {
    if (!isValidTileType(type)) return { ok: false, reason: `type:${type}` };
    const [gx, gy] = key.split(',').map(Number);
    if (!Number.isInteger(gx) || !Number.isInteger(gy) || !isInside(gx, gy)) {
      return { ok: false, reason: `cell:${key}` };
    }
    counts[type] = (counts[type] ?? 0) + 1;
  }
  for (const t of MAP_TILE_IDS) {
    if ((counts[t] ?? 0) > MAP_TILES_SOURCE[t].maxCount) return { ok: false, reason: `max:${t}` };
  }
  return { ok: true };
}
