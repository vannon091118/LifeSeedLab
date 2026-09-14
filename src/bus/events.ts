// Owner: EventBusSystem. LOC ≤ 300. No gameplay rules live here.

export type EventType =
  // lifecycle / waves
  | 'RUN_STARTED'
  | 'DAY_STARTED'
  | 'NIGHT_STARTED'
  | 'WAVE_STARTED'
  | 'WAVE_COMPLETED'
  | 'GAME_OVER'
  // plants
  | 'PLANT_PLACED'
  | 'PLANT_REMOVED'
  | 'PLANT_ATTACKED'
  // combat
  | 'PROJECTILE_FIRED'
  | 'PROJECTILE_HIT'
  | 'DAMAGE_DEALT'
  | 'CRITICAL_HIT'
  | 'ENEMY_DIED'
  // economy / meta-feedback
  | 'SCORE_CHANGED'
  | 'COMBO_CHANGED'
  | 'REWARD_GRANTED'
  // placement feedback
  | 'PLACEMENT_REJECTED';

// ── Payload contracts (v1) ───────────────────────────────────

export interface EventPayloads {
  RUN_STARTED: { seed: number };
  DAY_STARTED: { cycle: number };
  NIGHT_STARTED: { cycle: number };
  WAVE_STARTED: { wave: number; enemyCount: number };
  WAVE_COMPLETED: { wave: number; reward: number };
  GAME_OVER: { wave: number; score: number };
  PLANT_PLACED: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_REMOVED: { plantId: string; refund: number };
  PLANT_ATTACKED: { plantId: string; targetId: string | null };
  PROJECTILE_FIRED: { projectileId: string; plantId: string; targetId: string; damage: number };
  PROJECTILE_HIT: { projectileId: string; enemyId: string; damage: number; critical: boolean; px: number; py: number };
  DAMAGE_DEALT: { enemyId: string; amount: number; critical: boolean; hp: number };
  CRITICAL_HIT: { enemyId: string; amount: number };
  ENEMY_DIED: { enemyId: string; px: number; py: number; reward: number; killerPlantId: string | null };
  SCORE_CHANGED: { score: number; delta: number };
  COMBO_CHANGED: { count: number; multiplier: number };
  REWARD_GRANTED: { energy: number; sourceId: string };
  PLACEMENT_REJECTED: { reason: 'occupied' | 'on_path' | 'no_inventory' | 'no_energy'; gx: number; gy: number };
}

export type GameEvent = {
  [K in EventType]: { eventId: string; tick: number; type: K; sourceId: string; version: 1; payload: EventPayloads[K] };
}[EventType];

// ── Ownership table (Phase 3.4) ──────────────────────────────
// producer            → event               → processed by      → observed by
// ClockSystem         → DAY/NIGHT_STARTED   → WaveSystem        → visual, ui, audio
// WaveSystem          → WAVE_STARTED        → EnemySystem       → visual, ui
// WaveSystem          → WAVE_COMPLETED      → ScoreSystem       → visual, ui
// PlantSystem         → PLANT_PLACED/REMOVED/ATTACKED            → visual, ui
// ProjectileSystem    → PROJECTILE_FIRED/HIT → Combat(Score/Combo) → visual
// ScoreSystem         → DAMAGE_DEALT/CRITICAL/ENEMY_DIED(handled) → visual, ui
// ScoreSystem         → SCORE_CHANGED       → —                 → ui
// ComboSystem         → COMBO_CHANGED       → —                 → visual, ui
// ScoreSystem         → REWARD_GRANTED      → —                 → visual (reward flight)
// InventorySystem     → PLACEMENT_REJECTED  → —                 → ui, visual

export function makeEvent<K extends EventType>(
  tick: number,
  type: K,
  sourceId: string,
  seq: number,
  payload: EventPayloads[K]
): Extract<GameEvent, { type: K }> {
  return {
    eventId: `${tick}:${sourceId}:${type}:${seq}`,
    tick,
    type,
    sourceId,
    version: 1,
    payload,
  } as Extract<GameEvent, { type: K }>;
}

/** Runtime validation (Test E, Phase 19). Throws on contract violation. */
export function assertEventContract(e: GameEvent): void {
  if (!e.eventId || typeof e.tick !== 'number' || !e.type || !e.sourceId) {
    throw new Error(`Event contract violation: ${JSON.stringify(e)}`);
  }
  if (e.version !== 1) {
    throw new Error(`Event ${e.eventId} has unsupported version ${e.version}`);
  }
  if (e.payload == null || typeof e.payload !== 'object') {
    throw new Error(`Event ${e.eventId} missing payload`);
  }
  // eventId must be derivable from its parts (stability guarantee)
  const expected = `${e.tick}:${e.sourceId}:${e.type}:${e.eventId.split(':').slice(3).join(':')}`;
  if (e.eventId !== expected) {
    throw new Error(`Event ${e.eventId} id not composed of tick/source/type/seq`);
  }
}
