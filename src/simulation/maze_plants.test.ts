// D1-Beweis (Maze-Drift): Pflanzen biegen den Laufweg SOFORT und auch OHNE gekaufte Tiles.
// Der Plan-Satz „das Zucht-Layout wirkt als Maze-Bauwerk" ist hier als Sim-Vertrag gepinnt.
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
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

  it('PLACE_PLANT triggert recomputeRoute: die Route nach der ersten Pflanze existiert (kein Default-No-op)', () => {
    // Loadout ⇒ B1-Fallback-Bestand (wie in gameover_notice/gateB) — die Pflanze muss
    // platzierbar sein, sonst prüft der Test die Leihe mit, nicht D1.
    const root = new SimulationRoot({ seed: SEED, runId: 1, loadout: ['sprout'] });
    // Ohne Platzierung: leeres Feld → bewusst KEINE Route (gestalteter Default-Pfad, s. Kommentar root.ts)
    expect(routeOf(root)).toBeNull();

    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 6, gy: 3 }));
    root.stepOnce();

    // D1-Kern: SOFORT nach der Platzierung existiert eine berechnete Route —
    // der Dijkstra ist gelaufen (vorher: hasTiles=false ⇒ null ⇒ No-op).
    expect(routeOf(root)).not.toBeNull();
    expect(routeOf(root)!.length).toBeGreaterThan(1);
  });

  it('Pflanzenwand vor der Route zwingt den Laufweg in einen anderen Kanal (vorher/nachher am selben Root)', () => {
    // Am SELBEN Root messen — der offene Vergleich zweier Roots scheitert an der
    // Gleichwertigkeit freier Korridore (mehrere Optimalrouten, gleiche Kosten).
    const root = new SimulationRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 99 });
    layPathTileCorridor(root);
    root.stepOnce();
    const before = routeKey(routeOf(root));
    expect(before.length).toBeGreaterThan(0);

    // Wand quer VOR die bestehende Route (die gy-2-Korridor-Reihe vollstellen, legal bei gy 2:
    // gx 2..9 frei laut Marge — die Route muss umbiegen).
    for (const gx of [2, 3, 4, 6, 7, 8, 9]) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', 20 + gx, { variantId: 'sprout', gx, gy: 2 }));
    }
    root.stepOnce();
    const after = routeKey(routeOf(root));

    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toBe(before); // die Pflanzenwand hat den Lauf REAL verlegt
  });

  it('REMOVE_PLANT zieht nach: Route kehrt zur freien Geometrie zurück', () => {
    const root = new SimulationRoot({ seed: SEED, runId: 1, loadout: ['sprout'] });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 6, gy: 3 }));
    root.stepOnce();
    const withPlant = routeKey(routeOf(root));

    const plant = root.getSnapshot().plants.find(p => p.gx === 6 && p.gy === 3);
    expect(plant).toBeDefined(); // Platzierung muss geklappt haben (D1-Voraussetzung)
    root.commands.push(makeCommand(0, 'REMOVE_PLANT', 2, { plantId: plant!.id }));
    root.stepOnce();

    // Ohne Pflanze UND ohne Tiles: wieder null (leeres Feld ⇒ Default-Pfad) — jedenfalls
    // NICHT mehr die Pflanzenroute. Der Kern: der Weg hat auf die Entfernung reagiert.
    const after = routeKey(routeOf(root));
    expect(after).not.toBe(withPlant);
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
