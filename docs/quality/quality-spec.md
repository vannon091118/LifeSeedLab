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

## A13. Lifecycle-Identität, Snapshot-Grenzen & Doku-Verweise — DEFECT + INCOMPLETE (Nachtrag ebb4913)

Status bei Aufnahme: **154/154 Tests grün, `tsc` clean.** Jeder Befund wurde an der Quelle gelesen bzw. ausgeführt, nicht angenommen.

### A13.1 DEFECT (verifiziert, kritisch) — `broodIndex` wird recycelt ⇒ doppelte Brut-Identitäten · **REPARIERT (B14.1–B14.3)**

`enqueueBrood` (`meta/run.ts`) leitet den nächsten Index aus dem **aktuellen Fenster** ab:
`meta.pendingBroods.reduce((m,p) => Math.max(m, p.broodIndex), -1) + 1`. Das ist als Aggregation reihenfolge-unabhängig (im Gegensatz zu `arr[arr.length-1]`), aber **nicht stabil**: `claimBrood` entfernt die Brut mit dem höchsten Index aus dem Fenster. Paart der Spieler danach **dieselben Eltern** erneut, fällt der Maximalwert zurück und der bereits verbrauchte Index wird erneut vergeben. `rollBrood` verwendet den Index als RNG-Namespace-Parameter (`deriveBroodSeed(A, B, generation)`) und bildet die Specimen-ID daraus (`brood_<seed>_<i>`) ⇒ identische Brut, identische ID. Ergebnis: `meta.beetles` enthält zwei Specimen mit **derselben `id`** (Doppel-Identität bei `key`, Lookup und Deploy-Spec).

Beweis: `src/meta/identity.test.ts` (zuerst als Ist-Zustands-Beweis geführt, mit B14 in den Soll-Zustand gedreht).

### A13.2 DEFECT — zweite Ableitungsquelle für dieselbe Wahrheit · **REPARIERT (B14.1)**

`BeetleLab.tsx` berechnet `nextGen` mit **derselben** `reduce`/`Math.max`-Formel ein zweites Mal, um die Vorschau zu rendern. Vorschau und Enqueue können auseinanderlaufen („genau eine Quelle pro Wahrheit" verletzt; Ownership-Regel 2).

### A13.3 INCONSISTENT — der Pflanzen-Pfad hat den Zähler schon · **REPARIERT (B14.1)**

Pflanzenzucht ist korrekt monoton: `crossIndex = meta.breedGeneration` (persistiert, nie rückwärts). Der Käfer-Pfad ist die einzige Stelle im Repo, die eine Entitäts-Identität aus einem **schrumpfenden Array** ableitet. Das ist ein Musterfehler, kein Einzelfall-Zufall.

### A13.4 DEFECT — order-abhängige First-Match-Zugriffe und ein invertiertes Gate · **REPARIERT (B14.4)**

- `claimBrood` → `pendingBroods.find(p => p.broodIndex === idx)`, `Greenhouse.crossReady` → `pendingCrosses.find(...)`: **erster Treffer gewinnt** ⇒ bei doppelter Kennung entscheidet die Array-Reihenfolge über das Ergebnis.
- `crossReady` gibt bei **unbekanntem** `crossIndex` `true` zurück („nicht gefunden = reif") ⇒ fail-open. Ein Gate darf fail-closed sein.

### A13.5 DEFECT — Checksumme an die JSON-Property-Reihenfolge gekoppelt · **REPARIERT (B14.6)**

`persistence/storage.ts` prüft `fnv1a(JSON.stringify(env.data))`. `JSON.stringify` respektiert die Einfüge-Reihenfolge der Keys; `toV3` (`meta/store.ts`) baut das Objekt aus einem Literal neu mit **anderer** Key-Reihenfolge. Jede spätere Umsortierung von Keys (Refactor, Migration, `{...a, ...b}`-Umbau) quarantäniert **gültige** Saves. Integrität darf den Inhalt meistern, nicht die Darstellung.

### A13.6 INCOMPLETE — `keepCross` ist nicht atomar · **REPARIERT (B14.5)**

`keepCross` (`meta/run.ts`) persistiert in **drei** Schritten: `updateMeta(counts)` → `registerVariant()` → `updateMeta(bredStats)`. Genau der Zwischenzustand („Eltern verbraucht, kein Kind registriert"), den `consumeSeedAndEnqueueCross` für den Sow-Pfad geschlossen hat, ist hier offen. Die Härtung wurde nicht symmetrisch angewandt.

### A13.7 INCOMPLETE — drei Ableitungen von „ist die Brut reif" · **REPARIERT (B14.4)**

`advanceCrossMaturation` (gibt `number[]` zurück, **kein** Aufrufer nutzt den Rückgabewert), `Greenhouse.crossReady` (eigene Wave-Arithmetik) und `readyBroods` (Käfer-Parallele) prüfen dieselbe Bedingung mit je eigenem Code. `advanceCrossMaturation` liefert zudem einen `number[]`-Rückgabewert ohne Vertrag (Seeds, nicht Indizes) — totes Interface mit Irreführungspotenzial.

### A13.8 INCOMPLETE — `structuredClone` im 10-Hz-Hot-Path · **OFFEN (B14.7, Mid-Term: erst messen)**

Seit ebb4913 liefern `getSnapshot()`/`getEventLog()` Tiefkopien (korrekt gegen Fremd-Mutation). `GameView` ruft `getSnapshot()` aber alle 100 ms im RAF-HUD-Intervall, `DevOverlay` pro Tick ⇒ Voll-Klon von `plants`/`enemies`/`projectiles` als Dauerlast. Gegen das B12-Budget (frame ≤ 16 ms, sim ≤ 2 ms, 390×844) ist das ungemessen.

### A13.9 DEFECT — Doku-Querverweise nach dem Kebab-Case-Umzug verwaist · **REPARIERT**

Commit `6585a3d` hat die Dokumente nach `docs/{architecture,quality,setup}/` verschoben und auf kebab-case umbenannt, aber **keinen** der Verweise mitgezogen: 32 tote Links in 7 Dateien (`ARCHITECTURE_CONTRACT.md`, `ARCHITECTURE.md`, `docs/QUALITY_SPEC.md`). Zusätzlich verweisen `ROADMAP.md` auf `docs/quality/changelog.md` und `CLAUDE.md` sowie B0.9 auf `docs/art/styleframe.html` — alle drei liegen in `.gitignore` und existieren für einen frischen Klon nicht. In diesem Arbeitsgang korrigiert (siehe A13.10).

### A13.10 REPARIERT (dieser Arbeitsgang) — Verweise + Doku-Stand

Tote Querverweise in `AGENTS.md`, `README.md`, `docs/architecture/architecture.md`, `docs/quality/{implementation-plan,lifegameplant-audit}.md`, `docs/setup/presentation.md` auf die neuen Pfade gezogen; Test-Badge (52 → 152) und Gate-Liste (🔄 → ✅) auf den echten Stand gehoben; `AGENTS.md`-Titel aus der vorhergehenden Absatzzeile gelöst (`werden.s# AGENTS.md` — H1 war nicht gerendert). Nicht repariert und bewusst offen: der Verweis auf das ignorierte Styleframe (A13.9, Entscheidung über Track-Zugehörigkeit nötig).

### A13.11 Die systematische Frage — wo sonst leitet Code Identität aus einem Fenster ab?

Prüfmuster für den Rest des Repos: jede Entitäts-Kennung muss aus einem **monotonen Zähler** oder einer **injektiv ableitbaren** Quelle kommen — nie aus `max`/`length`/`last`/`find` eines Fensters.

Geprüfte Kandidaten, gelesen und ohne Window-Befund: `nextId` (`ids.ts`: monotones `counters[kind]`), `MetaSave.runId`/`runs` (`reserveRunId`), Kappungen von `savedVariants`/`beetles` (bewusst verlustbehaftet, betreiben keine Identität), `discovery/chain.ts` (append-only, Hash-verkettet), `SimulationRoot.pendingKills` (privater Puffer, wird pro Tick vollständig geleert — kein Fenster).

**Offen (nicht verifiziert, eigener Prüfpunkt):** `nextScopedId` (`ids.ts`) leitet die Kennung nicht-monoton aus einem Hash ab (`h % 9000 + 1`) — theoretisch kollidierbar für verschiedene `(runOrMatchId, kind, seq)`. Keine Reproduktion versucht; bei Bedarf als eigenes Gate prüfen.

### A13.12 DEFECT (verifiziert, kritisch) — die pflanzliche Zucht-Schleife ist unerreichbar

`totalWavesSurvived` wird **ausschließlich** in `advanceCrossMaturation` geschrieben, und `advanceCrossMaturation` wird **ausschließlich** aus dem `GAME_OVER`-Handler von `GameView` gerufen. `App.tsx` ist ein `switch (screen)`-Router — es ist immer genau ein Screen gemountet. Daraus folgt zwingend:

1. Der Reifungszähler kann sich nicht erhöhen, während `Greenhouse` gemountet ist.
2. Jede Aussaat setzt `startedWave = totalWavesSurvived` und `neededWaves = wavesToUnlockFor(crossIndex) ≥ 2`, ist also unmittelbar nach dem Aussäen **nie** reif.
3. Der einzige Moment, in dem eine Kreuzung reif wird, ist `GAME_OVER` — und in genau diesem Moment (a) wird `Greenhouse` nicht gerendert, sodass `lastRoll` (React-State) verloren ist, und (b) hat `advanceCrossMaturation` den Eintrag vor diesem Arbeitsgang **aus der Queue gelöscht und seinen Seed verworfen**.

Ergebnis: „Behalten" ist im ausgelieferten Zustand **nicht auslösbar** — der Reifungsschritt zerstörte genau das, was er reifen ließ. Die Reifungs-Queue enthält außerdem keine Beanspruchungs-Oberfläche; der deterministisch gespeicherte `PendingCross.seed` ist damit toter Zustand. Mit B14.4 ist das **Datenverwerfen** behoben (gereifte Einträge bleiben erhalten), die **Erreichbarkeit** bleibt offen → B15.

### A13.13 DEFECT (verifiziert) — `rollGachaCross` hängt von der Reihenfolge der Besitzliste ab

`rollGachaCross` bildet `indexed = owned.map((v, i) => …)` und zieht Eltern über `rng.pickWeighted(indexed, …)` — also **positionsabhängig**. `owned` stammt aus `Object.keys(meta.variantCounts)` (Einfüge-Reihenfolge) und ändert sich, sobald Eltern verbraucht werden. Der Kommentar „Kind ist bei Aussaat schon deterministisch fest" gilt daher nur, solange die Besitzliste byte-identisch ist: allein aus `PendingCross.seed` ist das Kind **nicht** reproduzierbar. Für die Queue-Beanspruchung (B15) ist das blockierend, weil sie das Kind aus dem Seed rekonstruieren muss. Fix: kanonische Sortierung der Besitzliste (z. B. nach `id`) **vor** dem Gewichten — dann hängt der Wurf nur noch von Seed und Besitz-**Menge** ab.

**Reproduktion:** `resolveBreedTargets`-Reihenfolge vs. Seed — als Gate in B15.4 zu fixieren (nicht in diesem Durchgang, da es bestehende Wurf-Ergebnisse verändert und damit Balancing berührt).

### A14. DEFECT (verifiziert) — die berechnete Route wird nie gezeichnet

Befundkette, jede Stufe im Code gelesen:

1. Das Map-Grid wird zu einer Route verrechnet; `SimulationRoot` ruft `EnemySystem.setRoute(route)` bei `START_WAVE`.
2. `EnemySystem.activePath()` = `this.route ?? ENEMY_PATH` — die Gegner laufen also tatsächlich die **berechnete** Route.
3. `Renderer.prepareTerrain(seed)` backt `bakeTerrain(seed)` und **nur** bei Seed-Wechsel neu (`if (this.terrainSeed === seed) return`) — laut Dateiheader bewusst „EINMAL pro Seed gebacken".
4. `layers/terrain.ts`, `drawPath()`, liest **ausschließlich** `ENEMY_PATH`: statisch, ohne Parameter, ohne Routen-Bezug; die Verzierung stammt aus dem `visual`-Namespace.
5. `EnemySystem.getRoute()` trägt den Kommentar „Renderer zeigt die Route — read-only", hat aber **null** Aufrufer in `src/render/` — die einzigen Aufrufer liegen in `src/simulation/map.test.ts`.

Ergebnis: **Umleiten ist unsichtbar.** Wer mit `path`-Kacheln umleitet, sieht weiter die Default-Serpentine, während die Gegner auf einer anderen Bahn laufen — das Feature wird berechnet, aber nicht dargestellt. Aussage (5) ist zusätzlich eine Behauptung über einen Konsumenten, den es nicht gibt (dieselbe Klasse wie A13.7: ein Kommentar, den niemand prüft).

Belege: `src/render/layers/terrain.ts:171-232`, `src/render/renderer.ts:77-81`, `src/simulation/enemySystem.ts:30-47`. Warum kein Test anschlug: `map.test.ts` prüft die Route **im Modell**, nicht im Bild — deshalb blieb es grün.

### A15. INCOMPLETE (verifiziert, gemessen) — Genom-Mutation: drei Achsen, ein falsches Nein

Frage: Gibt es in `crossGenomes` überhaupt Mutation oder nur Rekombination? Antwort, per Gate über 200 deterministische Seeds gemessen (`src/genome/cross.test.ts`) — **Mutation existiert, auf drei Achsen:**

1. **Fremdgen** (p = 0.15 je Slot): ein Gen aus `GENE_POOL`, das in **keinem** Elternteil liegt, mit frischer Stärke 0.1–0.7.
2. **Stärke-Jitter:** `blend = 0.5 ± 0.15` gegen die Eltern, danach `±0.05` Rauschen, auf 0..1 geklemmt — Stärken werden neu gewürfelt, nicht kopiert.
3. **Dominanz-Drift:** `dominant ? rng.next() > 0.2 : rng.next() < 0.3` — dominant → rezessiv mit p = 0.2, rezessiv → dominant mit p = 0.3.

**Was daran trotzdem geschlossen ist:** Fremdgene stammen aus `GENE_POOL` (hartcodiert in `genome/pool.ts`, 15 Einträge), und ihre Dominanz ist ein **Pool-Attribut** — kein Mutationsergebnis. Mutation erfindet also kein neues Gen, sie reshuffelt die 15 mit neuen Stärken. „Unendlich viele Basen" ist derzeit auf der **Stärkeachse offen** und auf der **Allelachse geschlossen**. Das ist gute Nachricht und Grenze zugleich: das Modell ist bereits „endlich viele Allele, unendlich viele Kombinationen" — nur der **Eingang** ist ein Dreier-Menü (`PLANTS_SOURCE`: sprout/rootwall/mycelia, je 2 Gene = 6 Allele im Umlauf).

**Positionskopplung statt Genkopplung.** `cross.ts` paart `a[i % a.length]` gegen `b[i % b.length]` — nach Array-**Index**, nicht nach Gen-ID. Bei 2+2 Genen heißt das: `rapid` konkurriert immer mit `shield`, `pierce` immer mit `thorns`. Bei ungleichen Längen wrappt `%` und paart beliebige Gene. Deshalb fühlt sich der Genpool trotz Mutation schnell erschöpft an: praktisch sind es 2 Slots × 3 Basen, nicht 15 Allele.

**Der stärkste Mechanismus ist unbemerkt.** Die Dedup-Stufe (`seen`, Behalten bei `g.power > existing.power`) sichert je Gen-ID das **stärkere** Gen — zusammen mit Blend und Jitter ist das die eigentliche „stärker"-Mechanik des Spiels. Sie funktioniert, war aber nirgends benannt und ungetestet, bis dieses Gate entstand.

**Korrektur an meiner eigenen ersten Messung (Protokollpflicht):** Der erste Dominanz-Test benutzte Sprout + Rootwall als Eltern — beide tragen ausschließlich **dominante** Gene. „Dominanz kann entstehen" ist mit diesem Paar strukturell unmöglich; der Test schlug fehl, ohne dass der Code defekt war. Korrigiert wurde nicht der Code, sondern das Kriterium (Gewinn-Messung gegen Sprout + Mycelia, die einzige Basis mit rezessiven Genen). Das steht hier, damit dieser Fehlschlag niemandem später als Bug-Beweis dient.

### A16. DEFECT (verifiziert, behoben) — Encoding-Fossil: Mojibake als literale Zeichen

`src/components/Codex.tsx` enthielt `ðŸ§¬`, `âœ"`, `â€"`, `lÃ¤dt`. Das war **kein Laufzeit-Artefakt**: Die Zeichen standen wörtlich doppelkodiert in der Datei (UTF-8, einmal als Windows-1252 gelesen und wieder als UTF-8 gespeichert — das Muster eines Shell-Schreibvorgangs ohne UTF-8-Encoding). Repo-weites `git grep` nach den Mojibake-Sequenzen: betroffen war **genau diese eine** Datei.

Warum es überlebte: Die Verifikation prüfte Zeilenenden („CRLF durchgehend erhalten") — aber nie die Kodierung. Ein intaktes Zeilenende über einem zerstörten Zeichen sieht in jedem Diff unauffällig aus.

Behoben: byte-genaue Rückkodierung CP1252 → UTF-8, BOM und CRLF erhalten, 0 × U+FFFD, Umlaute/Emoji/✕/— verifiziert, `tsc` clean. Prävention: Gate `src/encoding.test.ts` (verbietet U+FFFD und die Mojibake-Sequenzen in allen `src/**/*.ts(x)`) + `.editorconfig` (`charset = utf-8`).

### A18. DEFECT-Klasse (verifiziert) — fail-open-Geschwister des B14-Fehlers

Ausgangspunkt war ein externes Review von `d06afa4`; jeder Punkt wurde gegen den Code geprüft, bevor er galt — zwei Behauptungen des Reviews waren falsch und sind hier **widerlegt** (A18.7).

### A18.1 DEFECT (behoben) — `claimBrood` war fail-open

`rolled[chosenIndex] ?? rolled[0]` wählte bei ungültigem Kandidaten-Index stillschweigend 0; die Reife wurde ausschließlich in der UI über `readyBroods` geprüft — eine Gameplay-Entscheidung in der Komponente (Verbotspunkt 3). Jetzt: Reifeprüfung **in** `claimBrood` (`isMatured`), unbekannter Kandidat ⇒ unverändert, unbekannter `broodIndex` ⇒ unverändert. Alle drei Pfade test-gelockt (`identity.test.ts`).

### A18.2 DEFECT (behoben) — `keepCross` war über den optionalen Index umgehbar

Schlimmer als im Review: der Bypass war **als Vertrag test-gelockt** (`identity.test.ts`, „kommt ohne crossIndex aus (Rückwärtskompatibilität des Aufrufs)"). Der Kommentar an `keepCross` nannte die Ausbuchung den EINZIGEN Ort, an dem die Queue schrumpft — der Ort war aber freiwillig. Jetzt: `crossIndex` verpflichtend, Reifeprüfung **in** `keepCross` vor jedem Verbrauch (fail-closed); der alte Test ist invertiert und beweist jetzt das Gegenteil.

### A18.3 DEFECT (behoben) — Kappung hinterließ hängende Referenzen

`applyRegisterVariant` kappte `savedVariants` auf 60 und löschte die `variantCounts` der Verdrängten — aber nicht deren `bredStats` (unbegrenztes Wachstum) und nicht ihren `loadout`-Eintrag (Phantom-Referenzen). Jetzt räumt die Kappung alle drei mit. **Nicht behoben und bewusst offen (Design-Entscheidung, Spielerebene):** dass überhaupt gekappt wird, während die Discovery-Chain „erste Entdeckung ist für immer" verspricht — die Chain lebt in ihrem eigenen Store (`discovery/codex.ts`, `CODEX_KEY`) und ist davon unberührt, aber das Inventar wirft die älteste Züchtung weg, ohne den Spieler zu fragen. Entweder Bestand kappen statt Identität, oder der Spieler entscheidet.

### A18.4 DEFECT (behoben) — Persistenz: Downgrade überschrieb still das neuere Save

`env.v > opts.version` kehrte in **beiden** Backends still zum Fallback zurück; das nächste `save()` hätte das neuere Save überschrieben. Jetzt: Quarantäne statt stiller Verwerfen (Rohdaten bleiben unter `<key>.corrupt` erhalten). Dabei gleich zwei Review-Punkte mitgenommen: die Envelope-Validierung existierte doppelt (`load`/`idbGet`, ~15 Zeilen je Stelle) und lebt jetzt einmal in `validateEnvelope`; die Version-Differenz folgt einer Regel in `resolveVersion` (unter uns ⇒ migrieren, über uns ⇒ Quarantäne). `storage.ts` ist dadurch **geschrumpft** (192 → 190 LOC), ohne den Cap anzufassen. Der unbenutzte Grabstein-Export `STORAGE_CHECKSUM_SEP` ist entfernt; der IDB-Name `lifegamelab` ist als bewusstes Legacy dokumentiert (Umbenennung würde Run-Snapshots verwaisen).

### A18.5 INCOMPLETE — E2E-Geometrie ist gespiegelt, nicht geteilt

`tests/run.spec.ts` rechnet Zellmitten mit hartcodierten `GRID/PAD/+8` nach; der Kommentar sagt ehrlich, dass der Test bei Renderer-Drift nichts mehr findet, ohne dass jemand weiß warum. Fix (B16-Auftrag): `Renderer.metrics()` ans DevGate hängen (`CELL/OX/OY` als Werte), dann liest der Test die Wahrheit statt einer Kopie. Die `waitForTimeout`-Sleeps sind bekannte Flaky-Kandidaten, solange die Suite lokal grün läuft.

### A18.6 DEFECT (behoben) — das Reife-Kriterium existierte zweimal

`isCrossReady` (Pflanzen) und `readyBroods` (Käfer) duplizierten dieselbe Arithmetik. Jetzt: `isMatured(startedWave, neededWaves, total)` ist DAS Kriterium, beide Gates rufen es.

### A18.7 WIDERLEGT — zwei Review-Behauptungen, die der Code nicht trägt

1. **„`recordRunEnd()` wird nicht aufgerufen"** — falsch: `GameView.tsx:162` ruft es event-getrieben im `GAME_OVER`-Handler (`e.payload.wave`, genau die B15.2-Vorbereitung).
2. **„`applyRegisterVariant` bricht die Discovery-Chain"** — falsch: die Chain lebt in einem eigenen Store (`discovery/codex.ts`, `CODEX_KEY`, append-only, hash-verkettet) und ist von der Inventar-Kappung unberührt. Der echte, getrennte Befund ist A18.3.

Zusätzlich verkannt: die Migrationskette in `store.ts` ist bewusst **Normalisierung** (`toCurrent(defaultMeta(), old)` aus jeder Version 1–4), kein `while`-Loop nötig — das reale Persistenzproblem war der Downgrade-Pfad (A18.4). Lehre: Ein Review, das Existenz statt Nutzung prüft, produziert dieselbe Fehlerklasse, die es anprangert.

### A19. DEFECT (verifiziert an Code **und** Live-Save) — die Meta-Wahrheit lag im React-State, nicht in der Persistenz

Spielbericht: „keine Runde bringt was, die States werden nur für die erste Runde getrackt und Samen keimen nicht." Jeder Punkt wurde gegen den Code und gegen den echten Browser-Save geprüft (`localStorage['lifegamelab_meta']`).

**A19.1 — Der Run-Start schrieb eine veraltete Kopie zurück. FIXED (B17.1).**
`App.tsx:handleStartRun` reservierte die `runId` auf dem React-State des Routers und persistierte diesen State: `persistMeta(reserveRunId(meta))`. Während eines Runs schreibt die Simulation aber **direkt** in die Persistenz (`advanceCrossMaturation` je überstandener Welle), ohne den Router zu informieren. Die Kopie war damit älter als die Wahrheit — und überschrieb sie bei jedem Run-Start. Beleg im Live-Save: `runId: 3` bei `runs: 2`; Beleg im Gate: `b17.test.ts` (B17.1 überlebt, B17.2 dokumentiert die alte Form als Verlust). Fix: `meta/run.ts:beginRun()` reserviert auf `loadMeta()`.

**A19.2 — Das Menü zeigte nach dem Run die Kopie statt der Wahrheit. FIXED (B17.1).**
`handleExitRun` wechselte nur den Screen. Das Gewächshaus rechnete danach mit dem `totalWavesSurvived` von **vor** dem Run — und schrieb beim Säen genau diesen Wert als `startedWave` in die Kreuzung. Fix: beim Verlassen frisch lesen.

**A19.3 — Kreuzungen mit `startedWave` in der Zukunft reifen nie. FIXED (B17.3).**
Aus A19.2/​A19.1 kombiniert entstanden Einträge mit `startedWave > totalWavesSurvived`. Das Reife-Kriterium ist `total - started >= needed` — bei negativem Wertebereich ist die Kreuzung **garantiert** unreif, dauerhaft. Das ist das exakte Bild „Samen keimen nicht". Fix: `store.ts:healRipeness` bei **jedem** Load, nicht nur im Migrationspfad — die Storage-Schicht reicht Saves der aktuellen Version unverändert durch, eine Heilung nur im Migrationszweig liefe für genau die Saves nie, die sie brauchen. Sie ist idempotent, konservativ (kein Gratis-Fortschritt: der Eintrag beginnt ab jetzt zu warten) und gilt über dasselbe Kriterium auch für Bruten.

**A19.4 — OFFEN: Woher kommt eine neue Pflanze? (Design-Entscheidung)**
Der Live-Save zeigt `variantCounts: { sprout: 0, rootwall: 0, cross_p0pn4p_0: 1 }` — genau **eine** besessene Pflanze. `MainMenu` sperrt das Gewächshaus bei `ownedVariants.length < 2`, `Greenhouse.canSow` verlangt dasselbe. Ein einziger `keepCross` verbraucht die beiden Start-Pflanzen (2→1, test-gelockter Vertrag in `keep.test.ts`) — und es gibt **keinen Weg zurück**: der Shop verkauft Samen, aber ein Samen wird zum Kreuzungs-Ticket, nicht zum Bestand (`registerVariant` hat keinen Aufrufer).
Folge: Nach der ersten erfolgreichen Kreuzung ist die Zucht dauerhaft tot, unabhängig davon, wie viele Runden gespielt werden — genau das gemeldete „keine Runde bringt was". Die Start-Pflanzen sind laut Source (`economy.source.ts`: „genau 2 Pflanzen zu Beginn") der Anfangsbestand; dass der erste Keep diesen Bestand unter die eigene Startregel drückt, ist kein Gleichgewicht, sondern eine Sackgasse.

**A19.5 — OFFEN: Was zählt als Reifungs-Fortschritt? (Design-Entscheidung)**
Die Reifung hängt an **überstandenen** Wellen (B15.2). Wer mit zwei Pflanzen in Welle 1 stirbt, bekommt nichts. Vor B15.2 zählte der Run-Tod die erreichte Welle (+1 pro Runde) — das war faktisch die einzige Fortschrittsquelle im aktuellen Schwierigkeitsgrad. Die strengere Kopplung war als Korrektur richtig (der Zähler soll nicht am Tod hängen), aber als einzige Quelle macht sie „jede Runde bringt etwas" unmöglich.

**A19.6 — DEFECT (verifiziert): das Loadout ist nicht bedienbar — gezüchtete Pflanzen erreichen den Run nie.**
`toggleLoadout` (der einzige Writer des Loadouts) hat in `src/` **keinen Aufrufer**; `MainMenu:97` rendert unter der Überschrift `t('menu.loadout')` („LOADOUT (n)") die **Sammlung** (`ownedVariants`), nicht den Loadout. Folge: `meta.loadout` bleibt dauerhaft leer, `root.ts` startet jeden Run mit `STARTING_INVENTORY` (1 Sprout + 1 Rootwall) — `for (const id of loadout) inventory[id] = 2` läuft nie —, und `savedVariants.filter(v => loadout.includes(v.id))` liefert immer eine leere Liste, sodass auch die aufgelösten Visuals der gezüchteten Pflanzen den Run nie erreichen.
Damit ist der einzige Ort, an dem Zucht spielbar wird, unerreichbar: **jede Runde ist identisch**, egal wie viel gezüchtet wurde. Das ist der stärkste Beleg für die Meldung „keine Runde bringt was" — stärker als jede Zählerfrage. Vom E2E nicht auffindbar: `router.spec.ts` prüft nur, dass der Text `/LOADOUT/i` sichtbar ist (und der ist sichtbar — nur ohne Bedeutung).


### A17. DEFECT (verifiziert, in der Release-Fläche sichtbar) — der Codex-Screen ist halb übersetzt

Gefunden bei der Sichtprüfung, nicht in der Simulation: Mit Sprache **English** steht auf dem Codex-Screen „No discoveries yet. Breed the first one!" direkt neben **„0 Entdeckungen"**, und der Erklärkasten ist vollständig deutsch („Seeds sind Zahlen — jede geteilte Zeile … lädt exakt dieselbe Pflanze. Verifikation = deterministischer RNG, kein externer Konsens.").

`src/components/Codex.tsx` schreibt diese Texte als **Literale in die Komponente**, statt sie über die i18n-Schicht zu ziehen — obwohl dieselbe Schicht für genau diesen Screen bereits einen Schlüssel führt (`codex.empty`, `src/i18n/translations.ts:75`). Das Muster existiert also, es wurde nur nicht durchgehalten. Ein gemischtsprachiger Screen ist kein Geschmacksurteil, sondern ein Oberflächen-Defekt, und er ist im Screenshot reproduzierbar.

**Warum kein Gate das fand:** Die Tests prüfen Verhalten (Router, Platzierung, Ticks), nicht die Sprache der Ausgabe. Genau darum steht in `AGENTS.md` die Sichtprüfung als eigene Stufe vor dem E2E — sie ist hier die einzige Instanz, die den Defekt sehen konnte.

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
9. **Kästchenblock-CGI („Papier trifft CGI", bindend — Manifest: `../architecture/papier-trifft-cgi.md`, Styleframe: `../art/styleframe.html` — das Styleframe liegt bewusst außerhalb des Tracks, siehe A13.4):** Bühne = Schul-Mathe-Collageblock (blaues Raster exakt auf `CELL_SIZE`, Blockrand + Lochung, Bleistift-Kritzeleien Alpha ≈ 0.09, Collage-Fetzen/Klebestreifen — alles gebacken, `visual`-Namespace). Kachel = EIN rastersynchroner Kasten; Inhalte (pot/boulder/decor/path) wohnen im Kasten. Pflanzen/Käfer = CGI-Kontrast (2-Stopp-Verlauf + Specular oben-links + 2.5-px-Ink-Kontur) auf matten Papier. **Skala ist Genom-Aussage:** `ResolvedVisual.scale` = 0.85 + strength·0.3 ± 0.05, geklemmt 0.85–1.25, strength = Ø Gene-Power — deterministisch, test-locked (generator.test.ts).
10. **Screen-System (bindend):** JEDER Menübereich ist ein eigener Top-Level-Screen (`App.tsx`-Router: start | menu | greenhouse | seedshop | beetlelab | codex | run) mit Papier-Übergang (`ScreenTransition`, `prefers-reduced-motion` = harter Schnitt) und Indikatoren für alles (`NavIndicators`: Notizzettel-Tabs mit `aria-current`, Status-Chips Nektar/Samen/Sammlung/bestes Wave/Brutling, Page-Dots). Keine Modal-Verschachtelung mehr.

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

## B14. Lifecycle-Identität, Snapshot-Budget & Reife-Gates (Auftrag aus A13)

Ziel: **jede Entitäts-Identität ist monoton und global eindeutig; jedes Gate ist fail-closed; jede Wahrheit hat genau eine Ableitung.**

### B14.1 Monotoner Brut-Zähler statt Fenster-Maximum

`MetaSave` erhält `broodGeneration: number` (monoton, persistiert). `enqueueBrood` liest `broodGeneration` als `broodIndex` und schreibt `+1` im **selben** `updateMeta`-Schritt. `rollBrood(A, B, generation)` bekommt genau diesen Wert — Vorschau und Enqueue leiten ihn aus derselben Quelle ab (A13.1, A13.2). Kein `reduce`/`Math.max` über `pendingBroods` mehr, auch nicht in `BeetleLab.tsx`.

### B14.2 Migration v4 → v5 (kein Identitätsverlust, keine Doppelkennung)

Altsaves setzen `broodGeneration = max(pendingBroods[].broodIndex, beetles[].generation) + 1` (untere Schranke 0). Damit kann ein nach der Migration erzeugter Brutling keine bestehende Kennung wiederverwenden. `META_VERSION` → 5; `migrate` akzeptiert 1–4; `toV3` wird zu `toCurrent` (kein zweiter Migrationspfad).

### B14.3 Identitäts-Gate (Regressionstest)

Gate: Nach `claimBrood` und erneuter Paarung **derselben** Eltern darf keine `BeetleSpecimen.id` doppelt in `meta.beetles` liegen und kein `broodIndex` doppelt in `meta.pendingBroods`. Der Ist-Zustands-Beweis `src/meta/brood-gap.test.ts` wird in den Soll-Zustand gedreht (Test bleibt, Erwartung invertiert).

### B14.4 Ein Reife-Gate, fail-closed

Genau **eine** Ableitung „ist diese Kreuzung/Brut reif": `meta/` exportiert `isCrossReady(meta, crossIndex)` und `readyBroods(meta)`; UI liest nur. Unbekannter `crossIndex` ⇒ **nicht** reif (A13.4). `advanceCrossMaturation` verliert den ungenutzten `number[]`-Rückgabewert (A13.7).

### B14.5 Symmetrische Atomarität für `keepCross`

`keepCross` führt Elternverbrauch, Kind-Registrierung und `bredStats`-Ableitung in **einem** load→mutate→persist-Zyklus aus (Muster von `consumeSeedAndEnqueueCross`) — kein Zustand „Eltern verbraucht, Kind fehlt" (A13.6).

### B14.6 Inhalts-Integrität statt Darstellungs-Integrität

Die Checksumme in `persistence/storage.ts` wird **kanonisch** gebildet (stabile Key-Sortierung vor dem Hash), sodass Umsortierungen von Keys gültige Saves nicht quarantänisieren. Bestehende Saves bleiben lesbar (Checksumme wird beim nächsten Schreiben kanonisiert) (A13.5).

### B14.7 Snapshot-Budget

`getSnapshot()` bleibt die defensive Kopie, aber der 10-Hz-HUD-Pfad in `GameView` klont nicht mehr den vollen `SimState`: entweder gedrosseltes Intervall oder eine flache HUD-Projektion (Wave/Energie/Leben/Combo/Inventar/Phase). Gemessen gegen B12 (frame ≤ 16 ms, 390×844) (A13.8).

### B14.8 DoD für B14 — **erfüllt (B14.1–B14.6)**

- [x] `broodGeneration` in `MetaSave` v5 + Migration v1–v4 getestet (Altsave ohne Feld ⇒ Startwert = höchste vergebene Kennung + 1)
- [x] Keine Identitäts-Ableitung aus `max`/`length`/`last` eines Fensters (Gate-Test B14.3 grün)
- [x] `BeetleLab` liest den Zähler, leitet ihn nicht selbst ab
- [x] `isCrossReady` fail-closed + genau ein Gate-Aufrufpfad (`Greenhouse`)
- [x] `keepCross` ein Persistenzschritt; Test: fehlender Elternteil lässt Eltern **und** Queue unangetastet
- [x] Kanonische Checksumme: umsortierte Keys ⇒ **kein** Quarantäne; echter Inhalts-Betrug ⇒ weiterhin Quarantäne
- [x] `tsc` clean, Suite grün (**170 Tests, 20 Dateien**), `vite build` grün
- [x] Keine LOC-Cap-Verletzung (`meta/store.ts`, `meta/run.ts`, `meta/economy.ts` ≤ 200; `persistence/storage.ts` ≤ 250 lt. Dateiheader)

**Nicht in B14 enthalten:** B14.7 (Snapshot-Budget) bleibt offen und ist als Messauftrag klassifiziert — er gehört zu B12, nicht zur Korrektheits-Schiene.

## B15. Zucht-Schleife erreichbar machen (Auftrag aus A13.12/A13.13) — **UMGESETZT (2026-09-15)**

Ziel: „Aussäen → reifen → behalten" wird tatsächlich spielbar, und das Kind ist aus dem gespeicherten Seed **reproduzierbar**.

### B15.1 Beanspruchung aus der Reifungs-Queue

Jeder gereifte `PendingCross` bietet in `Greenhouse` seine Beanspruchung an. Das Kind wird ausschließlich aus den persistierten Feldern rekonstruiert (`rollGachaCross(owned, entry.seed, entry.crossIndex)`) — kein React-State über den Screen-Wechsel hinweg. Die Queue-Zeile zeigt bei Reife Kind + Beanspruchen-Knopf, sonst die **verbleibenden** Wellen.

### B15.2 Reifung an Wellen koppeln, nicht an den Run-Tod

Der Reifungszähler darf nicht allein an `GAME_OVER` hängen (A13.12). Kandidat: `waveSystem` meldet `WAVE_COMPLETED`, `GameView` bündelt den Zähler-Fortschritt gedrosselt (nie pro Frame, nie im RAF-HUD-Pfad) und schreibt ihn **einmal** beim Run-Ende plus optional beim Wellenwechsel. Kein zweiter Writer auf `totalWavesSurvived`.

### B15.3 Ehrliche Anzeige

Die Reifungs-Zeile nennt verbleibende Wellen (nicht die Gesamtanforderung) und markiert gereifte Einträge sichtbar. Keine stillen Verluste: was in der Queue steht, ist beanspruchbar.

### B15.4 Reihenfolge-Unabhängigkeit des Wurfs (A13.13)

Die Besitzliste wird **kanonisch sortiert**, bevor sie gewichtet wird — der Wurf hängt dann nur von Seed und Besitz-**Menge** ab. Gate-Test: derselbe Seed + dieselbe Besitz-Menge in unterschiedlicher Array-Reihenfolge ⇒ identisches Kind. Dieser Fix ändert bestehende Wurf-Ergebnisse (Balancing) und wird deshalb bewusst separat ausgerollt.

### B15.5 DoD für B15 — **erfüllt (2026-09-15)**

- [x] Aussäen → Welle(n) → Beanspruchen ist in einem Score-Durchlauf **ohne** Screen-Wechsel-Verlust möglich (Reifung tickt pro Welle, Queue-Zeile zeigt das Kind + Beanspruchen-Knopf)
- [x] Gate-Test: Rekonstruktion des Kindes aus `PendingCross.seed` == beim Aussäen angezeigtes Kind (`src/meta/b15.test.ts`)
- [x] Gate-Test B15.4 (Reihenfolge-Unabhängigkeit) grün — inkl. Gegenprobe, die den alten positionsabhängigen Pfad widerlegt
- [x] Kein Eintrag verschwindet aus der Queue, ohne beansprucht worden zu sein (Ausbuchung ausschließlich in `keepCross`)
- [x] 390×844 geprüft (E2E-Suite grün; Queue-Zeile + Knopf im bestehenden Layout, kein Hover-Zwang)
- [x] `tsc` clean, Suite grün (198/198), `vite build` grün

**Ehrliche Grenze (dokumentiert, nicht defekt):** B15.4 garantiert Reihenfolge-Unabhängigkeit — **nicht** Bestandsunabhängigkeit. Die Rekonstruktion nutzt die jetzige Besitz-Menge; wird ein Elternteil zwischen Aussaat und Reife verbraucht, kann der Wurf anders ausfallen. Die Queue-Zeile zeigt dann ehrlich „Eltern weg" statt eines falschen Kindes. Der Persistenz-Seed garantiert das Kind bei unveränderter Besitz-Menge.

## B16. Route sichtbar machen & Genom-Modell schärfen (Auftrag aus A14/A15/A16)

### B16.1 Die aktive Route muss gezeichnet werden (aus A14) — **UMGESETZT (2026-09-16)**

Der Terrain-Layer erhält die **aktive** Route (als Provider/Getter, nicht als Zustandskopie), und `drawPath` liest sie statt `ENEMY_PATH`. Re-Bake **nur** bei Routen- oder Seed-Wechsel, niemals pro Frame (B12: frame ≤ 16 ms). `getRoute()` bekommt einen echten Konsumenten oder fällt ganz; der Kommentar in `enemySystem.ts` wird richtiggestellt. Gate-Test auf den **Vertrag** („der Renderer erhält genau die aktive Route"), nicht auf Canvas-Pixel.

**Umsetzung:** Die Route hat **eine** Wahrheit: `SimState.currentRoute` (Writer: `SimulationRoot.recomputeRoute`, nur bei `START_WAVE`). Die Auflösung `null ⇒ ENEMY_PATH` lebt **einmal** als `resolveActiveRoute` in `world.source.ts`; Sim (`EnemySystem.activePath(state)`), Renderer und Terrain-Bake lesen denselben Ausdruck — keine Kopie, kein eigener Fallback mehr (A14: drei Tode derselben Wahrheit). `setRoute`/`getRoute` sind gelöscht; `prepareTerrain` ist gestorben — der Bake hängt an (Seed, aktive Route) mit Cache-Schlüssel `seed|waypoints` (Re-Bake nur bei Schlüssel-Wechsel, nie pro Frame). `currentRoute` ist Resume-kontrakt-konform bewusst `null` (kein persistiertes Schema-Feld nötig). Gates: `map.test.ts` liest die Route aus dem **Snapshot** (public contract, kein System-Feld-Griff mehr) und lockt die Render-Parität („EnemySystem liest dieselbe Auflösung wie der Renderer"); `sources.test.ts` lockt den Resolver (null ⇒ ENEMY_PATH-Referenz, gültige Route unverändert).

### B16.2 Paarung entscheiden: Slot oder Gen (aus A15)

Entweder Paarung nach Gen-**ID** (Alignment über die Allelmenge) oder die Slot-Semantik wird explizit als Design dokumentiert. Beides verändert Wurf-Ergebnisse und damit Balancing ⇒ separat ausrollen, wie B15.4.

### B16.3 Allelmenge öffnen („unendlich viele Basen")

`PLANTS_SOURCE` bleibt die Definition der **Allele** (was ein Gen kann, kostet, rendert); ein Samen erhält einen Index, und `deriveSeed(GAME_SEED, 'seed', index)` zieht Rolle + 3–5 Gene mit Stärke und Dominanz deterministisch. `createBaseVariants()` wird damit eine Schleife um dieselbe Config statt einer Drei-Einträge-Liste — die Discovery-Chain funktioniert dafür bereits heute. Gate: gleicher Index ⇒ identisches Genom, verschiedene Indizes ⇒ verschiedene Genome.

### B16.4 Zwei Stream-Verschmutzungen beheben (aus dem Review, verifiziert)

- `generateCrossResults` zieht `rng.next()` für `probability`, **nachdem** das Kind fertig ist — und **niemand** liest den Wert (nur die Typdeklaration in `types.ts`). Er liegt aber im Gameplay-Strom: Kandidat *i+1* hängt von ihm ab. Ein Anzeigewert gehört nicht in den Gameplay-Strom.
- `generateName` zieht Präfix/Suffix aus **demselben** Strom wie `crossGenomes`. Damit verschiebt jede Änderung an `names.source` — Präsentationsdaten — alle nachfolgenden Genome und damit jeden `lifeseed:`-Hash der Discovery-Chain.

Fix: Namens- und Anzeige-Zufall in den `visual`-Namespace (eigener, abgeleiteter Stream). Verändert bestehende Ergebnisse ⇒ versioniert ausrollen.

### B16.5 `generation` ist zwei Dinge

In `rollGachaCross` wird `generation: crossIndex` gesetzt, in `generateCrossResults` ist `generation` der Parameter (Stamm-Generation). Ein Feld, zwei Bedeutungen — wer das später „vereinheitlicht", ändert die IDs gespeicherter Kreuzungen. Entweder umbenennen oder die Doppelbedeutung im Typ dokumentieren.

### B16.6 DoD für B16

- [x] Renderer zeichnet die aktive Route (A14); Re-Bake nur bei Routen-/Seed-Wechsel — **UMGESETZT (2026-09-16)**
- [x] `getRoute()` hat einen Konsumenten oder existiert nicht mehr; Kommentar richtiggestellt — **existiert nicht mehr**
- [x] Gate: Route-Vertrag grün, kein Frame-Rebake (B12-Messung bleibt grün) — `map.test.ts` (State-Vertrag + Render-Parität), `sources.test.ts` (Resolver)
- [ ] Entscheidung B16.2 dokumentiert und umgesetzt
- [ ] Gate: Anzeige-/Namenszufall außerhalb des Gameplay-Stroms; Discovery-Hashes stabil
- [ ] Gate: gleicher Samen-Index ⇒ identisches Genom (B16.3)
- [ ] `tsc` clean, Suite grün, `vite build` grün

### B16.7 Sprache der Release-Fläche (aus A17)

Die drei Literale in `Codex.tsx` wandern in die i18n-Schicht (de + en) — die Schlüssel für diesen Screen existieren bereits. Kein Radikalschnitt über alle Komponenten: Der Bestand an hardcodierten deutschen Literalen in `src/components/*.tsx` wird **gezählt und als Obergrenze verankert** (Ratchet) — die Zahl darf sinken, nicht steigen. Sichtprüfung beider Sprachen bei 390×844, weil Sprache kein Testfall ist.

### B16.8 Kappungs-Politik — **ENTSCHIEDEN (2026-09-15): Identität ist unverletzlich**

Entscheidung: `savedVariants` und `beetles` werden **nicht gekappt** — weder still noch per Spieler-Wahl. Begründung, jede Stufe im Code belegt:

1. Die Bibliothek wächst ausschließlich durch `keepCross`, und `keepCross` verbraucht je 1× beider Eltern (2→1-Regel) — der Bestand (`variantCounts`) ist bereits ökonomisch begrenzt: Eine Pflanze der Generation n hat 2ⁿ Samen gekostet. Eine Kappung wäre eine zweite Bremse hinter einer bestehenden.
2. Identität zu kappen bricht das Discovery-Chain-Versprechen („erste Entdeckung ist für immer"): Die Chain erinnert sich, das Inventar nicht — die Entdeckung wird zu totem Gewicht (nicht einsetzbar, nicht weiterzüchtbar).
3. Ein Brut-Cap hätte `beetleDeployed` (Meta-Referenz auf eine Specimen-ID) verwaisen können — dieselbe Fehlerklasse wie A18.3.

Das „Spieler-Entscheidung"-Modell wurde bewusst abgelehnt: Es baut UI für ein Problem, das die 2→1-Regel nicht hat. Kappung löst ein Wachstumsproblem, das ohne Kappung nicht existiert — sie kostet dafür Vertrauen.

**Umsetzung:** Die Hardcode-Caps (60/40, Verbotspunkt 6) sind aus `meta/run.ts` entfernt; das Miträum-Muster aus A18.3 bleibt als Regel dokumentiert, falls je wieder ein Cap eingeführt wird. **Invarianten sind test-gelockt** (`src/meta/capping.test.ts`, 5 Gates): kein Pfad verlässt einen Eintrag aus Bibliothek/Brut-Lager; jede Loadout-ID existiert; `bredStats` kennt keine Fremd-IDs; `beetleDeployed` verweist nie auf eine entfernte Specimen. Bringt jemand ein Cap zurück, schlagen diese Tests und erzwingen die Miträum-Pflicht.

**Offen (Mid-Term, Messschiene):** das reale Wachstum der Bibliothek messen — die 2ⁿ-Kostenkurve macht großes Wachstum unwahrscheinlich, aber gemessen statt behauptet wird es gegen B12 (Save-Größe / Snapshot-Budget).

### B16.9 E2E liest die Geometrie vom Renderer (aus A18.5)

`Renderer.metrics()` wird über das DevGate als Werte exportiert (`CELL/OX/OY`); `tests/run.spec.ts` liest sie, statt `GRID/PAD/+8` zu spiegeln. Danach überlebt ein Renderer-Refactor die Tests ohne stillen Tot.

---

## B17. Persistenz-Wahrheit & Bestandskreislauf (Auftrag aus A19)

### B17.1 Eine Wahrheit: persistiert wird nie eine Kopie — **UMGESETZT (2026-09-15)**

Jeder Meta-Schreibvorgang geht von `loadMeta()` aus; der Router hält keine schreibbare Kopie mehr.

- `meta/run.ts:beginRun()` reserviert die `runId` auf der persistierten Wahrheit und persistiert genau das. `App.tsx` ruft nur noch `setMeta(beginRun())`. (`persistMeta`/`reserveRunId` sind aus dem Router verschwunden.)
- `handleExitRun` liest beim Verlassen frisch — der Menü-Screen zeigt den echten Stand, nicht die Kopie von vor dem Run.
- Lock: `src/meta/b17.test.ts` — B17.1 (Fortschritt überlebt den Run-Start) **und** B17.2 als Gegenprobe, dass die alte Form ihn verliert.

### B17.2 Kein Eintrag darf in der Zukunft begonnen haben — **UMGESETZT (2026-09-15)**

`store.ts:healRipeness` hebt `startedWave` bei jedem Load auf `totalWavesSurvived` (`≤`, idempotent, konservativ). Gilt für `pendingCrosses` und `pendingBroods` über dasselbe Kriterium (A18.6). Lock: `b17.test.ts` B17.3.

### B17.3 Bestandsquelle entscheiden — **UMGESETZT (2026-09-15, Option A)**

Ein Samen ist heute ein Kreuzungs-Ticket, kein Bestand: `buySeed` → `seedStash` → `consumeSeedAndEnqueueCross`. Damit gibt es nach dem ersten Keep keinen Weg zu einer zweiten Pflanze (A19.4). Drei Ausgänge:

| Option | Wirkung | Preis |
|---|---|---|
| **A — Samen keimt zur Pflanze** | Ein gekaufter Samen wird Bestand (neue Basisklasse, deterministisch aus dem Samen-Index). Der Shop wird zur Bestandsquelle. | Neue Meta-Operation + UI; die „Reifung" verliert ihre Rolle als Bestandsquelle |
| **B — Basis-Arten sind Saatgut** | Die zwei Start-Pflanzen sind unerschöpflich (nie unter 1). | Ändert den test-gelockten Keep-Vertrag (Elternverbrauch gilt dann nur für gezüchtete Pflanzen) |
| **C — A und B** | Samen keimen **und** die Basis bleibt Saatgut. | Zwei Wege zum Bestand — muss begründet werden, sonst doppelte Wahrheit |

**Entscheidung: A, umgesetzt.** `buySeedAndGerminate(price, index)` ist **ein** atomarer Schritt (Nektar → Bestand, fail-closed ohne Nektar); der Shop ruft ihn direkt — der Umweg über ein bloßes Ticket (`seedStash`) im Kaufklick wäre ein Nektar-Drift gewesen (erster Klick zahlt, zweiter keimt gratis). Keim-Variante: `germinateVariant(index)` = Basisform aus `PLANTS_SOURCE` + Identität `seed_{index}` aus `deriveSeed(GAME_SEED,'plant','seed',index)` — derselbe Index ergibt weltweit dieselbe Pflanze. Die elteren `germinateSeed`/`buySeed` bleiben als Stash-Pfade erhalten (Gewächshaus). Locks: `src/meta/b18.test.ts` (End-to-End-Kauf, fail-closed, Determinismus, zwei Indizes ⇒ zwei Keime).

### B17.4 Fortschrittsregel der Reifung entscheiden — **UMGESETZT (2026-09-15, Option A)**

| Option | Wirkung |
|---|---|
| **A — angebrochene Welle** | Jede gestartete Welle zählt (+1). Tod in Welle 1 bringt genau 1. „Keine Runde bringt was" ist strukturell unmöglich. |
| **B — überstandene Welle** | Status quo (B15.2). Strikt und ehrlich, aber der Startzustand (2 Pflanzen) schafft Welle 1 oft nicht. |
| **C — erreichte Welle am Run-Ende** | Wie vor B15.2 (+Welle beim Tod). Belohnt weites Kommen, hängt aber wieder am Run-Tod. |

**Entscheidung: A, umgesetzt.** `GameView` koppelt `WAVE_STARTED → advanceCrossMaturation(1)` (ein Writer: `meta/economy.ts`); `recordRunEnd` zählt **keine** Wellen mehr (eine zweite Addition wäre Doppelzählung — das E2E-Gate „Tod in Welle 1 ⇒ Zähler genau +1" in `tests/run.spec.ts` lockt genau das gegen +0 und +2).

### B17.5 DoD für B17

- [x] Persistiert wird nie eine Kopie (B17.1) — lock: `b17.test.ts` B17.1/B17.2
- [x] Reifungs-Invarianten bei jedem Load (B17.2) — lock: `b17.test.ts` B17.3
- [x] Bestandsquelle entschieden und umgesetzt (B17.3, Option A) — lock: `b18.test.ts`
- [x] Fortschrittsregel entschieden und umgesetzt (B17.4, Option A) — lock: `tests/run.spec.ts` +1-Gate
- [x] `tsc` clean, Suite grün (214/214), E2E 11/11, Build grün

---

## B18. Loadout bedienbar machen — die Zucht muss im Run ankommen (Auftrag aus A19.6)

### B18.1 Sammlung und Loadout trennen

Der Menü-Abschnitt zeigt künftig **zwei** Dinge getrennt: den echten `meta.loadout` (Belegung „n/4", Kapazität aus `toggleLoadout`) und darunter die Sammlung (`variantCounts > 0`). Jede besessene, nicht mitgenommene Pflanze bekommt einen „Mitnehmen"-Schalter, jede mitgenommene einen „Ablegen"-Schalter. Die Überschrift darf nicht mehr lügen.

### B18.2 Der Run zeigt den Unterschied

Mit gefülltem Loadout greifen die bereits vorhandenen Pfade: `inventory[id] = 2` je Eintrag (`root.ts`), `resolveBredVisuals(savedVariants.filter(v => loadout.includes(v.id)))` für Silhouette/Farbe (`GameView`). Ein Kind muss sichtbar **anders** aussehen und spielen als eine Basis-Pflanze — sonst ist die Discovery-Chain Deko.

### B18.3 Gates

- `src/meta/b18.test.ts`: `toggleLoadout` rein/raus, Kapazität 4 (danach unverändert), kein Eintrag ohne Bestand, Persistenz in einem Schritt.
- E2E (lesend): Loadout-Änderung überlebt einen Reload; die Tray-Zahl im Run entspricht dem Loadout.
- Sichtprüfung (390×844 + Desktop): Sammlung und Loadout sind unterscheidbar — ein Screenshot, der beide Abschnitte zeigt.

### B18.4 DoD für B18

- [x] Überschrift und Inhalt des Loadout-Abschnitts stimmen überein (A19.6) — **umgesetzt**: zwei Abschnitte (Loadout n/4 mit Mitnehmen/Ablegen über `toggleLoadout`, darunter die Sammlung); Menü liest nach Run-Exit frisch (B17.1). Lock: `b18.test.ts`
- [ ] Eine gezüchtete Pflanze ist im Run platzierbar und visuell unterscheidbar (Verdrahtung steht: `root.ts` Inventar, `resolveBredVisuals`; Sichtbeweis offen)
- [x] `tsc` clean, Suite grün (214/214), E2E 11/11, Shinon-Gate offen (Enforcement)
