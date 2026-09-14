import type { Gene, Genome, BeetleSpecimen } from '../types';
import { GAME_SEED } from '../config';
import { deriveSeed, makeRng, type Rng } from '../core/rng';
import { crossGenomes } from './cross';
import {
  BEETLES_SOURCE, BEETLE_GENES_SOURCE, BEETLE_GENE_POOL, BEETLE_BREED, BROOD_SEED_NAMESPACE,
} from '../config/beetles.source';
import { hashGenome } from '../discovery/chain';
import type { BeetleDeploySpec } from '../simulation/enemySystem';

// Owner: Source (beetle breeding engine — extends the plant genome machinery, P6).
// LOC ≤ 300. Determinism: identical inputs → identical brood (core/rng only).
// „Brüten" ≠ Pflanzenzucht: ELTERNWAHL (bewusstes Zuchtpaar) statt Samen-Gacha,
// ganzer Genome-Merge statt Mutation-Überraschung — mechanisch + sichtbar anders.

/** Käfer-Genom-Stärke (Gene * Dominanz) — Balance-Hebel für Reifung + Ökonomie. */
export function beetlePower(genome: Genome): number {
  return genome.reduce((s, g) => s + g.power * (g.dominant ? 1.3 : 1), 0);
}

/** Die Brut-Stats eines Specimen: Basen-Werte × Gen-Multiplikatoren (Source-driven). */
export function deriveBeetleStats(specimenId: string, genome: Genome): BeetleSpecimen['stats'] {
  const src = BEETLES_SOURCE[specimenId];
  let hpMult = 1, speed = src.speed, attack = src.attack, cost = 0;
  let taunt = false, spawnX = 1, deathSpawnX = 0;

  for (const g of genome) {
    const gs = BEETLE_GENES_SOURCE[g.id];
    if (!gs || g.power <= 0.2) continue;
    hpMult += gs.hpMult * g.power;
    speed += gs.speedAdd * g.power;
    attack += gs.attackAdd * g.power;
    cost += gs.costMult * g.power;
    if (gs.taunt) taunt = true;
    if (gs.spawnX) spawnX += Math.round(gs.spawnX * g.power);
    if (gs.deathSpawnX) deathSpawnX += Math.round(gs.deathSpawnX * g.power);
  }

  return {
    hp: Math.round(src.hp * hpMult),
    speed: +Math.max(0.008, speed).toFixed(4),
    attack: Math.max(1, Math.round(attack)),
    taunt,
    spawnX: Math.min(BEETLE_BREED.deploySlots * 5, spawnX), // Spawn 1×–5× (P6-Spec)
    deathSpawnX: Math.min(3, deathSpawnX),                   // Beim Tod X halbe Brutlinge
    cost: Math.round(10 + cost * 40),
  };
}

/** Deterministischer Brut-Seed ('enemy'-Namespace — Gegner-Domain, getrennt von 'plant'). */
export function deriveBroodSeed(specimenAId: string, specimenBId: string, generation: number): number {
  return deriveSeed(GAME_SEED, BROOD_SEED_NAMESPACE, specimenAId, `${specimenBId}:${generation}`, 1);
}

/** Brutfortschritt: Ganze Genome mergen (beide Elterngene wandern ins Kind). */
function mergeGenomes(a: Genome, b: Genome, rng: Rng): Genome {
  const child: Gene[] = [];
  for (const g of a) child.push({ ...g });
  for (const g of b) {
    const existing = child.find(c => c.id === g.id);
    if (existing) {
      // Dominanter Elternteil gewinnt die Stärke; leichte Schwankung (deterministisch)
      const blend = 0.5 + (rng.next() - 0.5) * 0.2;
      existing.power = Math.min(1, Math.max(existing.power, g.power) * blend + Math.min(existing.power, g.power) * (1 - blend));
      existing.dominant = existing.dominant || g.dominant;
    } else {
      child.push({ ...g, power: Math.max(0.15, g.power * (0.8 + rng.next() * 0.2)) });
    }
  }
  return child;
}

/** Drei Brutkandidaten (BEETLE_BREED.broodSize) — deterministisch pro Seed. */
export function rollBrood(
  specimenAId: string,
  specimenBId: string,
  generation: number
): BeetleSpecimen[] {
  const a = BEETLES_SOURCE[specimenAId];
  const b = BEETLES_SOURCE[specimenBId];
  if (!a || !b) return [];

  const seed = deriveBroodSeed(specimenAId, specimenBId, generation);
  const rng = makeRng('enemy', seed);
  const brood: BeetleSpecimen[] = [];

  for (let i = 0; i < BEETLE_BREED.broodSize; i++) {
    const genome = mergeGenomes(a.genes.map(id => geneFromSource(id)), b.genes.map(id => geneFromSource(id)), rng);
    // Specimen-Nachfahre: Mischform der Eltern (bestimmt Basis-Werte + Farbe)
    const specimenId = rng.next() < 0.5 ? specimenAId : specimenBId;
    const stats = deriveBeetleStats(specimenId, genome);
    brood.push({
      id: `brood_${seed.toString(36)}_${i}`,
      name: `${a.name.slice(0, 4)}${b.name.slice(0, 4)}-Brut ${i + 1}`,
      specimenId,
      genome,
      stats,
      color: specimenId === specimenAId ? a.color : b.color,
      generation,
      parentA: specimenAId,
      parentB: specimenBId,
      discovered: false,
    });
  }
  return brood;
}

function geneFromSource(id: string): Gene {
  const gs = BEETLE_GENES_SOURCE[id];
  const dominant = !!gs && (BEETLE_GENE_POOL[id]?.dominant ?? false);
  return { id, power: 0.6, dominant }; // Basis-Power; Schwankung kommt aus dem Merge
}

/** Chain-Verankerung: Brutling → stabiler Genome-Hash (Öffentliche Kette, P6-Spec). */
export function broodGenomeHash(brood: BeetleSpecimen): string {
  return hashGenome(brood.genome.map(g => ({ id: `b:${g.id}`, power: g.power, dominant: g.dominant })));
}

/** Effekt-Tags für die Run-Stats-Injektion (bredStats-Parallele für Käfer). */
export function beetleEffectTags(genome: Genome): string[] {
  const tags: string[] = [];
  for (const g of genome) {
    const gs = BEETLE_GENES_SOURCE[g.id];
    if (!gs || g.power <= 0.2) continue;
    if (gs.taunt) tags.push('BEETLE_TAUNT');
    if (gs.spawnX) tags.push(`BEETLE_SPAWN_${Math.min(5, Math.round(gs.spawnX * g.power) + 1)}`);
    if (gs.deathSpawnX) tags.push(`BEETLE_DEATHSPAWN_${Math.min(3, Math.round(gs.deathSpawnX * g.power))}`);
  }
  return tags;
}

/** Specimen → Deploy-Spec (Root ruft das beim DEPLOY_BEETLE-Command — reines Mapping). */
export function toDeploySpec(spec: BeetleSpecimen): BeetleDeploySpec {
  return {
    id: spec.id, specimenId: spec.specimenId, name: spec.name,
    hp: spec.stats.hp, attack: spec.stats.attack, speed: spec.stats.speed,
    taunt: spec.stats.taunt, deathSpawnX: spec.stats.deathSpawnX,
    color: spec.color, spawnX: spec.stats.spawnX, cost: spec.stats.cost,
  };
}
