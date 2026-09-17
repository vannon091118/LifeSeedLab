// D2b: Die Sim löst Stats über getPlantStats(variantId, bredStats) auf — PLANTS_SOURCE
// kennt loan_sprout NICHT. Ohne Stats-Eintrag lehnt place() mit no_inventory ab.
// Der Gate-Test pinnt den Vertrag: Run-bredStats müssen die Leih-Stats tragen.
import { describe, it, expect } from 'vitest';
import { deriveLoanPlant, LOAN_PLANT_ID } from './loan';
import { getPlantStats } from '../simulation/plantSystem';

const EFFECTS_BY_TYPE: Record<string, string[]> = {
  shooter: ['EFFECT_PIERCE'],
  wall: ['EFFECT_REFLECT'],
  support: ['EFFECT_HEAL'],
};

describe('D2b: Leih-Stats sind für die Sim auflösbar', () => {
  it('getPlantStats(loan_sprout) ohne Eintrag → null (die Lücke)', () => {
    expect(getPlantStats(LOAN_PLANT_ID, {})).toBeNull();
  });

  it('Run-bredStats mit Leih-Stats machen die Pflanze platzierbar — für jeden Chain-Ausgang', () => {
    for (let runId = 1; runId <= 12; runId++) {
      const variant = deriveLoanPlant(runId);
      const bredStats = {
        [LOAN_PLANT_ID]: {
          ...variant.stats,
          cost: variant.cost,
          effects: EFFECTS_BY_TYPE[variant.type] ?? [],
        },
      };
      const stats = getPlantStats(LOAN_PLANT_ID, bredStats);
      expect(stats, `runId=${runId}`).not.toBeNull();
      expect(stats!.hp, `runId=${runId}`).toBeGreaterThan(0);
      expect(stats!.range, `runId=${runId}`).toBeGreaterThan(0);
      expect(stats!.cooldown, `runId=${runId}`).toBeGreaterThan(0);
      expect(stats!.cost, `runId=${runId}`).toBe(variant.cost);
    }
  });

  it('Leih-Variante ist deterministisch (gleicher runId → identische Stats)', () => {
    const a = deriveLoanPlant(7);
    const b = deriveLoanPlant(7);
    expect(a.stats).toEqual(b.stats);
    expect(a.genome).toEqual(b.genome);
  });
});
