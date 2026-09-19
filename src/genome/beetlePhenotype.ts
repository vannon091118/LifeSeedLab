// Owner: Source (beetle phenotype adapter). LOC ≤ 300.
// BIOLOGISCHE SPRACHE #2: Genom + Generation ⇒ organische Käferanatomie. Der Zwilling von
// genome/plantPhenotype.ts, mit eigener Anatomie und eigener Grammatik — dieselbe Zuchtmaschine
// (genome/breeding.ts), zwei Phänotyp-Sprachen.
//
// Es gibt KEINE Basis-Schablone: die Form kommt aus dem Genom, nicht aus der Sorte. Deshalb
// trägt der Phänotyp auch keinen `specimenId` — die Basis liefert nur die Balance-Basiswerte der
// Stats (config/beetles.source.ts), nie das Aussehen. Genau das war der Befund des Alten:
// „ein gezüchteter Käfer = Basis-Sorte + Farbpunkt".

import type { Genome } from '../types';
import { makeRng } from '../core/rng';
import { fnv1a } from '../core/hash';
import { shiftChannels } from '../core/color';
import {
  BEETLE_AXES_BY_GENE, BEETLE_AXIS_RANGE, BEETLE_BASELINE, BEETLE_DESCRIPTOR_AXES,
  BEETLE_DESCRIPTOR_WEIGHTS, BEETLE_FORM_THRESHOLDS, BEETLE_PIGMENT_RAMP, BEETLE_PIGMENT_SHIFT,
  beetleInteractionOf, type BeetleAxis, type BeetleBearing, type BeetleMotion, type CarapaceForm,
  type CarapaceStructure, type ChitinDress,
} from '../config/beetlePhenotype.source';
import { driftFor, expressed, genomeKey, weightedDistance } from './breeding';

export type BeetlePattern = (typeof BEETLE_FORM_THRESHOLDS.patternName)[number];

export interface BeetlePhenotype {
  version: 1;
  /** Gesamtgröße 0.8–1.25 (Genstärke + Drift) — Aussage, kein Deko-Faktor. */
  scale: number;
  body: { length: number; width: number; segments: number };
  head: { size: number; thoraxRatio: number; mandibleLength: number; mandibleWidth: number };
  antennae: { count: number; length: number };
  legs: { count: number; length: number; stance: number };
  elytra: { spread: number; split: boolean };
  carapace: { form: CarapaceForm; structure: CarapaceStructure; sheen: number };
  pigment: { primary: string; accent: string; pattern: BeetlePattern; strength: number; family: number };
  asymmetry: number;
  motion: { style: BeetleMotion; attack: number; swarm: number; brood: number };
  /** Interaktions-Achsen: aus der BEZIEHUNG zweier Achsen — dürfen die Eltern überschreiten. */
  interaction: { chitin: number; bearing: number };
  /** Benannte Ausprägungen (was der Spieler am Tier benennen kann). */
  dress: ChitinDress;
  bearing: BeetleBearing;
  /** Gewichteter Vergleichsvektor für Neuheit/Elternähnlichkeit. */
  descriptor: number[];
}

type Axes = Record<BeetleAxis, number>;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function axesFor(genome: Genome): Axes {
  const axes = { ...BEETLE_BASELINE } as Axes;
  for (const g of expressed(genome)) {
    const delta = BEETLE_AXES_BY_GENE[g.id];
    if (!delta) continue;
    const weight = g.power * (g.dominant ? 1.25 : 0.85);
    for (const [axis, amount] of Object.entries(delta) as [BeetleAxis, number][]) {
      axes[axis] = (axes[axis] ?? 0) + amount * weight;
    }
  }
  for (const axis of Object.keys(BEETLE_AXIS_RANGE) as BeetleAxis[]) {
    const [lo, hi] = BEETLE_AXIS_RANGE[axis];
    axes[axis] = clamp(axes[axis] ?? 0, lo, hi);
  }
  return axes;
}

/** Streu-Seed aus dem GENOM (nicht aus der ID) — identisches Erbgut ⇒ identisches Tier. */
function spreadSeed(genomeKeyValue: string, generation: number): number {
  return fnv1a(0x811c9dc5, `${genomeKeyValue}#beetle#${generation}`) >>> 0;
}

function bucket(value: number, thresholds: readonly number[]): number {
  let i = 0;
  for (const t of thresholds) if (value >= t) i++;
  return i;
}

/** Genom + Generation ⇒ Käfer-Phänotyp (reine Funktion, deterministisch). */
export function beetlePhenotypeOf(input: { genome: Genome; generation: number }): BeetlePhenotype {
  const base = axesFor(input.genome);
  const drift = driftFor(input.generation);
  const rng = makeRng('brood', spreadSeed(genomeKey(input.genome), input.generation));
  const jitter = (axis: BeetleAxis, amount: number): number => {
    const [lo, hi] = BEETLE_AXIS_RANGE[axis];
    return clamp((base[axis] ?? 0) + (rng.next() - 0.5) * amount * (0.35 + drift), lo, hi);
  };

  const length = jitter('bodyLength', 0.18);
  const width = jitter('bodyWidth', 0.18);
  const segmentation = jitter('segmentation', 0.16);
  const surface = jitter('carapaceSurface', 0.14);
  const mandibles = jitter('mandibles', 0.2);
  const shape = jitter('carapaceShape', 0.18);

  const chitin = beetleInteractionOf('chitin', base);
  const bearingAxis = beetleInteractionOf('bearing', base);
  const dress = BEETLE_FORM_THRESHOLDS.chitinName[bucket(chitin, [0.38, 0.6, 0.78]) % 4] ?? 'plated';
  const bearing = BEETLE_FORM_THRESHOLDS.bearingName[bucket(bearingAxis, [0.38, 0.6, 0.8]) % 4] ?? 'nimble';

  const patternIdx = bucket(base.pattern, [0.22, 0.45, 0.72]);
  const family = bucket(base.pigmentA, [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) % BEETLE_PIGMENT_RAMP.length;
  const family2 = (family + 1 + bucket(base.pigmentB, [0.25, 0.5, 0.75])) % BEETLE_PIGMENT_RAMP.length;
  const ramp = BEETLE_PIGMENT_RAMP[family]!;
  const ramp2 = BEETLE_PIGMENT_RAMP[family2]!;
  const shift = Math.round((base.pigmentA - 0.5) * BEETLE_PIGMENT_SHIFT.perPigmentA);
  const shift2 = Math.round((base.pigmentB - 0.5) * BEETLE_PIGMENT_SHIFT.perPigmentB);

  const scaled: Record<string, number> = {
    ...base,
    bodyLength: length, bodyWidth: width, segmentation, carapaceSurface: surface,
    carapaceShape: shape, chitin, bearing: bearingAxis,
  };

  return {
    version: 1,
    scale: +(0.82 + (length * 0.22 + width * 0.12 + drift * 0.04)).toFixed(3),
    body: {
      length: +length.toFixed(3),
      width: +width.toFixed(3),
      segments: Math.max(3, Math.round(4 + segmentation * 5)),
    },
    head: {
      size: +jitter('headSize', 0.12).toFixed(3),
      thoraxRatio: +jitter('thoraxRatio', 0.14).toFixed(3),
      mandibleLength: +mandibles.toFixed(3),
      mandibleWidth: +jitter('mandibleWidth', 0.14).toFixed(3),
    },
    antennae: {
      count: base.antennae > 0.66 ? 4 : 2,
      length: +jitter('antennaLength', 0.18).toFixed(3),
    },
    legs: {
      count: 6,
      length: +jitter('legLength', 0.18).toFixed(3),
      stance: +clamp(0.3 + base.legs * 0.5, 0.2, 1).toFixed(3),
    },
    elytra: {
      spread: +jitter('elytraSpread', 0.16).toFixed(3),
      split: base.elytraSpread > 0.55,
    },
    carapace: {
      form: BEETLE_FORM_THRESHOLDS.carapaceForm[bucket(shape, [0.32, 0.55, 0.78]) % 4] ?? 'dome',
      structure: BEETLE_FORM_THRESHOLDS.carapaceSurface[bucket(surface, [0.35, 0.6, 0.82]) % 4] ?? 'smooth',
      sheen: +jitter('sheen', 0.16).toFixed(3),
    },
    pigment: {
      primary: shiftChannels(ramp[0], shift, Math.round(shift * 0.6), -Math.round(shift * 0.5)),
      accent: shiftChannels(ramp2[1], shift2, shift2, -Math.round(shift2 * 0.35)),
      pattern: BEETLE_FORM_THRESHOLDS.patternName[patternIdx] ?? 'solid',
      strength: +clamp(0.25 + base.pattern * 0.6, 0, 1).toFixed(3),
      family,
    },
    asymmetry: +jitter('asymmetry', 0.36).toFixed(3),
    motion: {
      style: BEETLE_FORM_THRESHOLDS.motionStyle[bucket(base.legs * 0.6 + base.legLength * 0.4, [0.3, 0.5, 0.72]) % 4] ?? 'march',
      attack: +jitter('attack', 0.2).toFixed(3),
      swarm: +jitter('swarm', 0.18).toFixed(3),
      brood: +jitter('brood', 0.18).toFixed(3),
    },
    interaction: { chitin: +chitin.toFixed(4), bearing: +bearingAxis.toFixed(4) },
    dress,
    bearing,
    descriptor: BEETLE_DESCRIPTOR_AXES.map(axis => +clamp(scaled[axis] ?? 0, 0, 1).toFixed(4)),
  };
}

/** DAS Distanzmaß der Käfer (Gewichte aus der Source, Arithmetik aus dem Kern). */
export const beetleMeasure = (a: readonly number[], b: readonly number[]): number =>
  weightedDistance(a, b, BEETLE_DESCRIPTOR_WEIGHTS);

/** Kurzschlüssel des Phänotyps (Sprite-/Discovery-Identität des TIERS, nicht der Buchhaltung). */
export function beetlePhenotypeKey(p: BeetlePhenotype): string {
  return [
    p.scale.toFixed(3), p.body.length.toFixed(3), p.body.width.toFixed(3), p.body.segments,
    p.head.size.toFixed(3), p.head.thoraxRatio.toFixed(3),
    p.head.mandibleLength.toFixed(3), p.head.mandibleWidth.toFixed(3),
    p.antennae.count, p.antennae.length.toFixed(3),
    p.legs.count, p.legs.length.toFixed(3), p.legs.stance.toFixed(3),
    p.elytra.spread.toFixed(3), p.elytra.split,
    p.carapace.form, p.carapace.structure, p.carapace.sheen.toFixed(3),
    p.pigment.primary, p.pigment.accent, p.pigment.pattern, p.pigment.strength.toFixed(3),
    p.asymmetry.toFixed(3), p.motion.style, p.dress, p.bearing,
  ].join('|');
}
