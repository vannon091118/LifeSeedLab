import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';

const SEED = 555001;

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

  it('Weg-Tiles verlängern die Route (Gegner laufen REAL länger — Umweg wird begehbar)', () => {
    // Mit leerer Map läuft die DEFAULT-Route (9 Wegpunkte, ENEMY_PATH)
    const plain = new SimulationRoot({ seed: SEED });
    plain.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    plain.stepOnce();
    const routePlain = (plain as unknown as { enemies: { getRoute(): unknown } }).enemies.getRoute();
    expect(routePlain).toBeNull(); // keine Tiles ⇒ DEFAULT-Pfad

    // Findlings-Mauer über 6 von 8 Zeilen (maxCount 6 macht 8 unmöglich):
    // die Route MUSS real durch Zeile 6/7 ausweichen
    const root = new SimulationRoot({ seed: SEED });
    root.getSnapshot().resources.energy = 1000;
    const walls: [number, number][] = [
      [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5],
    ];
    let seq = 1;
    for (const [gx, gy] of walls) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx, gy, tile: 'boulder' }));
    }
    // Energie für die Mauer; Kosten je 20 × 6 = 120 > Start 150 … ok, passt
    root.stepOnce();
    root.commands.push(makeCommand(1, 'START_WAVE', seq++, {}));
    root.stepOnce();
    const route = (root as unknown as { enemies: { getRoute(): { x: number; y: number }[] | null } }).enemies.getRoute();
    // Die Route MUSS existieren (Umweg über Zeile 6/7) und dort ausweichen
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(8);
    // Kein Wegpunkt in einer MAUER-Zelle (Spalte 4, Zeilen 0–5) …
    for (const wp of route!) {
      const cellX = Math.round(wp.x - 0.5);
      const cellY = Math.round(wp.y - 0.5);
      const isWallCell = cellX === 4 && cellY <= 5;
      expect(isWallCell).toBe(false);
    }
    // … und die Route läuft unten vorbei (Zeile 6 oder 7)
    expect(route!.some(wp => wp.y > 5.9)).toBe(true);
  });

  it('TILE_REJECTED bei max_count (Boulder-Limit 10 schützt vor Weg-Mauern)', () => {
    const root = new SimulationRoot({ seed: SEED });
    let rejected = 0;
    let lastReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejected++; lastReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    // 7 unterscheidliche Zellen — der 7. Findling stößt an maxCount 6
    root.getSnapshot().resources.energy = 1000;
    let seq = 1;
    for (let i = 0; i < 7; i++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 1 + i, gy: 6, tile: 'boulder' }));
    }
    root.stepOnce();
    expect(rejected).toBe(1);
    expect(lastReason).toBe('max_count');
  });

  it('Spawn-Korridor bleibt frei (gx=0 verboten)', () => {
    const root = new SimulationRoot({ seed: SEED });
    let rejected = 0;
    root.bus.subscribe('TILE_REJECTED', () => { rejected++; });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 0, gy: 3, tile: 'boulder' }));
    root.stepOnce();
    expect(rejected).toBe(1);
    expect(root.getSnapshot().mapTiles['0,3']).toBeUndefined();
  });
});
