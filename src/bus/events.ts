// Owner: EventBusSystem. LOC ≤ 300. No gameplay rules live here.

export type EventType =
  // lifecycle / waves
  | 'DAY_STARTED'
  | 'NIGHT_STARTED'
  | 'LAYOUT_DONE'
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
  /** Juggling: Tile verkauft (Refund) — Route kippt, Gegner drehen mid-Welle um. */
  | 'TILE_REMOVED'
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
export type PlacementRejectReason = 'occupied' | 'on_path' | 'no_inventory' | 'wave_active';
/** Pflanzen-Aktionen: Düngen/Vermehrung (`FERTILIZE_REJECTED`/`PROPAGATE_REJECTED`). */
export type PlantRejectReason = 'not_growing' | 'max_reached' | 'not_found' | 'not_mature' | 'on_path' | 'occupied';
/** Teilunion für Düngen (`FERTILIZE_REJECTED`) — abgeleitet, niemals neu deklariert. */
export type FertilizeRejectReason = Extract<PlantRejectReason, 'not_growing' | 'max_reached' | 'not_found'>;
/** Teilunion für Vermehren (`PROPAGATE_REJECTED`) — abgeleitet, niemals neu deklariert. */
export type PropagateRejectReason = Extract<PlantRejectReason, 'not_mature' | 'not_found' | 'on_path' | 'occupied'>;
/** Karten-Bau (`TILE_REJECTED`) — alle Gründe kommen aus `simulation/mapSystem.ts`.
 *  R2-Neubau: `spawn_corridor` ist gestorben (kein geschützter Korridor mehr); neu sind
 *  `out_of_world` (außerhalb der freigeschalteten Fläche) und `max_size` (Wachstumsgrenze).
 *  #4: `no_energy` ist mit dem Energiesystem gestorben — der POOL entscheidet (`no_material`),
 *  und die Integritätsregel meldet `route_blocked`: der letzte freie Weg bleibt immer offen. */
export type TileRejectReason = 'unknown_tile' | 'no_material' | 'max_count' | 'occupied_plant' | 'not_expandable' | 'already_buildable' | 'on_path' | 'out_of_world' | 'max_size' | 'route_blocked' | 'wave_active';
/** Brutling-Einsatz (`BEETLE_REJECTED`). */
export type BeetleRejectReason = 'already_deployed' | 'none_available';
/** M5 (Sprint AP2): zugebauter Laufweg — der Default-Pfad greift, und das muss sichtbar sein. */
export type RouteRejectReason = 'route_blocked';
/** UI-Adapter-Vokabular (`components/placementController`, Pool-Vorprüfung B39): Komposition
 *  aus Sim-Wörtern plus `unknown` — `unknown` wird NIE von der Sim emittiert, es markiert nur
 *  den UI-Zustand „noch keine Auswahl". Lebt hier, damit jedes Ablehnungswort genau ein
 *  Zuhause hat (B39); siehe auch B29 für die i18n-Erschöpfung der Anzeigetexte. */
export type UiRejectReason = PlacementRejectReason | RouteRejectReason | 'unknown';
/** Warum ein Lauf endet (`GAME_OVER`-Payload) — B39: benannt im Bus, nie inline. */
export type RunEndReason = 'lives_depleted';
/** Feldmeldung (`components/fieldNotice` → `FieldToast`): komplettes Sim-Vokabular plus
 *  `unknown` (Restfall der UI-Vorprüfung, nie von der Sim emittiert; Text-Pflicht via B29).
 *  B39: Kompositionen leben im Bus, die UI importiert. */
export type NoticeReason = RejectReason | 'unknown';
/** Alles, was dem Spieler als Ablehnungsgrund gezeigt werden kann. */
export type RejectReason = PlacementRejectReason | PlantRejectReason | TileRejectReason | BeetleRejectReason | RouteRejectReason;

// ── Payload contracts (v1) ───────────────────────────────────

export interface EventPayloads {
  DAY_STARTED: { cycle: number };
  NIGHT_STARTED: { cycle: number };
  /** R1: Build-Sequenz abgeschlossen — der Spieler hat die Bauphase verlassen. */
  LAYOUT_DONE: { tiles: number };
  WAVE_STARTED: { wave: number; enemyCount: number };
  WAVE_COMPLETED: { wave: number; reward: number };
  /** B36: Ursache im Payload — der Spieler soll sehen, WARUM der Lauf endete (Playtest R2 #1). */
  GAME_OVER: { wave: number; score: number; reason: RunEndReason };
  /** B36: Nachkauf im Lauf (Playtest R2 #2) — Erfolg und Ablehnung kommen als Events. */
  PLANT_PLACED: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_REMOVED: { plantId: string };
  PLANT_ATTACKED: { plantId: string; targetId: string | null };
  PLANT_GROWN: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_FERTILIZED: { plantId: string; variantId: string; count: number };
  PLANT_WEAKENED: { plantId: string; variantId: string };
  PLANT_WITHERED: { plantId: string; variantId: string; gx: number; gy: number };
  PLANT_PROPAGATED: { sourcePlantId: string; plantId: string; variantId: string; gx: number; gy: number };

  /** P-28: `px/py` ist der MÜNDUNGSORT (Pflanzenzentrum) — der Mündungspuff (B5) zeichnet am
   *  Abschuss, nicht an der Zielposition; der Observer darf dafür nicht ins State greifen. */
  PROJECTILE_FIRED: { projectileId: string; plantId: string; targetId: string; damage: number; effectId: string | null; px: number; py: number };
  PROJECTILE_HIT: { projectileId: string; enemyId: string; damage: number; critical: boolean; px: number; py: number; effectId: string | null };
  /** P-34: `effectId` färbt den Einschlag in der Effektfarbe (Papier-auf-Papier war unsichtbar).
   *  DoT-Ticks (`damageDirect`) tragen `null` — ihre Wirkung wurde bereits beim Auftragen angekündigt. */
  DAMAGE_DEALT: { enemyId: string; amount: number; critical: boolean; hp: number; px: number; py: number; effectId: string | null };
  CRITICAL_HIT: { enemyId: string; amount: number; px: number; py: number };
  ENEMY_DIED: { enemyId: string; px: number; py: number; reward: number; killerPlantId: string | null };
  SCORE_CHANGED: { score: number; delta: number };
  COMBO_CHANGED: { count: number; multiplier: number };
  /** B5.1: Der Ursprung der Belohnung ist Teil des Faktums — die Reise (Quelle → Zähler) darf
   *  ihn nicht raten. Kill ⇒ Weltposition des Kills; Quelle ohne Ort (Wellen-Bonus) ⇒ null.
   *  P-31: `grantedNektar` ist die GEBUCHTE Menge (dieselbe Rechnung wie die Kontobewegung,
   *  ein Owner: ScoreSystem) — die Anzeige zeigt den Buchungs-Delta, nie die Roh-Belohnung. */
  REWARD_GRANTED: { reward: number; grantedNektar: number; sourceId: string; px: number | null; py: number | null };
  PLACEMENT_REJECTED: { reason: PlacementRejectReason; gx: number; gy: number };
  FERTILIZE_REJECTED: { plantId: string; reason: Exclude<PlantRejectReason, 'not_mature'> };
  PROPAGATE_REJECTED: { plantId: string; reason: Exclude<PlantRejectReason, 'not_growing' | 'max_reached'> };
  TILE_PLACED: { gx: number; gy: number; tile: string };
  TILE_REMOVED: { gx: number; gy: number; tile: string };
  TILE_REJECTED: { gx: number; gy: number; tile: string; reason: TileRejectReason };
  ROUTE_CHANGED: {
    waypoints: number;
    /** M1/AP2 + Entscheidung 19.09.2026: Laufweg in FELDERN — das Zeit-unter-Feuer-Maß. */
    tiles: number | null;
    /** Kürzester möglicher Weg (Manhattan der Endpunkte); der Abstand zu `tiles` = Maze-Gewinn. */
    ideal: number | null;
    /** M5: gesetzt = der Spieler hat den Weg zugebaut — Fallback läuft unsichtbar? Nein: als Grund gemeldet. */
    blocked: boolean;
  };
  MAP_EXPANDED: { gx: number; gy: number };
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
// ScoreSystem         → REWARD_GRANTED      → —                 → visual (reward flight, Quelle aus dem Payload)
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
  // eventId must be derivable from its parts (stability guarantee).
  // sourceId may itself contain ':' (e.g. system:score), therefore a split-based
  // reconstruction is ambiguous; validate the stable prefix and a non-empty sequence.
  const prefix = `${e.tick}:${e.sourceId}:${e.type}:`;
  if (!e.eventId.startsWith(prefix) || e.eventId.length === prefix.length) {
    throw new Error(`Event ${e.eventId} id not composed of tick/source/type/seq`);
  }
}
