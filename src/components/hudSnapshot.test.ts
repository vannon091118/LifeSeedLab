import { describe, expect, it } from 'vitest';
import { SimulationRoot, makeCommand } from '../simulation/root';
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
    const root = new SimulationRoot({ seed: SEED, runId: 1, loadout: ['cross_seedling'] });
    const hud = hudOf(root.getSnapshot(), false);

    // RootInit legt je Loadout-Variante 2 Stück ins Inventar (root.ts) — genau das muss die
    // Tray im ersten Bild zeigen, nicht 0.
    expect(hud.inventory.cross_seedling).toBe(2);
    expect(hud.inventory.sprout).toBeGreaterThan(0);
    expect(hud.energy).toBeGreaterThan(0);
    expect(hud.lives).toBeGreaterThan(0);
    expect(hud.wave).toBe(0);
    expect(hud.phase).toBe('prep');
    expect(hud.combo).toBe(0);
    expect(hud.beetleDeployed).toBe(false);
    expect(hud.paused).toBe(false);
    expect(hud.tick).toBe(0);
    // B23.1: leeres Feld ⇒ kein Auto-Start. Das HUD sagt damit dieselbe Wahrheit wie das WaveSystem.
    expect(hud.prepTicksLeft).toBeNull();
  });

  it('meldet die Restzeit, sobald eine Pflanze steht (B23.1/2)', () => {
    const root = new SimulationRoot({ seed: SEED, runId: 1 });
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.stepOnce();
    root.stepOnce();

    const hud = hudOf(root.getSnapshot(), false);
    expect(hud.prepTicksLeft).not.toBeNull();
    expect(hud.prepTicksLeft as number).toBeGreaterThan(0);
  });

  it('kopiert das Inventar — das Abbild darf die Sim nicht aliasing-verkoppeln', () => {
    const root = new SimulationRoot({ seed: SEED, runId: 1 });
    const hud = hudOf(root.getSnapshot(), true);
    hud.inventory.sprout = 999;
    expect(root.getSnapshot().inventory.sprout).toBeLessThan(999);
  });

  it('nimmt das Pause-Flag aus der UI-Wahrheit, nicht aus einem geratenen Zustand', () => {
    const root = new SimulationRoot({ seed: SEED, runId: 1 });
    expect(hudOf(root.getSnapshot(), true).paused).toBe(true);
  });

  it('D5: routeQuality spiegelt die State-Route — null ohne Route, Wert mit Maze', () => {
    // Leeres Feld: keine berechnete Route ⇒ kein Chip (Default-Pfad ist nicht messbar relevant).
    const empty = new SimulationRoot({ seed: SEED, runId: 1 });
    expect(hudOf(empty.getSnapshot(), false).routeQuality).toBeNull();

    // Mit Weg-Tile: Route existiert ⇒ Qualität 1 (gerade Bahn).
    const root = new SimulationRoot({ seed: SEED, runId: 1, loadout: ['sprout'] });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 5, tile: 'path' }));
    root.stepOnce();
    const q = hudOf(root.getSnapshot(), false).routeQuality;
    expect(q).not.toBeNull();
    expect(q!).toBeGreaterThan(0);
    expect(q!).toBeLessThanOrEqual(1);
  });
});
