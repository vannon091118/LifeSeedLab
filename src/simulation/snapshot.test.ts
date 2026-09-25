import { describe, it, expect } from 'vitest';
import { serializeSnapshot, deserializeSnapshot, SNAPSHOT_VERSION, EVENT_STREAM_VERSION } from './snapshot';
import { SimulationRoot } from './root';
import { makeCommand } from '../bus/commands';
import { makeRoot, hashOfRoot, testAttractorSpawn, testVectorDeposit } from '../testing/testkit';
import { createInitialWorld, worldSnapshotOf } from '../world/world_state';

describe('Snapshot boundary validation (AST001)', () => {
  const init = { seed: 42, worldSnapshot: worldSnapshotOf(createInitialWorld()) };

  it('serialisiert und deserialisiert einen echten SimulationState sauber', () => {
    const root = new SimulationRoot(init);
    const state = root.getSnapshot();
    const raw = serializeSnapshot(state);
    const restored = deserializeSnapshot(raw);
    expect(restored.seed).toBe(42);
    expect(restored.wave.number).toBe(state.wave.number);
  });

  it('verwirft unparsbaren JSON-String fail-closed', () => {
    expect(() => deserializeSnapshot('invalid-json{')).toThrow('Snapshot unparseable: invalid JSON');
  });

  it('verwirft primitive JSON-Werte fail-closed', () => {
    expect(() => deserializeSnapshot('12345')).toThrow('Snapshot invalid: root is not an object');
    expect(() => deserializeSnapshot('null')).toThrow('Snapshot invalid: root is not an object');
  });

  it('verwirft unvollständige Envelope-Objekte fail-closed', () => {
    expect(() => deserializeSnapshot(JSON.stringify({ version: 1 }))).toThrow('Snapshot invalid: missing envelope fields');
    expect(() => deserializeSnapshot(JSON.stringify({ version: 1, eventStreamVersion: 1, hash: 'h' }))).toThrow('Snapshot invalid: missing envelope fields');
  });

  it('erkennt Version-Mismatch', () => {
    const root = new SimulationRoot(init);
    const env = {
      version: 99,
      eventStreamVersion: EVENT_STREAM_VERSION,
      hash: 'fake',
      state: root.getSnapshot(),
    };
    expect(() => deserializeSnapshot(JSON.stringify(env))).toThrow('Snapshot version mismatch: 99 ≠ 1');
  });
});

describe('Observation boundary — schmale read-only Testprojektion', () => {
  function rootWithObservables(): SimulationRoot {
    const root = makeRoot({ seed: 42, loadout: ['sprout'], ownedCounts: { sprout: 1 } });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    for (let i = 0; i < 24; i++) root.stepOnce();
    testVectorDeposit(root, 3, 3, 'VECTOR_HEAT', 1);
    testAttractorSpawn(root, 3, 3, 1, 3, 180);
    return root;
  }

  it('liefert frische Kopien; verschachtelte Mutationen erreichen den Writer nicht', () => {
    const root = rootWithObservables();
    const beforeHash = hashOfRoot(root);
    const first = root.getObservation();
    const second = root.getObservation();
    expect(first).not.toHaveProperty('inventory');
    expect(first).not.toHaveProperty('projectiles');
    expect(first.plants).toHaveLength(1);
    expect(first.enemies.length).toBeGreaterThan(0);
    expect(first.currentRoute).not.toBeNull();
    expect(Object.keys(first.vectors).length).toBeGreaterThan(0);
    expect(first.attractors).toHaveLength(1);

    const mutable = first as unknown as {
      clock: { tick: number };
      currentRoute: { x: number }[] | null;
      plants: { hp: number }[];
      enemies: { px: number }[];
      vectors: Record<string, { intensity: number }[]>;
      attractors: { ttl: number }[];
    };
    const route = mutable.currentRoute?.[0];
    const plant = mutable.plants[0];
    const enemy = mutable.enemies[0];
    const vectorKey = Object.keys(mutable.vectors)[0];
    const vectorCell = vectorKey ? mutable.vectors[vectorKey]?.[0] : undefined;
    const attractor = mutable.attractors[0];
    if (!route || !plant || !enemy || !vectorKey || !vectorCell || !attractor) throw new Error('Observation-Fixture unvollständig');
    const original = {
      tick: first.clock.tick,
      routeX: route.x,
      plantHp: plant.hp,
      enemyPx: enemy.px,
      vectorIntensity: vectorCell.intensity,
      attractorTtl: attractor.ttl,
    };
    mutable.clock.tick = -1;
    route.x = -999;
    plant.hp = -1;
    enemy.px = -999;
    vectorCell.intensity = -999;
    attractor.ttl = -1;

    const after = root.getObservation();
    expect(after.clock.tick).toBe(original.tick);
    expect(after.currentRoute?.[0]?.x).toBe(original.routeX);
    expect(after.plants[0]?.hp).toBe(original.plantHp);
    expect(after.enemies[0]?.px).toBe(original.enemyPx);
    expect(after.vectors[vectorKey]?.[0]?.intensity).toBe(original.vectorIntensity);
    expect(after.attractors[0]?.ttl).toBe(original.attractorTtl);
    expect(second.clock.tick).toBe(original.tick);
    expect(second.currentRoute?.[0]?.x).toBe(original.routeX);
    expect(second.plants[0]?.hp).toBe(original.plantHp);
    expect(second.enemies[0]?.px).toBe(original.enemyPx);
    expect(second.vectors[vectorKey]?.[0]?.intensity).toBe(original.vectorIntensity);
    expect(second.attractors[0]?.ttl).toBe(original.attractorTtl);
    expect(hashOfRoot(root)).toBe(beforeHash);
  });

  it('lässt getSnapshot als vollständige, unabhängige Integritätsprojektion bestehen', () => {
    const root = rootWithObservables();
    const before = root.getSnapshot();
    const observation = root.getObservation();
    const mutablePlant = observation.plants[0] as unknown as { hp: number };
    mutablePlant.hp = -1;
    const after = root.getSnapshot();
    expect(after).toEqual(before);
    expect(after).toHaveProperty('inventory');
    expect(after).toHaveProperty('projectiles');
  });
});
