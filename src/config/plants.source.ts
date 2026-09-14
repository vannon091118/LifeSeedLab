// Owner: Source (content truth). LOC ≤ 200.
// Plant archetypes. Stats are gameplay truth; visual identity arrives in Phase 6
// via visualSeed + ResolvedVisual (kept separate by contract).

export type PlantTypeId = 'sprout' | 'rootwall' | 'mycelia';

export interface PlantSource {
  id: PlantTypeId;
  role: 'shooter' | 'wall' | 'support';
  cost: number;
  stats: {
    hp: number;
    damage: number;
    range: number;      // cells
    cooldown: number;   // ticks between attacks
  };
  effects: string[];    // EFFECT ids from effects.source (Phase 5.3) — v1: gameplay tags
  genome: { id: string; power: number; dominant: boolean }[];
}

export const PLANTS_SOURCE: Record<PlantTypeId, PlantSource> = {
  sprout: {
    id: 'sprout',
    role: 'shooter',
    cost: 50,
    stats: { hp: 100, damage: 15, range: 3, cooldown: 30 },
    effects: ['EFFECT_PIERCE'],
    genome: [
      { id: 'rapid', power: 0.5, dominant: true },
      { id: 'pierce', power: 0.3, dominant: true },
    ],
  },
  rootwall: {
    id: 'rootwall',
    role: 'wall',
    cost: 40,
    stats: { hp: 300, damage: 5, range: 0.5, cooldown: 60 },
    effects: ['EFFECT_REFLECT'],
    genome: [
      { id: 'shield', power: 0.7, dominant: true },
      { id: 'thorns', power: 0.4, dominant: true },
    ],
  },
  mycelia: {
    id: 'mycelia',
    role: 'support',
    cost: 60,
    stats: { hp: 80, damage: 0, range: 2, cooldown: 45 },
    effects: ['EFFECT_HEAL'],
    genome: [
      { id: 'heal', power: 0.6, dominant: false },
      { id: 'aura', power: 0.3, dominant: false },
    ],
  },
};

export const PLANT_IDS = Object.keys(PLANTS_SOURCE) as PlantTypeId[];

/** Starting inventory for a fresh run (source-driven). *
 * Gacha-Regel: der Run-Inventar spiegelt den Meta-Besitz (loadout) — Basen sind
 * Fallback für alte Saves. Der Spieler startet mit GENAU dem, was er besitzt. */
export const STARTING_INVENTORY: Record<PlantTypeId, number> = {
  sprout: 1,
  rootwall: 1,
  mycelia: 0,
};

/** Breeding machine parameters (source-driven economy). */
export const BREED_SOURCE = {
  energyCost: 40,
  mutationChance: 0.15,
  parentDominantBias: 0.6,
  blendSpread: 0.3,
  powerJitter: 0.1,
};
