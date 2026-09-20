// Owner: Source (plant phenotype adapter). LOC ≤ 300.
// BIOLOGISCHE SPRACHE #1: Genom + Rolle + Generation ⇒ organische Pflanzenanatomie.
// Dies ist der Adapter über dem gemeinsamen Zuchtkern (genome/breeding.ts) — er entscheidet
// NICHT über Vererbung, sondern übersetzt Anlagen in Wuchsform, Blattwerk, Blüte, Schutz,
// Oberfläche, Pigment, Wuchsrhythmus und Bewegung. Gerendert wird daraus in render/plants.ts.
//
// Determinismus: jede Ableitung ist eine reine Funktion von (Genom, Rolle, Generation).
// Die Streuung kommt aus core/rng im 'plant'-Namespace, aber ihr Seed ist aus dem
// GENOM-INHALT abgeleitet — kein geteilter Strom, keine Uhr, kein Renderer-Einfluss.
// Zwei Individuen mit identischem Genom sehen deshalb gleich aus; ein Reload kann ein Wesen
// nicht umzeichnen (Auftrag #15).

import type { Genome, PlantType } from '../types';
import { makeRng } from '../core/rng';
import { fnv1a } from '../core/hash';
import { shiftChannels } from '../core/color';
import {
  PLANT_AXES_BY_GENE, PLANT_AXIS_RANGE, PLANT_DESCRIPTOR_AXES, PLANT_DESCRIPTOR_WEIGHTS,
  PLANT_FORM_THRESHOLDS, PLANT_HABIT_BY_ROLE, PLANT_PIGMENT_RAMP, PLANT_PIGMENT_SHIFT,
  interactionOf, type PlantAxis, type PlantHabit,
} from '../config/phenotype.source';
import { driftFor, expressed, genomeKey, weightedDistance } from './breeding';
import { bucket, clamp } from './phenotypeShared';

export type LeafShape = 'lance' | 'oval' | 'round' | 'frond';
type FlowerForm = 'none' | 'star' | 'bell' | 'puff' | 'spike';
type SurfaceName = 'smooth' | 'ribbed' | 'hairy' | 'warty';
type PatternName = 'solid' | 'gradient' | 'striped' | 'speckled';
type MotionStyle = 'still' | 'sway' | 'whip' | 'pulse';
/** Blattstellung — die sichtbare Folge der Interaktions-Achse `rhythm`. */
type LeafArrangement = 'alternate' | 'opposite' | 'whorled';
/** Dornenkleid — die sichtbare Folge der Interaktions-Achse `guard`. */
type ThornDress = 'sparse' | 'prickly' | 'thicket' | 'armour';

export interface PlantPhenotype {
  version: 1;
  habit: PlantHabit;
  /** Gesamtgröße 0.75–1.3 (Genstärke + Vigour) — Aussage, kein Deko-Faktor. */
  scale: number;
  stalk: { height: number; thickness: number; curve: number; lean: number; nodes: number };
  branches: { count: number; spread: number; startAt: number };
  leaves: { count: number; shape: LeafShape; size: number; angle: number; droop: number; arrangement: LeafArrangement };
  flowers: { count: number; form: FlowerForm; size: number; openness: number };
  protection: { thorns: number; length: number; dress: ThornDress };
  surface: { relief: SurfaceName; sheen: number };
  pigment: { primary: string; accent: string; pattern: PatternName; strength: number; family: number };
  asymmetry: number;
  motion: { style: MotionStyle; sway: number; attack: number };
  /** Interaktions-Achsen: aus der BEZIEHUNG zweier Achsen — dürfen die Eltern überschreiten. */
  interaction: { rhythm: number; guard: number };
  /** Gewichteter Vergleichsvektor für Neuheit/Elternähnlichkeit (eine Ordnung, ein Maß). */
  descriptor: number[];
}

type Axes = Record<PlantAxis, number>;

const unit = (v: number): number => clamp((v + 1) / 2, 0, 1);

/** Genom ⇒ Achsen: Ruhelage der Rolle plus dominanz-gewichteter Beitrag jedes Gens. */
function axesFor(genome: Genome, role: PlantType): Axes {
  const habit = PLANT_HABIT_BY_ROLE[role];
  const axes = {
    height: habit.height, thickness: 0.4, curve: 0, lean: 0,
    branches: habit.spread * 0.5, leaves: 0.5, leafSize: 0.5, leafAngle: 0,
    thorns: role === 'wall' ? 0.15 : 0, flowers: role === 'support' ? 0.3 : 0.35,
    flowerSize: 0.5, relief: 0.25, asymmetry: 0.15, sway: habit.habit === 'climbing' ? 0.45 : 0.3,
    vigour: 0.45, pigmentA: 0.3, pigmentB: 0.5, pattern: 0.2, attack: 0.3,
  } as Axes;

  for (const g of expressed(genome)) {
    const delta = PLANT_AXES_BY_GENE[g.id];
    if (!delta) continue;
    const weight = g.power * (g.dominant ? 1.25 : 0.85);
    for (const [axis, amount] of Object.entries(delta) as [PlantAxis, number][]) {
      axes[axis] = (axes[axis] ?? 0) + amount * weight;
    }
  }
  for (const [axis, [lo, hi]] of Object.entries(PLANT_AXIS_RANGE) as [PlantAxis, readonly [number, number]][]) {
    axes[axis] = clamp(axes[axis] ?? 0, lo, hi);
  }
  return axes;
}

/**
 * Streuung aus dem GENOM (reine Funktion — dieselben Anlagen streuen immer gleich).
 *
 * Der Streu-Seed hängt bewusst NICHT an der Variant-ID: die Anatomie ist die Aussage des
 * Erbguts, nicht der Buchhaltung. `role` und `generation` sind Teil der Eingabe, weil sie die
 * Wuchs-Tendenz festlegen (ein Wall-Genom wächst anders als dasselbe Genom als Schütze).
 */
function spreadSeed(genomeKeyValue: string, role: PlantType, generation: number): number {
  return fnv1a(0x811c9dc5, `${genomeKeyValue}#${role}#${generation}`) >>> 0;
}

/**
 * Genom + Rolle + Generation ⇒ Phänotyp. `generation` zieht die Drift ins Bild: frühe
 * Generationen bleiben nahe an den Eltern, späte werden freier und lassen Schwaches wieder
 * hervortreten (die vererbte Anlage bleibt dabei sichtbar).
 */
export function plantPhenotypeOf(input: {
  genome: Genome;
  role: PlantType;
  generation: number;
  id: string;
}): PlantPhenotype {
  const base = axesFor(input.genome, input.role);
  const drift = driftFor(input.generation);
  const rng = makeRng('plant', spreadSeed(genomeKey(input.genome), input.role, input.generation));
  // Drift wirkt als Streuung um die geerbte Achse: spät darf die Form weiter wandern.
  const jitter = (axis: PlantAxis, amount: number): number => {
    const [lo, hi] = PLANT_AXIS_RANGE[axis];
    return clamp((base[axis] ?? 0) + (rng.next() - 0.5) * amount * (0.35 + drift), lo, hi);
  };

  const height = jitter('height', 0.22);
  const thickness = jitter('thickness', 0.18);
  const spread = clamp(base.branches * 0.55 + base.leafSize * 0.25, 0, 1);
  const habit: PlantHabit = height > spread * 1.5 ? 'upright'
    : spread > height * 1.35 ? (base.vigour > 0.55 ? 'bulbous' : 'creeping')
    : 'climbing';

  const reliefIdx = bucket(base.relief, [0.35, 0.6, 0.82]);
  const patternIdx = bucket(base.pattern, [0.22, 0.45, 0.72]);
  const family = bucket(base.pigmentA, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) % PLANT_PIGMENT_RAMP.length;
  const family2 = (family + 1 + bucket(base.pigmentB, [0.25, 0.5, 0.75])) % PLANT_PIGMENT_RAMP.length;
  const ramp = PLANT_PIGMENT_RAMP[family]!;
  const ramp2 = PLANT_PIGMENT_RAMP[family2]!;
  const shift = Math.round((base.pigmentA - 0.5) * PLANT_PIGMENT_SHIFT.perPigmentA);
  const shift2 = Math.round((base.pigmentB - 0.5) * PLANT_PIGMENT_SHIFT.perPigmentB);

  const leafShape: LeafShape = (['lance', 'oval', 'round', 'frond'] as const)[
    bucket(base.leafSize * 0.6 + base.relief * 0.4, [0.4, 0.58, 0.74]) % 4
  ]!;
  const flowerForm: FlowerForm = base.flowers < 0.12
    ? 'none'
    : (['star', 'bell', 'puff', 'spike'] as const)[bucket(base.flowerSize * 0.7 + base.pattern * 0.3, [0.35, 0.55, 0.78]) % 4]!;

  const leafCount = Math.max(2, Math.round(2 + base.leaves * 9));
  const branchCount = Math.round(base.branches * 3.4);
  const flowerCount = flowerForm === 'none' ? 0 : Math.max(1, Math.round(1 + base.flowers * 4));
  const flowerAxis = flowerForm === 'none' ? 0 : base.flowers;

  // Interaktions-Achsen: Produkt der Abweichungen (KEIN Mittel) — dürfen die Eltern überschreiten.
  const rhythm = interactionOf('rhythm', base);
  const guard = interactionOf('guard', base);
  const arrangement = PLANT_FORM_THRESHOLDS.rhythmName[bucket(rhythm, [0.4, 0.68]) % 3] ?? 'alternate';
  const dress = PLANT_FORM_THRESHOLDS.guardName[bucket(guard, [0.35, 0.58, 0.78]) % 4] ?? 'sparse';

  // Normierte Achsen (die Größen, die auch gemessen werden) — eine Ordnung für Deskriptor UND Bild.
  const scaled: Record<PlantAxis, number> = {
    ...base,
    height, thickness,
    curve: unit(base.curve), lean: unit(base.lean),
    branches: clamp(branchCount / 4, 0, 1),
    leaves: clamp(leafCount / 11, 0, 1),
    leafAngle: unit(base.leafAngle),
    flowers: flowerAxis,
  };
  const vector: Record<string, number> = { ...scaled, rhythm, guard, flowers: flowerAxis };

  const phenotype: PlantPhenotype = {
    version: 1,
    habit,
    scale: +(0.78 + (height * 0.3 + base.vigour * 0.24 + drift * 0.05)).toFixed(3),
    stalk: {
      height: +height.toFixed(3),
      thickness: +thickness.toFixed(3),
      curve: +jitter('curve', 0.3).toFixed(3),
      lean: +jitter('lean', 0.35).toFixed(3),
      nodes: Math.max(2, Math.round(3 + height * 5 + base.vigour * 2)),
    },
    branches: {
      count: branchCount,
      spread: +clamp(base.leafAngle * 0.5 + 0.5 + drift * 0.1, 0, 1).toFixed(3),
      startAt: +clamp(0.35 + (1 - height) * 0.35, 0.2, 0.8).toFixed(3),
    },
    leaves: {
      count: leafCount,
      shape: leafShape,
      size: +jitter('leafSize', 0.18).toFixed(3),
      angle: +jitter('leafAngle', 0.28).toFixed(3),
      droop: +clamp(0.3 + (1 - base.sway) * 0.4, 0, 1).toFixed(3),
      arrangement,
    },
    flowers: {
      count: flowerCount,
      form: flowerForm,
      size: +jitter('flowerSize', 0.16).toFixed(3),
      openness: +clamp(0.35 + base.flowers * 0.5, 0.2, 1).toFixed(3),
    },
    protection: {
      thorns: +jitter('thorns', 0.14).toFixed(3),
      length: +clamp(0.4 + base.relief * 0.5, 0.3, 1).toFixed(3),
      dress,
    },
    surface: {
      relief: PLANT_FORM_THRESHOLDS.reliefName[reliefIdx] ?? 'smooth',
      sheen: +clamp(0.25 + base.pigmentB * 0.5, 0, 1).toFixed(3),
    },
    pigment: {
      primary: shiftChannels(ramp[0], shift, Math.round(shift * 0.5), -Math.round(shift * 0.6)),
      accent: shiftChannels(ramp2[1], shift2, shift2, -Math.round(shift2 * 0.4)),
      pattern: PLANT_FORM_THRESHOLDS.patternName[patternIdx] ?? 'solid',
      strength: +clamp(0.25 + base.pattern * 0.6, 0, 1).toFixed(3),
      family,
    },
    asymmetry: +jitter('asymmetry', 0.4).toFixed(3),
    motion: {
      style: PLANT_FORM_THRESHOLDS.motionStyle[bucket(base.sway, [0.25, 0.5, 0.75]) % 4] ?? 'sway',
      sway: +jitter('sway', 0.22).toFixed(3),
      attack: +jitter('attack', 0.24).toFixed(3),
    },
    interaction: { rhythm: +rhythm.toFixed(4), guard: +guard.toFixed(4) },
    descriptor: PLANT_DESCRIPTOR_AXES.map(axis => +clamp(vector[axis] ?? 0, 0, 1).toFixed(4)),
  };
  return phenotype;
}

/**
 * DAS Distanzmaß der Pflanzen (eine Wahrheit): gewichtet nach Sichtbarkeit. Der Zuchtkern
 * bleibt domänenneutral, die Gewichte kommen aus der Source (config/phenotype.source.ts).
 */
export const plantMeasure = (a: readonly number[], b: readonly number[]): number =>
  weightedDistance(a, b, PLANT_DESCRIPTOR_WEIGHTS);

/** Kurzschlüssel des Phänotyps (stabile Sprite-/Discovery-Identität). */
export function plantPhenotypeKey(p: PlantPhenotype): string {
  return [
    p.habit, p.scale.toFixed(3), p.stalk.height.toFixed(3), p.stalk.thickness.toFixed(3),
    p.stalk.curve.toFixed(3), p.stalk.lean.toFixed(3), p.stalk.nodes,
    p.branches.count, p.branches.spread.toFixed(3), p.branches.startAt.toFixed(3),
    p.leaves.count, p.leaves.shape, p.leaves.size.toFixed(3), p.leaves.angle.toFixed(3),
    p.leaves.droop.toFixed(3), p.leaves.arrangement,
    p.flowers.count, p.flowers.form, p.flowers.size.toFixed(3), p.flowers.openness.toFixed(3),
    p.protection.thorns.toFixed(3), p.protection.length.toFixed(3), p.protection.dress,
    p.surface.relief, p.surface.sheen.toFixed(3),
    p.pigment.primary, p.pigment.accent, p.pigment.pattern, p.pigment.strength.toFixed(3),
    p.asymmetry.toFixed(3), p.motion.style, p.motion.sway.toFixed(3), p.motion.attack.toFixed(3),
  ].join('|');
}
