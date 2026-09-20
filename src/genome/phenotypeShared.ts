// Owner: Genome (gemeinsame Ableitungs-Helfer beider Phänotyp-Sprachen). LOC ≤ 200.
// Regel 3 (Kollisionsfreiheit): `bucket` lebte zweimal — identisch in beetlePhenotype.ts und
// plantPhenotype.ts (die „Zwillinge" teilen die Zuchtmaschine, nicht Copypasta). `clamp` kam
// als lokale Kopie in beiden dazu. Eine Wahrheit jetzt; beide Adapter importieren von hier.

/** Zählt, wie viele Schwellen der Wert erreicht — Eimer-Index für benannte Formen. */
export function bucket(value: number, thresholds: readonly number[]): number {
  let i = 0;
  for (const t of thresholds) if (value >= t) i++;
  return i;
}

/** Klemmt auf [lo, hi] — die Achsen-Grenze beider Phänotyp-Sprachen. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
