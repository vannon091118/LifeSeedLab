import { describe, it, expect } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import type { ResumeSnapshot } from './resume';
import type { RunSave } from '../persistence/runSave';

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
