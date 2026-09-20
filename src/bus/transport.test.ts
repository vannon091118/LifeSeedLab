import { describe, it, expect } from 'vitest';

// Owner: Bus-Tests — Transport (Gate E). Umgezogen aus bus_commands.test.ts: Code und
// Beweis gehören in dieselbe Domäne; die Produktions-Verdrahtung folgt mit Multiplayer.
import { LocalTransport, MockRemoteTransport, TRANSPORT_VERSION } from './transport';
import { CommandQueue, makeCommand } from './commands';

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
