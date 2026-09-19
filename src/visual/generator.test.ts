import { describe, it, expect } from 'vitest';
import { resolveVisual, resolveBredVisuals } from './generator';
import { createBaseVariants } from '../genome';
import { genomeToVisualInput, basePlantVisualInput } from '../genome/visualMap';
import { PLANT_IDS } from '../config/plants.source';
import type { Genome, PlantVariant } from '../types';

// R3: der Generator RESOLVED nur noch — die Anatomie kommt als Phänotyp herein
// (genome/plantPhenotype.ts), gezeichnet wird sie von render/plants.ts. Gepinnt wird hier
// deshalb: Determinismus der Auflösung, stabile variantKey-Identität und die Zusage, dass
// zwei verschiedene gültige Genome ZWEI verschiedene Individuen ergeben (kein Farb-Offset).

const SEED = 583921;

function variantOf(genome: Genome, id = 'cross_a', type: PlantVariant['type'] = 'shooter'): PlantVariant {
  return {
    id, name: id, type, genome, traits: [], cost: 40,
    stats: { hp: 100, damage: 10, range: 3, cooldown: 30, special: null },
    color: '#4ade80', discovered: true,
  };
}

const A = variantOf([{ id: 'fire', power: 0.8, dominant: true }, { id: 'rapid', power: 0.5, dominant: true }], 'cross_fire');
const B = variantOf([{ id: 'ice', power: 0.7, dominant: false }, { id: 'heavy', power: 0.6, dominant: false }], 'cross_ice');

describe('R3 gate: ResolvedVisual ist eine reine Phänotyp-Auflösung', () => {
  it('gleiches Input ⇒ identisches ResolvedVisual (byte-gleich)', () => {
    const input = genomeToVisualInput(A, SEED);
    expect(resolveVisual(input)).toEqual(resolveVisual(input));
  });

  it('jede Grundpflanze löst über DENSELBEN Pfad auf (kein BASE-Zweig mehr)', () => {
    for (const id of PLANT_IDS) {
      const input = basePlantVisualInput(id, SEED);
      expect(input, `${id} hat keine Quelle`).not.toBeNull();
      const v = resolveVisual(input!);
      expect(v.variantKey.startsWith('plant|')).toBe(true);
      expect(v.phenotype.stalk.height).toBeGreaterThan(0);
    }
  });

  it('kein Baukasten-Rest im Ergebnis (keine Layer-, Base- oder Extra-Liste)', () => {
    const v = resolveVisual(genomeToVisualInput(A, SEED)) as unknown as Record<string, unknown>;
    expect(v['layers']).toBeUndefined();
    expect(v['baseId']).toBeUndefined();
    expect(v['extraIds']).toBeUndefined();
    expect(v['visualVersion']).toBeUndefined();
  });

  it('variantKey ist stabil und folgt der Anatomie, nicht der Variant-ID', () => {
    const one = resolveVisual(genomeToVisualInput(A, SEED));
    expect(one.variantKey).toBe(resolveVisual(genomeToVisualInput(A, SEED)).variantKey);
    // Gleiches Genom, andere ID ⇒ gleiche Anatomie ⇒ dasselbe Sprite (der Key folgt der Form).
    const sameForm = resolveVisual(genomeToVisualInput({ ...A, id: 'cross_other_id' }, SEED));
    expect(sameForm.variantKey).toBe(one.variantKey);
    expect(sameForm.phenotype.descriptor).toEqual(one.phenotype.descriptor);
  });

  it('verschiedene gültige Genome ergeben phänotypisch unterscheidbare Wesen', () => {
    const fire = resolveVisual(genomeToVisualInput(A, SEED));
    const ice = resolveVisual(genomeToVisualInput(B, SEED));
    expect(fire.variantKey).not.toBe(ice.variantKey);
    // Nicht nur die Farbe: die Anatomie selbst weicht messbar ab.
    const stamm = Math.abs(fire.phenotype.stalk.thickness - ice.phenotype.stalk.thickness);
    const blatt = Math.abs(fire.phenotype.leaves.count - ice.phenotype.leaves.count);
    const dorn = Math.abs(fire.phenotype.protection.thorns - ice.phenotype.protection.thorns);
    expect(stamm + blatt / 10 + dorn).toBeGreaterThan(0.05);
  });

  it('Effekt bleibt am Bild ablesbar (Tint aus derselben Gen-Zeile)', () => {
    const plain = resolveVisual(genomeToVisualInput(variantOf([{ id: 'rapid', power: 0.8, dominant: true }], 'cross_plain'), SEED));
    const burning = resolveVisual(genomeToVisualInput(A, SEED));
    // Die zwei stärksten Gene fahren auf dem Projektil (fire + rapid) — fire ist darunter.
    expect(burning.effectIds).toContain('EFFECT_BURN');
    expect(plain.effectIds).not.toContain('EFFECT_BURN');
    expect(burning.palette.base).not.toBe(plain.palette.base);
  });

  it('gespeicherte Bred-Varianten erhalten deterministisch dasselbe ResolvedVisual', () => {
    const variant = { ...createBaseVariants()[0]!, id: 'cross_seedling' };
    const first = resolveBredVisuals([variant], SEED);
    const second = resolveBredVisuals([variant], SEED);
    expect(first.get('cross_seedling')).toBeDefined();
    expect(first.get('cross_seedling')).toEqual(second.get('cross_seedling'));
  });

  it('die Grundpflanze ist keine Sonder-Silhouette: ihr Bild kommt aus ihrem Genom', () => {
    const sprout = resolveVisual(basePlantVisualInput('sprout', SEED)!);
    const rootwall = resolveVisual(basePlantVisualInput('rootwall', SEED)!);
    expect(sprout.variantKey).not.toBe(rootwall.variantKey);
    expect(rootwall.phenotype.protection.thorns).toBeGreaterThan(sprout.phenotype.protection.thorns);
  });
});
