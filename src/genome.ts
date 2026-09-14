import type { Gene, Genome, PlantType, PlantVariant, CrossResult } from './types';
import { GAME_SEED } from './config';
import { deriveSeed, makeRng, type Rng } from './core/rng';
import { NAME_CORE_BY_GENE, NAME_PREFIXES, NAME_SUFFIXES, NAME_FALLBACK_CORE } from './config/names.source';
import { STARTER_PLANT_COUNT } from './config/economy.source';

// Owner: Source (breeding machine). LOC ≤ 200.
// Deterministische Kreuzungsmaschine + Gacha-Wurf. ALLE Zufälligkeit via core/rng
// ('plant'-Namespace). Kein Math.random; der Spieler wählt KEINE Eltern (Gacha).

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

// ── Base Plant Variants (eine Quelle) ────────────────────────
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

void STARTER_PLANT_COUNT; // Quelle für meta.ts (Starter = erste N Basen)

// ── Derive stats from genome ─────────────────────────────────
function genePower(genome: Gene[], geneId: string): number {
  const g = genome.find(x => x.id === geneId);
  return g ? g.power : 0;
}

function genePresent(genome: Gene[], geneId: string): boolean {
  return genome.some(x => x.id === geneId && x.power > 0.2);
}

export function deriveStats(type: PlantType, genome: Genome): PlantVariant['stats'] {
  const fp = genePower(genome, 'fire');
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
  const labels: Record<string, string> = {
    fire: 'fire', ice: 'frost', rapid: 'rapid fire', heavy: 'heavy hit',
    heal: 'heal', shield: 'shield', venom: 'venom', splash: 'splash',
    pierce: 'pierce', regen: 'regen', lure: 'lure', thorns: 'thorns',
    swift: 'swift', crit: 'crit strike', aura: 'aura',
  };
  return genome
    .filter(g => g.power > 0.2)
    .sort((a, b) => b.power - a.power)
    .map(g => labels[g.id] || g.id);
}

function deriveColor(type: PlantType, genome: Genome): string {
  const r = (genePower(genome, 'fire') * 200 + 60) | 0;
  const g = (type === 'shooter' ? 180 : type === 'wall' ? 120 : 140) | 0;
  const b = (genePower(genome, 'ice') * 200 + 80) | 0;
  return `rgb(${r},${g},${b})`;
}

// ── Namensgenerator (effektbezogen, Präfix/Suffix — Anforderung) ──
export function generateName(genome: Genome, rng: Rng): string {
  // Kern = stärkstes Gen → beschreibt den Effekt des Kindes
  const strongest = [...genome].sort((a, b) => b.power - a.power)[0];
  const core = (strongest && NAME_CORE_BY_GENE[strongest.id]) || NAME_FALLBACK_CORE;
  const prefix = NAME_PREFIXES[rng.nextInt(0, NAME_PREFIXES.length - 1)];
  const suffix = NAME_SUFFIXES[rng.nextInt(0, NAME_SUFFIXES.length - 1)];
  return `${prefix}${core}${suffix}`;
}

// ── Crossing / Breeding (fully deterministic) ────────────────
export function crossGenomes(a: Genome, b: Genome, rng: Rng): Genome {
  const maxLen = Math.max(a.length, b.length);
  const child: Genome = [];

  for (let i = 0; i < maxLen; i++) {
    const geneA = a[i % a.length];
    const geneB = b[i % b.length];

    let parent = rng.next() < 0.5 ? geneA : geneB;
    if (geneA.dominant !== geneB.dominant) {
      parent = (rng.next() < 0.6) ? (geneA.dominant ? geneA : geneB) : parent;
    }

    // mutation branch: weighted gene from pool
    if (rng.next() < 0.15) {
      const keys = Object.keys(GENE_POOL);
      const picked = rng.pickWeighted(keys, k => GENE_POOL[k].weight);
      child.push({
        id: picked,
        power: 0.1 + rng.next() * 0.6,
        dominant: GENE_POOL[picked].dominant,
      });
      continue;
    }

    const blend = 0.5 + (rng.next() - 0.5) * 0.3;
    let power = geneA.power * blend + geneB.power * (1 - blend);
    power = Math.max(0, Math.min(1, power + (rng.next() - 0.5) * 0.1));

    child.push({
      id: parent.id,
      power,
      dominant: parent.dominant ? rng.next() > 0.2 : rng.next() < 0.3,
    });
  }

  // dedupe: keep highest power per gene id
  const seen = new Map<string, Gene>();
  for (const g of child) {
    const existing = seen.get(g.id);
    if (!existing || g.power > existing.power) seen.set(g.id, g);
  }
  return Array.from(seen.values());
}

// ── Gacha: Elternwahl ist NICHT im Spielerhand — der Wurf entscheidet ──

export interface GachaRoll {
  parentA: PlantVariant;
  parentB: PlantVariant;
  child: PlantVariant;
  probability: number;
  crossIndex: number;
}

/** Stärkeindex einer Variante (für Gacha-Gewichtung + Reifungsstärke). */
export function variantPower(v: PlantVariant): number {
  return v.genome.reduce((s, g) => s + g.power * (g.dominant ? 1.3 : 1), 0);
}

/**
 * Deterministischer Gacha-Wurf: wählt aus `owned` ein Elternpaar (gewichtet nach
 * Seltenheit der Stärke), rollt genau EIN Kind. Gleicher seed ⇒ gleiche Ausgabe.
 * crossIndex zählt die Gacha-Kreuzungen (bestimmt die Reifungsdauer).
 */
export function rollGachaCross(owned: PlantVariant[], seed: number, crossIndex: number): GachaRoll | null {
  if (owned.length < 2) return null;
  const rng = makeRng('plant', seed);

  // gewichtete Auswahl (Stärke = Seltenheit): stärkere Eltern seltener als Paar
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

/** Gacha-Seed für die i-te Kreuzung (deterministisch aus Master-Seed + Generation). */
export function deriveGachaSeed(generation: number): number {
  return deriveSeed(GAME_SEED, 'plant', 'gacha', 'roll', generation);
}

// ── Legacy-API (Kompatibilität bestehender Aufrufer) ─────────
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
