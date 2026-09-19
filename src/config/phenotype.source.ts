// Owner: Source (content truth). LOC ≤ 200.
// DIE BIOLOGISCHE GRAMMATIK: Gene → Phänotyp-Achsen. Ein Gen darf MEHRERE Achsen
// gleichzeitig verschieben (Form, Oberfläche, Pigment, Verhalten) — genau das war im alten
// Modell vernichtet („Gen ⇒ Extra") und ist der Grund, warum zwei Genome gleich aussahen.
//
// Hier stehen NUR Zahlen und Zuordnungen. Die Ableitung Genom → Phänotyp lebt in
// genome/plantPhenotype.ts (Pflanze) und genome/beetlePhenotype.ts (Käfer), das Zeichnen in
// render/plants.ts bzw. render/beetles.ts. Kein Code außerhalb config/ darf diese Werte
// definieren (Regel 6).
//
// Die Achsen sind ABSICHTLICH orthogonale, stetige Größen: erst dadurch kann eine Kreuzung ein
// Kontinuum abdecken statt weniger Bauformen, und die Kette bleibt unbegrenzt fortsetzbar —
// es gibt keine feste Liste, an deren Ende das System zusammenbricht.

import type { PlantType } from '../types';

/** Wuchsgewohnheit (Silhouette) — eine Tendenz je Rolle, keine Schablone. */
export type PlantHabit = 'upright' | 'creeping' | 'bulbous' | 'climbing';

export interface PlantHabitTendency {
  habit: PlantHabit;
  /** Ruhelage: Höhe (0..1) und Breite (0..1) des Wuchses. Das Genom verschiebt beides. */
  height: number;
  spread: number;
}

export const PLANT_HABIT_BY_ROLE: Record<PlantType, PlantHabitTendency> = {
  shooter: { habit: 'upright', height: 0.62, spread: 0.45 },
  wall: { habit: 'bulbous', height: 0.34, spread: 0.72 },
  support: { habit: 'climbing', height: 0.5, spread: 0.62 },
};

/** Alle morphologischen Achsen einer Pflanze (stetig, deterministisch aus dem Genom). */
export type PlantAxis =
  | 'height' | 'thickness' | 'curve' | 'lean'
  | 'branches' | 'leaves' | 'leafSize' | 'leafAngle'
  | 'thorns' | 'flowers' | 'flowerSize'
  | 'relief' | 'asymmetry' | 'sway' | 'vigour'
  | 'pigmentA' | 'pigmentB' | 'pattern' | 'attack';

/**
 * Gen ⇒ Achsen-Verschiebung (additiv, mit Gen-Stärke gewichtet). Ein Gen besitzt sowohl
 * Gameplay (config/genes.source.ts: Effekt) als auch mehrere sichtbare Achsen:
 * `fire` färbt, dornert, runzelt die Oberfläche UND macht die Angriffsbewegung heftiger.
 */
export const PLANT_AXES_BY_GENE: Record<string, Partial<Record<PlantAxis, number>>> = {
  fire:   { pigmentA: 0.75, pigmentB: 0.30, thorns: 0.35, relief: 0.20, attack: 0.25 },
  ice:    { pigmentA: 0.10, pigmentB: 0.15, relief: 0.45, flowerSize: 0.15, sway: -0.15 },
  rapid:  { height: 0.25, sway: 0.30, leaves: 0.45, branches: 0.30 },
  heavy:  { thickness: 0.50, height: -0.20, leafSize: 0.25, vigour: 0.30, sway: -0.20 },
  heal:   { flowers: 0.40, flowerSize: 0.30, pigmentB: 0.35, vigour: 0.20 },
  shield: { thickness: 0.30, relief: 0.35, leafAngle: -0.20, curve: -0.15 },
  venom:  { pattern: 0.50, pigmentA: 0.45, relief: 0.30, thorns: 0.15 },
  splash: { branches: 0.45, leaves: 0.30, pattern: 0.30, curve: 0.20 },
  pierce: { thorns: 0.40, height: 0.30, leafAngle: 0.30, leafSize: -0.20 },
  regen:  { vigour: 0.40, leaves: 0.35, branches: 0.20, sway: 0.15 },
  lure:   { flowers: 0.50, pigmentA: 0.60, sway: 0.40, flowerSize: 0.25 },
  thorns: { thorns: 0.60, relief: 0.35, thickness: 0.20, asymmetry: 0.20 },
  swift:  { height: 0.30, sway: 0.50, leafAngle: 0.25, leafSize: -0.15 },
  crit:   { pattern: 0.45, flowers: 0.25, asymmetry: 0.30, pigmentB: 0.30 },
  aura:   { flowers: 0.35, pigmentB: 0.50, sway: 0.20, relief: 0.20 },
};

/**
 * INTERAKTIONS-ACHSEN — der Grund, warum eine Kreuzung keine Mittelwertbildung ist.
 *
 * Jede entsteht aus der BEZIEHUNG zweier Achsen (Produkt ihrer Abweichungen von der Mitte),
 * nicht aus ihrem Mittel. Weil die Rekombination die beiden Elternmerkmale NEU PAART, kann das
 * Kind beide Eltern in einem Punkt überschreiten, den keiner von ihnen hatte: Verzweigung aus
 * dem einen, Blattanzahl aus dem anderen. Eine Achse, die aus dem Mittelwert entstünde, könnte
 * das nie (sie liegt immer zwischen den Eltern).
 *
 * `rhythm` — Wuchsrhythmus: wechselständig ↔ quirlig (Blätter je Knoten, Knotenabstand)
 * `guard`  — Abwehrhaltung: Einzeldorn ↔ Dornenwald ↔ Schutzkappe
 */
export type PlantInteractionAxis = 'rhythm' | 'guard';

/** Wechselwirkungs-Regel je Interaktions-Achse: 0.5 + (a−0.5)·(b−0.5)·gain. */
export const PLANT_INTERACTION: Record<PlantInteractionAxis, { a: PlantAxis; b: PlantAxis; gain: number }> = {
  rhythm: { a: 'branches', b: 'leaves', gain: 3.2 },
  guard: { a: 'thorns', b: 'relief', gain: 2.6 },
};

/** Klemmen je Achse — die Anatomie bleibt in einem lesbaren Fenster (nie „Monster"). */
export const PLANT_AXIS_RANGE: Record<PlantAxis, readonly [number, number]> = {
  height: [0.18, 1], thickness: [0.15, 1], curve: [-1, 1], lean: [-1, 1],
  branches: [0, 1], leaves: [0, 1], leafSize: [0.2, 1], leafAngle: [-1, 1],
  thorns: [0, 1], flowers: [0, 1], flowerSize: [0.2, 1],
  relief: [0, 1], asymmetry: [0, 1], sway: [0, 1], vigour: [0, 1],
  pigmentA: [0, 1], pigmentB: [0, 1], pattern: [0, 1], attack: [0, 1],
};

/** Interaktions-Achsen liegen normiert in 0..1 (kein Vorzeichen — sie sind Ausprägungen). */
export const PLANT_INTERACTION_RANGE: Record<PlantInteractionAxis, readonly [number, number]> = {
  rhythm: [0, 1], guard: [0, 1],
};

/** Blattform/Farbe/Blüte werden aus Achsen-Werten GELESEN (Schwellen, keine Tabellenwahl). */
export const PLANT_FORM_THRESHOLDS = {
  leafShape: [0.3, 0.62] as const,      // lance → oval → round → frond
  flowerForm: [0.28, 0.58] as const,    // star → bell → puff → spike
  reliefName: ['smooth', 'ribbed', 'hairy', 'warty'] as const,
  patternName: ['solid', 'gradient', 'striped', 'speckled'] as const,
  motionStyle: ['still', 'sway', 'whip', 'pulse'] as const,
  /** Wuchsrhythmus → Blattstellung (sichtbar: ein Blatt je Knoten bis Quirl aus vier Blättern). */
  rhythmName: ['alternate', 'opposite', 'whorled'] as const,
  /** Abwehrhaltung → Dornenkleid (sichtbar: Einzeldorn bis Schutzkappe). */
  guardName: ['sparse', 'prickly', 'thicket', 'armour'] as const,
} as const;

/**
 * Pigment-Rampe: (Grundton, Akzent) je Farbfamilie. Die Achsen `pigmentA`/`pigmentB` wählen
 * den Eintrag — dadurch deckt eine Kreuzung das Spektrum ab, ohne dass Farb-Mathematik im
 * Renderer entsteht (Quelle: Zahlen, Ableitung: genome/plantPhenotype.ts).
 */
export const PLANT_PIGMENT_RAMP: readonly (readonly [string, string])[] = [
  ['#4f9d4f', '#c9f27a'], // Blattgrün
  ['#3f8f86', '#9fe8dc'], // Seegrün
  ['#6b8f3a', '#e3f08a'], // Olive
  ['#b9c94a', '#f4f7c4'], // Limette
  ['#d9a441', '#f6e0a3'], // Honig
  ['#c96f3b', '#f3c39a'], // Ziegel
  ['#b4567f', '#f2b3cd'], // Beere
  ['#7a5bb8', '#cdb8f2'], // Nachtschatten
  ['#4a6fb5', '#a9c4f5'], // Kobalt
  ['#8d5a3b', '#d7b696'], // Wurzelbraun
] as const;

/** Wie stark ein voller Achsenwert den Grundton verschiebt (Helligkeit/Sättigung, ±Kanäle). */
export const PLANT_PIGMENT_SHIFT = { perPigmentA: 26, perPigmentB: 18 } as const;

/**
 * Kanonische Achsen-Ordnung des Vergleichsvektors (Deskriptor) — Vertrag, nicht Kosmetik:
 * die Neuheitsprüfung vergleicht Individuen über genau diese Reihenfolge.
 */
export const PLANT_DESCRIPTOR_AXES: readonly (PlantAxis | PlantInteractionAxis)[] = [
  'height', 'thickness', 'curve', 'lean', 'branches', 'leaves', 'leafSize', 'leafAngle',
  'thorns', 'flowers', 'flowerSize', 'relief', 'asymmetry', 'sway', 'vigour',
  'pigmentA', 'pigmentB', 'pattern', 'attack', 'rhythm', 'guard',
];

/**
 * GEWICHTE der Achsen im Vergleichsvektor — die Antwort auf „Achsen ohne Mindest-Wirkung".
 *
 * Gemessen (Sonde, Seed 1000–1030): ungewichtete Mittelung über alle Achsen verwässerte echte
 * Formänderungen so stark, dass 1 von 3 Kandidatenpaaren bei Distanz 0,005 lag — für den
 * Spieler dieselbe Figur. Das Gewicht gibt der SILHOUETTE (Höhe, Dicke, Blattwerk, Dornen,
 * Wuchsrhythmus) das Gewicht, das der Spieler ihr gibt; die rein farblichen Achsen wiegen 0,
 * weil „minimale Farbverschiebung" kein neues Wesen ist (Auftrag #8).
 */
export const PLANT_DESCRIPTOR_WEIGHTS: readonly number[] = [
  1.6, 1.4, 1.0, 0.8, 1.3, 1.4, 1.0, 0.8,   // Höhe … Blattwinkel
  1.2, 0.9, 0.9, 0.9, 0.7, 0.7, 1.1,          // Dornen … Wuchskraft
  0, 0, 0, 0.8,                               // Pigment/Muster zählen nicht, Angriff zählt
  1.2, 1.0,                                   // rhythm, guard (Interaktion)
];

/**
 * Zuchtmaschinen-Kurve (EINE Wahrheit für Pflanzen UND Käfer): wie weit sich eine Generation
 * von ihren Eltern löst. Die Drift wächst STETIG und asymptotisch — kein Schalter bei
 * Generation 4. `retain` < 1 ⇒ frühe Generationen bleiben nahe an den Eltern, späte werden
 * freier, ohne die Familienlinie zu verlieren.
 */
export const BREEDING = {
  /** Mutation: Chance, dass ein Kind an einer Stelle ein NEUES Gen erhält. */
  mutationChance: 0.18,
  /** Mutation: Stärke-Fenster eines neuen Gens (mit Drift skaliert). */
  mutationPower: [0.15, 0.55] as const,
  /**
   * Verlust-Chance eines Allels, das nur EIN Elternteil beisteuert. Bewusst NIEDRIG: ein
   * Träger trägt. Bei einem hohen Wert (vorher lag die Verlust-Chance bei 45 %) verschwand eine
   * rezessive Anlage nach zwei Generationen für immer — die vom Auftrag geforderte „spätere
   * Wiederkehr" war damit rechnerisch tot. Verlust ist jetzt die Ausnahme, nicht die Regel,
   * und ein Genom wächst dadurch nicht unbegrenzt.
   */
  carryLoss: 0.15,
  /**
   * Träger-Dämpfung: Kraft-Faktor eines Allels, das nur EIN Elternteil beisteuert. Rezessive
   * Anlagen starten damit UNTER der Sichtschwelle (Träger) und erwachen mit der Drift
   * (rezessive Wiederkehr) — ohne dass die Information je verloren geht.
   */
  carryDamping: { recessive: 0.35, dominant: 0.8, wakeGain: 1.5, blurb: 0.25 } as const,
  /** Schwellwert, ab dem ein Gen sichtbar wird (Wahrnehmung wie bisher 0.2). */
  visiblePower: 0.2,
  /** Drift-Kurve: Drift(g) = cap − (cap − start) · retain^(g−1). */
  drift: { start: 0.12, cap: 0.85, retain: 0.62 } as const,
  /**
   * Neuheitsdruck: jeder Neuversuch entfremdet den Entwurf um diesen Betrag (effektive Drift).
   * Der Druck ist der Hebel, mit dem „zu ähnlich" deterministisch zu „anders" wird — ohne ihn
   * liefe die Schleife in den Deckel und würde am Ende doch einen Klon ausliefern.
   */
  noveltyPressure: 0.14,
  /**
   * Neuheit: gewichtete FORM-Distanz, unter der ein Kandidat als „zu gleich" gilt.
   *
   * GEMESSEN (Sonde, 40 Paare, Schützen, Seeds 1000–1040, gewichtete Distanz):
   *   klar verschiedene Genome          0,13 – 0,20
   *   Geschwister, 1. Versuch (Gen 1)   Median 0,046 · p25 0,034
   *   Geschwister, bester von 6 (Gen 1) p10 0,066 · Median 0,085
   *   Geschwister, bester von 6 (Gen 5) p10 0,094 · Median 0,116
   * 0,055 liegt damit über dem Klon-Bereich (0,005–0,034) und unter dem, was der
   * Neuheitsdruck mit sechs Versuchen in Generation 1 zuverlässig erreicht — die Schwelle ist
   * aus der Messung gesetzt, nicht aus Geschmack. Wer sie anhebt, muss den Druck mitheben.
   */
  novelty: { minDistance: 0.055, maxAttempts: 6 } as const,
  /** Elternähnlichkeit: maximale Distanz in Generation 1 (Eltern sollen erkennbar bleiben). */
  parentSimilarityFloor: 0.42,
} as const;

/** Stetige Generations-Drift (rein arithmetisch, kein RNG — deshalb reproduzierbar). */
export function driftFor(generation: number): number {
  const { start, cap, retain } = BREEDING.drift;
  const g = Math.max(1, generation);
  return cap - (cap - start) * Math.pow(retain, g - 1);
}

/**
 * Interaktions-Achse aus zwei Basis-Achsen. Zentraler Punkt: das Ergebnis ist KEIN Mittel,
 * sondern das Produkt der Abweichungen — deshalb kann es außerhalb des Eltern-Intervalls
 * liegen, wenn die Rekombination die beiden Merkmale neu paart.
 */
export function interactionOf(axis: PlantInteractionAxis, axes: Record<PlantAxis, number>): number {
  const rule = PLANT_INTERACTION[axis];
  const [lo, hi] = PLANT_INTERACTION_RANGE[axis];
  const value = 0.5 + (axes[rule.a] - 0.5) * (axes[rule.b] - 0.5) * rule.gain;
  return value < lo ? lo : value > hi ? hi : value;
}
