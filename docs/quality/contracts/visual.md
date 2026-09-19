# Contract: Visual, Beobachtung & Audio

**Owner (genau einer):** `src/render/*` (renderer, camera, layers) · `src/visual/generator.ts` · `src/observers/*` (FX, particles, audio)
**Writer:** Renderer/Generator sind reine Leser des SimState bzw. von `ResolvedVisual`; Observer erzeugen nur Präsentations-Kommandos
**Readers:** Canvas/UI
**LOC-Caps:** 400 (Renderer, Visual-Generator, Partikel, Observer)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Verbot: Gameplay-Entscheidungen. FX ON/OFF muss bit-identischen Spielzustand liefern; Präsentations-Zufall nur über `visual`/`particle`/`cosmetic`.

---

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

### A14. DEFECT (verifiziert) — die berechnete Route wird nie gezeichnet

Befundkette, jede Stufe im Code gelesen:

1. Das Map-Grid wird zu einer Route verrechnet; `SimulationRoot` ruft `EnemySystem.setRoute(route)` bei `START_WAVE`.
2. `EnemySystem.activePath()` = `this.route ?? ENEMY_PATH` — die Gegner laufen also tatsächlich die **berechnete** Route.
3. `Renderer.prepareTerrain(seed)` backt `bakeTerrain(seed)` und **nur** bei Seed-Wechsel neu (`if (this.terrainSeed === seed) return`) — laut Dateiheader bewusst „EINMAL pro Seed gebacken".
4. `layers/terrain.ts`, `drawPath()`, liest **ausschließlich** `ENEMY_PATH`: statisch, ohne Parameter, ohne Routen-Bezug; die Verzierung stammt aus dem `visual`-Namespace.
5. `EnemySystem.getRoute()` trägt den Kommentar „Renderer zeigt die Route — read-only", hat aber **null** Aufrufer in `src/render/` — die einzigen Aufrufer liegen in `src/simulation/placement_map.test.ts`.

Ergebnis: **Umleiten ist unsichtbar.** Wer mit `path`-Kacheln umleitet, sieht weiter die Default-Serpentine, während die Gegner auf einer anderen Bahn laufen — das Feature wird berechnet, aber nicht dargestellt. Aussage (5) ist zusätzlich eine Behauptung über einen Konsumenten, den es nicht gibt (dieselbe Klasse wie A13.7: ein Kommentar, den niemand prüft).

Belege: `src/render/layers/terrain.ts:171-232`, `src/render/renderer.ts:77-81`, `src/simulation/enemySystem.ts:30-47`. Warum kein Test anschlug: `placement_map.test.ts` prüft die Route **im Modell**, nicht im Bild — deshalb blieb es grün.

## B0. Art direction contract (binding)

1. **Style: 2D illustrated paper-world.** Ink contours, flat matte fills, paper grain, hand-drawn asymmetry (every silhouette parameter carries ±seeded jitter).
2. **Muted base, glow is reward.** Ambient palette is desaturated paper tones. Any glow/bloom is reserved for crits, rewards, heal, boss — never ambient.
3. **Silhouette first.** Every entity reads as black-ink contour at 32 px. Test: grayscale screenshot must remain playable.
4. **390×844 first.** Every screen composed portrait-mobile-first, then widened. No interaction depends on hover.
5. **Determinism:** all jitter/asymmetry from `visual`/`cosmetic` namespaces via `deriveSeed`. FX toggles never touch gameplay state.
6. **No:** emoji as final art, random gradients, stock icons, photo textures, mixed styles, particle floods replacing animation.
7. **Paper + Pop (LifeSeedLab-Identität):** Die Welt ist haptisch papercraft — Hintergrund/Wege als aufgeklebte Papierstreifen mit Drop-Shadow, Fineliner-Raster, ausgefransten Kanten, Papierkorn (einmal gebacken, `visual`-Namespace). UI sind Notizzettel/Post-its/Pappschilder mit Büroklammern (Tokens `--paper`/`--paper-dim`/`--ink`, kein Blur-Glass). Pflanzen/Gegner brechen bewusst aus der matten Welt aus: satt, plastisch, mit Farbverläufen + Specular-Highlights à la Nintendo — wie aufgeklebte, lebendig gewordene Figuren. Squash & Stretch, Konfetti aus Papierschnipseln, Idle-Atmen. Diese Sprache ist verbindlich; generische Mobile-TD-Kompositionen mit dunkler HUD-Leiste + leerer Canvas + Kartenmeer sind damit ausgeschlossen.
8. **Keine zweite Wahrheit:** Visuelle Identität entsteht ausschließlich aus der Pipeline `SOURCE → GENOME → TRAITS → GAMEPLAY PHENOTYPE → VISUAL PHENOTYPE → SIMULATION → EVENT → OBSERVER → RENDER`. Screenshots dürfen nicht „hübsch erfunden" sein; jede Silhouette/Palette/Tint ist aus dem Genom ableitbar (`genomeToVisualInput` → `ResolvedVisual` → `variantKey`). Ein Menücontainer ohne Domänenbedeutung (Gewächshaus = Genom/Breeding, Archiv = Herbarium, Run = Schlachtfeld, Chronik = Feldnotizen) ist ein Defect.
9. **Kästchenblock-CGI („Papier trifft CGI", bindend — Manifest: `../architecture/papier-trifft-cgi.md`, Styleframe: `../art/styleframe.html` — das Styleframe liegt bewusst außerhalb des Tracks, siehe A13.4):** Bühne = Schul-Mathe-Collageblock (blaues Raster exakt auf `CELL_SIZE`, Blockrand + Lochung, Bleistift-Kritzeleien Alpha ≈ 0.09, Collage-Fetzen/Klebestreifen — alles gebacken, `visual`-Namespace). Kachel = EIN rastersynchroner Kasten; Inhalte (pot/boulder/decor/path) wohnen im Kasten. Pflanzen/Käfer = CGI-Kontrast (2-Stopp-Verlauf + Specular oben-links + 2.5-px-Ink-Kontur) auf matten Papier. **Skala ist Genom-Aussage:** `ResolvedVisual.scale` = 0.85 + strength·0.3 ± 0.05, geklemmt 0.85–1.25, strength = Ø Gene-Power — deterministisch, test-locked (generator.test.ts).
10. **Screen-System (bindend):** JEDER Menübereich ist ein eigener Top-Level-Screen (`App.tsx`-Router: start | menu | greenhouse | seedshop | beetlelab | codex | run) mit Papier-Übergang (`ScreenTransition`, `prefers-reduced-motion` = harter Schnitt) und Indikatoren für alles (`NavIndicators`: Notizzettel-Tabs mit `aria-current`, Status-Chips Nektar/Samen/Sammlung/bestes Wave/Brutling, Page-Dots). Keine Modal-Verschachtelung mehr.

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

## B8. Audio (new `observers/audioObserver.ts` ≤ 250 LOC)

- Lazy `AudioContext` on first user gesture; master gain 0.5; mute persisted in meta.
- Synth map from `soundProfile` (no assets): `shot_sharp`=square blip 660→220 Hz 80 ms; `thud`=sine 90 Hz + noise burst; `chime`=two sines (880/1320, 200 ms); `frost`=filtered noise sweep down; `fire`=noise + lowpass wobble; `zap`=sawtooth 1200→100 Hz 60 ms; `blub`=sine pitch-up blub; `hum`=soft triangle; `whoosh`=bandpass noise sweep; `crit`=layered thump + high ping; `wave_horn`=two detuned saws 300 ms; `ko`=low boom + noise.
- Subscribes to same events as observer; intensity scales gain. FX OFF also silences. Never reads/advances gameplay RNG.

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

### B16.1 Die aktive Route muss gezeichnet werden (aus A14) — **UMGESETZT (2026-09-16)**

Der Terrain-Layer erhält die **aktive** Route (als Provider/Getter, nicht als Zustandskopie), und `drawPath` liest sie statt `ENEMY_PATH`. Re-Bake **nur** bei Routen- oder Seed-Wechsel, niemals pro Frame (B12: frame ≤ 16 ms). `getRoute()` bekommt einen echten Konsumenten oder fällt ganz; der Kommentar in `enemySystem.ts` wird richtiggestellt. Gate-Test auf den **Vertrag** („der Renderer erhält genau die aktive Route"), nicht auf Canvas-Pixel.

**Umsetzung:** Die Route hat **eine** Wahrheit: `SimState.currentRoute` (Writer: `SimulationRoot.recomputeRoute`, nur bei `START_WAVE`). Die Auflösung `null ⇒ ENEMY_PATH` lebt **einmal** als `resolveActiveRoute` in `world.source.ts`; Sim (`EnemySystem.activePath(state)`), Renderer und Terrain-Bake lesen denselben Ausdruck — keine Kopie, kein eigener Fallback mehr (A14: drei Tode derselben Wahrheit). `setRoute`/`getRoute` sind gelöscht; `prepareTerrain` ist gestorben — der Bake hängt an (Seed, aktive Route) mit Cache-Schlüssel `seed|waypoints` (Re-Bake nur bei Schlüssel-Wechsel, nie pro Frame). `currentRoute` ist Resume-kontrakt-konform bewusst `null` (kein persistiertes Schema-Feld nötig). Gates: `placement_map.test.ts` liest die Route aus dem **Snapshot** (public contract, kein System-Feld-Griff mehr) und lockt die Render-Parität („EnemySystem liest dieselbe Auflösung wie der Renderer"); `sources.test.ts` lockt den Resolver (null ⇒ ENEMY_PATH-Referenz, gültige Route unverändert).
