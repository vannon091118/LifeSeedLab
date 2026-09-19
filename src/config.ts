// Owner: Source (determinism). LOC ≤ 200.
// Nur Determinismus-Konstanten. Welt-/Grid-Konstanten leben ausschließlich in
// config/world.source.ts (SOURCE = CONTENT TRUTH — QUALITY_SPEC A3).

// Single master seed for ALL randomness (sim, waves, breeding).
// Never use Math.random or Date.now anywhere in game logic.
//
// EPOCH-Vertrag (plan-discovery-chain.md, P1): GAME_SEED ist der WURZELWERT der Epoche 0.
// Er ist nicht mehr DIE Wurzel, sondern der Wert, auf den die Wurzel defaultet: ein zukünftiger
// Ticket-Worker vergibt eigene Wurzeln (RUN_ROOT je Start), ohne dass sich an den Ableitungen
// etwas ändert — `ctx.root` wird nur ausgetauscht. Auf Epoche 0 ist das Verhalten BITGLEICH
// (dieselben Seeds, dieselben Hashes), beweisbar durch die unveränderte Suite.
export const GAME_SEED = 1337;

/**
 * Die Wurzel der aktiven Epoche (Epoche 0 = 1337). EINE Wahrheit für alle Ableitungen:
 * jede Stelle, die bisher GAME_SEED las, liest EPOCH_ROOT — und bekommt auf Epoche 0
 * exakt denselben Wert. Bump in einem späteren Sprint (Ticket-Worker, P4), nie hier im Spiel.
 */
export const EPOCH_ROOT: number = GAME_SEED;

/** Identität der aktiven Epoche — wandert in jeden Discovery-Eintrag (P2). */
export const EPOCH_ID = 0;

/** Version salt for run-seed derivation — bump to invalidate old run identities. */
export const RUN_SEED_VERSION = 1;
