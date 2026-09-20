// Owner: WorldSystem (persistente Spielerwelt). LOC ≤ 200.
// R2-Neubau — die Welt ist KEIN Run-Zustand mehr: EINE Karte, die jeden Run überlebt.
//
//   SEED → exakt dieselbe Karte → exakt dieselben Tiles → exakt dieselbe Simulation
//
// WorldState beschreibt die logische Wahrheit der Welt (Fläche, Tiles). Render und
// Pathfinding lesen sie; geschrieben wird sie ausschließlich über den World-Autor,
// der die Bau-Commands des Runs auf die Welt spiegelt — genau ein Schreibpfad,
// keine zweite Map-Wahrheit: SimState.mapTiles ist die RUN-KOPIE des Welt-Snapshots,
// die Welt selbst lebt hier und im WorldSave.
//
// Platzierte Pflanzen sind bewusst NICHT Welt-Bestandteil: sie sind Inventar-Objekte
// (B37-Besitzkette) und laufen über Loadout/Run — die Welt trägt die TOPOLOGIE.

import { deriveSeed } from '../core/rng';
import { EPOCH_ROOT } from '../config';

/** Startgröße der Welt (die Werte bleiben source-driven, die Quelle ist world.source). */
export const WORLD_START_COLS = 12;
export const WORLD_START_ROWS = 12;

/** Eine Zelle der Welt: "gx,gy" → Tile-Typ (dieselbe Konvention wie der Run). */
type WorldTiles = Record<string, string>;

/**
 * Die persistente Welt des Spielers. Kein Run-spezifischer Zustand (keine Gegner,
 * keine Wellen, keine Energie) — nur das, was den Spielbesitz beschreibt.
 */
export interface WorldState {
  version: 1;
  /** Deterministische Grundlage: aus ihm ist die Welt reproduzierbar. */
  worldSeed: number;
  /** Freigeschaltete Fläche in Zellen (Start 12×12, wächst per EXPAND_MAP). */
  cols: number;
  rows: number;
  /** Spieler-Tiles ("gx,gy":type) — die gebaute Umgebung. */
  tiles: WorldTiles;
}

/** Die Welt-Seed-Ableitung: EINE Konvention für die Initialwelt (Namespace 'world'). */
export function deriveWorldSeed(): number {
  return deriveSeed(EPOCH_ROOT, 'world', 'world', 1, 1);
}

/**
 * Die initiale Welt beim allerersten Start: kleine Fläche, leer. Kein stiller
 * Default bei Korruption — dieser Aufruf ist die EXPLIZITE Erst-Erzeugung, die
 * sofort persistiert wird; worldSave behandelt Defekte fail-closed.
 */
export function createInitialWorld(): WorldState {
  return {
    version: 1,
    worldSeed: deriveWorldSeed(),
    cols: WORLD_START_COLS,
    rows: WORLD_START_ROWS,
    tiles: {},
  };
}

/** Run-Snapshot der Welt: genau das, was ein Run beim Start bekommt (Pflichtfeld). */
export interface WorldSnapshot {
  cols: number;
  rows: number;
  tiles: WorldTiles;
}

export function worldSnapshotOf(world: WorldState): WorldSnapshot {
  return { cols: world.cols, rows: world.rows, tiles: { ...world.tiles } };
}

/** Envelope-feste Validierung eines geladenen Welt-Rohstands (fail-closed). */
export function isValidWorldState(raw: unknown): raw is WorldState {
  if (!raw || typeof raw !== 'object') return false;
  const w = raw as Partial<WorldState>;
  if (w.version !== 1) return false;
  if (typeof w.worldSeed !== 'number' || !Number.isFinite(w.worldSeed)) return false;
  if (typeof w.cols !== 'number' || w.cols < 4 || w.cols > 64) return false;
  if (typeof w.rows !== 'number' || w.rows < 4 || w.rows > 64) return false;
  if (!w.tiles || typeof w.tiles !== 'object') return false;
  for (const [key, type] of Object.entries(w.tiles)) {
    const [gx, gy] = key.split(',').map(Number);
    if (!Number.isInteger(gx) || !Number.isInteger(gy)) return false;
    if (gx < 0 || gx >= w.cols || gy < 0 || gy >= w.rows) return false;
    if (typeof type !== 'string') return false;
  }
  return true;
}

export type WorldOp =
  | { type: 'PLACE_TILE'; gx: number; gy: number; tile: string }
  | { type: 'REMOVE_TILE'; gx: number; gy: number }
  | { type: 'EXPAND' };

/**
 * Deterministischer Transfer: dieselben Weltaktionen auf derselben Ausgangswelt
 * ergeben exakt denselben Zielzustand (Multiplayer-Grundlage — kein Zufall,
 * keine Wanduhr, nur geordnete Operationen).
 */
export function applyWorldOps(world: WorldState, ops: WorldOp[]): WorldState {
  let next: WorldState = { ...world, tiles: { ...world.tiles } };
  for (const op of ops) {
    if (op.type === 'PLACE_TILE') {
      next.tiles = { ...next.tiles, [`${op.gx},${op.gy}`]: op.tile };
    } else if (op.type === 'REMOVE_TILE') {
      const tiles = { ...next.tiles };
      delete tiles[`${op.gx},${op.gy}`];
      next = { ...next, tiles };
    } else {
      next = { ...next, cols: next.cols + 2, rows: next.rows + 2 };
    }
  }
  return next;
}
