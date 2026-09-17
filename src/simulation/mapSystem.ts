// Owner: MapSystem (map slice). LOC ≤ 300.
// P5: Spieler gestalten das Spielfeld — Tiles, Wege, Blumentöpfe, Deko.
// Der Laufweg der Gegner reagiert REAL: Pathfinding läuft bei jedem Wave-Start
// über das Tile-Grid (Dijkstra mit Tile-Gewichten). Kein zweiter Map-State:
// state.mapTiles ist der einzige Bestand, dieses System der einzige Writer.

import type { SimState, MapTiles } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { MAP_TILES_SOURCE, MAP_TILE_IDS, MAP_DEFAULT_WEIGHT, expansionTiles, isBuildable, SPAWN_CORRIDOR_COL, type MapTileType } from '../config/map.source';
import { isInsideGrid, ENEMY_PATH, PLACEMENT_PATH_MARGIN, dist, GRID_COLS, GRID_ROWS } from '../config/world.source';

export type PlaceTileResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_tile' | 'no_energy' | 'max_count' | 'occupied_plant' | 'spawn_corridor' | 'not_expandable' | 'on_path' };

/** M2: Zusatz-Kosten einer Zelle mit Pflanze fürs Pathfinding (Umweg-Anreiz, kein Block). */
const PLANT_ROUTE_COST = 2;

/**
 * M1/AP2 — Route-Qualität (Writer: SimulationRoot via computeRoute): Verhältnis der
 * Route-Kosten zur freien Manhattan-Distanz Spawn→Ausgang. 1 = perfekt gerade, kleiner =
 * das Spieler-Maze zwingt Umwege ab. Bestimmt die Observation (Phase 2) statt `null`.
 */
export function routeQuality(route: readonly { x: number; y: number }[] | null): number | null {
  if (!route || route.length < 2) return null;
  // D1/QA-Lektion: Die Referenz ist die Manhattan-Distanz der ROUTE-Endpunkte — nicht die
  // Feld-Diagonale (COLS+ROWS). Diagonal-Referenz capped jeden realen Umweg auf Qualität 1
  // (11-Schritte-Route vs. 22er-Referenz) und machte den Quality-Chip bedeutungslos.
  const [fx, fy] = [Math.round(route[0].x - 0.5), Math.round(route[0].y - 0.5)];
  const [lx, ly] = [Math.round(route[route.length - 1].x - 0.5), Math.round(route[route.length - 1].y - 0.5)];
  const straight = Math.abs(lx - fx) + Math.abs(ly - fy);
  if (straight === 0) return null;
  // D1-Lektion: Knotenzahl allein verfehlt das Maze — ein Umweg über TEURE Zellen
  // (Pflanzen, PLANT_ROUTE_COST) kann gleich viele Knoten haben. Qualität misst deshalb
  // die KOSTEN der Route relativ zur Manhattan-Referenz; das Cap 1 schert gerade Wege.
  let cost = 0;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = [Math.round(route[i - 1].x - 0.5), Math.round(route[i - 1].y - 0.5)];
    const [bx, by] = [Math.round(route[i].x - 0.5), Math.round(route[i].y - 0.5)];
    cost += Math.abs(bx - ax) + Math.abs(by - ay); // Manhattan-Schritte (ortho4-Route)
  }
  return Math.min(1, straight / cost);
}

/** Schlüssel-Funktion EINE Konvention: "gx,gy". */
export function tileKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

/** Cost-Gewicht einer Zelle für das Pathfinding (read-only Helper, auch fürs UI). */
export function tileWeight(tiles: MapTiles, gx: number, gy: number): number {
  const t = tiles[tileKey(gx, gy)];
  if (!t) return MAP_DEFAULT_WEIGHT;
  return MAP_TILES_SOURCE[t as MapTileType]?.weight ?? MAP_DEFAULT_WEIGHT;
}

/** Ist die Zelle durch ein Tile blockiert (boulder/pot)? */
export function tileBlocked(tiles: MapTiles, gx: number, gy: number): boolean {
  const t = tiles[tileKey(gx, gy)];
  if (!t) return false;
  const src = MAP_TILES_SOURCE[t as MapTileType];
  return src ? !src.walkable : false;
}

export class MapSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** PLACE_TILE command handler: Energie abziehen, Tile schreiben, Event emit. */
  placeTile(state: SimState, gx: number, gy: number, tile: MapTileType): PlaceTileResult {
    const src = MAP_TILES_SOURCE[tile];
    if (!src) return { ok: false, reason: 'unknown_tile' };
    if (!Number.isInteger(gx) || !Number.isInteger(gy) || gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) {
      return { ok: false, reason: 'unknown_tile' };
    }
    // Spawn-Korridor (Source-Wert) bleibt frei — Gegner müssen spawnen können
    if (gx === SPAWN_CORRIDOR_COL) return { ok: false, reason: 'spawn_corridor' };
    // B33: BLOCKIERENDE Tiles (pot/boulder) dürfen nicht in den Pfad-Korridor — dieselbe
    // Marge wie Pflanzen (eine Quelle: PLACEMENT_PATH_MARGIN). Sonst steht ein Topf 0.5 Zellen
    // am Weg, den Gegner-Sprites durchlaufen, und die Screenshot-Falle: Töpfe, die der Spieler
    // nicht mal hätte bauen dürfen. Weg-Tiles (path) bleiben AUSGENOMMEN: sie lenken den Laufweg
    // (weight < 1) — genau das ist ihr Sinn.
    if (!src.walkable) {
      const cx = gx + 0.5;
      const cy = gy + 0.5;
      for (const point of ENEMY_PATH) {
        if (dist(cx, cy, point.x, point.y) < PLACEMENT_PATH_MARGIN) return { ok: false, reason: 'on_path' };
      }
    }
    // Nur im aktuellen Baubereich platzieren (Start: 8×8, erweiterbar)
    if (!isBuildable(gx, gy)) return { ok: false, reason: 'not_expandable' };
    if (state.resources.energy < src.cost) return { ok: false, reason: 'no_energy' };
    const key = tileKey(gx, gy);
    // Pflanzen stehen nur auf Töpfen — Zelle mit Pflanze ist tabu
    if (state.plants.some(p => p.gx === gx && p.gy === gy)) return { ok: false, reason: 'occupied_plant' };

    // maxCount zählen (gleicher Tile an gleicher Stelle ersetzt sich selbst)
    const counts: Partial<Record<MapTileType, number>> = {};
    for (const t of Object.values(state.mapTiles)) {
      counts[t as MapTileType] = (counts[t as MapTileType] ?? 0) + 1;
    }
    const current = state.mapTiles[key];
    if (current === tile) {
      // idempotent: gleicher Tile an gleicher Stelle — nichts zu tun, kein Energie-Abzug
      return { ok: true };
    }
    if ((counts[tile] ?? 0) >= src.maxCount) return { ok: false, reason: 'max_count' };

    state.resources.energy -= src.cost;
    state.mapTiles[key] = tile;

    this.emit(makeEvent(state.clock.tick, 'TILE_PLACED', 'system:map', ++this.seq, {
      gx, gy, tile, cost: src.cost,
    }));
    return { ok: true };
  }

  /**
   * P5-Kern: Laufweg der Gegner aus dem Tile-Grid berechnen (Dijkstra von der
   * Spawn-Spalte zur Ausgangs-Spalte). Tile-Gewichte lenken: path-Tiles ziehen
   * Gegner an, boulder/pot blockieren. Ohne Verbindung ⇒ null (Caller fällt
   * auf den DEFAULT-Pfad zurück — die Map kann den Run nicht softlocken).
   */
  computeRoute(state: SimState): { x: number; y: number }[] | null {
    // M2 (Sprint-Plan AP 2): Pflanzen verteuern ihre Zelle (cost+1) — das Zucht-Layout wird
    // zum Maze-Bauwerk. Kein Block (Softlock unmöglich), nur Umweg-Anreiz für Gegner-Routen.
    const plantCells = new Set<string>();
    for (const p of state.plants) plantCells.add(tileKey(p.gx, p.gy));
    const startCol = 0;
    const endCol = GRID_COLS - 1;
    // Start: alle begehbaren Zellen der Spawn-Spalte
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const queue = new Set<string>();
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      if (tileBlocked(state.mapTiles, startCol, gy)) continue;
      const k = tileKey(startCol, gy);
      dist.set(k, 0);
      queue.add(k);
    }
    if (queue.size === 0) return null;

    while (queue.size > 0) {
      // kleinstes dist (O(n) scan — Raster ist klein, 12×8)
      let bestK = ''; let bestD = Infinity;
      for (const k of queue) {
        const d = dist.get(k) ?? Infinity;
        if (d < bestD) { bestD = d; bestK = k; }
      }
      queue.delete(bestK);
      const [cx, cy] = bestK.split(',').map(Number);

      if (cx === endCol) {
        // Pfad rekonstruieren (Zellzentren)
        const route: { x: number; y: number }[] = [];
        let cur: string | undefined = bestK;
        while (cur) {
          const [x, y] = cur.split(',').map(Number);
          route.push({ x: x + 0.5, y: y + 0.5 });
          cur = prev.get(cur);
        }
        route.reverse();
        return route;
      }

      // Nachbarn (ortho4 — Quelle; der frühere ortho8-Zweig war toter Code mit identischem Körper, Befund B2)
      const neighbors: [number, number][] = [
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
        if (tileBlocked(state.mapTiles, nx, ny)) continue;
        const nk = tileKey(nx, ny);
        const plantPenalty = plantCells.has(nk) ? PLANT_ROUTE_COST : 0;
        const nd = bestD + tileWeight(state.mapTiles, nx, ny) + plantPenalty;
        if (nd < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, bestK);
          queue.add(nk);
        }
      }
    }
    return null;
  }

  /** EXPAND_MAP: Zelle aus dem Blockiert-Zustand in begehbaren Bereich verwandeln. */
  expandMap(state: SimState, gx: number, gy: number): { ok: boolean; reason?: 'not_expandable' | 'no_energy' | 'already_buildable' } {
    const key = tileKey(gx, gy);
    const current = state.mapTiles[key];
    // Nur boulder-Tiles im Rand können expandiert werden
    if (current !== 'boulder') return { ok: false, reason: current ? 'already_buildable' : 'not_expandable' };
    // Prüfe ob die Zelle im expandierbaren Bereich liegt
    const exp = expansionTiles().find(e => e.gx === gx && e.gy === gy);
    if (!exp) return { ok: false, reason: 'not_expandable' };
    if (state.resources.energy < exp.cost) return { ok: false, reason: 'no_energy' };
    state.resources.energy -= exp.cost;
    delete state.mapTiles[key]; // Boulder entfernen = begehbar
    this.emit(makeEvent(state.clock.tick, 'MAP_EXPANDED', 'system:map', ++this.seq, {
      gx, gy, cost: exp.cost,
    }));
    return { ok: true };
  }
}

/** Alle Tile-IDs (UI-Tray). */
export function mapTileChoices(): MapTileType[] {
  return [...MAP_TILE_IDS];
}


/** Prüft ob eine Zelle im aktuellen Baubereich liegt (für UI-Validierung). */
export function canBuildAt(gx: number, gy: number, tiles: MapTiles): boolean {
  const key = tileKey(gx, gy);
  const tile = tiles[key];
  // Kein Tile = begehbar (Papier-Wiese)
  if (!tile) return true;
  // Pot-Tiles sind Platzier-Flächen
  if (tile === 'pot') return true;
  // Alles andere = nicht begehbar
  return false;
}
