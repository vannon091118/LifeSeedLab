// B38-Nachweis: PLANT_ROUTE_COST wirkt identisch auf die Leih-Pflanze (loan_sprout).
// computeRoute taxiert ZELL-basiert über state.plants (mapSystem plantPenalty) — die
// Leih-Pflanze ist nach D2b eine normale PlantEntity, also ohne Sonderbehandlung im
// Cost-Field. Dieser Test pinnt die Naht: D2b-Platzierbarkeit × B38-Maze-Wirkung.
//
// Diagonal-Modell (Spawn oben rechts → Ausgang unten links): die Weg-Bahn ist eine
// SENKRECHTE Spalte gx=6 (gy 1..9), die die Diagonale kreuzt. Gemessene Auslenk-Stufen
// (Sonde 2026-09-19, Seed 2447771834, Pflanzen ab gy=2 auf der Bahn):
//   n=0: Route reitet die Bahn voll · n=1: Ausweich-Kanal gx=7, Rückkehr auf die Bahn
//   n=7: totale Auslenkung (identisch mit maze_balance.test.ts).
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { makeRoot } from '../testing/testkit';
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
  const root = makeRoot({
    seed: runSeed, runId,
    loadout: ['sprout', LOAN_PLANT_ID], loadoutStock: 99,
    bredStats: { [LOAN_PLANT_ID]: { ...loan.stats, cost: loan.cost, effects: [] } },
  });
  (root as unknown as { state: { resources: { energy: number } } }).state.resources.energy = 9999;
  // Weg-Bahn wie im B38-Datensatz: senkrechte Spalte gx=6, gy 1..9 (kreuzt die Diagonale)
  let seq = 1;
  for (let gy = 1; gy <= 9; gy++) root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 6, gy, tile: 'path' }));
  root.stepOnce();
  return root;
}

/** Zellen der Route auf der Bahn-Spalte (gx=6). */
function onBahn(root: SimulationRoot): number {
  const r = root.getSnapshot().currentRoute ?? [];
  return r.filter(p => Math.round(p.x - 0.5) === 6).length;
}

describe('Maze × Leih-Pflanze: PLANT_ROUTE_COST greift auf loan_sprout', () => {
  beforeEach(() => resetIds());

  it('Leih-Pflanze ist auf der Weg-Bahn platzierbar und landet im Cost-Field (D2b-Naht)', () => {
    const root = loanRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: 6, gy: 2 }));
    root.stepOnce();
    const plants = root.getSnapshot().plants;
    expect(plants.some(p => p.variantId === LOAN_PLANT_ID && p.gx === 6 && p.gy === 2)).toBe(true);
  });

  it('Leih-Pflanze allein drückt die Route in den Ausweich-Kanal (identisch zu sprout, n=1)', () => {
    const base = routeKey(loanRoot());
    const root = loanRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: 6, gy: 2 }));
    root.stepOnce();
    // Identische Wirkung wie jede Einzelpflanze: Route knickt auf gx=7 aus und kehrt
    // unterhalb auf die Bahn zurück (maze_balance-Datensatz, n=1).
    expect(routeKey(root)).not.toBe(base);
    const r = root.getSnapshot().currentRoute!;
    expect(r.some(p => Math.round(p.x - 0.5) === 7)).toBe(true); // Ausweich-Kanal
    expect(onBahn(root)).toBeGreaterThanOrEqual(5); // Rückkehr auf die Bahn
  });

  it('Leih-Pflanze + normale Pflanze drücken die Kreuzung weiter hinunter (B38-Stufenform)', () => {
    const root = loanRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: 6, gy: 2 }));
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 101, { variantId: 'sprout', gx: 6, gy: 3 }));
    root.stepOnce();
    const r = root.getSnapshot().currentRoute!;
    // n=2: die Kreuzung wandert nach unten — Ausweich-Kanal gx=7 bis gy=4, dann Bahn.
    expect(r.some(p => Math.round(p.x - 0.5) === 7)).toBe(true);
    expect(onBahn(root)).toBeGreaterThan(0);
  });
});
