import { describe, it, expect, beforeEach } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Platzierung & Map“ (B32.2/3, Phase 4).
// Konsolidierung: map.test.ts + placementRules.test.ts + prep.test.ts (It-Fälle unverändert).

import { SimulationRoot, makeCommand } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
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

  it('PLACE_TILE nimmt Material aus dem POOL und schreibt das Tile in den State (#4)', () => {
    const root = makeRoot({ seed: SEED });
    const materialBefore = root.getSnapshot().inventory.path ?? 0;
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'path' }));
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['6,3']).toBe('path');
    expect(s.inventory.path).toBe(materialBefore - 1); // jedes Tile kostet genau 1 Material
  });

  it('R2: ohne Spieler-Tiles ist die Route DAS PATHFINDING-ERGEBNIS (Diagonale Spawn→Ausgang)', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    const route = routeOf(root);
    expect(route).not.toBeNull(); // kein Default-No-op mehr: die leere Welt HAT einen Weg
    // Diagonale (oben rechts → unten links): cols+rows-1 Wegpunkt-Zellen (ortho4-Umweg
    // über die Eck-Treppe — die leere Welt kennt keine Abkürzung, nur Manhattan-Schritte)
    expect(route!.length).toBe(12 + 12 - 1); // 23 Zellen: 11 links + 11 runter + Start
  });

  it('Weg-Tiles verlängern die Route (Gegner laufen REAL länger — Umweg wird begehbar)', () => {
    // Findlings-Mauer im Baubereich (gx 4, gy 2-7 = 6 Zellen, maxCount 6)
    // #4: 6 Findlinge kosten 6 Material — der Vorrat kommt aus der Source plus Zukauf
    // (`materialStock`), nicht aus einem Budget.
    const root = makeRoot({ seed: SEED, materialStock: { boulder: 6 } });
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
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'path' }));
    root.stepOnce();
    root.commands.push(makeCommand(1, 'START_WAVE', 2, {}));
    root.stepOnce();

    const enemies = (root as unknown as { enemies: { activePath(s: unknown): ReadonlyArray<{ x: number; y: number }> } }).enemies;
    const snap = root.getSnapshot();
    const stateRoute = snap.currentRoute;
    expect(stateRoute).not.toBeNull();
    // Parität: die Wegpunkte der Gegner SIND die State-Route (Auflösung: eine Quelle).
    // R2: keine resolveActiveRoute-Schicht mehr — die Sim-Route IST die Wahrheit.
    expect(enemies.activePath(snap)).toBe(stateRoute);
  });

  it('TILE_REJECTED bei max_count (Boulder-Limit 6 schützt vor Weg-Mauern)', () => {
    const root = makeRoot({ seed: SEED, materialStock: { boulder: 10 } });
    let rejected = 0;
    let lastReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejected++; lastReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    // 7 unterscheidliche Zellen im Baubereich (Reihe gy 8 trägt keine Pflanze und liegt
    // abseits der Diagonal-Bahn) — der Vorrat (10) macht MAX_COUNT zur Grenze, nicht Material.
    let seq = 1;
    for (let i = 0; i < 7; i++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 2 + i, gy: 8, tile: 'boulder' }));
    }
    root.stepOnce();
    expect(rejected).toBe(1);
    expect(lastReason).toBe('max_count');
  });

  it('R2: der Rand ist bebaubar — gx=0 (Spawn-Spalte) ist normale Welt', () => {
    const root = makeRoot({ seed: SEED });
    let rejected = 0;
    root.bus.subscribe('TILE_REJECTED', () => { rejected++; });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 0, gy: 3, tile: 'path' }));
    root.stepOnce();
    expect(rejected).toBe(0);
    // Kein geschützter Korridor mehr — die Gegner umgehen Tiles, das Verbot existiert nicht
    expect(root.getSnapshot().mapTiles['0,3']).toBe('path');
  });
});
// B33 → R2: Der alte Pfad-Korridor-Verbot ist GELÖSCHT — die EINZIGE Schranke ist die
// Integritätsregel: der Zug, der den LETZTEN freien Weg schließt, wird abgelehnt
// (`route_blocked`, ohne Material-Abzug). Diese Sektion pinnt die neue Regel.
describe('B33 → R2 — Integritätsregel statt Korridor-Verbot', () => {
  beforeEach(() => resetIds());

  it('lehnt den Zug ab, der den LETZTEN freien Weg schließt — ohne Material-Abzug', () => {
    // Genug Töpfe im Vorrat: die Grenze ist die WEG-Regel, nicht das Material (#4).
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    const poolBefore = root.getSnapshot().inventory.pot ?? 0;
    let rejectedReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejectedReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    // Voll-Mauer über alle 12 Reihen in Spalte gx=5 — `pot` (walkable: false, maxCount 24):
    // 12 Töpfe würden die GANZE Spalte blockieren. Die Integritätsregel lässt genau 11 zu;
    // der 12. Zug wird mit `route_blocked` abgelehnt. Der Pool wird über den State-Adapter
    for (let gy = 0; gy < 12; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy + 1, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['5,11']).toBeUndefined(); // der schließende Zug ist NICHT geschrieben
    expect(s.inventory.pot).toBe(poolBefore - 11); // 11 Töpfe gesetzt — der abgelehnte Zug kostete nichts
    expect(rejectedReason).toBe('route_blocked');
  });

  it('erlaubt eine fast vollständige Blockade, solange ein freier Weg übrig bleibt', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    // 11 Töpfe in Spalte 5 — Reihe gy=6 bleibt frei: der Weg läuft dort durch.
    for (let gy = 0; gy < 12; gy++) {
      if (gy === 6) continue;
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy + 1, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['5,0']).toBe('pot');
    expect(s.mapTiles['5,6']).toBeUndefined();
    // Die Route existiert weiterhin — durch die freie Lücke
    expect(routeOf(root)).not.toBeNull();
  });

  it('erlaubt einen Topf weit weg vom Weg weiterhin (freie Welt, keine Marge)', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 8, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['6,8']).toBe('pot');
  });

  it('Weg-Tile NÄCHST am Spawn bleibt erlaubt — Lenkung ist ihr Sinn (Zelle (6,2))', () => {
    const root = makeRoot({ seed: SEED });
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

  it('R2: die alte Korridor-Zelle ist eine NORMALE Zelle (kein Verbot mehr)', () => {
    // ON_PATH (2,3) lag am Design-Pfad — im R2-Modell gibt es keinen Pfad mehr, den die
    // Geometrie kennen könnte: nur Bounds und Belegung bleiben.
    expect(cellRejectReason({ ...ON_PATH, plants: [] })).toBeNull();
  });

  it('lehnt belegte Zellen als occupied ab', () => {
    expect(cellRejectReason({ ...FREE, plants: [{ gx: 11, gy: 10 }] })).toBe('occupied');
  });
});

describe('B37 — Besitz-Wahrheit: Run-Inventar spiegelt genau den Besitz', () => {
  beforeEach(() => resetIds());

  it('Loadout-Eintrag ohne Besitz gibt 0 ⇒ Platzieren lehnt mit no_inventory ab', () => {
    const root = makeRoot({ seed: 42, loadout: ['sprout'], ownedCounts: {} });
    const rejects: string[] = [];
    root.bus.subscribe('PLACEMENT_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 11, gy: 10 }));
    root.stepOnce();
    expect(root.getSnapshot().plants).toHaveLength(0);
    expect(rejects).toEqual(['no_inventory']);
  });

  it('Besitz von 5 ⇒ 5 Platzierungen möglich, die 6. lehnt ab (Pool-Grenze)', () => {
    const root = makeRoot({ seed: 42, loadout: ['sprout'], ownedCounts: { sprout: 5 } });
    // #4: der Test prüft die BESITZ-Grenze — es gibt kein Budget mehr, nur den Pool.
    const state = root.getSnapshot();
    expect(state.inventory.sprout).toBe(5);
    const rejects: string[] = [];
    root.bus.subscribe('PLACEMENT_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    let seq = 1;
    const spots: [number, number][] = [[11,10],[10,10],[9,10],[8,10],[7,10],[6,10]];
    for (const [gx, gy] of spots) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'sprout', gx, gy }));
    }
    for (let i = 0; i < 6; i++) root.stepOnce();
    expect(root.getSnapshot().plants).toHaveLength(5);
    expect(root.getSnapshot().inventory.sprout).toBe(0);
    expect(rejects).toEqual(['no_inventory']);
  });
});

describe('Platzierungsregeln — Pool vor Geometrie (#4)', () => {
  it('meldet no_inventory, bevor Geometrie geprüft wird', () => {
    const reason = placementRejectReason({
      board: { ...ON_PATH, plants: [] },
      inventoryCount: 0,
    });
    expect(reason).toBe('no_inventory');
  });

  it('meldet no_inventory auch bei BELEGTER Zelle zuerst — der Pool entscheidet vor dem Feld', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [{ gx: 11, gy: 10 }] },
      inventoryCount: 0,
    });
    expect(reason).toBe('no_inventory');
  });

  it('meldet occupied, sobald der Pool reicht (Geometrie danach)', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [{ gx: 11, gy: 10 }] },
      inventoryCount: 1,
    });
    expect(reason).toBe('occupied');
  });

  it('gibt null zurück, wenn alles passt', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [] },
      inventoryCount: 1,
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
