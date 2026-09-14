// Owner: SimulationRoot (worker). LOC ≤ 200.
// Canonical gameplay state shape. Systems write ONLY their own slice.

import type { ClockState } from '../core/clock';

export interface PlantEntity {
  id: string;
  variantId: string;        // plants.source id or bred genome id
  gx: number;
  gy: number;
  hp: number;
  lastShot: number;         // tick of last attack
}

export interface EnemyEntity {
  id: string;
  typeId: 'grunt' | 'fast' | 'tank' | 'swarm' | 'boss';
  hp: number;
  maxHp: number;
  px: number;
  py: number;
  pathIndex: number;
  pathProgress: number;
  damage: number;   // lives lost when leaking past the path end
  reward: number;
  scoreValue: number;
}

export interface ProjectileEntity {
  id: string;
  px: number;
  py: number;
  dx: number;
  dy: number;
  speed: number;
  damage: number;
  remainingPierce: number;
  plantId: string;
}

export type RunPhase = 'prep' | 'wave' | 'gameover';

export interface SimState {
  seed: number;
  clock: ClockState;
  phase: RunPhase;
  wave: {
    number: number;
    schedule: {
      waveNumber: number;
      groups: { typeId: string; count: number; delay: number }[];
      reward: number;
    } | null;
    spawnQueue: { typeId: string; delay: number }[];
    lastSpawnTick: number;
  };
  resources: { energy: number };
  /** Player lives. Owned by SimulationRoot (run state); reduced only via leak events. */
  lives: number;
  inventory: Record<string, number>;
  discoveredVariants: string[];
  plants: PlantEntity[];
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  score: number;
  combo: { count: number; timer: number; multiplier: number; highest: number };
  nektarEarned: number;
  runCounter: number;
  counters: { enemy: number; plant: number; projectile: number };
  /** Stats of bred (non-source) variants, keyed by variant id. */
  bredStats?: Record<string, { hp: number; damage: number; range: number; cooldown: number; cost: number }>;
}
