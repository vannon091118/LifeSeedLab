// Owner: MapSystem (map slice). LOC ≤ 300.
// R2-NEUBAU — Free-Build-Maze-Wahrheit:
//   · Der Laufweg ist das ERGEBNIS des Pathfindings aus der Tile-Geometrie — nie seine Eingabe.
//   · Gegner nehmen den schnellsten nicht blockierten Weg Spawn (oben rechts) → Ausgang
//     (unten links) — exakt DIAGONAL gegenüber, bei jeder Kartengröße (Eigentümer-Regel).
//   · Blockiert = umlaufen. Es gibt KEINEN Fallback-Pfad und keinen geschützten Korridor —
//     die EINZIGE Platzierungs-Schranke ist die Integritätsregel: nach jedem Bau muss
//     mindestens ein freier Weg existieren (sonst `route_blocked`, kein Ressourcen-Abzug).
//   · Der Rand ist bebaubar — Käfer dürfen außen herumlaufen. Grenze ist nur die
//     freigeschaltete Weltfläche (state.cols/rows, dynamisch).
//   · Die Route wird bei Run-Start, bei JEDEM Bau und zu jedem Wellenbeginn neu berechnet
//     und VISUALISIERT — gespeichert wird sie nie als Vorgabe.

import type { SimState, MapTiles, Route } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { MAP_TILES_SOURCE, MAP_TILE_IDS, MAP_DEFAULT_WEIGHT, PLANT_ROUTE_COST, PLOT_POOL_KEY, type MapTileType } from '../config/map.source';
import { routeWalkTiles, routeIdealTiles } from './routeMetrics';
// R2: Re-Export — die Route-Qualität ist Sim-Wahrheit, die Verbraucher (root, hudSnapshot,
// Serializer, Tests) importieren sie über den Map-Owner (eine Import-Quelle).
export { routeWalkTiles, routeIdealTiles };

export type PlaceTileResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_tile' | 'no_material' | 'max_count' | 'occupied_plant' | 'out_of_world' | 'route_blocked' };

/** REMOVE_TILE (Juggling): Verkauf eines Tiles — Ergebnis mit Refund oder Ablehnung. */
export type RemoveTileResult =
  | { ok: true; tile: MapTileType }
  | { ok: false; reason: 'empty_cell' | 'occupied_plant' };

/**
 * Spawn/Ausgang EINE Quelle (Eigentümer-Regel): Käfer spawnen OBEN RECHTS (Ecke: gx = cols-1,
 * gy = 0), das Ausgangs-Loch ist UNTEN LINKS (gx = 0, gy = rows-1) — exakt diagonal
 * gegenüber, skaliert mit jeder Weltgröße. Sim, Renderer und Tests lesen dieselbe Funktion.
 */
export function spawnCorner(cols: number): { gx: number; gy: number } {
  return { gx: cols - 1, gy: 0 };
}
export function exitCorner(rows: number): { gx: number; gy: number } {
  return { gx: 0, gy: rows - 1 };
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

/** Ist die Zelle durch ein Tile blockiert (pot/boulder)? */
export function tileBlocked(tiles: MapTiles, gx: number, gy: number): boolean {
  const t = tiles[tileKey(gx, gy)];
  if (!t) return false;
  const src = MAP_TILES_SOURCE[t as MapTileType];
  return src ? !src.walkable : false;
}

/** Run-Bounds: innerhalb der freigeschalteten Weltfläche (dynamisch, eine Quelle). */
export function inWorldBounds(state: Pick<SimState, 'cols' | 'rows'>, gx: number, gy: number): boolean {
  return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gx < state.cols && gy >= 0 && gy < state.rows;
}

/** Hypothetische Belegung einer Zelle für die Integritäts-Probe (null = Tile entfernen). */
export interface TileOverride { gx: number; gy: number; tile: string | null }

export class MapSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /**
   * PLACE_TILE command handler: Material aus dem POOL nehmen (#4 — keine Energie),
   * Integritätsregel prüfen, Tile schreiben, Event emit.
   */
  placeTile(state: SimState, gx: number, gy: number, tile: MapTileType): PlaceTileResult {
    const src = MAP_TILES_SOURCE[tile];
    if (!src) return { ok: false, reason: 'unknown_tile' };
    if (!inWorldBounds(state, gx, gy)) return { ok: false, reason: 'out_of_world' };
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
      // idempotent: gleicher Tile an gleicher Stelle — nichts zu tun, kein Material-Verbrauch
      return { ok: true };
    }
    // #4: gelegt wird aus dem gekauften Pool; jedes Tile kostet genau 1 Material.
    if ((state.inventory[tile] ?? 0) <= 0) return { ok: false, reason: 'no_material' };
    if ((counts[tile] ?? 0) >= src.maxCount) return { ok: false, reason: 'max_count' };

    // ── R2-Integritätsregel (die EINE Schranke) ──────────────────────────────
    // Der Zug wird PROBIERT: bleibt danach noch ein freier Weg existieren, ist er erlaubt —
    // egal wo und egal wie lang. Schließt er den LETZTEN Weg, wird er abgelehnt,
    // OHNE Material zu verbrauchen. Das ersetzt Korridor-Verbote und Baubereich-Margen.
    if (this.computeRoute(state, { gx, gy, tile }) === null) {
      return { ok: false, reason: 'route_blocked' };
    }

    state.inventory[tile] = (state.inventory[tile] ?? 0) - 1;
    state.mapTiles[key] = tile;

    this.emit(makeEvent(state.clock.tick, 'TILE_PLACED', 'system:map', ++this.seq, {
      gx, gy, tile,
    }));
    return { ok: true };
  }

  /**
   * Juggling (Mazing-Königsdisziplin): Tile VERKAUFEN — die Zelle wird frei, das
   * Pathfinding berechnet neu, Gegner auf der Route KIPPEN mid-Welle um (Routen-Wechsel
   * = Gegner laufen zum neuen Routen-Start zurück). Das Material wandert ZURÜCK in den Pool (#4).
   * KEINE Integritäts-Probe nötig: Entfernen öffnet Wege, schließt nie welche.
   */
  removeTile(state: SimState, gx: number, gy: number): RemoveTileResult {
    if (!inWorldBounds(state, gx, gy)) return { ok: false, reason: 'empty_cell' };
    if (state.plants.some(p => p.gx === gx && p.gy === gy)) return { ok: false, reason: 'occupied_plant' };
    const key = tileKey(gx, gy);
    const tile = state.mapTiles[key] as MapTileType | undefined;
    if (!tile) return { ok: false, reason: 'empty_cell' };

    delete state.mapTiles[key];
    state.inventory[tile] = (state.inventory[tile] ?? 0) + 1;

    this.emit(makeEvent(state.clock.tick, 'TILE_REMOVED', 'system:map', ++this.seq, {
      gx, gy, tile,
    }));
    return { ok: true, tile };
  }

  /**
   * R2-Kern: schnellster nicht blockierter Weg vom Spawn (Ecke OBEN RECHTS) zum
   * Ausgang (Ecke UNTEN LINKS, diagonal gegenüber — Eigentümer-Regel, skaliert mit
   * der Weltgröße) — Dijkstra über ortho4, Tile-Gewichte lenken (path < 1 zieht an),
 * blockierende Tiles und Pflanzen-Kosten (PLANT_ROUTE_COST) beugen die Route.
 * `override` probiert einen Zug HYPOTHETISCH (Integritätsregel).
 * Keine Verbindung ⇒ null — der Caller entscheidet (Ablehnung, nie Stillstand).
 */
  computeRoute(state: SimState, override?: TileOverride): Route {
    const { cols, rows } = state;
    const blocked = (gx: number, gy: number): boolean => {
      if (override && override.gx === gx && override.gy === gy) {
        return override.tile === null ? false : !MAP_TILES_SOURCE[override.tile as MapTileType]?.walkable;
      }
      return tileBlocked(state.mapTiles, gx, gy);
    };
    const weight = (gx: number, gy: number): number => {
      if (override && override.gx === gx && override.gy === gy && override.tile !== null) {
        return MAP_TILES_SOURCE[override.tile as MapTileType]?.weight ?? MAP_DEFAULT_WEIGHT;
      }
      return tileWeight(state.mapTiles, gx, gy);
    };

    const plantCells = new Set<string>();
    for (const p of state.plants) plantCells.add(tileKey(p.gx, p.gy));

    // Spawn/Ausgang aus der Ecken-Quelle (oben rechts → unten links, diagonal)
    const spawn = spawnCorner(cols);
    const exit = exitCorner(rows);
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const queue = new Set<string>();
    if (!blocked(spawn.gx, spawn.gy)) {
      const k = tileKey(spawn.gx, spawn.gy);
      dist.set(k, 0);
      queue.add(k);
    }
    if (queue.size === 0) return null;

    while (queue.size > 0) {
      // kleinstes dist (O(n) scan — Welt bleibt klein: Start 12×12, gewachsen max 64)
      let bestK = ''; let bestD = Infinity;
      for (const k of queue) {
        const d = dist.get(k) ?? Infinity;
        if (d < bestD) { bestD = d; bestK = k; }
      }
      queue.delete(bestK);
      const [cx, cy] = bestK.split(',').map(Number);

      if (cx === exit.gx && cy === exit.gy) {
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

      // Nachbarn (ortho4 — kein diagonales Schneiden von Blockaden)
      const neighbors: [number, number][] = [
        [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        if (blocked(nx, ny)) continue;
        const nk = tileKey(nx, ny);
        const plantPenalty = plantCells.has(nk) ? PLANT_ROUTE_COST : 0;
        const nd = bestD + weight(nx, ny) + plantPenalty;
        if (nd < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, nd);
          prev.set(nk, bestK);
          queue.add(nk);
        }
      }
    }
    return null;
  }

  /**
   * R2: EXPAND_MAP vergrößert die freigeschaltete Weltfläche (EXPAND_STEP Zellen je
   * Richtung, Source). Die PERSISTENZ spiegelt das MAP_EXPANDED-Event in die Welt
   * (worldAutor) — die Erweiterung überlebt den Run.
   */
  expandMap(state: SimState): { ok: boolean; reason?: 'no_fields' | 'max_size' } {
    if (state.cols >= MAX_WORLD_COLS || state.rows >= MAX_WORLD_ROWS) return { ok: false, reason: 'max_size' };
    // #3/#4: die Fläche wächst über ein gekauftes FELD (Pool-Gegenstand) — nicht über Energie.
    if ((state.inventory[PLOT_POOL_KEY] ?? 0) <= 0) return { ok: false, reason: 'no_fields' };
    state.inventory[PLOT_POOL_KEY] = (state.inventory[PLOT_POOL_KEY] ?? 0) - 1;
    state.cols += EXPAND_STEP;
    state.rows += EXPAND_STEP;
    this.emit(makeEvent(state.clock.tick, 'MAP_EXPANDED', 'system:map', ++this.seq, {
      gx: state.cols, gy: state.rows,
    }));
    return { ok: true };
  }
}

/** Wachstumsgrenze der Welt (Source-Wert, bewusst hier neben der Wachstumsregel).
 *  Der PREIS eines Feldes liegt in map.source (PLOT_PRICE) — hier nur die Wachstumsregel. */
export const EXPAND_STEP = 2;
export const MAX_WORLD_COLS = 64;
export const MAX_WORLD_ROWS = 64;

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
