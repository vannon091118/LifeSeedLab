// B34 — Der Kern-Loop als Gate: Kaufen → Aussäen → Pflegen (Wellen überleben) → Ernten
// (abholen) → Loadout. Der Grundsatz: KEIN Zustand dieses Kreislaufs darf blockieren, ohne
// dass es einen Weg zurück gibt. Vorher: offene Reifungskurve (bis 24 Wellen bei Kreuzung 11)
// plus volle Queue mit totalem Sperr-Hinweis — der Loop stand faktisch still.

import { describe, it, expect, beforeEach } from 'vitest';
import { resetIds } from '../core/ids';
import { wavesToUnlockFor, PENDING_CROSSES_MAX, MATURATION_WAVES_CAP } from '../config/economy.source';
import { createBaseVariants } from '../genome';
import type { PlantVariant } from '../types';
import {
  buySeedAndGerminate,
  consumeSeedAndEnqueueCross,
  advanceCrossMaturation,
  isCrossReady,
} from './economy';
import { loadMeta, resetMeta } from './store';
import { keepCross } from './run';
import { clearTestStorage } from '../persistence/testDom';

const BASES = createBaseVariants();

/** Besitz-Liste — dieselbe Ableitung wie im Gewächshaus (eine Quelle). */
function ownedOf(meta: ReturnType<typeof loadMeta>): PlantVariant[] {
  return Object.keys(meta.variantCounts)
    .filter(id => (meta.variantCounts[id] ?? 0) > 0)
    .map(id => BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id))
    .filter((v): v is PlantVariant => v !== undefined);
}

// rollGachaCross hängt am Genom-Pool — der Test nutzt dieselbe Quelle wie das Gewächshaus.
import { rollGachaCross } from '../genome/gacha';

describe('B34 — Der Kern-Loop dreht immer', () => {
  beforeEach(() => { resetIds(); resetMeta(); clearTestStorage(); });

  it('Reifungskurve ist gedeckelt — Geduld ist endlich (max 12 Wellen)', () => {
    expect(MATURATION_WAVES_CAP).toBe(12);
    for (let i = 0; i < 60; i++) {
      expect(wavesToUnlockFor(i)).toBeLessThanOrEqual(MATURATION_WAVES_CAP);
    }
  });

  it('voller Loop: kaufen → aussäen → Wellen überleben → abholen → im Bestand', () => {
    // Kaufen keimt direkt (B17.3): Bestand wächst.
    expect(buySeedAndGerminate(30, 0)).not.toBeNull();
    expect(buySeedAndGerminate(30, 1)).not.toBeNull();

    // Aussäen (frei, Kosten beim Behalten).
    let meta = loadMeta();
    const owned = ownedOf(meta);
    expect(owned.length).toBeGreaterThanOrEqual(2);
    const roll = rollGachaCross(owned, 4242, meta.breedGeneration);
    expect(roll).not.toBeNull();
    meta = consumeSeedAndEnqueueCross(4242, meta.breedGeneration, meta.totalWavesSurvived, roll!.child, roll!.parentA.id, roll!.parentB.id)!;
    expect(meta.pendingCrosses).toHaveLength(1);

    // Pflegen: die nötigen Wellen überleben.
    for (let w = 0; w < wavesToUnlockFor(0); w++) advanceCrossMaturation(1);
    expect(isCrossReady(loadMeta(), 0)).toBe(true);

    // Ernten: Kind in den Bestand (Keep verbraucht je 1× Eltern, netto +1 Pflanze).
    const before = loadMeta().savedVariants.length;
    const kept = keepCross(roll!.child, roll!.parentA.id, roll!.parentB.id, 0);
    expect(kept).not.toBeNull();
    expect(kept!.pendingCrosses).toHaveLength(0);
    expect(kept!.savedVariants.some(v => v.id === roll!.child.id)).toBe(true);
    void before;
  });

  it('volle Queue sperrt die Aussaat — aber reife Einträge bleiben IMMER abholbar (Weg zurück)', () => {
    let meta = loadMeta();
    // Queue bis zum Rand füllen.
    for (let i = 0; i < PENDING_CROSSES_MAX; i++) {
      const owned = ownedOf(meta);
      const roll = rollGachaCross(owned, 100 + i, meta.breedGeneration);
      meta = consumeSeedAndEnqueueCross(100 + i, meta.breedGeneration, meta.totalWavesSurvived, roll!.child, roll!.parentA.id, roll!.parentB.id)!;
    }
    expect(meta.pendingCrosses).toHaveLength(PENDING_CROSSES_MAX);

    // Nach MATURATION_WAVES_CAP Wellen sind ALLE reif — abholbar trotz voller Queue.
    for (let w = 0; w < MATURATION_WAVES_CAP; w++) advanceCrossMaturation(1);
    meta = loadMeta();
    const ready = meta.pendingCrosses.filter(c => isCrossReady(meta, c.crossIndex));
    expect(ready.length).toBe(PENDING_CROSSES_MAX);
    // Und das Abholen schafft Platz — der Loop dreht weiter.
    const first = ready[0];
    const kept = keepCross(first.child!, first.parentAId!, first.parentBId!, first.crossIndex);
    expect(kept).not.toBeNull();
    expect(kept!.pendingCrosses.length).toBe(PENDING_CROSSES_MAX - 1);
  });
});
