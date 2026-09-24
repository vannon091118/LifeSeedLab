import type { PlantVariant, Genome } from '../types';
import { PLANTS_SOURCE } from '../config/plants.source';
import { deriveTraits } from './cross';

// Owner: Source (base variants). LOC ≤ 200.
// Basen werden aus PLANTS_SOURCE abgeleitet — EINE Stats-Quelle. Jeder Basis-Slot bekommt
// zwei homozygote Allele; alte kurze Test-Fixtures dürfen die Top-Level-Genform weiterlesen.

export function createBaseVariants(): PlantVariant[] {
  return Object.values(PLANTS_SOURCE).map(src => {
    const special = src.role === 'wall' && src.effects.includes('EFFECT_REFLECT') ? 'reflect'
      : src.role === 'support' && src.effects.includes('EFFECT_HEAL') ? 'heal_aura'
      : null;
    return {
      id: src.id,
      name: src.label,
      type: src.role,
      genome: src.genome.map(gene => ({
        ...gene,
        alleles: [{ ...gene }, { ...gene }],
      })),
      traits: deriveTraits(src.genome as Genome),
      cost: src.cost,
      stats: { ...src.stats, special },
      color: src.role === 'shooter' ? '#4ade80' : src.role === 'wall' ? '#a3734a' : '#c084fc',
      discovered: true,
      sourceId: src.id,
    };
  });
}
