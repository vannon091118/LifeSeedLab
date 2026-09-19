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

export type BeetleAxis =
  | 'bodyLength' | 'bodyWidth' | 'segmentation' | 'headSize' | 'thoraxRatio'
  | 'carapaceShape' | 'carapaceSurface' | 'mandibles' | 'mandibleWidth'
  | 'antennae' | 'antennaLength' | 'legs' | 'legLength' | 'elytraSpread'
  | 'pattern' | 'pigmentA' | 'pigmentB' | 'sheen' | 'asymmetry'
  | 'attack' | 'swarm' | 'brood';

/** Jedes Käfer-Gen bewegt MEHRERE Achsen — Form, Oberfläche, Pigment, Verhalten. */
export const BEETLE_AXES_BY_GENE: Record<string, Partial<Record<BeetleAxis, number>>> = {
  swarmborn: { bodyWidth: -0.20, legs: 0.45, swarm: 0.60, elytraSpread: 0.30, segmentation: 0.20 },
  taunt:     { bodyLength: 0.30, bodyWidth: 0.35, headSize: 0.20, attack: 0.35, sheen: 0.20 },
  phoenix:   { pigmentA: 0.70, pattern: 0.40, brood: 0.55, sheen: 0.30, carapaceShape: 0.20 },
  broodhost: { segmentation: 0.50, bodyLength: 0.20, brood: 0.35, antennae: 0.30, bodyWidth: 0.15 },
  carapace:  { carapaceSurface: 0.50, bodyWidth: 0.40, sheen: 0.30, elytraSpread: -0.20, thoraxRatio: 0.15 },
  sprinter:  { legs: 0.50, legLength: 0.40, bodyLength: -0.15, antennaLength: 0.25, attack: -0.10 },
  mandible:  { mandibles: 0.60, mandibleWidth: 0.20, headSize: 0.25, attack: 0.30, carapaceShape: 0.15 },
  venomous:  { pigmentA: 0.50, pattern: 0.45, mandibleWidth: 0.20, sheen: -0.10, carapaceSurface: 0.20 },
};

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
};

/** Ruhelage: ein ausgewachsener Käfer ohne Gene — neutral, nicht „Basis-Sorte". */
export const BEETLE_BASELINE: Record<BeetleAxis, number> = {
  bodyLength: 0.55, bodyWidth: 0.5, segmentation: 0.4, headSize: 0.4, thoraxRatio: 0.45,
  carapaceShape: 0.4, carapaceSurface: 0.3, mandibles: 0.3, mandibleWidth: 0.35,
  antennae: 0.5, antennaLength: 0.45, legs: 0.6, legLength: 0.5, elytraSpread: 0.35,
  pattern: 0.25, pigmentA: 0.4, pigmentB: 0.5, sheen: 0.4,
  asymmetry: 0.15, attack: 0.35, swarm: 0.15, brood: 0.1,
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
];

export const BEETLE_DESCRIPTOR_WEIGHTS: readonly number[] = [
  1.5, 1.5, 1.2, 1.0, 1.0,      // Körper
  1.2, 1.0, 1.3, 0.8,           // Panzer, Mandibeln
  0.9, 0.8, 1.2, 0.9, 0.9,      // Fühler, Beine, Decken
  0, 0, 0, 0.3, 0.6,            // Pigment zählt nicht, Angriff/Schwarm schwach
  0.5, 0.9, 0.7,                // Brut-Präsentation, chitin, bearing
];

/** Stetige Interaktions-Achse (identische Arithmetik wie beim Pflanzen-Adapter). */
export function beetleInteractionOf(axis: BeetleInteractionAxis, axes: Record<BeetleAxis, number>): number {
  const rule = BEETLE_INTERACTION[axis];
  const [lo, hi] = BEETLE_INTERACTION_RANGE[axis];
  const value = 0.5 + (axes[rule.a] - 0.5) * (axes[rule.b] - 0.5) * rule.gain;
  return value < lo ? lo : value > hi ? hi : value;
}
