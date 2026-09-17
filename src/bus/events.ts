// Owner: EventBusSystem. LOC ≤ 300. No gameplay rules live here.

export type EventType =
  // lifecycle / waves
  | 'DAY_STARTED'
  | 'NIGHT_STARTED'
  | 'WAVE_STARTED'
  | 'WAVE_COMPLETED'
  | 'GAME_OVER'
  // plants
  | 'PLANT_PLACED'
  | 'PLANT_REMOVED'
  | 'PLANT_ATTACKED'
  | 'PLANT_GROWN'
  | 'PLANT_FERTILIZED'
  | 'PLANT_WEAKENED'
  | 'PLANT_WITHERED'
  | 'PLANT_PROPAGATED'
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
  | 'PLACEMENT_REJECTED'
  | 'FERTILIZE_REJECTED'
  | 'PROPAGATE_REJECTED'
  // map (P5)
  | 'TILE_PLACED'
  | 'TILE_REJECTED'
  | 'ROUTE_CHANGED'
  | 'MAP_EXPANDED'
  // beetles (P6: Käferzucht — Brutling als alliierter Kämpfer)
  | 'BEETLE_DEPLOYED'
  | 'BEETLE_DOWN'
  | 'BEETLE_REJECTED';

// ── Ablehnungs-Vokabular (v1) ────────────────────────────────
// Die Gründe sind hier EINMAL typisiert, weil drei Stellen sie teilen: die Sim (Emittent),
// der Notice-Kanal (`components/fieldNotice.ts`) und die Anzeige (`components/FieldToast.tsx`).
// Die Anzeige bildet `RejectReason` erschöpfend auf i18n-Schlüssel ab — ein neuer Grund ohne
// Text ist deshalb ein Compile-Fehler, kein stiller `field.reject.unknown` (B29).

/** Sim-Ablehnung einer Pflanzen-Platzierung (`PLACEMENT_REJECTED`). */
export type PlacementRejectReason = 'occupied' | 'on_path' | 'no_inventory' | 'no_energy';
/** Pflanzen-Aktionen: Düngen/Vermehrung (`FERTILIZE_REJECTED`/`PROPAGATE_REJECTED`). */
export type PlantRejectReason = 'not_growing' | 'max_reached' | 'not_found' | 'not_mature' | 'on_path' | 'occupied';
/** Karten-Bau (`TILE_REJECTED`) — alle Gründe kommen aus `simulation/mapSystem.ts` (B33: + `on_path` für blockierende Tiles im Pfad-Korridor). */
export type TileRejectReason = 'unknown_tile' | 'no_energy' | 'max_count' | 'occupied_plant' | 'spawn_corridor' | 'not_expandable' | 'already_buildable' | 'on_path';
/** Brutling-Einsatz (`BEETLE_REJECTED`). */
export type BeetleRejectReason = 'already_deployed' | 'no_energy' | 'none_available';
/** Alles, was dem Spieler als Ablehnungsgrund gezeigt werden kann. */
export type RejectReason = PlacementRejectReason | PlantRejectReason | TileRejectReason | BeetleRejectReason;

// ── Payload contracts (v1) ───────────────────────────────────

export interface EventPayloads {
  DAY_STARTED: { cycle: number };
  NIGHT_STARTED: { cycle: number };
  WAVE_STARTED: { wave: number; enemyCount: number };
  WAVE_COMPLETED: { wave: number; reward: number };
  GAME_OVER: { wave: number; score: number };
  PLANT_PLACED: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_REMOVED: { plantId: string; refund: number };
  PLANT_ATTACKED: { plantId: string; targetId: string | null };
  PLANT_GROWN: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_FERTILIZED: { plantId: string; variantId: string; count: number };
  PLANT_WEAKENED: { plantId: string; variantId: string };
  PLANT_WITHERED: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_PROPAGATED: { sourcePlantId: string; plantId: string; variantId: string; gx: number; gy: number };

  PROJECTILE_FIRED: { projectileId: string; plantId: string; targetId: string; damage: number; effectId: string | null };
  PROJECTILE_HIT: { projectileId: string; enemyId: string; damage: number; critical: boolean; px: number; py: number; effectId: string | null };
  DAMAGE_DEALT: { enemyId: string; amount: number; critical: boolean; hp: number; px: number; py: number };
  CRITICAL_HIT: { enemyId: string; amount: number; px: number; py: number };
  ENEMY_DIED: { enemyId: string; px: number; py: number; reward: number; killerPlantId: string | null };
  SCORE_CHANGED: { score: number; delta: number };
  COMBO_CHANGED: { count: number; multiplier: number };
  REWARD_GRANTED: { energy: number; sourceId: string };
  PLACEMENT_REJECTED: { reason: PlacementRejectReason; gx: number; gy: number };
  FERTILIZE_REJECTED: { plantId: string; reason: Exclude<PlantRejectReason, 'not_mature'> };
  PROPAGATE_REJECTED: { plantId: string; reason: Exclude<PlantRejectReason, 'not_growing' | 'max_reached'> };
  TILE_PLACED: { gx: number; gy: number; tile: string; cost: number };
  TILE_REJECTED: { gx: number; gy: number; tile: string; reason: TileRejectReason };
  ROUTE_CHANGED: { waypoints: number };
  MAP_EXPANDED: { gx: number; gy: number; cost: number };
  BEETLE_DEPLOYED: { beetleId: string; name: string; px: number; py: number; spawnCount: number };
  BEETLE_DOWN: { beetleId: string; px: number; py: number };
  BEETLE_REJECTED: { reason: BeetleRejectReason };
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
// InventorySystem     → PLACEMENT_REJECTED  → —                 → visual (Zelle) + Notice
// SimulationRoot      → TILE_REJECTED       → —                 → visual (Zelle) + Notice
// SimulationRoot      → BEETLE_REJECTED     → —                 → Notice (HUD-Ursache, kein Welt-FX)
// PlantSystem         → FERTILIZE/PROPAGATE_REJECTED → —          → visual (Entity) + Notice
//
// B29: „Wer hört zu?“ ist keine verstreute Comment-Tabelle mehr, sondern `bus/eventAudience.ts`.
// Dort hat JEDES Event einen Eintrag (fx / notice / snapshot / internal) samt Begründung; ein
// Test beweist für jede `fx`-Zeile, dass der Observer wirklich Kommandos erzeugt. Ein neues Event
// ohne Eintrag fällt im Typecheck auf, nicht erst als stille Zeile im Feld.

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
