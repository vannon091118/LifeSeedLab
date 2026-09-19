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
  /** NEKTAR-Preis im Shop (AUSSERHALB des Runs) — im Run gibt es keine Kosten mehr:
   *  der Spieler kauft sich einen Pool und verbaut ihn, so viel er will (#4). */
  price: number;
  /** Pathfinding-Beteiligung: walkable = Gegner laufen darüber, block = Wand. */
  walkable: boolean;
  /** Pfad-Gewicht: 1 = normal, <1 = Gegner bevorzugen („gelegter Weg"), >1 = miedsen. */
  weight: number;
  /** max. Tiles dieses Typs pro Map (Balance-Klemme, verhindert Weg-Mauern). */
  maxCount: number;
}

export const MAP_TILES_SOURCE: Record<MapTileType, MapTileSource> = {
  // Blumentopf: PLATZIERFLÄCHE für Pflanzen (Pflanzen brauchen jetzt einen Topf!)
  pot:     { id: 'pot',     label: 'Blumentopf', i18nKey: 'map.pot', price: 15, walkable: false, weight: 999, maxCount: 24 },
  // Weg-Tile: Gegner BEVORZUGEN es (weight < 1) — der Spieler lenkt den Laufweg.
  // M4 (Sprint AP2): 0.6 statt 0.45 — der Vorsprung zur Wiese (1) ist kleiner, damit die
  // Pflanzen-Kosten (PLANT_ROUTE_COST) auf Weg-Zellen nicht decode und das Zucht-Layout
  // als Maze-Bauwerk spürbar bleibt. Nur Source (Regel 6).
  path:    { id: 'path',    label: 'Weg', i18nKey: 'map.path',        price: 5,  walkable: true,  weight: 0.6, maxCount: 30 },
  // Findling: BLOCKIERT den Weg — Gegner müssen umlaufen. maxCount 6 < 8 Zeilen:
  // eine komplette Spalten-Mauer ist UNMÖGLICH (Softlock-Schutz an der Quelle).
  boulder: { id: 'boulder', label: 'Findling', i18nKey: 'map.boulder',   price: 20, walkable: false, weight: 999, maxCount: 6 },
  // Deko: rein kosmetisch, begehbar, keine Path-Bedeutung
  decor:   { id: 'decor',   label: 'Deko', i18nKey: 'map.decor',       price: 3,  walkable: true,  weight: 1, maxCount: 20 },
};

export const MAP_TILE_IDS = Object.keys(MAP_TILES_SOURCE) as MapTileType[];

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
const PATH_NEIGHBORS: readonly [number, number][] = [
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

// R2-Neubau: Es gibt keinen Fallback-Pfad mehr (die Integritätsregel ersetzt ihn),
// keinen Spawn-Korridor (die Spawn-Spalte ist normale Welt — der Pfad STARTET dort)
// und keinen 8×8-Baubereich-Hardcode (die Fläche ist die freigeschaltete Welt).
// EXPAND_MAP vergrößert die ganze Fläche (mapSystem.expandMap, EXPAND_STEP Zellen je
// Richtung) — die Persistenz spiegelt das in die Welt (worldAutor), sie überlebt den Run.

/**
 * Startmaterial eines frischen Profils (#4): der Run beginnt mit einem kleinen Pool —
 * bemessen am alten Startbudget (150 Energie/5 pro Weg usw.), nur ohne Energierechnung.
 * Alles Weitere wird im Shop mit Nektar gekauft und dem Besitz zugeschlagen.
 */
export const STARTING_TILE_POOL: Record<MapTileType, number> = {
  path: 20,
  pot: 6,
  boulder: 3,
  decor: 6,
};

/**
 * FELD (Feld-Erweiterung, #3/#4): kein Map-Tile, sondern ein POOL-Gegenstand. Ein Feld
 * vergrößert die freigeschaltete Weltfläche (EXPAND_STEP je Richtung) — bezahlt wird es
 * mit Nektar im Shop, verbraucht im Run. Preis = alte Erweiterungs-Basis (EXPAND_BASE_COST).
 */
export const PLOT_POOL_KEY = 'plot';
export const PLOT_PRICE = 30;
