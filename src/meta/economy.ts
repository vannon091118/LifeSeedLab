import type { MetaSave, PendingCross } from '../types';
import { loadMeta, updateMeta } from './store';
import { wavesToUnlockFor } from '../config/economy.source';

// Owner: PersistenceSystem (meta economy). LOC ≤ 200.
// Atomare Meta-Operationen: consume+enqueue sind EIN Persistenzschritt (kein Zwischenzustand,
// in dem Seed verbrannt, aber kein Cross gequeued ist — Tab-Konkurrenz/Error-Safety).

export function buySeed(price: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.nektar < price) return null;
  return updateMeta({ nektar: meta.nektar - price, seedStash: meta.seedStash + 1 });
}

/**
 * ATOMAR: prüft Stash, verbraucht 1 Seed und queued die Kreuzung in einem einzigen
 * load→mutate→persist-Zyklus. Rückgabe null = nichts passiert (kein Seed verbrannt).
 */
export function consumeSeedAndEnqueueCross(gachaSeed: number, crossIndex: number, currentWave: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.seedStash <= 0) return null;
  const entry: PendingCross = {
    crossIndex,
    seed: gachaSeed,
    neededWaves: wavesToUnlockFor(crossIndex),
    startedWave: currentWave,
  };
  return updateMeta({
    seedStash: meta.seedStash - 1,
    pendingCrosses: [...meta.pendingCrosses, entry],
    breedGeneration: meta.breedGeneration + 1,
  });
}

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

export function consumeSeed(): MetaSave | null {
  const meta = loadMeta();
  if (meta.seedStash <= 0) return null;
  return updateMeta({ seedStash: meta.seedStash - 1 });
}

export function addNektar(amount: number): MetaSave {
  return updateMeta({ nektar: Math.max(0, loadMeta().nektar + amount) });
}
