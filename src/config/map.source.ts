// Owner: Source (content truth). LOC ≤ 200.
// Map-System-Quelle (P5): Tile-Typen, Kosten, Pathfinding-Regeln. Kein Code außerhalb
// config/ darf diese Werte definieren. Das Grundraster (GRID_COLS/ROWS) bleibt in
// world.source — hier kommen nur die Spieler-Elemente DARAUF (ein Raster, ein Owner).

/** Tile-Typen, die der Spieler platzieren kann. */
export type MapTileType = 'pot' | 'path' | 'boulder' | 'decor';

export interface MapTileSource {
  id: MapTileType;
  /** Energie-Kosten pro Platzierung (In-Run-Währung, wie Pflanzen). */
  cost: number;
  /** Pathfinding-Beteiligung: walkable = Gegner laufen darüber, block = Wand. */
  walkable: boolean;
  /** Pfad-Gewicht: 1 = normal, <1 = Gegner bevorzugen („gelegter Weg"), >1 = miedsen. */
  weight: number;
  /** max. Tiles dieses Typs pro Map (Balance-Klemme, verhindert Weg-Mauern). */
  maxCount: number;
}

export const MAP_TILES_SOURCE: Record<MapTileType, MapTileSource> = {
  // Blumentopf: PLATZIERFLÄCHE für Pflanzen (Pflanzen brauchen jetzt einen Topf!)
  pot:     { id: 'pot',     cost: 15, walkable: false, weight: 999, maxCount: 24 },
  // Weg-Tile: Gegner BEVORZUGEN es (weight < 1) — der Spieler lenkt den Laufweg
  path:    { id: 'path',    cost: 5,  walkable: true,  weight: 0.45, maxCount: 30 },
  // Findling: BLOCKIERT den Weg — Gegner müssen umlaufen. maxCount 6 < 8 Zeilen:
  // eine komplette Spalten-Mauer ist UNMÖGLICH (Softlock-Schutz an der Quelle).
  boulder: { id: 'boulder', cost: 20, walkable: false, weight: 999, maxCount: 6 },
  // Deko: rein kosmetisch, begehbar, keine Path-Bedeutung
  decor:   { id: 'decor',   cost: 3,  walkable: true,  weight: 1, maxCount: 20 },
};

export const MAP_TILE_IDS = Object.keys(MAP_TILES_SOURCE) as MapTileType[];

/** Dijkstra-Nachbarschaft: 4-direktional (kein diagonales Schneiden von Weg-Blöcken). */
export const MAP_NEIGHBOR_MODE = 'ortho4' as const;

/** Grund-Gewicht für un-bebaut begehbare Zellen (Papier-Wiese). */
export const MAP_DEFAULT_WEIGHT = 1;

/** Sicherheitsnetz: Wenn kein Weg zum Ausgang existiert, gilt der DEFAULT-Pfad
 * (ENEMY_PATH) — die Map kann den Run nicht softlocken. */
export const MAP_FALLBACK_TO_DEFAULT_PATH = true;

/** Start-Tiles einer frischen Map (gestaltetes, leeres Spielfeld). */
export function defaultMapTiles(): Record<string, MapTileType> {
  // leer: "bereits gestaltet" kommt vom Terrain-Bake (Papierwelt), nicht von Tiles
  return {};
}

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
