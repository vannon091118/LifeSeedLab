import { describe, it, expect } from 'vitest';
import { resolveVisual, generateVisualForBase, resolveBredVisuals, type VisualInput } from './generator';
import { createBaseVariants } from '../genome';
import { BASE_IDS } from '../config/bases.source';
import { EXTRA_IDS } from '../config/extras.source';

const input: VisualInput = {
  baseId: 'BASE_FLOWER',
  extraIds: ['EXTRA_HAT', 'EXTRA_EYE'],
  effectIds: ['EFFECT_BURN'],
  visualSeed: 583921,
};

describe('Phase 6 gate: visual determinism', () => {
  it('same input = identical ResolvedVisual (Test B, run 1 vs run 2)', () => {
    const a = resolveVisual(input);
    const b = resolveVisual(input);
    expect(a).toEqual(b);
  });

  it('visualSeed changes the resolution', () => {
    const a = resolveVisual(input);
    const b = resolveVisual({ ...input, visualSeed: 583922 });
    expect(a).not.toEqual(b);
  });

  it('every base resolves without error and has layers', () => {
    for (const baseId of BASE_IDS) {
      const v = generateVisualForBase(baseId, 42);
      expect(v.layers.length).toBeGreaterThan(0);
      expect(v.variantKey).toContain(baseId);
    }
  });

  it('variantKey is stable and distinct per seed', () => {
    const v1 = generateVisualForBase('BASE_BUSH', 7);
    const v2 = generateVisualForBase('BASE_BUSH', 8);
    const v1Again = generateVisualForBase('BASE_BUSH', 7);
    expect(v1.variantKey).toBe(v1Again.variantKey);
    expect(v1.variantKey).not.toBe(v2.variantKey);
  });

  it('incompatible extras are filtered deterministically', () => {
    // EXTRA_SPIKE is not compatible with BASE_FLOWER
    const v = resolveVisual({ ...input, extraIds: [...EXTRA_IDS] });
    expect(v.extraIds).not.toContain('EXTRA_SPIKE');
  });

  it('gespeicherte Bred-Variante erhält deterministisches ResolvedVisual', () => {
    const variant = { ...createBaseVariants()[0], id: 'cross_seedling' };
    const first = resolveBredVisuals([variant], 583921);
    const second = resolveBredVisuals([variant], 583921);
    expect(first.get('cross_seedling')).toBeDefined();
    expect(first.get('cross_seedling')).toEqual(second.get('cross_seedling'));
    expect(first.get('cross_seedling')!.variantKey).not.toContain('base_shooter');
  });


});
