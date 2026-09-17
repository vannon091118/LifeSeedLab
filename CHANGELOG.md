# Changelog

Alle nennenswerten Änderungen an LifeSeedLab. Die Fassungen wurden **aus der Commit-History
rekonstruiert**: Jeder Eintrag fasst zusammen, was im Repository tatsächlich passiert ist
(Commit-Hashes in Klammern), älteste Fassung zuerst, neueste oben. Das Spiel ist im
Pre-Release — die Versionszählung läuft bewusst in kleinen Schritten (v0.0.x).

---

## Unreleased (Arbeitsstand 17.09.2026)


- [D4] PLANT_ROUTE_COST in die Source (config/map.source.ts) — die Maze-Balance-Schraube ist source-driven, Sim importiert statt kopiert; veralteter 12×8-Grid-Kommentar korrigiert (12×12); Lock-Test mit Semantik-Vertrag (> DEFAULT_WEIGHT, < boulder)
- [D3] Tray-Sektionen: Pflanzen (Kampf) und Feld-Tiles (Infrastruktur) sind getrennte Funktionsgruppen mit eigenen Labels (DE/EN) und Trenner — kein flacher Teller mehr
- [QA-Runde] Q6 (kritisch): Greenhouse-Crash mit v0.0.37-Alt-Save behoben — pots/seedlings werden bei JEDEM loadMeta geheilt (healEntryLoop, B17-Muster), Migrationstest im Gate
- [QA-Runde] Q1 (hoch): Welle 1 für Erstspieler überlebbar — grunt damage 10→4, Welle-1-Grunts fix 3; Leak-Pfad-Tests auf balance-festen High-Wave-Resume-Pfad umgestellt
- [QA-Runde] Q2 (mittel): Drag-Platzierung aus der Tray repariert — releasePointerCapture + touchAction none auf Tray-Karten
- [QA-Runde] Q4 (mittel): React border-Warnung behoben — 5 Komponenten auf Border-Longhands umgestellt
- [QA-Runde] Q5 (trivia): favicon.svg ergänzt (404 behoben)
- [D1] Maze ist lebendig: Pflanzen/Weg-Tiles berechnen die Route SOFORT (PLACE_PLANT/PLACE_TILE triggern recomputeRoute); routeQuality misst echte Kosten gegen Endpunkt-Referenz (eine Quelle, observationSerializer nutzt mapSystem statt Kopie)
- [D2] Leih-Spross im Run platzierbar — Run-Loadout trägt die Leih-ID (App-Naht), ownedInventory spiegelt sie aus dem Besitz
- [Vertrag] AGENTS.md: QA-Abhol-Pflicht vor Task-Start am Dateianfang verankert
- [Lauf-3-Nachtest] Zwei offene UX-Punkte aus dem v0.0.36-Spielerbericht behoben: (1) **Nachkaufkarten lesbar** - die Restock-Karten im Tray zeigten nur '+ 80' / '+ 120' (der Pflanzenname stand nur im Tooltip); jetzt tragen sie Name UND Preis ('Wurzelmauer +80E'), der Kauf ist ohne Tooltip verstehbar. (2) **Dauerhafter Feldhinweis entwertet** - der Zettel 'Tippe eine Pflanze unten...' blieb den ganzen Run sichtbar und nahm Sichtflaeche; er ist jetzt ein antippbarer Hinweis mit Ausblenden-Knopf (noteDismissed), der nur bis zur freiwilligen Entscheidung des Spielers steht - die prominente Erst-Hilfe bis zur ersten Platzierung bleibt unveraendert. Tippfehler im Kommentar berichtigt; gameViewStyles paperNote cursor:pointer.


- [Einstiegs-Loop] Der komplette Spielerfluss ist jetzt ein zusammenhaengender Kreislauf statt getrennter Tutorial-Demonstrationen: (1) **Leih-Spross** - ein frisches Profil hat LEERE Haende; besitzt der Spieler keine eigene Pflanze, leiht Krix beim beginRun den Spross (meta/loan.ts, LOAN_PLANT_ID) - deterministisch aus der bestehenden Chain (deriveSeed(GAME_SEED,'plant','loan',runId) -> makeRng('plant') -> crossGenomes-Form-Ableitung aus PLANTS_SOURCE), kein zweiter RNG; dieselbe runId ergibt immer dieselbe Leihpflanze. Die Leihe ist nie Besitz: applyRunEnd verwirft ihren Restbestand (delete counts[LOAN_PLANT_ID]) und bucht nur EIGENE Pflanzen zurueck. startet spaeter ein Run mit leeren Haenden, leiht Krix erneut - Auffangmechanik statt Dauer-Geschenk. (2) **Gratis-Besitz entwertet** - defaultMeta verteilte bisher 2 Startpflanzen pauschal (STARTER_PLANT_COUNT), damit gab es nie einen Grund fuer Leihe/Kauf/Topf; jetzt startet jeder mit variantCounts={} und dem Einstiegskapital. (3) **Startkapital = GENAU EIN Samen** - STARTING_NEKTAR = SEED_SHOP_BASE_PRICE (40): der erste eigene Kauf ist sofort moeglich, aber NUR einer - der Loop (Run -> Nektar -> mehr Samen) bleibt der Antrieb. (4) **Gewaechshaus-Toepfe** - MetaSave.pots (GREENHOUSE_POT_SLOTS=3, sanitizePots heilt Altsaves) + MetaSave.seedlings: der Shop-Kauf (buySeedling) erzeugt einen Keimling in der Warteschlange statt direkt Besitz aufs Feld; plantSeedlingIntoPot setzt ihn fail-closed in einen freien Topf (belegt/fremd/Kapazitaet => null). Drei Slots zu Beginn, Erweiterung spaeter via PvP (Struktur vorbereitet, nichts erfunden). Die eingetopfte Pflanze ist ueber variantCounts im Run platzierbar - Kauf, Topf und Run sind EINE Kette. (5) **Shop-Texte** DE/EN auf den neuen Uebergang umgestellt (Keimling wartet im Gewaechshaus). (6) **Tutorial v3** (TUTORIAL_VERSION 2->3, jeder Spieler sieht sie einmal neu): der Krix-Abschluss erklaert jetzt den Loop-Zweck - Leihgabe-Charakter des Sprosses, Nektar verdienen, eigenen Samen kaufen, in den Topf setzen, eigenen Kreislauf drehen. Tests: entry_loop.test.ts (13 its: Startkapital-Gate, Chain-Determinismus, Pool-Diversitaet, Leih-Rueckgabe, Topf-Flow fail-closed, Altsave-Heilung), brood_loop_continuation baut Eltern jetzt selbst auf (kein Gratis-Besitz mehr). Suite 384/384, tsc clean.


- [Versions-Ausweis] Die Produktversion (v0.0.38) ist jetzt an allen sichtbaren UND unsichtbaren Orten: sichtbar neu auf der Game-Over-Karte (i18n `over.version`, DE/EN) und im Fenstertitel (`LifeSeedLab vX.Y.Z` beim Mount, App.tsx — der Tab ist der einzige immer sichtbare Ort); unsichtbar neu im Run-Save (`RunSave.appVersion`, Pflichtfeld) und im Meta-Save (`MetaSave.appVersion?`, optional für Altsave-Kompatibilität, `persistMeta` überschreibt bei JEDEM Schreiben — auch importierte Objekte bekommen die aktuelle Nummer). Lock-Tests in `version.test.ts` halten Nummer, Anzeige und Save-Felder zusammen. Schema-Altlasten: `persistence_resume`/`simulation_resume` Shape-Proben tragen `appVersion: '0.0.0-test'`.


- [Maze-Agent-Sprint] Drei Stufen in einem Sprint: (1) **P0-Performance** — gameRuntime cached den Snapshot pro Frame (vorher 2x structuredClone des SimState je Frame, ~120 Deep-Copies/s), SimulationRoot klemmt den Tick-Rueckstand auf MAX_CATCHUP_TICKS (Frame-Bursts fuehren keine Tick-Kaskaden mehr), frischeState/stepOnce-Pipeline nach pipeline.ts verschoben (root.ts 271/300, LOC-Cap-Spielraum fuer die naechsten Aenderungen). (2) **Maze-Tiefe** — Pflanzen zahlen PLANT_ROUTE_COST=2 ins Dijkstra-Cost-Field (Umweg-Anreiz, das Zucht-Layout wirkt als Maze-Bauwerk), Weg-Gewicht 0.45 -> 0.6 (Source-only), ROUTE_CHANGED traegt routeQuality (Writer: SimulationRoot via computeRoute) und einen sichtbaren Fallback: ist der Pfad zugebaut, emittiert die Sim ROUTE_CHANGED mit reject `route_blocked` (Toast DE/EN, B29-Audience notice ergaenzt) statt stillschweigend durch Waende zu laufen, MAP_NEIGHBOR_MODE-Doppelzweig gefixt. (3) **Agent-Bridge** — observationSerializer.ts (State -> Observation-JSON v1: 12x12-Grid, echte TypeIds, route.quality echt, recentEvents) + llmBridge.ts (parseDecision, processDecision fail-closed: jede unbekannte/unmoegliche Action verwirft die GESAMTE Decision mit Fallback strategy='stabilize', Commands 1:1 ins bestehende Vokabular — PLACE_PLANT mit Besitz-Inventar + Sim-Geometrie-Regel, FERTILIZE_PLANT nur plantId, START_WAVE; PROPAGATE_PLANT/DEPLOY_BEETLE bewusst ausgesperrt, AGENT_SYSTEM_PROMPT gepinnt). Determinismus-Vertrag unveraendert: LLM-Commands sind Spieler-Input gleichgestellt (validiert -> geloggt -> replay-faehig), kein State-Zugriff ausserhalb der Systeme. Shinon-Tooling: commit_msg.txt wird nach dem Commit konsumiert (Konsum-Vertrag im Komponist-Test) — die alte A13.12-Message-Luecke ist geschlossen. Neue Tests: observationSerializer (Golden-Frisch-Run + Schema-Invarianten), llmBridge (Fail-closed-Faelle, FERTILIZE-Schema-Bruch, Replay-Gleichstellung), determinism Tick-Cap-Klemme.

- [B37/B38] Zucht-Loop-Besitz + gewählte Eltern: (1) **B37 Besitz-Wahrheit** — das Run-Inventar spiegelt GENAU `Meta.variantCounts` (RootInit.ownedCounts; Altsave/Tests ohne Meta: B1-Fallback `loadoutStock`, Default 2); ein Loadout-Eintrag ohne Besitz lehnt mit `no_inventory` ab statt still 2 Stück zu schenken. Run-End-Sync: `applyRunEnd`/`recordRunEnd` übernimmt den Restbestand des Run-Inventars als Besitz (positives Max — Besitz schrumpft nie durch einen Run), die Kette „kaufen → einpflanzen → pflegen → ernten → Loadout" bleibt geschlossen; GameView-Abbruch zählt als Run (`countRun` im Runtime-Recorder) statt stiller Kopie (A19). (2) **B38 gewählte Eltern** — `crossPair` kreuzt aus vom Spieler GEWÄHLTEN Eltern (Seed aus beiden Eltern-IDs + Generation abgeleitet ⇒ dasselbe Paar ergibt dasselbe Kind; das Kind ist bei der Aussaat fest, die Reifung nur noch Timer). (3) **Ökonomie-Bereinigung im selben Zug** — Pflanzen kosten beim Platzieren kein Harz mehr (Besitz ist die Grenze, Placement-Regel spiegelt die UI-Vorschau), das passive Energie-Tropfen in der Vorbereitung ist entfernt (`prepDrip`), und Verwelken gibt es in der Runde nicht mehr: einmal platziert bleibt die Pflanze bis Game Over. Tests: B37-Blöcke in `placement_map` (no_inventory bei 0, Besitz-Grenze 5) und `brood_loop_continuation` (Run-End-Sync, positives Max, Kompatibilität ohne Argument), `gameover_notice` an die neue Ökonomie angepasst (Energie-Senkung über Findlinge+Deko statt Prep-Drip; 6 statt 7 Findlinge — maxCount aus der Source), E2E-Progression-Spec auf die Besitz-Wahrheit umgestellt (Run-Tray erwartet den echten Besitz des geholten Kindes statt Pauschal-×2). Suite 34 Dateien / 351 Tests grün, E2E 27/27, Typecheck clean.

- [B32-Plan Gate-Runde] Erstes `finish --all` vom Gate abgefangen (fail-closed, korrekt): 15 DLK000-Fehler (tote Referenzen auf gelöschte Testdateien in quality-spec, ROADMAP, implementation-plan) und 2 LOC001-Fehler (das 300er-Cap gilt auch für Testdateien unter src/simulation/ — die Phase-4-Fusionen 342/393 Zeilen waren zu groß). Behoben: alle Doku-Referenzen auf die neuen Dateien gezogen, placement_map → placement_map + wave_flow, simulation_beetle_fire_pair → simulation_beetle_fire_pair + gameover_notice gesplittet (alle sim-Testdateien jetzt ≤ 300, max. 279), dabei vier fehlende Helper/Imports im Split nachgezogen. Echte B30-Mutations-Stichprobe nachgeholt (Namespace-Flip per Probe-Test: Pin hält, Flip erzeugt 951497721 ≠ 905729497 — sensitive). It-Ledger aktualisiert: 34 Dateien / 346 its, simulation jetzt 7 Dateien (76 its unverändert). E2E 27/27, Suite 34/346 grün.

- [B32-Plan Phase 5] Abschluss: E2E 27/27 grün (Playwright, 2,2 min), Mutation-Protokoll in quality-spec B32.4 dokumentiert (Replay-Selbstkontrolle, ID-Reset-Nachweis, B30-Pins, PlacementTray-Compiler-Bruch). Adversarial-Review Phase 4: das Fusionsskript hatte den doppelten Import-Block von speed_autowaves mitten in simulation_resume.test.ts stehen lassen (22 Duplicate-Identifier-tsc-Fehler) und fünf describe-Titel als „Phase 4 — …“ statt der Original-B-Titel geschrieben — beides behoben; It-Ledger bleibt 346 = 346. Drei Störfeuer der Concurrent-Session am B36-Nachkauf-Feature als Anhalterpflege beantwortet: PlacementTray.tsx (unvollständiger JSX-Edit: Fragment fehlte), GAME_OVER-Payload im Audience-SAMPLES, und ein weiterer Fragment-Nachtrag — die verbleibenden 9 tsc-Fehler liegen in deren unvollendeter BUY_REJECTED-Verdrahtung (rootCommands/fieldNotice).

- [B32-Plan Phase 4] Domänen-Konsolidierung abgeschlossen: 43 → 32 Testdateien bei exakt gleicher It-Bilanz (346 = 346). `i18n/` 3→1 (`i18n_texts.test.ts`, 13 its), `bus/` 3→2 (`bus_events` + `bus_commands`, 23 its), `simulation/` 10→5 (`placement_map`, `simulation_beetle_fire_pair`, `simulation_resume` mit RootInit-Block, `determinism` + `gateB` behalten je ihre Rolle). Die toHashable-Projektion lag 3-fach kopiert vor (snapshot.ts, gateB, sim) — jetzt eine Quelle im Testkit (`stateToHashable`/`hashOfRoot`). Adversarial-Review Phase 3 davor: genau diese Dublette aufgedeckt und behoben. Zwei Script-Runs scheiterten an cp1252-Konsolen-Encoding (Unicode-Pfeile im print) und ließen rm-Schritte ohne Distribution zurück — Restore aus Git, Repeat mit ASCII-Output; Lektion für die quality-spec: Skripte in gemischten Umgebungen drucken nur ASCII. Verbleibende 5 tsc-Fehler: ausschließlich PlacementTray.tsx (fremde Concurrent-Änderung).

- [B32-Plan Phase 3] Zentrales Determinismus-Gate: `simulation/determinism.test.ts` mit drei beweiskräftigen Kernen — REPLAY (gleicher Seed + Command-Stream ⇒ identischer State-Hash über 600 Wellen-Ticks, plus Selbstkontrolle: veränderter Stream MUSS anders hashen, der Test kann nicht blind grün sein), FX-ISOLATION (VisualObserver an/aus ⇒ bit-identisches Gameplay, 500 Ticks) und RUN-KONTEXT-Pins (frischer Run ⇒ Seed 2447771834, B30-Brut-Domäne, RUN_SEED_VERSION 1). Replay-Dublette aus gateB.test.ts entfernt (kanonische Fassung im neuen Gate, TASK-014). Adversarial-Review Phase 2: 3 verlorene „keepCross atomar“-Tests wiederhergestellt (It-Bilanz 73 migrierte + 3 neue Testkit-Vertrags-Tests = 76), toter Code im Split geräumt (matureCross, ungenutzte Imports), fehlende BASES-Konstante im brood_loop-Split gefixt. 346/346 grün; Coverage über Thresholds; verbleibende tsc-Fehler ausschließlich in der fremden Concurrent-Änderung (rootCommands/events/translations/GameOverlays).

- [B32-Plan Phase 2] Pilot-Domäne `meta/` konsolidiert: 9 Milestone-Testdateien (b14–b18, capping, keep, meta_loop, onboarding + genome_brood_domain) → 5 Sub-Domänen-Dateien (`brood_identity`, `brood_loop`, `brood_loop_continuation`, `cross_lifecycle`, `meta_migrations`) — It-Bilanz exakt 73 = 73, keine Assertion verloren (Coverage-Gegenprüfung: 76,96/69,38/80,04/80,93 ≥ Baseline). Plan-Abweichung dokumentiert: TASK-006 (6 Dateien → 1) hätte CON-001 (Cap 400) verletzt; der Split nach Sub-Domäne schlägt die Plan-Tabelle. Adversarial-Review Phase 1 mit drei Fixes: B30-Seed-Pins stehen unter Copyright des Tests (Plan-Beschreibung korrigiert — Phase 3 nutzt bereits gepinnte Werte statt neuer Golden-Kopie), Testkit-Header schreibt die Spielcode-Import-Sperre fest (Import-Graph-Kollision mit Playwright vermieden), `writeLegacyEnvelope` als eine Quelle ins Testkit gezogen (statt Kopien je Datei). Doku-Verweise auf gelöschte Testdateien nachgezogen (store.ts, economy.ts). 338/338 grün; 1 verbleibender tsc-Fehler + 1 roter i18n-Paritätstest stammen aus einer fremden Concurrent-Änderung an events/translations/GameOverlays (nicht angerührt).

- [B32-Plan Phase 1] Test-Suite-Konsolidierung gestartet (Plan: `plan/refactor-test-suite-consolidation-1.md`, Spec: quality-spec B32): Coverage-Baseline gemessen (`@vitest/coverage-v8`, Statements 76,7 % · Branches 69,23 % · Functions 79,28 % · Lines 80,67 %) und als Abdeckungswache 1 Punkt darunter in `vitest.config.ts` gepinnt — Schrumpfen schlägt künftig das Gate, bevor eine Konsolidierung still Assertions verloren hat. Zentrales Testkit `src/testing/testkit.ts` (einziger Owner der Setup-Kapselung: `resetTestState`, `resetFullTestState`, `makeRun`, `makeRunSeed`, `drainTicks`) mit 6-fälligem Vertrags-Test — der Test deckte dabei RISK-001 real auf: die ID-Zähler sind prozess-global, zwei Runs im selben Prozess brauchen `resetIds()` dazwischen (deshalb `resetFullTestState()`). 337/337 grün, tsc clean.

- [A13.12] Doku-Dopplung aufgelöst + Root Cause als Regel gefixt (Wiederholung der A13.10-Defekt-Klasse). Der Zwilling `docs/quality/changelog.md` (alter Milestone-Plan, Wahrheit längst in ROADMAP §4 + Regel 0) gelöscht; vier tote Root-`ROADMAP.md`-Referenzen (README ×2, AGENTS-Ressourcenkarte, architecture.md, presentation.md) auf `docs/process/ROADMAP.md` gezogen; ROADMAP-Karte korrigiert (Versionshistorie = getracktes Root-CHANGELOG, Root-Files-Liste ohne Phantom-ROADMAP). Root Cause: Doku-Moves zogen Referenzen nicht nach, Ablösungen ließen Altes liegen, und die Struktur-Linse prüfte den Worktree statt `git ls-files` (gitignorierte Reste machen tote Links unsichtbar). Regel im Spec: eine Wahrheit je Thema, Ablösung heißt löschen, Referenzen gegen den Track prüfen, Move erst fertig wenn Referenzen mitgezogen sind.

- [B35] Logikmischung-Befund (Struktur-Linse) abgeschnitten: `render/gameRuntime.ts` rief persistenz/ an vier Stellen (10-s-Autosave, WAVE-Abhängig, GAME_OVER-Clear, Visibility/Destroy). Die Save-Entscheidung ist jetzt `persistence/runSaveAutor.ts` — hört auf WAVE_STARTED/GAME_OVER am Bus und trägt den Interval-Takt; gameRuntime reicht nur Bus + verstrichene reale Zeit hinein. Die zwei restlichen saveRun-Aufrufe im Renderer sind bewusste Lifecycle-Momente (Tab-Hidden, Destroy), keine Bus-Events — dokumentiert im Code. 331/331 inkl. Resume-Vertrag grün; gameRuntime 333/400 (fremde Domäne persistence/ aus dem Render-Pfad).

- [B34] Kern-Loop-Satz: Kaufen → Aussäen → Pflegen → Ernten → Loadout dreht immer. Zwei Blocker entfernt: (1) Die Reifungskurve `2+2i` war offen — Kreuzung 11 verlangte 24 Wellen, mit voller Queue summierte sich die Geduld auf ~156 Wellen. Jetzt gedeckelt bei `MATURATION_WAVES_CAP = 12` (Source; Stärke kostet weiterhin mehr Geduld, aber endlich viel). (2) Die volle Queue (12/12) sperrte die Aussaat mit totalem Hinweis — jetzt zeigt der Hinweis den Weg zurück („{r} Kreuzungen sind reif — unten abholen!“, grün hervorgehoben) und die Queue-Überschrift markiert Reife. Loop-Gate `meta_loop.test.ts`: ganzer Kreislauf am echten Meta-Speicher + volle Queue mit reifen Einträgen, die trotz Sperre abholbar sind und Platz schaffen.

- [B33] Pfad-Korridor-Verbot für blockierende Tiles — der Screenshot-Befund als Regelbruch gefixt: `placeTile` kannte die Platzierungs-Marge nicht, ein Blumentopf stand 0.5 Zellen am Wegpunkt, wo Pflanzen seit jeher `on_path` wären. Jetzt gilt für pot/boulder dieselbe Quelle (`PLACEMENT_PATH_MARGIN` aus world.source); Weg-Tiles bleiben ausdrücklich erlaubt (Lenkung ist ihr Sinn). Neuer Ablehnungsgrund `on_path` im Tile-Vokabular (Typ im Bus-Vertrag, Text DE+EN, Toast-Mapping erschöpfend). Hardcode-Audit der Place/Map-Logik: Spawn-Korridor (`gx === 0`) und Baubereich (`2..9`) sind jetzt Source-Werte (`SPAWN_CORRIDOR_COL`, `BUILD_AREA_MIN/MAX` in map.source) statt verteilte Zahlenliterale. Zwei Bestandstests mussten umziehen, weil ihre Test-Zellen selbst im Korridor lagen (gy 6 → gy 8; Weg-Tile-Testzelle an die Marge) — die Regel war nie dokumentiert, jetzt ist sie gepinnt.

- [B0] Feld-Toast bekommt eine eigene Ecke: Er hing mittig bei `bottom: 120` — genau dort, wo Tray-Rand, Erst-Hinweis (`bottom: 84`) und Tutorial-Blase liegen, und überdeckte sie. Jetzt oben rechts unter dem ✕-Knopf (`top: 56`), ein Streifen, den sonst keine Fläche im Release belegt — der Toast überdeckt nie wieder Tray, Hinweise oder Blase.

- [B32] Sim-Tempo ×1–×4 und Auto-Wellen als Spieler-Entscheid. Der Tempo-Multiplikator lebt in der Uhr (`ClockState.speed`, erlaubte Stufen `SPEED_STEPS`, Snapshot-Teil ⇒ deterministisch); `advance` multipliziert reale Ms — die 30-tps-Tick-Schwelle und die Pipeline bleiben unangetastet, ×4 heißt genau 4× Ticks in 1/4 Realzeit (Gate: identischer Tick-Stand, gleicher Spielzustand bei gleichen Ticks). Die Auto-Wave-Entscheid ist Run-Zustand (`wave.autoWaves`, Command `SET_AUTO_WAVES`, Root als einziger Writer), Default aus der Source (`AUTO_WAVES_DEFAULT`); aus ⇒ `maybeAutoStart` tritt nie an und der Countdown im HUD schweigt (`autoStartTicksLeft ⇒ null`) — der Wellen-Knopf bleibt der Ausweg (kein Softlock). UI: Tempo-Zykluskopf ×1→×4 und Auto-Wellen-Toggle in der TopBar, i18n DE+EN. Kein Save-Schema-Bump: die Entscheidung ist Run-Sitzung, ein Resume startet mit dem Source-Default.

- [B0.7] Krickz läuft ins Bild: Der Figur-Wrapper trägt eine Lauf-Animation vom Blattrand an seinen Platz (950 ms, Beinschritt an den Beinen synchron); die Sprechblase ploppt mit halber Verspätung **neben** der Figur auf (Schwanz zeigt auf sie) statt mittig schwebend. Das Overlay remountet je Notiz (`key={view.index}`) — Lauf und Pop spielen bei jedem Schritt neu; `prefers-reduced-motion` nimmt Lauf, Schritt und Pop zurück.
- [B0.7] Tutorial-Anker auf der Bühne: Auf breiten Desktops (Feld zentriert, maxWidth 860) hing das Overlay am **Fenster** — Krickz am Fensterrand, Blase gegenüber, Cue-Chip auf der Hinweis-Leiste. Die Screens markieren jetzt ihre Inhaltsfläche (`data-tut-stage`: Titelkarte, Shell-Body, GameView-Stage); Overlay misst sie und hängt Krickz/Blase/Cue an DIESE Fläche. Der doppelte Spiel-Hinweis (P3QA-05-Plakat + Zettel gleichzeitig) zeigt nur noch einen.

- [Gate-P] Commit-Gate von ~60 s auf ~4 s warm gedrückt — gemessen statt gefühlt. Drei Posten an der Wurzel: (1) `isolate: false` in `vitest.config.ts` — vorher bekam jede der 41 Testdateien einen eigenen Worker (~3,7 s Spawn+Environment je Datei = ~27 s vor dem ersten Test); jetzt ein wiederverwendeter Worker-Pool, Test-Suite kalt ~10 s / warm ~4 s (vorher 44–56 s), und die Parallelitäts-Timeouts in `meta/capping.test.ts` (41 Worker im CPU-Kampf) sind mit weg — dreifach grün gemessen, 316/316. (2) `ChangelogCheck` auf `spawnSync` über den GitHelfer umgestellt statt `execSync`-Shell mit Exception-Karussell: ~1,1 s → ~0,1 s je Lauf; Exit-Codes sind jetzt explizit (1 = Erfolg, 0 = fehlt, sonst CHG002-Fehler mit Git-stderr), der CHG002-Pfad (Repo ohne Commit, „bad revision HEAD") ist in `git-noir/shinon/tests/changelog-check.test.ts` gepinnt — der Check hatte zuvor gar keinen Test. (3) Verifizierungs-Disziplin in AGENTS.md umgebaut: Typecheck/Tests laufen **genau einmal am Aufgabenende** (nicht nach jedem Edit), Ausnahme ist nur ein gezielter Einzeltest zur Fehlersuche; „Phase → Test → Gate“ wurde zu „Phase → einmalige Verifizierung am Ende → Gate“ plus Cost-Wache gegen Lauf-Schleifen. Alle Gate-Kommandos rufen die Werkzeuge direkt über Node (`node node_modules/...`) statt `npx`/`npm run` (~3 s npm-Startup pro Kommando) — auch in der Doku (`docs/setup/script-readme.md`, AGENTS.md-Verifizierung/E2E). Gate-Läufe gemessen: preflight 11,4 s (erster Lauf, Caches bauen), pre-commit 4,2 s (warm, `passed: true`), Shinon-Tooling-Suite 7 Dateien / 33 Tests grün (3 neue Changelog-Tests).

- [B31] Signatur sichtbar, Easter Egg am Blattrand. Das Projekt trug keinen Namen auf dem Schirm — jetzt: `components/CreatedBy.tsx` als eine Quelle für Name (VANNON), Motto und GitHub-URL; `CreatedBy` sitzt auf Titelkarte und Hub-Fußzeile, dieselben Zeilen stehen in der README unter den Badges. Das Motto buchstabiert den Namen („Volatile Agent Needing No Other Nonsense“ = V-A-N-N-O-N; zweiter Halbsatz = Never Overly Nice, Never Average Vibe) — der Gate-Test `createdBy.test.ts` prüft genau das, damit Name und Motto nicht auseinanderlaufen können. Easter Egg: je Papierfläche ein Wort der Randnotiz (Titelkarte „Volatile 1/6“ bis Codex „Nonsense 6/6“), klein/kursiv/gedreht in Bleistiftgrau, `aria-hidden` + `pointer-events:none`, Fläche→Wort als Map statt Zufall. SVG-Banner um „created by VANNON“ + Motto rechts unten ergänzt (Bildtext statt Link — ein `img`-Banner kann keine Links tragen; der klickbare Weg steht in der README darunter); Vitest-Badge auf 311. GitHub-Marke als gezeichnete Tusche-Katze (B0: kein Stock-Icon, kein Emoji); der Name bleibt unübersetzt, zweisprachig ist nur die Bedienhilfe des Links.

- [B30] Brut-Seed in eigener Domäne (`enemy` → `brood`) mit ausgewiesener Migrationsentscheidung. Unter dem einen Namen `enemy` lagen drei verschiedene Spielbereiche: Gegner-Spawns (`enemySystem`), Crit-Rolls (`projectileSystem`) und die Käferzucht (`deriveBroodSeed` + Brut-Wurf-Strom). Geteilter Strom-State war dabei kein Problem — falsch war die Benennung der Domäne: wer die Brut-Ableitung anfasst, zieht lautlos das Gegnerverhalten mit. Zusätzlich benutzte `rollBrood` den Namen zweimal (Konstante + Literal im `makeRng`-Aufruf) — jetzt gilt EINE Konstante für Ableitung und Strom, die beiden Stellen können nicht mehr driften. Migration: scharfer Schnitt, keine Datenmigration — die Eingaben (Eltern-IDs, `broodIndex`) bleiben, nur der Namespace wechselt; ein noch nicht abgeholter Wurf zeigt deshalb einmalig drei andere Kandidaten (bezahlte Zusage „drei Kandidaten, du wählst einen“ bleibt intakt; Nektar, Queue, Zähler und bereits abgeholte Käfer unberührt, kein Schema-Bump). Verworfen: ein Namespace-/Versionsfeld pro Brut (permanente Legacy-Verzweigung) und eingefrorene Kandidaten im Save (widerspricht „Seeds sind ableitbar, nie Zustand“); Präzedenzfall ist `RUN_SEED_VERSION`. Gate: `genome_brood_domain.test.ts` pinnt Seeds, Kandidaten-IDs und Genome-Hashes, beweist die unberührte Gegner-Domäne, die Abholbarkeit jeder persistierten Brut und die Entscheidung selbst (ein `PendingBrood` trägt nur Eingaben). AGENTS.md-Namespace-Liste nachgezogen.

- [B29] Events ohne Konsumenten — entschieden statt vergessen (Übergang Event → Observer). `FERTILIZE_REJECTED`, `PROPAGATE_REJECTED`, `TILE_REJECTED`, `BEETLE_REJECTED` und `COINS_GRANTED` wurden emittiert und von exakt niemandem gelesen — kein FX, kein Ton, kein Text. Der schärfste Fall war `TILE_REJECTED`: der `placementController` delegiert die Map-Regeln ABSICHTLICH an die Sim (Baubereich, Korridor, maxCount sind Karten-Wissen, keine Zellenprüfung), die Ablehnung kam dort an — nur nie beim Spieler. Er zahlte Energie, tippte auf einen Findling im Korridor, und es passierte sichtbar nichts. Die Ursache war strukturell: die Subscription-Liste stand handgepflegt in der Runtime, und was dort fehlte, fehlte lautlos. Entscheidungen: TILE/FERTILIZE/PROPAGATE_REJECTED behalten (FX + Grund-Text), BEETLE_REJECTED behalten mit Text (Ursache ist HUD-Wissen — ein Puls am Pfadkopf würde eine Weltursache suggerieren, die es nicht gibt), COINS_GRANTED gestrichen (kein Positionsfeld, Stand ist Snapshot, Münzen haben keine Senke und keine Anzeige — `resources.coins` bleibt State und kommt mit dem Sink zurück), ebenso RUN_STARTED (weder Produzent noch Konsument — von der neuen Registry aufgedeckt). Struktur statt Fleißarbeit: `bus/eventAudience.ts` ordnet JEDEM Event eine Audience zu (`fx`/`notice`/`snapshot`/`internal`) plus Begründung, die Runtime leitet ihre Subscriptions daraus ab; `bus/events.ts` typisiert das Ablehnungs-Vokabular einmal; `components/fieldNotice.ts` übersetzt Ablehnung → Meldung in genau einen UI-Zustand; der Feld-Toast bildet die Gründe erschöpfend ab (neuer Grund ohne Text = Compile-Fehler). Dabei zwei versteckte Stummschaltungen gefunden und behoben: `PlayAnimation 'recoil'` war im Vertrag deklariert, aber im Renderer nie gezeichnet (die Ablehnung wäre trotz FX-Kommando unsichtbar geblieben), und `no_energy_tile` war ein zweiter UI-Grund mit eigenem Text für dieselbe Sache. Gate: `bus_audience.test.ts` (Registry erschöpfend, jede `fx`-Zeile erzeugt behavioral Kommandos und bei FX OFF keine, jeder Grund DE+EN) + `simulation_notice.test.ts` (spawn_corridor, max_count, max_reached, not_mature, no_energy — bis zum Text, am echten `SimulationRoot`).

- [B26] Gen-Paare: Style trägt Fähigkeits-Semantik — Prototyp am Referenz-Gen `fire`. `GENE_TO_EXTRA` und `GENE_TO_EFFECT` (zwei lose Tabellen, die nur zufällig dieselben 15 Gene nannten) sind zu **einer** Quelle `GENE_PAIRS: Gene → { extra, effect }` in `genes.source.ts` verdichtet; die Alt-Namen sind gelöscht, ein Import kompiliert nicht mehr. Prototyp-Paar: `fire = EXTRA_SPIKE + EFFECT_BURN` — eine Zeile speist alle drei Kanäle, im Test gegen die echten Pfade nachgewiesen: (1) **visualMap** — Basis `BASE_THORN`, Layer `spike` + `effect_tint`; der Tint ist exakt `EFFECTS_SOURCE.EFFECT_BURN.paletteModifier`. (2) **Vorschau** — `visual/generator.previewColor` als eine Quelle für Gewächshaus und Hub (vorher zwei Kopien derselben Ableitung). (3) **Run** — `genomeEffectIds → deriveBredEntry → stats.effects[0] → projectile.effectId`: das Projektil trägt `EFFECT_BURN` und der Treffer setzt `burnTicks` im echten `SimulationRoot`-Lauf. Gameplay-neutral (alle 15 Paare 1:1 aus den Alt-Tabellen, `cross.test.ts`-Schwellen unverändert). Der Prototyp macht zwei **Content**-Befunde sichtbar, die als Test gepinnt sind: der Dorn ist nur mit `BASE_CACTUS/THORN/ROOT` kompatibel (Schützen ziehen `THORN/FROND/FLOWER` ⇒ über 12 Feuerschützen-Genome zeigt ihn **1/12** — das Paar-Ornament fällt still weg), und `EXTRA_EYE/MOUTH/SCAR` erzeugt kein Gen (tote Ornament-Vokabel). Vorschau-Parität ist präzise gefasst: garantiert gleich ist die **Komposition** (seed-unabhängig, test-gelockt über Menü- und Run-Seed), nicht der Hex-Wert — Palette-Jitter/Scale/Rarity hängen am Seed (Vorschau `#f57d52` vs. Feld `#f27a4f`). Spez B26.2–B26.5 in `docs/quality/quality-spec.md` auf den Stand gezogen.

- [B28] Performance-Fundament für B26 (Sprite-Cache + GameView-Split): (1) `render/spriteCache.ts` — jede Pflanze (ResolvedVisual) wird EINMAL pro (variantKey, Zellgröße, DPR) auf ein OffscreenCanvas gebacken; pro Frame bleibt ein drawImage statt 3–6 Pfad-+Gradient-Operationen pro Layer (25 Pflanzen ≈ 10× weniger Canvas-Last). Der Schlüssel ist der variantKey — Animation (sway/bob/punch/squash) bleibt live im Renderer-Transform, das Sprite bäckt nur die Form. (2) Engine-Verdrahtung (Sim-Bootstrap, Bus-Subscriptions, RAF-Loop, Pointer-Pfade) aus GameView in `render/gameRuntime.ts` ausgelagert — GameView 399 → 260 LOC, Runtime 277, SpriteCache 96; der Godfile-Druck am Cap ist weg, Semantik 1:1 erhalten (A19-Zombie-Sim-Regeln im Effect-Deps-Kommentar gewandert).

- [B27] Übergangs-Befunde aus dem Review (UI→Gameplay, Breeding→Visual, Source→Runtime): (1) Brut-Kosten `BREED_COST = 35` waren hardcoded in BeetleLab — jetzt `BEETLE_BREED.nektarCost` in `beetles.source.ts` (Regel 6), UI liest nur. (2) Zucht- und Hub-Vorschauen (Greenhouse, MainMenu) zeigten den flachen `variant.color`-String — jetzt dieselbe Pipeline wie der Run (`genomeToVisualInput` → `resolveVisual` → `palette.base`); die Vorschau lügt nicht mehr über das Aussehen im Feld. (3) Tote Typen `RunEconomy` und `SeedOffer` aus `types.ts` entfernt (Import-Graph: null Konsumenten; SeedShop baut Offers lokal).

- [Gate] Agenten-Footer verboten (MSG006): „🤖 Generated with …“ und „Co-Authored-By: Codebuff <noreply@codebuff.com>“ schließen das Commit-Gate jetzt als Fehler — maschinelle Signaturen haben in der Historie nichts verloren. Menschliche Co-Authored-By-Zeilen bleiben erlaubt. Selbsttest um vier Fälle erweitert (14 bestanden).

- [B26] Audit-Freigabe: Die Audit-Änderungen (Genom→Visual-Split, Farb-Utils-Eine-Quelle, GameView/MainMenu-Memoisierung, i18n-Bereinigung, Versions-Bump-Schutz) sind committed. Dabei stellte sich heraus, dass der vorausgehende B24-Commit (`38564d5`) den verschobenen Tutorial-Test mit alter Import-Pfade-Fassung enthielt — der Cloudflare-Build lief deshalb rot (TS2307, `./controller` nicht gefunden). Lokal war der Stand längst korrekt; der Commit enthielt nur die halbe Strecke. Der Befund ist mit dem Commit `7c01208` behoben.
- [Chore] README-Aktualisierung (Shinon-Starter) und Versions-Bump 0.0.24 als eigener Commit nachgeschoben.

- [Audit] Godfile-Befund umgesetzt: Genom→Visual-Mapping (`genomeToVisualInput`, `genomeEffectIds`) aus `visual/generator.ts` nach `genome/visualMap.ts` verschoben (meta/store.ts importiert Genome-Logik nicht mehr aus visual/), `TYPE_BASES` als Content-Truth nach `config/genes.source.ts` (Regel 6), Farb-Utils (`hexToRgb`/`rgbToHex`/Shifts) dreifach-dupliziert → eine Quelle `core/color.ts` (generator, primitives, enemies), toter Produktionsexport `generateVisualForBase` in den Test verlagert, konstantes `shadow`-Feld aus `ResolvedVisual` entfernt.
- [Audit] GameView: `bredVisuals` als useMemo (vorher baute ghostVisual die deterministische Map bei JEDEM Hover/Drop neu), `plantIds` memoisiert, fünf FX-lose Bus-Subscriptions entfernt (SCORE/COMBO/COINS/TILE/BEETLE_REJECTED — HUD liest via hudOf), Hardcodes im HUD/Abbrechen-Button auf i18n (neu: `game.status`, `game.paused`) gestellt.
- [Audit] MainMenu: Styles in `mainMenuStyles.ts` ausgelagert (347 → 188 LOC, Muster gameViewStyles), Marquee/Footer über i18n (neu: `menu.marquee`, `menu.footer` — EN-Spieler lasen vorher deutschen Text), `createBaseVariants` memoisiert.
- [Audit] ~25 tote i18n-Keys entfernt (kompletter `debug.*`-Block, `game.waveOf/placing/clickGrid/reset/breed`, `hud.energy/lives/nektarEarned`, `menu.notOwned/loadoutFull/startRun`, `breed.chance/offspring/generation/collection`, `common.close/confirm`) — zweisprachige Doppelpflege ohne Konsument.
- [Audit] Versions-Audit: precommit.js bumpte nur package.json — src/version.ts (Anzeige, Lock via version.test.ts) blieb stehen und divergierte still (0.2.3 vs. 0.2.1, Test rot erst beim nächsten Lauf statt beim Commit). Das Script zieht die Anzeige jetzt mit, hat einen Doppel-Bump-Schutz (Session-Stamp in .git/) und stoppt den Auto-Bump bei 0.0.99 — die nächste Stufe ist eine Release-Entscheidung, kein Mechanik-Zufall. Zählung: Pre-Release 0.0.x.
- [B24] E2E-Harness als eine Quelle (`tests/helpers/harness.ts`): derselbe Werkzeug-Code lag vier- bis fünffach im Baum (startRun, devValue, freeCells, Game-Over-Pump); die vier Specs testen jetzt über einen gemeinsamen Harness — Progression-Laufzeit ~5 min → ~31 s.
- [B25] Haltbarkeitsleiste am Feld: verwelkende Pflanzen zeigen die Restzeit in den letzten 30 % ihrer Lebenszeit (Gelb = geschwächt) — vorher verschwanden bezahlte Pflanzen lautlos.
- [B25] Loadout-Zähler und Liste aus einer Wahrheit im Hub — der Zähler zählte Einträge ohne Bestand mit, die Liste sie nicht an.
- [B25] Codex als ehrliches Laborbuch: DE-Texte ohne Fachjargon-Mix, Fußnote sagt ausdrücklich, dass Entdeckungen auf dem Gerät bleiben (der Sync ist im Code ein reiner Stub).
- [Doku] README (Testzahlen, Roadmap-Tabelle), ROADMAP.md (Statuskopf) und quality-spec B24/B25 auf den Ist-Stand gezogen.

---

## v0.0.14 — Feld-Feedback, Versionsquelle, Tour-Frühstart (16.09.2026)

Diese Fassung schließt die zweite Spielerbericht-Runde ab: Das Feld reagiert auf den Spieler,
statt still zu sein.

- **Aufbauphase** (`4a30d7d`): Mit leerem Feld startet keine Welle mehr von selbst; das Fenster beginnt erst mit der ersten Pflanze (der Anker wandert mit — Warten kostet nichts). Der Wellen-Knopf bleibt jederzeit der manuelle Ausweg, kein Softlock.
- **Wellen-Knopf folgt der Phase** (`4a30d7d`): In der Vorbereitung steht „Welle starten" mit Countdown-Hinweiszeile; während der Welle eine deaktivierte Anzeige „Welle n läuft" — die Sackgasse „Start Wave tut nichts" ist zu.
- **Ablehnungsgründe sichtbar** (`4a30d7d`): FieldToast übersetzt die Gründe des PlacementControllers („Auf dem Weg ist kein Platz", „Zu wenig Energie", …), Zeitbasis Sim-Tick.
- **Score als Spielerzahl** (`4a30d7d`): „243.09999999999997" → „243" — gerundet wird nur in der Anzeige, die Sim bleibt exakt.
- **Onboarding beginnt nach der Sprachwahl** (`cfcbd99`): Die Krix-Tour gehörte GameView und konnte deshalb erst im Feld beginnen. Jetzt besitzt der Screen-Router sie — drei Stationen (Titel → Hub → Feld), Sprungregel, MetaSave v7 mit `tutorialVersion`.
- **Version aus einer Quelle** (`6daac50`): `src/version.ts` liest die Nummer, `version.test.ts` hält package.json und Anzeige zusammen — kein stiller Versionsdrift mehr.

---

## v0.0.13 — E2E-Suite, Krix-Onboarding, schnelles Gate (16.09.2026)

Die Fassung der Beweise: Was bisher nur behauptet wurde, ist jetzt test-gelockt — und das
Onboarding kommt ins Spiel.

- **E2E-Specs** (`5b6075d`): Progression, Mechanik und Gamebreaker als Playwright-Specs — Spielverlust über die echte Pipeline, Wellen-Marathon, Reifungs-Leiter. placeOnePlant wurde verschärft (eigener Variant am Sim-Zustand statt `plants.length > 0`), die Sim wird vor dem Aufbau eingefroren.
- **Krix-Onboarding** (`ffb9d37`): Animiertes Dialog-System mit Fineliner-Strichmännchen, Comic-Sprechblasen, Schreibmaschinen-Reveal und blinkender Handlungsanweisung auf die echten Bedienelemente; acht Feldnotizen in DE/EN; MetaSave v6 mit `tutorialDone`.
- **Gate 8 min → 8 s** (`350d1b2`): Inkrementeller Typecheck, Vitest-Modulcache, kein `npx` im Commit-Pfad; E2E bewusst aus dem Commit-Pfad genommen. Nicht abgeschwächt — fail-closed wie zuvor.
- **Tray zeigt Bestand im ersten Bild** (`350d1b2`): Der Befund kam aus der E2E-Suite — der Tray-Bestand kam allein aus dem RAF-Snapshot, bis zum ersten Takt standen alle Karten als „×0" da. Eine Quelle (`hudOf`) speist Takt und Erst-Anzeige (B22).
- **Doku nachgezogen** (`6140b98`): Arbeitsvertrag hält den verbindlichen Abschlussweg (Preview → E2E → Shinon) fest.

---

## v0.0.12 — Der Zucht-Loop funktioniert wieder (15.–16.09.2026)

Wirtschaftliche Korrektheit: Was der Spieler kauft, erreicht ihn — und was er säht, reift.

- **Keim-Bestand** (`a97daf7`): Ein Shop-Kauf keimt direkt zur Pflanze (`buySeedAndGerminate`, atomar, fail-closed ohne Nektar). Der alte Umweg über ein Samen-Ticket war ein Nektar-Drift: erster Klick zahlte, zweiter keimte gratis.
- **Wellen-Anbruch zählt** (`a97daf7`): Die Reifung zählt die angebrochene Welle (`WAVE_STARTED → +1`); Tod in Welle 1 bringt genau +1 — „keine Runde bringt was" ist strukturell unmöglich.
- **Loadout bedienbar** (`a97daf7`): Das Menü trennt Loadout (n/4, Mitnehmen/Ablegen) von der Sammlung — gezüchtete Pflanzen erreichen den Run.
- **Route aus dem State** (`07b058d`): Eine Routen-Wahrheit statt drei Kopien; `getRoute`/`setRoute` sind tot. Sim, Renderer und Terrain lesen denselben Ausdruck.
- **Zucht-Schleife erreichbar** (`07b058d`): Aussaat verbraucht keinen Seed-Stash mehr (der war strukturell immer 0 — das alte Gate machte die Schleife unerreichbar). Elternverbrauch bleibt beim Keep.
- Onboarding-Scan-Artefakte entfernt (`c039358`) — Fremd-Artefakt mit eigenem Skript-Backup widersprach dem Arbeitsvertrag.

---

## v0.0.11 — Fail-closed überall (15.09.2026)

Ein externer Review wurde gegen den Code geprüft: sechs Befunde bestätigt, zwei widerlegt.
Das Ergebnis ist eine Sim, die bei unbekannten Zuständen nicht mehr rät.

- **Reife fail-closed** (`1d2bfa7`): `claimBrood` wählt bei unbekanntem Index nicht mehr stillschweigend 0; `keepCross` nimmt den Index verpflichtend und prüft die Reife — der alte „Rückwärtskompatibilität"-Test war der Bypass und wurde invertiert.
- **Save-Downgrade in Quarantäne** (`1d2bfa7`): Ein älteres Save kann das neuere nicht mehr still überschreiben.
- **Inventar-Kappung räumt vollständig** (`1d2bfa7`): Keine hängenden Loadout-/bredStats-Referenzen mehr nach dem Verdrängen von IDs.
- **Mojibake-Gate** (`1d2bfa7`): Der Codex war CP1252-doppelkodiert — rekonstruiert und als Gate verboten, damit es nie wieder passiert.

---

## v0.0.10 — Identität und Kanon (15.09.2026)

Zwei Specimen trugen dieselbe id — reproduziert, nicht vermutet. Diese Fassung macht
Kennungen und Saves beweisbar eindeutig.

- **Monotone Brut-Kennung** (`d06afa4`): MetaSave v5 mit `broodGeneration`; die Migration leitet den Startwert aus der höchsten je vergebenen Kennung ab — nach einem Claim fällt der Zähler nie mehr zurück.
- **Eine Reife-Regel** (`d06afa4`): `isCrossReady` ersetzt zwei divergierende Regeln und ist fail-closed (unbekannt ⇒ nicht reif).
- **Kanonische Save-Checksumme** (`d06afa4`): Integrität inhaltlich statt über JSON-Key-Reihenfolge; Alt-Saves bleiben lesbar.
- **E2E im Gate** (`d06afa4`): Die Playwright-Suite wird zur eigenen Gate-Stufe registriert.
- **Placement modularisiert** (`f184de3`): Rules, Controller, Tray und Overlays aus GameView gezogen statt den LOC-Cap zu erhöhen; Resume-/Meta-Erweiterungen.
- **Sim-Härtung** (`ebb4913`): Snapshot-Kopien (`getSnapshot`/`getEventLog`) — UI/Tooling kann den Sim-State nicht mehr mutieren; IDB-Backend erhält denselben Quarantäne-/Checksum-Vertrag; atomares `consumeSeedAndEnqueueCross` (kein Zustand mehr mit verbranntem Seed ohne Cross-Entry); Run-Ende hängt am `GAME_OVER`-Event statt am RAF-Polling.

---

## v0.0.9 — Shinon: der einzige Git-Abschluss (15.09.2026)

Das Tooling bekommt einen Vertrag: Commit und Push laufen nur noch über einen Weg, mit
Gate davor.

- **Commit+Push-Executor** (`b935044`): Shinon war nur ein Gate ohne Vollzug — `core.hooksPath` zeigte ins Leere, ein post-commit-Hook pushte ohne Gate-Bezug. Jetzt: Starter (liest den realen Status, aktualisiert den README-Statusblock) → Gate (spezialisierte Prüfklassen) → Komponist (committet genau `commit_msg.txt`) → Push-Stufe (erst nach grünem Gate, mit Auth- und Upstream-Prüfung). Ohne neue Dependencies.
- **Struktur konsolidiert, Gates aktiviert** (`8f8f58d`).

---

## v0.0.8 — Repo-Struktur und Aufräumen (15.09.2026)

- **Doku-Karte** (`6585a3d`): Alle Dokumente in `docs/`-Unterverzeichnisse, kebab-case.
- **Lizenz & Präsentation** (`e2a74c8`).
- **Backup vor dem Groß-Umbau** (`e493c21`).
- **Hub-Bereinigung** (`0f8fa60`): Agent-Tooling aus der Oberfläche (`.agents`, `.claude`, `git-noir`, `memory`, `docs/art` ignoriert) — der Hub zeigt nur Spiel, Doku und Onboarding-Skill, kein Workflow leakt in die Release-Fläche.

---

## v0.0.7 — Screens, Terrain, erster Stabilitäts-Fix (14.–15.09.2026)

- **P0 Hook-Crash behoben** (`60d58dc`): Hook-Aufrufe vor die bedingte Rückgabe gerückt — React #310 ist tot, Start, Menü und Run ziehen wieder sauber durch.
- **Screen-Regie** (`60d58dc`): Gewächshaus, Shop, Brutlabor und Codex je eigener Screen mit Papier-Schnitt, Nav-Tabs, Chips und Dots als Wegweiser.
- **Kasten-CGI** (`60d58dc`): Terrain-Raster, Pfade und Blöcke aus der Source bepreist, Wegfreiheit geprüft, Geister-Vorschau blockt besetzte Felder; leichtes Lint-Gate unter fünf Sekunden.
- **Onboarding-Skill + Pflicht-Scanner** (`ff43cf2`, `b9d1baa`): lokales PASS/FAIL-Gate für Pflichtdateien.

---

## v0.0.6 — P1–P8: das Spiel wird vollständig (14.09.2026)

- **Game Over friert die Sim am Owner ein** (`c280ecd`): keine weiteren Wellen nach dem Verlust.
- **Shop als eigene Komponente** (`c280ecd`): Greenhouse wird zur reinen Zucht-Verantwortung.
- **Map-System** (`c280ecd`): Tile-Platzierung, Dijkstra-Routen, Spieler-Maps.
- **Käferzucht** (`c280ecd`): Brüten, Spawn 1×5, TAUNT, Tod-Spawn, BeetleLab mit eigenen FX.
- **Gene wirken** (`c280ecd`): Gen→Effekt-Mapping, alle Gene messbar — keine Deko-Gene.
- **Namensgenerator** (`c280ecd`): nahbare Präfixe/Suffixe, source-driven.

---

## v0.0.5 — Gates, Discovery-Chain, DevGate (14.09.2026)

- **Gates B–E** (`964d410`): Combo×Score, FX-Isolation, RunSave v2 mit Meta-Migration und Quarantäne, Renderer-Layer-Split (576→219), Pointer-Workflow ohne Hover, versionierte Transport-Verträge (Local/MockRemote).
- **Discovery-Chain** (`964d410`): append-only Hash-Kette, lokal-first, UNIQUE(genome_hash) — erste Entdeckung gewinnt; Codex-UI und `lifeseed:`-Sharing.
- **Cap-Splits ohne Cap-Erhöhung** (`964d410`): genome/, meta/, i18n/ aufgeteilt statt Grenzen aufzuweichen.
- **DevGate `?dev=1`** (`964d410`): DevOverlay mit Seed/Hash/EventLog/Partikel-Budget — nur hinter dem Gate, nie im Release.
- **Hygiene** (`d8e1883`): Eine geleakte `.env.local` (Tokens!) verlässt den Index — bleibt lokal, wird nie wieder getrackt.

---

## v0.0.4 — Kampfökonomie und Lebenszyklus (14.09.2026)

- **Auto-Wellen** (`a2600e3`): Nach 90 Ticks läuft die Welle von selbst weiter.
- **Kill-Münzen** (`a2600e3`): Jeder Kill vergibt deterministisch 1–5 Münzen (loot-Namespace).
- **Pflanzen-Lebenszyklus** (`a2600e3`): Wachsen je Seltenheit, Düngen nur im Wachstum (boostet Werte gegen Cooldown), Schwelle bei 30 % schwächt, Setzling-Halbzeit.

---

## v0.0.3 — Papercraft-Identität (14.09.2026)

- **Run-Identität aus Meta** (`2f4fd97`): `runId` lebt im persistierten Meta statt in einer React-Session — der Spieler behält seinen Run.
- **Bred-Visuals deterministisch** (`2f4fd97`): gezüchtete Pflanzen sehen aus wie ihr Genom (`ResolvedVisual`), Partikelfarben über Observer-Payload.
- **Paper-Welt** (`2f4fd97`): GameView als Notizzettel-HUD und -Tray — die erste echte Papercraft-Komposition statt einer dunklen HUD-Leiste; Art Direction B0/B4 verbindlich verankert.

---

## v0.0.2 — Deterministischer Kern (14.09.2026)

- **Neubau auf Modularchitektur** (`e62349f`): Der monolithische Sim-Worker wird ersetzt durch Fixed-Timestep-Clock, namespace-forked seeded RNG, stabile Entity-IDs, kanonischen State-Hash, Event-/Command-Buses und sechs Single-Writer-Systeme. Content source-driven, Visuals deterministisch aus dem Genom, 52 Tests beweisen Gameplay-Determinismus und FX-Isolation.
- **Release-Fläche lauffähig** (`e20acce`, `49ff364`, `bc87148`): README mit Banner, `.gitignore` deckt Builds/Env, die Vorschau zeigt nicht mehr einen toten alten Snapshot, neue Spieler starten mit Grundsorten im Gewächshaus.

---

## v0.0.1 — Erste Saat (14.09.2026)

- Initialer Commit (`f02614c`): das Projekt steht — ein Browser-Tower-Defense, bei dem gezüchtete Pflanzen die Türme sind.
