import { describe, expect, it } from 'vitest';
import { SimulationRoot } from '../simulation/root';
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
});
