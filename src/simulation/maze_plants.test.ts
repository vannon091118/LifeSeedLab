// D1-Beweis (Maze-Drift): Pflanzen biegen den Laufweg SOFORT und auch OHNE gekaufte Tiles.
// Der Plan-Satz „das Zucht-Layout wirkt als Maze-Bauwerk" ist hier als Sim-Vertrag gepinnt.
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { makeRoot } from '../testing/testkit';
import { routeQuality } from './mapSystem';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';

const SEED = 2447771834;

function routeOf(root: SimulationRoot): readonly { x: number; y: number }[] | null {
  return root.getSnapshot().currentRoute;
}

/** Route-Knoten als String (Zellzentren, gerundet) — direkter Geometrie-Vergleich. */
function routeKey(route: readonly { x: number; y: number }[] | null): string {
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

/**
 * Weg-Bahn senkrecht bei gx=5 (Quell-Gewicht 0.6) — beide Vergleichsläufe teilen dieselbe
 * Grundroute, dann entscheidet NUR die Pflanzenwand über den Unterschied.
 */
function layPathTileCorridor(root: SimulationRoot): void {
  for (let gy = 2; gy <= 9; gy++) {
    root.commands.push(makeCommand(0, 'PLACE_TILE', gy - 1, { gx: 5, gy, tile: 'path' }));
  }
}

describe('D1 — Pflanzen sind Maze-Bauwerk (auch ohne Tiles)', () => {
  beforeEach(() => { resetIds(); });

  it('PLACE_PLANT biegt die Route SOFORT: die Route nach der ersten Pflanze weicht vom geraden Weg ab', () => {
    // Loadout ⇒ B1-Fallback-Bestand (wie in gameover_notice/gateB) — die Pflanze muss
    // platzierbar sein, sonst prüft der Test die Leihe mit, nicht D1.
    const root = makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
    // R2: ohne Platzierung ist die Route der GERADE Weg (Pathfinding-Ergebnis der leeren Welt)
    // — sie wird im ROOT-KONSTRUKTOR abgeleitet (Run-Start-Vertrag).
    root.stepOnce();
    const before = routeKey(routeOf(root));
    expect(before.length).toBeGreaterThan(0);

    // Pflanzenreihe quer durch die Route-Reihe (gy=0, gx 2..9): der Dijkstra löst Kosten-
    // Ties über die oberste Reihe — die REIHE dort erzwingt den Biege-Beweis
    // (PLANT_ROUTE_COST verteuert jede Zelle, der Weg weicht auf gy=1 aus).
    let seq = 1;
    for (const gx of [2, 3, 4, 5, 6, 7, 8, 9]) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'sprout', gx, gy: 0 }));
    }
    root.stepOnce();

    // D1-Kern: SOFORT nach der Platzierung biegt die berechnete Route um —
    // die Pflanzen verteuern ihre Zellen (PLANT_ROUTE_COST) und drücken den Weg davon.
    expect(routeOf(root)).not.toBeNull();
    expect(routeOf(root)!.length).toBeGreaterThan(1);
    expect(routeKey(routeOf(root))).not.toBe(before);
  });

  it('Pflanzenwand vor der Route zwingt den Laufweg in einen anderen Kanal (vorher/nachher am selben Root)', () => {
    // Am SELBEN Root messen — der offene Vergleich zweier Roots scheitert an der
    // Gleichwertigkeit freier Korridore (mehrere Optimalrouten, gleiche Kosten).
    const root = makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
    layPathTileCorridor(root);
    root.stepOnce();
    const before = routeKey(routeOf(root));
    expect(before.length).toBeGreaterThan(0);

    // Wand quer DURCH den bestehenden Korridor (Spalte gx=5, Route läuft dort hinunter):
    // gx=5 mit einer Lücke bei gy=5 — die Route muss auf Spalte 6 ausweichen.
    for (const gy of [2, 3, 4, 6, 7, 8, 9]) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', 20 + gy, { variantId: 'sprout', gx: 5, gy }));
    }
    root.stepOnce();
    const after = routeKey(routeOf(root));

    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toBe(before); // die Pflanzenwand hat den Lauf REAL verlegt
  });

  it('REMOVE_PLANT zieht nach: Route kehrt zur freien Geometrie zurück', () => {
    const root = makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
    root.stepOnce();
    const straight = routeKey(routeOf(root)); // R2: der gerade Weg der leeren Welt

    // Dieselbe Pflanzenreihe wie im Biege-Test (gy=0, auf der Route-Reihe) — sie verlegt den Weg REAL.
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

  it('routeQuality: gerade Route = 1, Rücklauf (Baffle) < 1 — Formel-Vertrag als Unit', () => {
    // Warum Unit statt Integration: PLACEMENT_PATH_MARGIN (B33) hält den Design-Korridor
    // IMMER begehbar und Rand-Reihen sind nie baubar — nicht-monotone Routen (echte
    // Rückläufe) entstehen im Feld nur über Baffle-Kosten, nie durch Blockade. Die Formel
    // selbst ist hier gepinnt; die Maze-Lebendigkeit decken die Tests oben.
    const cells = (pts: [number, number][]) => pts.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));

    const straight = cells(Array.from({ length: 12 }, (_, gx) => [gx, 2] as [number, number]));
    expect(routeQuality(straight)).toBe(1);

    // Baffle (wie der Design-Pfad): 11 Schritte hin, 4 runter, 5 ZURÜCK, 1 runter, 5 hin —
    // 26 Manhattan-Schritte, Endpunkt-Referenz |11-0| + |7-2| = 16 ⇒ q = 16/26 < 1.
    const baffle = cells([
      ...Array.from({ length: 12 }, (_, i) => [i, 2] as [number, number]),
      ...Array.from({ length: 4 }, (_, i) => [11, 3 + i] as [number, number]),
      ...Array.from({ length: 6 }, (_, i) => [11 - i, 6] as [number, number]),
      [6, 7] as [number, number],
      ...Array.from({ length: 5 }, (_, i) => [6 + i, 7] as [number, number]),
    ]);
    const q = routeQuality(baffle)!;
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
  });
});
