// Owner: MapSystem (map slice). LOC ≤ 300.
// P5: Spieler gestalten das Spielfeld — Tiles, Wege, Blumentöpfe, Deko.
// Der Laufweg der Gegner reagiert REAL: Pathfinding läuft bei jedem Wave-Start
// über das Tile-Grid (Dijkstra mit Tile-Gewichten). Kein zweiter Map-State:
// state.mapTiles ist der einzige Bestand, dieses System der einzige Writer.

import type { SimState, MapTiles } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { MAP_TILES_SOURCE, MAP_TILE_IDS, MAP_DEFAULT_WEIGHT, MAP_NEIGHBOR_MODE, expansionTiles, isBuildable, type MapTileType } from '../config/map.source';
import { isInsideGrid } from '../config/world.source';
import { GRID_COLS, GRID_ROWS } from '../config/world.source';

export type PlaceTileResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_tile' | 'no_energy' | 'max_count' | 'occupied_plant' | 'spawn_corridor' | 'not_expandable' };

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
    // Spawn-Korridor (Spalte 0) bleibt frei — Gegner müssen spawnen können
    if (gx === 0) return { ok: false, reason: 'spawn_corridor' };
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

      // Nachbarn (ortho4 — Quelle)
      const neighbors: [number, number][] = MAP_NEIGHBOR_MODE === 'ortho4'
        ? [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]
        : [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
        if (tileBlocked(state.mapTiles, nx, ny)) continue;
        const nk = tileKey(nx, ny);
        const nd = bestD + tileWeight(state.mapTiles, nx, ny);
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
