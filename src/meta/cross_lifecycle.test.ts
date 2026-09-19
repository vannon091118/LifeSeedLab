import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Meta-Tests — Sub-Domäne „Keep, Reife-Gate & kanonische Checksumme“ (B32.2/3).
// Konsolidierung Phase 2 (Plan: plan/refactor-test-suite-consolidation-1.md):
// keep.test.ts + capping.test.ts + identity.test.ts (Reife-Gate + kanonische Checksumme).
// Setup je describe über das Testkit bzw. persistence/testDom — keine Setup-Kopien mehr.
// Die Identitäts-/Kappungs-Invarianten (B16.8) liegen in `identity_invariants.test.ts`:
// diese Datei riss mit ihnen den Meta-Cap (233/200) — getrennt statt Cap erhöht.

import { resetTestState } from '../testing/testkit';
import { clearTestStorage, ensureLocalStorage } from '../persistence/testDom';
import { createBaseVariants } from '../genome/bases';
import { rollGachaCross } from '../genome/gacha';
import { loadMeta, updateMeta, META_KEY } from './store';
import { keepCross } from './run';
import {
  isCrossReady,
  consumeSeedAndEnqueueCross,
  advanceCrossMaturation,
} from './economy';

const BASES = createBaseVariants();

// ══ B1 — Keep verbraucht die Eltern (A18.2: fail-closed, Queue nicht umgehbar) ══
// Jeder Test betreibt dafür einen reifen Queue-Eintrag (neededWaves 1, Zähler 5).

const child = { ...BASES[0], id: 'cross_keep_test', name: 'Testkind' };
const REIF = { crossIndex: 0, seed: 1, neededWaves: 1, startedWave: 0 };

function reifSetup(counts: Record<string, number>): void {
  updateMeta({
    variantCounts: { ...counts }, savedVariants: [], bredStats: {},
    pendingCrosses: [REIF], totalWavesSurvived: 5,
  });
}

describe('B1 — Keep verbraucht die Eltern', () => {
  beforeEach(() => { clearTestStorage(); });

  it('zieht je 1× beider Eltern ab, bucht die Queue aus und registriert das Kind', () => {
    reifSetup({ sprout: 2, rootwall: 1 });

    const meta = keepCross(child, 'sprout', 'rootwall', 0);

    expect(meta).not.toBeNull();
    expect(meta?.variantCounts['sprout']).toBe(1);
    expect(meta?.variantCounts['rootwall']).toBe(0);
    expect(meta?.variantCounts['cross_keep_test']).toBe(1);
    expect(meta?.savedVariants.some(v => v.id === 'cross_keep_test')).toBe(true);
    expect(meta?.bredStats?.['cross_keep_test']).toBeDefined();
    expect(meta?.pendingCrosses).toEqual([]);
  });

  it('bricht ab, wenn ein Elternteil fehlt — und lässt Bestand UND Queue unangetastet', () => {
    reifSetup({ sprout: 2, rootwall: 0 });

    expect(keepCross(child, 'sprout', 'rootwall', 0)).toBeNull();

    const meta = loadMeta();
    expect(meta.variantCounts['sprout']).toBe(2);
    expect(meta.variantCounts['cross_keep_test']).toBeUndefined();
    expect(meta.pendingCrosses.length).toBe(1);
  });

  it('verlangt 2× desselben Elternteils, wenn beide Eltern identisch sind', () => {
    reifSetup({ sprout: 1 });
    expect(keepCross(child, 'sprout', 'sprout', 0)).toBeNull();

    reifSetup({ sprout: 2 });
    expect(keepCross(child, 'sprout', 'sprout', 0)).not.toBeNull();
    expect(loadMeta().variantCounts['sprout']).toBe(0);
  });

  // ── A18.2: die Queue ist nicht umgehbar ──

  it('UNREIFE Kreuzung ⇒ null, nichts wird verbraucht (fail-closed, A18.2)', () => {
    updateMeta({
      variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {},
      pendingCrosses: [{ crossIndex: 0, seed: 1, neededWaves: 2, startedWave: 0 }],
      totalWavesSurvived: 1, // 1 < 2 ⇒ unreif
    });

    expect(keepCross(child, 'sprout', 'rootwall', 0)).toBeNull();

    const meta = loadMeta();
    expect(meta.variantCounts['sprout']).toBe(2);
    expect(meta.variantCounts['rootwall']).toBe(1);
    expect(meta.pendingCrosses.length).toBe(1);
  });

  it('UNBEKANNTER crossIndex ⇒ null (kein stiller Fallback, A18.2)', () => {
    reifSetup({ sprout: 2, rootwall: 1 });

    expect(keepCross(child, 'sprout', 'rootwall', 999)).toBeNull();

    const meta = loadMeta();
    expect(meta.variantCounts['sprout']).toBe(2);
    expect(meta.pendingCrosses.length).toBe(1);
  });

  it('ohne Queue-Eintrag gibt es kein Keep — die Reife entscheidet die Meta, nicht die UI', () => {
    updateMeta({ variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {}, pendingCrosses: [] });

    expect(keepCross(child, 'sprout', 'rootwall', 0)).toBeNull();
    expect(loadMeta().variantCounts['sprout']).toBe(2);
  });
});

// ══ B14.5 — keepCross ist EIN Persistenzschritt und bucht die Queue aus ══

describe('B14 — keepCross atomar', () => {
  beforeEach(() => { resetTestState(); });

  const atomicChild = { ...BASES[0], id: 'cross_atomic_test', name: 'Atomkind' };
  const pending = { crossIndex: 0, seed: 4242, neededWaves: 2, startedWave: 0 };

  it('verbraucht Eltern, registriert das Kind und bucht die Queue in einem Schritt', () => {
    updateMeta({
      variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {},
      pendingCrosses: [pending], totalWavesSurvived: 5,
    });

    const meta = keepCross(atomicChild, 'sprout', 'rootwall', 0);

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

    expect(keepCross(atomicChild, 'sprout', 'rootwall', 0)).toBeNull();

    const after = loadMeta();
    expect(after.variantCounts['rootwall']).toBe(5);
    expect(after.variantCounts['cross_atomic_test']).toBeUndefined();
    expect(after.pendingCrosses.length).toBe(1);
  });

  it('kommt NICHT ohne crossIndex aus — die Queue ist nicht umgehbar (A18.2)', () => {
    updateMeta({ variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {}, pendingCrosses: [pending], totalWavesSurvived: 5 });

    // @ts-expect-error A18.2: der frühere „Rückwärtskompatibilitäts"-Aufruf war der Bypass —
    // er ist jetzt typ- und vertragswidrig (der alte Test lockte ihn als Vertrag).
    expect(keepCross(atomicChild, 'sprout', 'rootwall')).toBeNull();
    expect(loadMeta().pendingCrosses.length).toBe(1);
    expect(loadMeta().variantCounts['sprout']).toBe(2);
  });
});

// ══ B14.4 — EIN Reife-Gate, fail-closed, und die Queue verliert nichts ══

describe('B14 — Reife-Gate (fail-closed)', () => {
  beforeEach(() => { resetTestState(); });

  it('unbekannter crossIndex ist NICHT reif', () => {
    expect(isCrossReady(loadMeta(), 999)).toBe(false);
  });

  it('meldet Reife erst nach dem Fortschritt des Zählers', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0, pendingCrosses: [] });
    const roll = rollGachaCross(BASES, 1234, 0)!;
    expect(consumeSeedAndEnqueueCross(1234, 0, 0, roll.child, roll.parentA.id, roll.parentB.id)).not.toBeNull();

    expect(isCrossReady(loadMeta(), 0)).toBe(false); // neededWaves(0) = 2
    advanceCrossMaturation(2);
    expect(isCrossReady(loadMeta(), 0)).toBe(true);
  });

  it('räumt die Queue NICHT mehr auf (A13.12: Reifung zerstörte bisher das Ergebnis)', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0, pendingCrosses: [] });
    const roll = rollGachaCross(BASES, 1234, 0)!;
    consumeSeedAndEnqueueCross(1234, 0, 0, roll.child, roll.parentA.id, roll.parentB.id);

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
    for (let i = 0; i < 20; i++) {
      const roll = rollGachaCross(BASES, 1000 + i, i)!;
      consumeSeedAndEnqueueCross(1000 + i, i, 0, roll.child, roll.parentA.id, roll.parentB.id);
    }

    const meta = loadMeta();
    expect(meta.pendingCrosses.length).toBe(12);
    expect(meta.pendingCrosses[meta.pendingCrosses.length - 1].crossIndex).toBe(19);
  });
});

// ══ B14.6 — Integrität hängt am INHALT, nicht an der Key-Reihenfolge ══

describe('B14 — Kanonische Checksumme', () => {
  beforeEach(() => { resetTestState(); });

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
