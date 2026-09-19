// Balance-Datensatz (Maze-Schraube PLANT_ROUTE_COST, Source: map.source.ts):
// Wie viel Zucht-Layout muss auf der Weg-Bahn stehen, damit der Laufweg den Kanal verlässt?
// Diagonal-Modell (Eigentümer-Regel: Spawn oben rechts, Ausgang unten links): die Bahn ist
// eine SENKRECHTE Spalte gx=6 (gy 1..9), die die Diagonale kreuzt. Messung (Sonde
// 2026-09-18, Seed 2447771834, Pflanzen ab gy=2 auf der Bahn):
//   n=0: Route reitet die Bahn voll (10 Zellen auf gx=6) — das Weg-Gewicht 0.6 zieht an
//   n=1..5: Route weicht neben der Bahn aus (gx=7 hinunter) und kehrt DARUNTER auf die
//           Bahn zurück (Kreuzungspunkt wandert mit n nach unten, 6-n Pflanzen links)
//   n=6: Route knickt auf gx=7 bis gy=8, kehrt bei gy=8/9 auf die Bahn zurück (2 Zellen)
//   n=7+: TOTALE Auslenkung — die Route läuft links (gx=5..0, Reihe 1) herunter,
//         die Bahn ist vollständig verlassen (2 Zellen Rand-Rest)
// Der Vertrag unten pinnt das Verhalten BEIM Ist-Wert (Source-Wahrheit); die Stufen sind
// die Tuning-Basis für PLANT_ROUTE_COST (Dokumentation + quality-spec.md).
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';
import { PLANT_ROUTE_COST } from '../config/map.source';

const SEED = 2447771834;

function routeKey(route: readonly { x: number; y: number }[] | null): string {
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

function rootWithBahn(nPlants: number): SimulationRoot {
  const root = makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
  // ENTFERNT (19.09.2026): hier stand `state.resources.energy = 9999` — ein Rest des
  // Energiesystems, das der Run nicht mehr kennt (kein Kontostand im Run). Die Zuweisung lief
  // ins Leere; mit dem Erfahrungstopf ist auch der letzte Rest des Feldes gefallen.
  // Senkrechte Weg-Bahn gx=6 (gy 1..9) — kreuzt die Diagonale Spawn→Ausgang
  let seq = 1;
  for (let gy = 1; gy <= 9; gy++) root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 6, gy, tile: 'path' }));
  // Pflanzen auf der Bahn ab gy=2 hinunter
  for (let i = 0; i < nPlants; i++) {
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100 + i, { variantId: 'sprout', gx: 6, gy: 2 + i }));
  }
  root.stepOnce();
  return root;
}

/** Zellen der Route auf der Bahn-Spalte (gx=6). */
function onBahn(route: readonly { x: number; y: number }[]): number {
  return route.filter(p => Math.round(p.x - 0.5) === 6).length;
}

describe('Maze-Balance-Datensatz: PLANT_ROUTE_COST = Bahn-Bruch-Schwelle (Diagonal-Modell)', () => {
  beforeEach(() => resetIds());

  it('Ist-Wert ist 2 (die dokumentierte Balance-Schraube)', () => {
    expect(PLANT_ROUTE_COST).toBe(2);
  });

  it('n=0: die Route reitet die Bahn voll — das Weg-Gewicht zieht die Diagonale an', () => {
    const r = rootWithBahn(0).getSnapshot().currentRoute!;
    expect(onBahn(r)).toBe(10); // gx=6 durchgehend gy 0..9
  });

  it('1 Pflanze auf der Bahn: der Kanal HÄLT (Route kehrt unterhalb auf die Bahn zurück)', () => {
    const base = routeKey(rootWithBahn(0).getSnapshot().currentRoute);
    const one = rootWithBahn(1).getSnapshot().currentRoute!;
    // Ausweichen neben der Bahn, aber Rückkehr: mehr als die Hälfte bleibt auf der Bahn
    expect(onBahn(one)).toBeGreaterThanOrEqual(5);
    expect(routeKey(one)).not.toBe(base); // der Knick ist real sichtbar
  });

  it('2 Pflanzen auf der Bahn: der Kanal REISST teils — die Kreuzung wandert nach unten', () => {
    const two = rootWithBahn(2).getSnapshot().currentRoute!;
    // n=2: Route knickt auf gx=7 (Ausweich-Kanal neben der Bahn), Rückkehr bei gy=4
    expect(two.some(p => Math.round(p.x - 0.5) === 7)).toBe(true);
    expect(onBahn(two)).toBeGreaterThan(0); // unterhalb der Pflanzen kehrt sie zurück
  });

  it('4 Pflanzen auf der Bahn: die Ausweich-Strecke wächst weiter (Kreuzung bei gy=6)', () => {
    const four = rootWithBahn(4).getSnapshot().currentRoute!;
    expect(four.some(p => Math.round(p.x - 0.5) === 7)).toBe(true);
    expect(onBahn(four)).toBe(4); // nur der Rest unterhalb der Pflanzen
  });

  it('7 Pflanzen auf der Bahn: totale Auslenkung — die Bahn ist verlassen', () => {
    const seven = rootWithBahn(7).getSnapshot().currentRoute!;
    expect(onBahn(seven)).toBe(2); // nur der Rand-Rest unterhalb der Bahn-Ende
    // Die Route läuft links herunter (Spalten 0..5 statt der Bahn):
    expect(seven.some(p => Math.round(p.x - 0.5) === 5)).toBe(true);
    expect(seven.some(p => Math.round(p.x - 0.5) === 1)).toBe(true);
  });
});
