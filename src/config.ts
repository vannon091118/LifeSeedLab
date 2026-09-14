// ── Grid ─────────────────────────────────────────────────────
export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const CELL_SIZE = 64;

// ── Determinism ──────────────────────────────────────────────
// Single master seed for ALL randomness (sim, waves, breeding).
// Never use Math.random or Date.now anywhere in game logic.
export const GAME_SEED = 1337;
