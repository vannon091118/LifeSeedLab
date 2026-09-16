import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';
import { AUTO_WAVE_DELAY_TICKS } from '../config/economy.source';
import { autoStartTicksLeft } from './waveTiming';

// B23.1 — Der Befund beider Spielerberichte, als Messung gegen die echte Sim:
// „Ich habe mehrfach in Welle 1 mit Score 0 verloren, weil der Kampf begann, bevor ich eine
// Pflanze stehen hatte." Vorher startete `maybeAutoStart` die Welle nach AUTO_WAVE_DELAY_TICKS,
// unabhängig davon, ob überhaupt etwas auf dem Feld stand.

const SEED = 2447771834;

function place(root: SimulationRoot, variantId: string, gx: number, gy: number, seq = 1): void {
  root.commands.push(makeCommand(root.clock.get().tick, 'PLACE_PLANT', seq, { variantId, gx, gy }));
}

function advance(root: SimulationRoot, ticks: number): void {
  for (let i = 0; i < ticks; i++) root.stepOnce();
}

describe('B23.1 — Aufbauphase ohne Beschuss', () => {
  beforeEach(() => resetIds());

  it('startet KEINE Welle, solange nichts gepflanzt ist — auch nach 20 Sekunden nicht', () => {
    const root = new SimulationRoot({ seed: SEED });
    advance(root, AUTO_WAVE_DELAY_TICKS * 7);

    const s = root.getSnapshot();
    expect(s.phase).toBe('prep');
    expect(s.wave.number).toBe(0);
    expect(s.enemies).toHaveLength(0);
    expect(s.score).toBe(0);
  });

  it('startet die Welle, sobald eine Pflanze steht und das Fenster abgelaufen ist', () => {
    const root = new SimulationRoot({ seed: SEED });
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
    const root = new SimulationRoot({ seed: SEED });
    advance(root, AUTO_WAVE_DELAY_TICKS * 3);
    expect(root.getSnapshot().wave.number).toBe(0);

    root.commands.push(makeCommand(root.clock.get().tick, 'START_WAVE', 1, {}));
    advance(root, 1);
    expect(root.getSnapshot().phase).toBe('wave');
    expect(root.getSnapshot().wave.number).toBe(1);
  });

  it('meldet dem HUD die Wartezeit als „das Labor wartet“ (null) — dieselbe Regel', () => {
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: 0, tick: 999, plantCount: 0 })).toBeNull();
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: 0, tick: 10, plantCount: 1 }))
      .toBe(AUTO_WAVE_DELAY_TICKS - 10);
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: 0, tick: 999, plantCount: 1 })).toBe(0);
    expect(autoStartTicksLeft({ phase: 'wave', prepStartTick: 0, tick: 10, plantCount: 1 })).toBeNull();
    expect(autoStartTicksLeft({ phase: 'prep', prepStartTick: null, tick: 10, plantCount: 1 })).toBeNull();
  });
});
