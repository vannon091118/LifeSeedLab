// Owner: SimulationRoot (worker). LOC ≤ 200.
// Canonical gameplay state shape. Systems write ONLY their own slice.

import type { ClockState } from '../core/clock';

export type PlantGrowthState = 'growing' | 'mature';

export interface PlantEntity {
  id: string;
  variantId: string;        // plants.source id or bred genome id
  gx: number;
  gy: number;
  hp: number;
  maxHp: number;
  lastShot: number;         // tick of last attack
  // Lifecycle (Source-driven via economy.source)
  growthState: PlantGrowthState;
  growthTicksLeft: number;
  growthTicksTotal: number;
  lifeTicksLeft: number;
  lifeTicksTotal: number;
  fertilizeCount: number;
  extraDamage: number;
  extraCooldown: number;
  isWeakened: boolean;
  isSeedling: boolean;
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
  /** Status effects (deterministic expiry ticks). Owned by EnemySystem. */
  slowUntil: number;
  burnTicks: number;
  poisonTicks: number;
  /** Last combat damage source (for kill attribution / chain — B6). */
  lastHitByPlantId: string | null;
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
  /** Effect riding the projectile — drives combat + observer FX (B6). */
  effectId: string | null;
}

export type RunPhase = 'prep' | 'wave' | 'gameover';

/** Spieler-platzierte Map-Tiles (P5). Owner: MapSystem. Key "gx,gy". */
export type MapTiles = Record<string, string>;

/** Aktueller berechneter Feind-Laufweg (Zellzentren). Owner: SimulationRoot (Coordination). */
export type Route = ReadonlyArray<{ x: number; y: number }> | null;

export interface SimState {
  seed: number;
  /** Authoritative run identity (mirrors MetaSave.runId at run start — B1). */
  runId: number;
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
    /** prep-phase auto-wave timer (null while in wave). */
    prepStartTick: number | null;
  };
  resources: { energy: number; coins: number };
  /** Map-Slice (P5): vom Spieler platzierte Tiles. Owner: MapSystem. */
  mapTiles: MapTiles;
  /**
   * B16.1: Der FEIND-Laufweg dieser Welle — Sim (EnemySystem liest hier), Rendering und
   * Terrain lesen dieselbe Wahrheit. Owner: SimulationRoot (recomputeRoute, ein Writer);
   * `null` = bewusster Wert für „keine Spieler-Route“ (Auflösung via resolveActiveRoute).
   */
  currentRoute: Route;
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
  counters: { enemy: number; plant: number; projectile: number };
  /** Variants the player carried in via loadout (placeable bred plants — B1). */
  loadout: string[];
  /** Stats of bred (non-source) variants, keyed by variant id (incl. effect tags — B6). */
  bredStats?: Record<string, { hp: number; damage: number; range: number; cooldown: number; cost: number; effects: string[] }>;
  /** P6 Käferzucht: eingesetzter Brutling (allierter Kämpfer). Owner: EnemySystem. */
  deployedBeetle: {
    id: string;
    specimenId: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    speed: number;
    taunt: boolean;
    deathSpawnX: number;
    color: string;
    px: number;
    py: number;
    targetId: string | null;
    biteCooldown: number;
    freezeTicksLeft: number;
    /** Mit-Brutlinge (Spawn 1×–5×, halbe Werte) — EIGENER Slice, NICHT state.enemies
     *  (sonst beschießen die Pflanzen die eigenen Verbündeten, P7-Befund im Test). */
    broodlings: { id: string; px: number; py: number; hp: number; maxHp: number }[];
  } | null;
  /** P6: mitgebrachte gezüchtete Specimen (Injektion wie bredStats). */
  beetles: import('../types').BeetleSpecimen[];
}
