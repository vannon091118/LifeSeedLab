import type { MetaSave, PlantVariant, PendingCross } from './types';
import { load, save, remove } from './persistence/storage';
import { STARTER_PLANT_COUNT, wavesToUnlockFor } from './config/economy.source';
import { createBaseVariants } from './genome';

// Owner: PersistenceSystem (meta schema adapter). LOC ≤ 200.
// Meta lebt NUR über storage.ts (B2): Version 3 + Migrationskette + Checksumme + Quarantäne.
// v3 (Gacha-Ökonomie): GENAU 2 Startpflanzen, Seed-Shop-Stash, Reifungs-Queue.

const META_KEY = 'lifegamelab_meta';
const META_VERSION = 3;

/** Die ersten N Basen sind die Startpflanzen ( Quelle: genome.createBaseVariants Reihenfolge). */
export function starterVariants(): PlantVariant[] {
  return createBaseVariants().slice(0, STARTER_PLANT_COUNT);
}

export function defaultMeta(): MetaSave {
  const starters = starterVariants();
  const counts: Record<string, number> = {};
  for (const v of starters) counts[v.id] = 1; // GENAU eine jede → 2 Pflanzen gesamt
  return {
    version: 3,
    nektar: 60,
    bestWave: 0,
    runs: 0,
    runId: 0,
    breedGeneration: 0,
    variantCounts: counts,
    savedVariants: [],
    loadout: [],
    language: 'en',
    audioOn: true,
    pvpPayouts: 0,
    seedStash: 0,
    pendingCrosses: [],
    totalWavesSurvived: 0,
  };
}

/** Normalisiert ein beliebiges Roheing-Objekt auf die v3-Form (fehlende Felder = Defaults). */
function toV3(base: MetaSave, raw: Partial<MetaSave>): MetaSave {
  return {
    ...base,
    nektar: typeof raw.nektar === 'number' ? raw.nektar : base.nektar,
    bestWave: typeof raw.bestWave === 'number' ? raw.bestWave : 0,
    runs: typeof raw.runs === 'number' ? raw.runs : 0,
    runId: typeof raw.runId === 'number' ? raw.runId : 0,
    breedGeneration: typeof raw.breedGeneration === 'number' ? raw.breedGeneration : 0,
    // Migration: alte Bestände mit 3× je Basis werden auf GENAU 2 Startpflanzen gekürzt
    variantCounts: sanitizeCounts(raw.variantCounts, base.variantCounts),
    savedVariants: Array.isArray(raw.savedVariants) ? raw.savedVariants : [],
    loadout: Array.isArray(raw.loadout) ? raw.loadout : [],
    language: raw.language === 'de' ? 'de' : 'en',
    audioOn: raw.audioOn !== false,
    pvpPayouts: typeof raw.pvpPayouts === 'number' ? raw.pvpPayouts : 0,
    seedStash: typeof raw.seedStash === 'number' ? Math.max(0, raw.seedStash) : 0,
    pendingCrosses: Array.isArray(raw.pendingCrosses) ? raw.pendingCrosses : [],
    totalWavesSurvived: typeof raw.totalWavesSurvived === 'number' ? raw.totalWavesSurvived : 0,
  };
}

function sanitizeCounts(raw: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!raw || typeof raw !== 'object') return fallback;
  const out: Record<string, number> = {};
  let total = 0;
  const starters = starterVariants().map(v => v.id);
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && v > 0) { out[k] = Math.floor(v); total += Math.floor(v); }
  }
  // Hard rule: mehr als die Startpflanzen besitzt niemand von Anfang an —
  // Bestände über 2 gesamt werden auf die Starter gekürzt (Gacha: Kauf ist der einzige Weg).
  if (total > STARTER_PLANT_COUNT) {
    const trimmed: Record<string, number> = {};
    for (const id of starters) { if (out[id]) trimmed[id] = 1; }
    return trimmed;
  }
  return out;
}

/** Migrationskette: v1/v2 → v3 (aufsteigend angewandt). */
function migrate(raw: unknown, fromVersion: number): MetaSave | null {
  if (fromVersion !== 1 && fromVersion !== 2) return null;
  const old = raw as Partial<MetaSave> & { version?: number };
  if (typeof old.nektar !== 'number') return null;
  return toV3(defaultMeta(), old);
}

export function loadMeta(): MetaSave {
  return load<MetaSave>(META_KEY, {
    version: META_VERSION,
    migrate,
    fallback: defaultMeta,
  });
}

export function persistMeta(meta: MetaSave): void {
  save(META_KEY, meta, META_VERSION);
}

export function updateMeta(patch: Partial<MetaSave>): MetaSave {
  const next = { ...loadMeta(), ...patch };
  persistMeta(next);
  return next;
}

export function addNektar(amount: number): MetaSave {
  return updateMeta({ nektar: Math.max(0, loadMeta().nektar + amount) });
}

/** Seed kaufen: Nektar abziehen, Stash +1. Liefert null bei zu wenig Nektar. */
export function buySeed(price: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.nektar < price) return null;
  return updateMeta({ nektar: meta.nektar - price, seedStash: meta.seedStash + 1 });
}

/** Kreuzung in die Reifungs-Queue legen (deterministischer Gacha-Seed bei Einreihung). */
export function enqueueCross(seed: number, crossIndex: number, currentWave: number): MetaSave {
  const meta = loadMeta();
  const entry: PendingCross = {
    crossIndex,
    seed,
    neededWaves: wavesToUnlockFor(crossIndex),
    startedWave: currentWave,
  };
  return updateMeta({ pendingCrosses: [...meta.pendingCrosses, entry], breedGeneration: meta.breedGeneration + 1 });
}

/**
 * Reifungs-Fortschritt: wird NACH jedem Run aufgerufen (Welle erreicht).
 * Gibt die jetzt keimenden PendingCross-Seeds zurück und entfernt sie aus der Queue.
 */
export function advanceCrossMaturation(waveReached: number): number[] {
  const meta = loadMeta();
  const total = meta.totalWavesSurvived + Math.max(0, waveReached);
  const ready: number[] = [];
  const still: PendingCross[] = [];
  for (const c of meta.pendingCrosses) {
    if (total - c.startedWave >= c.neededWaves) ready.push(c.seed);
    else still.push(c);
  }
  if (ready.length > 0 || total !== meta.totalWavesSurvived) {
    updateMeta({ pendingCrosses: still, totalWavesSurvived: total });
  }
  return ready;
}

/** Run-Ende: Nektar banken, Bestwelle/Runzähler/RunId fortschreiben (B1 — genau einmal). */
export function recordRunEnd(waveReached: number, nektarEarned: number): MetaSave {
  const meta = loadMeta();
  const next: MetaSave = {
    ...meta,
    nektar: meta.nektar + nektarEarned,
    bestWave: Math.max(meta.bestWave, waveReached),
    runs: meta.runs + 1,
    runId: meta.runId + 1,
  };
  persistMeta(next);
  return next;
}

export function registerVariant(variant: PlantVariant): MetaSave {
  const meta = loadMeta();
  const counts = { ...meta.variantCounts };
  counts[variant.id] = (counts[variant.id] || 0) + 1;
  let library = meta.savedVariants;
  if (!library.some(v => v.id === variant.id)) {
    library = [...library, variant];
    if (library.length > 60) {
      const dropped = library.slice(0, library.length - 60);
      for (const d of dropped) delete counts[d.id];
      library = library.slice(library.length - 60);
    }
  }
  return updateMeta({ variantCounts: counts, savedVariants: library });
}

/** Toggle a variant in the carried loadout (max 4). */
export function toggleLoadout(variantId: string): MetaSave {
  const meta = loadMeta();
  const inLoadout = meta.loadout.includes(variantId);
  let next: string[];
  if (inLoadout) next = meta.loadout.filter(id => id !== variantId);
  else {
    if (meta.loadout.length >= 4) return meta;
    next = [...meta.loadout, variantId];
  }
  return updateMeta({ loadout: next });
}

/** Genau ein Stash-Seed verbrauchen (bei der Aussaat). */
export function consumeSeed(): MetaSave | null {
  const meta = loadMeta();
  if (meta.seedStash <= 0) return null;
  return updateMeta({ seedStash: meta.seedStash - 1 });
}

export function resetMeta(): void {
  remove(META_KEY);
}
