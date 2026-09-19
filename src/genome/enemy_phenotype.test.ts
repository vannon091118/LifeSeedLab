import { describe, it, expect, beforeEach } from 'vitest';
import { beetlePhenotypeKey } from './beetlePhenotype';
import { enemyAncestorFor, enemyGenomeFor, enemyPhenotypeFor } from './enemyPhenotype';
import { clearEnemyVisualCache, enemyDrawScale, enemyVisualFor, enemyVisualCacheSize } from '../visual/enemyVisuals';
import { ENEMY_GENOMES_SOURCE, type EnemyTypeId } from '../config/enemyGenome.source';
import { BEETLE_GENES_SOURCE } from '../config/beetles.source';
import { makeRng } from '../core/rng';

// Owner: Genome-Tests — Gegner-Phänotyp (P7 „global aktivieren“, 19.09.2026).
// Der Befund war „warum nutzen Gegner immer noch das alte Modell / sehen alle gleich aus“: die
// Gegner-Ebene zeichnete fünf feste Körper per switch. Jetzt gilt: Archetyp → Genom → Anatomie,
// derselbe Zeichenpfad wie der gezüchtete Käfer. Diese Datei pinnt genau diesen Vertrag.

const ARCHETYPES = Object.keys(ENEMY_GENOMES_SOURCE) as EnemyTypeId[];

describe('Gegner-Phänotyp — global aktiviert', () => {
  it('jeder Archetyp trägt ein Genom aus der EINEN Gen-Quelle (kein zweiter Gen-Pool)', () => {
    for (const typeId of ARCHETYPES) {
      const genome = enemyGenomeFor(typeId);
      expect(genome.length, `${typeId} ohne Gen`).toBeGreaterThan(0);
      for (const gene of genome) {
        expect(BEETLE_GENES_SOURCE[gene.id], `Gen ${gene.id} fehlt in BEETLE_GENES_SOURCE (${typeId})`).toBeDefined();
      }
    }
  });

  it('die fünf Archetypen sind fünf LESBARE Wesen (keine zwei gleichen Phänotypen)', () => {
    const keys = ARCHETYPES.map(typeId => beetlePhenotypeKey(enemyPhenotypeFor(typeId)));
    expect(new Set(keys).size, 'zwei Archetypen sehen identisch aus').toBe(ARCHETYPES.length);
  });

  it('der Schwarm FLIEGT und ist pelzig — „Hummel“ muss ein Insekt sein, kein Käfer', () => {
    const swarm = enemyPhenotypeFor('swarm');
    expect(swarm.plan).toBe('bee');
    expect(swarm.organs.wings).toBeGreaterThan(0.35);
    expect(swarm.organs.pelage).toBeGreaterThan(0.3);
    // Der Grunt bleibt die nackte Bodenform — ohne Flügel, ohne Pelz.
    const grunt = enemyPhenotypeFor('grunt');
    expect(grunt.plan).toBe('beetle');
    expect(grunt.organs.wings).toBeLessThan(0.25);
    expect(grunt.organs.pelage).toBeLessThan(0.22);
  });

  it('die Formmerkmale liegen nicht mehr alle im gleichen Eimer (Form/Kleid je Archetyp)', () => {
    const forms = new Set(ARCHETYPES.map(t => enemyPhenotypeFor(t).carapace.form));
    const dresses = new Set(ARCHETYPES.map(t => enemyPhenotypeFor(t).dress));
    expect(forms.size, 'alle Archetypen haben dieselbe Panzerform').toBeGreaterThan(2);
    expect(dresses.size, 'alle Archetypen haben dasselbe Panzerkleid').toBeGreaterThan(1);
  });

  it('Determinismus: derselbe Aufruf ergibt dasselbe Wesen (kein Strom, kein Zustand)', () => {
    for (const typeId of ARCHETYPES) {
      expect(beetlePhenotypeKey(enemyPhenotypeFor(typeId))).toBe(beetlePhenotypeKey(enemyPhenotypeFor(typeId)));
    }
    expect(beetlePhenotypeKey(enemyPhenotypeFor('boss', 'enemy-0007')))
      .toBe(beetlePhenotypeKey(enemyPhenotypeFor('boss', 'enemy-0007')));
  });

  it('Boss-Ausnahme: jeder Boss ist ein EINZELSTÜCK, ein normaler Archetyp ist es nicht', () => {
    expect(ENEMY_GENOMES_SOURCE.boss.individual).toBe(true);
    const a = beetlePhenotypeKey(enemyPhenotypeFor('boss', 'enemy-0007'));
    const b = beetlePhenotypeKey(enemyPhenotypeFor('boss', 'enemy-0009'));
    expect(a, 'zwei Bosse sind dasselbe Wesen').not.toBe(b);
    // Ein individualisierter Boss zieht genau EIN Zusatz-Gen aus dem Source-Pool.
    const pool = ENEMY_GENOMES_SOURCE.boss.individualPool!;
    expect(pool.length).toBeGreaterThan(0);
    expect(enemyGenomeFor('boss', 'enemy-0007').length).toBe(ENEMY_GENOMES_SOURCE.boss.genes.length + 1);
    // Nicht-individualisierte Archetypen ignorieren den Schlüssel vollständig.
    expect(beetlePhenotypeKey(enemyPhenotypeFor('grunt', 'enemy-0001')))
      .toBe(beetlePhenotypeKey(enemyPhenotypeFor('grunt', 'enemy-0002')));
  });

  it('die Gegner-Domäne bleibt unberührt (Präsentation darf Gameplay nie stören)', () => {
    // Der Archetyp-Phänotyp benutzt den visual-Namespace; der Gegner-Strom ist davon unabhängig.
    expect(makeRng('enemy', 12345).next()).toBe(0.6971246670000255);
    for (const typeId of ARCHETYPES) enemyPhenotypeFor(typeId);
    expect(makeRng('enemy', 12345).next()).toBe(0.6971246670000255);
  });

  it('der Archetyp ist als Vorfahre verwendbar (Anker für PvP: Brute = Gegner und Käfer)', () => {
    const ancestor = enemyAncestorFor('tank');
    expect(ancestor.specimenId).toBe('tank');
    expect(ancestor.generation).toBe(ENEMY_GENOMES_SOURCE.tank.generation);
    expect(ancestor.genome).toEqual(enemyGenomeFor('tank'));
  });
});

describe('Gegner-Visuals — Ableitung und Cache', () => {
  beforeEach(() => clearEnemyVisualCache());

  it('löst pro Archetyp genau ein Wesen auf und merkt es sich', () => {
    const first = enemyVisualFor('tank');
    const second = enemyVisualFor('tank');
    expect(second).toBe(first); // derselbe Cache-Eintrag, keine Neuableitung pro Frame
    expect(enemyVisualCacheSize()).toBe(1);
    for (const typeId of ARCHETYPES) enemyVisualFor(typeId);
    expect(enemyVisualCacheSize()).toBe(ARCHETYPES.length);
  });

  it('Bosse wachsen im Cache pro Erscheinen, normale Archetypen nicht', () => {
    enemyVisualFor('grunt');
    enemyVisualFor('grunt');
    enemyVisualFor('grunt');
    expect(enemyVisualCacheSize()).toBe(1);
    enemyVisualFor('boss', 'enemy-0007');
    enemyVisualFor('boss', 'enemy-0009');
    expect(enemyVisualCacheSize()).toBe(3);
  });

  it('die Zeichen-Größe kommt aus der Source, nicht aus dem Renderer', () => {
    expect(enemyDrawScale('boss')).toBeGreaterThan(enemyDrawScale('grunt'));
    expect(enemyDrawScale('swarm')).toBeLessThan(enemyDrawScale('tank'));
  });
});
