// B38-Nachweis: PLANT_ROUTE_COST wirkt identisch auf die Leih-Pflanze (loan_sprout).
// computeRoute taxiert ZELL-basiert über state.plants (mapSystem plantPenalty) — die
// Leih-Pflanze ist nach D2b eine normale PlantEntity, also ohne Sonderbehandlung im
// Cost-Field. Dieser Test pinnt die Naht: D2b-Platzierbarkeit × B38-Maze-Wirkung.
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';
import { deriveLoanPlant, LOAN_PLANT_ID } from '../meta/loan';
import { deriveSeed } from '../core/rng';
import { GAME_SEED } from '../config';

function routeKey(root: SimulationRoot): string {
  const r = root.getSnapshot().currentRoute ?? [];
  return r.map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

/** Root wie App.tsx (D2/D2b): Run-Loadout trägt die Leih-ID, Run-bredStats die Stats. */
function loanRoot(): SimulationRoot {
  const runId = 1;
  const loan = deriveLoanPlant(runId);
  const runSeed = deriveSeed(GAME_SEED, 'world', 'run', runId, 1);
  const root = new SimulationRoot({
    seed: runSeed, runId,
    loadout: ['sprout', LOAN_PLANT_ID], loadoutStock: 99,
    bredStats: { [LOAN_PLANT_ID]: { ...loan.stats, cost: loan.cost, effects: [] } },
  });
  (root as unknown as { state: { resources: { energy: number } } }).state.resources.energy = 9999;
  // Weg-Bahn wie im B38-Datensatz: Reihe 7, gx 2..9
  for (let gx = 2; gx <= 9; gx++) root.commands.push(makeCommand(0, 'PLACE_TILE', gx, { gx, gy: 7, tile: 'path' }));
  root.stepOnce();
  return root;
}

describe('Maze × Leih-Pflanze: PLANT_ROUTE_COST greift auf loan_sprout', () => {
  beforeEach(() => resetIds());

  it('Leih-Pflanze ist auf der Weg-Bahn platzierbar und landet im Cost-Field (D2b-Naht)', () => {
    const root = loanRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: 4, gy: 7 }));
    root.stepOnce();
    const plants = root.getSnapshot().plants;
    expect(plants.some(p => p.variantId === LOAN_PLANT_ID && p.gx === 4 && p.gy === 7)).toBe(true);
  });

  it('Leih-Pflanze allein hält die Bahn (Tax 2 ≤ Umweg-Restkosten — wie jede Einzelpflanze)', () => {
    const base = routeKey(loanRoot());
    const root = loanRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: 4, gy: 7 }));
    root.stepOnce();
    expect(routeKey(root)).toBe(base);
  });

  it('Leih-Pflanze + normale Pflanze reissen den Kanal auf — identischer 2-Pflanzen-Knick (B38)', () => {
    const root = loanRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: 4, gy: 7 }));
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 101, { variantId: 'sprout', gx: 5, gy: 7 }));
    root.stepOnce();
    const r = root.getSnapshot().currentRoute!;
    // Knick über Reihe 6, 13 Knoten — exakt die B38-Form für n=2:
    expect(r.some(p => Math.round(p.y - 0.5) === 6)).toBe(true);
    expect(r.length).toBe(13);
  });
});
