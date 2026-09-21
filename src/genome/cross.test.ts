import { describe, it, expect } from 'vitest';
import { crossGenomes, deriveStats, deriveTraits } from './cross';
import { createBaseVariants } from './bases';
import { makeRng } from '../core/rng';
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

const powersOf = (genome: Genome, id: string): number[] =>
  genome.filter(g => g.id === id).map(g => g.power);

describe('crossGenomes — Mutation', () => {
  it('1) setzt Gene ein, die in KEINEM Elternteil liegen (Fremdgen-Zuwachs, p=0.15)', () => {
    const withNovel = SEEDS.filter(seed => cross(seed).some(g => !PARENT_IDS.has(g.id)));

    expect(withNovel.length, 'kein einziges Kind bekam ein Fremdgen').toBeGreaterThan(0);
  });

  it('2) würfelt Genstärken neu statt sie zu kopieren (Power-Jitter ±0.05)', () => {
    const parentPower = new Map<string, number>();
    for (const g of [...A, ...B]) parentPower.set(g.id, Math.max(parentPower.get(g.id) ?? 0, g.power));

    const jittered = SEEDS.filter(seed =>
      cross(seed).some(g => {
        const p = parentPower.get(g.id);
        return p !== undefined && Math.abs(g.power - p) > 1e-9;
      }),
    );

    expect(jittered.length).toBeGreaterThan(0);
  });

  // WICHTIG (Testkriterium, nicht Code): Ein Verlust kann nur gemessen werden, wo ein
  // dominantes Elterngen vorliegt, ein Gewinn nur, wo eines rezessiv ist. Sprout und Rootwall
  // tragen ausschließlich dominante Gene (plants.source) — mit diesem Paar ist „Dominanz
  // entsteht" strukturell unmöglich und die Messung wäre kein Bug-Beweis, sondern ein
  // Artefakt der Elternwahl. Deshalb: Verlust gegen (Sprout, Rootwall), Gewinn gegen
  // (Sprout, Mycelia) — letzteres ist die einzige Basis mit rezessiven Genen.
  it('3) lässt Dominanz driften (dominant → rezessiv und zurück)', () => {
    const MYCELIA: Genome = bases[2].genome;
    const crossRecessive = (seed: number): Genome => crossGenomes(A, MYCELIA, makeRng('plant', seed));

    const lostDominance = SEEDS.filter(seed =>
      cross(seed).some(g => {
        const parentDominant = [...A, ...B].some(p => p.id === g.id && p.dominant);
        return parentDominant && !g.dominant;
      }),
    );
    const gainedDominance = SEEDS.filter(seed =>
      crossRecessive(seed).some(g => {
        const parentPowers = [...A, ...MYCELIA].filter(p => p.id === g.id);
        const allRecessive = parentPowers.length > 0 && parentPowers.every(p => !p.dominant);
        return allRecessive && g.dominant;
      }),
    );

    expect(lostDominance.length, 'Dominanz kann nicht verloren gehen').toBeGreaterThan(0);
    expect(gainedDominance.length, 'Dominanz kann nicht entstehen').toBeGreaterThan(0);
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
