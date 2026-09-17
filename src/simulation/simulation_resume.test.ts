import { describe, it, expect, beforeEach } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Resume, Tempo & Auto-Wellen“ (B32.2/3, Phase 4).
// Konsolidierung: simulation_resume.test.ts + simulation_speed_autowaves.test.ts.

import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';
import type { ResumeSnapshot } from './resume';
import type { RunSave } from '../persistence/runSave';
import { TICK_MS, SPEED_STEPS } from '../core/clock';
import { AUTO_WAVE_DELAY_TICKS, AUTO_WAVES_DEFAULT } from '../config/economy.source';

/** Snapshot wie ihn der Persistenz-Adapter liefert (nur vertraglich erlaubte Felder). */
function snapshotOf(root: SimulationRoot): ResumeSnapshot {
  const s = root.getSnapshot();
  return {
    waveNumber: s.wave.number,
    energy: s.resources.energy,
    lives: s.lives,
    score: s.score,
    combo: { ...s.combo },
    plants: s.plants.map(p => ({ ...p })),
    inventory: { ...s.inventory },
    discoveredVariants: [...s.discoveredVariants],
    mapTiles: { ...s.mapTiles },
    nektarEarned: s.nektarEarned,
  };
}

describe('Gate B — Resume-Vertrag der Sim', () => {
  it('stellt Welle, Pflanzen und Wirtschaft wieder her und startet in prep', () => {
    const source = new SimulationRoot({ seed: 7, runId: 3 });
    source.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 3, gy: 2 }));
    source.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    for (let i = 0; i < 120; i++) source.stepOnce();

    // Snapshot-Härtung: getSnapshot() ist eine Kopie — der Resume-Vertrag wird über die
    // echte Pipeline geprüft; die wiederhergestellte Wellennummer kommt aus dem Snapshot.
    const snapshot = snapshotOf(source);

    const resumed = new SimulationRoot({ seed: 7, runId: 3, resume: snapshot });
    const after = resumed.getSnapshot();

    expect(after.phase).toBe('prep');
    expect(after.wave.number).toBe(snapshot.waveNumber);
    expect(after.plants).toEqual(snapshot.plants);
    expect(after.resources.energy).toBe(snapshot.energy);
    expect(after.lives).toBe(snapshot.lives);
    expect(after.inventory).toEqual(snapshot.inventory);
    expect(after.discoveredVariants).toEqual(snapshot.discoveredVariants);
    expect(after.clock.tick).toBe(0);
  });

  it('verwirft Gegner, Projektile und den Wellen-Schedule (ehrlicher Vertrag)', () => {
    const source = new SimulationRoot({ seed: 11, runId: 1 });
    source.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    for (let i = 0; i < 400; i++) source.stepOnce();
    expect(source.getSnapshot().enemies.length).toBeGreaterThan(0);

    const resumed = new SimulationRoot({ seed: 11, runId: 1, resume: snapshotOf(source) });
    const after = resumed.getSnapshot();

    expect(after.enemies).toEqual([]);
    expect(after.projectiles).toEqual([]);
    expect(after.wave.schedule).toBeNull();
    expect(after.wave.spawnQueue).toEqual([]);
  });

  it('ein fortgesetzter Run läuft deterministisch weiter (Welle startet aus dem Snapshot)', () => {
    const source = new SimulationRoot({ seed: 21, runId: 5 });
    source.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 3, gy: 2 }));
    for (let i = 0; i < 30; i++) source.stepOnce();
    const snapshot = snapshotOf(source);

    const a = new SimulationRoot({ seed: 21, runId: 5, resume: snapshot });
    const b = new SimulationRoot({ seed: 21, runId: 5, resume: snapshot });
    for (const root of [a, b]) {
      root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
      for (let i = 0; i < 60; i++) root.stepOnce();
    }

    // Hinweis: Entity-IDs kommen aus dem prozessglobalen Zähler (core/ids.ts) und sind
    // daher nur innerhalb EINES Roots stabil — verglichen wird der Simulationsinhalt.
    const shape = (root: SimulationRoot) =>
      root.getSnapshot().enemies.map(e => `${e.typeId}@${Math.round(e.px)},${Math.round(e.py)}`).sort();
    expect(a.getSnapshot().wave.number).toBe(b.getSnapshot().wave.number);
    expect(a.getSnapshot().enemies.length).toBeGreaterThan(0);
    expect(shape(a)).toEqual(shape(b));
    expect(a.getSnapshot().resources.energy).toBe(b.getSnapshot().resources.energy);
    expect(a.getSnapshot().lives).toBe(b.getSnapshot().lives);
  });

  it('RunSave erfüllt strukturell den ResumeSnapshot (Adapter-Brücke)', () => {
    const save: RunSave = {
      version: 2, runId: 1, seed: 1, tick: 0, waveNumber: 2, energy: 90, lives: 18, score: 40,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 3 },
      plants: [], inventory: { sprout: 1 }, discoveredVariants: ['sprout'], bredStats: {},
      nektarEarned: 12, mapTiles: {},
    };
    const asSnapshot: ResumeSnapshot = save;
    const root = new SimulationRoot({ seed: save.seed, runId: save.runId, resume: asSnapshot });
    expect(root.getSnapshot().wave.number).toBe(2);
    expect(root.getSnapshot().lives).toBe(18);
  });
});

// B32 — Tempo ×1–×4 und Auto-Wellen-Schalter, als Messung gegen die echte Sim:
// 1. Tempo ist deterministisch: ×4 führt in 1/4 der Realzeit zu IDENTISCHEN Tick-Ständen.
// 2. Auto-Wellen aus ⇒ keine Welle startet je von selbst, der Knopf bleibt der Ausweg.
// Der Sim-Tempo-Multiplikator lebt in der Uhr (Snapshot, test-gepinnt); die Auto-Wave-Entscheid
// ist Run-Zustand im Wellen-Slice (Owner: WaveSystem über Root-Command).

const SPEED_SEED = 2447771834;

function advance(root: SimulationRoot, ticks: number): void {
  for (let i = 0; i < ticks; i++) root.stepOnce();
}

describe('B32 — Sim-Tempo', () => {
  beforeEach(() => resetIds());

  it('×1 ist der Vertragswert und die Stufen sind 1–4', () => {
    const root = new SimulationRoot({ seed: SPEED_SEED });
    expect(root.speed).toBe(1);
    expect([...SPEED_STEPS]).toEqual([1, 2, 3, 4]);
  });

  it('×4 liefert in 1/4 der Realzeit exakt denselben Tick-Stand wie ×1 (Determinismus)', () => {
    const target = 40; // Ziel-Ticks
    const slow = new SimulationRoot({ seed: SPEED_SEED });
    slow.setSpeed(1);
    advance(slow, 1); // Warmup (Command-Drain etc.) — dann reale Zeit messen
    const slowStart = slow.getSnapshot().clock.tick;
    const realMsSlow = target * TICK_MS;
    slow.advance(realMsSlow);
    const slowTicks = slow.getSnapshot().clock.tick - slowStart;

    const fast = new SimulationRoot({ seed: SPEED_SEED });
    fast.setSpeed(4);
    advance(fast, 1);
    const fastStart = fast.getSnapshot().clock.tick;
    fast.advance(target * TICK_MS / 4); // NUR ein Viertel der reale Zeit
    const fastTicks = fast.getSnapshot().clock.tick - fastStart;

    expect(slowTicks).toBe(target);
    expect(fastTicks).toBe(target); // gleiche Ticks, 1/4 der Zeit
  });

  it('Tempo ändert NICHTS am Spielzustand bei gleichen Ticks (nur die Wanduhr läuft schneller)', () => {
    const slow = new SimulationRoot({ seed: SPEED_SEED });
    slow.setSpeed(3);
    for (let i = 0; i < 25; i++) slow.advance(TICK_MS); // reale Ms, Uhr skaliert ⇒ ~75 Ticks
    const a = slow.getSnapshot();

    const ref = new SimulationRoot({ seed: SPEED_SEED });
    advance(ref, a.clock.tick); // exakt dieselbe Tick-Zahl, aber per stepOnce
    const b = ref.getSnapshot();

    expect(b.clock.tick).toBe(a.clock.tick);
    expect(b.score).toBe(a.score);
    expect(b.wave.number).toBe(a.wave.number);
    expect(b.enemies.length).toBe(a.enemies.length);
    expect(b.plants.length).toBe(a.plants.length);
  });

  it('ungültige Stufen werden ignoriert (kein halbes Tempo, kein Überdrehen)', () => {
    const root = new SimulationRoot({ seed: SPEED_SEED });
    root.setSpeed(0.5);
    expect(root.speed).toBe(1);
    root.setSpeed(10);
    expect(root.speed).toBe(1);
    root.setSpeed(2);
    expect(root.speed).toBe(2);
  });
});

describe('B32 — Auto-Wellen-Schalter', () => {
  beforeEach(() => resetIds());

  it('Default kommt aus der Source und Auto-Wellen starten wie gehabt', () => {
    expect(AUTO_WAVES_DEFAULT).toBe(true);
    const root = new SimulationRoot({ seed: SPEED_SEED });
    const place = (seq: number) =>
      root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', seq, { variantId: 'sprout', gx: 1, gy: 2 }));
    place(1);
    advance(root, 2);
    advance(root, AUTO_WAVE_DELAY_TICKS + 2);
    expect(root.getSnapshot().wave.number).toBe(1); // autoWaves default an ⇒ alter Vertrag
  });

  it('ausgeschaltet startet NIE eine Welle von selbst — auch mit Pflanzen und viel Zeit nicht', () => {
    const root = new SimulationRoot({ seed: SPEED_SEED });
    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 1, { enabled: false }));
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 2 }));
    advance(root, AUTO_WAVE_DELAY_TICKS * 10);

    const s = root.getSnapshot();
    expect(s.wave.autoWaves).toBe(false);
    expect(s.phase).toBe('prep');
    expect(s.wave.number).toBe(0);
    expect(s.enemies).toHaveLength(0);
  });

  it('der Knopf bleibt der Ausweg (kein Softlock) — START_WAVE geht auch bei ausgeschaltetem Auto', () => {
    const root = new SimulationRoot({ seed: SPEED_SEED });
    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 1, { enabled: false }));
    advance(root, 1);
    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', 2, {}));
    advance(root, 1);
    expect(root.getSnapshot().phase).toBe('wave');
    expect(root.getSnapshot().wave.number).toBe(1);
  });

  it('der Schalter ist umkehrbar — an ⇒ Countdown läuft wieder', () => {
    const root = new SimulationRoot({ seed: SPEED_SEED });
    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 1, { enabled: false }));
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 2 }));
    advance(root, AUTO_WAVE_DELAY_TICKS * 5);
    expect(root.getSnapshot().wave.number).toBe(0);

    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 3, { enabled: true }));
    advance(root, AUTO_WAVE_DELAY_TICKS + 2);
    expect(root.getSnapshot().wave.number).toBe(1);
  });

  // RootInit - autoritative Run-Identitaet (migriert aus sim.test.ts)

  it('RootInit übernimmt autoritative Run-ID und Loadout in den SimState', () => {
    const root = new SimulationRoot({
      seed: 583921,
      runId: 17,
      loadout: ['cross_seedling'],
      bredStats: {
        cross_seedling: { hp: 120, damage: 18, range: 3, cooldown: 28, cost: 45, effects: ['EFFECT_CRIT'] },
      },
    });
    const state = root.getSnapshot();
    expect(state.runId).toBe(17);
    expect(state.loadout).toEqual(['cross_seedling']);
    expect(state.inventory.cross_seedling).toBe(2);
    expect(state.discoveredVariants).toContain('cross_seedling');
    expect(state.bredStats?.cross_seedling.effects).toEqual(['EFFECT_CRIT']);
  });
});
