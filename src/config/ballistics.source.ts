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

// ── Wuchs ⇒ Schuss (Gameplay-Regel, Eigentümer-Entscheid 20.09.2026) ─────────────────────
// "Groß = weit, Breite = Schussrate": die WUCHS-Gene tragen den Schuss mit. Bewusst über
// Gene (D5), nicht über den gejitterten Phänotyp — zwei Spieler mit gleichem genome_hash
// müssen identisch rechnen, auch wenn ihre Anzeige streut. Ganzzahlig in bp wie alles hier.

/** Reichweite in Zellen ×100 (3.00 ⇒ 300): ganzzahlig, keine Gleitkomma-Schwelle. */
export const RANGE_BASE_CX = 300;
/** Je vollem Wuchs-Beitrag (Σ WUCHS_HEIGHT × 10000 bp) ±1.00 Zelle Reichweite. */
export const RANGE_PER_HEIGHT_BP = 100;
/** 6.00 Zellen — ein Schuss, der das halbe Brett überspannt, wäre kein Schuss mehr. */
export const RANGE_MAX_CX = 600;
/** Mindest-Reichweite: eine Wand „schießt" 0.5 Zellen (ihr Nahkreis), nie 0. */
export const RANGE_MIN_CX = 50;

/** Nachladezeit in Ticks ×100 (30 ⇒ 3000): Basis wie `plants.source` (eine Wahrheit je Ort).
 *  Die Dicke KÜRZT die Nachladezeit — dicker = mehr Masse = schnellerer Nachschub. */
export const COOLDOWN_BASE_CX = 3000;
/** Je vollen 10000 bp `thickness`-Wuchs −15 % Nachladezeit (ganzzahlig abgezogen). */
export const COOLDOWN_PER_THICKNESS_CX = 450;
/** 30 % Kürzung ist genug — ein Maschinengewehr wäre das Ende des Wendespiels. */
export const COOLDOWN_FLOOR_CX = 2100;

/**
 * Wuchs ⇒ Schuss: JEDES Pool-Gen trägt die Form seiner Pflanze — sonst sehen zwei Kreuzungen
 * verschieden aus und rechnen identisch (Spieltest-Befund 20.09: „5 Runden gezüchtet, nichts
 * gespürt"). Gewicht × Genstärke (bp) = Beitrag. Positiv = hoch (Reichweite +) bzw. dick
 * (Nachlade −); negativ = das Gegenteil. 1.0 = ein voller Gen-Beitrag = ±1.00 Zelle Reichweite.
 */
export const WUCHS_HEIGHT: Record<string, number> = {
  titan: 1.0, rapid: 0.6, swift: 0.5, pierce: 0.4, echo: 0.3, vortex: 0.3, spore: 0.2,
  fire: 0.1, crit: 0.1, acid: 0.1,
  heal: -0.1, aura: -0.15, prismatic: -0.2, bloom: -0.2, splash: -0.3, lure: -0.35,
  ice: -0.45, venom: -0.4, gravity: -0.5, heavy: -0.6,
  shield: -0.2, thorns: -0.3, regen: -0.2,
};
/** Dicke je Gen (Nachladezeit-Kürzung) — dieselbe Logik, andere Achse. */
export const WUCHS_THICKNESS: Record<string, number> = {
  heavy: 1.0, titan: 0.7, shield: 0.6, thorns: 0.5, regen: 0.4, gravity: 0.4,
  venom: 0.2, ice: 0.25, rapid: 0.2, bloom: 0.1, heal: 0.1, aura: 0.05, fire: 0.1,
  swift: -0.2, echo: -0.1, spore: -0.1, crit: -0.1, acid: -0.2, prismatic: -0.1,
  lure: -0.2, splash: -0.15, vortex: -0.3, pierce: -0.3,
};

// ── Durchschlag ─────────────────────────────────────────────────────────────────────────
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
