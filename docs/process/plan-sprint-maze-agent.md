# Sprint-Plan: Maze-Tiefe + Agent-Bridge (Sprint 2026-09-17/18)

> Basis: `docs/quality/lifeseedlab-deep-audit-roadmap.md` (Audit, 12 Befunde) + der verifizierte Umsetzungsplan (Ledger geschlossen, alle `[CHECK]`-Punkte sind Fakten).
> Sprint-Ziel: **Maze wird zum Zucht-Bauwerk (Phase 1) und der LLM-Agent bekommt eine verifizierte Command-Bridge (Phase 2+3)** — mit den zwei Pflicht-Vorabfixes (E1/E2), die verhindern, dass der Agent auf dem teuersten Sim-Pfad baut.

---

## Sprint-Rahmen

- **Verifikationsverträgnis:** Typecheck + Suite genau EINMAL am Aufgabenende (`node node_modules/typescript/bin/tsc -b --noEmit`, `node node_modules/vitest/vitest.mjs run`), E2E einmal am Sprint-Ende, Abschluss nur über `node git-noir/shinon/cli.ts finish --all`.
- **LOC-Caps hart:** pro Datei 300 (Simulation) / 400 (Renderer/UI). `root.ts` steht bei 300/300 — jede Phase-3-Änderung an der Pipeline braucht zuerst den Root-Split (E3).
- **Determinismus:** LLM-Commands sind Spieler-Input gleichgestellt — validiert, geloggt, replay-fähig. `SOURCE + SEED + COMMANDS (inkl. geloggter LLM-Commands) = STATE`.
- **Single-Writer unangetastet:** Phase 1 erweitert `mapSystem.ts` (bereits Writer von `mapTiles` + `currentRoute`). Phase 3 ist ein reiner Command-Produzent — kein zweiter State-Writer.

---

## Arbeitspaket 0 — Vorbereitung (XS)

| # | Schritt | Ergebnis |
|---|---|---|
| 0.1 | `commit_msg.txt` konsumieren (löschen) nach jedem Shinon-Commit — Loophole aus Sprint e977f61 schließen (Shinon-Komponist anpassen ODER Repo-Root-Datei löschen und Regel dokumentieren) | Keine alte Nachricht mehr wiederverwendbar |
| 0.2 | CHANGELOG-Eintrag für den Sprint vorbereiten (Regel 0) | Staged vor Commit |

## Arbeitspaket 1 — P0-Performance (E1 + E2, XS)

| # | Schritt | Beleg | Test |
|---|---|---|---|
| 1.1 | **E1 Snapshot-Cache:** In `render/gameRuntime.ts` `startLoop()` einen Snapshot pro Frame cachen (`const snap = this.root.getSnapshot()` am Loop-Anfang); Renderer + `ghostForRender` + HUD lesen aus demselben Objekt. | Audit A13 (2× `structuredClone` pro Frame) | `hudSnapshot.test.ts` grün; kein Verhaltenstest nötig (rein lesend) |
| 1.2 | **E2 Tick-Cap:** In `simulation/root.ts` `advance()` Accumulator klemmen: nach dem While `this.accumulator = Math.min(this.accumulator, 4 * TICK_MS)` — oder Cap in der While-Bedingung. | Audit A12 (unbegrenzter Catch-up) | Neuer Test in `determinism.test.ts`: Advance mit dt = 10_000 ms execuciert ≤ 4 Ticks |
| 1.3 | **E4 Filter-Sweep** (optional, falls nebenbei): Enemies-Filter einmal am Pipeline-Ende statt 4× in Sub-Systemen | Audit C3 | Determinismus-Replay bleibt bit-identisch |

## Arbeitspaket 2 — Phase 1 Maze (S)

Owner: `src/simulation/mapSystem.ts` (188/300 → Ziel ≤ 300, Budget +50–80).

| # | Schritt | Detail | Test |
|---|---|---|---|
| 2.1 | **Route-Quality-Writer:** In `computeRoute` Qualität ableiten (z. B. Länge vs. Manhattan-Distanz des 12×12-Grids, oder Anteil Weg-Gewicht-Summe vs. freie Route) → nach `state.currentRoute` Änderung in `ROUTE_CHANGED`-Payload als `quality` emit-en. Neuer State-Anteil bleibt im Root-Slice (Root ist bereits Writer von `currentRoute`). | Ledger: `routeQuality` existierte nicht — Writer wird benannt (SimulationRoot via recomputeRoute) | Neuer Test in `placement_map.test.ts`: Platzieren eines path-Tiles senkt Route-Kosten / hebt Qualität |
| 2.2 | **Sichtbarer Fallback (M5):** Bei `recomputeRoute`-Ergebnis `null` (zubaut) → `ROUTE_CHANGED { waypoints: 0 }` + neuer Toast-Grund `route_blocked` (i18n DE+EN, `FieldToast`-Mapping ergänzen — erschöpfend, Compiler erzwingt es). | Audit B1.3: Fallback läuft unsichtbar durch Wände | E2E-los, vitest: `noticeFromEvent` mapt neuen Grund; Sim-Test: zubauen ⇒ Route `null` + Event |
| 2.3 | **Drei Weg-Gewichte (M4):** `map.source.ts`: `path` weight 0.45 → Source-Tabelle `{ paved: 0.3, path: 0.6, stepping: 0.85 }` ODER minimal-invasiv: nur `path: 0.6` + neuer `paving`-Tile. **Entscheidung im Sprint fallen, Source-only (Regel 6).** | Audit B3 | `sources.test.ts` erweitern |
| 2.4 | **Pflanzen ins Cost Field (M2, klein anfangen):** `computeRoute` liest Pflanzen als cost+1 auf ihrer Zelle (kein Block — Thorn „verlangsamt" symbolisch über Gewicht). Optional-Flag in Source: `PLANTS_AFFECT_ROUTE = true`. | Plan §3; Audit M2 | Sim-Test: Pflanze auf Pfad-Zelle verändert Route-Nachbarwahl |
| 2.5 | **ortho-Branch aufräumen (B2):** `mapSystem.ts:147-151` — toten Zweig löschen (ortho4 verbindlich, Kommentar in map.source bleibt). | Audit B2 | keine — Zeilen-Ersparnis |

**Budget-Kontrolle nach Phase 1:** `wc -l src/simulation/mapSystem.ts` ≤ 300; wenn drüber → Split `routeQuality.ts` (reine Funktion) statt Cap erhöhen.

## Arbeitspaket 3 — Root-Split (E3, S)

Owner neu: `src/simulation/pipeline.ts` (neu, ≤ 200).

| # | Schritt | Detail |
|---|---|---|
| 3.1 | `stepOnce`-Schritte 0–6 (Commands → Clock → Systeme → Kills → Chain → Wave-Complete → GameOver) als `runPipeline(state, facets)`-Funktion auslagern. Root behält Wiring + `advance()` + State-Owner. | Audit 1.6: root.ts 300/300 — ohne Split ist Phase 3 am Cap gescheitert |
| 3.2 | `rootCommands.ts` unverändert lassen (181/300, kein Druck). | — |

**Test:** komplette Suite muss unverändert grün bleiben (Pipeline ist reine Verschiebung, semantik-identisch — das Determinismus-Replay (`determinism.test.ts`) ist der Beweis).

## Arbeitspaket 4 — Phase 2 Observation (S)

Owner neu: `src/simulation/observationSerializer.ts` (neu, ≤ 200). **`snapshot.ts` bleibt unangetastet** (Ledger-Entscheidung: Hash/Envelope-Rolle, nicht Wahrnehmung).

| # | Schritt | Detail |
|---|---|---|
| 4.1 | `serializeObservation(state, recentEvents)` → JSON v1 exakt nach verifiziertem Schema: `tick, phase, wave, grid (12×12 = 144 Zellen!), route { waypointCount, quality }, inventory, combat (combo, enemies mit echten TypeIds grunt|fast|tank|swarm|boss), recentEvents`. | Kein `agent.pos`, kein `perceptionRadius`, `route.quality` echt aus Phase 1 |
| 4.2 | Event-Diff: `recentEvents` = Events seit letztem Agent-Tick (aus dem bestehenden `getEventLog()`-Kanal, gefiltert auf `notice`-Audience via `eventAudience.ts`). | B29-Infrastruktur wiederverwendet |
| 4.3 | Test: Serializer golden test — Observation für frischen Run (Seed 2447771834) gegen Fixtur-JSON; jede Observation-Eigenschaft hat einen benannten Writer (DoD). | neu: `observationSerializer.test.ts` |

## Arbeitspaket 5 — Phase 3 Decision-Bridge (M)

Owner neu: `src/simulation/llmBridge.ts` (neu, ≤ 200).

| # | Schritt | Detail |
|---|---|---|
| 5.1 | **Validator** (binding): `PLACE_PLANT` (variantId ∈ inventory, gx/gy buildable+unoccupied+nicht on_path, Energie), `FERTILIZE_PLANT` (plantId ∈ state.plants — KEINE Koordinaten), `START_WAVE`. Max 3 Actions, striktes JSON v1. | Plan §7; `FERTILIZE_PLANT`-String per grep bestätigt (`rootCommands.ts:83`) |
| 5.2 | **Reject-Fallback:** Validation fail ⇒ `actions = []`, `strategy = "stabilize"`. Kein Blindflug. | Plan §7 |
| 5.3 | **Command-Logger:** Valide Actions → `makeCommand(...)` in die bestehende Queue (1:1 rootCommands-Vokabular). LLM-Compute-Marker als Command-Payload-Präfix (`source: 'llm'`), damit Replay den Ursprung trägt — Command-Log bleibt die Determinismus-Wahrheit. | Plan §6 |
| 5.4 | **Scope-Grenze:** `PROPAGATE_PLANT`, `DEPLOY_BEETLE` bewusst NICHT als Agent-Actions (Plan §5). | — |
| 5.5 | **System-Prompt** als Konstante in llmBridge (Plan §9, unverändert übernehmen). | — |
| 5.6 | Tests: Validator-Tabelle (valid/reject je Regel), Reject-Fallback, Command-Log-Replay bit-identisch (Voyager-Prinzip: LLM entscheidet, Sim execuciert). | neu: `llmBridge.test.ts` |

## Arbeitspaket 6 — Abschluss (Sprint-Ende, verbindlich)

1. **Changelog** (Regel 0) finalisieren, staged.
2. **Einmalige Verifizierung:** `node node_modules/typescript/bin/tsc -b --noEmit` + `node node_modules/vitest/vitest.mjs run` — 0 Fehler, komplett grün.
3. **Preview prüfen:** Run-Screen mit neuer Maze-Regel (path-Tile + Pflanze auf Zelle), Toast bei zugebautem Pfad; 390×844 + Desktop.
4. **E2E:** `node node_modules/@playwright/test/cli.js test` — 27/27 (Preview-Server vorher stoppen, damit Playwright seinen eigenen verwaltet — Lektion vom letzten Sprint).
5. **Shinon:** `node git-noir/shinon/cli.ts finish --all` — Message VORHER in `commit_msg.txt` frisch schreiben (AP 0.1 schließt die Loophole, die sonst die alte Nachricht wiederverwendet).
6. Push-Wahrheit: `git ls-remote origin main` == `git rev-parse HEAD`.

---

## Definition of Done (Sprint)

- [ ] E1: ein Snapshot pro Frame (gemessen: getSnapshot-Aufrufe im Loop = 1)
- [ ] E2: Tick-Cap gepinnt (Test: 10 s dt ⇒ ≤ 4 Ticks)
- [ ] Phase 1: Route-Quality hat benannten Writer, Fallback sichtbar (Toast + i18n DE/EN), Source-only Gewichte, ortho-Branch tot
- [ ] Alle Simulation-Dateien ≤ 300 LOC (mapSystem nach Split-Regel, nicht Cap-Erhöhung)
- [ ] Phase 2: Observation-Schema = verifiziertes Schema (12×12 Grid, echte TypeIds, route.quality echt), jede Eigenschaft hat Writer
- [ ] Phase 3: Validator fail-closed, Reject-Fallback, Commands im Log, Replay bit-identisch
- [ ] `snapshot.ts` unangetastet (Rolle: Integrität, nicht Wahrnehmung)
- [ ] Suite + Typecheck + E2E grün, Changelog, Shinon-Push bestätigt

## Risiken & Auswege

| Risiko | Ausweg |
|---|---|
| mapSystem LOC-Budget nach Phase 1 gerissen | `routeQuality.ts` als reine Funktion splitten (Cap bleibt) |
| Determinismus-Replay bricht durch Phase 1 (Route ändert sich) | Erwartung: Replay bleibt grün (gleiche Commands ⇒ gleiche Route); nur wenn Route-Hash gepinnt ist, neu pinnen — dokumentieren wie B30-Muster |
| E2E-Laufzeit-Regression (Lektion 13-min-Lauf) | Preview-Server stoppen vor E2E; Playwright verwaltet Dev-Server selbst |
| Agent-Validator zu streng (Spieler-Commands identisch blockiert) | Validator nur im LLM-Pfad — Spieler-Command-Pfad unverändert |
