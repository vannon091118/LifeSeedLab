import { describe, it, expect } from 'vitest';
import { serializeSnapshot, deserializeSnapshot, SNAPSHOT_VERSION, EVENT_STREAM_VERSION } from './snapshot';
import { SimulationRoot } from './root';
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
