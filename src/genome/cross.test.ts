import { describe, it, expect } from 'vitest';
import { crossGenomes, deriveStats, deriveTraits } from './cross';
import { createBaseVariants } from './bases';
import { makeRng } from '../core/rng';
import { GENOME_SLOT_COUNT } from '../config/phenotype.source';
import { genomePower } from './breeding';
import type { Genome } from '../types';

// Gate für das Flaggschiff-Feature: Ist `crossGenomes` wirklich eine Kreuzung MIT Mutation,
// oder nur eine Auswahl unter Eltern-Genen? Die Antwort wird hier gemessen, nicht behauptet.
// Deterministisch: gleiche (Eltern, Seed) ⇒ gleiches Kind — deshalb sind die Schwellen stabil.

const bases = createBaseVariants();
const A: Genome = bases[0].genome;
const B: Genome = bases[1].genome;
const PARENT_IDS = new Set([...A, ...B].map(g => g.id));

/** 200 Seeds sind billig und machen die Aussage statistisch sicher (deterministisch, nicht zufällig). */
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);

const cross = (seed: number): Genome => crossGenomes(A, B, makeRng('plant', seed));
const crossBases = (seed: number): Genome => crossGenomes(A, B, makeRng('plant', seed));

const powersOf = (genome: Genome, id: string): number[] =>
  genome.filter(g => g.id === id).map(g => g.power);

describe('crossGenomes — Mutation', () => {
  it('1) setzt Gene ein, die in KEINEM Elternteil liegen (Fremdgen-Zuwachs, p=0.15)', () => {
    const withNovel = SEEDS.filter(seed => cross(seed).some(g => !PARENT_IDS.has(g.id)));

    expect(withNovel.length, 'kein einziges Kind bekam ein Fremdgen').toBeGreaterThan(0);
  });

  it('2) übernimmt die stärkere Anlage statt den Elternwert zu mitteln', () => {
    const parentPower = new Map<string, number>();
    for (const g of [...A, ...B]) parentPower.set(g.id, Math.max(parentPower.get(g.id) ?? 0, g.power));
    for (const seed of SEEDS.slice(0, 50)) {
      for (const childGene of cross(seed)) {
        const strongestParent = parentPower.get(childGene.id);
        if (strongestParent !== undefined) {
          expect(childGene.power, `Gen ${childGene.id} wurde zur Mitte verwässert`).toBeGreaterThanOrEqual(strongestParent);
        }
      }
    }
  });

  it('3) vererbt Dominanz und lässt rezessive Anlagen als Anlage weiterlaufen', () => {
    const dominantParent: Genome = [{ id: 'rapid', power: 0.8, dominant: true }];
    const recessiveParent: Genome = [{ id: 'heal', power: 0.55, dominant: false }];
    for (const seed of SEEDS) {
      const child = crossGenomes(dominantParent, recessiveParent, makeRng('plant', seed));
      const rapid = child.find(g => g.id === 'rapid');
      const heal = child.find(g => g.id === 'heal');
      if (rapid) expect(rapid.dominant, 'dominante Anlage wurde pro Kreuzung neu gewürfelt').toBe(true);
      if (heal) expect(heal.dominant, 'rezessive Anlage wurde dominant erfunden').toBe(false);
    }
  });

  it('4) bleibt deterministisch und dedupliziert (eine Wahrheit pro Gen-ID)', () => {
    for (const seed of SEEDS.slice(0, 25)) {
      expect(cross(seed)).toEqual(cross(seed));

      const ids = cross(seed).map(g => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('5) beliefert die abgeleiteten Sichten kohaerent (Stats/Traits nur aus dem Kind)', () => {
    const child = cross(SEEDS[0]);
    const stats = deriveStats('shooter', child);
    const traits = deriveTraits(child);

    expect(Number.isFinite(stats.hp)).toBe(true);
    expect(stats.cooldown).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(traits)).toBe(true);
    // Effekt-Tags gibt es nur für Gene über der Wahrnehmungsschwelle (0.2).
    expect(traits.every(t => child.some(g => g.power > 0.2))).toBe(true);
  });

  it('6) Genstärken bleiben im gültigen Bereich 0..1', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      for (const g of cross(seed)) {
        expect(g.power).toBeGreaterThanOrEqual(0);
        expect(g.power).toBeLessThanOrEqual(1);
        expect(powersOf(cross(seed), g.id).length).toBe(1);
      }
    }
  });

  it('7) Sonderfähigkeiten hängen an Rolle UND Gen (Aura, Reflex)', () => {
    // BLINDER FLECK (Mutations-Drill, Genom-Runde): Die Sonderfähigkeit war nirgends gepinnt —
    // wer die Wahrnehmungsschwelle der Aura auf 0.95 dreht oder den Wand-Reflex abschaltet,
    // machte die Unterstützung zur stummen Pflanze, ohne einen roten Test zu erzeugen.
    const genes = (id: string, power: number) => [{ id, power, dominant: true }];
    expect(deriveStats('support', genes('heal', 0.6)).special).toBe('heal_aura');
    expect(deriveStats('support', genes('heal', 0.21)).special).toBe('heal_aura');
    expect(deriveStats('support', genes('heal', 0.1)).special).toBeNull();
    expect(deriveStats('wall', genes('thorns', 0.5)).special).toBe('reflect');
    expect(deriveStats('wall', genes('thorns', 0.1)).special).toBeNull();
    // Rollen-Gate: dasselbe Gen auf einem Schützen löst keine der beiden Fähigkeiten aus.
    expect(deriveStats('shooter', genes('heal', 0.9)).special).toBeNull();
    expect(deriveStats('shooter', genes('thorns', 0.9)).special).toBeNull();
  });
});

describe('Pflanzenzucht: zehn vererbbare Gen-Slots', () => {
  it('Basen und ihre Kinder tragen zehn eindeutige Allele', () => {
    expect(bases.every(base => base.genome.length === GENOME_SLOT_COUNT)).toBe(true);
    for (const seed of SEEDS.slice(0, 50)) {
      const child = crossBases(seed);
      expect(child.length).toBe(GENOME_SLOT_COUNT);
      expect(new Set(child.map(g => g.id)).size).toBe(GENOME_SLOT_COUNT);
    }
  });

  it('gezielte Auslese über 15 Generationen gewinnt mindestens 50 Prozent Stärke', () => {
    const initial = bases.map(base => base.genome);
    const initialStrength = Math.max(...initial.map(genomePower));
    let population = initial;

    for (let generation = 1; generation <= 15; generation += 1) {
      const children: Genome[] = [];
      for (const left of population) {
        for (const right of population) {
          children.push(crossGenomes(left, right, makeRng('plant', 1000 + generation * 97)));
        }
      }
      population = children
        .sort((a, b) => genomePower(b) - genomePower(a))
        .slice(0, 3);
    }

    const selectedStrength = genomePower(population[0]!);
    expect(selectedStrength / initialStrength).toBeGreaterThanOrEqual(1.5);
  });
});
