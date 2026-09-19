import { describe, it, expect } from 'vitest';
import { EFFECTS_SOURCE, EFFECT_IDS, isValidEffect } from './effects.source';
import { GENE_EFFECTS } from './genes.source';
import { GENE_POOL } from '../genome/pool';
import {
  PLANT_AXES_BY_GENE, PLANT_AXIS_RANGE, PLANT_PIGMENT_RAMP, PLANT_HABIT_BY_ROLE, BREEDING,
} from './phenotype.source';
import { PLANTS_SOURCE } from './plants.source';

// Gate der Content-Quellen (R3). Die alte BASE/EXTRA-Vokabel ist GESTORBEN: es gibt keine
// Silhouetten-Liste und keine Aufsatz-Kompatibilität mehr, die eine Pflanze hätte wegfiltern
// können. An ihre Stelle treten zwei Prüfungen, die die neue Grammatik absichern:
// jedes Gen hat einen Gameplay-Effekt UND mindestens eine sichtbare Achse.

describe('Phase 5 gate: source validation', () => {
  it('exactly 10 effects exist', () => {
    expect(EFFECT_IDS).toHaveLength(10);
  });

  it('jedes Pool-Gen hat einen Gameplay-Effekt aus der Source', () => {
    for (const geneId of Object.keys(GENE_POOL)) {
      const effect = GENE_EFFECTS[geneId];
      expect(effect, `Gen ohne Wirkung: ${geneId}`).toBeDefined();
      expect(isValidEffect(effect), `${geneId} → ${effect}`).toBe(true);
      expect(EFFECTS_SOURCE[effect]).toBeDefined();
    }
    expect(Object.keys(GENE_EFFECTS)).toHaveLength(Object.keys(GENE_POOL).length);
  });

  it('KEIN Gen ist auf den Gameplay-Effekt reduziert: jedes verschiebt Phänotyp-Achsen', () => {
    // Genau das war der Befund des alten Modells: „dieses Gen erzeugt einfach ein Extra“.
    // Ein Gen, das nur wirkt und nichts zeigt, wäre wieder dieselbe Informationsvernichtung.
    for (const geneId of Object.keys(GENE_POOL)) {
      const axes = PLANT_AXES_BY_GENE[geneId];
      expect(axes, `Gen ohne sichtbare Achse: ${geneId}`).toBeDefined();
      expect(Object.keys(axes!).length, `${geneId} verschiebt nur eine Achse`).toBeGreaterThanOrEqual(3);
    }
    expect(Object.keys(PLANT_AXES_BY_GENE)).toHaveLength(Object.keys(GENE_POOL).length);
  });

  it('jede Gen-Achse liegt im geklemmten Fenster und benennt eine bekannte Achse', () => {
    for (const [geneId, axes] of Object.entries(PLANT_AXES_BY_GENE)) {
      for (const [axis, amount] of Object.entries(axes)) {
        expect(PLANT_AXIS_RANGE, `${geneId} → unbekannte Achse ${axis}`).toHaveProperty(axis);
        expect(Math.abs(amount), `${geneId}.${axis} außerhalb des Wirkfensters`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('Rollen-Tendenz und Pigment-Rampe sind vollständig (Anatomie braucht einen Grundton)', () => {
    for (const role of Object.keys(PLANTS_SOURCE).map(id => PLANTS_SOURCE[id as keyof typeof PLANTS_SOURCE].role)) {
      expect(PLANT_HABIT_BY_ROLE[role]).toBeDefined();
    }
    expect(PLANT_PIGMENT_RAMP.length).toBeGreaterThanOrEqual(6);
    for (const [base, accent] of PLANT_PIGMENT_RAMP) {
      expect(base).toMatch(/^#[0-9a-f]{6}$/i);
      expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('Zucht-Kurve ist eine stetige Drift-Kurve, kein Generations-Schalter', () => {
    // Die Drift darf NIE springen: G1 nah an den Eltern, später freier, aber monoton wachsend
    // und nach oben begrenzt. Ein harter Schalter („ab Gen 4 frei“) würde hier auffallen.
    const d = [1, 2, 3, 4, 5, 8, 13].map(g => BREEDING.drift.start + (BREEDING.drift.cap - BREEDING.drift.start) * (1 - Math.pow(BREEDING.drift.retain, g - 1)));
    for (let i = 1; i < d.length; i++) {
      expect(d[i]!, `Drift fällt von Generation ${i} auf ${i + 1}`).toBeGreaterThan(d[i - 1]!);
      expect(d[i]! - d[i - 1]!, 'Sprung statt stetiger Drift').toBeLessThan(0.3);
    }
    expect(d[0]!).toBeLessThan(0.2);
    expect(d[d.length - 1]!).toBeLessThan(BREEDING.drift.cap);
  });

  it('R2: die Route ist das Pathfinding-Ergebnis — es gibt keinen Fallback-Pfad mehr', async () => {
    const world = (await import('./world.source')) as unknown as Record<string, unknown>;
    expect(world.resolveActiveRoute).toBeUndefined();
    expect(world.ENEMY_PATH).toBeUndefined();
    expect(typeof world.isInsideWorld).toBe('function');
  });

  it('M4 (Sprint AP2): Weg-Gewicht ist source-only und bleibt unter der Wiese — 0.6 statt 0.45', async () => {
    const { MAP_TILES_SOURCE } = await import('./map.source');
    expect(MAP_TILES_SOURCE.path.weight).toBe(0.6);
    expect(MAP_TILES_SOURCE.path.weight).toBeLessThan(1);
    expect(MAP_TILES_SOURCE.decor.weight).toBe(1);
  });

  it('D4: PLANT_ROUTE_COST ist source-driven und Sim-Semantik passend (> DEFAULT_WEIGHT)', async () => {
    const { PLANT_ROUTE_COST, MAP_DEFAULT_WEIGHT, MAP_TILES_SOURCE } = await import('./map.source');
    expect(PLANT_ROUTE_COST).toBe(2);
    expect(PLANT_ROUTE_COST).toBeGreaterThan(MAP_DEFAULT_WEIGHT);
    expect(PLANT_ROUTE_COST).toBeLessThan(MAP_TILES_SOURCE.boulder.weight);
  });
});
