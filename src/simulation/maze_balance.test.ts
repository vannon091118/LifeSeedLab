// Balance-Datensatz (Maze-Schraube PLANT_ROUTE_COST, Source: map.source.ts):
// Wie viel Zucht-Layout muss auf der Weg-Bahn stehen, damit der Laufweg den Kanal verlässt?
// Messung (Probe mit vi.mock-Override, 2026-09-18, Seed 2447771834, Weg-Bahn Reihe 7 gx 2..9,
// Pflanzen ab gx=4 auf der Bahn):
//   cost=1: Kanal reißt erst bei n=4  → Maze-Wirkung fast tot (Tax 1 < Umweg-Restkosten 2)
//   cost=2: Kanal reißt bei n=2       → Ist-Wert: 2 Pflanzen reissen den Kanal auf
//   cost=3: Kanal reißt bei n=1       → jede Pflanze auf der Bahn lenkt sofort aus
// Post-Break (Ist 2): n=2/3 → Knicks in Reihe 6 (13 Knoten), n=4 → totale Auslenkung (Reihe 0).
// Der Vertrag unten pinnt das Verhalten BEIM Ist-Wert (Source-Wahrheit) — die Vergleichswerte
// 1/3 leben als Dokumentation hier und in quality-spec.md (Tuning-Basis).
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';
import { PLANT_ROUTE_COST } from '../config/map.source';

const SEED = 2447771834;

function routeKey(route: readonly { x: number; y: number }[] | null): string {
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

function rootWithBahn(nPlants: number): SimulationRoot {
  const root = new SimulationRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
  (root as unknown as { state: { resources: { energy: number } } }).state.resources.energy = 9999;
  for (let gx = 2; gx <= 9; gx++) root.commands.push(makeCommand(0, 'PLACE_TILE', gx, { gx, gy: 7, tile: 'path' }));
  for (let i = 0; i < nPlants; i++) {
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100 + i, { variantId: 'sprout', gx: 4 + i, gy: 7 }));
  }
  root.stepOnce();
  return root;
}

describe('Maze-Balance-Datensatz: PLANT_ROUTE_COST = Bahn-Bruch-Schwelle', () => {
  beforeEach(() => resetIds());

  it('Ist-Wert ist 2 (die dokumentierte Balance-Schraube)', () => {
    expect(PLANT_ROUTE_COST).toBe(2);
  });

  it('1 Pflanze auf der Bahn: der Kanal HÄLT (Tax 2 ≤ Umweg-Restkosten)', () => {
    const base = routeKey(rootWithBahn(0).getSnapshot().currentRoute);
    const one = routeKey(rootWithBahn(1).getSnapshot().currentRoute);
    expect(one).toBe(base);
  });

  it('2 Pflanzen auf der Bahn: der Kanal REISST — Route weicht in Reihe 6 aus', () => {
    const base = routeKey(rootWithBahn(0).getSnapshot().currentRoute);
    const two = rootWithBahn(2).getSnapshot().currentRoute!;
    expect(routeKey(two)).not.toBe(base);
    // Der Ausweg läuft über Reihe 6 (Knick), nicht übers Feld-Rand:
    expect(two.some(p => Math.round(p.y - 0.5) === 6)).toBe(true);
    expect(two.length).toBe(13); // 12 Knoten + 1 Knick
  });

  it('4 Pflanzen auf der Bahn: totale Auslenkung — die Bahn ist verlassen', () => {
    const four = rootWithBahn(4).getSnapshot().currentRoute!;
    expect(four.some(p => Math.round(p.y - 0.5) === 7)).toBe(false);
  });
});
