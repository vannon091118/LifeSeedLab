// Owner: TransportSystem. LOC ≤ 200.
// Phase E — Multiplayer-nahtfähige Runtime OHNE Netzwerk.
// Versioniertes CommandTransport-Interface + Local/Remote Mocks.
// SimulationRoot kennt KEINEN Transport — Adapter schieben nur in die bestehende CommandQueue.

import type { Command } from './commands';

export const TRANSPORT_VERSION = 1 as const;

export interface TransportEnvelope {
  version: typeof TRANSPORT_VERSION;
  tick: number;
  actorId: string;
  seq: number;
  command: Command;
}

export interface CommandTransport {
  /** Protokollversion — Gate E verifiziert Kompatibilität. */
  readonly version: typeof TRANSPORT_VERSION;
  /** Queue-Eingang der Simulation (SimulationRoot.commands). */
  send(envelope: TransportEnvelope): void;
  /** Drain für Tests / Mock-Remote — leert interne Puffer. */
  drain?(): TransportEnvelope[];
}

/** Lokaler Transport — Standardadapter: pusht direkt in die CommandQueue. */
export class LocalTransport implements CommandTransport {
  readonly version = TRANSPORT_VERSION;
  constructor(private queue: { push: (c: Command) => void }) {}
  send(envelope: TransportEnvelope): void {
    if (envelope.version !== TRANSPORT_VERSION) throw new Error(`Transport version mismatch: ${envelope.version} ≠ ${TRANSPORT_VERSION}`);
    this.queue.push(envelope.command);
  }
}

/** Remote-Mock — typisierte Grenze ohne Netzwerk (Phase E). Puffert, drain() liefert sortiert nach tick. */
export class MockRemoteTransport implements CommandTransport {
  readonly version = TRANSPORT_VERSION;
  private buf: TransportEnvelope[] = [];
  send(envelope: TransportEnvelope): void {
    if (envelope.version !== TRANSPORT_VERSION) throw new Error(`Transport version mismatch: ${envelope.version} ≠ ${TRANSPORT_VERSION}`);
    this.buf.push(envelope);
  }
  /** Netzwerk-Sortierung nach tick (Contract: Command-Sortierung nach Tick, ARCHITECTURE.md §4). */
  drain(): TransportEnvelope[] {
    const out = [...this.buf].sort((a, b) => a.tick - b.tick || a.seq - b.seq);
    this.buf = [];
    return out;
  }
  /** Flush in eine echte Queue (Test-Helper) */
  flushTo(queue: { push: (c: Command) => void }): void {
    for (const e of this.drain()) queue.push(e.command);
  }
}
