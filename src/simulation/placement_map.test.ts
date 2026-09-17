import { describe, it, expect, beforeEach } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Platzierung & Map“ (B32.2/3, Phase 4).
// Konsolidierung: map.test.ts + placementRules.test.ts + prep.test.ts (It-Fälle unverändert).

import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';
import { resolveActiveRoute } from '../config/world.source';
import { cellRejectReason, placementRejectReason } from './placementRules';
import { AUTO_WAVE_DELAY_TICKS } from '../config/economy.source';
import { autoStartTicksLeft } from './waveTiming';

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
    // 7 unterscheidliche Zellen im Baubereich (gy 8: komplett frei vom Pfad-Korridor, B33)
    let seq = 1;
    for (let i = 0; i < 7; i++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 2 + i, gy: 8, tile: 'boulder' }));
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
// B33 — Der Screenshot-Befund als Gate: blockierende Tiles (pot/boulder) dürfen nie in den
// Pfad-Korridor. Vorher kannte `placeTile` die Marge nicht — ein Topf stand 0.5 Zellen am
// Wegpunkt, wo Pflanzen seit jeher `on_path` wären. Dieselbe Quelle (PLACEMENT_PATH_MARGIN),
// dieselbe Regel, ein Grund-Text für den Spieler.
describe('B33 — Pfad-Korridor-Verbot für blockierende Tiles', () => {
  beforeEach(() => resetIds());

  it('lehnt einen Topf im Korridor ab (Zelle (5,1), 0.5 am Wegpunkt (5.5,1.5)) — ohne Energie-Abzug', () => {
    const root = new SimulationRoot({ seed: SEED });
    const energyBefore = root.getSnapshot().resources.energy;
    let rejectedReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejectedReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 5, gy: 1, tile: 'pot' }));
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['5,1']).toBeUndefined();
    expect(s.resources.energy).toBe(energyBefore);
    // Der Grund erreicht den Bus (TILE_REJECTED mit on_path) — der Live-Reader, denn der
    // Event-Log wird pro Tick geleert (Root ist sein Besitzer).
    expect(rejectedReason).toBe('on_path');
  });

  it('lehnt einen Findling im Korridor genauso ab', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 8, gy: 5, tile: 'boulder' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['8,5']).toBeUndefined();
  });

  it('erlaubt einen Topf weit weg vom Pfad weiterhin (Baubereich, Marge frei)', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 8, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['6,8']).toBe('pot');
  });

  it('Weg-Tile NÄCHST am Korridor bleibt erlaubt — Lenkung ist ihr Sinn (Zelle (6,2), direkt an der Marge)', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 2, tile: 'path' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['6,2']).toBe('path');
  });
});

// Freie Zelle: innerhalb des Rasters und weit weg vom Enemy-Pfad (rechts unten).
const FREE = { gx: 11, gy: 10 };
// Zellzentrum (2.5, 3.5) ist exakt ein Pfad-Waypoint.
const ON_PATH = { gx: 2, gy: 3 };

describe('Platzierungsregeln — Geometrie', () => {
  it('akzeptiert eine freie Zelle', () => {
    expect(cellRejectReason({ ...FREE, plants: [] })).toBeNull();
  });

  it('lehnt Zellen außerhalb des Rasters als on_path ab', () => {
    expect(cellRejectReason({ gx: -1, gy: 0, plants: [] })).toBe('on_path');
    expect(cellRejectReason({ gx: 0, gy: 12, plants: [] })).toBe('on_path');
  });

  it('lehnt Zellen im Pfad-Korridor als on_path ab', () => {
    expect(cellRejectReason({ ...ON_PATH, plants: [] })).toBe('on_path');
  });

  it('lehnt belegte Zellen als occupied ab', () => {
    expect(cellRejectReason({ ...FREE, plants: [{ gx: 11, gy: 10 }] })).toBe('occupied');
  });
});

describe('Platzierungsregeln — Ökonomie vor Geometrie', () => {
  it('meldet no_inventory, bevor Geometrie geprüft wird', () => {
    const reason = placementRejectReason({
      board: { ...ON_PATH, plants: [] },
      inventoryCount: 0,
      energy: 999,
      cost: 10,
    });
    expect(reason).toBe('no_inventory');
  });

  it('meldet no_energy vor der Zellprüfung', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [{ gx: 11, gy: 10 }] },
      inventoryCount: 1,
      energy: 5,
      cost: 10,
    });
    expect(reason).toBe('no_energy');
  });

  it('gibt null zurück, wenn alles passt', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [] },
      inventoryCount: 1,
      energy: 10,
      cost: 10,
    });
    expect(reason).toBeNull();
  });
});

// B23.1 — Der Befund beider Spielerberichte, als Messung gegen die echte Sim:
// „Ich habe mehrfach in Welle 1 mit Score 0 verloren, weil der Kampf begann, bevor ich eine
// Pflanze stehen hatte." Vorher startete `maybeAutoStart` die Welle nach AUTO_WAVE_DELAY_TICKS,
// unabhängig davon, ob überhaupt etwas auf dem Feld stand.

const PREP_SEED = 2447771834;

function place(root: SimulationRoot, variantId: string, gx: number, gy: number, seq = 1): void {
  root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', seq, { variantId, gx, gy }));
}

function advance(root: SimulationRoot, ticks: number): void {
  for (let i = 0; i < ticks; i++) root.stepOnce();
}
