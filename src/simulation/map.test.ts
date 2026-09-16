import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';
import { resolveActiveRoute } from '../config/world.source';

const SEED = 555001;

/** B16.1-Vertrag: die Route wird aus dem STATE gelesen (public contract) —
 *  kein Griff in private System-Felder mehr (der alte getRoute-Umweg ist tot). */
function routeOf(root: SimulationRoot) {
  return root.getSnapshot().currentRoute;
}

describe('Map-System (P5) — Laufweg reagiert REAL auf Platzierungen', () => {
  beforeEach(() => resetIds());

  it('PLACE_TILE zieht Energie ab und schreibt das Tile in den State', () => {
    const root = new SimulationRoot({ seed: SEED });
    const energyBefore = root.getSnapshot().resources.energy;
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'path' }));
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['6,3']).toBe('path');
    expect(s.resources.energy).toBeLessThan(energyBefore);
  });

  it('Ohne Spieler-Tiles ist currentRoute NULL (bewusster Wert, keine leere Route)', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    expect(routeOf(root)).toBeNull();
  });

  it('Weg-Tiles verlängern die Route (Gegner laufen REAL länger — Umweg wird begehbar)', () => {
    // Findlings-Mauer im Baubereich (gx 4, gy 2-7 = 6 Zellen, maxCount 6)
    const root = new SimulationRoot({ seed: SEED });
    const walls: [number, number][] = [
      [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7],
    ];
    let seq = 1;
    for (const [gx, gy] of walls) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx, gy, tile: 'boulder' }));
    }
    root.stepOnce();
    root.commands.push(makeCommand(1, 'START_WAVE', seq++, {}));
    root.stepOnce();

    const route = routeOf(root);
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(8);
    // Kein Wegpunkt in einer MAUER-Zelle (Spalte 4, Zeilen 2–7) …
    for (const wp of route!) {
      const cellX = Math.round(wp.x - 0.5);
      const cellY = Math.round(wp.y - 0.5);
      const isWallCell = cellX === 4 && cellY >= 2 && cellY <= 7;
      expect(isWallCell).toBe(false);
    }
    // … und die Route läuft oberhalb (y<2) oder unterhalb (y>7) der Mauer vorbei
    const goesAbove = route!.some(wp => Math.round(wp.y - 0.5) < 2);
    const goesBelow = route!.some(wp => Math.round(wp.y - 0.5) > 7);
    expect(goesAbove || goesBelow).toBe(true);
  });

  it('B16.1-Vertrag: EnemySystem liest dieselbe aktive Route wie Rendering/UI (keine zweite Kopie)', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'path' }));
    root.stepOnce();
    root.commands.push(makeCommand(1, 'START_WAVE', 2, {}));
    root.stepOnce();

    const enemies = (root as unknown as { enemies: { activePath(s: unknown): ReadonlyArray<{ x: number; y: number }> } }).enemies;
    const snap = root.getSnapshot();
    const stateRoute = snap.currentRoute;
    expect(stateRoute).not.toBeNull();
    // Parität: die Wegpunkte der Gegner SIND die State-Route (Auflösung: eine Quelle).
    // Identität gilt je Snapshot — getSnapshot() klont tief, zwei Snaps wären zwei Arrays.
    expect(enemies.activePath(snap)).toBe(resolveActiveRoute(stateRoute));
  });

  it('TILE_REJECTED bei max_count (Boulder-Limit 6 schützt vor Weg-Mauern)', () => {
    const root = new SimulationRoot({ seed: SEED });
    let rejected = 0;
    let lastReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejected++; lastReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    // 7 unterscheidliche Zellen im Baubereich (gx 2-9, gy 2-9)
    let seq = 1;
    for (let i = 0; i < 7; i++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 2 + i, gy: 6, tile: 'boulder' }));
    }
    root.stepOnce();
    expect(rejected).toBe(1);
    expect(lastReason).toBe('max_count');
  });

  it('Spawn-Korridor bleibt frei (gx=0 verboten)', () => {
    const root = new SimulationRoot({ seed: SEED });
    let rejected = 0;
    root.bus.subscribe('TILE_REJECTED', () => { rejected++; });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 0, gy: 3, tile: 'path' }));
    root.stepOnce();
    expect(rejected).toBe(1);
    // gx=0 ist Spawn-Korridor — kein Tile wird platziert
    expect(root.getSnapshot().mapTiles['0,3']).toBeUndefined();
  });
});