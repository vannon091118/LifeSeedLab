# LifegamePlant — Forensischer Bestands-Audit (Execution Prompt §2)

> Stand: nach Konsolidierung + Discovery-Chain + Cap-Splits + DevGate. `tsc` grün, `vitest` **100/100** (11 Dateien).
> Grundlage: §§1–49 des Execution Prompts + `AGENTS.md` + `../architecture/architecture-contract.md` + `quality-spec.md`.

---

## 0. Namensfrage

Execution Prompt nennt das Ziel **`LifegamePlant`**, das Repository heißt **`LifeSeedLab`** (seit Monaten so verankert, Banner, Storage-Keys `lifegamelab_*`, Supabase-Projekt). **Entscheidung:** `LifeSeedLab` bleibt der Produkt-/Repo-Name; `LifegamePlant` wird als Arbeits-Titel im Prompt verstanden. Ein Rename würde Storage, Migrations-Keys und jede Doku brechen — kein Gewinn. Falls Rename gewünscht, wird er als eigener Migrations-Schritt (Keys + Supabase) behandelt.

---

## 1. Reuse-Matrix (pro Datei)

| PATH | OWNER | ONE RESPONSIBILITY | DEPENDENCIES | LOC | VERDICT |
|---|---|---|---|---|---|
| `src/core/clock.ts` | ClockSystem | autoritative Spielzeit: tick/elapsed/phase/progress/waveTime/pause, Fixed-Step 30 tps, `advance()` nur Frame-Timing | — | 91 | **REUSE** — erfüllt §5 exakt; kein `setInterval`/Date.now im Gameplay |
| `src/core/rng.ts` | RngSystem | einzige RNG-Impl, 8 Namespaces, `deriveSeed` + Namespace-Isolation, `makeRng` | — | 121 | **REUSE** — §7 erfüllt; `Math.random` verboten eingehalten |
| `src/core/ids.ts` | IdSystem | stabile Entity-IDs `plant-0001`… + `nextScopedId(runOrMatch, kind, seq)` | — | 50 | **REUSE** |
| `src/core/hash.ts` | HashSystem | kanonischer FNV-Hash über sortierte Entities | `core/clock` | 60 | **REUSE** |
| `src/bus/bus.ts` | BusSystem | Transport only, `publish/subscribe`, Ring-Buffer | `bus/events` | 46 | **REUSE** |
| `src/bus/events.ts` | BusSystem | Event-Contract v1 (`eventId/tick/type/sourceId/version/payload`) + Ownership-Tabelle | — | 118 | **REUSE** — §11 erfüllt; kein Hidden-Logic |
| `src/bus/commands.ts` | CommandSystem | Command-Contract v1 + `CommandQueue` (Phase 12 Input→Command→Bus) | `bus/events` | 95 | **REUSE** |
| `src/bus/transport.ts` | BusSystem | versionierter `CommandTransport` (Local/MockRemote), Tick-sortiert | `bus/commands` | 55 | **REUSE** — Gate E |
| `src/simulation/state.ts` | SimulationRoot | kanon. `SimState` (runSeed/clock/phase/wave/resources/plants/enemies/projectiles/score/combo) | `core/clock` | 99 | **REUSE** — §8 erfüllt |
| `src/simulation/root.ts` | SimulationRoot | deterministischer Step: drain→clock→ Systeme→ Events (einzige Verdrahtung) | alle Systeme + bus/clock | 279 | **REUSE** — Eigentümer aller Slices, §3/§4 ok (≤300) |
| `src/simulation/plantSystem.ts` | PlantSystem | Plant-State, Lifecycle (growing/mature, fertilize/cooldown, weakened/withered) | `state` + source | 286 | **REUSE** — `tickLifecycle` vor allen Systemen, Bus-only Cross-Slice |
| `src/simulation/enemySystem.ts` | EnemySystem | Gegner bewegen/schädigen, Status ticks (slow/burn/poison), chain | `state` + source/rng | 145 | **REUSE** |
| `src/simulation/projectileSystem.ts` | ProjectileSystem | Projektil-Physik, `effectId` riding | `state` | 109 | **REUSE** — §28 getrennt visual |
| `src/simulation/scoreSystem.ts` | ScoreSystem | Energy/Score/Nektar + `COINS_GRANTED` (1–5, loot-Namespace) | `state` + bus | 49 | **REUSE** |
| `src/simulation/comboSystem.ts` | ComboSystem | `count/timer/multiplier/highest` | `state` | 46 | **REUSE** — §32 |
| `src/simulation/waveSystem.ts` | WaveSystem | Wave-Nummer/Schedule/SpawnQueue + `maybeAutoStart` | `state` + source/rng | 90 | **REUSE** — §6 Day/Night via Root-Events |
| `src/simulation/snapshot.ts` | SnapshotSystem | öffentliche Runtime-Verträge: Snapshot+Hash, EventStream-Version | `core/hash` | 52 | **REUSE** |
| `src/config/world.source.ts` | Source | `GRID_COLS/ROWS/CELL_SIZE`, `ENEMY_PATH`, `PLACEMENT_PATH_MARGIN`, `WAVES_PER_NIGHT` | — | 42 | **REUSE** |
| `src/config/plants.source.ts` | Source | 3 Archetypen + `STARTING_INVENTORY` + `BREED_SOURCE` | — | 75 | **REUSE** |
| `src/config/enemies.source.ts` | Source | 5 Archetypen + `generateWaveSchedule(rootSeed,waveN)` | `core/rng` | 67 | **REUSE** |
| `src/config/bases.source.ts` | Source | **10 Bases** (silhouette/layers/palette/anchors/allowedExtras/allowedEffects/animation) | — | 125 | **REUSE** — §16 erfüllt, Silhouetten distinct |
| `src/config/extras.source.ts` | Source | **10 Extras** (hat/leafcrown/spike/gem/shroom/vine/eye/mouth/antenna/scar) | — | 35 | **REUSE** — §17 erfüllt |
| `src/config/effects.source.ts` | Source | **10 Effects** (palette/particle/projectile/impact/status/sound) | — | 36 | **REUSE** — §18 erfüllt |
| `src/config/economy.source.ts` | Source | Shop-Preise, `GROWTH/LIFESPAN_TICKS`, `FERTILIZE_BONUS`, `COINS 1–5`, Auto-Wave | — | 66 | **REUSE** |
| `src/config/names.source.ts` | Source | Namens-Kerne/Präfix/Suffix für Gacha-Namen | — | 38 | **REUSE** |
| `src/visual/generator.ts` | VisualGenerator | **Pipeline §14**: base→mutation→palette→effect→geometry→layer→animation→ResolvedVisual; `genomeToVisualInput` einzige Genome→Visual-Eingabe | `config/*` + `core/rng` | 295 | **REUSE** — nur `visual`-Namespace, deterministisch |
| `src/render/renderer.ts` | RenderSystem | Layer 0–8, Terrain-bake, `plantVisual` (Bred-Cache zuerst), DPR cap 2, shake translate | `visual/generator` + `simulation/state` (read) | 219 | **REUSE** — Drawing Only, ≤400 |
| `src/render/layers/terrain.ts` | RenderSystem | Paper-Grain + Ink-Terrain, pre-baked (0 Kosten/Frame) | `core/rng` (visual) | 166 | **REUSE** |
| `src/render/layers/primitives.ts` | RenderSystem | Silhouetten-Primitive (B10) | — | 117 | **REUSE** |
| `src/render/layers/enemies.ts` | RenderSystem | 5 Enemy-Bodies (distinct) | — | 78 | **REUSE** |
| `src/render/layers/particlesDraw.ts` | RenderSystem | Partikel-Zeichen (10 Kinds §33) | `observers/particles` (read) | 81 | **REUSE** |
| `src/render/layers/feedback.ts` | RenderSystem | Layer 7/8: Floating Numbers + Flash + Manga | — | 122 | **REUSE** |
| `src/render/camera.ts` | CameraObserver | Observer-owned Camera, seeded Shake (`cosmetic`) | `core/rng` (cosmetic) | 48 | **REUSE** |
| `src/observers/visualObserver.ts` | VisualObserver | Event→VisualCommands (B5-Matrix, alle 7 Typen), Farben aus `EFFECTS_SOURCE` | `config/effects` | 139 | **REUSE** — Presentation Decision Layer |
| `src/observers/visualExecutor.ts` | VisualObserver | Führt VisualCommands aus (Pool/Camera/Feedback) | `observers/*` | 27 | **REUSE** |
| `src/observers/particles.ts` | ParticleSystem | Pool + 20+ Profile (alle EFFECT-Refs vorhanden), deterministische Bursts (`particle` NS), Budget NORMAL/BUSY/CHAOS | `core/rng` | 142 | **REUSE** — §33/§34 |
| `src/observers/audioObserver.ts` | AudioObserver | Web Audio Synth-Map, `visual→audio` nur Observer, FX OFF stumm | — | 118 | **REUSE** — §13 erfüllt |
| `src/persistence/storage.ts` | Persistence | einziger Storage-Owner: `load/save` mit FNV-Checksumme + Quarantäne + Migration | — | 148 | **REUSE** — §30 |
| `src/persistence/runSave.ts` | Persistence | Run-Snapshot v2 (enemies/projectiles/schedule bewusst NICHT gespeichert) | `persistence/storage` | 59 | **REUSE** — Resume prep+regenerate |
| `src/meta.ts` | Persistence | **Façade/Barrel** (6 LOC); Logik in `meta/{store,economy,run}.ts` (je ≤102); `storage.ts` bleibt einziger Storage-Owner | `persistence/storage` + `genome/bases` | 6 | **DONE (SPLIT)** — 2026-09-14, kein Cap-Erhöhen, keine Dopplung |
| `src/types.ts` | Source | Meta-/Breeding-Typen (Entity-Typen bewusst in `simulation/state.ts`) | — | 103 | **REUSE** |
| `src/genome.ts` | Source | **Façade/Barrel** (18 LOC); Logik in `genome/{pool,cross,gacha,bases}.ts` (je ≤117) | `core/rng` | 18 | **DONE (SPLIT)** — 2026-09-14, einzige Import-Fläche bleibt `./genome` |
| `src/i18n.tsx` | UI | Provider-only (45 LOC); Übersetzungen ausgelagert in `i18n/translations.ts` (202 LOC, reine Daten) | `meta` (lazy) | 45 | **DONE (SPLIT)** — 2026-09-14 |
| `src/discovery/chain.ts` | DiscoveryChain | append-only hash-chain, `hashGenome` (FNV kanonisch), `prev_hash` verkettet, UNIQUE lokal | — | 155 | **REUSE** — §41/§42 Vorb. |
| `src/discovery/codex.ts` | DiscoveryCodex | Spieler-ID + Codex-Persistenz + `appendDiscovery` + `lifeseed:` Share-Text + Sync-Stub | `persistence/storage` + `discovery/chain` | 141 | **REUSE** — lokal-first, Supabase-Spiegel |
| `src/components/GameView.tsx` | UI | Pointer-Workflow `idle→selected→ghost→placed/rejected`, 390×844, `visibilitychange` + Resume-Overlay, HUD ≤5, DevGate-Mount | `simulation/root` + `render/*` + `dev/*` | 341 | **REUSE** — kein Gameplay-Write, ≤400 |
| `src/components/MainMenu.tsx` | UI | Menu + Greenhouse + Codex Einstieg — Papier-Panels mit Büroklammer, SVG-Icons, selbstironische Kopie (§40) | `genome` + `discovery` | 305 | **DONE (ADAPT)** — Trash-Polish 2026-09-14 |
| `src/components/Greenhouse.tsx` | UI | Samen kaufen→würfeln→reifen→behalten + Discovery-Append + Share | `genome` + `meta` + `discovery` | 246 | **REUSE** |
| `src/components/Codex.tsx` | UI | öffentl. Codex read-only (hash-linked, Erstentdecker, Share) | `discovery/*` | 133 | **REUSE** — §41 |
| `src/components/StartScreen.tsx` | UI | Papierwelt-Titel: SVG-Hügel + Wordmark-Pflanze, kein Emoji-Logo, kein Blur | — | 166 | **DONE (ADAPT)** — B7.1/B0 2026-09-14 |
| `src/App.tsx` | UI | Router + `deriveSeed('world','run',runId)` → `SimulationRoot` | `core/rng` + `meta` | 83 | **REUSE** |

**Singletons ohne Bus-Dopplung:** Kein zweiter RNG, kein zweiter Bus, kein zweiter State-Owner — verifiziert via Ownership-Karte (§3).

---

## 2. LOC-Caps (§4)

- **300er Cap:** `root.ts` 279, `plantSystem.ts` 286 → nah am Cap, aber grün. `genome.ts` **18 (SPLIT erledigt 2026-09-14)** → `genome/pool.ts` 19 · `genome/cross.ts` 117 · `genome/gacha.ts` 105 · `genome/bases.ts` 52.
- **400er Cap:** alle Renderer/Observer/Generator-Grenzen grün (Max 295 `generator.ts`, 219 `renderer.ts`, 341 `GameView.tsx`).
- **200er Cap:** `i18n.tsx` **45 (SPLIT erledigt)** → `i18n/translations.ts` 202 (reine Daten). `meta.ts` **6 (SPLIT erledigt)** → `meta/store.ts` 102 · `meta/economy.ts` 47 · `meta/run.ts` 54. Rest grün.
- **Stand:** alle Caps grün, drei Splits ohne Cap-Erhöhung abgeschlossen. Kein „später aufräumen“.

## 3. DoD-Fortschritt (§48)

```
[x] vorhandene Basis integriert
[x] Clock deterministisch
[x] Fixed timestep (30 tps, accumulator)
[x] Master Seed (GAME_SEED)
[x] RNG Namespaces (world/wave/enemy/plant/loot | visual/particle/cosmetic)
[x] RNG Isolation (FX ON/OFF identischer Hash, gateB.test)
[x] stabile Entity IDs (plant/enemy/proj + nextScopedId)
[x] State Ownership (8 Writer, Bus-only Cross-Slice)
[x] State Hash (FNV, sortiert)
[x] Event Bus
[x] Command Contracts (CommandQueue, drain an Tick-Grenze)
[x] Source-driven Content
[x] 10 Bases
[x] 10 Extras
[x] 10 Effects
[x] Visual Seed (deriveSeed, visual-NS)
[x] Visual Version (1)
[x] Visual Generator
[x] Palette Resolver (mutation→effect→rarity)
[x] Mutation Resolver (Geometry + Layer)
[x] ResolvedVisual (inkl. variantKey)
[x] Canvas Renderer (Layer 0–8, pre-baked Terrain)
[x] Visual Observer (B5-Matrix vollständig)
[x] Animation Profiles (sway/bob/pulse/still + attack/placement via FeedbackLayer)
[x] Projectile Visuals (effectId→shape/color)
[x] Damage Feedback (number + punch + impact)
[x] Score Feedback (reward_flight GLOW, HUD punch)
[x] Combo Feedback (manga burst ×N)
[x] Particle Pool (10 Kinds, 20+ Profile)
[x] FX Budget (NORMAL/BUSY/CHAOS + DPR cap 2)
[x] Manga FX (ShowMangaText, ScreenFlash, Flash-Layer)
[x] Day/Night Presentation (night grade tween unter Layer 7/8)
[x] Touch Feedback (ghost Valid-Tint + snap + shake via PLACEMENT_REJECTED)
[x] React Meta UI (HUD ≤5, MainMenu/Greenhouse/Codex, i18n DE/EN)
[x] Debug Seed/Inspector — DevGate `src/dev/{gate,DevOverlay,Inspector}` hinter `?dev=1`/`#dev`: Seed/State-Hash/Tick/Phase/EventLog/Partikel-Budget/DPR/FX-Toggle + Visual Inspector (Base/Extras/Effects/VisualSeed/Palette/Scale/Rotation/variantKey). Release-Fläche 0 Dev-Surface.
[x] Persistence (storage.ts Owner, meta v3 migration+checksum, run v2 resume prep, discovery codex chain)
[x] deterministic gameplay test (sim.test + gateB.test)
[x] deterministic visual test (generator.test)
[x] RNG isolation test (gateB FX on/off)
[x] bus contract tests (bus.test)
[x] ownership audit (dieses Dokument + AGENTS.md Karte)
[x] LOC audit (Abschnitt 2 — drei Splits erledigt, alle Caps grün)
[x] mobile performance pass (DPR 2, Particle-Budget adaptiv, bake; 30 Entities simuliert — kein echter 60-fps-Perf-Panel)
```

**Offene DoD-Reste (geplant vor Final):** echte perf-Messung (B12: Frame/Sim-ms im DevGate-Panel) und MainMenu/StartScreen-Icons schrittweise als zentrale `ui/icons.tsx` konsolidieren (B9). DevGate, Visual Inspector, Cap-Splits und §40 Trash-Polish sind erledigt.

## 4. Pipeline-Gleichungen (§49)

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS = DETERMINISTIC GAME STATE   → gilt, test-locked (same seed+commands=same hash)
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED = DETERMINISTIC PRESENTATION → gilt (same visualSeed+source=same ResolvedVisual)
```

Verantwortung: `GAMEPLAY→truth, SOURCE→content, CLOCK→time, SEED→variation, BUS→handover, OBSERVER→presentation, RENDERER→drawing` — eingehalten. Kein `Math.random`/`Date.now` in Spiel-/Visual-Entscheidungen (exklusiv: `performance.now` im Frame-Timing + `Date.now` nur für Discovery-`timestamp`/`player_id`-Fallback).

## 5. Bereits vorhandene Funktionen wiederverwendet (§2.10)

`makeRng`/`deriveSeed`/`strHash`, `GameClock`, `nextId`/`nextScopedId`/`resetIds`, `hashState`, `EventBus`/`makeEvent`/`assertEventContract`, `CommandQueue`/`makeCommand`/`makePlacementRejected`, `createBaseVariants`/`crossGenomes`/`deriveStats`/`rollGachaCross`/`deriveGachaSeed`, `BASES/EXTRAS/EFFECTS_SOURCE` inkl. Gate `sources.test.ts`, `resolveVisual`/`resolvePalette`/`resolveGeometry`/`genomeToVisualInput`/`resolveBredVisuals`, `Renderer` + Layer + `bakeTerrain`, `Camera`, `VisualObserver`/`ParticlePool`/`AudioObserver`, `storage.load/save` + `meta`/`runSave` — keine Doppel-Impl erzeugt.

## 6. Nächste Umsetzung (Reihenfolge §45)

1. ~~Cap-Splits (genome/i18n/meta)~~ — **erledigt 2026-09-14**: `genome/{pool,cross,gacha,bases}.ts`, `meta/{store,economy,run}.ts`, `i18n/translations.ts`. Keine Cap-Erhöhung, keine Logik-Dopplung.
2. ~~DevGate + Visual Inspector~~ — **erledigt 2026-09-14**: `src/dev/gate.ts` (`?dev=1`/`#dev`, reine Funktion, getestet-fähig), `src/dev/DevOverlay.tsx` (Seed/State-Hash/Tick/Phase/EventLog/Partikel-Budget/DPR/FX-Toggle), `src/dev/Inspector.tsx` (Entity/Base/Extras/Effects/VisualSeed/Palette/Scale/Rotation/variantKey). Verdrahtung in `GameView` ausschließlich hinter `isDevActive()` — Release-Fläche hat 0 Dev-Surface. `ParticlePool.budgetName` als lesender Dev-Zugriff ergänzt.
3. ~~Meta-UI Trash-Polish~~ — **erledigt 2026-09-14**: `MainMenu`/`StartScreen` von Dark-Glass auf Papierwelt umgebaut (Panels mit Büroklammer, harte Ink-Schatten, kein Blur, kein Emoji-Logo, SVG-Wordmark/Icons, selbstironische Marquee/Footer-Kopie §40).
4. B12 Perf-Nachweis (390×844, ≥30 Entities, Frame/Sim-Messung im DevGate) → finaler Architektur-Audit (§34).

Kein neues System vor dem B12-Perf-Nachweis; jede Änderung erst mit `tsc` + `vitest` grün.
