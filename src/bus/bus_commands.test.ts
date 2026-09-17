import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Bus-Tests — Sub-Domäne „Commands & Transport“ (B32.2/3, Phase 4).
// Konsolidierung: bus.test.ts (Phase 3.3 Commands) + transport.test.ts (Gate E).

import { LocalTransport, MockRemoteTransport, TRANSPORT_VERSION } from './transport';
import { CommandQueue, makeCommand } from './commands';
import { nextScopedId, resetIds } from '../core/ids';
import { serializeSnapshot, deserializeSnapshot, SNAPSHOT_VERSION, EVENT_STREAM_VERSION, snapshotHash } from '../simulation/snapshot';
import { SimulationRoot, makeCommand as rootMakeCommand } from '../simulation/root';

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

describe('Gate E — CommandTransport (versioniert, ohne Netzwerk)', () => {
  it('LocalTransport schiebt in die bestehende CommandQueue (SimulationRoot kennt keinen Transport)', () => {
    const q = new CommandQueue();
    const t = new LocalTransport(q);
    expect(t.version).toBe(TRANSPORT_VERSION);
    const cmd = makeCommand(5, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 1 });
    t.send({ version: TRANSPORT_VERSION, tick: 5, actorId: 'player', seq: 1, command: cmd });
    expect(q.size).toBe(1);
    expect(q.drain()[0].type).toBe('PLACE_PLANT');
  });

  it('MockRemote ist typisierte Grenze: drain sortiert nach Tick', () => {
    const r = new MockRemoteTransport();
    const a = makeCommand(10, 'START_WAVE', 1, {});
    const b = makeCommand(3, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 0, gy: 0 });
    r.send({ version: TRANSPORT_VERSION, tick: 10, actorId: 'remote', seq: 1, command: a });
    r.send({ version: TRANSPORT_VERSION, tick: 3, actorId: 'remote', seq: 2, command: b });
    const out = r.drain()!;
    expect(out[0].tick).toBe(3);
    expect(out[1].tick).toBe(10);
  });

  it('Remote flushTo erreicht denselben Queue-Eingang wie lokal', () => {
    const q = new CommandQueue();
    const local = new LocalTransport(q);
    const remote = new MockRemoteTransport();
    const cmd1 = makeCommand(1, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 0, gy: 0 });
    const cmd2 = makeCommand(2, 'PLACE_PLANT', 2, { variantId: 'sprout', gx: 1, gy: 1 });
    local.send({ version: TRANSPORT_VERSION, tick: 1, actorId: 'player', seq: 1, command: cmd1 });
    remote.send({ version: TRANSPORT_VERSION, tick: 2, actorId: 'remote', seq: 2, command: cmd2 });
    remote.flushTo(q);
    const drained = q.drain();
    expect(drained.map(c => c.type)).toEqual(['PLACE_PLANT', 'PLACE_PLANT']);
  });

  it('Version-Mismatch wirft', () => {
    const q = new CommandQueue();
    const t = new LocalTransport(q);
    const cmd = makeCommand(0, 'START_WAVE', 1, {});
    expect(() => t.send({ version: 999 as never, tick: 0, actorId: 'player', seq: 1, command: cmd })).toThrow();
  });
});

describe('Gate E — deterministische IDs um Run-/Match-Kontext (ohne UUID)', () => {
  it('gleicher (runId, seq, kind) ⇒ gleiche ID; anderer Kontext ⇒ andere ID', () => {
    const a = nextScopedId(7, 'plant', 42);
    const b = nextScopedId(7, 'plant', 42);
    const c = nextScopedId(8, 'plant', 42);
    const d = nextScopedId(7, 'enemy', 42);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });
});

describe('Gate E — Snapshot-Serialisierung, Event-Stream-Version und State-Hash', () => {
  beforeEach(() => resetIds());

  it('serialize → deserialize ist round-trip mit Hash-Check', () => {
    const root = new SimulationRoot({ seed: 123 });
    root.commands.push(rootMakeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 1 }));
    for (let i = 0; i < 20; i++) root.stepOnce();
    const raw = serializeSnapshot(root.getSnapshot());
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(SNAPSHOT_VERSION);
    expect(parsed.eventStreamVersion).toBe(EVENT_STREAM_VERSION);
    expect(typeof parsed.hash).toBe('string');
    const restored = deserializeSnapshot(raw);
    expect(snapshotHash(restored)).toBe(parsed.hash);
  });

  it('State-Hash ist öffentlich und stabil (gleicher State ⇒ gleicher Hash)', () => {
    const a = new SimulationRoot({ seed: 999 });
    const b = new SimulationRoot({ seed: 999 });
    for (let i = 0; i < 50; i++) { a.stepOnce(); b.stepOnce(); }
    expect(snapshotHash(a.getSnapshot())).toBe(snapshotHash(b.getSnapshot()));
  });

  it('korrupter Hash / falsche Version wirft', () => {
    const root = new SimulationRoot({ seed: 1 });
    const raw = serializeSnapshot(root.getSnapshot());
    const tampered = raw.replace(/"hash":"[0-9a-f]+"/, '"hash":"deadbeef"');
    expect(() => deserializeSnapshot(tampered)).toThrow();
    const badVer = JSON.stringify({ ...JSON.parse(raw), version: 999 });
    expect(() => deserializeSnapshot(badVer)).toThrow();
  });
});
