// Owner: Source (content truth). LOC ≤ 200.
// Map-System-Quelle (P5): Tile-Typen, Kosten, Pathfinding-Regeln. Kein Code außerhalb
// config/ darf diese Werte definieren. Das Grundraster (GRID_COLS/ROWS) bleibt in
// world.source — hier kommen nur die Spieler-Elemente DARAUF (ein Raster, ein Owner).

/** Tile-Typen, die der Spieler platzieren kann. */
export type MapTileType = 'pot' | 'path' | 'boulder' | 'decor';

export interface MapTileSource {
  id: MapTileType;
  /** Anzeigename (UI/Tray) — die Spielwelt benennt deutsch (vgl. names.source). */
  label: string;
  /** F4: i18n-Key der Übersetzung (translations.ts) — Content-Truth verweist, UI liest i18n. */
  i18nKey: string;
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
  pot:     { id: 'pot',     label: 'Blumentopf', i18nKey: 'map.pot', cost: 15, walkable: false, weight: 999, maxCount: 24 },
  // Weg-Tile: Gegner BEVORZUGEN es (weight < 1) — der Spieler lenkt den Laufweg.
  // M4 (Sprint AP2): 0.6 statt 0.45 — der Vorsprung zur Wiese (1) ist kleiner, damit die
  // Pflanzen-Kosten (PLANT_ROUTE_COST) auf Weg-Zellen nicht decode und das Zucht-Layout
  // als Maze-Bauwerk spürbar bleibt. Nur Source (Regel 6).
  path:    { id: 'path',    label: 'Weg', i18nKey: 'map.path',        cost: 5,  walkable: true,  weight: 0.6, maxCount: 30 },
  // Findling: BLOCKIERT den Weg — Gegner müssen umlaufen. maxCount 6 < 8 Zeilen:
  // eine komplette Spalten-Mauer ist UNMÖGLICH (Softlock-Schutz an der Quelle).
  boulder: { id: 'boulder', label: 'Findling', i18nKey: 'map.boulder',   cost: 20, walkable: false, weight: 999, maxCount: 6 },
  // Deko: rein kosmetisch, begehbar, keine Path-Bedeutung
  decor:   { id: 'decor',   label: 'Deko', i18nKey: 'map.decor',       cost: 3,  walkable: true,  weight: 1, maxCount: 20 },
};

export const MAP_TILE_IDS = Object.keys(MAP_TILES_SOURCE) as MapTileType[];

/** Dijkstra-Nachbarschaft: 4-direktional (kein diagonales Schneiden von Weg-Blöcken). */
export const MAP_NEIGHBOR_MODE = 'ortho4' as const;

/** Grund-Gewicht für un-bebaut begehbare Zellen (Papier-Wiese). */
export const MAP_DEFAULT_WEIGHT = 1;

/** D4 (Drift-Befund): Kosten-Beaufschlagung einer Zelle MIT Pflanze im Route-Dijkstra.
 *  Die entscheidende Maze-Balance-Schraube: wie stark das Zucht-Layout den Laufweg beugt.
 *  Muss aus der Simulation gelockt bleiben — balance-Änderungen sind Source-Änderungen. */
export const PLANT_ROUTE_COST = 2;

// ── Path-Autoconnect (Konfiguration) ──────────────────────────────────────
// Path-Tiles verbinden sich automatisch mit Nachbarn. Die Verbindungs-
// logik ist config-driven: jeder Tile-Typ kann `connectsTo` angeben.

/** Nachbar-Offsets für die Verbindungs-Erkennung (ortho4). */
export const PATH_NEIGHBORS: readonly [number, number][] = [
  [0, -1], // oben
  [1, 0],  // rechts
  [0, 1],  // unten
  [-1, 0], // links
] as const;

/** Verbindungstypen basierend auf Nachbar-Konfiguration. */
export type PathConnection =
  | 'straight_h'  // links + rechts
  | 'straight_v'  // oben + unten
  | 'corner_tl'   // oben + links
  | 'corner_tr'   // oben + rechts
  | 'corner_bl'   // unten + links
  | 'corner_br'   // unten + rechts
  | 't_top'       // oben + links + rechts
  | 't_bottom'    // unten + links + rechts
  | 't_left'      // oben + unten + links
  | 't_right'     // oben + unten + rechts
  | 'cross'       // alle 4
  | 'end_top'     // nur oben
  | 'end_right'   // nur rechts
  | 'end_bottom'  // nur unten
  | 'end_left'    // nur links
  | 'isolated';   // keine Nachbarn

/** Berechnet den Verbindungstyp eines Path-Tiles basierend auf seinen Nachbarn. */
export function resolvePathConnection(
  tiles: Record<string, string>,
  gx: number,
  gy: number,
  isInside: (x: number, y: number) => boolean,
): PathConnection {
  const hasN = [false, false, false, false]; // oben, rechts, unten, links
  for (let i = 0; i < PATH_NEIGHBORS.length; i++) {
    const [dx, dy] = PATH_NEIGHBORS[i];
    const nx = gx + dx, ny = gy + dy;
    if (!isInside(nx, ny)) continue;
    const neighbor = tiles[`${nx},${ny}`];
    if (neighbor === 'path') hasN[i] = true;
  }

  const [top, right, bottom, left] = hasN;
  const count = hasN.filter(Boolean).length;

  if (count === 0) return 'isolated';
  if (count === 1) {
    if (top) return 'end_top';
    if (right) return 'end_right';
    if (bottom) return 'end_bottom';
    return 'end_left';
  }
  if (count === 4) return 'cross';
  if (count === 3) {
    if (!top) return 't_top';
    if (!right) return 't_right';
    if (!bottom) return 't_bottom';
    return 't_left';
  }
  // count === 2
  if (top && bottom) return 'straight_v';
  if (left && right) return 'straight_h';
  if (top && right) return 'corner_tr';
  if (top && left) return 'corner_tl';
  if (bottom && right) return 'corner_br';
  return 'corner_bl';
}

/** Sicherheitsnetz: Wenn kein Weg zum Ausgang existiert, gilt der DEFAULT-Pfad
 * (ENEMY_PATH) — die Map kann den Run nicht softlocken. */
export const MAP_FALLBACK_TO_DEFAULT_PATH = true;

/** B33: Spawn-Korridor — Gegner-Spalte, bleibt von Tiles frei (eine Quelle statt `gx === 0`). */
export const SPAWN_CORRIDOR_COL = 0;

/** Startgebiet: 8×8 Innenbereich frei, Rand logisch blockiert (Quelle für beide Zahlen —
 *  identisch mit GRID_START_* aus world.source, hier gelockt, damit ein Grenzwechsel bricht,
 *  nicht still bleibt). */
export const BUILD_AREA_MIN = 2;
export const BUILD_AREA_MAX = 9;

/** Startgebiet: 8×8 Innenbereich frei, Rand logisch blockiert. */
export function defaultMapTiles(): Record<string, MapTileType> {
  // leer — der Rand wird logisch blockiert (isBuildable + MapSystem.placeTile)
  return {};
}

/** Prüft ob eine Zelle im aktuellen Baubereich liegt (Start: 8×8 Zentrum). */
export function isBuildable(gx: number, gy: number): boolean {
  return gx >= BUILD_AREA_MIN && gx <= BUILD_AREA_MAX && gy >= BUILD_AREA_MIN && gy <= BUILD_AREA_MAX;
}

/** Expansion: Zellen die freigeschaltet werden können (Reihenfolge = Kosten-Reihenfolge). */
export interface ExpansionTile {
  gx: number;
  gy: number;
  cost: number;
}

/** Alle expandierbaren Zellen (Rand-Zellen, die freigeschaltet werden können). */
export function expansionTiles(): ExpansionTile[] {
  const tiles: ExpansionTile[] = [];
  let tier = 0;
  // Zuerst die inneren Rand-Zellen (gx 1/10, gy 2-9 und gy 1/10, gx 2-9)
  for (let i = 0; i < 4; i++) {
    const ring = i; // 0=innerster Ring
    const cost = 30 + ring * 15;
    //_oben_
    for (let gx = 2 + ring; gx <= 9 - ring; gx++) {
      tiles.push({ gx, gy: 1 - ring, cost });
    }
    //unten
    for (let gx = 2 + ring; gx <= 9 - ring; gx++) {
      tiles.push({ gx, gy: 10 + ring, cost });
    }
    // links
    for (let gy = 2 + ring; gy <= 9 - ring; gy++) {
      tiles.push({ gx: 1 - ring, gy, cost });
    }
    // rechts
    for (let gy = 2 + ring; gy <= 9 - ring; gy++) {
      tiles.push({ gx: 10 + ring, gy, cost });
    }
  }
  return tiles;
}
