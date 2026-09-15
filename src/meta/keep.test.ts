import { describe, it, expect, beforeEach } from 'vitest';

// storage nutzt globalThis.localStorage — Polyfill via Owner-Helfer (persistence/testDom.ts)
import { clearTestStorage } from '../persistence/testDom';

const { loadMeta, updateMeta } = await import('./store');
const { keepCross } = await import('./run');
const { createBaseVariants } = await import('../genome/bases');

const child = { ...createBaseVariants()[0], id: 'cross_keep_test', name: 'Testkind' };

describe('B1 — Keep verbraucht die Eltern', () => {
  beforeEach(() => { clearTestStorage(); });

  it('zieht je 1× beider Eltern ab und registriert das Kind samt Stats', () => {
    updateMeta({ variantCounts: { sprout: 2, rootwall: 1 }, savedVariants: [], bredStats: {} });

    const meta = keepCross(child, 'sprout', 'rootwall');

    expect(meta).not.toBeNull();
    expect(meta?.variantCounts['sprout']).toBe(1);
    expect(meta?.variantCounts['rootwall']).toBe(0);
    expect(meta?.variantCounts['cross_keep_test']).toBe(1);
    expect(meta?.savedVariants.some(v => v.id === 'cross_keep_test')).toBe(true);
    expect(meta?.bredStats?.['cross_keep_test']).toBeDefined();
  });

  it('bricht ab, wenn ein Elternteil fehlt — und lässt den Bestand unangetastet', () => {
    updateMeta({ variantCounts: { sprout: 2, rootwall: 0 }, savedVariants: [], bredStats: {} });

    expect(keepCross(child, 'sprout', 'rootwall')).toBeNull();

    const meta = loadMeta();
    expect(meta.variantCounts['sprout']).toBe(2);
    expect(meta.variantCounts['cross_keep_test']).toBeUndefined();
  });

  it('verlangt 2× desselben Elternteils, wenn beide Eltern identisch sind', () => {
    updateMeta({ variantCounts: { sprout: 1 }, savedVariants: [], bredStats: {} });
    expect(keepCross(child, 'sprout', 'sprout')).toBeNull();

    updateMeta({ variantCounts: { sprout: 2 } });
    expect(keepCross(child, 'sprout', 'sprout')).not.toBeNull();
    expect(loadMeta().variantCounts['sprout']).toBe(0);
  });
});
