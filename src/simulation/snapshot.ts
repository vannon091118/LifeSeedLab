// Owner: SnapshotSystem. LOC ≤ 200.
// Öffentlicher Snapshot-Contract: Serialisierung + Event-Stream-Version + State-Hash (Gate E).

import type { SimState } from './state';
import { hashState, type HashableState } from '../core/hash';

export const SNAPSHOT_VERSION = 1 as const;
export const EVENT_STREAM_VERSION = 1 as const;

export interface SnapshotEnvelope {
  version: typeof SNAPSHOT_VERSION;
  eventStreamVersion: typeof EVENT_STREAM_VERSION;
  hash: string;
  state: SimState;
}

export function toHashable(state: SimState): HashableState {
  return {
    seed: state.seed,
    clock: state.clock,
    wave: { number: state.wave.number },
    plants: state.plants.map(p => ({ id: p.id, gx: p.gx, gy: p.gy, hp: p.hp, variantId: p.variantId, lastShot: p.lastShot })),
    enemies: state.enemies.map(e => ({ id: e.id, hp: e.hp, px: e.px, py: e.py, pathIndex: e.pathIndex })),
    projectiles: state.projectiles.map(p => ({ id: p.id, px: p.px, py: p.py, dx: p.dx, dy: p.dy })),
    score: state.score,
    combo: state.combo,
  };
}

export function snapshotHash(state: SimState): string {
  return hashState(toHashable(state));
}

export function serializeSnapshot(state: SimState): string {
  const env: SnapshotEnvelope = {
    version: SNAPSHOT_VERSION,
    eventStreamVersion: EVENT_STREAM_VERSION,
    hash: snapshotHash(state),
    state,
  };
  return JSON.stringify(env);
}

export function deserializeSnapshot(raw: string): SimState {
  const env = JSON.parse(raw) as SnapshotEnvelope;
  if (env.version !== SNAPSHOT_VERSION) throw new Error(`Snapshot version mismatch: ${env.version} ≠ ${SNAPSHOT_VERSION}`);
  if (env.eventStreamVersion !== EVENT_STREAM_VERSION) throw new Error(`Event stream version mismatch: ${env.eventStreamVersion} ≠ ${EVENT_STREAM_VERSION}`);
  const h = snapshotHash(env.state);
  if (h !== env.hash) throw new Error(`Snapshot hash mismatch: ${h} ≠ ${env.hash}`);
  return env.state;
}
