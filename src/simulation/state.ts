// Owner: SimulationRoot (worker). LOC ≤ 200.
// Canonical gameplay state shape. Systems write ONLY their own slice.

import type { ClockState } from '../core/clock';
import type { EnemyTypeId } from '../config/enemies.source';
import type { BredStatsEntry } from '../types';

export type PlantGrowthState = 'growing' | 'mature';
/** LIFESPAN removed: einmal platziert bleibt bis GameOver (user: pflanze verschwindet nicht in der runde). */

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
  typeId: EnemyTypeId;
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
  /**
   * Effekte auf diesem Schuss (bis `EFFECT_SLOTS`) — Effekt 0 trifft MIT Schaden, die
   * weiteren setzen nur ihren Status. Vorher gab es nur EIN Feld: der zweite Effekt eines
   * Genoms (`genomeEffectIds` liefert zwei) war toter Content.
   */
  effectIds: string[];
  /** Krit-Chance/-Vielfaches aus dem Ballistik-Profil — eine Wahrheit, kein Trefferzufall. */
  critChance: number;
  critMult: number;
}

/**
 * R1 (Eigentümer-Entscheid): `layout` = die Build-Sequenz VOR dem ersten Wellen-Block —
 * der Spieler baut sein Maze (Wege, Töpfe, Findlinge), ohne dass die Zeit drängt.
 * Exit: BEGIN_WAVE_PREP (sanft, „Fertig") oder START_WAVE (bewusstes Überspringen —
 * wer die Welle startet, hat gebaut, wie er wollte). Kein Auto-Start im Layout.
 */
export type RunPhase = 'layout' | 'prep' | 'wave' | 'gameover';

/** Spieler-platzierte Map-Tiles (P5). Owner: MapSystem. Key "gx,gy". */
export type MapTiles = Record<string, string>;

/** Aktueller berechneter Feind-Laufweg (Zellzentren). Owner: SimulationRoot (Coordination). */
export type Route = ReadonlyArray<{ x: number; y: number }> | null;

/**
 * B37: Run-Inventar aus dem ECHTEN Besitz ableiten — nie mehr, als man besitzt.
 * Basis-Startbestand (STARTING_INVENTORY) zählt nur, wenn er wirklich besessen wird;
 * ein Loadout-Eintrag ohne Besitz gibt 0 (no_inventory beim Platzieren).
 */
export function ownedInventory(
  starting: Record<string, number>,
  ownedCounts: Record<string, number>,
  loadout: readonly string[],
): Record<string, number> {
  const inventory: Record<string, number> = {};
  for (const id of Object.keys(starting)) {
    const owned = ownedCounts[id] ?? 0;
    if (owned > 0) inventory[id] = owned;
  }
  for (const id of loadout) {
    const owned = ownedCounts[id] ?? 0;
    if (owned > 0 && !(id in inventory)) inventory[id] = owned;
  }
  return inventory;
}

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
    /** B32: Spieler-Entscheid pro Run — starten Wellen nach der Vorbereitungszeit von selbst?
     *  Default aus der Source (economy.source), Owner: WaveSystem (über Root-Command). */
    autoWaves: boolean;
  };
  /** #4/ENTSCHEIDUNG 19.09.2026: In-Run gibt es KEINEN Kontostand — weder Energie noch Münzen
   *  noch Erfahrung. Platziert wird aus dem POOL (`inventory`: gekaufte Pflanzen + Material);
   *  gewertet wird über `score`/`combo`/`nektarEarned`, ausgegeben ausschließlich AUSSERHALB des
   *  Runs (Nektar). Der frühere `resources.experience`-Topf hatte keinen Leser und ist gestrichen
   *  statt ausgestattet — zwei Belohnungswährungen nebeneinander wären eine zweite Wahrheit. */
  /** R2: Run-Kopie der freigeschalteten Weltfläche (Welt-Snapshot beim Run-Start). */
  cols: number;
  rows: number;
  /** R2: Run-Kopie der Welt-Tiles — die Wahrheit der Welt lebt im WorldSave (eine Quelle).
   *  Der Run mutiert seine Kopie; die Welt spiegelt akzeptierte Bau-Events (worldAutor). */
  mapTiles: MapTiles;
  /**
   * R2: Der FEIND-Laufweg — ERGEBNIS des Pathfindings aus der Tile-Geometrie (nie seine
   * Eingabe). Owner: SimulationRoot (recomputeRoute, ein Writer); Sim, Rendering und Terrain
   * lesen dieselbe Wahrheit. Neuberechnung: Run-Start, jeder Bau, jeder Wellenbeginn.
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
  bredStats?: Record<string, BredStatsEntry>;
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
