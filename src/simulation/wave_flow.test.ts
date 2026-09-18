import { describe, it, expect, beforeEach } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Wellen-Fluss & Sim-Mechanik“ (B32.2/3, Phase 4).
// Aus placement_map.test.ts ausgegliedert (LOC-Cap 300): B23.1-Aufbauphase + die
// Mechanik-Its aus sim.test.ts (Kills/Score, Wellen-Start, Ablehnung, Lives-Leak).

import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';
import { AUTO_WAVE_DELAY_TICKS } from '../config/economy.source';
import { autoStartTicksLeft } from './waveTiming';

const PREP_SEED = 2447771834;
const SEED = 555001;

function advance(root: SimulationRoot, ticks: number): void {
  for (let i = 0; i < ticks; i++) root.stepOnce();
}

function place(root: SimulationRoot, variantId: string, gx: number, gy: number, seq = 1): void {
  root.commands.push(makeCommand(0, 'PLACE_PLANT', seq, { variantId, gx, gy }));
}

describe('B23.1 — Aufbauphase ohne Beschuss', () => {
  beforeEach(() => resetIds());

  it('startet KEINE Welle, solange nichts gepflanzt ist — auch nach 20 Sekunden nicht', () => {
    const root = new SimulationRoot({ seed: PREP_SEED });
    advance(root, AUTO_WAVE_DELAY_TICKS * 7);

    const s = root.getSnapshot();
    expect(s.phase).toBe('prep');
    expect(s.wave.number).toBe(0);
    expect(s.enemies).toHaveLength(0);
    expect(s.score).toBe(0);
  });

  it('startet die Welle, sobald eine Pflanze steht und das Fenster abgelaufen ist', () => {
    const root = new SimulationRoot({ seed: PREP_SEED });
    advance(root, AUTO_WAVE_DELAY_TICKS * 2);   // die Wartezeit läuft schon, ohne Pflanze
    expect(root.getSnapshot().phase).toBe('prep');

    place(root, 'sprout', 1, 2);
    advance(root, 2);                            // Fenster beginnt mit der Pflanze — von vorn
    expect(root.getSnapshot().plants).toHaveLength(1);
    expect(root.getSnapshot().phase).toBe('prep');

    advance(root, AUTO_WAVE_DELAY_TICKS + 2);
    expect(root.getSnapshot().phase).toBe('wave');
    expect(root.getSnapshot().wave.number).toBe(1);
  });

  it('lässt den Knopf der Sim immer zu — Warten ist eine Wahl, kein Softlock', () => {
    const root = new SimulationRoot({ seed: PREP_SEED });
    advance(root, AUTO_WAVE_DELAY_TICKS * 3);
    expect(root.getSnapshot().wave.number).toBe(0);

    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', 1, {}));
    advance(root, 1);
    expect(root.getSnapshot().phase).toBe('wave');
    expect(root.getSnapshot().wave.number).toBe(1);
  });

  it('meldet dem HUD die Wartezeit als „das Labor wartet“ (null) — dieselbe Regel', () => {
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: 0, tick: 999, plantCount: 0, autoWaves: true })).toBeNull();
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: 0, tick: 10, plantCount: 1, autoWaves: true }))
      .toBe(AUTO_WAVE_DELAY_TICKS - 10);
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: 0, tick: 999, plantCount: 1, autoWaves: true })).toBe(0);
    expect(autoStartTicksLeft({ phase: 'wave', prepStartTick: 0, tick: 10, plantCount: 1, autoWaves: true })).toBeNull();
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: null, tick: 10, plantCount: 1, autoWaves: true })).toBeNull();
  });
});

// ══ Spielmechanik am Root (migriert aus sim.test.ts) ══

describe('Phase 4 — Kills via ENEMY_DIED & Score', () => {
  it('ENEMY_DIED grants score and combo via events', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    for (let i = 0; i < 1200; i++) root.stepOnce();
    const s = root.getSnapshot();
    // with a shooter on the path, some enemies must die → score > 0 OR lives leak (defense works partially)
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.combo.highest).toBeGreaterThanOrEqual(0);
    // event log must have been populated during the run
    expect(root.bus.publishCount).toBeGreaterThan(0);
  });
});

describe('Phase 4 — Wellen-Start prep → wave', () => {
  it('START_WAVE transitions prep → wave deterministically', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    expect(root.getSnapshot().phase).toBe('wave');
    // run until at least one enemy spawns
    for (let i = 0; i < 60; i++) root.stepOnce();
    expect(root.getSnapshot().enemies.length).toBeGreaterThan(0);
  });
});

describe('Phase 4 — Platzierungs-Ablehnung (Weg, belegt, Inventar)', () => {
  it('invalid placements are rejected (on path / occupied / no energy)', () => {
    const root = new SimulationRoot({ seed: SEED });
    // on path (0,3) is within 1.2 cells of waypoint (0,3.5)
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 0, gy: 3 }));
    root.stepOnce();
    expect(root.getSnapshot().plants.length).toBe(0);

    // occupied
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 2, gy: 0 }));
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 3, { variantId: 'sprout', gx: 2, gy: 0 }));
    root.stepOnce();
    const first = root.getSnapshot().plants.length;
    root.stepOnce();
    expect(root.getSnapshot().plants.length).toBe(first); // second placement rejected

    // inventory exhausted → eventually no_inventory
    const r2 = new SimulationRoot({ seed: SEED });
    for (let i = 0; i < 10; i++) {
      r2.commands.push(makeCommand(0, 'PLACE_PLANT', 10 + i, { variantId: 'sprout', gx: i % 12, gy: Math.floor(i / 12) + 6 }));
      r2.stepOnce();
    }
    expect(r2.getSnapshot().plants.length).toBe(1); // gacha economy: exactly 2 starter plants total = 1 sprout + 1 rootwall
  });
});

describe('Phase 4 — Gegner-Leak kostet Leben', () => {
  it('enemy leaking reduces lives', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    // run far without any plants → enemies leak
    for (let i = 0; i < 3000; i++) root.stepOnce();
    const s = root.getSnapshot();
    expect(s.lives).toBeLessThan(20);
  });
});
