// B32 — Tempo ×1–×4 und Auto-Wellen-Schalter, als Messung gegen die echte Sim:
// 1. Tempo ist deterministisch: ×4 führt in 1/4 der Realzeit zu IDENTISCHEN Tick-Ständen.
// 2. Auto-Wellen aus ⇒ keine Welle startet je von selbst, der Knopf bleibt der Ausweg.
// Der Sim-Tempo-Multiplikator lebt in der Uhr (Snapshot, test-gepinnt); die Auto-Wave-Entscheid
// ist Run-Zustand im Wellen-Slice (Owner: WaveSystem über Root-Command).

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';
import { TICK_MS, SPEED_STEPS } from '../core/clock';
import { AUTO_WAVE_DELAY_TICKS, AUTO_WAVES_DEFAULT } from '../config/economy.source';

const SEED = 2447771834;

function advance(root: SimulationRoot, ticks: number): void {
  for (let i = 0; i < ticks; i++) root.stepOnce();
}

describe('B32 — Sim-Tempo', () => {
  beforeEach(() => resetIds());

  it('×1 ist der Vertragswert und die Stufen sind 1–4', () => {
    const root = new SimulationRoot({ seed: SEED });
    expect(root.speed).toBe(1);
    expect([...SPEED_STEPS]).toEqual([1, 2, 3, 4]);
  });

  it('×4 liefert in 1/4 der Realzeit exakt denselben Tick-Stand wie ×1 (Determinismus)', () => {
    const target = 40; // Ziel-Ticks
    const slow = new SimulationRoot({ seed: SEED });
    slow.setSpeed(1);
    advance(slow, 1); // Warmup (Command-Drain etc.) — dann reale Zeit messen
    const slowStart = slow.getSnapshot().clock.tick;
    const realMsSlow = target * TICK_MS;
    slow.advance(realMsSlow);
    const slowTicks = slow.getSnapshot().clock.tick - slowStart;

    const fast = new SimulationRoot({ seed: SEED });
    fast.setSpeed(4);
    advance(fast, 1);
    const fastStart = fast.getSnapshot().clock.tick;
    fast.advance(target * TICK_MS / 4); // NUR ein Viertel der reale Zeit
    const fastTicks = fast.getSnapshot().clock.tick - fastStart;

    expect(slowTicks).toBe(target);
    expect(fastTicks).toBe(target); // gleiche Ticks, 1/4 der Zeit
  });

  it('Tempo ändert NICHTS am Spielzustand bei gleichen Ticks (nur die Wanduhr läuft schneller)', () => {
    const slow = new SimulationRoot({ seed: SEED });
    slow.setSpeed(3);
    for (let i = 0; i < 25; i++) slow.advance(TICK_MS); // reale Ms, Uhr skaliert ⇒ ~75 Ticks
    const a = slow.getSnapshot();

    const ref = new SimulationRoot({ seed: SEED });
    advance(ref, a.clock.tick); // exakt dieselbe Tick-Zahl, aber per stepOnce
    const b = ref.getSnapshot();

    expect(b.clock.tick).toBe(a.clock.tick);
    expect(b.score).toBe(a.score);
    expect(b.wave.number).toBe(a.wave.number);
    expect(b.enemies.length).toBe(a.enemies.length);
    expect(b.plants.length).toBe(a.plants.length);
  });

  it('ungültige Stufen werden ignoriert (kein halbes Tempo, kein Überdrehen)', () => {
    const root = new SimulationRoot({ seed: SEED });
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
    const root = new SimulationRoot({ seed: SEED });
    const place = (seq: number) =>
      root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', seq, { variantId: 'sprout', gx: 1, gy: 2 }));
    place(1);
    advance(root, 2);
    advance(root, AUTO_WAVE_DELAY_TICKS + 2);
    expect(root.getSnapshot().wave.number).toBe(1); // autoWaves default an ⇒ alter Vertrag
  });

  it('ausgeschaltet startet NIE eine Welle von selbst — auch mit Pflanzen und viel Zeit nicht', () => {
    const root = new SimulationRoot({ seed: SEED });
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
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 1, { enabled: false }));
    advance(root, 1);
    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', 2, {}));
    advance(root, 1);
    expect(root.getSnapshot().phase).toBe('wave');
    expect(root.getSnapshot().wave.number).toBe(1);
  });

  it('der Schalter ist umkehrbar — an ⇒ Countdown läuft wieder', () => {
    const root = new SimulationRoot({ seed: SEED });
    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 1, { enabled: false }));
    root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 2 }));
    advance(root, AUTO_WAVE_DELAY_TICKS * 5);
    expect(root.getSnapshot().wave.number).toBe(0);

    root.commands.push(makeCommand(root.clock.get().tick, 'SET_AUTO_WAVES', 3, { enabled: true }));
    advance(root, AUTO_WAVE_DELAY_TICKS + 2);
    expect(root.getSnapshot().wave.number).toBe(1);
  });
});
