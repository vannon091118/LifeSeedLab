import type { PlantType, PlantVariant, CrossResult } from '../types';
import { GAME_SEED } from '../config';
import { deriveSeed, makeRng } from '../core/rng';
import { crossGenomes, deriveStats, deriveTraits, deriveColor, generateName } from './cross';

// Owner: Source (gacha machine). LOC ≤ 200.
// ALLE Zufälligkeit via core/rng ('plant'-Namespace). Kein Math.random.

export interface GachaRoll {
  parentA: PlantVariant;
  parentB: PlantVariant;
  child: PlantVariant;
  probability: number;
  crossIndex: number;
}

export function variantPower(v: PlantVariant): number {
  return v.genome.reduce((s, g) => s + g.power * (g.dominant ? 1.3 : 1), 0);
}

export function rollGachaCross(owned: PlantVariant[], seed: number, crossIndex: number): GachaRoll | null {
  if (owned.length < 2) return null;
  const rng = makeRng('plant', seed);

  const indexed = owned.map((v, i) => ({ v, i, w: 1 / (1 + variantPower(v)) }));
  const pick = (exclude: PlantVariant | null): PlantVariant => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const p = rng.pickWeighted(indexed, e => e.w).v;
      if (!exclude || p.id !== exclude.id) return p;
    }
    return owned.find(v => !exclude || v.id !== exclude.id) ?? owned[0];
  };
  const parentA = pick(null);
  const parentB = pick(parentA);

  const childGenome = crossGenomes(parentA.genome, parentB.genome, rng);
  const t = rng.next();
  const childType: PlantType = t < 0.4 ? parentA.type : t < 0.7 ? parentB.type : 'shooter';

  const child: PlantVariant = {
    id: `cross_${seed.toString(36)}_${crossIndex}`,
    name: generateName(childGenome, rng),
    type: childType,
    genome: childGenome,
    traits: deriveTraits(childGenome),
    cost: 30 + Math.round(childGenome.reduce((s, g) => s + g.power, 0) * 40),
    stats: deriveStats(childType, childGenome),
    color: deriveColor(childType, childGenome),
    discovered: false,
    generation: crossIndex,
    parentA: parentA.id,
    parentB: parentB.id,
  };

  return { parentA, parentB, child, probability: 1, crossIndex };
}

export function deriveGachaSeed(generation: number): number {
  return deriveSeed(GAME_SEED, 'plant', 'gacha', 'roll', generation);
}

export function deriveBreedSeed(parentAId: string, parentBId: string, generation: number): number {
  return deriveSeed(GAME_SEED, 'plant', parentAId, `${parentBId}`, generation);
}

export function generateCrossResults(
  parentA: PlantVariant,
  parentB: PlantVariant,
  generation: number,
  count: number = 3
): CrossResult[] {
  const seed = deriveBreedSeed(parentA.id, parentB.id, generation);
  const rng = makeRng('plant', seed);
  const results: CrossResult[] = [];

  for (let i = 0; i < count; i++) {
    const childGenome = crossGenomes(parentA.genome, parentB.genome, rng);
    const t = rng.next();
    const childType: PlantType = t < 0.4 ? parentA.type : t < 0.7 ? parentB.type : 'shooter';

    const child: PlantVariant = {
      id: `cross_${seed.toString(36)}_${i}`,
      name: generateName(childGenome, rng),
      type: childType,
      genome: childGenome,
      traits: deriveTraits(childGenome),
      cost: 30 + Math.round(childGenome.reduce((s, g) => s + g.power, 0) * 40),
      stats: deriveStats(childType, childGenome),
      color: deriveColor(childType, childGenome),
      discovered: false,
      generation,
      parentA: parentA.id,
      parentB: parentB.id,
    };

    results.push({
      child,
      parentA: parentA.id,
      parentB: parentB.id,
      probability: +(0.5 + rng.next() * 0.5).toFixed(2),
      isNew: true,
    });
  }
  return results;
}
