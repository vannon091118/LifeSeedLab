// Owner: Genome (Genom→Visual-Brücke). LOC ≤ 200.
// Übersetzt GENOM → Phänotyp → VisualInput. Hier entsteht die sichtbare Identität eines
// Lebewesens — es gibt keinen zweiten Weg (kein BASE/EXTRA-Baukasten mehr: die Anatomie kommt
// aus genome/plantPhenotype.ts, gezeichnet von render/plants.ts).
//
// Reine Ableitung: kein RNG-Verbrauch außer dem deterministisch ABGELEITETEN Visual-Seed,
// keine Content-Werte (die liegen in config/*.source.ts — Regel 6).

import type { PlantVariant, Genome, PlantType } from '../types';
import { deriveSeed, strHash } from '../core/rng';
import { PLANTS_SOURCE, type PlantTypeId } from '../config/plants.source';
import { plantPhenotypeOf, plantPhenotypeKey, type PlantPhenotype } from './plantPhenotype';
import { genomeEffectIds } from './effects';
import type { EffectId } from '../config/effects.source';
import type { VisualInput } from '../visual/generator';

export { genomeEffectIds };

/** Inhalts-Hash eines Genoms (Identitäts-Anker für den Visual-Seed — nie die ID allein). */
function genomeHash(genome: Genome): number {
  return genome.reduce((h, g) => h ^ strHash(`${g.id}:${g.power.toFixed(3)}:${g.dominant ? 'd' : 'r'}`), 0) >>> 0;
}

/** Genom + Rolle + Generation → Phänotyp → VisualInput (EINE Ableitung für alle Pflanzen). */
export function plantVisualInputFor(
  subject: { genome: Genome; role: PlantType; generation: number; id: string },
  rootSeed: number,
): VisualInput {
  const phenotype = plantPhenotypeOf(subject);
  const visualSeed = deriveSeed(rootSeed, 'visual', subject.id, genomeHash(subject.genome), 1);
  return {
    phenotype,
    effectIds: genomeEffectIds(subject.genome),
    visualSeed,
    strength: subject.genome.length > 0
      ? subject.genome.reduce((s, g) => s + g.power, 0) / subject.genome.length
      : 0.4,
  };
}

export function genomeToVisualInput(variant: PlantVariant, rootSeed: number): VisualInput {
  return plantVisualInputFor({
    genome: variant.genome,
    role: variant.type,
    generation: variant.generation ?? 1,
    id: variant.id,
  }, rootSeed);
}

/**
 * Grundpflanzen (Spross/Wurzelmauer/Myzel) laufen durch DIESELBE Ableitung wie gezüchtete
 * Pflanzen: ihr Genom steht in `PLANTS_SOURCE`. Damit gibt es keinen Sonderpfad mehr, der
 * eine Grundpflanze über feste Silhouetten-IDs zeichnet (der alte BASE_ROOT/BASE_MUSHROOM-
 * Zweig in Renderer und Runtime ist damit gestorben).
 */
export function basePlantVisualInput(variantId: string, rootSeed: number): VisualInput | null {
  const src = PLANTS_SOURCE[variantId as PlantTypeId];
  if (!src) return null;
  return plantVisualInputFor(
    { genome: src.genome as Genome, role: src.role, generation: 1, id: variantId },
    rootSeed,
  );
}

/** Stabile Phänotyp-Identität (Discovery/Sprite-Cache): derselbe Phänotyp ⇒ derselbe Schlüssel. */
export function phenotypeKeyOf(phenotype: PlantPhenotype): string {
  return plantPhenotypeKey(phenotype);
}
