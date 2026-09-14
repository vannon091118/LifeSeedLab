import { describe, it, expect } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { rollBrood } from '../genome/beetle';

// P6 Integration: Deploy über den Command-Pfad — kein UI-Zugriff auf State.

type Snap = ReturnType<SimulationRoot['getSnapshot']>;

function castRoot(root: SimulationRoot): { state: Snap } {
  return { state: root.getSnapshot() as Snap };
}

describe('beetle deploy (P6 Integration)', () => {
  it('DEPLOY_BEETLE setzt den Brutling ein, zieht Energie ab, feuert BEETLE_DEPLOYED', () => {
    const brood = rollBrood('leafhopper', 'shellbeetle', 5);
    const root = new SimulationRoot({ seed: 77, beetles: brood });
    const { state } = castRoot(root);
    const energyBefore = state.resources.energy;

    const events: string[] = [];
    root.bus.subscribe('BEETLE_DEPLOYED', () => events.push('DEPLOYED'));

    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: brood[0].id }));
    root.stepOnce();

    expect(state.deployedBeetle).not.toBeNull();
    expect(state.deployedBeetle!.id).toBe(`beetle_${brood[0].id}`);
    expect(state.resources.energy).toBe(energyBefore - brood[0].stats.cost);
    expect(events).toContain('DEPLOYED');
    // Spawn 1×–5×: zusätzliche Brutlinge im EIGENEN Käfer-Slice (nicht state.enemies —
    // sonst würden die eigenen Pflanzen die Verbündeten beschießen)
    expect(state.deployedBeetle!.broodlings.length).toBe(brood[0].stats.spawnX - 1);
  });

  it('Zweiter Deploy wird abgewiesen (BEETLE_REJECTED, already_deployed)', () => {
    const brood = rollBrood('bumble', 'bumble', 2);
    const root = new SimulationRoot({ seed: 78, beetles: brood });
    const { state } = castRoot(root);
    const rejects: string[] = [];
    root.bus.subscribe('BEETLE_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));

    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: brood[0].id }));
    root.stepOnce();
    root.commands.push(makeCommand(1, 'DEPLOY_BEETLE', 2, { beetleId: brood[1].id }));
    root.stepOnce();

    expect(rejects).toContain('already_deployed');
    expect(state.deployedBeetle).not.toBeNull();
  });

  it('Brutling beißt Gegner (HP sinkt über Ticks)', () => {
    const brood = rollBrood('leafhopper', 'bumble', 9);
    const root = new SimulationRoot({ seed: 79, beetles: brood });
    const { state } = castRoot(root);

    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: brood[0].id }));
    root.stepOnce();
    // Test-Fixture: ein Gegner direkt neben dem Brutling (prep-Phase spawnt keine).
    const b = state.deployedBeetle!;
    const foe = {
      id: 'foe_1', typeId: 'grunt' as const, hp: 100, maxHp: 100,
      px: b.px + 0.2, py: b.py, pathIndex: 0, pathProgress: 0.5,
      damage: 1, reward: 5, scoreValue: 5,
      slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: null,
    };
    state.enemies.push(foe);

    const hpBefore = foe.hp;
    // updateBeetle läuft NUR in der Wave-Phase — wechsle dorthin für den Kampf-Test.
    state.phase = 'wave';
    for (let i = 0; i < 60; i++) root.stepOnce();
    const hpAfter = state.enemies.find(e => e.id === 'foe_1')?.hp ?? 0;

    expect(state.deployedBeetle).not.toBeNull();
    expect(hpAfter).toBeLessThan(hpBefore);
  });

  it('Ohne Käfer im Lager: kein Deploy (BEETLE_REJECTED, none_available)', () => {
    const root = new SimulationRoot({ seed: 80 });
    const rejects: string[] = [];
    root.bus.subscribe('BEETLE_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: 'ghost' }));
    root.stepOnce();
    expect(rejects).toContain('none_available');
  });
});
