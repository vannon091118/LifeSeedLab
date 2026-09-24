import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Bus-Tests — Sub-Domäne „Commands“ (Phase 3.3). Der frühere Transport-Vertrag
// hatte keinen Produktionskonsumenten und wurde entfernt; Command-Queue-Tests bleiben hier.

import { CommandQueue, makeCommand } from './commands';
import { nextScopedId, resetIds } from '../core/ids';
import { serializeSnapshot, deserializeSnapshot, SNAPSHOT_VERSION, EVENT_STREAM_VERSION, snapshotHash } from '../simulation/snapshot';
import { makeCommand as rootMakeCommand } from '../simulation/root';
import { makeRoot } from '../testing/testkit';

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
    const root = makeRoot({ seed: 123 });
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
    const a = makeRoot({ seed: 999 });
    const b = makeRoot({ seed: 999 });
    for (let i = 0; i < 50; i++) { a.stepOnce(); b.stepOnce(); }
    expect(snapshotHash(a.getSnapshot())).toBe(snapshotHash(b.getSnapshot()));
  });

  it('korrupter Hash / falsche Version wirft', () => {
    const root = makeRoot({ seed: 1 });
    const raw = serializeSnapshot(root.getSnapshot());
    const tampered = raw.replace(/"hash":"[0-9a-f]+"/, '"hash":"deadbeef"');
    expect(() => deserializeSnapshot(tampered)).toThrow();
    const badVer = JSON.stringify({ ...JSON.parse(raw), version: 999 });
    expect(() => deserializeSnapshot(badVer)).toThrow();
  });
});
