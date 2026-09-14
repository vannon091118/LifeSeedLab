// ── Genome & Traits ──────────────────────────────────────────
export type Gene = {
  id: string;
  power: number;
  dominant: boolean;
};

export type Genome = Gene[];

export type PlantType = 'shooter' | 'wall' | 'support';

export type PlantVariant = {
  id: string;
  name: string;
  type: PlantType;
  genome: Genome;
  traits: string[];
  cost: number;
  stats: {
    hp: number;
    damage: number;
    range: number;
    cooldown: number;
    special: string | null;
  };
  color: string;
  discovered: boolean;
  generation?: number;
  parentA?: string;
  parentB?: string;
};

// ── Entities ─────────────────────────────────────────────────
export type Position = { x: number; y: number };

export type Tower = {
  id: string;
  variant: PlantVariant;
  pos: Position;
  hp: number;
  lastShot: number;
  gridX: number;
  gridY: number;
};

export type EnemyType = 'grunt' | 'fast' | 'tank' | 'swarm' | 'boss';

export type Enemy = {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  pathIndex: number;
  pathProgress: number;
  pos: Position;
  reward: number;
  color: string;
};

export type Projectile = {
  id: string;
  pos: Position;
  dx: number;
  dy: number;
  speed: number;
  damage: number;
  targetId: string;
  color: string;
  pierce: number;
};

// ── Wave ─────────────────────────────────────────────────────
export type WaveConfig = {
  waveNumber: number;
  enemies: { type: EnemyType; count: number; delay: number }[];
  reward: number;
};

// ── Run economy (in-run currency) ────────────────────────────
export type RunEconomy = {
  energy: number;       // in-run currency for placing/breeding
  nektarEarned: number; // nektar accumulated this run
};

// ── Game State ───────────────────────────────────────────────
export type GameState = {
  tick: number;
  money: number;
  lives: number;
  wave: number;
  phase: 'prep' | 'wave' | 'gameover';
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  discoveredVariants: string[];
  inventory: Record<string, number>;
  waveConfigs: WaveConfig[];
  spawnQueue: { type: EnemyType; delay: number }[];
  lastSpawnTick: number;
  path: Position[];
  nektarEarned: number;
  runSeed: number;       // run seed derived from GAME_SEED + runCounter
  breedCounter: number;  // increments per breed action, feeds breed seeds
};

// ── Meta save (persistent across runs) ───────────────────────
export type MetaSave = {
  version: 1;
  nektar: number;                 // persistent roguelike currency
  bestWave: number;               // best wave reached (endless)
  runs: number;                   // total runs played
  variantCounts: Record<string, number>;  // owned specimens across runs
  savedVariants: PlantVariant[];  // bred genome library
  language: 'de' | 'en';
  pvpPayouts: number;             // total nektar earned from pvp boards
};

// ── Game modes ───────────────────────────────────────────────
export type GameMode = 'endless' | 'pvp';

export type RunStartConfig = {
  mode: GameMode;
  loadout: string[];              // variant ids the player brings into the run
  runSeed: number;                // deterministic per run
};

// ── Messages to/from Worker ──────────────────────────────────
export type WorkerInMessage =
  | { type: 'init'; state: Partial<GameState> }
  | { type: 'tick' }
  | { type: 'place_tower'; variant: PlantVariant; gridX: number; gridY: number }
  | { type: 'remove_tower'; towerId: string }
  | { type: 'start_wave' }
  | { type: 'set_state'; state: Partial<GameState> }
  | { type: 'add_variant'; variant: PlantVariant; count: number }
  | { type: 'breed'; parentA: PlantVariant; parentB: PlantVariant; child: PlantVariant; energyCost: number }
  | { type: 'reset_run'; config: RunStartConfig };

export type WorkerOutMessage =
  | { type: 'state'; state: GameState }
  | { type: 'tick_done'; tick: number; fps: number }
  | { type: 'wave_complete'; wave: number }
  | { type: 'game_over'; nektarEarned: number; waveReached: number };

// ── Breeding ─────────────────────────────────────────────────
export type CrossResult = {
  child: PlantVariant;
  parentA: string;
  parentB: string;
  probability: number;
  isNew: boolean;
};
