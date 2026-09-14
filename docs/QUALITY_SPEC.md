# LifeSeedLab — Forensic Quality-Gap Scan + Asset/Render Specification

Status baseline at scan: **52/52 tests green, tsc clean.** Every finding below was verified by reading
the current source, not by assumption. This document is the work order: Part A classifies, Part B specifies.
Classes: `DEFECT` (broken/incorrect) · `INCOMPLETE` (contract exists, execution missing) ·
`PLACEHOLDER` (prototype stand-in) · `WRONG` (architecturally incorrect → extract/remove) · `KEEP`.

---

# PART A — FORENSIC SCAN

## A1. `src/types.ts` — WRONG (split)

| Symbol | Class | Verdict |
|---|---|---|
| `GameState`, `Tower`, `Enemy`, `Projectile`, `WaveConfig`, `WorkerInMessage`, `WorkerOutMessage`, `Position` | WRONG | Delete. Old worker-monolith contract. Zero importers (verified). Sim truth lives in `simulation/state.ts` (`SimState`, `PlantEntity`, `EnemyEntity`, `ProjectileEntity`). Keeping both = "fixes on device A break resume on device B". |
| `Gene`, `Genome`, `PlantType`, `PlantVariant`, `CrossResult`, `RunEconomy`, `MetaSave`, `GameMode`, `RunStartConfig` | KEEP | Move to `src/types/meta.ts` (breeding/meta) and delete the entity/wave/worker sections. |
| `DebugPanel.tsx` imports `GameState` | WRONG | Component is dead (mounted nowhere) → delete file; rebuilt later under DevGate with `SimState`. |

## A2. `src/genome.ts` — WRONG core, KEEP math

- WRONG: private `makeRng` duplicates `core/rng.ts` (same name, different signature — name collision across modules).
- DEFECT: module-level `let breedCounter = 0` resets on reload ⇒ **same parents + same generation produce different children after a page reload**. Determinism gap in the flagship feature.
- DEFECT: `createBaseVariants()` duplicated as `createBaseVariantsSafe()` in `MainMenu.tsx` ("inlined to avoid circular import" — false, `MainMenu` already imports from `genome.ts`). Two sources of truth for base plants.
- KEEP: `crossGenomes`, `deriveStats`, `deriveTraits`, `generateName`, weighted mutation.
- REPAIR: route all randomness through `core/rng` (`deriveBreedSeed` → `deriveSeed(rootSeed,'plant',aId,bId,generation)`); generation counter persists in `MetaSave.breedGeneration`; delete duplicate; export single `createBaseVariants()`.

## A3. `src/config.ts` — WRONG (duplicate source)

- `GRID_COLS/ROWS/CELL_SIZE` duplicated from `config/world.source.ts` (violates SOURCE = CONTENT TRUTH).
- REPAIR: `config.ts` shrinks to `GAME_SEED` + `RUN_ID_SOURCE` only; world constants live once in `world.source.ts`.

## A4. `src/simulation/root.ts` + systems — INCOMPLETE (effect pipeline), 4 DEFECTs

- DEFECT: **pierce hack** — `const pierce = plant.variantId === 'sprout' ? 2 : 0`. Ignores `stats.effects`/`EFFECT_PIERCE`. Replace with effect-driven combat (B6).
- DEFECT: **combo multiplier never applied** — `onEnemyDied` adds `scoreValue` raw; `combo.multiplier` (1–5) is cosmetic-only. Design says kills within combo window scale. Wire `scoreValue × multiplier`.
- DEFECT: `grantWaveReward` emits `SCORE_CHANGED {delta: reward}` but score is **not** incremented — HUD delta lies. Wave rewards are energy; emit `REWARD_GRANTED` only.
- DEFECT: `DAY_STARTED`/`NIGHT_STARTED` exist in the event contract but **no producer emits them** — `GameClock` flips phase silently. Clock cannot own the bus; SimulationRoot must diff `clock.phase` per tick and publish transitions (this unlocks day/night presentation + wave dramaturgy).
- INCOMPLETE: `CRITICAL_HIT` type exists, zero producers. `crit` gene + `EFFECT_CRIT` defined; `applyDamage` hardcodes `critical: false`. Add crit roll in combat (B6), route `CRITICAL_HIT` → observer.
- DEFECT (minor): `EnemySystem.rng` member seeded via `reseed()` is dead state — `spawn()` derives its own per-spawn RNG. Remove member, keep per-spawn derivation (it is the correct pattern).
- INCOMPLETE: `state.discoveredVariants` initialized from `STARTING_INVENTORY` only — meta loadout is never injected. **Bred plants are unplaceable in runs** ⇒ the entire breeding→defense loop is severed. Fix via `RootInit.loadout` (B1).
- INCOMPLETE: `SimState.runCounter` always 0; run identity actually derived in `App.tsx` from `meta.runs + runKey` (React-session state). One authority required: `runId` (B1).

## A5. `src/components/GameView.tsx` — WRONG presentation concerns + INCOMPLETE UX

- DEFECT (dev leaks on player screen): Seed badge, `FX ON/OFF` button, `[D]` button, hash/tick/event counters/particle counts, raw phase string, monospace debug card. Spec: **DevGate** (B8) — none of this in release surface.
- DEFECT: tray inventory read as `rootRef.current?.getSnapshot().inventory[id]` inside JSX render — indirect state read; only updates because HUD sets state at 10 Hz. Fix: tray inventory is part of throttled HUD state snapshot.
- DEFECT: **`recordRunEnd()` exists in meta.ts and is never called** — nektar earned in a run is never banked, `bestWave`/`runs` never update. Meta progression loop is dead. GameOver overlay (B7) owns banking exactly once.
- DEFECT: `handleReset` defined, referenced by nothing (dead).
- INCOMPLETE: `saveRun` fires every 10 s + on unmount, but `loadRun` is never called — **no resume**. Resume contract (B2): restore plants/economy/waveNumber in `prep`; **clear enemies/projectiles** (deterministic re-simulation would require event-log replay, which is out of scope; a wave restart is the honest contract).
- INCOMPLETE: no pause on `visibilitychange` (point 18: Pause bei App-Wechsel, Resume ohne Zustandsverlust).
- INCOMPLETE: placement is `onClick` + `onMouseMove` stub — no ghost preview, no cancel, mobile-hostile. Pointer-events placement (B3): `pointerdown` → move ghost → `pointerup` place; invalid cell = shake ghost + red tint.
- DEFECT: command handler executes only `SpawnParticleBurst` + `CameraShake`. `SpawnFloatingNumber`, `ScreenFlash`, `ShowMangaText`, `PlayAnimation` are drained and **dropped**. 4 of 7 visual commands have no execution path. FeedbackLayer (B5) executes all seven.
- DEFECT: burst colors hard-coded in the UI layer (`profile === 'impact_ring' ? '#fde68a' …`) — presentation color decided outside observers. Color moves into observer payloads (B5).
- DEFECT: no Game Over overlay at all — phase turns `gameover`, screen keeps running silently.
- DEFECT (mobile): single flex column with 5 top-right buttons + 4-item tray — unusable at 390×844. Layout per B9.

## A6. `src/render/renderer.ts` — PLACEHOLDER ART + 3 DEFECTs

- DEFECT: **camera shake is discarded** — `const shakeX = 0, shakeY = 0` (comment admits it). `Camera.shake()` is driven, `shakeOffset` never read. All impact/shake FX are invisible.
- DEFECT: bred variants always render as `BASE_BUSH` (role lookup fails for `cross_*` ids) — **every bred plant looks identical**. Genome→visual derivation (B4) is the single most important visual feature.
- DEFECT: `getPlantStats(plant.variantId)` called without `bredStats` argument — bred plants get no HP bar.
- PLACEHOLDER: grid-line terrain, 5 enemy types = colored circles, plants = primitive ellipses, layers 7 (Feedback) and 8 (Manga) are literally empty comments.
- PLACEHOLDER: day/night ignored — `clock.phase` exists, no tint/lighting/particles.
- REPAIR: full rewrite per Part B (B4/B5/B10): pre-baked paper tiles, ink terrain, per-type enemy bodies, ResolvedVisual-driven plants with genome parts, per-kind particle rendering, feedback + manga layers, day/night grade.

## A7. `src/observers/*` — INCOMPLETE

- `visualObserver.ts`: emits `PunchScale` **never**; no `DAMAGE_DEALT` handler (damage numbers missing = biggest juice gap); `REWARD_GRANTED` unsubscribed (`reward_flight` profile dead); `WAVE_STARTED` unsubscribed (no warning FX); `NIGHT_STARTED`/`DAY_STARTED` unsubscribed; `CRITICAL_HIT` branch draws at world origin `(0,0)` — latent bug.
- `particles.ts`: `EFFECTS_SOURCE` references **8 particle profiles that do not exist** (`spark_line`, `ring_metal`, `glow_rise`, `bubble_pop`, `ring_soft`, `trail_fast`, `burst_star`, `arc_jump`) → `burst()` silently returns. Test D validates IDs, not cross-file keys — extend gate (A11).
- `INTENSITY_PARTICLES` exported, unused.
- REPAIR: observer covers full event→command matrix (B5 table); profiles completed (B5/FX); color decision moves from GameView into observer payloads.

## A8. `src/persistence/*` — INCOMPLETE

- `meta.ts`: raw localStorage, version field hardcoded, no migration chain, no checksum, no corruption quarantine.
- `runSave.ts`: saves live enemies/projectiles (fine for forensic debugging, wrong for resume), no checksum, resume never invoked.
- REPAIR: one `persistence/storage.ts` owner (B2): typed `load/save` + `version` + migration chain + FNV checksum + quarantine-on-corrupt. `meta.ts`/`runSave.ts` become thin schema adapters. Meta adds `runId`, `breedGeneration`, `loadout`.

## A9. `src/App.tsx` — DEFECT (run identity)

- `runSeed = deriveSeed(GAME_SEED, 'world', 'run', meta.runs + runKey)`: `runKey` is session-local React state ⇒ seed collides across sessions; `SimState.runCounter` dead. REPAIR (B1): `runId = meta.runs + 1` at run start; seed derived from `runId`; `runId` passed to `RootInit` and banked into meta at run end. One authority, persisted.

## A10. UI screens — PLACEHOLDER (points 11–14, 26–29 of the critique)

- `StartScreen`: emoji logo 🧬, CSS radial glows, HTML button — must become animated title scene (B7).
- `MainMenu`: `createBaseVariantsSafe` duplicate; emoji icons; flat color swatch `preview` instead of rendered plant thumbnails.
- `BreedingLab`: native `<select>` pickers; no breeding moment; hardcoded German string "zu wenig Nektar" bypassing i18n; `variantCountOf` recomputes `.filter().length` per option.
- `i18n`: GameView hardcodes `Seed:`, `FX ON/OFF`, `[D]`; DebugPanel hardcodes German sentence.
- REPAIR: B7 (screens) + B9 (UI kit) + i18n sweep.

## A11. Tests — gaps (extend suite)

Missing gates: combo×score integration; effect-profile cross-reference gate (`EFFECTS_SOURCE.particleProfile/impactProfile/soundProfile` keys must exist); resume-shape contract (enemies/projectiles stripped); breeding determinism across `breedGeneration` persistence; meta migration v1→v2; day/night event emission. KEEP all 52 existing tests.

## A12. World source — KEEP + prune

- KEEP `ENEMY_PATH`, placement margin, helpers.
- Prune dangling constants (`WAVES_PER_NIGHT`, `PLANTS_PER_CELL`, `SPAWN_QUEUE_SHUFFLE`, `CELL_SIZE` duplicate) or wire them into the systems that should consume them (`WAVES_PER_NIGHT` → wave/night coupling in Phase D).

---

# PART B — ASSET & RENDER SPECIFICATION

## B0. Art direction contract (binding)

1. **Style: 2D illustrated paper-world.** Ink contours, flat matte fills, paper grain, hand-drawn asymmetry (every silhouette parameter carries ±seeded jitter).
2. **Muted base, glow is reward.** Ambient palette is desaturated paper tones. Any glow/bloom is reserved for crits, rewards, heal, boss — never ambient.
3. **Silhouette first.** Every entity reads as black-ink contour at 32 px. Test: grayscale screenshot must remain playable.
4. **390×844 first.** Every screen composed portrait-mobile-first, then widened. No interaction depends on hover.
5. **Determinism:** all jitter/asymmetry from `visual`/`cosmetic` namespaces via `deriveSeed`. FX toggles never touch gameplay state.
6. **No:** emoji as final art, random gradients, stock icons, photo textures, mixed styles, particle floods replacing animation.
7. **Paper + Pop (LifeSeedLab-Identität):** Die Welt ist haptisch papercraft — Hintergrund/Wege als aufgeklebte Papierstreifen mit Drop-Shadow, Fineliner-Raster, ausgefransten Kanten, Papierkorn (einmal gebacken, `visual`-Namespace). UI sind Notizzettel/Post-its/Pappschilder mit Büroklammern (Tokens `--paper`/`--paper-dim`/`--ink`, kein Blur-Glass). Pflanzen/Gegner brechen bewusst aus der matten Welt aus: satt, plastisch, mit Farbverläufen + Specular-Highlights à la Nintendo — wie aufgeklebte, lebendig gewordene Figuren. Squash & Stretch, Konfetti aus Papierschnipseln, Idle-Atmen. Diese Sprache ist verbindlich; generische Mobile-TD-Kompositionen mit dunkler HUD-Leiste + leerer Canvas + Kartenmeer sind damit ausgeschlossen.
8. **Keine zweite Wahrheit:** Visuelle Identität entsteht ausschließlich aus der Pipeline `SOURCE → GENOME → TRAITS → GAMEPLAY PHENOTYPE → VISUAL PHENOTYPE → SIMULATION → EVENT → OBSERVER → RENDER`. Screenshots dürfen nicht „hübsch erfunden" sein; jede Silhouette/Palette/Tint ist aus dem Genom ableitbar (`genomeToVisualInput` → `ResolvedVisual` → `variantKey`). Ein Menücontainer ohne Domänenbedeutung (Gewächshaus = Genom/Breeding, Archiv = Herbarium, Run = Schlachtfeld, Chronik = Feldnotizen) ist ein Defect.

## B1. Run identity & loadout (repair: App.tsx, meta, root.ts)

- `MetaSave` v2 adds: `runId: number`, `breedGeneration: number`, `loadout: string[]` (≤ 4 variant ids).
- Run start: `runId = meta.runs + 1` → `runSeed = deriveSeed(GAME_SEED,'world','run',runId,1)` → `RootInit { seed, runId, loadout }`.
- `freshState`: `discoveredVariants` = source ids ∪ loadout ids; `inventory` = STARTING_INVENTORY ∪ loadout×2; `runCounter = runId`.
- `BreedingLab` "Keep": consumes 1× of each parent count, increments `breedGeneration` (persisted), registers child.

## B2. Persistence contract (new `persistence/storage.ts` ≤ 250 LOC)

- API: `load<T>(key, {version, migrate, fallback})`, `save(key, value)`; FNV-1a checksum suffix; checksum mismatch → quarantine to `key.corrupt` + return `fallback()`.
- Stores: `meta` (localStorage, sync) · `run` (localStorage v2, async-free MVP).
- Run-save v2 shape: `{version, runId, seed, tick, waveNumber, phase:'prep', energy, lives, score, combo, plants[], inventory, nektarEarned}` — **enemies/projectiles/schedule intentionally absent**. Resume: rebuild state, phase = `prep`, schedule regenerates from `(seed, waveNumber+1)`. Documented as the Resume-Vertrag; test-locked.
- `visibilitychange→hidden` ⇒ pause + save; `visible` ⇒ resume overlay (tap to continue).

## B3. Placement UX (pointer events, GameView extract `PlacementController`)

- States: `idle` → `selected(variantId)` → `ghost(cell, valid?)` → `placed/rejected`.
- `pointerdown` on tray card = select (pulse feedback); `pointermove` = ghost follows snapped cell; `pointerup` on valid cell = emit `PLACE_PLANT` command; `pointerup` invalid = ghost shakes, cell flashes red, `PLACEMENT_REJECTED` FX; second tap on same card or `CANCEL_PLANT` button = cancel.
- Ghost = ResolvedVisual at 60% alpha + range ring (shooter/support) + green/red footprint tint. Same resolved visual as final placement (PreviewModifier = alpha only — identity never changes).
- Desktop parity: identical pointer pipeline (no separate hover path).

## B4. Plant visual identity from genome (renderer + generator)

- New pure function `genomeToVisualInput(v: PlantVariant, visualSeed): VisualInput` in `visual/generator.ts`:
  - type → baseId (`shooter→BASE_THORN|BASE_FROND`, `wall→BASE_ROOT|BASE_CACTUS`, `support→BASE_MUSHROOM|BASE_PUFF` chosen by `deriveSeed(genome hash)`),
  - gene→extra mapping table (`fire→EXTRA_SPIKE`, `ice→EXTRA_GEM`, `heal→EXTRA_LEAF_CROWN`, `thorns→EXTRA_SPIKE`, `crit→EXTRA_ANTENNA`, `regen→EXTRA_MUSHROOM`, `lure→EXTRA_VINE`, `shield→EXTRA_HAT`, …, first 2 by power),
  - strongest gene → effect tint (`fire→EFFECT_BURN`, `ice→EFFECT_SLOW`, `heal→EFFECT_HEAL`, `crit→EFFECT_CRIT`, default none).
- Every bred plant now resolves to a **distinct silhouette + palette + tint**. Same genome + seed ⇒ same look (test-locked).
- Variant thumbnails in menus render `ResolvedVisual` to a 48×48 offscreen canvas (component `PlantThumb`).

## B5. Event → FX execution matrix (visualObserver + FeedbackLayer + manga)

All seven command types get an executor. Damage numbers, screen flash, manga text, punch, animation via a `FeedbackLayer` in the renderer (layer 7) + `MangaLayer` (layer 8).

| Event | Commands emitted |
|---|---|
| `DAMAGE_DEALT` | `SpawnFloatingNumber{amount}` · `PunchScale{enemyId, 0.15}` · `SpawnParticleBurst{impactProfile}` |
| `CRITICAL_HIT` | floating number (large, accent) · `ShowMangaText{'CRIT'}` · `CameraShake 3` · `ScreenFlash{white,0.12,3}` · star burst |
| `ENEMY_DIED` | death burst (per enemy-type color) · `+reward` number · reward flight (B5.1) · `PunchScale` |
| `REWARD_GRANTED` | `reward_flight` particles from world pos → HUD energy icon (curved path, cosmetic namespace) |
| `PROJECTILE_FIRED` | muzzle puff on plant · `PlayAnimation{attack}` |
| `PROJECTILE_HIT` | impact ring + effect-specific burst (from `effectId`, B6) |
| `WAVE_STARTED` | `ShowMangaText{'WAVE N'}` · ground warning pulse along path · horn |
| `WAVE_COMPLETED` | `ShowMangaText{'CLEAR'}` · `ScreenFlash{accent,0.15,6}` · confetti-leaves |
| `PLANT_PLACED` | grow animation + dust puff (exists) |
| `PLACEMENT_REJECTED` | red cell flash + one shake tick (no camera) |
| `NIGHT_STARTED` | lighting grade tween + spores + wave warning banner |
| `DAY_STARTED` | warm grade tween + reward banner (banked summary, B7) |
| `GAME_OVER` | red vignette + slow-mo hit-stop (3 ticks) + KO manga panel |

Observer payloads now carry `color`/`accent` resolved from effect source — UI passes them through untouched.

## B5.1 Reward flight

`REWARD_GRANTED` + world position → 3–5 GLOW particles; quadratic curve to HUD anchor (screen-space target = energy icon position passed in from HUD once per resize); on arrival HUD energy counter punches (scale 1→1.25→1). Resource is already authoritative — flight is display-only.

## B6. Effect chain (sim → visuals, first real pass)

- `ProjectileEntity` gains `effectId: EffectId | null`.
- `root.ts` wiring: `pierce = stats.effects.includes('EFFECT_PIERCE') ? 2 : 0`; crit roll `if (stats.effects.includes('EFFECT_CRIT') || genome crit power > 0.5) rng('enemy',tick) < 0.15 → damage×2, critical=true`.
- `applyDamage` emits `DAMAGE_DEALT{critical}` + `CRITICAL_HIT` on crit (producer fixed).
- Statuses v1 (deterministic, no per-enemy RNG streams): `EFFECT_SLOW` → `e.slowUntil = tick+90`, speed×0.5, frost tint via observer; `EFFECT_BURN` → 3×(damage/3) ticks poison-style DoT, ember tint; `EFFECT_POISON` → 5 ticks DoT; `EFFECT_CHAIN` → on kill, jump to nearest enemy ≤ 2 cells for 50% damage (arc FX between positions); `EFFECT_HEAL`/`SHIELD`/`HASTE`/`REFLECT` remain support/wall tags (heal aura exists; reflect = thorns contact damage when enemies touch walls — contact combat arrives with walls being hittable, tracked for Phase D).
- `PROJECTILE_HIT`/`PROJECTILE_FIRED` payloads gain `effectId` → observer picks profile/palette/sound from `EFFECTS_SOURCE` (the coupling point the contract already declares).

## B7. Screen specifications

**Title (B7.1)** — full-bleed canvas scene behind minimal DOM: layered paper hills + swaying grass silhouettes drifting (cosmetic namespace, 3 depths, parallax on device tilt later); 2–3 ambient LEAF/SPORE particles/s; logo = custom SVG wordmark (B9) with 600 ms draw-on + settle; big ink-styled PLAY button (min 56 px target); language pills bottom; first pointer = audio unlock + soft chime. Sequence: paint → logo draws → button fades up. Never a bare div flash.

**Main menu (B7.2)** — same world dimmed; nektar counter with drop icon (SVG); stat chips (best wave, runs, collection); three mode cards as **illustrated panels** (greenhouse/endless/pvp each a mini canvas vignette, not emoji); collection grid with `PlantThumb` + count; loadout editor: tap to toggle ≤ 4 carried plants (B1).

**Greenhouse / Breeding ceremony (B7.3)** — replaces `<select>`: two parent slots (tap → collection sheet of `PlantThumb` cards, owned counts shown); center stage 240×240 canvas runs the breeding animation when KREUZEN is pressed (~1.6 s, deterministic from breed seed): parents slide in → genome markers (gene glyphs) orbit between them → dominant genes flare (accent, not glow) → mutation glitch: 2-frame ink-slash → seed drops to soil → offspring grows (scale + unfurl) → traits list staggers in → 3 result cards below. `SKIP` on tap. Cancel = back always safe.

**HUD (B7.4)** — top-left: energy (drop icon + count, punch on gain), lives (leaf-heart), wave chip `W 3`; top-right: pause icon + menu icon. Nothing else. Combo appears center-bottom of canvas as manga burst `×N` when ≥ 2. Phase is communicated by world (lighting), never a text label.

**Pause & Game Over (B7.5)** — pause: dim + resume/restart/exit + volume toggles. Game over: ink panel slides up, `WAVE N` large, score + combo highest + **nektar earned with flight-to-counter animation**, buttons New Run / Menu. `recordRunEnd()` fires exactly once here (guard flag).

**DevGate (B7.6)** — `#dev` hash or `?dev=1` reveals: state hash, tick, event log (last 20), particle count/budget, seed + runId, FX toggle, RNG draw counters, entity inspector (entity id / variantKey / visual seed / palette). Release build: zero dev surface, zero seed badge, zero counters.

## B8. Audio (new `observers/audioObserver.ts` ≤ 250 LOC)

- Lazy `AudioContext` on first user gesture; master gain 0.5; mute persisted in meta.
- Synth map from `soundProfile` (no assets): `shot_sharp`=square blip 660→220 Hz 80 ms; `thud`=sine 90 Hz + noise burst; `chime`=two sines (880/1320, 200 ms); `frost`=filtered noise sweep down; `fire`=noise + lowpass wobble; `zap`=sawtooth 1200→100 Hz 60 ms; `blub`=sine pitch-up blub; `hum`=soft triangle; `whoosh`=bandpass noise sweep; `crit`=layered thump + high ping; `wave_horn`=two detuned saws 300 ms; `ko`=low boom + noise.
- Subscribes to same events as observer; intensity scales gain. FX OFF also silences. Never reads/advances gameplay RNG.

## B9. UI kit + icons (SVG, single `ui/icons.tsx`)

- Icons (24×24, 2 px ink stroke, paper fill): energy-drop, heart-leaf, wave, play, pause, settings-gear, language-globe, nektar-drop, trophy, dna-helix, sword, shield, plus, x, back-arrow, volume, volume-off, bug (dev only).
- Panels: paper cards — `#f5efdc` fill, `#2b2b26` ink border 2 px, 3 px offset hard shadow, corner torn-radius (SVG path), no blur-glass.
- Buttons: ink outline, paper fill, press = translate 2 px + shadow shrink (no scale transform — feels like paper, not iOS).
- Typography: display = "Gaegu" or "Patrick Hand" (hand-drawn, bundled via @fontsource, no CDN); numbers/body = system stack. Title wordmark = custom SVG paths.
- Palette tokens in `index.css`: `--paper:#f5efdc; --paper-dim:#e8dfc8; --ink:#2b2b26; --leaf:#5a8f4e; --leaf-dark:#2e4a2a; --bloom:#c96f8e; --nektar:#d9a441; --danger:#a94438; --night:#1c222b;` — replaces the dark-Slate prototype tokens.

## B10. World & entity render specification (renderer rewrite)

**Terrain (pre-baked, once per run into offscreen canvas):**
- Paper base: `--paper` fill + grain overlay (two-pass: 1 px value-noise dots at 4% alpha from `visual` RNG + 5–6 faint fiber strokes).
- Grid **vanishes**: placement cells hinted by irregular ink-dotted lawn tufts at cell corners (only cells legal for placement); hover/ghost restores a soft cell highlight.
- Path: dirt ribbon — layered: dark under-edge, `--paper-dim` body, worn speckles, 2–3 flat stepping stones per straight segment, ink contour with seeded wobble (±1.5 px). Direction chevrons every 3 cells, 6% alpha.
- Decor (seeded scatter, off-path, no gameplay meaning): 8–12 grass tufts, 3–5 pebbles, 2–4 leaf litter, 1–2 mushrooms, per-run unique but stable.

**Plants (per ResolvedVisual):** ink contour 2.5 px; contact shadow ellipse under base; body built from layer keys with paper fill + one darker flat shade side (no gradient); breathing idle (sway ±2° / bob 1 px / pulse 3%); attack animation = anticipation squash (4 t) → lunge toward target (6 t) → recoil (6 t); hit = 1-frame white flash + tilt away; placement = scale 0.6→1.05→1 with dust.

**Enemies (5 distinct bodies, all ink contour):**
- grunt: round beetle — waddle (rotation ±4°, 8-t cycle), stubby legs 2-frame.
- fast: slim dart — stretched along velocity, motion trail (3 ghost after-images at 30/50% alpha).
- tank: broad scarab — slow bob, ground shadow ×1.4, small dust puffs each step.
- swarm: trio of tiny gnats orbiting a common center (cosmetic offset only — gameplay position stays authoritative single entity).
- boss: horned knight-beetle ×2.2 scale — aura ring (reward-tier glow allowed), entrance: screen dim + `ShowMangaText{'BOSS'}` + horn.
- Death: squash-pop (scale 1→1.3→0, 8 t) + type-colored shards; never a bare fade.
- HP: 3 px ink-framed bar only when damaged.

**Projectiles:** shape by `projectileProfile` — `bolt` = elongated ink teardrop with speed streak; `orb` = hollow circle (frost) with sparkle; `flame` = flickering 2-frame flame blob; `blob` = wobbling droplet; `zig`/`arc` rendered as polyline trail. Tint from effect palette.

**Particles per kind:** DOT = ink dot; SPARK = 4-point star cross; SMOKE = soft 3-blob puff cluster alpha-curved; DUST = fading flat ellipse; GLOW = radial soft dot (reward/crit only); RING = expanding stroke circle; SHARD = rotated triangle; BUBBLE = stroked circle w/ highlight dot; SPORE = tiny drifting circle with 2 s float; LEAF = bent almond leaf shape, flutter rotation. Budget rule unchanged (NORMAL 40 / BUSY 70 / CHAOS 100).

**Lighting (day/night grade):** day = paper as-is; night = multiply `#1c222b` at 35% + desaturate terrain 10% + fireflies (2–3 GLOW spores); transitions tween 90 ticks driven by `DAY_STARTED`/`NIGHT_STARTED` events (not setTimeout); flash/manga layers sit **above** the grade.

## B11. Wave dramaturgy timeline (per wave, driven by events only)

```
WAVE_STARTED t0   → horn + path warning pulses + manga banner 'WAVE N'
t0+30             → first spawns enter from path head (walk-in visible, no pop-in)
mid-wave          → pressure FX scale with enemy count (budget BUSY)
boss wave         → NIGHT grade deepen + BOSS banner + boss horn
last kill         → WAVE_COMPLETED: hit-stop 3 t + confetti leaves + CLEAR manga
+30 t             → DAY_STARTED (if night) → reward flight → prep banner (soft)
```

All steps are observer reactions to existing/planned events — zero gameplay coupling.

## B12. Mobile performance pass (acceptance)

- Target: 390×844, 60 fps mid-wave ≥ 30 entities; frame time ≤ 16 ms; sim step ≤ 2 ms.
- Measured via DevGate perf panel (fps, frame ms, sim ms, particle count).
- Degradation order: ambient decor layer (static, zero cost anyway) → secondary FX → particle budget → DPR cap 2 → 1.5 → render at 0.75× internal scale. Gameplay fidelity never trades before cosmetics.

## B13. Definition of Done for this work order

- [ ] Legacy symbols (`GameState`/`Tower`/`Enemy`/`Projectile`/`Worker*`) deleted; `types.ts` = meta/breeding only
- [ ] `genome.ts` on core/rng; `breedGeneration` persisted; single `createBaseVariants`
- [ ] DevGate hides all dev UI in release; HUD shows 5 elements max
- [ ] All 7 visual commands + reward flight executed; damage numbers visible
- [ ] Camera shake actually rendered
- [ ] Genome→visual: bred plants visually distinct (test-locked determinism)
- [ ] Crit chain: roll → event → observer → manga + audio
- [ ] Effect chain: slow/burn/poison/chain live in sim; profiles referenced by sources all exist (gate test)
- [ ] Resume contract implemented + test-locked (enemies/projectiles stripped, prep restart)
- [ ] Pause on hidden; resume overlay; `recordRunEnd` exactly once
- [ ] Run identity: single `runId` authority (meta-runId ↔ RootInit)
- [ ] Breeding ceremony replaces selects; thumbnails everywhere; no emoji final art
- [ ] Audio observer live (unlock on gesture, FX OFF silences)
- [ ] Title scene animated; menu illustrated; 390×844 verified
- [ ] New tests: B6 chain, combo×score, profile cross-ref gate, resume shape, breeding determinism, meta migration — suite ≥ 70 green
- [ ] LOC caps respected (renderer split into `render/layers/*` when > 400)
