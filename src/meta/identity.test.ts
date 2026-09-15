import { describe, it, expect, beforeEach } from 'vitest';

// storage nutzt globalThis.localStorage — Polyfill via Owner-Helfer (persistence/testDom.ts)
import { clearTestStorage, ensureLocalStorage } from '../persistence/testDom';
import { fnv1a } from '../core/hash';

const { loadMeta, resetMeta, updateMeta, META_KEY, META_VERSION } = await import('./store');
const { enqueueBrood, claimBrood, keepCross } = await import('./run');
const { isCrossReady, consumeSeedAndEnqueueCross, advanceCrossMaturation } = await import('./economy');
const { rollBrood } = await import('../genome/beetle');
const { createBaseVariants } = await import('../genome/bases');

const A = 'leafhopper';
const B = 'shellbeetle';

/** Altsave-Envelope im LEGACY-Checksummen-Format (fnv über JSON.stringify). */
function writeLegacyEnvelope(key: string, data: unknown, v: number): void {
  const raw = JSON.stringify(data);
  ensureLocalStorage().setItem(key, JSON.stringify({ v, checksum: fnv1a(0x811c9dc5, raw), data }));
}

// ══ B14.1/B14.3 — Brut-Identität ist monoton, nie aus einem Fenster abgeleitet ══
// Befund A13.1: `enqueueBrood` leitete den broodIndex aus `Math.max(...pendingBroods) + 1` ab.
// `claimBrood` verkleinert das Fenster ⇒ der verbrauchte Index wurde erneut vergeben ⇒
// identischer Brut-Seed ⇒ identische Specimen-ID. Das Fenster-Maximum ist als Aggregation
// reihenfolge-unabhängig, aber nicht STABIL — Identität gehört in einen monotonen Zähler.

describe('B14 — Brut-Identität', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('vergibt einen verbrauchten broodIndex nicht erneut', () => {
    enqueueBrood(A, B, 1);                 // broodIndex 0
    enqueueBrood(A, B, 1);                 // broodIndex 1
    claimBrood(1, 0);                      // höchster Index fällt aus dem Fenster

    const third = enqueueBrood(A, B, 1);

    // Vorher: max([0]) + 1 = 1 ⇒ Recycling. Jetzt: monotoner Zähler ⇒ 2.
    expect(third.pendingBroods.map(p => p.broodIndex)).toEqual([0, 2]);
    expect(third.broodGeneration).toBe(3);
  });

  it('erzeugt nie zwei Specimen mit identischer ID im Brut-Lager', () => {
    enqueueBrood(A, B, 1);                 // 0
    enqueueBrood(A, B, 1);                 // 1
    claimBrood(1, 0);
    enqueueBrood(A, B, 1);                 // 2 (nicht 1 — das war das Recycling)
    claimBrood(2, 0);

    const ids = loadMeta().beetles.map(b => b.id);

    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('schreibt Zähler und Brut-Eintrag im selben Schritt', () => {
    const first = enqueueBrood(A, B, 1);

    expect(first.broodGeneration).toBe(1);
    expect(first.pendingBroods[0].broodIndex).toBe(0);
    claimBrood(0, 0);
    expect(loadMeta().broodGeneration).toBe(1); // Zähler läuft nicht zurück
  });

  it('Vorschau und Enqueue verwenden dieselbe Generation (A13.2)', () => {
    const previewIds = rollBrood(A, B, loadMeta().broodGeneration).map(c => c.id);
    const created = enqueueBrood(A, B, 1);
    const index = created.pendingBroods[created.pendingBroods.length - 1].broodIndex;

    expect(rollBrood(A, B, index).map(c => c.id)).toEqual(previewIds);
  });

  it('derselbe Index ⇒ dieselbe Brut (belegt, warum die Generation stabil bleiben muss)', () => {
    expect(rollBrood(A, B, 1).map(c => c.id)).toEqual(rollBrood(A, B, 1).map(c => c.id));
    expect(rollBrood(A, B, 1).map(c => c.id)).not.toEqual(rollBrood(A, B, 2).map(c => c.id));
  });
});

// ══ B14.2 — Migration v4 → v5 ohne Identitätsverlust ══

describe('B14 — Migration v4 → v5', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('leitet broodGeneration aus bereits vergebenen Kennungen ab', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 4, nektar: 123, bestWave: 3, runs: 2, runId: 3, breedGeneration: 1,
      variantCounts: {}, savedVariants: [], loadout: [], language: 'de', audioOn: true,
      pvpPayouts: 0, seedStash: 0, pendingCrosses: [], totalWavesSurvived: 4,
      bredStats: {}, mapLayouts: {}, beetleDeployed: null,
      beetles: [{ id: 'brood_legacy', generation: 9 }],
      pendingBroods: [{ broodIndex: 7, specimenAId: A, specimenBId: B, neededWaves: 1, startedWave: 0, chosenIndex: -1 }],
    }, 4);

    const meta = loadMeta();

    expect(meta.version).toBe(META_VERSION);
    expect(meta.nektar).toBe(123);
    expect(meta.broodGeneration).toBe(10); // max(7, 9) + 1
  });

  it('vergibt nach der Migration keine bestehende Kennung erneut', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 4, nektar: 5, pendingBroods: [{ broodIndex: 4, specimenAId: A, specimenBId: B, neededWaves: 1, startedWave: 0, chosenIndex: -1 }],
      beetles: [],
    }, 4);

    const created = enqueueBrood(A, B, 1);
    const indexes = created.pendingBroods.map(p => p.broodIndex);

    expect(indexes).toEqual([4, 5]);
  });

  it('Altsave mit Legacy-Checksumme wird gelesen und beim Schreiben kanonisiert (B14.6)', () => {
    writeLegacyEnvelope(META_KEY, { version: 4, nektar: 77 }, 4);

    expect(loadMeta().nektar).toBe(77);

    const stored = JSON.parse(ensureLocalStorage().getItem(META_KEY) as string) as { v: number; checksum: number; data: unknown };
    expect(stored.v).toBe(META_VERSION);
    // Nach dem Schreiben greift die kanonische Prüfung.
    expect(fnv1a(0x811c9dc5, JSON.stringify(stored.data))).not.toBe(stored.checksum);
  });
});

// ══ B14.4 — EIN Reife-Gate, fail-closed, und die Queue verliert nichts ══

describe('B14 — Reife-Gate (fail-closed)', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('unbekannter crossIndex ist NICHT reif', () => {
    expect(isCrossReady(loadMeta(), 999)).toBe(false);
  });

  it('meldet Reife erst nach dem Fortschritt des Zählers', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0, pendingCrosses: [] });
    expect(consumeSeedAndEnqueueCross(1234, 0, 0)).not.toBeNull();

    expect(isCrossReady(loadMeta(), 0)).toBe(false); // neededWaves(0) = 2
    advanceCrossMaturation(2);
    expect(isCrossReady(loadMeta(), 0)).toBe(true);
  });

  it('räumt die Queue NICHT mehr auf (A13.12: Reifung zerstörte bisher das Ergebnis)', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0, pendingCrosses: [] });
    consumeSeedAndEnqueueCross(1234, 0, 0);

    advanceCrossMaturation(9);

    const meta = loadMeta();
    expect(meta.pendingCrosses.length).toBe(1);
    expect(isCrossReady(meta, 0)).toBe(true);
  });

  it('gibt nichts zurück (kein toter number[]-Vertrag)', () => {
    expect(advanceCrossMaturation(3)).toBeUndefined();
  });

  it('begrenzt die Queue auf PENDING_CROSSES_MAX Einträge', () => {
    updateMeta({ seedStash: 100, totalWavesSurvived: 0, pendingCrosses: [] });
    for (let i = 0; i < 20; i++) consumeSeedAndEnqueueCross(1000 + i, i, 0);

    const meta = loadMeta();
    expect(meta.pendingCrosses.length).toBe(12);
    expect(meta.pendingCrosses[meta.pendingCrosses.length - 1].crossIndex).toBe(19);
  });
});

// ══ B14.5 — keepCross ist EIN Persistenzschritt und bucht die Queue aus ══

describe('B14 — keepCross atomar', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  const child = { ...createBaseVariants()[0], id: 'cross_atomic_test', name: 'Atomkind' };
  const pending = { crossIndex: 0, seed: 4242, neededWaves: 2, startedWave: 0 };

  it('verbraucht Eltern, registriert das Kind und bucht die Queue in einem Schritt', () => {
    updateMeta({
      variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {},
      pendingCrosses: [pending], totalWavesSurvived: 5,
    });

    const meta = keepCross(child, 'sprout', 'rootwall', 0);

    expect(meta).not.toBeNull();
    expect(meta?.variantCounts['sprout']).toBe(1);
    expect(meta?.variantCounts['cross_atomic_test']).toBe(1);
    expect(meta?.pendingCrosses).toEqual([]);
    expect(meta?.bredStats?.['cross_atomic_test']).toBeDefined();
  });

  it('lässt bei fehlendem Elternteil alles unangetastet — kein Teilzustand', () => {
    updateMeta({
      variantCounts: { sprout: 0, rootwall: 5 }, savedVariants: [], bredStats: {},
      pendingCrosses: [pending], totalWavesSurvived: 5,
    });

    expect(keepCross(child, 'sprout', 'rootwall', 0)).toBeNull();

    const after = loadMeta();
    expect(after.variantCounts['rootwall']).toBe(5);
    expect(after.variantCounts['cross_atomic_test']).toBeUndefined();
    expect(after.pendingCrosses.length).toBe(1);
  });

  it('kommt ohne crossIndex aus (Rückwärtskompatibilität des Aufrufs)', () => {
    updateMeta({ variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {}, pendingCrosses: [pending] });

    expect(keepCross(child, 'sprout', 'rootwall')).not.toBeNull();
    expect(loadMeta().pendingCrosses.length).toBe(1);
  });
});

// ══ B14.6 — Integrität hängt am INHALT, nicht an der Key-Reihenfolge ══

describe('B14 — Kanonische Checksumme', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('quarantäniert ein gültiges Save nicht, wenn die Key-Reihenfolge wechselt', () => {
    updateMeta({ nektar: 42, bestWave: 7 });
    const ls = ensureLocalStorage();
    const env = JSON.parse(ls.getItem(META_KEY) as string) as { v: number; checksum: number; data: Record<string, unknown> };

    ls.setItem(META_KEY, JSON.stringify({ ...env, data: Object.fromEntries(Object.entries(env.data).reverse()) }));

    const meta = loadMeta();
    expect(meta.nektar).toBe(42);
    expect(meta.bestWave).toBe(7);
    expect(ls.getItem(`${META_KEY}.corrupt`)).toBeNull();
  });

  it('quarantäniert echten Inhalts-Betrug weiterhin', () => {
    updateMeta({ nektar: 42 });
    const ls = ensureLocalStorage();
    const env = JSON.parse(ls.getItem(META_KEY) as string) as { data: Record<string, unknown> };

    ls.setItem(META_KEY, JSON.stringify({ ...env, data: { ...env.data, nektar: 99999 } }));

    expect(loadMeta().nektar).not.toBe(99999);
    expect(ls.getItem(`${META_KEY}.corrupt`)).not.toBeNull();
  });
});
