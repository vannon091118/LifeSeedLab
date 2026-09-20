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
import { darken, lighten, shiftChannels } from '../core/color';
import {
  BEETLE_AXES_BY_GENE, BEETLE_AXIS_RANGE, BEETLE_BASELINE, BEETLE_BODY_PLAN, BEETLE_DESCRIPTOR_AXES,
  BEETLE_DESCRIPTOR_WEIGHTS, BEETLE_FORM_THRESHOLDS, BEETLE_PIGMENT_RAMP, BEETLE_PIGMENT_SCATTER,
  BEETLE_PIGMENT_SHIFT,
  beetleInteractionOf, type BeetleAxis, type BeetleBearing, type BeetleMotion, type BeetlePlan,
  type CarapaceForm, type CarapaceStructure, type ChitinDress,
} from '../config/beetlePhenotype.source';
import { BEETLES_SOURCE } from '../config/beetles.source';
import { driftFor, expressed, genomeKey, weightedDistance } from './breeding';
import { bucket, clamp } from './phenotypeShared';

type BeetlePattern = (typeof BEETLE_FORM_THRESHOLDS.patternName)[number];

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
  /**
   * Organe (Pool-Erweiterung): Flügel, Pelz, Stachel, Halschild, Sprungbeine. Diese fünf Achsen
   * waren vorher nicht existent — ein Tier konnte weder fliegen noch pelzig sein noch stechen.
   */
  organs: { wings: number; pelage: number; stinger: number; pronotum: number; jumpLegs: number };
  /** Benannte Ausprägungen (was der Spieler am Tier benennen kann). */
  plan: BeetlePlan;
  dress: ChitinDress;
  bearing: BeetleBearing;
  /** Gewichteter Vergleichsvektor für Neuheit/Elternähnlichkeit. */
  descriptor: number[];
}

type Axes = Record<BeetleAxis, number>;

/**
 * FARBE: Pigment-Achse + Genomschlüssel-Streuung ⇒ Eintrag der gehegten Palette.
 *
 * Die Streuung liegt auf der ACHSE, nicht als Filter über dem Ergebnis — dadurch bleibt jede Farbe
 * ein Rampen-Eintrag (`BEETLE_PIGMENT_RAMP`) und nie eine matschige Mischfarbe. Anlass und
 * Messreihe stehen in Devlog 21 (`docs/process/devlog/`, „Käfer-Sichtbarkeit"); hier steht nur die
 * Regel, damit dieselbe Zahl nicht an zwei Orten lebt.
 *
 * ZWEI HERKÜNFTE, EIN MASS: ein Tier aus der Zucht streut (seine Farbe soll sich von Geschwistern
 * unterscheiden), ein GRÜNDER trägt dagegen die für ihn dokumentierte Farbe der Source (`anchor`,
 * gesetzt vom Aufrufer, der das Specimen kennt). Vorher trugen alle drei Gründer dieselbe Farbe
 * (`#7a492d`) — der Anker war damit faktisch tot.
 *
 * Der Deskriptor gewichtet Pigment mit 0 (`BEETLE_DESCRIPTOR_WEIGHTS`): Farbe ist Anzeige-Wahrheit,
 * nie Balance — keine dieser Regeln kann das Neuheits-Maß verschieben.
 */
function pigmentFor(axes: Axes, rng: { next: () => number }, anchor?: string): BeetlePhenotype['pigment'] {
  const patternIdx = bucket(axes.pattern, [0.22, 0.45, 0.72]);
  const pattern = BEETLE_FORM_THRESHOLDS.patternName[patternIdx] ?? 'solid';
  const strength = +clamp(0.25 + axes.pattern * 0.6, 0, 1).toFixed(3);

  // ANKER: die dokumentierte Farbe des Specimens gewinnt die Hauptfarbe; Muster, Familie und
  // Musterfarbe bleiben aus dem Genom (ohne Streuung — ein Gründer ist kein Zuchtprodukt).
  if (anchor) {
    const familySteps = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
    const family = bucket(axes.pigmentA, familySteps) % BEETLE_PIGMENT_RAMP.length;
    const family2 = (family + 1 + bucket(axes.pigmentB, [0.25, 0.5, 0.75])) % BEETLE_PIGMENT_RAMP.length;
    const shiftB = Math.round((axes.pigmentB - 0.5) * BEETLE_PIGMENT_SHIFT.perPigmentB);
    return {
      primary: anchor,
      accent: shiftChannels(BEETLE_PIGMENT_RAMP[family2]![1], shiftB, shiftB, -Math.round(shiftB * 0.35)),
      pattern, strength, family,
    };
  }

  const spreadA = clamp(axes.pigmentA + (rng.next() - 0.5) * 2 * BEETLE_PIGMENT_SCATTER.axis, 0, 1);
  const spreadB = clamp(axes.pigmentB + (rng.next() - 0.5) * 2 * BEETLE_PIGMENT_SCATTER.axis * 0.6, 0, 1);
  // WEG UM DIE PALETTE: die Achse bestimmt nicht mehr einen von acht Eimern, sondern die Position
  // auf einem Kranz, den sie `walk`-mal umrundet — Geschwister liegen dadurch Stadien auseinander,
  // während die Farbe weiter ein Eintrag der Palette bleibt.
  const len = BEETLE_PIGMENT_RAMP.length;
  const family = ((Math.round(spreadA * len * BEETLE_PIGMENT_SCATTER.walk) % len) + len) % len;
  const family2 = (family + 1 + bucket(spreadB, [0.25, 0.5, 0.75])) % BEETLE_PIGMENT_RAMP.length;
  const ramp = BEETLE_PIGMENT_RAMP[family]!;
  const ramp2 = BEETLE_PIGMENT_RAMP[family2]!;
  const shift = Math.round((spreadA - 0.5) * BEETLE_PIGMENT_SHIFT.perPigmentA);
  const shift2 = Math.round((spreadB - 0.5) * BEETLE_PIGMENT_SHIFT.perPigmentB);
  // Zweiter Hebel (siehe BEETLE_PIGMENT_SCATTER): Farbton-Dreh + Helligkeit aus demselben
  // Genomschlüssel-Strom — er trennt die Fälle, in denen zwei Geschwister dieselbe Familie treffen.
  // Die Helligkeit dreht mit dem Vorzeichen, der Dreh hebt eine Achse und senkt die andere.
  const turn = Math.round((rng.next() - 0.5) * 2 * BEETLE_PIGMENT_SCATTER.hue);
  const shade = (rng.next() - 0.5) * 2 * BEETLE_PIGMENT_SCATTER.lightness;
  const farbe = (hex: string, turnAmount: number): string => {
    // WARMER Dreh: Rot und Grün steigen gemeinsam, Blau sinkt leicht — der Farbton wandert
    // zwischen Bernstein/Zimt/Gold statt in kühle Grautöne.
    const gedreht = shiftChannels(hex, turnAmount, Math.round(turnAmount * 0.55), -Math.round(turnAmount * 0.15));
    return shade >= 0 ? lighten(gedreht, shade) : darken(gedreht, -shade);
  };
  return {
    primary: farbe(shiftChannels(ramp[0], shift, Math.round(shift * 0.6), -Math.round(shift * 0.5)), turn),
    accent: farbe(shiftChannels(ramp2[1], shift2, shift2, -Math.round(shift2 * 0.35)), Math.round(turn * 0.6)),
    pattern, strength, family,
  };
}

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

/** Genom + Generation ⇒ Käfer-Phänotyp (reine Funktion, deterministisch).
 *
 *  `jitterNamespace` trennt die STREUUNG nach Herkunft: die Zucht bleibt in ihrer Domäne `brood`,
 *  Gegner-Ableitungen laufen im `visual`-Namespace (sie sind Präsentation, nicht Zuchtwirtschaft).
 *  Beide Ströme sind reine Funktionen ihres Seeds — keiner „advanced" den anderen.
 *
 *  `specimenId` ist FREIWILLIG und nur für Tiere der Source gedacht (Gründer): Generation 1 plus
 *  bekannter Name ⇒ die dokumentierte Farbe des Specimens ist die Hauptfarbe, nichts streut. Ohne
 *  Angabe bleibt alles wie gehabt — auch ein gezüchtetes Tier, das die `specimenId` eines Elternteils
 *  erbt, streut weiter, weil seine Generation ≥ 2 ist. */
export function beetlePhenotypeOf(input: { genome: Genome; generation: number; jitterNamespace?: 'brood' | 'visual'; specimenId?: string }): BeetlePhenotype {
  const base = axesFor(input.genome);
  const drift = driftFor(input.generation);
  const rng = makeRng(input.jitterNamespace ?? 'brood', spreadSeed(genomeKey(input.genome), input.generation));
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
  const wings = jitter('wings', 0.16);
  const pelage = jitter('pelage', 0.18);
  const stinger = jitter('stinger', 0.16);
  const pronotum = jitter('pronotum', 0.16);
  const jumpLegs = jitter('jumpLegs', 0.18);

  const chitin = beetleInteractionOf('chitin', base);
  const bearingAxis = beetleInteractionOf('bearing', base);
  const dress = BEETLE_FORM_THRESHOLDS.chitinName[bucket(chitin, [0.38, 0.6, 0.78]) % 4] ?? 'plated';
  const bearing = BEETLE_FORM_THRESHOLDS.bearingName[bucket(bearingAxis, [0.38, 0.6, 0.8]) % 4] ?? 'nimble';

  const scaled: Record<string, number> = {
    ...base,
    bodyLength: length, bodyWidth: width, segmentation, carapaceSurface: surface,
    carapaceShape: shape, chitin, bearing: bearingAxis,
    wings, pelage, stinger, pronotum, jumpLegs,
  };
  // Der Körperplan ist die LESBARE Konsequenz der Organe (Source = Wahrheit, hier nur Auswertung).
  const plan = BEETLE_BODY_PLAN.find(rule => rule.test(scaled as Record<BeetleAxis, number>))?.plan ?? 'beetle';

  // Ohne Pigment gebaut: die Farbe wird ZULETZT abgeleitet (pigmentFor), damit ihre zwei Züge aus
  // dem Genomschlüssel-RNG erst NACH allen Form-Achsen stattfinden — die Formwerte und damit
  // Deskriptor und Neuheits-Maß bleiben dadurch bitgleich zu vorher.
  const animal: Omit<BeetlePhenotype, 'pigment'> = {
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
    asymmetry: +jitter('asymmetry', 0.36).toFixed(3),
    motion: {
      // Sprungbeine zählen jetzt mit: ein Tier mit langen Hinterbeinen HÜPFT statt zu marschieren.
      style: BEETLE_FORM_THRESHOLDS.motionStyle[
        bucket(base.legs * 0.3 + base.legLength * 0.3 + jumpLegs * 0.4, [0.3, 0.45, 0.68]) % 4
      ] ?? 'march',
      attack: +jitter('attack', 0.2).toFixed(3),
      swarm: +jitter('swarm', 0.18).toFixed(3),
      brood: +jitter('brood', 0.18).toFixed(3),
    },
    interaction: { chitin: +chitin.toFixed(4), bearing: +bearingAxis.toFixed(4) },
    organs: {
      wings: +wings.toFixed(3), pelage: +pelage.toFixed(3), stinger: +stinger.toFixed(3),
      pronotum: +pronotum.toFixed(3), jumpLegs: +jumpLegs.toFixed(3),
    },
    plan,
    dress,
    bearing,
    descriptor: BEETLE_DESCRIPTOR_AXES.map(axis => +clamp(scaled[axis] ?? 0, 0, 1).toFixed(4)),
  };

  // Anker nur für die dokumentierten Tiere: Generation 1 UND ein Name, zu dem die Source eine Farbe
  // führt. Ein gezüchtetes Tier erbt die `specimenId` eines Elternteils, nie aber dessen Generation.
  const documented = input.generation === 1 && input.specimenId
    ? BEETLES_SOURCE[input.specimenId]?.color
    : undefined;

  return { ...animal, pigment: pigmentFor(base, rng, documented) };
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
    p.asymmetry.toFixed(3), p.motion.style, p.dress, p.bearing, p.plan,
    p.organs.wings.toFixed(3), p.organs.pelage.toFixed(3), p.organs.stinger.toFixed(3),
    p.organs.pronotum.toFixed(3), p.organs.jumpLegs.toFixed(3),
  ].join('|');
}
