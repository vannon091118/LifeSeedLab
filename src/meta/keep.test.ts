import { describe, it, expect, beforeEach } from 'vitest';

// storage nutzt globalThis.localStorage — Polyfill via Owner-Helfer (persistence/testDom.ts)
import { clearTestStorage } from '../persistence/testDom';

const { loadMeta, updateMeta } = await import('./store');
const { keepCross } = await import('./run');
const { createBaseVariants } = await import('../genome/bases');

const child = { ...createBaseVariants()[0], id: 'cross_keep_test', name: 'Testkind' };

// A18.2: keepCross nimmt crossIndex VERPFLICHTEND und prüft die Reife selbst (fail-closed).
// Jeder Test betreibt dafür einen reifen Queue-Eintrag (neededWaves 1, Zähler 5).
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
