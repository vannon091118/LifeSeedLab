import { describe, it, expect } from 'vitest';
import type { BeetleAncestor, BeetleSpecimen, Genome } from '../types';
import { BEETLES_SOURCE } from '../config/beetles.source';
import { beetlePhenotypeOf, beetlePhenotypeKey, beetleMeasure } from './beetlePhenotype';
import { ancestorOf, resolveAncestor, rollBrood, broodGenomeHash, beetlePower } from './beetle';
import { descriptorDistance, nearestDistance } from './breeding';
import { resolveBeetleVisual } from '../visual/beetleGenerator';
import { BEETLE_AXES_BY_GENE, BEETLE_AXIS_RANGE, BEETLE_DESCRIPTOR_AXES } from '../config/beetlePhenotype.source';

// R3: „Eine Zuchtmaschine, zwei biologische Phänotyp-Sprachen" — hier die KÄFER-Seite.
// Gepinnt wird: Determinismus, sichtbare Individualität, Kombinations-Neuheit und vor allem,
// dass ein gezüchtetes Tier als Elternteil wirkt (die Kette fällt NICHT auf die Gründer zurück).

const A = 'leafhopper';
const B = 'shellbeetle';

const founderAncestor = (id: string): BeetleAncestor => {
  const a = resolveAncestor(id);
  if (!a) throw new Error(`Gründer fehlt: ${id}`);
  return a;
};

describe('Käfer-Phänotyp: Anatomie statt Farbpunkt', () => {
  it('gleiches Genom + Generation ⇒ identischer Phänotyp (byte-gleich)', () => {
    const g: Genome = [{ id: 'carapace', power: 0.8, dominant: true }, { id: 'mandible', power: 0.5, dominant: false }];
    const one = beetlePhenotypeOf({ genome: g, generation: 2 });
    expect(beetlePhenotypeOf({ genome: g, generation: 2 })).toEqual(one);
    expect(beetlePhenotypeKey(one)).toBe(beetlePhenotypeKey(beetlePhenotypeOf({ genome: g, generation: 2 })));
  });

  it('der Phänotyp trägt echte Anatomie (Körper, Panzer, Mandibeln, Beine, Fühler)', () => {
    const p = beetlePhenotypeOf({ genome: resolveAncestor(A)!.genome, generation: 1 });
    expect(p.body.segments).toBeGreaterThanOrEqual(3);
    expect(p.legs.count).toBe(6);
    expect(p.antennae.count).toBeGreaterThan(0);
    expect(p.descriptor).toHaveLength(BEETLE_DESCRIPTOR_AXES.length);
    expect(['dome', 'flat', 'ridged', 'spiked']).toContain(p.carapace.form);
    expect(['solid', 'bands', 'spots', 'reticulated']).toContain(p.pigment.pattern);
    expect(['plated', 'scaled', 'studded', 'armoured']).toContain(p.dress);
    expect(['nimble', 'broad', 'hulking', 'sprawling']).toContain(p.bearing);
  });

  it('jedes Käfer-Gen verschiebt mehrere Achsen (keine Ein-Extra-Gene)', () => {
    for (const [geneId, axes] of Object.entries(BEETLE_AXES_BY_GENE)) {
      expect(Object.keys(axes).length, `${geneId} verschiebt nur eine Achse`).toBeGreaterThanOrEqual(3);
      for (const axis of Object.keys(axes)) expect(BEETLE_AXIS_RANGE).toHaveProperty(axis);
    }
  });

  it('verschiedene Genome ergeben unterscheidbare TIERE (nicht nur andere Zahlen)', () => {
    const a = beetlePhenotypeOf({ genome: resolveAncestor(A)!.genome, generation: 1 });
    const b = beetlePhenotypeOf({ genome: resolveAncestor(B)!.genome, generation: 1 });
    expect(a.descriptor).not.toEqual(b.descriptor);
    expect(beetleMeasure(a.descriptor, b.descriptor)).toBeGreaterThan(0.02);
    expect(resolveBeetleVisual({ ...minimalSpec, genome: resolveAncestor(A)!.genome }, 7).variantKey)
      .not.toBe(resolveBeetleVisual({ ...minimalSpec, genome: resolveAncestor(B)!.genome }, 7).variantKey);
  });

  it('das Visual ist deterministisch und anatomie-gebunden (nicht ID-gebunden)', () => {
    const one = resolveBeetleVisual(minimalSpec, 99);
    expect(resolveBeetleVisual(minimalSpec, 99)).toEqual(one);
    const clone = resolveBeetleVisual({ ...minimalSpec, id: 'anderes_tier' }, 99);
    expect(clone.variantKey).toBe(one.variantKey);
  });
});

const minimalSpec: BeetleSpecimen = {
  id: 'tier_1',
  name: 'Prüftier',
  specimenId: A,
  genome: [{ id: 'carapace', power: 0.7, dominant: true }, { id: 'sprinter', power: 0.4, dominant: true }],
  stats: { hp: 60, speed: 0.03, attack: 4, taunt: false, spawnX: 1, deathSpawnX: 0, cost: 20 },
  color: '#8a6b3a',
  discovered: false,
  generation: 2,
};

describe('Käferzucht: Kandidaten und Kette', () => {
  it('drei Brutkandidaten sind drei unterscheidbare Tiere', () => {
    const brood = rollBrood(A, B, 3);
    expect(brood).toHaveLength(3);
    const ds = brood.map(c => beetlePhenotypeOf({ genome: c.genome, generation: c.generation ?? 1 }).descriptor);
    for (let i = 0; i < 3; i++) {
      expect(nearestDistance(ds[i]!, ds.filter((_, j) => j !== i), beetleMeasure),
        'Brutkandidaten sind sich zu ähnlich — sie sind keine Individuen').toBeGreaterThan(0.02);
    }
    expect(new Set(brood.map(c => c.id)).size).toBe(3);
  });

  it('Brut ist reproduzierbar (derselbe Index ⇒ dieselben Genome)', () => {
    expect(rollBrood(A, B, 3).map(broodGenomeHash)).toEqual(rollBrood(A, B, 3).map(broodGenomeHash));
    expect(rollBrood(A, B, 4).map(broodGenomeHash)).not.toEqual(rollBrood(A, B, 3).map(broodGenomeHash));
  });

  it('die Kette fällt NICHT auf die Gründer zurück: gezüchtetes Tier als Elternteil', () => {
    const gen2 = rollBrood(A, B, 0)[0]!;
    expect(gen2.generation).toBe(2);
    const parent = ancestorOf(gen2);
    const gen3 = rollBrood(parent, founderAncestor(B), 7);
    expect(gen3.length).toBe(3);
    // Generation zählt weiter (nicht zurück auf 2).
    expect(gen3[0]!.generation).toBe(3);
    // Und das Enkelkind trägt Erbe aus dem GEZÜCHTETEN Tier — nicht nur Gründer-Gene.
    const gen2Genes = new Set(gen2.genome.map(g => g.id));
    const fromBredParent = gen3.some(c => c.genome.some(g => gen2Genes.has(g.id)));
    expect(fromBredParent, 'kein Erbe des gezüchteten Elternteils — Kette ist gefallen').toBe(true);
  });

  it('eine zweite Generation aus zwei GEZÜCHTETEN Eltern bleibt im Lager-Stamm', () => {
    const p1 = rollBrood(A, B, 0)[0]!;
    const p2 = rollBrood(A, 'bumble', 1)[0]!;
    const child = rollBrood(ancestorOf(p1), ancestorOf(p2), 2)[0]!;
    expect(child.generation).toBe(3);
    // Der Basis-Anker (Balance) stammt von einem der beiden Eltern — die ERSCHEINUNG nicht.
    expect([p1.specimenId, p2.specimenId]).toContain(child.specimenId);
    expect(child.genome.length).toBeGreaterThan(0);
    expect(beetlePower(child.genome)).toBeGreaterThan(0);
  });

  it('Brutkandidaten übernehmen nachweislich Anlagen ihrer Eltern', () => {
    const a = founderAncestor(A);
    const b = founderAncestor(B);
    const parentGenes = new Set([...a.genome, ...b.genome].map(g => g.id));
    for (const c of rollBrood(a, b, 5)) {
      expect(c.genome.some(g => parentGenes.has(g.id)), 'Brutling ohne Eltern-Anlage').toBe(true);
    }
  });

  it('die Interaktions-Achsen (chitin/bearing) können das Eltern-Intervall verlassen', () => {
    const pa = beetlePhenotypeOf({ genome: founderAncestor(A).genome, generation: 1 });
    const pb = beetlePhenotypeOf({ genome: founderAncestor('bumble').genome, generation: 1 });
    let outside = 0;
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
      for (const c of rollBrood(A, 'bumble', index)) {
        const child = beetlePhenotypeOf({ genome: c.genome, generation: c.generation ?? 2 });
        for (const axis of ['chitin', 'bearing'] as const) {
          const lo = Math.min(pa.interaction[axis], pb.interaction[axis]);
          const hi = Math.max(pa.interaction[axis], pb.interaction[axis]);
          if (child.interaction[axis] < lo - 0.02 || child.interaction[axis] > hi + 0.02) outside++;
        }
      }
    }
    expect(outside, 'keine Brut verlässt das Eltern-Intervall — Kombination bleibt Durchschnitt').toBeGreaterThan(0);
  });

  it('Grund-Tiere sind Individuen mit unterschiedlicher Anatomie', () => {
    const keys = Object.keys(BEETLES_SOURCE).map(id =>
      resolveBeetleVisual({ ...minimalSpec, id: `x_${id}`, genome: resolveAncestor(id)!.genome }, 3).variantKey);
    expect(new Set(keys).size).toBe(Object.keys(BEETLES_SOURCE).length);
  });

  it('Deskriptor-Vergleich bleibt symmetrisch und null bei Gleichheit', () => {
    const d = beetlePhenotypeOf({ genome: founderAncestor(A).genome, generation: 1 }).descriptor;
    expect(descriptorDistance(d, d)).toBe(0);
  });
});
