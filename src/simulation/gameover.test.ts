import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { resetIds } from '../core/ids';

const SEED = 424242;

/** Treibt den Run in den Game-Over-Zustand (Leak am Pfadende — nur Commands, kein Live-State). */
function forceGameOver(root: SimulationRoot): void {
  root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
  // Keine Pflanzen ⇒ jeder Gegner leakt; zwei Leaks beenden den Run (20 Leben, 10/Leak).
  let guard = 0;
  while (root.getSnapshot().phase !== 'gameover' && guard++ < 30000) root.stepOnce();
  expect(root.getSnapshot().phase).toBe('gameover');
}

describe('Game Over friert am Owner (P1)', () => {
  beforeEach(() => resetIds());

  it('nach GAME_OVER führen Commands zu nichts (keine Pflanzen, kein Energieverbrauch)', () => {
    const root = new SimulationRoot({ seed: SEED });
    forceGameOver(root);
    const snap = root.getSnapshot();
    const energy = snap.resources.energy;
    const plants = snap.plants.length;

    root.commands.push(makeCommand(snap.clock.tick, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.commands.push(makeCommand(snap.clock.tick, 'FERTILIZE_PLANT', 3, { plantId: 'plant-0001' }));
    root.commands.push(makeCommand(snap.clock.tick, 'PROPAGATE_PLANT', 4, { plantId: 'plant-0001' }));
    root.commands.push(makeCommand(snap.clock.tick, 'START_WAVE', 5, {}));
    root.stepOnce();
    root.stepOnce();

    expect(root.getSnapshot().plants.length).toBe(plants);
    expect(root.getSnapshot().resources.energy).toBe(energy);
    expect(root.getSnapshot().phase).toBe('gameover');
  });

  it('nach GAME_OVER läuft die Uhr nicht mehr (keine Ticks, keine Tag/Nacht-Events)', () => {
    const root = new SimulationRoot({ seed: SEED });
    forceGameOver(root);
    const tickBefore = root.getSnapshot().clock.tick;

    let events = 0;
    for (const type of ['GAME_OVER', 'WAVE_STARTED', 'WAVE_COMPLETED', 'NIGHT_STARTED', 'DAY_STARTED'] as const) {
      root.bus.subscribe(type, () => { events++; });
    }
    for (let i = 0; i < 3000; i++) root.stepOnce();

    expect(root.getSnapshot().clock.tick).toBe(tickBefore);
    expect(events).toBe(0);
    expect(root.getSnapshot().phase).toBe('gameover');
  });

  it('Platzierungen nach Game Over verändern den State-Hash nicht', () => {
    const root = new SimulationRoot({ seed: SEED });
    forceGameOver(root);
    const s = root.getSnapshot();
    const before = JSON.stringify({
      tick: s.clock.tick, lives: s.lives, plants: s.plants, wave: s.wave.number, energy: s.resources.energy,
    });
    root.commands.push(makeCommand(s.clock.tick, 'PLACE_PLANT', 9, { variantId: 'sprout', gx: 3, gy: 3 }));
    for (let i = 0; i < 120; i++) root.stepOnce();
    const s2 = root.getSnapshot();
    const after = JSON.stringify({
      tick: s2.clock.tick, lives: s2.lives, plants: s2.plants, wave: s2.wave.number, energy: s2.resources.energy,
    });
    expect(after).toBe(before);
  });
});
