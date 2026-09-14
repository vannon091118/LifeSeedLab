import type { Gene, Genome, PlantType, PlantVariant, CrossResult } from './types';
import { GAME_SEED } from './config';

// ── Gene Pool ────────────────────────────────────────────────
export const GENE_POOL: Record<string, { dominant: boolean; weight: number }> = {
  fire:       { dominant: true,  weight: 0.3 },
  ice:        { dominant: false, weight: 0.25 },
  rapid:      { dominant: true,  weight: 0.35 },
  heavy:      { dominant: false, weight: 0.3 },
  heal:       { dominant: false, weight: 0.2 },
  shield:     { dominant: true,  weight: 0.25 },
  venom:      { dominant: true,  weight: 0.15 },
  splash:     { dominant: false, weight: 0.2 },
  pierce:     { dominant: true,  weight: 0.2 },
  regen:      { dominant: false, weight: 0.15 },
  lure:       { dominant: false, weight: 0.1 },
  thorns:     { dominant: true,  weight: 0.2 },
  swift:      { dominant: true,  weight: 0.3 },
  crit:       { dominant: false, weight: 0.15 },
  aura:       { dominant: false, weight: 0.1 },
};

// ── Deterministic RNG (mulberry32, state-carrying) ───────────
export function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Legacy helper kept for tests/imports
export function seededRandom(seed: number): () => number {
  return makeRng(seed);
}

// ── Base Plant Variants ──────────────────────────────────────
let _uid = 0;
function uid(): string { return `v_${++_uid}`; }
void uid;

// ── Base Plant Variants ──────────────────────────────────────
export function createBaseVariants(): PlantVariant[] {
  return [
    {
      id: 'base_shooter',
      name: 'Sprout',
      type: 'shooter',
      genome: [
        { id: 'rapid', power: 0.5, dominant: true },
        { id: 'pierce', power: 0.3, dominant: true },
      ],
      traits: ['rapid fire', 'pierce'],
      cost: 50,
      stats: { hp: 100, damage: 15, range: 3, cooldown: 30, special: null },
      color: '#4ade80',
      discovered: true,
    },
    {
      id: 'base_wall',
      name: 'Rootwall',
      type: 'wall',
      genome: [
        { id: 'shield', power: 0.7, dominant: true },
        { id: 'thorns', power: 0.4, dominant: true },
      ],
      traits: ['shield', 'thorns'],
      cost: 40,
      stats: { hp: 300, damage: 5, range: 0.5, cooldown: 60, special: 'reflect' },
      color: '#a3734a',
      discovered: true,
    },
    {
      id: 'base_support',
      name: 'Mycelia',
      type: 'support',
      genome: [
        { id: 'heal', power: 0.6, dominant: false },
        { id: 'aura', power: 0.3, dominant: false },
      ],
      traits: ['heal', 'aura'],
      cost: 60,
      stats: { hp: 80, damage: 0, range: 2, cooldown: 45, special: 'heal_aura' },
      color: '#c084fc',
      discovered: true,
    },
  ];
}

// ── Derive stats from genome ─────────────────────────────────
function genePower(genome: Gene[], geneId: string): number {
  const g = genome.find(g => g.id === geneId);
  return g ? g.power : 0;
}

function genePresent(genome: Gene[], geneId: string): boolean {
  return genome.some(g => g.id === geneId && g.power > 0.2);
}

export function deriveStats(type: PlantType, genome: Genome): PlantVariant['stats'] {
  const fp = genePower(genome, 'fire');
  const ip = genePower(genome, 'ice'); void ip;
  const rp = genePower(genome, 'rapid');
  const hvy = genePower(genome, 'heavy');
  const heal = genePower(genome, 'heal');
  const sp = genePower(genome, 'shield');
  const pp = genePower(genome, 'pierce');
  const regen = genePower(genome, 'regen');
  const crit = genePower(genome, 'crit');
  const swift = genePower(genome, 'swift');
  const splash = genePower(genome, 'splash');

  const baseDmg = type === 'wall' ? 5 : type === 'support' ? 0 : 15;
  const baseHp = type === 'wall' ? 300 : type === 'support' ? 80 : 100;
  const baseRange = type === 'wall' ? 0.5 : type === 'support' ? 2 : 3;
  const baseCd = type === 'wall' ? 60 : type === 'support' ? 45 : 30;

  let special: string | null = null;
  if (type === 'wall' && genePresent(genome, 'thorns')) special = 'reflect';
  if (type === 'support' && heal > 0.2) special = 'heal_aura';

  return {
    hp: Math.round(baseHp + hvy * 200 + sp * 100 + regen * 50),
    damage: Math.round(baseDmg + fp * 25 + rp * 10 + crit * 20),
    range: +(baseRange + pp * 0.5 + splash * 0.3).toFixed(1),
    cooldown: Math.max(5, Math.round(baseCd - rp * 15 - swift * 10 + hvy * 10)),
    special,
  };
}

export function deriveTraits(genome: Genome): string[] {
  return genome
    .filter(g => g.power > 0.2)
    .sort((a, b) => b.power - a.power)
    .map(g => {
      const labels: Record<string, string> = {
        fire: 'fire', ice: 'frost', rapid: 'rapid fire', heavy: 'heavy hit',
        heal: 'heal', shield: 'shield', venom: 'venom', splash: 'splash',
        pierce: 'pierce', regen: 'regen', lure: 'lure', thorns: 'thorns',
        swift: 'swift', crit: 'crit strike', aura: 'aura',
      };
      return labels[g.id] || g.id;
    });
}

function deriveColor(type: PlantType, genome: Genome): string {
  const r = (genePower(genome, 'fire') * 200 + 60) | 0;
  const g = (type === 'shooter' ? 180 : type === 'wall' ? 120 : 140) | 0;
  const b = (genePower(genome, 'ice') * 200 + 80) | 0;
  return `rgb(${r},${g},${b})`;
}

// ── Crossing / Breeding (fully deterministic) ────────────────
export function crossGenomes(a: Genome, b: Genome, rng: () => number): Genome {
  const maxLen = Math.max(a.length, b.length);
  const child: Genome = [];

  for (let i = 0; i < maxLen; i++) {
    const geneA = a[i % a.length];
    const geneB = b[i % b.length];

    // pick parent
    let parent = rng() < 0.5 ? geneA : geneB;
    // dominant gene has higher chance
    if (geneA.dominant !== geneB.dominant) {
      parent = (rng() < 0.6) ? (geneA.dominant ? geneA : geneB) : parent;
    }

    // mutation branch: new gene from pool
    if (rng() < 0.15) {
      const geneKeys = Object.keys(GENE_POOL);
      const total = geneKeys.reduce((s, k) => s + GENE_POOL[k].weight, 0);
      let roll = rng() * total;
      let picked = geneKeys[0];
      for (const k of geneKeys) {
        roll -= GENE_POOL[k].weight;
        if (roll <= 0) { picked = k; break; }
      }
      child.push({
        id: picked,
        power: 0.1 + rng() * 0.6,
        dominant: GENE_POOL[picked].dominant,
      });
      continue;
    }

    // power blend
    const blend = 0.5 + (rng() - 0.5) * 0.3;
    let power = geneA.power * blend + geneB.power * (1 - blend);
    power = Math.max(0, Math.min(1, power + (rng() - 0.5) * 0.1));

    child.push({
      id: parent.id,
      power,
      dominant: parent.dominant ? rng() > 0.2 : rng() < 0.3,
    });
  }

  // dedupe: keep highest power per gene id
  const seen = new Map<string, Gene>();
  for (const g of child) {
    const existing = seen.get(g.id);
    if (!existing || g.power > existing.power) {
      seen.set(g.id, g);
    }
  }
  return Array.from(seen.values());
}

// ── Breeding machine (seed derived from parents + generation) ─
let breedCounter = 0;

export function deriveBreedSeed(parentAId: string, parentBId: string, generation: number): number {
  const str = `${parentAId}|${parentBId}|${generation}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateCrossResults(
  parentA: PlantVariant,
  parentB: PlantVariant,
  generation: number,
  count: number = 3
): CrossResult[] {
  const seed = deriveBreedSeed(parentA.id, parentB.id, generation + breedCounter);
  const rng = makeRng(seed);
  const results: CrossResult[] = [];

  for (let i = 0; i < count; i++) {
    const childGenome = crossGenomes(parentA.genome, parentB.genome, rng);
    const t = rng();
    const childType: PlantType = t < 0.4 ? parentA.type : t < 0.7 ? parentB.type : 'shooter';

    const childName = generateName(childGenome, childType, rng);
    const childId = `cross_${seed.toString(36)}_${i}`;
    const stats = deriveStats(childType, childGenome);

    const child: PlantVariant = {
      id: childId,
      name: childName,
      type: childType,
      genome: childGenome,
      traits: deriveTraits(childGenome),
      cost: 30 + Math.round(childGenome.reduce((s, g) => s + g.power, 0) * 40),
      stats,
      color: deriveColor(childType, childGenome),
      discovered: false,
    };

    results.push({
      child,
      parentA: parentA.id,
      parentB: parentB.id,
      probability: +(0.5 + rng() * 0.5).toFixed(2),
      isNew: true,
    });
  }

  return results;
}

// Deterministic uniqueness salt for repeat crosses (FNV-1a of parent ids)
export function crossSalt(parentAId: string, parentBId: string): number {
  const str = `${parentAId}|${parentBId}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateName(genome: Genome, type: PlantType, rng: () => number): string {
  const prefixes: Record<PlantType, string[]> = {
    shooter: ['Bolt', 'Spit', 'Spray', 'Arc', 'Bloom'],
    wall: ['Bark', 'Shell', 'Bulwark', 'Stone', 'Rind'],
    support: ['Glow', 'Spore', 'Mist', 'Veil', 'Ling'],
  };
  const adjs = ['Ember', 'Frost', 'Thorn', 'Gleam', 'Void', 'Dusk', 'Rift', 'Aether', 'Cinder', 'Moss'];

  const p = prefixes[type][Math.floor(rng() * prefixes[type].length)];
  const a = adjs[Math.floor(rng() * adjs.length)];
  return `${a} ${p}`;
}
