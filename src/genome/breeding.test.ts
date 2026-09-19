import { describe, it, expect } from 'vitest';
import type { Genome } from '../types';
import { makeRng } from '../core/rng';
import { GENE_POOL } from './pool';
import { BREEDING, driftFor } from '../config/phenotype.source';
import {
  breedGenome, carriedGenes, candidateRng, descriptorDistance, expressed, genomeKey,
  nearestDistance, parentSimilarityOk, rollCandidates, type Descriptor,
} from './breeding';

// Der gemeinsame Kern: Vererbung · Dominanz · rezessive Trägerschaft · stetige Drift ·
// Neuheit. Er darf keine Domäne kennen — Pflanzen und Käfer sind Adapter darüber.

// Ein gemeinsames Gen (fire) und je eines, das nur EIN Elternteil beisteuert
// (heavy bzw. ice) — damit sind Drift UND Trägerschaft in denselben Eltern prüfbar.
const A: Genome = [
  { id: 'fire', power: 0.9, dominant: true },
  { id: 'heavy', power: 0.4, dominant: false },
];
const B: Genome = [
  { id: 'fire', power: 0.5, dominant: false },
  { id: 'ice', power: 0.35, dominant: false },
];

const pair = (generation: number, ns: 'plant' | 'brood' = 'plant', seed = 4242) => {
  const out: Genome[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(breedGenome(A, B, candidateRng(seed, ns, i, 0), generation, GENE_POOL));
  }
  return out;
};

describe('Zuchtkern: Vererbung und Dominanz', () => {
  it('gleiche Eingaben ⇒ identische Kinder (Byte-Gleichheit, kein geteilter Strom)', () => {
    const first = pair(3);
    const second = pair(3);
    expect(first).toEqual(second);
  });

  it('die Reihenfolge der Eltern ändert das Ergebnis nicht (kanonische Gen-Ordnung)', () => {
    const ab = breedGenome(A, B, makeRng('plant', 7), 3, GENE_POOL);
    const ba = breedGenome(B, A, makeRng('plant', 7), 3, GENE_POOL);
    expect(ab).toEqual(ba);
  });

  it('stetige Drift: Generation 1 bleibt nah an den Eltern, späte Generationen lösen sich', () => {
    /**
     * Streuung um das ELTERN-MITTEL, nur für Gene, die BEIDE Eltern tragen. Gene von nur einem
     * Elternteil bleiben bewusst draußen: ihre Kraft folgt der Träger-Dämpfung (verborgen →
     * erwacht), nicht der Drift. Gemessen wird also genau der Drift-Anteil der Rekombination.
     */
    const spread = (generation: number): number => {
      const shared = [...A, ...B].filter(g => A.some(x => x.id === g.id) && B.some(x => x.id === g.id));
      let sum = 0;
      for (let seed = 0; seed < 60; seed++) {
        for (const g of breedGenome(A, B, makeRng('plant', seed), generation, GENE_POOL)) {
          const partner = shared.find(s => s.id === g.id);
          if (partner) sum += Math.abs(g.power - partner.power);
        }
      }
      return sum;
    };
    expect(spread(1)).toBeLessThan(spread(6));
    expect(driftFor(1)).toBeLessThan(0.2);      // frühe Drift ist klein — kein Schalter
    expect(driftFor(6)).toBeLessThan(BREEDING.drift.cap);
    expect(parentSimilarityOk([0.5, 0.5], [[0.5, 0.5]], 1)).toBe(true);
    expect(parentSimilarityOk([0, 0], [[1, 1]], 1)).toBe(false);
  });

  it('rezessive Wiederkehr: in Generation 1 verborgen (Träger), in Generation 9 erwacht', () => {
    // `ice` (rezessiv) steckt nur in B. Als Allel eines Elternteils startet es gedämpft —
    // unter der Sichtschwelle — und kommt mit wachsender Drift wieder über sie.
    let hidden = 0, awakened = 0, lost = 0, expressEarly = 0;
    for (let seed = 0; seed < 60; seed++) {
      const early = breedGenome(A, B, makeRng('plant', seed), 1, GENE_POOL);
      const late = breedGenome(A, B, makeRng('plant', seed), 9, GENE_POOL);
      if (carriedGenes(early).some(g => g.id === 'ice')) hidden++;
      if (expressed(late).some(g => g.id === 'ice')) awakened++;
      if (expressed(early).some(g => g.id === 'ice')) expressEarly++;
      if (!late.some(g => g.id === 'ice')) lost++;
    }
    expect(hidden, 'kein Träger in Gen 1 — die Anlage ist nicht verborgen, sondern weg').toBeGreaterThan(20);
    expect(expressEarly, 'die rezessive Anlage ist schon in Gen 1 sichtbar — keine Trägerschaft').toBeLessThan(hidden);
    expect(awakened, 'kein Träger ist je wieder erwacht').toBeGreaterThan(20);
    // Verlust ist die Ausnahme (carryLoss 0.15), nicht die Regel: die Linie verliert die Anlage
    // nicht in Generation 2, sie trägt sie weiter.
    expect(lost, 'Anlage verschwindet zu oft — Trägerschaft ist keine Trägerschaft mehr').toBeLessThan(20);
  });

  it('Herkunft ist Pflicht: kein Kind ohne jedes Eltern-Erbe', () => {
    // DISJUNKTE Eltern (kein gemeinsames Gen) sind der ungünstigste Fall für die Trägerschaft:
    // jede Anlage kann einzeln verloren gehen, und die Mutation könnte das Kind allein tragen.
    const X: Genome = [{ id: 'fire', power: 0.9, dominant: true }, { id: 'heavy', power: 0.4, dominant: false }];
    const Y: Genome = [{ id: 'rapid', power: 0.7, dominant: true }, { id: 'ice', power: 0.35, dominant: false }];
    for (let seed = 0; seed < 200; seed++) {
      for (const generation of [1, 5]) {
        const child = breedGenome(X, Y, makeRng('plant', seed), generation, GENE_POOL);
        const fromParents = child.filter(g => X.some(x => x.id === g.id) || Y.some(x => x.id === g.id));
        expect(fromParents.length, `Gen ${generation}, Seed ${seed}: Kind ohne Eltern-Erbe`).toBeGreaterThan(0);
      }
    }
  });

  it('Mutation ist deterministisch und kommt aus dem Pool', () => {
    const mutated = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const child = breedGenome(A, B, makeRng('plant', seed), 4, GENE_POOL);
      expect(breedGenome(A, B, makeRng('plant', seed), 4, GENE_POOL)).toEqual(child);
      for (const g of child) {
        mutated.add(g.id);
        expect(GENE_POOL[g.id], `Kind trägt ein Gen außerhalb des Pools: ${g.id}`).toBeDefined();
      }
    }
    // Mindestens ein Gen, das in KEINEM Elternteil lag, muss über 40 Seeds aufgetreten sein.
    const foreign = [...mutated].filter(id => !A.some(g => g.id === id) && !B.some(g => g.id === id));
    expect(foreign.length).toBeGreaterThan(0);
  });

  it('Genom-Kurzschlüssel hängt am Inhalt, nicht an der ID', () => {
    const child = breedGenome(A, B, makeRng('plant', 5), 2, GENE_POOL);
    expect(genomeKey(child)).toBe(genomeKey(child.map(g => ({ ...g }))));
    expect(genomeKey(child)).not.toBe(genomeKey(child.map(g => ({ ...g, power: g.power + 0.01 }))));
  });
});

describe('Zuchtkern: Kandidaten und Neuheit', () => {
  /** Deskriptor aus dem Kandidaten-Index — hier bewusst künstlich, damit die Neuheit prüfbar wird. */
  const make = (distance: (rng: { next: () => number }, index: number) => number, base = 0) =>
    (rng: { next: () => number }, index: number) => {
      const d = distance(rng, index);
      return { candidate: { index, d }, descriptor: [base + d, 0.5] as Descriptor };
    };

  it('liefert genau `count` Kandidaten, reproduzierbar', () => {
    const opts = { pairSeed: 99, namespace: 'plant' as const, count: 3, make: make(() => 0.5) };
    const a = rollCandidates(opts).map(c => c.descriptor);
    const b = rollCandidates(opts).map(c => c.descriptor);
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
  });

  it('Neuheit wird ERZWUNGEN: zu ähnliche Entwürfe werden deterministisch neu abgeleitet', () => {
    // Die ersten 2 Versuche liefern exakt den bekannten Deskriptor, erst der 3. weicht ab.
    let attemptLog: number[] = [];
    const result = rollCandidates({
      pairSeed: 5, namespace: 'plant', count: 1, known: [[0.5, 0.5]],
      make: (rng, index) => {
        const v = rng.next();
        attemptLog.push(v);
        const novelty = attemptLog.length >= 3 ? 0.9 : 0.5;
        return { candidate: { v, index }, descriptor: [novelty, 0.5] as Descriptor };
      },
    });
    expect(result[0]!.attempt).toBe(2);
    expect(nearestDistance(result[0]!.descriptor, [[0.5, 0.5]])).toBeGreaterThanOrEqual(BREEDING.novelty.minDistance);
  });

  it('die Neuheitsschleife endet immer und meldet, wenn die Schwelle unerreichbar war', () => {
    // Ein Erzeuger, der die Schwelle nie erreichen KANN: die Schleife darf nicht offen bleiben,
    // und sie muss ehrlich sagen, dass der Kandidat den Vergleich nicht gewonnen hat.
    const result = rollCandidates({
      pairSeed: 5, namespace: 'plant', count: 1, known: [[0.5, 0.5]],
      make: (_rng, index) => ({ candidate: index, descriptor: [0.5, 0.5] as Descriptor }),
    });
    expect(result[0]!.reached).toBe(false);
    expect(result[0]!.distance).toBeLessThan(BREEDING.novelty.minDistance);
    expect(result[0]!.candidate).toBe(0); // der unähnlichste (hier: erste) Entwurf
  });

  it('drei Kandidaten unterscheiden sich untereinander (auch ohne bekannte Varianten)', () => {
    const rolled = rollCandidates({
      pairSeed: 1234, namespace: 'brood', count: 3,
      make: (rng, index) => {
        const a = rng.next(), b = rng.next(), c = rng.next();
        return { candidate: index, descriptor: [a, b, c] as Descriptor };
      },
    });
    const ds = rolled.map(r => r.descriptor);
    expect(nearestDistance(ds[0]!, ds.slice(1))).toBeGreaterThanOrEqual(BREEDING.novelty.minDistance);
  });

  it('Deskriptor-Distanz ist eine echte Metrik (0 = gleich, symmetrisch)', () => {
    expect(descriptorDistance([1, 1], [1, 1])).toBe(0);
    expect(descriptorDistance([0, 0], [1, 0.5])).toBe(descriptorDistance([1, 0.5], [0, 0]));
    expect(nearestDistance([0, 0], [])).toBe(Infinity);
  });
});
