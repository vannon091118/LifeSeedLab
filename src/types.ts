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
  /** PLANTS_SOURCE-Verankerung für Basen (Platzierbarkeit im Run — eine Stats-Quelle). */
  sourceId?: 'sprout' | 'rootwall' | 'mycelia';
};

// ── Run economy (in-run currency) ────────────────────────────
export type RunEconomy = {
  energy: number;
  nektarEarned: number;
};

// ── Meta save (persistent across runs) ───────────────────────
// ── v3 (Gacha-Ökonomie): genau 2 Startpflanzen, Seed-Shop-Besitz, Reifungs-Queue.
// ── v4 (P6): Käferzucht — Brut-Lager, ein eingesetzter Käfer, Brut-Reifungs-Queue.
// ── v5 (A13.1): monotoner Brut-Zähler — Identität darf nie aus einem Fenster abgeleitet werden.
export type MetaSave = {
  version: 5;
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
  /** P5 Spieler-Maps: benannte Layouts ("gx,gy":tile) — spielbarer Inhalt zwischen Spielern. */
  mapLayouts: Record<string, Record<string, string>>;
  /** P6 Käferzucht: gezüchtete Specimen (Brut-Lager) + Reifungs-Queue. */
  beetles: BeetleSpecimen[];
  beetleDeployed: string | null;
  pendingBroods: PendingBrood[];
  /** Monotoner Brut-Generation-Zähler (A13.1) — einzige Quelle für `PendingBrood.broodIndex`.
   *  Nie aus `pendingBroods` ableiten: das Fenster schrumpft beim Claim und würde Indizes recyceln. */
  broodGeneration: number;
};

/** Eine Kreuzung wartet auf Reifung: verfügbar nach `wavesToUnlockFor(index)` Wellen. */
export type PendingCross = {
  crossIndex: number;
  seed: number;        // gacha seed — Kind ist bei Aussaat schon deterministisch fest
  neededWaves: number; // wavesToUnlockFor(crossIndex)
  startedWave: number; // totalWavesSurvived bei Aussaat
};

/** P6: Ein Brutvorgang wartet auf Reifung nach Kinderstärke (beetleWavesToUnlock). */
export type PendingBrood = {
  broodIndex: number;
  specimenAId: string;
  specimenBId: string;
  neededWaves: number;
  startedWave: number;
  chosenIndex: number; // welcher der 3 Brutkandidaten deterministisch „gewonnen" hat
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

// ── Käferzucht (P6): Brüten erweitert das Genom-Prinzip — eigene Identität ──
export type BeetleSpecimen = {
  id: string;
  name: string;
  /** BEETLES_SOURCE-Verankerung (Basis-Werte + Farbe — eine Stats-Quelle). */
  specimenId: string;
  genome: Genome;
  stats: {
    hp: number;
    speed: number;       // Zellen/Tick
    attack: number;      // Schaden pro Biss
    taunt: boolean;      // TAUNT (Y/N)
    spawnX: number;      // Spawn 1×–5× beim Einsatz
    deathSpawnX: number; // Beim Tod X halbwertige Brutlinge
    cost: number;        // Energie pro Einsatz im Run
  };
  color: string;
  discovered: boolean;
  generation?: number;
  parentA?: string;
  parentB?: string;
};

// ── Seed shop ────────────────────────────────────────────────
export type SeedOffer = {
  id: string;          // stabile Angebots-ID (deterministisch aus Meta-Seed)
  price: number;
  rarity: 'common' | 'rare' | 'exotic';
  label: string;       // i18n-agnostischer Hinweis (Rarity-Name im UI übersetzt)
};
