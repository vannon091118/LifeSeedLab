import { describe, it, expect } from 'vitest';
import type { Genome, PlantType } from '../types';
import { GENE_POOL } from './pool';
import { breedGenome, candidateRng, descriptorDistance, nearestDistance, rollCandidates } from './breeding';
import { plantPhenotypeOf, plantPhenotypeKey, plantMeasure } from './plantPhenotype';
import { basePlantVisualInput } from './visualMap';
import { resolveVisual } from '../visual/generator';
import { BREEDING, PLANT_DESCRIPTOR_AXES } from '../config/phenotype.source';

// „Eine Zuchtmaschine, zwei biologische Phänotyp-Sprachen" — hier wird die PFLANZEN-Seite
// gepinnt: Genom ⇒ organische Anatomie, deterministisch, Elternähnlichkeit in frühen
// Generationen, echte Neuheit der Kandidaten und Kombinations-Neuheit über die
// Interaktions-Achsen (rhythm/guard).

const A: Genome = [
  { id: 'fire', power: 0.9, dominant: true },
  { id: 'thorns', power: 0.5, dominant: true },
];
const B: Genome = [
  { id: 'ice', power: 0.85, dominant: false },
  { id: 'heal', power: 0.6, dominant: false },
];

const ph = (genome: Genome, generation: number, role: PlantType = 'shooter') =>
  plantPhenotypeOf({ genome, role, generation, id: 'x' });

const roll = (pairSeed: number, generation: number) => rollCandidates({
  pairSeed, namespace: 'plant', count: 3, measure: plantMeasure,
  make: (rng, index, attempt) => {
    const genome = breedGenome(A, B, rng, generation, GENE_POOL, attempt);
    return { candidate: genome, descriptor: ph(genome, generation).descriptor };
  },
});

describe('Pflanzen-Phänotyp: Ableitung und Determinismus', () => {
  it('gleiches Genom + Rolle + Generation ⇒ identischer Phänotyp (byte-gleich)', () => {
    const one = ph(A, 2);
    expect(ph(A, 2)).toEqual(one);
    expect(plantPhenotypeKey(one)).toBe(plantPhenotypeKey(ph(A, 2)));
  });

  it('der Phänotyp trägt echte Anatomie-Achsen (nicht Base+Extras+Scale)', () => {
    const p = ph(A, 1);
    expect(p.stalk.thickness).toBeGreaterThan(0);
    expect(p.leaves.count).toBeGreaterThanOrEqual(2);
    expect(p.descriptor).toHaveLength(PLANT_DESCRIPTOR_AXES.length);
    expect(p.pigment.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(['smooth', 'ribbed', 'hairy', 'warty']).toContain(p.surface.relief);
    expect(['solid', 'gradient', 'striped', 'speckled']).toContain(p.pigment.pattern);
    expect(['still', 'sway', 'whip', 'pulse']).toContain(p.motion.style);
    expect(['alternate', 'opposite', 'whorled']).toContain(p.leaves.arrangement);
    expect(['sparse', 'prickly', 'thicket', 'armour']).toContain(p.protection.dress);
  });

  it('derselbe Geninhalt ergibt dieselbe Anatomie — auch unter anderer Variant-ID', () => {
    expect(plantPhenotypeOf({ genome: A.map(g => ({ ...g })), role: 'shooter', generation: 1, id: 'y' }))
      .toEqual(ph(A, 1));
  });

  it('verschiedene Rollen wachsen sichtbar anders, auch bei gleichem Genom', () => {
    const shooter = ph(A, 1, 'shooter');
    const wall = ph(A, 1, 'wall');
    const support = ph(A, 1, 'support');
    expect(shooter.stalk.height).toBeGreaterThan(wall.stalk.height + 0.1);
    expect(wall.protection.thorns).toBeGreaterThan(shooter.protection.thorns);
    expect(descriptorDistance(shooter.descriptor, wall.descriptor)).toBeGreaterThan(0.01);
    expect(descriptorDistance(shooter.descriptor, support.descriptor)).toBeGreaterThan(0.01);
  });

  it('Grundpflanzen sind Individuen mit eigener Anatomie (Spross ≠ Wurzelmauer ≠ Myzel)', () => {
    const keys = (['sprout', 'rootwall', 'mycelia'] as const).map(id => {
      const input = basePlantVisualInput(id, 4242);
      expect(input, `${id} fehlt in PLANTS_SOURCE`).not.toBeNull();
      return resolveVisual(input!).variantKey;
    });
    expect(new Set(keys).size).toBe(3);
  });
});

describe('Interaktions-Achsen: Kombination statt Durchschnitt', () => {
  it('rhythm/guard sind Produkte der Abweichungen — kein Mittel der Eltern', () => {
    // Eltern mit gegensätzlichen Anlagen: der eine verzweigt stark und blättert wenig, der
    // andere umgekehrt. Paart die Rekombination beides stark, entsteht ein Wuchsrhythmus, den
    // KEIN Elternteil hatte — ein Mittel könnte das nie (es liegt immer zwischen ihnen).
    const A2: Genome = [{ id: 'rapid', power: 0.95, dominant: true }];  // branches hoch, leaves niedrig
    const B2: Genome = [{ id: 'ice', power: 0.95, dominant: true }];    // leaves mittel, relief hoch
    const parents = [ph(A2, 1), ph(B2, 1)];
    const pairSeed = 4711;
    let outside = 0;
    for (let i = 0; i < 12; i++) {
      const child = ph(breedGenome(A2, B2, candidateRng(pairSeed, 'plant', i, 0), 1, GENE_POOL), 1);
      for (const axis of ['rhythm', 'guard'] as const) {
        const lo = Math.min(...parents.map(p => p.interaction[axis]));
        const hi = Math.max(...parents.map(p => p.interaction[axis]));
        if (child.interaction[axis] < lo - 0.02 || child.interaction[axis] > hi + 0.02) outside++;
      }
    }
    expect(outside, 'keine Interaktions-Achse verlässt das Eltern-Intervall — Kreuzung ist nur Mittelwert').toBeGreaterThan(0);
  });

  it('die Interaktions-Achsen sind sichtbar: Stellung und Dornenkleid folgen ihnen', () => {
    const strong = ph([{ id: 'rapid', power: 0.9, dominant: true }, { id: 'thorns', power: 0.9, dominant: true }], 6);
    const weak = ph([{ id: 'ice', power: 0.05, dominant: false }, { id: 'heal', power: 0.05, dominant: false }], 1);
    expect(strong.interaction.rhythm).toBeGreaterThan(weak.interaction.rhythm);
    expect(['opposite', 'whorled']).toContain(strong.leaves.arrangement);
    expect(strong.protection.dress).not.toBe(weak.protection.dress);
  });
});

describe('Pflanzen-Phänotyp: Elternähnlichkeit, Drift, Kandidaten', () => {
  it('Generation 1 bleibt den Eltern erkennbar nah, Generation 9 löst sich messbar', () => {
    const parents = [ph(A, 1).descriptor, ph(B, 1).descriptor];
    let early = 0, late = 0;
    for (let s = 0; s < 12; s++) {
      const pairSeed = 1000 + s;
      const earlyChild = breedGenome(A, B, candidateRng(pairSeed, 'plant', 0, 0), 1, GENE_POOL);
      const deepChild = breedGenome(A, B, candidateRng(pairSeed, 'plant', 0, 0), 9, GENE_POOL);
      early += nearestDistance(ph(earlyChild, 1).descriptor, parents, plantMeasure);
      late += nearestDistance(ph(deepChild, 9).descriptor, parents, plantMeasure);
    }
    expect(late).toBeGreaterThan(early);
  });

  it('drei Kandidaten eines Paares sind drei unterscheidbare Individuen (gemessene Untergrenze)', () => {
    // Gemessen (Sonde, gewichtete Distanz, „unähnlichster von sechs“):
    //   Gen 1: Mittel 0,057–0,061 · schlechtestes Paar 0,027–0,042 (Seeds 1000–3059)
    //   Gen 5: Mittel 0,065–0,067 · schlechtestes Paar 0,026–0,047
    // Gepinnt wird der gemessene Boden — deutlich über dem Klon-Bereich (0,005–0,017).
    for (const generation of [1, 5]) {
      let worst = 1, sum = 0, n = 0;
      for (let s = 0; s < 20; s++) {
        const rolled = roll(1000 + s, generation);
        const ds = rolled.map(r => r.descriptor);
        for (let i = 0; i < 3; i++) {
          const d = nearestDistance(ds[i]!, ds.filter((_, j) => j !== i), plantMeasure);
          sum += d; n++;
          worst = Math.min(worst, d);
        }
        // Gemeinsame Herkunft bleibt sichtbar: jedes Kind trägt Eltern-Erbe.
        const parentIds = new Set([...A, ...B].map(g => g.id));
        for (const r of rolled) expect(r.candidate.filter(g => parentIds.has(g.id)).length, 'Kind ohne Eltern-Erbe').toBeGreaterThan(0);
      }
      const floor = generation === 1 ? 0.03 : 0.035;
      expect(worst, `Gen ${generation}: Kandidatenpaar unter der gemessenen Untergrenze`).toBeGreaterThan(floor);
      expect(sum / n, `Gen ${generation}: mittlere Distanz unter dem gemessenen Boden`).toBeGreaterThan(0.05);
    }
  });

  it('Kandidaten-Replay: derselbe Paar-Seed liefert dieselben drei Wesen (Reload-sicher)', () => {
    const genomes = (pairSeed: number) => roll(pairSeed, 2).map(r => r.candidate);
    expect(genomes(77)).toEqual(genomes(77));
    expect(genomes(77)).not.toEqual(genomes(78));
  });

  it('die Neuheitsschwelle wird fast immer erreicht (Neuheitsdruck greift)', () => {
    let unreached = 0, total = 0;
    for (let s = 0; s < 20; s++) {
      for (const r of roll(2000 + s, 5)) { total++; if (!r.reached) unreached++; }
    }
    expect(BREEDING.novelty.minDistance).toBeGreaterThan(0.04);
    expect(unreached / total, 'Neuheitsdruck wirkungslos — die Schwelle bleibt unerreichbar')
      .toBeLessThan(0.25);
  });

  it('ein gezüchtetes Kind ist ein vollwertiger Elternteil (Kette fällt nicht zurück)', () => {
    const child = breedGenome(A, B, candidateRng(555, 'plant', 0, 0), 3, GENE_POOL);
    const grandchild = breedGenome(child, B, candidateRng(556, 'plant', 0, 0), 4, GENE_POOL);
    expect(grandchild.length).toBeGreaterThan(0);
    expect(ph(grandchild, 4).descriptor).toHaveLength(PLANT_DESCRIPTOR_AXES.length);
    // Das Enkelkind ist als Elternteil wieder einsetzbar: dieselbe Ableitung, dieselbe Form.
    expect(ph(grandchild, 4)).toEqual(ph(grandchild.map(g => ({ ...g })), 4));
  });
});
