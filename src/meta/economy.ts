import type { MetaSave, PendingCross, PlantVariant } from '../types';
import { loadMeta, updateMeta } from './store';
import { registerVariant } from './run';
import { wavesToUnlockFor, PENDING_CROSSES_MAX } from '../config/economy.source';
import { GAME_SEED } from '../config';
import { deriveSeed } from '../core/rng';
import { createBaseVariants } from '../genome/bases';

// Owner: PersistenceSystem (meta economy). LOC ≤ 200.
// Atomare Meta-Operationen: consume+enqueue sind EIN Persistenzschritt (kein Zwischenzustand,
// in dem Seed verbrannt, aber kein Cross gequeued ist — Tab-Konkurrenz/Error-Safety).

export function buySeed(price: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.nektar < price) return null;
  return updateMeta({ nektar: meta.nektar - price, seedStash: meta.seedStash + 1 });
}

/**
 * B17.3: Kaufen UND Keimen sind EIN atomarer Schritt (Nektar → Pflanze im Bestand).
 * Vorher keimte der Shop nur aus einem vorhandenen Stash — der erste Klick zahlte
 * für ein bloßes Ticket, der zweite keimte es kostenlos (Nektar-Drift). Fail-closed:
 * zu wenig Nektar ODER Register-Verweigerung ⇒ null, nichts passiert.
 */
export function buySeedAndGerminate(price: number, index: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.nektar < price) return null;
  const variant = germinateVariant(index);
  const registered = registerVariant(variant);
  if (!registered) return null;
  return updateMeta({ nektar: meta.nektar - price });
}

/**
 * B17.3 (Option A): ein gekaufter Samen KEIMT ZUR PFLANZE — Bestand, kein Ticket.
 *
 * Vorher war ein Samen nur ein Kreuzungs-Ticket (`seedStash` → `consumeSeedAndEnqueueCross`):
 * nach dem ersten Keep blieben 0 Pflanzen, und es gab keinen Weg zurück (A19.4). Der Samen
 * wird aus dem Spiel-Seed deterministisch abgeleitet (`deriveSeed(GAME_SEED,'plant',…,index)`)
 * — die Rolle/das Genom kommt aus `PLANTS_SOURCE` (Allel-Quelle), der Name trägt den Keim-Index.
 * Registrierung über `registerVariant` — derselbe Pfad wie ein gezüchtetes Kind.
 */
export function germinateSeed(index: number): MetaSave | null {
  const meta = loadMeta();
  if (meta.seedStash <= 0) return null;
  const variant = germinateVariant(index);
  return registerVariant(variant) ? updateMeta({ seedStash: meta.seedStash - 1 }) : null;
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
 * B17.3: Die Keim-Variante aus einem Samen-Index — deterministisch, weltweit reproduzierbar.
 * Basis-Form aus `PLANTS_SOURCE` (über `createBaseVariants`), Identität aus dem Spiel-Seed:
 * derselbe Index ergibt überall dieselbe Pflanze (Discovery-Chain-Vertrag).
 */
export function germinateVariant(index: number): PlantVariant {
  const bases = createBaseVariants();
  const seed = deriveSeed(GAME_SEED, 'plant', 'seed', index);
  const base = bases[seed % bases.length]!;
  return { ...base, id: `seed_${index}`, name: `${base.name} (Keim ${index + 1})` };
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
