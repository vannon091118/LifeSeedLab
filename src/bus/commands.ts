// Owner: CommandSystem. LOC ≤ 300.
// Player input NEVER touches gameplay objects directly (contract Phase 3.3).

import type { GameEvent } from './events';

export type CommandType =
  | 'PLACE_PLANT'
  | 'REMOVE_PLANT'
  | 'START_WAVE'
  | 'BREED_PLANTS'
  | 'SELECT_PLANT'
  | 'CANCEL_PLACEMENT'
  | 'INSPECT'
  | 'FERTILIZE_PLANT'
  | 'PROPAGATE_PLANT'
  | 'PLACE_TILE'
  /** Juggling (Mazing-Königsdisziplin): Tile verkaufen — Refund + Route kippt mid-Welle. */
  | 'REMOVE_TILE'
  | 'DEPLOY_BEETLE'
  | 'EXPAND_MAP'
  | 'SET_AUTO_WAVES'
  /** R1: Build-Sequenz sanft beenden — der „Fertig"-Knopf des Layout-Screens. */
  | 'BEGIN_WAVE_PREP';

export interface CommandPayloads {
  PLACE_PLANT: { variantId: string; gx: number; gy: number };
  REMOVE_PLANT: { plantId: string };
  START_WAVE: Record<string, never>;
  BREED_PLANTS: { parentAId: string; parentBId: string; generation: number };
  SELECT_PLANT: { variantId: string };
  CANCEL_PLACEMENT: Record<string, never>;
  INSPECT: { entityId: string | null };
  FERTILIZE_PLANT: { plantId: string };
  PROPAGATE_PLANT: { plantId: string };
  PLACE_TILE: { gx: number; gy: number; tile: string };
  REMOVE_TILE: { gx: number; gy: number };
  DEPLOY_BEETLE: { beetleId: string };
  EXPAND_MAP: { gx: number; gy: number };
  /** B32: Spieler-Entscheid — starten Wellen nach der Vorbereitung von selbst? */
  SET_AUTO_WAVES: { enabled: boolean };
  /** R1: Build-Sequenz sanft beenden — beginnt die Vorbereitung der ersten Welle. */
  BEGIN_WAVE_PREP: Record<string, never>;
}

export type Command = {
  [K in CommandType]: {
    commandId: string;
    tick: number;
    type: K;
    actorId: string; // 'player' for user input
    version: 1;
    payload: CommandPayloads[K];
  };
}[CommandType];

export function makeCommand<K extends CommandType>(
  tick: number,
  type: K,
  seq: number,
  payload: CommandPayloads[K]
): Extract<Command, { type: K }> {
  return {
    commandId: `cmd:${tick}:${type}:${seq}`,
    tick,
    type,
    actorId: 'player',
    version: 1,
    payload,
  } as Extract<Command, { type: K }>;
}

/** Commands queued during a tick are drained by the simulation at tick boundaries. */
export class CommandQueue {
  private q: Command[] = [];

  push(cmd: Command): void {
    this.q.push(cmd);
  }

  drain(): Command[] {
    const out = this.q;
    this.q = [];
    return out;
  }

  get size(): number {
    return this.q.length;
  }

  clear(): void {
    this.q = [];
  }
}

/** Helper for systems: emit a standard rejection event for invalid commands. */
export function makePlacementRejected(
  tick: number,
  seq: number,
  gx: number,
  gy: number,
  reason: 'occupied' | 'on_path' | 'no_inventory'
): GameEvent {
  return {
    eventId: `${tick}:system:inventory:PLACEMENT_REJECTED:${seq}`,
    tick,
    type: 'PLACEMENT_REJECTED',
    sourceId: 'system:inventory',
    version: 1,
    payload: { reason, gx, gy },
  };
}
