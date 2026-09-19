// Owner: VisualGeneratorSystem (Käfer-Zweig). LOC ≤ 200.
// SOURCE + visualSeed = ResolvedBeetleVisual. Reine Auflösung: die Anatomie kommt als
// BeetlePhenotype herein (genome/beetlePhenotype.ts), gezeichnet wird sie von render/beetles.ts.
//
// Der alte Käfer-„Visual" war ein Farbstring (`BEETLES_SOURCE[id].color` + Basis-Sorte). Damit
// war jedes gezüchtete Tier visuell identisch mit seinem Gründer. Die Identität eines Tieres
// entsteht jetzt aus seinem vollständigen Phänotyp — wie bei der Pflanze.

import type { BeetleSpecimen } from '../types';
import { deriveSeed, strHash } from '../core/rng';
import { beetlePhenotypeOf, beetlePhenotypeKey, type BeetlePhenotype } from '../genome/beetlePhenotype';
import { shiftChannels } from '../core/color';

export interface ResolvedBeetleVisual {
  version: 1;
  visualSeed: number;
  phenotype: BeetlePhenotype;
  scale: number;
  outline: string;
  palette: { base: string; accent: string; dark: string };
  /** Stabile Identität für Sprite-Cache/Discovery — aus der ANATOMIE, nicht aus der ID. */
  variantKey: string;
}

/** Inhalts-Hash eines Käfer-Genoms (Identitäts-Anker für den Visual-Seed). */
function beetleGenomeHash(spec: BeetleSpecimen): number {
  return spec.genome.reduce((h, g) => h ^ strHash(`${g.id}:${g.power.toFixed(3)}:${g.dominant ? 'd' : 'r'}`), 0) >>> 0;
}

/** Käfer-Phänotyp + Seed ⇒ Visual (EINE Ableitung für Brutstätte, Lager und Run). */
export function resolveBeetleVisual(spec: BeetleSpecimen, rootSeed: number): ResolvedBeetleVisual {
  const phenotype = beetlePhenotypeOf({ genome: spec.genome, generation: spec.generation ?? 1 });
  const visualSeed = deriveSeed(rootSeed, 'visual', `beetle:${spec.id}`, beetleGenomeHash(spec), 1);
  const base = phenotype.pigment.primary;
  return {
    version: 1,
    visualSeed,
    phenotype,
    scale: 1,
    outline: shiftChannels(base, -70, -66, -58),
    palette: {
      base,
      accent: phenotype.pigment.accent,
      dark: shiftChannels(base, -70, -66, -58),
    },
    variantKey: `beetle|${beetlePhenotypeKey(phenotype)}`,
  };
}

/** Alle Specimen eines Lagers auflösen (z. B. für die Run-Anzeige des eingesetzten Käfers). */
export function resolveBeetleVisuals(specimens: readonly BeetleSpecimen[], rootSeed: number): Map<string, ResolvedBeetleVisual> {
  const map = new Map<string, ResolvedBeetleVisual>();
  for (const spec of specimens) map.set(spec.id, resolveBeetleVisual(spec, rootSeed));
  return map;
}
