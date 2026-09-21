// D1-Beweis (Maze-Drift): Pflanzen biegen den Laufweg SOFORT und auch OHNE gekaufte Tiles.
// Der Plan-Satz „das Zucht-Layout wirkt als Maze-Bauwerk" ist hier als Sim-Vertrag gepinnt.
//
// NEU GEMESSEN (Sonde 21.09.2026, Seed 2447771834, nach dem Weg-Schnitt): Die leere Welt läuft
// über die RAND-ECKEN — Reihe 0 nach links, dann Spalte 0 hinunter (22 Felder, 23 Wegpunkte).
// Die alte Fassung legte zuerst einen Weg-Korridor (Gewicht 0,6) und schob dann eine Pflanzenwand
// hindurch — diesen Griff gibt es nicht mehr: der Weg ist das Pathfinding-Ergebnis. Gemessen ist
// eine Pflanzenwand auf Spalte 5 heute WIRKUNGSLOS (die Route läuft dort nicht), eine Pflanze AUF
// der Route dagegen sofort wirksam. Genau das prüfen die beiden Fälle unten.
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';
import { routeWalkTiles, routeIdealTiles } from './mapSystem';

const SEED = 2447771834;

/** Die leere Welt (Rand-Ecken-Route) — Bezugspunkt aller Vergleiche (gemessen). */
const EMPTY_ROUTE = '11,0>10,0>9,0>8,0>7,0>6,0>5,0>4,0>3,0>2,0>1,0>0,0'
  + '>0,1>0,2>0,3>0,4>0,5>0,6>0,7>0,8>0,9>0,10>0,11';

/** Zelle des zweiten Wegpunkts der leeren Route (gemessen). */
const ANCHOR: readonly [number, number] = [10, 0];

function routeOf(root: SimulationRoot): readonly { x: number; y: number }[] | null {
  return root.getSnapshot().currentRoute;
}

/** Route-Knoten als String (Zellzentren, gerundet) — direkter Geometrie-Vergleich. */
function routeKey(route: readonly { x: number; y: number }[] | null): string {
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

function onRoute(route: readonly { x: number; y: number }[], gx: number, gy: number): boolean {
  return route.some(p => Math.floor(p.x) === gx && Math.floor(p.y) === gy);
}

function fresh(): SimulationRoot {
  return makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
}

describe('D1 — Pflanzen sind Maze-Bauwerk (auch ohne Tiles)', () => {
  beforeEach(() => { resetIds(); });

  it('PLACE_PLANT biegt die Route SOFORT: EINE Pflanze auf dem Weg verlegt ihn', () => {
    const root = fresh();
    // R2: ohne Platzierung ist die Route der GERADE Weg (Pathfinding-Ergebnis der leeren Welt)
    // — sie wird im ROOT-KONSTRUKTOR abgeleitet (Run-Start-Vertrag).
    root.stepOnce();
    const before = routeKey(routeOf(root));
    expect(before).toBe(EMPTY_ROUTE);

    // EINE Pflanze auf dem zweiten Wegpunkt (10,0) — mehr braucht der Beweis nicht.
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: ANCHOR[0], gy: ANCHOR[1] }));
    root.stepOnce();

    // D1-Kern: SOFORT nach der Platzierung biegt die berechnete Route um —
    // die Pflanze verteuert ihre Zelle (PLANT_ROUTE_COST) und drückt den Weg davon.
    expect(routeOf(root)).not.toBeNull();
    expect(routeOf(root)!.length).toBeGreaterThan(1);
    expect(routeKey(routeOf(root))).not.toBe(before);
    // Präzise: der ORT ändert sich, die LÄNGE nicht (Pflanzen blockieren nicht).
    expect(routeWalkTiles(routeOf(root))).toBe(22);
  });

  it('Pflanzenreihe AUF der Route verlegt sie eine Gasse weiter — kein Wegpunkt auf einer Pflanze', () => {
    const root = fresh();
    root.stepOnce();
    const before = routeKey(routeOf(root));

    // Reihe auf gy=0 (gx 2..9) — die Pflanzenwand liegt quer über dem waagerechten Teil der Route.
    let seq = 1;
    for (const gx of [2, 3, 4, 5, 6, 7, 8, 9]) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'sprout', gx, gy: 0 }));
    }
    root.stepOnce();
    const after = routeOf(root);

    expect(after).not.toBeNull();
    expect(routeKey(after)).not.toBe(before); // die Pflanzenwand hat den Lauf REAL verlegt
    // Die Wand wird UMGANGEN, nicht durchquert — die Route weicht auf die Gasse darunter aus.
    for (const gx of [2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(onRoute(after!, gx, 0), `Wegpunkt auf Pflanze ${gx},0`).toBe(false);
    }
    expect(after!.some(p => Math.round(p.y - 0.5) === 1)).toBe(true);
    expect(routeWalkTiles(after)).toBe(22); // gemessen: kein Längen-Gewinn aus Pflanzen
  });

  it('REMOVE_PLANT zieht nach: Route kehrt zur freien Geometrie zurück', () => {
    const root = fresh();
    root.stepOnce();
    const straight = routeKey(routeOf(root)); // R2: der gerade Weg der leeren Welt

    // Dieselbe Pflanzenreihe wie oben (gy=0, auf der Route) — sie verlegt den Weg REAL.
    let seq = 1;
    const placed: string[] = [];
    for (const gx of [2, 3, 4, 5, 6, 7, 8, 9]) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'sprout', gx, gy: 0 }));
    }
    root.stepOnce();
    for (const p of root.getSnapshot().plants) placed.push(p.id);
    const withPlants = routeKey(routeOf(root));
    expect(withPlants).not.toBe(straight); // die Reihe hat den Weg verlegt

    for (const id of placed) {
      root.commands.push(makeCommand(0, 'REMOVE_PLANT', seq++, { plantId: id }));
    }
    root.stepOnce();

    // R2: ohne Pflanzen UND ohne Tiles kehrt die Route zum GERADEN Weg zurück —
    // der Weg hat auf die Entfernung reagiert.
    const after = routeKey(routeOf(root));
    expect(after).toBe(straight);
  });

  it('Laufweg-Messung: gerade = kürzestmöglich, Baffle = länger als der kürzeste Weg', () => {
    // Warum Unit statt Integration: Die Messung selbst wird hier gepinnt; die Maze-Lebendigkeit
    // decken die Tests oben und `maze_balance.test.ts` (Blocker-Gewinn) ab.
    //
    // VERTRAG (Entscheidung 19.09.2026): Statt einer Prozent-Quote, die „gerade" nicht von
    // „monoton gebogen" unterscheiden konnte, misst der HUD den LAUFWEG in Feldern. Der
    // Maze-Gewinn ist der ABSTAND zwischen echtem Weg und dem kürzestmöglichen — genau das
    // prüft dieser Test an beiden Formen.
    const cells = (pts: [number, number][]) => pts.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));

    const straight = cells(Array.from({ length: 12 }, (_, gx) => [gx, 2] as [number, number]));
    expect(routeWalkTiles(straight)).toBe(11);   // 11 Felder von gx=0 bis gx=11
    expect(routeIdealTiles(straight)).toBe(11);  // kürzestmöglich = derselbe Wert ⇒ kein Umweg

    // Baffle (wie der Design-Pfad): 11 Schritte hin, 4 runter, 5 ZURÜCK, 1 runter, 4 hin —
    // 25 Manhattan-Schritte; kürzestmöglich sind |10-0| + |7-2| = 15 (Endpunkte gx 0→10).
    const baffle = cells([
      ...Array.from({ length: 12 }, (_, i) => [i, 2] as [number, number]),
      ...Array.from({ length: 4 }, (_, i) => [11, 3 + i] as [number, number]),
      ...Array.from({ length: 6 }, (_, i) => [11 - i, 6] as [number, number]),
      [6, 7] as [number, number],
      ...Array.from({ length: 5 }, (_, i) => [6 + i, 7] as [number, number]),
    ]);
    expect(routeWalkTiles(baffle)).toBe(25);
    expect(routeIdealTiles(baffle)).toBe(15);
    // Der Gewinn ist POSITIV und lesbar: 10 Felder mehr Zeit unter Feuer.
    expect(routeWalkTiles(baffle)! - routeIdealTiles(baffle)!).toBe(10);
  });
});
