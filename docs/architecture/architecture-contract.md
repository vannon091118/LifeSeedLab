# LifeSeedLab — Architecture Contract

Status: BINDING from Phase 1 onward. Every new/changed file must satisfy Phase 28 questions:
one responsibility, one owner, defined read/write surface, events in/out, public API, LOC within cap.

## 1. Identity rules

```
ONE MODULE      = ONE PRIMARY RESPONSIBILITY
ONE STATE OWNER = ONE AUTHORITY per authoritative slice
ALL GRAPHICS    = OBSERVERS (read-only on gameplay state)
GAMEPLAY        ≠ RENDERING
SOURCE          = CONTENT TRUTH (no gameplay constants in code)
SEED            = DETERMINISM INPUT
CLOCK           = GAME TIME AUTHORITY
BUS             = HANDOVER PROTOCOL (no direct cross-system calls)
```

## 2. End equations (Phase 36)

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS = DETERMINISTIC GAME STATE
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED = DETERMINISTIC PRESENTATION
```

## 3. Ownership map (single writer per slice)

| Slice | Owner (writer) | Readers |
|---|---|---|
| game time (tick, phase, phaseProgress, waveTime, paused) | ClockSystem | all |
| plants (spawn/place/update/attack/damage) | PlantSystem | renderer, UI, visual observer |
| enemies (move/target/damage/die) | EnemySystem | renderer, UI, visual observer |
| projectiles | ProjectileSystem | renderer, UI, visual observer |
| energy/score | ScoreSystem | renderer, UI |
| combo (count/timer/multiplier/highest) | ComboSystem | renderer, UI |
| waves (number, timer, schedule, completion) | WaveSystem | all |
| inventory/discovered variants | InventorySystem | UI, PlantSystem(placement checks) |
| worker-owned sim state | SimulationRoot (worker) | main thread via snapshots |
| UI React state | Screen router (App) | components |
| persisted meta | meta.ts (nursery stats) | menu/UI |
| camera, FX layers, particles | observers/render | — |

No other file may write these slices. Cross-slice influence happens ONLY via commands/events.

## 4. LOC caps (hard; violation = split, never raise cap to fit code)

| Cap | Applies to |
|---|---|
| 300 | simulation systems, bus, clock, rng, seed, ids, hash |
| 400 | renderer, visual generator/resolvers, particles, feedback, observers |
| 400 | UI components |
| 200 | types, config/source files, meta, i18n |

Exceptions granted only per file with a one-line justification in the file header.

##  LOC audit command: `wc -l` per file vs table above.

## 5. Event schema (v1, binding)

```ts
type GameEvent = {
  eventId: string;   // stable: `${tick}:${sourceId}:${type}:${seq}`
  tick: number;      // from Clock
  type: EventType;   // UPPER_SNAKE string union
  sourceId: string;  // owning entity or 'system:<Name>'
  version: 1;
  payload: object;   // per-type, documented in bus/events.ts
};
```

Event families + producers/consumers are listed in `src/bus/events.ts` (Phase 3).

## 6. Command schema (v1, binding)

```ts
type Command = {
  commandId: string;
  tick: number;
  type: 'PLACE_PLANT' | 'REMOVE_PLANT' | 'START_WAVE' | 'BREED_PLANTS' | 'SELECT_PLANT' | 'CANCEL_PLACEMENT' | 'INSPECT';
  actorId: string; // 'player' for user input
  version: 1;
  payload: object;
};
```

Dataflow is one-way: Input → Command → Bus → Simulation → State/Event → Observer. Canvas/React never call simulation directly.

## 7. Seed namespaces (binding set)

```
world | wave | enemy | plant | loot | visual | particle | cosmetic
```

- Gameplay namespaces: `world, wave, enemy, plant, loot` — consumed by simulation only.
- Presentation namespaces: `visual, particle, cosmetic` — consumed by observers/renderer only.
- Rule: visual RNG consumption never advances gameplay RNG state, and vice versa.
- Naming: `deriveSeed(rootSeed, namespace, entityId, eventId, version)` (Phase 2.3).

## 8. Determinism rules

- No `Math.random`, `Date.now`, `performance.now` in gameplay/presentation logic.
  `performance.now` is allowed ONLY inside `clock.ts` (frame timing) and worker loop scheduling.
- Same root seed + same command sequence = identical state hash, event sequence, entity ID sequence, visual keys.
- FX ON/OFF must produce identical gameplay state (Test C, Phase 19).

## 9. Version policy

- Entity/source/event/command carry `version: 1` explicitly.
- Breaking change to schema ⇒ bump version field, keep old handler until migrated (no silent schema drift).
- Meta save has `version`; `loadMeta()` migrates forward, never drops user currency silently.
- Source files (plants/enemies/effects/extras/bases) are content-truth; changing values requires no code change elsewhere.

## 10. Module boundary pre-check (Phase 30 checklist, applied before writing code)

1. Does this function exist? 2. Which module owns it? 3. Gameplay/Source/Event/Observer/Rendering?
4. New event/command needed? 5. Which seed namespace? 6. Rule → source? 7. LOC cap OK? 8. Second state source created?

## 11. Deferred (explicit non-goals until core gates pass)

Multiplayer/backend, 3D/shaders/physics, huge content volume, big meta systems (Phase 33).
