// Balance-Datensatz (Maze-Schraube PLANT_ROUTE_COST, Source: map.source.ts).
//
// NEU GEMESSEN (Sonde 21.09.2026, Seed 2447771834, NACH dem Weg-Schnitt): Die leere Welt läuft
// über die RAND-ECKEN — Reihe 0 nach links, dann Spalte 0 hinunter (23 Wegpunkte, 22 Felder).
// Daraus folgt der ganze Datensatz:
//   · Eine Pflanze ist eine ORTS-Schraube: sie kostet `PLANT_ROUTE_COST` auf ihrer Zelle, die
//     Route weicht eine Gasse aus — der LAUFWEG bleibt 22 Felder (= kürzestmöglich), weil ein
//     pflanzenfreier monotomer Weg fast immer existiert: Pflanzen BLOCKIEREN nicht.
//   · Die LÄNGE schraubt nur ein BLOCKER: zwei versetzte Topf-Wände (Spalte 7 mit Lücke bei
//     gy=11, Spalte 5 mit Lücke bei gy=0) erzwingen einen Rückweg — gemessen 44 Felder statt 22,
//     also 22 Felder gewonnene Zeit unter Feuer. DAS ist der Maze-Gewinn.
// Der Vertrag unten pinnt beide Zahlen; sie sind die Tuning-Basis für PLANT_ROUTE_COST.
//
// Warum die alte Fassung weg ist: sie maß eine „Weg-Bahn" (Spalte 6), die es nur gab, weil der
// Spieler Weg-Tiles mit Gewicht 0,6 legen konnte. Seit der Weg das Pathfinding-ERGEBNIS ist
// (21.09.2026), gibt es diese Bahn nicht mehr — eine Pflanze auf Spalte 5 war in der Sonde
// wirkungslos, weil die Route dort gar nicht mehr läuft. Der neue Datensatz misst die Route,
// die es wirklich gibt.
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';
import { PLANT_ROUTE_COST } from '../config/map.source';
import { routeWalkTiles, routeIdealTiles } from './mapSystem';

const SEED = 2447771834;

/** Die leere Welt (Rand-Ecken-Route) — Bezugspunkt ALLER Vergleiche unten (gemessen). */
const EMPTY_ROUTE = '11,0>10,0>9,0>8,0>7,0>6,0>5,0>4,0>3,0>2,0>1,0>0,0'
  + '>0,1>0,2>0,3>0,4>0,5>0,6>0,7>0,8>0,9>0,10>0,11';

function routeKeyOf(root: SimulationRoot): string {
  const route = root.getSnapshot().currentRoute;
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

function routeOf(root: SimulationRoot) {
  return root.getSnapshot().currentRoute!;
}

/** Zelle eines Wegpunkts (Wegpunkte liegen auf Zellmitten). */
function cellOf(p: { x: number; y: number }): [number, number] {
  return [Math.floor(p.x), Math.floor(p.y)];
}

function onRoute(route: readonly { x: number; y: number }[], gx: number, gy: number): boolean {
  return route.some(p => Math.floor(p.x) === gx && Math.floor(p.y) === gy);
}

function fresh(materialStock?: Record<string, number>): SimulationRoot {
  return makeRoot({
    seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99,
    ...(materialStock ? { materialStock } : {}),
  });
}

describe('Maze-Balance-Datensatz: PLANT_ROUTE_COST ist eine ORTS-Schraube (Rand-Ecken-Modell)', () => {
  beforeEach(() => resetIds());

  it('Ist-Wert ist 2 (die dokumentierte Balance-Schraube)', () => {
    expect(PLANT_ROUTE_COST).toBe(2);
  });

  it('n=0: die leere Welt läuft über die Rand-Ecken — 22 Felder, genau kürzestmöglich', () => {
    const root = fresh();
    root.stepOnce();
    expect(routeKeyOf(root)).toBe(EMPTY_ROUTE);
    expect(routeWalkTiles(routeOf(root))).toBe(22);
    expect(routeIdealTiles(routeOf(root))).toBe(22); // kein Umweg ⇒ kein Maze-Gewinn
  });

  it('1 Pflanze auf der Route: die Route weicht eine Gasse aus — der LAUFWEG bleibt gleich lang', () => {
    const root = fresh();
    root.stepOnce();
    const [gx, gy] = cellOf(routeOf(root)[1]!); // der zweite Wegpunkt der Rand-Route
    expect([gx, gy]).toEqual([10, 0]);          // gemessen: Bezugszelle des Datensatzes

    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx, gy }));
    root.stepOnce();

    const after = routeOf(root);
    expect(routeKeyOf(root)).not.toBe(EMPTY_ROUTE);   // der Ort hat sich REAL geändert
    expect(onRoute(after, gx, gy)).toBe(false);       // die Pflanze wird UMGANGEN
    expect(after.some(p => Math.round(p.y - 0.5) === 1)).toBe(true); // die Ausweich-Gasse
    // Die Kern-Aussage: Pflanzen verkürzen den Laufweg NICHT — sie wählen nur seinen Ort.
    expect(routeWalkTiles(after)).toBe(22);
    expect(routeIdealTiles(after)).toBe(22);
  });

  it('Pflanzenreihe auf der Route (gy 0, gx 2..9): verlegt, verlängert aber nicht', () => {
    const root = fresh();
    let seq = 1;
    for (const gx of [2, 3, 4, 5, 6, 7, 8, 9]) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'sprout', gx, gy: 0 }));
    }
    root.stepOnce();

    const after = routeOf(root);
    expect(routeWalkTiles(after)).toBe(22);   // gemessen: identisch zum leeren Laufweg
    expect(routeIdealTiles(after)).toBe(22);
    for (const gx of [2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(onRoute(after, gx, 0), `Wegpunkt auf Pflanze ${gx},0`).toBe(false);
    }
  });

  it('nur BLOCKER schrauben die Länge: zwei versetzte Topf-Wände ergeben 44 statt 22 Felder', () => {
    // Spalte 7 bis auf (7,11) zu, Spalte 5 bis auf (5,0) zu: der Weg MUSS erst hinunter
    // (Lücke 7,11), dann wieder hinauf (Lücke 5,0) — ein Rückweg, kein monotoner Umweg.
    const root = fresh({ pot: 26 });
    let seq = 1;
    for (let gy = 0; gy <= 10; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 7, gy, tile: 'pot' }));
    }
    for (let gy = 1; gy <= 11; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();

    expect(Object.keys(root.getSnapshot().mapTiles).length).toBe(22); // alle 22 Wände stehen
    const after = routeOf(root);
    expect(onRoute(after, 7, 11)).toBe(true);  // die untere Lücke wird benutzt …
    expect(onRoute(after, 5, 0)).toBe(true);   // … und danach die obere
    expect(routeWalkTiles(after)).toBe(44);    // gemessen: der doppelte Weg
    expect(routeIdealTiles(after)).toBe(22);
    expect(routeWalkTiles(after)! - routeIdealTiles(after)!).toBe(22); // der Maze-Gewinn
  });
});
