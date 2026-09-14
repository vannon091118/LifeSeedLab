// Owner: Source (content truth). LOC ≤ 200.
// World geometry + placement rules. No code outside config/ may define these values.

export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const CELL_SIZE = 64;

/** Enemy waypoints in cell coordinates (x from 0..GRID_COLS). */
export const ENEMY_PATH: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 3.5 },
  { x: 2.5, y: 3.5 },
  { x: 2.5, y: 1.5 },
  { x: 5.5, y: 1.5 },
  { x: 5.5, y: 5.5 },
  { x: 8.5, y: 5.5 },
  { x: 8.5, y: 2.5 },
  { x: 11.5, y: 2.5 },
  { x: 12, y: 2.5 },
];

/** Min distance (cells) from any path waypoint for a legal plant cell center. */
export const PLACEMENT_PATH_MARGIN = 1.2;

/** Max plants per cell. */
export const PLANTS_PER_CELL = 1;

/** Wave scheduler source values. */
export const WAVES_PER_NIGHT = 3;
export const SPAWN_QUEUE_SHUFFLE = true;

export function isInsideGrid(gx: number, gy: number): boolean {
  return gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}
