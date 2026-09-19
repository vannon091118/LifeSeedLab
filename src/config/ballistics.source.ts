// Owner: Source (content truth). LOC ≤ 200.
// BALLISTIK = was ein Schuss im Flug ist. Diese Datei besitzt die ZAHLEN; die Ableitung aus dem
// Genom steht in `genome/ballistics.ts`, die Rechnung in `simulation/projectileSystem.ts`.
//
// Regel 6 nachgeholt (19.09.2026): `HIT_RADIUS 0.4`, Projektil-`speed 0.15`, Pierce `2` und
// Crit `0.2` standen als Literale mitten in der Simulation. Sie waren damit fürs Balancing
// unsichtbar — und drei Gene (`swift`, `pierce`, `crit`) veränderten zwar die Stat-Karte der
// Pflanze, aber nicht den Schuss selbst. Dieselbe Zahl an zwei Orten wäre eine zweite Wahrheit;
// diese Datei ist der eine Ort.
//
// Schwellen sind GANZZAHLIGE Basispunkte: bp = Math.round(power * 10000) — exakt die
// Quantisierung, mit der `discovery/chain.ts#canonicalGenome` den `genome_hash` bildet
// (`Math.round(power * 10000) / 10000`). Zwei Genome mit identischem Hash haben dadurch
// garantiert identisches Verhalten; mit einer Gleitkomma-Schwelle (0.75) wäre genau das offen
// (0.74996 vs. 0.75004 ⇒ gleicher Hash, verschiedenes Verhalten). Alle Ableitungen rechnen
// deshalb in ganzen bp, nie in Anteilen.

/** Fassung der Ballistik-Regeln. Steigt, wenn sich Verhalten ändert (Goldset-Test + Changelog). */
export const BALLISTICS_VERSION = 1;

/** Trefferradius in Zellen (vorher Literal in projectileSystem). */
export const HIT_RADIUS = 0.4;

// ── Geschwindigkeit (bp = 1e-4 Zellen/Tick, damit auch sie ganzzahlig entsteht) ────────────
/** 0.1500 — Legacy-Wert, unverändert: ohne `swift` fliegt ein Schuss wie bisher. */
export const SPEED_BASE_BP = 1500;
/** `swift` voll ⇒ +0.1200 Zellen/Tick. */
export const SPEED_GAIN_BP = 1200;
/** 0.3000 — Obergrenze, damit ein Schuss nie zum Hitscan wird. */
export const SPEED_MAX_BP = 3000;

// ── Durchschlag ───────────────────────────────────────────────────────────────────────────
/** Basis-Durchschlag bei vorhandenem Durchschlags-Effekt = bisheriges Verhalten (Konstante 2). */
export const PIERCE_BASE = 2;
/** Erst ab hier skaliert das `pierce`-Gen (darunter bleibt es bei `PIERCE_BASE`). */
export const PIERCE_MIN_BP = 3000;
/** Je 2000 bp (0.2) Genstärke ein weiterer durchschlagener Gegner. */
export const PIERCE_STEP_BP = 2000;
export const PIERCE_MAX = 4;

// ── Krit ────────────────────────────────────────────────────────────────────────────────
/** 0.2000 = bisheriges Verhalten (Konstante 0.2 im Codeschuss). */
export const CRIT_CHANCE_BASE_BP = 2000;
export const CRIT_MIN_BP = 2500;
/** `crit` voll ⇒ +0.1500 Chance über der Basis. */
export const CRIT_GAIN_BP = 1500;
/** 0.3500 — Obergrenze gegen Krit-Ketten bei maximaler Kreuzungsstärke. */
export const CRIT_CHANCE_MAX_BP = 3500;
export const CRIT_MULT = 2;

/**
 * Wie viele Effekte ein Schuss trägt. Content, keine Technik: die zwei stärksten Gene einer
 * Pflanze bestimmen ihre Wirkung (`genome/effects.ts#genomeEffectIds`). Vorher reichte
 * `root.ts` nur `effects[0]` durch — der zweite Effekt eines Schlusses war damit toter Content.
 */
export const EFFECT_SLOTS = 2;
