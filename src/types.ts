// Owner: Source (types). LOC ≤ 200.
// Meta- und Breeding-Typen. Entity-/Sim-Typen leben in simulation/state.ts (eine Wahrheit).

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

// ── Run economy (in-run currency) ────────────────────────────
export type RunEconomy = {
  energy: number;
  nektarEarned: number;
};

// ── Meta save (persistent across runs) ───────────────────────
// v3 (Gacha-Ökonomie): genau 2 Startpflanzen, Seed-Shop-Besitz, Reifungs-Queue.
export type MetaSave = {
  version: 3;
  nektar: number;
  bestWave: number;
  runs: number;
  /** Authoritative run identity counter — one authority (QUALITY_SPEC B1). */
  runId: number;
  /** Persisted breed generation counter — breeding determinism across reloads. */
  breedGeneration: number;
  variantCounts: Record<string, number>;
  savedVariants: PlantVariant[];
  /** Variants the player carried in via loadout (placeable bred plants — B1). */
  loadout: string[];
  language: 'de' | 'en';
  audioOn: boolean;
  pvpPayouts: number;
  /** Seeds gekauft im Shop, noch nicht ausgesät (gacha: PlantVariant bei Aussaat gewürfelt). */
  seedStash: number;
  /** Reifungs-Queue: Kreuzungen, die X überlebte Wellen brauchen, bevor sie keimen. */
  pendingCrosses: PendingCross[];
  /** Gesamtzahl bestandener Wellen (Reifungszähler). */
  totalWavesSurvived: number;
  /** EINE Quelle für Zucht-Stats: beim Claim abgeleitet, an jeden Run injiziert (B1). */
  bredStats: Record<string, { hp: number; damage: number; range: number; cooldown: number; cost: number; effects: string[] }>;
};

/** Eine Kreuzung wartet auf Reifung: verfügbar nach `wavesToUnlockFor(index)` Wellen. */
export type PendingCross = {
  crossIndex: number;
  seed: number;        // gacha seed — Kind ist bei Aussaat schon deterministisch fest
  neededWaves: number; // wavesToUnlockFor(crossIndex)
  startedWave: number; // totalWavesSurvived bei Aussaat
};

// ── Game modes ───────────────────────────────────────────────
export type GameMode = 'endless' | 'pvp';

export type RunStartConfig = {
  mode: GameMode;
  loadout: string[];
  runId: number;
  runSeed: number;
};

// ── Breeding ─────────────────────────────────────────────────
export type CrossResult = {
  child: PlantVariant;
  parentA: string;
  parentB: string;
  probability: number;
  isNew: boolean;
};

// ── Seed shop ────────────────────────────────────────────────
export type SeedOffer = {
  id: string;          // stabile Angebots-ID (deterministisch aus Meta-Seed)
  price: number;
  rarity: 'common' | 'rare' | 'exotic';
  label: string;       // i18n-agnostischer Hinweis (Rarity-Name im UI übersetzt)
};
