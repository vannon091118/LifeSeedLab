// Owner: Source (determinism). LOC ≤ 200.
// Nur Determinismus-Konstanten. Welt-/Grid-Konstanten leben ausschließlich in
// config/world.source.ts (SOURCE = CONTENT TRUTH — QUALITY_SPEC A3).

// Single master seed for ALL randomness (sim, waves, breeding).
// Never use Math.random or Date.now anywhere in game logic.
export const GAME_SEED = 1337;

/** Version salt for run-seed derivation — bump to invalidate old run identities. */
export const RUN_SEED_VERSION = 1;
