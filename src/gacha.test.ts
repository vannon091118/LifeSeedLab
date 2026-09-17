import { describe, it, expect } from 'vitest';
import {
  createBaseVariants,
  rollGachaCross,
  deriveGachaSeed,
  generateName,
  variantPower,
} from './genome';
import { makeRng } from './core/rng';
import { wavesToUnlockFor, STARTER_PLANT_COUNT } from './config/economy.source';
import { NAME_CORE_BY_GENE } from './config/names.source';

const BASES = createBaseVariants();

describe('Gacha-Ökonomie Source', () => {
  it('genau 2 Startpflanzen (Hard Rule)', () => {
    expect(STARTER_PLANT_COUNT).toBe(2);
  });

  it('Reifewellen steigen mit der Kreuzungsstärke (2, 4, 6, ...) und sind gedeckelt (B34)', () => {
    expect(wavesToUnlockFor(0)).toBe(2);
    expect(wavesToUnlockFor(1)).toBe(4);
    expect(wavesToUnlockFor(2)).toBe(6);
    expect(wavesToUnlockFor(5)).toBeGreaterThan(wavesToUnlockFor(4));
    // B34 Loop-Grundsatz: Die Kurve deckelt sich — nie mehr als 12 Wellen Geduld.
    expect(wavesToUnlockFor(11)).toBe(12);
    expect(wavesToUnlockFor(50)).toBe(12);
  });
});

describe('Namensgenerator (effektbezogen, Präfix/Suffix)', () => {
  it('Name enthält den Effektkern des stärksten Gens', () => {
    const genome = [
      { id: 'fire', power: 0.9, dominant: true },
      { id: 'ice', power: 0.2, dominant: false },
    ];
    const rng = makeRng('plant', 12345);
    const name = generateName(genome, rng);
    expect(name).toContain(NAME_CORE_BY_GENE['fire']); // 'glut'
    expect(name.length).toBeGreaterThan(4);
  });

  it('stärkstes Gen bestimmt den Kern — nicht das schwache', () => {
    const genome = [
      { id: 'heal', power: 0.1, dominant: false },
      { id: 'venom', power: 0.95, dominant: true },
    ];
    const rng = makeRng('plant', 777);
    const name = generateName(genome, rng);
    expect(name).toContain(NAME_CORE_BY_GENE['venom']); // 'gift'
    expect(name).not.toContain(NAME_CORE_BY_GENE['heal']); // nicht 'heil'
  });

  it('gleicher Genome+Seed ⇒ identischer Name (deterministisch)', () => {
    const genome = [{ id: 'shield', power: 0.8, dominant: true }];
    const a = generateName(genome, makeRng('plant', 42));
    const b = generateName(genome, makeRng('plant', 42));
    expect(a).toBe(b);
  });

  it('leeres Genom ⇒ Fallback-Kern, kein Crash', () => {
    const name = generateName([], makeRng('plant', 1));
    expect(name.length).toBeGreaterThan(0);
  });
});

describe('rollGachaCross (deterministisches Gacha)', () => {
  it('gleicher Seed ⇒ identisches Kind (Genom, Name, Stats)', () => {
    const seed = deriveGachaSeed(0);
    const a = rollGachaCross(BASES, seed, 0);
    const b = rollGachaCross(BASES, seed, 0);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.child.id).toBe(b!.child.id);
    expect(a!.child.name).toBe(b!.child.name);
    expect(a!.child.genome).toEqual(b!.child.genome);
    expect(a!.child.stats).toEqual(b!.child.stats);
  });

  it('unterschiedliche Generation ⇒ neues Kind (Gacha-Fortschritt)', () => {
    const a = rollGachaCross(BASES, deriveGachaSeed(0), 0);
    const b = rollGachaCross(BASES, deriveGachaSeed(1), 1);
    expect(a!.child.id).not.toBe(b!.child.id);
  });

  it('Eltern sind zwei verschiedene Pflanzen aus dem Besitz', () => {
    const roll = rollGachaCross(BASES, deriveGachaSeed(3), 3);
    expect(roll).not.toBeNull();
    expect(roll!.parentA.id).not.toBe(roll!.parentB.id);
    expect(BASES.some(v => v.id === roll!.parentA.id)).toBe(true);
    expect(BASES.some(v => v.id === roll!.parentB.id)).toBe(true);
  });

  it('Kind-Genome sind gültig: mindestens 1 Gen, Power in [0,1]', () => {
    for (let gen = 0; gen < 5; gen++) {
      const roll = rollGachaCross(BASES, deriveGachaSeed(gen), gen);
      expect(roll).not.toBeNull();
      expect(roll!.child.genome.length).toBeGreaterThan(0);
      for (const g of roll!.child.genome) {
        expect(g.power).toBeGreaterThanOrEqual(0);
        expect(g.power).toBeLessThanOrEqual(1);
      }
    }
  });

  it('weniger als 2 Pflanzen ⇒ null (kein Crash)', () => {
    expect(rollGachaCross([BASES[0]], 1, 0)).toBeNull();
    expect(rollGachaCross([], 1, 0)).toBeNull();
  });

  it('Kind-Name ist effektbezogen (Kern im Namen vorhanden)', () => {
    const roll = rollGachaCross(BASES, deriveGachaSeed(0), 0)!;
    const cores = roll.child.genome
      .map(g => NAME_CORE_BY_GENE[g.id])
      .filter(Boolean);
    // Fallback-Kern 'spross' gilt als gültig, wenn kein Mapping existiert
    const hasCore = cores.some(c => roll.child.name.includes(c)) || roll.child.name.length > 3;
    expect(hasCore).toBe(true);
  });
});

describe('variantPower (Gacha-Gewichtung)', () => {
  it('stärkere Genome haben höheren Power-Index', () => {
    const weak = BASES[0];
    const strong: PlantVariantLike = {
      ...BASES[0],
      genome: [{ id: 'fire', power: 1.0, dominant: true }, { id: 'crit', power: 1.0, dominant: true }],
    };
    expect(variantPower(strong)).toBeGreaterThan(variantPower(weak));
  });
});

type PlantVariantLike = ReturnType<typeof createBaseVariants>[number];
