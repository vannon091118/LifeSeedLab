// Owner: Source (ElementarVector logic). LOC ≤ 200.
// Einzige Wahrheit für alle Vector-Basiswerte. Neuer Vector = 1 Zeile, nie Codebruch.
// Drift: p = base * (1+drift), drift = min(0.85, driftFor(activeCells)+starNorm*0.2)
// Vergänglich: ttl 10-180, decay 0.96-1.0 — OP erlaubt, nie permanent.

export type VectorId =
  | 'VECTOR_HEAT' | 'VECTOR_WET' | 'VECTOR_OIL' | 'VECTOR_COLD'
  | 'VECTOR_CHARGE' | 'VECTOR_ATTRACTOR' | 'VECTOR_TOX';

export interface VectorLogicSource {
  id: VectorId;
  /** Basis-Chance (volatility/conductivity) 0..1 — skaliert via drift*localCharge. */
  base: number;
  /** Flag-Radius in Kacheln (0=Trace, 2=Nachbarn der Nachbarn). */
  radius: number;
  /** Lebensdauer Ticks bis Verfall (INT). */
  ttl: number;
  /** Zerfall pro Tick 0..1 (intensity*=decay). */
  decay: number;
  /** Schwelle zum Zünden/Gefrieren (null=keine). */
  threshold: number | null;
  /** Leitfähigkeit 0..1 für Dijkstra-Kosten cost=1/conductivity (null=kein Leiter). */
  conductivity: number | null;
  /** Schaden/Heilung pro Tick auf Gegner/Pflanze darunter (negativ=Heilung). */
  tickDelta: number;
}

export const VECTOR_LOGIC_SOURCE: Record<VectorId, VectorLogicSource> = {
  VECTOR_HEAT:      { id: 'VECTOR_HEAT',      base: 0.35, radius: 2, ttl: 120, decay: 0.96, threshold: 1.2, conductivity: null, tickDelta: 1 },
  VECTOR_WET:       { id: 'VECTOR_WET',       base: 0.90, radius: 1, ttl: 180, decay: 0.98, threshold: null, conductivity: 0.9, tickDelta: -3 },
  VECTOR_OIL:       { id: 'VECTOR_OIL',       base: 0.75, radius: 2, ttl: 150, decay: 0.97, threshold: null, conductivity: 0.2, tickDelta: 0 },
  VECTOR_COLD:      { id: 'VECTOR_COLD',      base: 0.30, radius: 1, ttl: 120, decay: 0.97, threshold: 0.8, conductivity: null, tickDelta: 0 },
  VECTOR_CHARGE:    { id: 'VECTOR_CHARGE',    base: 0.95, radius: 0, ttl: 10, decay: 1.0,  threshold: null, conductivity: 0.95, tickDelta: 2 },
  VECTOR_ATTRACTOR: { id: 'VECTOR_ATTRACTOR', base: 0.80, radius: 3, ttl: 9999, decay: 1.0, threshold: null, conductivity: null, tickDelta: 0 },
  VECTOR_TOX:       { id: 'VECTOR_TOX',       base: 0.40, radius: 2, ttl: 150, decay: 0.98, threshold: null, conductivity: null, tickDelta: 1 },
};

export const VECTOR_IDS = Object.keys(VECTOR_LOGIC_SOURCE) as VectorId[];

/** Effekt → Vector für deposit (einzige Übersetzung, skaliert via deposit). Neuer Effekt = 1 Zeile. */
export const EFFECT_TO_VECTOR: Record<string, VectorId> = {
  EFFECT_BURN: 'VECTOR_HEAT',
  EFFECT_SLOW: 'VECTOR_COLD',
  EFFECT_POISON: 'VECTOR_TOX',
  EFFECT_ACID: 'VECTOR_OIL',
  EFFECT_SPORE: 'VECTOR_TOX',
  EFFECT_BLOOM: 'VECTOR_WET',
  EFFECT_HEAL: 'VECTOR_WET',
  EFFECT_CHAIN: 'VECTOR_CHARGE',
  EFFECT_ECHO: 'VECTOR_CHARGE',
  EFFECT_PRISMATIC: 'VECTOR_CHARGE',
  EFFECT_GRAVITY: 'VECTOR_ATTRACTOR',
  EFFECT_VORTEX: 'VECTOR_ATTRACTOR',
  EFFECT_TITAN: 'VECTOR_HEAT',
  EFFECT_CRIT: 'VECTOR_CHARGE',
  EFFECT_PIERCE: 'VECTOR_TOX',
  EFFECT_REFLECT: 'VECTOR_HEAT',
  EFFECT_SHIELD: 'VECTOR_WET',
  EFFECT_HASTE: 'VECTOR_ATTRACTOR',
};

export function vectorForEffect(effectId: string): VectorId | null {
  return EFFECT_TO_VECTOR[effectId] ?? null;
}

export const VECTOR_DRIFT_CAP = 0.85;
export const VECTOR_DRIFT_STAR_WEIGHT = 0.2;

/**
 * Attraktor-Feld (Gravity) — die Physik als Content, nicht als Literal im System.
 *
 * `pullMax` ist der Zell-Zug bei VOLLER Feldstärke in der Feldmitte; zum Rand fällt er linear
 * auf 0. Eine Kraft OHNE Obergrenze gibt es nicht: der frühere Term `strength*0.1/d` wuchs zur
 * Mitte hin unbeschränkt und hat Gegner vom Brett geschleudert (gemessen 20.09.2026: x = -519).
 *
 * `maxShare` ist der Höchstanteil des LAUF-Tempos, den das Feld einem Opfer nehmen darf. Damit
 * gilt strukturell `netto ≥ (1 - maxShare) · Tempo` — kein Gegner kann festgehalten werden,
 * egal wie viele Felder sich überlagern. Die Grenze ist ein ANTEIL, keine Zell-Zahl: ein
 * späterer, langsamerer Gegnertyp erbt die Garantie, ohne dass hier etwas nachgezogen wird.
 *
 * `spawn` sind die Werte, die eine Pflanze je Schuss setzt (vorher Literale in `root.ts`).
 */
export const VECTOR_ATTRACTOR_CONFIG = {
  spawn: { strength: 0.8, radius: 3, ttl: 60 },
  pullMax: 0.05,
  maxShare: 0.6,
} as const;

export function isValidVector(id: string): id is VectorId {
  return id in VECTOR_LOGIC_SOURCE;
}
