import { describe, expect, it } from 'vitest';
import { SimulationRoot, makeCommand } from '../simulation/root';
import { makeRoot } from '../testing/testkit';
import { hudOf } from './hudSnapshot';

/**
 * B22 — Erst-Anzeige der Tray. Befund aus dem Erstspieler-Test: Beim Betreten des Runs standen
 * alle Karten als „×0" und deaktiviert da, weil der HUD-Snapshot erst im RAF-Takt entstand
 * (~100 ms). Der Tray-Bestand kommt aus genau diesem Abbild (`inventory={hud?.inventory ?? {}}`),
 * also ist `hudOf` die Stelle, an der die Anzeige wahr oder falsch wird.
 */
const SEED = 2447771834;

describe('HudSnapshot — Bestand ab dem ersten Bild', () => {
  it('spiegelt Bestand, Energie, Leben, Welle und Phase des Startsnapshots', () => {
    const root = makeRoot({ seed: SEED, runId: 1, loadout: ['cross_seedling'] });
    const hud = hudOf(root.getSnapshot(), false);

    // RootInit legt je Loadout-Variante 2 Stück ins Inventar (root.ts) — genau das muss die
    // Tray im ersten Bild zeigen, nicht 0.
    expect(hud.inventory.cross_seedling).toBe(2);
    expect(hud.inventory.sprout).toBeGreaterThan(0);
    expect('energy' in hud).toBe(false); // #4: kein Energie-Kanal mehr im HUD
    expect(hud.lives).toBeGreaterThan(0);
    expect(hud.wave).toBe(0);
    expect(hud.phase).toBe('layout'); // R1: der Run beginnt mit der Build-Sequenz
    expect(hud.combo).toBe(0);
    expect(hud.beetleDeployed).toBe(false);
    expect(hud.paused).toBe(false);
    expect(hud.tick).toBe(0);
    // R1: in der Build-Sequenz gibt es keinen Auto-Start (kein Countdown) ⇒ null.
    expect(hud.prepTicksLeft).toBeNull();
  });

  it('meldet die Restzeit, sobald eine Pflanze steht (B23.1/2)', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    // R1: die Bauphase verlassen — der Auto-Start ist ein prep-Konzept.
    root.commands.push(makeCommand(0, 'BEGIN_WAVE_PREP', 1, {}));
    root.stepOnce();
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.stepOnce();
    root.stepOnce();

    const hud = hudOf(root.getSnapshot(), false);
    expect(hud.prepTicksLeft).not.toBeNull();
    expect(hud.prepTicksLeft as number).toBeGreaterThan(0);
  });

  it('kopiert das Inventar — das Abbild darf die Sim nicht aliasing-verkoppeln', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    const hud = hudOf(root.getSnapshot(), true);
    hud.inventory.sprout = 999;
    expect(root.getSnapshot().inventory.sprout).toBeLessThan(999);
  });

  it('nimmt das Pause-Flag aus der UI-Wahrheit, nicht aus einem geratenen Zustand', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    expect(hudOf(root.getSnapshot(), true).paused).toBe(true);
  });

  it('D5: der HUD zeigt den LAUFWEG in Feldern (Entscheidung 19.09.2026 statt Prozent-Quote)', () => {
    // R2: auch die leere Welt hat eine Route (Spawn→Ausgang). Auf offener Fläche ist der echte
    // Weg genau der kürzeste mögliche — der Abstand beider Zahlen ist der Maze-Gewinn (hier 0).
    const empty = makeRoot({ seed: SEED, runId: 1 });
    const open = hudOf(empty.getSnapshot(), false);
    expect(open.routeTiles).not.toBeNull();
    expect(open.routeTiles!).toBeGreaterThan(0);
    expect(open.routeTiles).toBe(open.routeIdealTiles);

    // Mit Weg-Tile: die Route existiert weiter und bleibt lesbar (Felder, ganzzahlig).
    const root = makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'] });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 5, tile: 'path' }));
    root.stepOnce();
    const hud = hudOf(root.getSnapshot(), false);
    expect(hud.routeTiles).not.toBeNull();
    expect(Number.isInteger(hud.routeTiles)).toBe(true);
    expect(hud.routeIdealTiles!).toBeLessThanOrEqual(hud.routeTiles!);
  });
});
