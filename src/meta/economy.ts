import type { MetaSave, PendingCross } from '../types';
import { loadMeta, updateMeta } from './store';
import { wavesToUnlockFor, PENDING_CROSSES_MAX } from '../config/economy.source';

// Owner: PersistenceSystem (meta economy). LOC ≤ 200.
// Atomare Meta-Operationen: consume+enqueue sind EIN Persistenzschritt (kein Zwischenzustand,
// in dem Seed verbrannt, aber kein Cross gequeued ist — Tab-Konkurrenz/Error-Safety).

export function buySeed(price: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.nektar < price) return null;
  return updateMeta({ nektar: meta.nektar - price, seedStash: meta.seedStash + 1 });
}

/** Reifungs-Queue begrenzen (älteste fallen) — reine Kapazitätsgrenze, kein Verwerfen von Reifem. */
function capped(queue: PendingCross[]): PendingCross[] {
  return queue.length > PENDING_CROSSES_MAX ? queue.slice(queue.length - PENDING_CROSSES_MAX) : queue;
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
    pendingCrosses: capped([...meta.pendingCrosses, entry]),
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
  return updateMeta({ pendingCrosses: capped([...meta.pendingCrosses, entry]), breedGeneration: meta.breedGeneration + 1 });
}

/**
 * Reifungs-Uhr: die EINZIGE Stelle, die `totalWavesSurvived` vorantreibt.
 * Sie reiht KEINE Kreuzungen aus — Ausbuchen passiert ausschließlich beim Beanspruchen
 * (`keepCross`). Vorher löschte dieser Schritt gereifte Einträge und warf ihre Seeds weg:
 * genau die Stelle, an der die Reifung eintrat, zerstörte das Ergebnis (A13.12).
 */
export function advanceCrossMaturation(waveReached: number): void {
  const meta = loadMeta();
  const total = meta.totalWavesSurvived + Math.max(0, waveReached);
  if (total !== meta.totalWavesSurvived) updateMeta({ totalWavesSurvived: total });
}

/**
 * Reife-Gate — EINE Ableitung, fail-closed (B14.4):
 * unbekannter `crossIndex` ⇒ NICHT reif. Ein Gate, das bei Unbekanntem „ja" sagt,
 * ist kein Gate.
 */
/**
 * A18.6: DAS Reife-Kriterium — genau eine Arithmetik für Pflanzen UND Bruten.
 * Vorher: `isCrossReady` (Pflanzen) und `readyBroods` (Käfer) duplizierten dieselbe
 * Formel — zwei Wahrheiten, die beim nächsten Tuning auseinanderlaufen.
 */
export function isMatured(startedWave: number, neededWaves: number, totalWavesSurvived: number): boolean {
  return totalWavesSurvived - startedWave >= neededWaves;
}

/**
 * Ein Reife-Gate (B14.4, fail-closed): unbekannter Index ⇒ nicht reif.
 * Kein zweiter Ableitungspfad — die UI liest nur (Verbotspunkt 3).
 */
export function isCrossReady(meta: MetaSave, crossIndex: number): boolean {
  const entry = meta.pendingCrosses.find(c => c.crossIndex === crossIndex);
  if (!entry) return false;
  return isMatured(entry.startedWave, entry.neededWaves, meta.totalWavesSurvived);
}

export function consumeSeed(): MetaSave | null {
  const meta = loadMeta();
  if (meta.seedStash <= 0) return null;
  return updateMeta({ seedStash: meta.seedStash - 1 });
}

export function addNektar(amount: number): MetaSave {
  return updateMeta({ nektar: Math.max(0, loadMeta().nektar + amount) });
}
