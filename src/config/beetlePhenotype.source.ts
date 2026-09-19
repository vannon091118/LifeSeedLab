// Owner: Source (content truth). LOC ≤ 200.
// BIOLOGISCHE SPRACHE #2: die Anatomie-Achsen eines Käfers. Gleiche Zuchtphilosophie wie die
// Pflanze (eine Maschine, genome/breeding.ts), aber eine EIGENE Grammatik: was ein Käfer kann,
// ist an ihm zu sehen — und was er sieht, kommt aus seinem Genom, nicht aus einer Basis-Sorte.
//
// Der Anker der alten Darstellung (`BEETLES_SOURCE[id].color` + Basen-Schablone) ist damit
// GESTORBEN: `BEETLES_SOURCE` liefert nur noch die Balance-Basiswerte (HP/Tempo/Biss), aus
// denen die Gene die Stats ableiten. Die Form kommt AUSSCHLIESSLICH aus diesen Achsen.

/** Panzer-/Flügeldeckenform (Silhouette). */
export type CarapaceForm = 'dome' | 'flat' | 'ridged' | 'spiked';
/** Panzeroberfläche — das Gegenstück zum pflanzlichen Relief. */
export type CarapaceStructure = 'smooth' | 'granular' | 'striated' | 'pitted';
export type BeetleMotion = 'scuttle' | 'march' | 'hop' | 'dash';
/** Interaktions-Achse `chitin`: Panzerkleid aus Segmentierung × Struktur. */
export type ChitinDress = 'plated' | 'scaled' | 'studded' | 'armoured';
/** Interaktions-Achse `bearing`: Haltung aus Mandibel-Länge × Körperbreite. */
export type BeetleBearing = 'nimble' | 'broad' | 'hulking' | 'sprawling';
/**
 * KÖRPERPLAN: was der Spieler auf einen Blick benennt („das ist eine Hummel", „ein Hirschkäfer").
 * Abgeleitet aus den Achsen Flügel/Pelz/Stachel/Halschild/Mandibeln — NICHT aus der Sorte: der
 * Plan entsteht in der Kreuzung, und eine Hummel ist eine Hummel, weil ihr Genom ihr Pelz,
 * Flügel und Breite gibt. Genau hier wurde „seit wann sehen Hummeln so aus" beantwortet.
 */
export type BeetlePlan = 'beetle' | 'stag' | 'bee' | 'wasp';

export type BeetleAxis =
  | 'bodyLength' | 'bodyWidth' | 'segmentation' | 'headSize' | 'thoraxRatio'
  | 'carapaceShape' | 'carapaceSurface' | 'mandibles' | 'mandibleWidth'
  | 'antennae' | 'antennaLength' | 'legs' | 'legLength' | 'elytraSpread'
  | 'pattern' | 'pigmentA' | 'pigmentB' | 'sheen' | 'asymmetry'
  | 'attack' | 'swarm' | 'brood'
  // ── P7-Pool-Erweiterung (19.09.2026): Organe, die es vorher GAR NICHT gab. Eine Hummel hatte
  //    kein einziges Gen, das Flügel, Pelz oder Stachel hätte erzeugen können — deshalb sah sie
  //    aus wie ein Käfer. Diese fünf Achsen sind die Antwort auf „alle Käfer sehen gleich aus".
  | 'wings' | 'pelage' | 'stinger' | 'pronotum' | 'jumpLegs';

/** Jedes Käfer-Gen bewegt MEHRERE Achsen — Form, Oberfläche, Pigment, Verhalten. */
export const BEETLE_AXES_BY_GENE: Record<string, Partial<Record<BeetleAxis, number>>> = {
  swarmborn: { bodyWidth: -0.20, legs: 0.45, swarm: 0.60, elytraSpread: 0.30, segmentation: 0.20 },
  taunt:     { bodyLength: 0.30, bodyWidth: 0.35, headSize: 0.20, attack: 0.35, sheen: 0.20 },
  phoenix:   { pigmentA: 0.70, pattern: 0.40, brood: 0.55, sheen: 0.30, carapaceShape: 0.20 },
  broodhost: { segmentation: 0.50, bodyLength: 0.20, brood: 0.35, antennae: 0.30, bodyWidth: 0.15 },
  carapace:  { carapaceSurface: 0.50, bodyWidth: 0.40, sheen: 0.30, elytraSpread: -0.20, thoraxRatio: 0.15, carapaceShape: -0.30, segmentation: 0.25 },
  sprinter:  { legs: 0.50, legLength: 0.40, bodyLength: -0.15, antennaLength: 0.25, attack: -0.10 },
  mandible:  { mandibles: 0.60, mandibleWidth: 0.20, headSize: 0.25, attack: 0.30, carapaceShape: 0.15 },
  venomous:  { pigmentA: 0.50, pattern: 0.45, mandibleWidth: 0.20, sheen: -0.10, carapaceSurface: 0.20 },
  // ── Pool-Erweiterung: Organ-Gene. Jedes besetzt eine Achse, die vorher niemand bewegen konnte.
  winged:    { wings: 0.65, elytraSpread: 0.25, bodyWidth: -0.10, sheen: 0.15, carapaceShape: 0.10, segmentation: -0.10 },
  furry:     { pelage: 0.70, pattern: 0.30, bodyWidth: 0.15, sheen: -0.25, carapaceShape: -0.15, segmentation: 0.10 },
  sting:     { stinger: 0.70, attack: 0.25, pattern: 0.20, segmentation: 0.15, carapaceShape: 0.25 },
  jumper:    { jumpLegs: 0.65, legLength: 0.35, legs: 0.20, bodyLength: -0.10, carapaceShape: 0.20, segmentation: -0.15 },
  hardshell: { pronotum: 0.65, carapaceSurface: 0.30, bodyWidth: 0.20, sheen: 0.20, elytraSpread: -0.15, carapaceShape: -0.25, segmentation: 0.20 },
};
// BEFUND (gemessen 19.09.2026, Sonde vor dieser Zeile): `carapaceShape` wurde praktisch nur von
// `phoenix`/`mandible` bewegt, `segmentation` fast nur von `broodhost`/`swarmborn`. Deshalb lag
// `carapaceForm` bei allen drei Gründern auf `flat` und `dress` bei allen auf `scaled` — zwei der
// vier Formen und drei der vier Panzerkleider waren über Kreuzungen kaum erreichbar. Genau das war
// „alle Käfer sehen fast identisch aus". Die Form-/Struktur-Treiber sitzen jetzt über den ganzen
// Pool verteilt (Panzer → Kuppel, Stromlinie → Grat, Punktierung → Stachel), nicht in einer Nische.

/** Klemmen je Achse — der Käfer bleibt lesbar, nie ein Monster. */
export const BEETLE_AXIS_RANGE: Record<BeetleAxis, readonly [number, number]> = {
  bodyLength: [0.2, 1], bodyWidth: [0.2, 1], segmentation: [0, 1],
  headSize: [0.15, 0.8], thoraxRatio: [0.2, 0.8],
  carapaceShape: [0, 1], carapaceSurface: [0, 1],
  mandibles: [0, 1], mandibleWidth: [0.1, 1],
  antennae: [0, 1], antennaLength: [0, 1],
  legs: [0, 1], legLength: [0.2, 1], elytraSpread: [0, 1],
  pattern: [0, 1], pigmentA: [0, 1], pigmentB: [0, 1], sheen: [0, 1],
  asymmetry: [0, 1], attack: [0, 1], swarm: [0, 1], brood: [0, 1],
  wings: [0, 1], pelage: [0, 1], stinger: [0, 1], pronotum: [0, 1], jumpLegs: [0, 1],
};

/** Ruhelage: ein ausgewachsener Käfer ohne Gene — neutral, nicht „Basis-Sorte". */
export const BEETLE_BASELINE: Record<BeetleAxis, number> = {
  bodyLength: 0.55, bodyWidth: 0.5, segmentation: 0.4, headSize: 0.4, thoraxRatio: 0.45,
  carapaceShape: 0.4, carapaceSurface: 0.3, mandibles: 0.3, mandibleWidth: 0.35,
  antennae: 0.5, antennaLength: 0.45, legs: 0.6, legLength: 0.5, elytraSpread: 0.35,
  pattern: 0.25, pigmentA: 0.4, pigmentB: 0.5, sheen: 0.4,
  asymmetry: 0.15, attack: 0.35, swarm: 0.15, brood: 0.1,
  // Ruhelage OHNE Gen: keine Flügel, kein Pelz, kein Stachel — ein nackter Panzer. Der Pelz
  // (0.05) und die Flügel (0.1) sind bewusst unter jeder Plan-Schwelle, damit „Hummel" nicht
  // durch die Grundhaltung entsteht, sondern durch Gene.
  wings: 0.1, pelage: 0.05, stinger: 0, pronotum: 0.3, jumpLegs: 0.15,
};

/** Schwellen → benannte Ausprägungen (gelesen, nicht gewählt). */
export const BEETLE_FORM_THRESHOLDS = {
  carapaceForm: ['dome', 'flat', 'ridged', 'spiked'] as const,
  carapaceSurface: ['smooth', 'granular', 'striated', 'pitted'] as const,
  patternName: ['solid', 'bands', 'spots', 'reticulated'] as const,
  motionStyle: ['march', 'scuttle', 'hop', 'dash'] as const,
  chitinName: ['plated', 'scaled', 'studded', 'armoured'] as const,
  bearingName: ['nimble', 'broad', 'hulking', 'sprawling'] as const,
} as const;

/**
 * Körperplan-Regeln in Prüf-Reihenfolge (die erste passende gewinnt). Source = Wahrheit: Wer eine
 * Schwelle verschiebt, verschiebt das Spielerlebnis, ohne Code anzufassen.
 * `bee` steht VOR `wasp`: eine Hummel hat einen Stachel, aber auch Pelz — Plüsch entscheidet.
 */
export const BEETLE_BODY_PLAN: readonly { plan: BeetlePlan; test: (a: Record<BeetleAxis, number>) => boolean }[] = [
  { plan: 'stag', test: a => a.mandibles >= 0.6 && a.pronotum >= 0.5 },
  { plan: 'bee', test: a => a.pelage >= 0.3 && a.wings >= 0.35 },
  { plan: 'wasp', test: a => a.wings >= 0.35 && a.stinger >= 0.3 },
];

/** Achsen, die den Plan tragen — als Daten, damit Tests/UI den Plan prüfen können statt zu raten. */
export const BEETLE_PLAN_AXES: readonly BeetleAxis[] = ['wings', 'pelage', 'stinger', 'pronotum', 'mandibles'];

/** Bernsteine/Tusche-Palette (die Brutstätte bleibt bewusst warm — kein Pflanzen-Grün). */
export const BEETLE_PIGMENT_RAMP: readonly (readonly [string, string])[] = [
  ['#8a6b3a', '#e0bd7a'], // Bernstein
  ['#6f5a49', '#cbb49a'], // Rinde
  ['#4a4238', '#a89c86'], // Tusche
  ['#7c4a2c', '#e2a05c'], // Zimt
  ['#5d6b4a', '#b9c98a'], // Moosgrün (selten, gedämpft)
  ['#3f4a5a', '#9fb0c4'], // Schiefer
  ['#6b3f52', '#c995ab'], // Beere
  ['#a0791f', '#f0d67a'], // Gold
] as const;

export const BEETLE_PIGMENT_SHIFT = { perPigmentA: 24, perPigmentB: 16 } as const;

/** Interaktions-Achsen des Käfers — dieselbe Mechanik wie bei der Pflanze (Produkt der Abweichungen). */
export type BeetleInteractionAxis = 'chitin' | 'bearing';
export const BEETLE_INTERACTION: Record<BeetleInteractionAxis, { a: BeetleAxis; b: BeetleAxis; gain: number }> = {
  chitin: { a: 'segmentation', b: 'carapaceSurface', gain: 3.0 },
  bearing: { a: 'mandibles', b: 'bodyWidth', gain: 2.8 },
};
export const BEETLE_INTERACTION_RANGE: Record<BeetleInteractionAxis, readonly [number, number]> = {
  chitin: [0, 1], bearing: [0, 1],
};

/** Kanonische Vergleichs-Ordnung + Gewichte (dieselbe Rolle wie bei der Pflanze). */
export const BEETLE_DESCRIPTOR_AXES: readonly (BeetleAxis | BeetleInteractionAxis)[] = [
  'bodyLength', 'bodyWidth', 'segmentation', 'headSize', 'thoraxRatio',
  'carapaceShape', 'carapaceSurface', 'mandibles', 'mandibleWidth',
  'antennae', 'antennaLength', 'legs', 'legLength', 'elytraSpread',
  'pattern', 'pigmentA', 'pigmentB', 'sheen', 'asymmetry', 'attack', 'swarm', 'brood',
  'chitin', 'bearing',
  'wings', 'pelage', 'stinger', 'pronotum', 'jumpLegs',
];

export const BEETLE_DESCRIPTOR_WEIGHTS: readonly number[] = [
  1.5, 1.5, 1.2, 1.0, 1.0,      // Körper
  1.2, 1.0, 1.3, 0.8,           // Panzer, Mandibeln
  0.9, 0.8, 1.2, 0.9, 0.9,      // Fühler, Beine, Decken
  0, 0, 0, 0.3, 0.6,            // Pigment zählt nicht, Angriff/Schwarm schwach
  0.5, 0.9, 0.7,                // Brut-Präsentation, chitin, bearing
  1.4, 1.5, 1.1, 1.0, 1.0,      // Flügel, Pelz, Stachel, Halschild, Sprungbeine —
                                // hoch gewichtet: wer diese Organe tauscht, hat ein anderes Tier
];

/** Stetige Interaktions-Achse (identische Arithmetik wie beim Pflanzen-Adapter). */
export function beetleInteractionOf(axis: BeetleInteractionAxis, axes: Record<BeetleAxis, number>): number {
  const rule = BEETLE_INTERACTION[axis];
  const [lo, hi] = BEETLE_INTERACTION_RANGE[axis];
  const value = 0.5 + (axes[rule.a] - 0.5) * (axes[rule.b] - 0.5) * rule.gain;
  return value < lo ? lo : value > hi ? hi : value;
}
