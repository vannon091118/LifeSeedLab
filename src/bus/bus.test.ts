import { describe, it, expect } from 'vitest';
import { EventBus } from './bus';
import { makeEvent, assertEventContract } from './events';
import { makeCommand, CommandQueue } from './commands';

describe('Phase 3.1/3.2 EventBus + contract', () => {
  it('publish/subscribe dispatches in order', () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe('ENEMY_DIED', e => seen.push(`a:${e.payload.enemyId}`));
    bus.subscribe('ENEMY_DIED', e => seen.push(`b:${e.payload.enemyId}`));

    const e = makeEvent(10, 'ENEMY_DIED', 'enemy-0001', 1, {
      enemyId: 'enemy-0001', px: 1, py: 2, reward: 5, killerPlantId: null,
    });
    bus.publish(e);
    expect(seen).toEqual(['a:enemy-0001', 'b:enemy-0001']);
  });

  it('unsubscribed handlers stop receiving events', () => {
    const bus = new EventBus();
    let calls = 0;
    const off = bus.subscribe('SCORE_CHANGED', () => calls++);
    off();
    bus.publish(makeEvent(1, 'SCORE_CHANGED', 'system:score', 1, { score: 10, delta: 10 }));
    expect(calls).toBe(0);
  });

  it('eventId is composed of tick:source:type:seq and passes contract assertion', () => {
    const e = makeEvent(42, 'PLANT_PLACED', 'plant-0007', 3, {
      plantId: 'plant-0007', variantId: 'base_shooter', gx: 2, gy: 3,
    });
    expect(e.eventId).toBe('42:plant-0007:PLANT_PLACED:3');
    expect(() => assertEventContract(e)).not.toThrow();
  });

  it('contract assertion rejects malformed events', () => {
    const bad = makeEvent(1, 'WAVE_STARTED', 'system:wave', 1, { wave: 1, enemyCount: 5 });
    // strip a required field to simulate corruption
    const broken = { ...bad, sourceId: '' } as typeof bad;
    expect(() => assertEventContract(broken)).toThrow();
  });

  it('events carry version 1', () => {
    const e = makeEvent(0, 'RUN_STARTED', 'system:run', 0, { seed: 583921 });
    expect(e.version).toBe(1);
  });

  it('different event types do not cross-dispatch', () => {
    const bus = new EventBus();
    let hits = 0;
    bus.subscribe('PROJECTILE_HIT', () => hits++);
    bus.publish(makeEvent(5, 'PROJECTILE_FIRED', 'plant-0001', 1, {
      projectileId: 'proj-0001', plantId: 'plant-0001', targetId: 'enemy-0001', damage: 10, effectId: null,
    }));
    expect(hits).toBe(0);
  });
});

describe('Phase 3.3 Commands', () => {
  it('command schema is complete and stable', () => {
    const c = makeCommand(7, 'PLACE_PLANT', 2, { variantId: 'base_shooter', gx: 1, gy: 1 });
    expect(c.commandId).toBe('cmd:7:PLACE_PLANT:2');
    expect(c.actorId).toBe('player');
    expect(c.version).toBe(1);
    expect(c.tick).toBe(7);
  });

  it('CommandQueue drains FIFO and leaves an empty queue', () => {
    const q = new CommandQueue();
    q.push(makeCommand(1, 'START_WAVE', 1, {}));
    q.push(makeCommand(1, 'PLACE_PLANT', 2, { variantId: 'base_wall', gx: 3, gy: 3 }));
    expect(q.size).toBe(2);

    const drained = q.drain();
    expect(drained.map(c => c.type)).toEqual(['START_WAVE', 'PLACE_PLANT']);
    expect(q.size).toBe(0);
    expect(q.drain()).toEqual([]);
  });

  it('clear empties pending commands', () => {
    const q = new CommandQueue();
    q.push(makeCommand(1, 'SELECT_PLANT', 1, { variantId: 'base_shooter' }));
    q.clear();
    expect(q.size).toBe(0);
  });
});
