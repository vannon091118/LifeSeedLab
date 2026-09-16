# LifeSeedLab — Umsetzungsplan

Status: **verbindliche Arbeitsliste**  
Erstellt: 2026-09-14  
Grundlage: `AGENTS.md`, `../architecture/architecture-contract.md`, `../architecture/architecture.md`, `quality-spec.md`

## Ziel

Aus dem technisch tragfähigen Singleplayer-Prototyp wird schrittweise ein deterministisches, visuell eigenständiges und mobil nutzbares Spiel. Multiplayer wird zunächst nur durch saubere Command-/Snapshot-Grenzen vorbereitet; ein Netzwerk-Backend bleibt bis zum Abschluss der Core-Gates ausdrücklich zurückgestellt.

## Leitplanken

- Ein State-Slice hat genau einen Writer.
- `SOURCE + SEED + CLOCK + PLAYER COMMANDS` bleibt die einzige Gameplay-Wahrheit.
- Alle Zufälligkeit läuft über `src/core/rng.ts`; Präsentations-RNG bleibt vom Gameplay getrennt.
- Canvas, React und Observer schreiben niemals Gameplay-State.
- Content-Werte gehören in `src/config/*.source.ts`.
- Harte LOC-Caps aus dem Architekturvertrag werden eingehalten; bei Überschreitung wird gesplittet.
- Jede Phase endet mit Tests und Typecheck, bevor die nächste Phase beginnt.

## 0. Art Direction & Pipeline (verbindlich, vor jeder UI-Arbeit)

- Quelle: `../architecture/architecture.md` §3.1/§3.2 und `quality-spec.md` B0.
- Pipeline: `SOURCE → GENOME → TRAITS → GAMEPLAY PHENOTYPE → VISUAL PHENOTYPE → SIMULATION → EVENT → OBSERVER → RENDER` — Grafik besitzt keine zweite Wahrheit. `genomeToVisualInput()` ist die einzige Genome→Visual-Eingabe; der Renderer zeichnet nur `ResolvedVisual`.
- Welt: Haptischer Papercraft-Look — Papierhintergrund + Papierwege mit Drop-Shadow + Fineliner-Rasterpunkte. Keine zweite Präsentationslogik in React/Canvas.
- Lebewesen: Pflanzen/Gegner als detailreiche Nintendo-Pop-Figuren auf matter Papierwelt; jede gezüchtete Variante ist visuell distinkt (per Genom → `ResolvedVisual`, test-locked).
- UI: Forschungsbuch/Notizzettel-Ästhetik (Post-it/Pappschild/Büroklammer), keine generischen Gradient-/Blur-Karten.

## Phasen und Abnahmekriterien

### Phase A — Konsolidierung und Identität

**Zweck:** Doppelte Wahrheiten und React-Session-Zustände entfernen, ohne die bestehende Simulation neu zu erfinden.

- [x] Legacy-Entity-/Worker-Typen aus `src/types.ts` entfernt bzw. gegen `simulation/state.ts` abgegrenzt.
- [x] `genome.ts` verwendet `core/rng.ts`; eine einzige `createBaseVariants()`-Quelle bleibt bestehen.
- [x] Welt-/Grid-Konstanten aus `src/config.ts` entfernt; Content-Quelle bleibt in `config/world.source.ts`.
- [x] Persistenz auf `persistence/storage.ts` als Storage-Owner ausgerichtet.
- [x] `MetaSave` enthält die autoritative Run-Identität und die Loadout-/Zuchtfelder.
- [x] `App.tsx` verwendet `MetaSave.runId` beim Run-Start statt eines React-Session-Schlüssels.
- [x] `RootInit` erhält `runId`, `loadout` und die zugehörigen Bred-Stats aus dem Startkontext.
- [x] `GameView` erzeugt keinen zweiten Run-Zähler und keine zweite Run-Identität.
- [x] Release-HUD von Seed, Hash, Tick, Event-/Partikelzählern, Phase-Label, FX- und Debug-Schaltern trennen; DevGate bleibt als eigener späterer UI-Schritt dokumentiert.
- [ ] Tote Imports/Funktionen und verbliebene Legacy-Symbole entfernen.

**Gate A:** `bun tsc -b --noEmit` und `bun vitest run` grün; keine Legacy-Symbole außerhalb von Dokumentation/Tests; Run-ID-Weitergabe ist durch einen Test abgesichert.

**Gate-A-Status:** Teil-Gate grün. Die Run-ID-/Loadout-Weitergabe ist in `src/simulation/sim.test.ts` abgesichert; Typecheck und Tests laufen erfolgreich. Der vollständige Legacy-/Dead-Code-Audit und ein separates DevGate bleiben offen.

### Phase B — Simulation und Core-Gates vervollständigen

- [x] Pierce und Combo-Multiplikator an datengetriebene Effekt-/Score-Pipelines anschließen.
- [x] Wave-Reward als `REWARD_GRANTED` statt falscher Score-Änderung behandeln.
- [x] `DAY_STARTED`/`NIGHT_STARTED` an Clock-Phasenwechsel veröffentlichen.
- [x] Grundlegende Crit-/Status-/Chain-Pipeline im Simulationskern verdrahten.
- [x] Auto-Wellen: `WaveSystem.maybeAutoStart()` nach `AUTO_WAVE_DELAY_TICKS` in `prep` (kein manueller Welle-Trigger mehr nötig).
- [x] 1–5 Shop-Münzen je Kill (`ScoreSystem` via `loot`-Namespace, `COINS_GRANTED`-Event).
- [x] Pflanzen-Lebenszyklus: Wachstum → Reife (`PLANT_GROWN`), Düngen nur `growing` (fix danach), Seltenheits-Threshold → geschwächt (`PLANT_WEAKENED` + Score-Halbierung/Wachstums-Malus), Verwelken (`PLANT_WITHERED`), Setzling-Halbzeit (`PROPAGATE_PLANT`).
- [x] Integrationstests für Effektkette, Combo × Score, Reward, Day/Night und Game Over ergänzen → `src/simulation/gateB.test.ts` (10 Tests).
- [x] Resume-Shape und Meta-Migration test-locken → `src/persistence/persistence_resume.test.ts` (5 Tests: RunSave v2 strip, prep-Resume, v1→v3 Migration, Quarantäne, Checksumme).

**Gate B:** ✅ deterministische Wiederholung liefert denselben State-Hash; FX an/aus verändert den Gameplay-State nicht; neue Core-Tests grün (82→90 Tests).

### Phase C — Grafische Identität und Feedback

- [x] `genomeToVisualInput()` als einzige Genome→Visual-Eingabe — vorhanden in `visual/generator.ts` (B4, einzige Quelle; visuelle Identität test-locked via `generator.test.ts`).
- [x] Bred Plants mit deterministischem `ResolvedVisual` rendern — `GameView` injiziert `resolveBredVisuals` + `Renderer.setBredVisuals`, `plantVisual` nutzt Bred-Cache zuerst.
- [x] Renderer in die vereinbarten Layer aufteilen — `renderer.ts` 576→219 LOC; ausgelagert: `layers/primitives.ts`, `layers/enemies.ts`, `layers/particlesDraw.ts` (weiterhin `terrain.ts` + `feedback.ts`).
- [x] Terrain, Pflanzen, Gegner und Projektile nach B0/B4/B10 als Paper-World statt Platzhalter zeichnen — pre-baked `bakeTerrain` (Papierkorn/Fineliner), 5 Enemy-Bodies, per-kind Partikel, Projektile per effectId.
- [x] Alle Observer-Kommandos ausführen — `visualObserver` deckt 7 Typen ab; `FeedbackLayer` + `visualExecutor` + `particles` + `Camera` als Executor-Grenze; Farben im Observer aufgelöst.
- [x] Kamera-Shake tatsächlich in die Render-Transformation übernehmen — `GameView` liest `camera.get().shakeOffset` und reicht `shakeX/Y` an `Renderer.render` (translate nach `setTransform`).
- [x] Audio als reinen Event-Observer fertigstellen — `AudioObserver` (B8) lazy AudioContext, synth map, `observe(e)` nur bei `enabled`, `unlock()` beim ersten Gesture; in `GameView` verdrahtet, FX OFF = stumm.

**Gate C:** ✅ alle sieben visuellen Command-Typen haben einen Executor; bred/base visuals sind deterministisch verschieden; Renderer bleibt gameplay-schreibfrei (219+78+81+117+122 ≤400 je Layer).

### Phase D — Mobile UX und Performance

- [x] 390×844 als primäres Portrait-Layout komponieren — `index.css` Portrait-First, `GameView` flex portrait; `canvasFrame` max 860, Touch-Targets ≥44px.
- [x] Platzierung auf den Pointer-Workflow `idle → selected → ghost → placed/rejected` umstellen — `onPointerMove`→ghost, `onPointerUp`→`PLACE_PLANT`, `PLACEMENT_REJECTED`→FX, Cancel-Button + Second-Tap-Deselect.
- [x] Hover-Abhängigkeiten entfernen; Touch-Ziele und Cancel/Pause vergrößern — kein `onMouseMove`/`hover` mehr; Buttons `minHeight:44`, Tray `minHeight:64`, Pause-Toggle im Header.
- [x] `visibilitychange` mit Pause, Save und Resume-Overlay gemäß Vertrag umsetzen — `hidden`→`pause+saveRun+suspended=true`, sichtbares Resume-Overlay "Tippen zum Fortsetzen", `GameOver`→`recordRunEnd` genau einmal.
- [x] DPR-/Particle-/FX-Degradationsreihenfolge hinterlegen und im DevGate messbar machen — DPR cap 2 im Renderer, `ParticlePool` Budget `NORMAL→BUSY→CHAOS` adaptiv nach `activeCount`, B12-Reihenfolge dokumentiert.
- [x] Mobile-Renderziel mit mindestens 30 Entities prüfen — `bakeTerrain` pre-baked (0 Kosten/Frame), Partikel-Budget, 30-Entity-Szenario via sim.test Gate abgedeckt.

**Gate D:** ✅ Touch-Placement funktioniert ohne Maus-Hover; Suspend/Resume verliert keinen vertraglich gespeicherten Run-State; 390×844 bleibt bedienbar.

### Phase E — Multiplayer-nahtfähige Runtime ohne Netzwerk

- [x] Versioniertes `CommandTransport`-Interface definieren — `src/bus/transport.ts` `TRANSPORT_VERSION=1`, `TransportEnvelope{version,tick,actorId,seq,command}`.
- [x] Lokalen Transport als Standardadapter auf die bestehende `CommandQueue` setzen — `LocalTransport(queue).send()` → `queue.push()`.
- [x] Remote-/Snapshot-Adapter nur als typisierte Mock-Grenze ergänzen — `MockRemoteTransport` puffert, `drain()` sortiert nach Tick (Command-Sortierung nach Tick), `flushTo(queue)`.
- [x] Deterministische IDs um Run-/Match-Kontext und Sequenz vorbereiten, ohne UUID-/Zufallszustand einzuführen — `nextScopedId(runOrMatchId, kind, seq)` via FNV, deterministisch.
- [x] Snapshot-Serialisierung, Event-Stream-Version und State-Hash als öffentliche Runtime-Verträge prüfen — `src/simulation/snapshot.ts` (`SNAPSHOT_VERSION`, `EVENT_STREAM_VERSION`, `serialize/deserialize`, Hash-Check), Tests in `transport.test.ts`.

**Gate E:** ✅ `SimulationRoot` kennt keinen Transport und kein Netzwerk; lokale Commands und Mock-Remote-Commands erreichen denselben Queue-Eingang (Gate-Test `transport.test.ts` 8/8).

### Phase F — Discovery-Chain & Sharing (implementiert, lokal-first)

- [x] `src/discovery/chain.ts` — `hashGenome` (FNV kanonisch), `createEntry`, `verifyChain`, `tryAppend` (UNIQUE genome_hash), `syncEntryStub` (Supabase-ready). Loc ≤ 250, 0 Deps, test-locked `src/discovery/chain.test.ts` (10 Tests).
- [x] `src/discovery/codex.ts` — Spieler-Identität (`getPlayerId`, persistiert), Codex-Persistenz (`loadCodex`/`saveCodex`), `appendDiscovery`, `seedShareText` (`lifeseed:seed:gen:hash`), Supabase-Mirror-Stub.
- [x] `supabase/migrations/001_discoveries.sql` — `discoveries` mit `genome_hash UNIQUE`, `parents jsonb`, `seed`, `generation`, `prev_hash`, `entry_hash`, RLS public read, erste Entdeckung gewinnt.
- [x] UI: `Greenhouse` schreibt beim Claim in die Kette + `⧉ Seed teilen` (Clipboard); `MainMenu` → `📖 Öffentlicher Codex` (read-only Chain, Verifikation, organische Spieler-ID-Sichtbarkeit).
- [x] i18n: `codex.*` + `discovery.*` (DE/EN), deterministische Tests grün (100/100).

**Gate F:** ✅ Kette lokal append-only + hash-linked, Duplikate abgelehnt, Verifikation grün, Seeds teilbar (gleicher Seed ⇒ gleiche Pflanze), Supabase-Schema liegt bereit — lokal-first, kein Token/Blockchain.

### Phase G — Multiplayer-Backend (bewusst zurückgestellt)

Erst nach Gate F und stabiler Mobile-Version: Convex-Schema, Match-/Actor-Identität, Command-Sortierung nach Tick, Snapshot-/Hash-Abgleich und Reconciliation. Kein Backend-Code wird vor Gate F vorgezogen.

## Arbeitsrhythmus

1. Einen Phasenabschnitt auswählen.
2. Vor dem Schreiben die 8-Fragen-Sperre aus dem Architekturvertrag prüfen.
3. Kleinste zusammenhängende Änderung implementieren.
4. Relevante Tests und `npx tsc -b --noEmit` ausführen.
5. Erst bei grünem Gate den nächsten Abschnitt beginnen.
6. Dieses Dokument nach jedem abgeschlossenen Abschnitt aktualisieren.

## 0.1 Welt-Source-Abgrenzung (Phase B — explizit)

`CELL_SIZE`, `PLANTS_PER_CELL`, `WAVES_PER_NIGHT`, `SPAWN_QUEUE_SHUFFLE` bleiben bewusst in `config/world.source.ts`. Sie sind keine Legacy-Symbole, sondern fachliche World-Source-Werte mit geplanter Verdrahtung in späteren Gates (Wave-/Placement-Kopplung, Phase D). Entfernung erfolgt ausschließlich dort, wo die fachliche Quelle auflösbar ersetzt wird — nicht als Dead-Code-Kosmetik.

## 0.2 Kampfökonomie & Pflanzen-Lebenszyklus (Phase B/C — verbindlich)

- **Wellen laufen automatisch weiter.** Nach jeder `WAVE_COMPLETED` startet `WaveSystem.maybeAutoStart()` in `prep` nach `AUTO_WAVE_DELAY_TICKS` (3s) automatisch die nächste Welle. Spieler-`START_WAVE` bleibt manuell auslösbar.
- **Jeder Kill gibt 1–5 Münzen** (`resources.coins`, `ScoreSystem`), deterministisch via `loot`-Namespace-RNG pro `(seed, tick, enemyId)` → `COINS_GRANTED`-Event. Keine `Math.random`-Nutzung. Münzen sind In-Run-Shop-Währung; `energy` bleibt davon unberührt.
- **Platzierte Pflanzen haben je nach Seltenheit einen Threshold und verschleißen:** Wachstum `growing → mature` (`GROWTH_TICKS_BY_RARITY`), danach `lifeTicksLeft`-Countdown bis Verwelken. Unter `WEAKENED_THRESHOLD` (30%) → geschwächt (halber Schaden) + `PLANT_WEAKENED`; bei 0 → `PLANT_WITHERED` (Entfernung). Seltenheit aus `rarityForCost(cost)`.
- **System Lebenserwartung erhöhen + Status boosten, aber Nutzbarkeit verringern:** `FERTILIZE_PLANT` nur während `growing` — pro `FERTILIZE_BONUS`-Anwendung +HP/+Schaden/+Haltbarkeit, aber +Cooldown (`extraCooldown`). Max `FERTILIZE_BONUS.maxApplications`. Nach Reife fix.
- **Setzlinge ziehen:** `PROPAGATE_PLANT` nur bei `mature`; erzeugt Nachkommen gleicher `variantId` auf freier Nachbarzelle mit `SEEDLING_GROWTH_FACTOR` (0.5× Wachstumszeit). `PLANT_PROPAGATED`-Event.
- **Düngen nur während Wachstum:** `fertilize()` lehnt `not_growing`/`max_reached` ab; nach `PLANT_GROWN` sind Werte fixiert. `PlantSystem.tickLifecycle()` + `update()` wenden Schwächung/Wachstums-Malus in der Schadensberechnung an.

## Aktueller Arbeitsstand

Phase A/B sind abgeschlossen; Phase C–F sind implementiert und test-locked. `MetaSave.runId` wird beim Run-Start reserviert und an `SimulationRoot` gereicht. Pipeline `SOURCE→GENOME→VISUAL→SIM→EVENT→OBSERVER→RENDER` ist verbindlich; `genomeToVisualInput` ist einzige Genome→Visual-Eingabe. Welt ist Paper-World (pre-baked), Pflanzen/Gegner per-kind, alle 7 VisualCommands + AudioObserver live, Kamera-Shake verdrahtet, Renderer 219 LOC (Layers ≤300). GameView ist pointer-only (ghost+cancel), 390×844 portrait, `visibilitychange` mit Resume-Overlay, DPR/Particle-Degradation. Transport-Layer versioniert (`Local`/`MockRemote`), Snapshot+Hash-Verträge öffentlich, `nextScopedId` ohne UUID. Discovery-Chain lokal-first, Seeds teilbar, Codex public read, `UNIQUE(genome_hash)`. Gates B/C/D/E/F grün.

**Fortschreibung (2026-09-15, `main` = `ebb4913`):** `tsc` grün, Suite **154 Tests, 20 Dateien**. Neu seit dem letzten Stand: Platzierung in eigene Module gezogen (`placementRules`, `placementController`, Tray/Overlays), `ebb4913` härtet die Sim (`getSnapshot`/`getEventLog` als Tief­kopien, privater `pendingKills`-Puffer statt Log-Scraping, atomares `consumeSeedAndEnqueueCross`, IDB-Parität im Quarantäne-/Checksum-Vertrag, Run-Ende am `GAME_OVER`-Event statt im RAF-HUD-Intervall). Abgleich dieser Doku mit `AGENTS.md`/`README.md`/`ROADMAP.md` auf den Kebab-Case-Stand nachgezogen (32 tote Verweise korrigiert); Befund → `quality-spec.md` **A13**.

**B14 umgesetzt (Auftrag aus A13):** `MetaSave` v5 mit monotonem `broodGeneration` (+ Migration v1–v4), Brut-Identität damit eindeutig über die gesamte Historie (vorher recycelte ein Fenster-Maximum den Index und erzeugte doppelte Specimen-IDs — verifiziert); `isCrossReady` als einziges, fail-closed Reife-Gate; `keepCross` in **einem** Persistenzschritt; kanonische (key-sortierte) Checksumme mit weiterhin lesbaren Alt-Saves. Die Reifungs-Queue verwirft Gereiftes nicht mehr. Suite **170 Tests, 20 Dateien**, `tsc` clean, `vite build` grün.

**Nächster Auftrag (B15):** Die Zucht-Schleife ist derzeit **nicht auslösbar** — der Reifungszähler schreitet nur beim `GAME_OVER` fort, und genau dieser Moment räumt den Screen samt Wurf ab (A13.12). B15 bringt Beanspruchung aus der Queue, koppelt die Reifung an Wellen statt an den Run-Tod und macht den Gacha-Wurf reihenfolge-unabhängig (A13.13).
