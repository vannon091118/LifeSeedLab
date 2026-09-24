import type { PlantType, PlantVariant, Genome, CrossResult } from '../types';
import { EPOCH_ROOT } from '../config';
import { deriveSeed, makeRng, type Rng } from '../core/rng';
import { crossGenomes, deriveStats, deriveTraits, deriveColor, generateName } from './cross';
import { genomePower } from './breeding';

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
  return genomePower(v.genome);
}

export function rollGachaCross(owned: PlantVariant[], seed: number, crossIndex: number): GachaRoll | null {
  if (owned.length < 2) return null;
  const rng = makeRng('plant', seed);

  // B15.4/A13.13: die Besitzliste wird KANONISCH SORTIERT (nach id), bevor sie gewichtet
  // wird — der Wurf hängt dann nur von Seed und Besitz-**Menge** ab, nicht von der
  // Einfüge-Reihenfolge des Save-Objekts. Ohne das ist das Kind aus `PendingCross.seed`
  // allein nicht reproduzierbar: Die Liste ändert sich, sobald Eltern verbraucht werden.
  const canon = [...owned].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const indexed = canon.map((v) => ({ v, w: 1 / (1 + variantPower(v)) }));
  const pick = (exclude: PlantVariant | null): PlantVariant => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const p = rng.pickWeighted(indexed, e => e.w).v;
      if (!exclude || p.id !== exclude.id) return p;
    }
    return canon.find(v => !exclude || v.id !== exclude.id) ?? canon[0];
  };
  const parentA = pick(null);
  const parentB = pick(parentA);

  const childGenome = deriveChildGenome(parentA, parentB, crossIndex, EPOCH_ROOT, rng);
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

export function deriveGachaSeed(generation: number, rootSeed: number = EPOCH_ROOT): number {
  return deriveSeed(rootSeed, 'plant', 'gacha', 'roll', generation);
}

/**
 * B38: Kreuzung aus GEWÄHLTEN Eltern — der Spieler bestimmt das Paar, nicht der Würfel.
 * Deterministisch: dieselben Eltern + dieselbe Generation ⇒ dasselbe Kind (Seed aus
 * beiden Eltern-IDs abgeleitet). Das Kind ist bei der Aussaat fest — die Reifung ist
 * nur der Timer, kein zweiter Wurf.
 */
export function deriveChildGenome(
  parentA: Pick<PlantVariant, 'id' | 'genome'>,
  parentB: Pick<PlantVariant, 'id' | 'genome'>,
  generation: number,
  rootSeed: number = EPOCH_ROOT,
  rng?: Rng,
): Genome {
  const stream = rng ?? makeRng('plant', deriveBreedSeed(parentA.id, parentB.id, generation, rootSeed));
  return crossGenomes(parentA.genome, parentB.genome, stream);
}

export function crossPair(parentA: PlantVariant, parentB: PlantVariant, generation: number, rootSeed: number = EPOCH_ROOT): GachaRoll {
  const seed = deriveSeed(rootSeed, 'plant', parentA.id, `${parentB.id}`, generation);
  const rng = makeRng('plant', seed);

  const childGenome = deriveChildGenome(parentA, parentB, generation, rootSeed, rng);
  const t = rng.next();
  const childType: PlantType = t < 0.4 ? parentA.type : t < 0.7 ? parentB.type : 'shooter';

  const child: PlantVariant = {
    id: `cross_${seed.toString(36)}_${generation}`,
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
  return { parentA, parentB, child, probability: 1, crossIndex: generation };
}

export function deriveBreedSeed(parentAId: string, parentBId: string, generation: number, rootSeed: number = EPOCH_ROOT): number {
  return deriveSeed(rootSeed, 'plant', parentAId, `${parentBId}`, generation);
}

