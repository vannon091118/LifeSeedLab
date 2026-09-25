# Changelog

Alle nennenswerten Änderungen an LifeSeedLab. Die Fassungen wurden **aus der Commit-History
rekonstruiert**: Jeder Eintrag fasst zusammen, was im Repository tatsächlich passiert ist
(Commit-Hashes in Klammern), älteste Fassung zuerst, neueste oben. Das Spiel ist im
Pre-Release — die Versionszählung läuft bewusst in kleinen Schritten (v0.0.x).

---

## Unreleased (Arbeitsstand 19.–24.09.2026)

- [Shinon/Entry] Der Shinon-Einstieg wird als Plain-Node-Grenze mit zentraler Argument-, Phase- und Check-Auswahl fail-closed ausgeführt; Hooks, Changelog-Prüfung und State-Sanitizing greifen auf dieselben Regeln zu. Belege: `tools/shinon/hook-entry.mjs`, `tools/shinon/cli-args.ts`, `tools/shinon/checks/`, `tools/shinon/state.ts` und die zugehörigen Tooling-Tests.

- [Shinon/Pipeline] Die Pipeline prüft den tatsächlich gestagten Index, unterdrückt den Post-Commit-Hook während des eigenen Push-Pfads und behandelt Remote-Divergenz, Upstream und Dry-Run als getrennte Verträge. Belege: `tools/shinon/pipeline.ts`, `tools/shinon/push-executor.ts`, `tools/shinon/git-helfer.ts`, `tools/shinon/tests/pipeline.test.ts` und `tools/shinon/tests/entry-push.test.ts`.

- [Worktree/Source] Die verbleibenden lokalen Änderungen werden übernommen: Versionswahrheit 0.0.99, entfernte ungenutzte Dependencies, lokale-only Discovery-Dokumentation, bereinigte Test-Helfer und die vom Shinon-Status erzeugte README-Zeile. Dadurch bleibt der Arbeitsbaum nach dem Abschluss tatsächlich sauber.

- [Worktree/Index] Die lokale Arbeitskopie wird vollständig konsolidiert: generierte Index-Ausgaben, Versionswahrheit `0.0.99`, Index-Skripte und die bereinigten Source-/Testverweise werden in getrennten Shinon-Slices übernommen. Fremde/generated Änderungen werden nicht mehr absichtlich im Worktree stehen gelassen.

- [E2E-Vertrag] Die Canvas-Sonde veröffentlicht Test-Events nun mit einer ableitbaren Event-ID und vollständigem `REWARD_GRANTED`-Payload; der gezielte Chromium-Single-Run für Visual-/Layout-/Erstsession-Specs ist 11/11 grün. Belege: `tests/helpers/canvasProbe.ts`, `tests/visual_probe.spec.ts`.

- [Roadmap T1–T11] Die T1–T5- und T8-Slices sind mit Code-/Testbelegen als erledigt konsolidiert; T6 bleibt wegen P-36, T7 wegen der Balanceentscheidung und T9 wegen B14.7 teilweise offen. T10 bleibt bis zur schriftlichen Produktentscheidung gesperrt, T11 bleibt externe Owner-Aktion. Belege: `docs/process/ROADMAP.md`, Domänen-Contracts und Devlog 25.

- [Simulation/Ownership] Root-Vektorwriter sind privat; Tests greifen nur über eine test-only Brücke zu, während die Produktion keinen Neben-Writer exportiert. Beleg: `src/simulation/root.ts`, `src/testing/vectorHooks.ts`, `vector_engine_gate.test.ts` (59 Tests), `tsc -b --noEmit`.

- [Slop/Identität] Test-only Transport-/ObservationSerializer-Dateien, der tote `maxLibrary`-Wert und der No-op-Discovery-Sync werden entfernt; echte Discovery- und Identitätstests bleiben. Beleg: `src/meta/identity_invariants.test.ts`, `src/discovery/chain.ts`, `src/config/beetles.source.ts`; Voll-Suite und Build grün.

- [Gate/Codex] Untracked-Quellen werden als dauerhafter `untracked-inputs`-Check behandelt; Index- und Codex-Änderungen sind getrennt testbar, Clipboard-Erfolg ist ehrlich und technische Hashes liegen in Details. Belege: `tools/shinon/checks/untracked-input-check.ts`, `tools/indexer/input-policy.ts`, `src/components/Codex.tsx`, `tests/codex_clipboard.spec.ts`; Tools-Suite 82/82, Build grün.

- [Roadmap T1–T9] Persistenz- und Meta-Grenzen liefern jetzt Ergebnisverträge, Source-Preise und atomare Schreibpfade; Laufweg-, Event- und Welt-Guards sind fail-closed. Die Route-Probe nutzt für die reine Existenzfrage BFS statt Dijkstra. Belege: `src/persistence/storage.ts`, `src/persistence/runSave.ts`, `src/meta/economy.ts`, `src/bus/bus.ts`, `src/world/world_state.ts`, `src/simulation/mapSystem.ts`; Voll-Suite 75 Dateien / 718 Tests, Build grün. T10 bleibt bis zur Produktentscheidung gesperrt, T11 bleibt externe Eigentümeraktion.

- [CI] Der nächste frischen-Checkout-Befund ist ebenfalls behoben: `scripts/e2e-lane-map.mjs` wird als Vertragsdatei der Vitest-Suite sichtbar gemacht, ohne den manuellen Playwright-Lauf wieder zu aktivieren.

- [CI] Der GitHub-CI-Contract wird wieder aus einem frischen Checkout heraus ausführbar: Der bereits vorhandene Golden-Hash ist als Repository-Secret hinterlegt, das von der Test-Lane benötigte `scripts/test-lane-verdict.mjs` ist nicht mehr ignoriert, und die Quality-Register-Prüfung hat ihren eindeutigen B5.1-Contract-Stand.

- [Index] Die Modulindizes für i18n und Meta werden als letzter kleiner Nachtrag aktualisiert, damit die generierte Navigation den bereits committed Source- und Testverträgen entspricht.

- [Meta/Genom/Tests] Kreuzung, Reifung, Wirtschaft, i18n und die zugehörigen E2E-Specs werden als zusammengehöriger Vertragsstand nachgezogen. Die lokalen Unit- und Integrationsprüfungen bleiben vollständig im normalen Testpfad; Browserläufe bleiben davon getrennt und werden nur auf ausdrückliche Anweisung gestartet.

- [Produktpfad] Der lokale Produkt-Slice bündelt die überarbeiteten UI-, Konfigurations- und Simulationsverträge mit ihren Dokumentations- und Testanpassungen. Die Änderungen bleiben im bestehenden Single-Owner-Modell; automatische CLI- und Gate-Läufe führen weiterhin keine Playwright-E2E-Tests aus.

- [Cleanup/Gate] Tote Browser-Use-/dotenv-Abhängigkeiten und die ungenutzte LLM-Bridge werden aus dem Produktpfad entfernt; der Golden-Anker bleibt lokal sichtbar überspringbar und in CI fail-closed. Der Index-/Doku-Vertrag bekommt dafür die passende Commit-Grenze.

- [Zucht/Meta] Die Genom-Kreuzung und der Meta-Lifecycle werden als getrennter Slice mit zehn vererbbaren Slots, run-lokalem Seed und fail-closed Reifung belegt. Die Tests prüfen nicht nur grüne Mutation, sondern auch die Lebenszyklus-Grenzen; unklare +50%-Gameplay-Behauptungen werden nicht als Beweis verkauft.

- [Slice Discovery/Codex] Run-lokaler Seed, SHA-256-Share-Format, Worker-Rekonstruktion und die ehrliche lokale Codex-Oberfläche werden als ein prüfbarer Produktpfad gebündelt. Die README-/i18n-Texte beschreiben genau den lokalen Nachweis, nicht erfundene Online-Garantien.

- [E2E-Single-Run] **Der nächste Produktloop-Lauf ist auf genau einen Versuch mit Trace gepinnt.** `PW_SINGLE_RUN=1` erzwingt in `playwright.config.ts` einen Worker, `retries=0`, `trace: 'on'` und ein isoliertes `test-results/single-run/`-Artefakt. Der Sprint-Abbruch gilt auch bei Rot: Trace sichern, keinen zweiten Lauf starten.

- [Build-Gate] **Vite-Warnungen sind jetzt ein Fehler, kein grüner Zettel.** Die ineffectiven Dynamic-Import-Grenzen zwischen Greenhouse/Discovery und den statischen Importen wurden an der Quelle bereinigt; die sekundären Screens werden als echte `React.lazy`-Chunks geladen. Der Produktionsbuild liegt dadurch bei 373,91 kB Initial-Chunk statt 546,96 kB, ohne Dynamic-Import- oder Chunk-Warnung. `vite.config.ts` wandelt jede verbleibende Build-Warnung in einen Exit-1-Fehler um; `tests/buildWarningGate.test.ts` pinnt diese Regel. Belege: `src/App.tsx`, `src/i18n.tsx`, `src/components/Greenhouse.tsx`, `vite.config.ts`, Build 195 Module / 5,21 s.

- [P-15] **Krix-Notizen sind später freiwillig nachlesbar.** Nach dem bewussten Überspringen bleibt die Tour abgeschlossen und der Hub bietet eine read-only Notizübersicht mit allen 20 kanonischen Schritten in DE/EN. Der Review schreibt weder `tutorialVersion` noch Simulation und startet keine neue Tour. Belege: `NotesReview.tsx`, `components_tutorial.test.ts`, `tests/notes_review.spec.ts`.

- [E2E-Harness] **`expect.simBound` war eine Phantom-API und hätte jeden Run-Test vor der Messung abgewürgt.** Der Harness registrierte zwar einen Matcher über `expect.extend`, rief aber eine nicht vorhandene Methode am Expect-Objekt auf; der direkte TypeScript-Lauf der neuen Specs fand den Fehler (TS2339). `expectSimBound(page)` ist jetzt eine normale async Hilfsfunktion mit einer klaren Assertion, beide Start-/Pump-Pfade nutzen sie, und der Test-Typecheck ist grün. Die Bindungsprüfung wartet zusätzlich mit einem begrenzten Playwright-`expect.poll`, damit der Canvas nicht schon als Beweis für den noch ausstehenden `useEffect`-Mount genommen wird. Der E2E-Nachweis bleibt dem Shinon-Gate vorbehalten; diese Zeile behauptet keinen separaten Lauf.

- [Produktloop] **Der Erstsession-Test behauptet keinen Einkommen aus einem pflanzenlosen Run.** Die Spec platziert die Leihe wirklich, liest die Reifungsschwelle aus dem Queue-Eintrag und finanziert den zweiten Samen über den echten Meta-Stand; `MetaView` spiegelt dafür `nektar`, `pots` und `seedlings`. Der blinde Preview-Lauf hat außerdem P-36 (Center-Platzierung ohne Kill-Box) als offene Onboarding-Frage dokumentiert. Belege: `tests/first_session_loop.spec.ts`, `tests/helpers/harness.ts`, Devlog 24.

- [Indexer] **Untracked ist jetzt ein Befund, kein stiller Bestand.** `index:build` liest zusätzlich zu `git ls-files` die untracked Dateien aus dem Git-Arbeitsstand; `index:check` nennt jede untracked TS/TSX/Asset-Datei ausdrücklich und beendet sich rot, selbst wenn die generierten Dateien zufällig bytegleich aussehen. Damit kann eine neue Datei nicht mehr als „Index aktuell“ durchgehen, bevor sie im Git-Index liegt. Regressionstest: `tools/indexer/inventory.test.ts`; Werkzeug-Lane: `tools/vitest.config.ts`.

- [Indexer] **Der Index war blind für die neue Datei — jetzt ist die Regel im Werkzeug.** Der Krix-Slice `b6e0b4e` brachte `src/components/tutorial/bubbleLayout.ts` neu mit, aber der vor dem Commit gebaute Index zählte `src/components` noch mit 55 Dateien: `inventory.ts` liest bewusst `git ls-files`, und die neue Datei war zum Build-Zeitpunkt noch untracked. `index:check` war trotzdem grün — es regenerierte denselben unvollständigen Stand, also bestätigte der Check die Abwesenheit statt sie zu melden. Nach dem Commit machte ein frischer Build den Unterschied sichtbar (`components 55 → 56`, `.index/index.json` +2300 Zeilen). Behoben in zwei Schritten: der irreführende Kommentar in `repo.ts` („getrackt oder nicht“) sagt jetzt die Wahrheit („getrackt“), `inventory.ts` hält die Folge fest (neue Datei ⇒ `git add` VOR `index:build`), und der Index ist neu erzeugt und geprüft. Beleg: `index:check` grün, `INDEX.md`/`src/components/INDEX.md` mit dem neuen Modul, Commit folgt als Index-Nachtrag.

- [B21] **Krix redet nur, wenn auf dem Screen etwas passiert — Dialoge als Ereigniskette statt Textwand.** Die Tour bestand aus langen Absatz-Blöcken, die pro Station alles auf einmal erklärten, und ihr Text stand auch dann auf dem Schirm, wenn der Spieler gerade nichts getan hatte. Jetzt ist jeder der **20 Einträge** (10 Prompt/Reaktion-Paare, `TUTORIAL_VERSION = 5`) an genau einen Screen und genau eine Ereigniskante gebunden: Der Prompt erklärt **eine** Handlung (`langChosen`, `screenLeft`, `cardSelected`, `placed`, `layoutDone`, `waveStarted`, `paused`, `running`), die Reaktion erscheint erst nach dem echten Ereignis (`press`); ein wiederholter Zustand ist kein Ereignis, dann bleibt Krix still. `skipIfCurrent` verhindert die Endlosschleife bei bereits eingetretener Lage (z. B. automatisch gestartete Welle), die Sprungregel lässt Vorrennende weiterziehen. Die Texte sind auf **20 Ein-Zeilen-Notizen** gekürzt und gemessen: **DE 1512 Zeichen, Ø 76, Maximum 93; EN 1351 Zeichen, Ø 68, Maximum 87** — im selben ironischen Krix-Ton, aber ohne Vorlesung. Die Blase hat wieder einen echten Papierhintergrund (der Screenshot-Befund: Text lag transparent über den Hub-Karten), `bubbleLayout.ts` + `data-tut-avoid` halten Blase und Figur aus den markierten Karten heraus, und die alte Versions-/Popup-Blocker-Fußzeile lebt nur noch hinter dem DevGate (`?dev=1`) — in der Release-Fläche ist sie weg. Belege: `tsc -b --noEmit` sauber, die drei Vertragsdateien (`components_tutorial`, `i18n_texts`, `qa_befunde`) 45/45 grün, Commit-Lane 470/470, `index:check` grün nach `index:build`; E2E-Beweis `tests/krix_bubble.spec.ts` (Release-Pfad `?tutorial=1` ohne DevGate). Verträge: `docs/quality/contracts/ui.md` B21.2–B21.6, `docs/process/ROADMAP.md` P-5/P-21.

- [Repo] **Aufraeumung: was nicht auf GitHub gehoert, ist jetzt auch nicht mehr dort.** **Datenleck behoben:** `Findings_LLM_Slop.md` lag im Repo-Root und enthielt 48 Verweise im Format absolute `file:///…`-Pfade auf den lokalen Arbeitsplatz — jeder einzelne hat den lokalen Benutzernamen und die Ordnerstruktur des Arbeitsplatzes veroeffentlicht und war fuer jeden anderen ein toter Link. Die Datei wandert nach `docs/quality/slop-audit.md` (Inhalt bleibt: 22 Erkennungsmuster sind Projektwissen, kein Werkzeugmull), alle 48 Pfade sind auf relative Repository-Verweise umgerechnet, die beiden Devlog-Verweise nachgezogen. **Entfernt, weil nachweislich unbenutzt:** `.planning/` (6 Agenten-Scratch-Dateien, null Referenzen aus Code, CI oder Doku), `rtk.toml`/`rtk.ps1`/`bin/rtk.cmd` (lokale Agent-Tooling-Konfiguration, auch wortweise geprueft null Treffer — der Rest des Repos kannte das Wort nicht). **`shinon.lock` in `.gitignore`:** es war das einzige nicht-ignoriertes ungetracktes Artefakt im ganzen Baum und haette beim naechsten `git add -A` still mitcommittet. `supabase/migrations/` bleibt bewusst drin — das Schema ist die dokumentierte Entscheidung hinter dem local-first-Spiegel, kein Rest. **P-17 unveraendert in der Sache, aber entschieden:** zwei echte Tokens stecken in `f02614c` (Vorfahre von `origin/main`). Der Eigentuemer entscheidet gegen eine History-Umschreibung und fuer Widerruf + Neuausstellung — ein Rewrite loescht den Wert nur aus `origin/main`, waehrend ein widerrufener Token ueberall wertlos ist. Der verbleibende Schritt ist ein reiner Handgriff des Eigentuemers und steht als solcher im ROADMAP. Beleg: keine absoluten `file:///`-Pfade und keine Maschinenpfade mehr im gesamten getrackten Markdown; Null-Referenz-Pruefung vor jeder Loeschung.
- [Indexer] **Navigation entsteht: generierter Index aus dem echten Code (Slice 1).** `tools/indexer/` erzeugt aus einem einzigen `ts.Program` + TypeChecker die Beziehungsquelle `.index/index.json` (modules, files, symbols, relations, strings) und daraus den Root-`INDEX.md` sowie einen `INDEX.md` je Modul — eine Datenbasis, mehrere Ansichten, keine zweite Wahrheit. Determinismus ist Zusage, nicht Zufall: gleicher Zustand + gleiche tsconfig ⇒ bytegleiches Ergebnis (belegt), keine Zeitstempel, stabile Sortierung, repository-relative POSIX-Pfade. `index:check` regeneriert in-memory, vergleicht byteweise und schreibt niemals etwas — ein Prüfer, der beim Prüfen repariert, verdeckt genau die Abweichung, die man sehen wollte. Die harte Auflösungsgrenze ist die wichtigste Eigenschaft: was der TypeChecker nicht eindeutig belegt, wird `unresolved` + sichtbar, **nicht** geraten — ein plausibel aussehender, teilweise geratener Graph ist schlimmer als keiner. Externe Pakete (`react`, `node:fs`) sind davon bewusst getrennt: sie liegen per Definition außerhalb des Repositorys und sind keine offene Stelle. Zwei Befunde, die nur der Index sehen konnte: `src/` trägt 12 lose Dateien ohne Ownership (App, types, config, genome, meta, i18n, version — `types.ts` mit Fan-in 56), und `tools/shinon/tests/test-lane-verdict.test.ts` importiert `scripts/test-lane-verdict.mjs`, das **nicht im Git-Index** liegt — der Test läuft lokal, in jedem Klon bricht er. Beleg: tsc sauber, `index:check` grün, Doppel-Build bytegleich.
- [Sim/Bus] **Befund-Sprint 23.09.2026, Scheibe 1/3 — die Belohnungs-Wahrheit der Simulation:** **P-31** (Kill-Text lügt): die Buchungsmenge (`grantedNektar`) reist im `REWARD_GRANTED`-Payload — der Observer zeigt später nur, was der Writer buchte, statt die Formel `max(1, floor(reward/5))` im Präsentationspfad nachzubauen. **P-33** (Reise kapppt still): Verwerfen bucht Ankunft — die Kappung ist kein Verlust mehr, der Vertragstest pinnt 10 Flüge ⇒ 8 Reisen + 2 Ankünfte. **P-29** (Wellen-Bonus ohne Senke): nur alle 10 Wellen, kombostaffelt über die neue Wellen-Wahrheit `waveBestMult`/`waveBestMultWave` im Combo-Writer (Reset in `onWaveStarted`, EIN Writer), Content in `economy.source.ts` (`WAVE_BONUS_*`), Gutschrift in `nektarEarned` (echte Buchung via `recordRunEnd`), weltlose Buchung = Ankunft am Zähler statt erfundener Welt-Ort; bewusst NICHT in den Hash (vollständig aus Events ableitbar, null Anker-Drift). **P-28**-Vorarbeit: `PROJECTILE_FIRED` trägt px/py, `DAMAGE_DEALT` trägt die `effectId`. Dazu die Pflicht-Fixtures der Combo-Contract-Erweiterung (8 Testdateien) und der Events. Belege dieser Scheibe: tsc sauber, Voll-Suite grün; die Korrektur des gateB-Pins (1.4 statt 1.1) ist offen benannt — das Kampf-Fenster trägt bewusst über die Wellengrenze, nur die Wellen-Wahrheit resetet. Slice abgeschlossen: Gate grün (tsc, Commit-Lane, 716/716, CSZ000, VRF000), Scheibe 2/3 folgt.
- [Sim/Bus] **Scheibe 2/3 — FX-Ehrlichkeit:** **P-27** (grow/death tot): grow-Animation gezeichnet (Renderer-Zweig), death-Ghost mit mitgereistem `variantId` überlebt den State-Exit (`PLANT_WITHERED` spliced VOR dem Emit — Kette gelesen, nicht geraten). **P-28**: `muzzle_puff` wird emittiert (Ort aus dem neuen px/py-Payload). **P-34** (Einschlag unsichtbar): Effektfarbe aus der echten `VECTOR_VISUAL_SOURCE` (kein Kopieren), `spawn_spore`/`bubble_pop` vergrößert (gemessen: [0.04,0.09]@fadeInOut war im Einschlagframe nicht nachweisbar); Sonde beweist die Effektfarbe am Punkt. Slice abgeschlossen: Gate grün (tsc, Commit-Lane, 716/716, CSZ000, VRF000).
- [UI] **Scheibe 3a/3 — Layout-Regie und B0-Hygiene:** **P-12** (Tile-Werkzeug schaltet sich ab): `selectTile` ist kein Umschalter mehr — Zweitklick bleibt im Werkzeug, räumt nur eine Ablehnung weg; Asymmetrie zur Pflanzen-Karte dokumentiert (B3 bleibt dort: Bestand≠Serienbau). **P-25** (Tray verdeckt Ausgang): Tray verlässt das Brett (stage-Fluss, `trayDock`), N4-Magie-Zahl `bottom:190` gestorben (Hint frame-relativ); dabei echter Root-Cause: das Canvas trug sein Altmaß (gemessen 501 px im 432-px-Frame) — `gameRuntime` beobachtet den Frame per ResizeObserver. **P-24**: der ✕ wohnt als Werkzeug-Tag in der Tray-Leiste. **P-30** (B0): vier Ink-Glyphen in `GameIcons`, alle Emoji-Pills (Tabs, Preise, ErrorBoundary, Boot-Fallback) ersetzt, B0-Wache-Test gegen Rückfall. **P-5/P-13** (nachgemessen): Blase im Viewport ohne Kartenüberdeckung, alle Tray-Karten frei. Belege: tsc sauber, Vitest 716/716. Slice abgeschlossen: Gate grün (tsc, Commit-Lane, 716/716, CSZ000, VRF000), Vertrag in `ui.md` nachgezogen.
- [Prozess/E2E] **Scheibe 3b/3 — Prozess-Wahrheiten und E2E-Regie:** **P-32**: WIDERLEGT für die installierte Version (drei Proben: Dep-Edit, Testfile-Edit, `--no-cache` — frische Kompilate); Register-Zeile mit Spur. **P-35**: Last-Vorbedingung als PID-Lock (globalSetup, zweiter Lauf bricht mit klarer Meldung ab statt flaky rot), `testMatch` auf `*.spec.ts`, `tests/**` im Vitest-Include für die Vertragstests der E2E-Garde. **P-5/P-13** als E2E-Regression gebunden. Verträge nachgezogen: ui.md, ROADMAP §3. Belege: E2E **38 passed + 1 skipped** in 2,2 min, visuelle Sonde 3/3; Korrektur-Pins (gateB 1.4, Anker-Trennung, Puls-Schwelle 20) sind Kontrakt-Folgen eigener Umbauten, offen benannt. Sprint abgeschlossen: alle drei Scheiben committet, QA-Berichte konsolidiert, Doku nachgezogen.
- [Render/UI] **Status am Wesen ablesbar (B0.7) + Reward-Reise (B5.1) — Arbeiten der Parallel-Session committed:** Gegner tragen jetzt sichtbare Status-Signaturen (`drawEnemyStatus` in `render/layers/enemies.ts` + Vertragstest `enemyStatus.test.ts`: Slow = Frostkreis, Brand = flackernde Funken, Gift = Doppelbogen, Flicker-Phase aus dem Sim-Tick, nie der Wanduhr) — vorher wirkten Burn/Poison, ohne je am Tier zu erscheinen. Dazu die Reward-Reise (Quelle → Bewegung → Ziel → Ankunft): `REWARD_GRANTED` trägt den echten Kill-Ort statt ihn zu verwerfen, der Flug läuft als Präsentations-Kommando über `FeedbackLayer` (quadratische Kurve, Ankunfts-Pop), der HUD-Chip „Nektar“ (B7.4-Slot) zählt live (0 → 10 → 132 im Preview-Beweis). UI-Randpflege in `GameOverlays/GameTopBar/PlacementTray/SeedShop/gameViewStyles/index.css`. Belege der Parallel-Session: Suite 697/697, E2E 30/30, Preview Desktop + 390×844 mit Pixelprobe (Gold-Centroid wandert Richtung Anker). Register-Befunde bleiben: P-27 (grow/death nicht gezeichnet), P-28 (`muzzle_puff` tot), P-29 (Wellen-Bonus ohne Senke).
- [Gate] **Die Versions-Wahrheit wird nicht mitcommittet (VRF001):** neue Shinon-Prüfkasse `VersionFilesCheck` blockiert `package.json` und `src/version.ts` im Index — der Regel-0-Hook hebt beide als **uncommitteten Vorsprung +1** an, und Commit `d924a17` hatte sie trotzdem im Index, weil keine Prüfung diesen Vertrag kannte (das alte Gate ließ es durch — dein Befund: „das darf Shinon gar nicht durchlassen“). Der Check urteilt ausschließlich über den Index (uncommittete Dateien im Arbeitsbaum sind der Normalzustand), ist als Default-Check registriert und im Tooling-Test gepinnt (4 Fälle). Nebenbei der vorbestehende Tooling-tsc-Fehler geschlossen (`Severity` jetzt exportiert — seit der Registry-Erweiterung blockierte er jeden sauberen Tools-Typecheck). Belege: Tools-Typecheck sauber, Tooling-Suite 76/76, **Live-Beweis**: `package.json` gestagt → Gate `GESCHLOSSEN` mit VRF001 → unstagen.
- [Sim/Render] **Playtest-Befunde 21.09.2026 — drei Defekte, eine Ursprungskette, alle gemessen statt vermutet:** (1) Vector-Decals und Attraktor-Ringe saßen diagonal versetzt („Toxin rechts auf der falschen Feldseite, jede Runde exakt dieselbe Stelle“): `drawVectorField` addierte `(ox, oy)` OBWOHL der Renderer den Kontext bereits dorthin translated — die einzige Schicht mit Doppel-Offset, jetzt Welt-Koordinaten × cell wie alle anderen. (2) Vector-Deposits hatten keine Weltgrenze: der Chebyshev-Radius eines Rand-Deposits schrieb Geister-Zellen außerhalb der Welt, die nie zerfallen (TTL-Refresh) — Sonde über 2600 Ticks: **4,97 Mio. Zellen** (−19…37 × −24…38), Sim-Einfrieren inklusive. Clamp in `addCell` + Diffusions-Zielen; der Goldene Anker driftete dadurch (erstaunlicherweise diffusionsten Geister-Zellen vom Rand HER zurück in die Welt — Verschmutzung als Feature) und wurde nach Vertrag lokal erneuert (`GOLDEN_BOOTSTRAP=1`, Vector-Gate 59/59; **neuer Hash muss ins CI-Secret `GOLDEN_HASH`**). (3) Der eingesetzte Brutling lief frei ohne Pfad und konnte die Welt verlassen — Clamp für Leader und Mit-Brutlinge in `updateBeetle`. Belege: tsc beides sauber, Suite 697/697, Probe-Flugzeit 63 s (Timeout) → 67 ms.

- [Gate] **Die CSZ001-Slice-Grenze wird im Repo-Standard geschärft:** `shinon.config.json` senkt `commit.maxFiles` von 150 auf 25. Der Check (`commit-size-check.ts`) liest ausschließlich diese eine Config-Zahl — das daneben liegende `shinon.lock` (untracked, von keinem Modul gelesen) ist nur das Laufzeit-Artefakt eines früheren Lock-Laufs. Damit gilt die 25er-Grenze ab jetzt ohne lokale Sonderkonfiguration, in jedem Klon. Mitgereist sind die vom Regel-0-Hook angehobenen Versionsdateien (0.0.95 → 0.0.96, `package.json` und `APP_VERSION` synchron).
- [Docs/Merge] **Attraktor-Fix (`eccfede`) integriert, divergierende History aufgelöst.** `eccfede` war ein Hotfix auf `origin/main` während lokal 10 Rebase-Slices liefen — beide Seiten brachten dieselbe `vectorAttractor.ts` mit (byte-identisch, Befund bestätigt), aber unterschiedliche Sortierstrategien in `hash.ts` und `vectorSystem.ts`. Root-Cause: der Remote-Commit brachte noch `localeCompare` mit, der lokale Rebase hatte es bereits durch `compareCodeUnits` ersetzt (Determinismus-Fix 20.09.2026). Auflösung: lokale Versionen gewinnen in allen 5 Konflikten (`hash.ts`, `vectorSystem.ts`, `package.json`, `version.ts`, `plantHmac.ts`-Delete). `localeCompare` bleibt aus dem Spielcode verbannt. Merge-Commit durch Shinon.
- [Docs] **README von Krix neu geschrieben** — Cover, `<details>`-Akkordeons für technische Tiefe, Krix-Ton (Praktikant mit gebremster Begeisterung, aber sonst kennt er nix Besseres). Alte Testzahl im Badge entfernt (war 570, war falsch, war Meinung — jetzt ein neutrales „laufen gerade"). Cover generiert und unter `docs/cover.jpg` eingepflegt.

- [Belege] **Die dritte Stufe des Sprint-Abschlusses war leer — jetzt hat sie ein Instrument.** In 693 Unit-Tests und 34 E2E-Specs stand keine einzige Pixelaussage; „Silence is not feedback" war eine Review-Meinung. Neu: `tests/helpers/canvasProbe.ts` (Schwarzbox, keine App-Importe) mit den drei Primitiven Frame-Freeze (`freeze`/`stepFrame`/`resume` — der Loop-AST wird GESICHERT, nicht gelöscht, deshalb ist der Freeze überlebbar), Farb-Centroid (exakt UND Farbton-Modus) und Regionen-Vergleich (`capture`/`delta`, optional auf eine Farbe gefiltert). Darauf `tests/visual_probe.spec.ts` mit den drei Kernmomenten und je einer Negativ-Kontrolle: **Belohnungsreise** (Gold-Dots wandern und LANDEN auf dem HUD-Anker: letzter Flug-Frame ≤ 3 px), **Treffer** (im Einschlags-Frame erscheinen am gemeldeten Punkt neue Tinten-Pixel = die Schadenszahl des Observers; 5 Frames später genau das Ruheniveau) und **Ablehnung** (roter Puls GENAU auf der getippten Zelle, kein Zustandswechsel, kein Verbrauch). Belege: 6 Läufe grün, volle E2E-Lane grün bis auf Last-Timeouts (s. u.), Suite 693/693. **Drei eigene Fehlmessungen, offen benannt statt versteckt:** (1) der Treffer wurde zuerst in der Effektfarbe gemessen — exakt ±24 ⇒ 0 Pixel in 28 von 28 Frames, während im selben Fenster ~100 blassgrüne Pixel stehen, die dem GEGNER gehören (eine grüne Assertion, die nichts belegt); (2) das Messfenster wurde über `cellWindow(cellRect(…))` gebaut und lag damit eine halbe Zelle neben dem Punkt (Glyphe abgeschnitten); (3) die Baseline wurde NACH dem Zeichnen des Einschlags-Frames gemerkt, also wurden zwei Nach-Treffer-Bilder verglichen (13 statt ~50 Pixel). Alle drei sind mit der gemessenen Ursache im Test dokumentiert.
- [Sim] **Der Gegner-Tod war stumm: jeder am Schaden-über-Zeit-Effekt gestorbene Gegner verschwand ohne `ENEMY_DIED`.** `enemySystem.damageDirect` (der Tick-Pfad von Gift/Brennen) zog HP ab und emittierte `DAMAGE_DEALT` — der Todeszweig fehlte, also gab es keinen Score, keinen Nektar, keinen Kill und keinen Todes-Effekt. Aufgefallen ist es an einem Balance-Mitschnitt: Welle 7 plante 26 Gegner, meldete **1** Kill und **0** Lebensverlust, obwohl die Welle als abgeschlossen galt (Queue leer + keine Gegner) — die Bücher gingen nur mit ID-Verfolgung auf: 107 gespawnt = 42 gestorben + **63 stille Abgänge**. In-process bewiesen (`DoT=1 · Gegner 1→0 · DAMAGE_DEALT=1 · ENEMY_DIED=0`) und behoben; Lock: `src/simulation/enemy_death.test.ts`. Wirkung bei identischem Seed und 3000 Ticks (Mitschnitt, nur die Meldung geändert): `ENEMY_DIED` **42 → 106**, stille Abgänge **63 → 0**, Score je Welle **4–7× höher**, Nektar **~2×** — das ist die Größe des Defekts in Ökonomie-Einheiten, nicht eine Stilfrage. Suite 693/693 (die Golden-Anker der Vektoren-Engine halten, der Fix ändert nur gemeldete Tode).
- [B5] **Der Einschlag ist in der Effektfarbe nicht sichtbar — nur die Zahl ist es.** gemessen über 28 Frames in zwei Läufen: im Fenster um den gemeldeten Einschlagpunkt liegt in JEDEM Frame **kein** Pixel des Effekts (`#a3e635`, `EFFECT_PIERCE → VECTOR_TOX`) innerhalb ±24, und die ~100 blassgrünen Pixel, die dort stehen, ändern sich gegenüber dem Vorher-Bild nicht — sie sind der Gegner, nicht der Treffer. Ursachen im Owner: `DAMAGE_DEALT` zieht seinen `impact_ring` in Papierfarbe `#d9c9a3` (Papier auf Papier, `observers/visualObserver.ts`) und `spawn_spore` ist mit `size: [0.04, 0.09]` Zellen und `alphaCurve: 'fadeInOut'` zu klein und zu blass, um sich vom Untergrund zu lösen. Sichtbar ist die Schadenszahl (Tinte, 18×15 px Glyphe, gemessen am Punkt) — die Sonde pinnt genau diese Antwort. Als **P-34** ins Register (Entscheidung nötig: Effekt einfärben, größer zeichnen oder Profil streichen), nicht in dieser Scheibe behoben.
- [Architektur/Drill] Der Mutations-Drill ist in vier Zuständigkeiten getrennt: `tools/shinon/mutate.ts` ist nur noch Ablauf und CLI (auswählen, Sandkasten aufbauen, Baseline prüfen, je Mutation anwenden/laufen/zurücknehmen, Bilanz, Exit-Codes), daneben stehen `drill/registry.ts` (was mutiert wird: Daten, Registry-Selbstcheck, fail-closed-Auswahl), `drill/worktree.ts` (wo es läuft: isolierter Worktree, Spiegelung des Arbeitsstands, node_modules-Verknüpfung, Anwenden/Zurücknehmen/Abbau samt Wiederholung gegen Index-Sperren) und `drill/verdict.ts` (wie gelesen wird: Vitest-Ausgabe, Baseline-Wache, Verdikt je Mutation). Die Datei schrumpfte von 355 auf 61 Code-Zeilen reinen Ablauf (die vier Module zusammen liegen bei 413 — der Unterschied ist die Bezahlung der Grenze: Importe, Exporte, Modulköpfe; dafür ist jede Zuständigkeit allein lesbar); die Verdikt-Leiter liegt jetzt bei der Ausgabe, die sie liest, und ist damit ohne Worktree testbar. Dabei fiel toter Code auf und wurde entfernt: der Filter gegen die Baseline-Fails (nach der Baseline-Wache garantiert leer) und der unerreichbare Leerlauf-Schutz in der Auswahl; der leere/Whitespace-Filter zählt jetzt korrekt als „keine Einschränkung“ statt als leere Auswahl. Neu abgesichert: die fail-closed-Auswahl selbst (`vererbung,giebt-es-nicht` → Fehler, jede Klasse hat Mutationen, leerer Filter = ganze Registry) — die war zuvor nur behauptet, nicht geprüft. Verhalten unverändert, im eigenen Sandkasten belegt: roter Ausgangsstand → `NICHT BEWERTBAR: BASELINE-ROT` mit namentlichem Test und Exit 2, gedrillt wurde nichts; gesunder Ausgangsstand → M1 und M3 je GEFANGEN mit benannten Wächtern (M3 über den deterministischen Spawn-Pacing-Vertrag). Zwischenbefund aus dem Sandkasten: ein schon verbogener Anker wird VOR der Baseline als „Registry blind“ abgewiesen (Exit 1) — ein zweiter, eigener fail-closed-Abbruch neben der roten Baseline. Registry-Selbstcheck gegen den aktuellen Arbeitsstand: alle 18 Anker greifen. Tooling-Suite 72/72, Tooling-Typecheck bis auf einen vorbestehenden Fremdfehler (`checks/index.ts:14`, nicht dieser Slice) sauber, src-Suite 692/692 grün (Hauptbaum, nach dem Umbau gemessen). Nichts committet — Abgabe über Shinon.

- [Review/Drill] Eine rote Baseline ist kein Ergebnis mehr: Der Mutations-Drill prüft den unmutierten Ausgangsstand jetzt VOR der ersten Mutation und bricht bei einem einzigen roten Test mit `BASELINE-ROT` ab (Exit 2, betroffene Tests namentlich) — vorher lief er durch und verbuchte Mutationen, deren Wahrnehmung durch den Altfehler verdeckt war. Der genaue Anlass war der heutige Regel-0-Zwischenstand einer Parallelsession (`version.test.ts`, im Hauptbaum rot, im Drill der Baseline-Fail): Mit ihm ließ sich „kein Test reagiert“ nicht von „lag schon vorher rot“ trennen — genau so waren vier ungedeckte Hebel (Kraft-Index, Gacha-Elterngewicht, Rollen-Vererbung, Aura/Reflex) als Rauschen durchgegangen. Dafür drei neue Vertragsfälle im Werkzeug-Test (`baselineBefund`), und die frühere Flaky-Kategorie ist weg: Mit grüner Baseline bedeutet `UEBERLEBT` beweisbar „kein Test reagiert“, mit roter Baseline gibt es gar keine Bilanz. Verifiziert: Tooling-Suite 65/65; Lauf gegen den aktuell roten Hauptbaum → `NICHT BEWERTBAR: BASELINE-ROT` mit Nennung von `version.test.ts`, Exit 2, keine Bilanz; Lauf gegen einen grünen Scratch-Worktree (HEAD plus eigener Slice, fremde Dateien unangetastet) → M1–M4 4/4 GEFANGEN (M3 über den deterministischen Spawn-Pacing-Vertrag), N1–N5 5/5 GEFANGEN — die Biss-Semantik bleibt unverändert. Nebenbei: der Tooling-Typecheck `tsc -p tools` ist für die neuen Dateien grün (Node-Shim um `execSync`/`cpSync`/`mkdtempSync`/`node:os`/`path`-Named-Exports und `console`/`URL` erweitert, `allowJs` für den `test-lane-verdict.mjs`-Import); offen bleibt allein der vorbestehende Fremdfehler `tools/shinon/checks/index.ts:14` (`Severity` nicht exportiert), der nicht zu diesem Slice gehört.

- [Genome/Drill] Der Mutations-Drill kennt jetzt die Genome-Domäne: vier neue Klassen (`vererbung`, `phaenotyp`, `gacha`, `werte`) mit 14 Mutationen in Zuchtkern, Phänotyp-Adaptern, Wurf und Genom→Werte-Ableitung, dazu `--id` für gezielte Einzelprüfungen. Befund der ersten Runde: 9/9 gefangen (Träger-Dämpfung, kanonische Gen-Ordnung, Drift-Kurve, Streu-Seed, Interaktions-Produkt, Gründer-Farbanker, Besitz-Sortierung, Eltern-Ausschluss) — die Zucht ist auf diesen Pfaden bewacht. Die Tiefensonde auf semantische Hebel ohne eingefrorenes Fixture fand dagegen vier echte blinde Flecken: der Kraft-Index gewichtete Dominanz mit 1.3, die Gacha-Elternwahl schwache Pflanzen mit 1/(1+Kraft), die Sonderfähigkeiten (`heal_aura` ab Wahrnehmungsschwelle, `reflect` für Wand mit thorns) und die Rollen-Vererbung des Kindes (70 % Elterntyp / 30 % Schütze) waren nirgends gepinnt — je eine Mutation drehte sie still, ohne einen roten Test. Alle fünf sind mit Verträgen geschlossen (Kraft-Index-Gewichtung und Nuancen der Spur liegen in `breeding.test.ts`, Eltern-Gewichtung und Rollen-Verteilung in `gacha.test.ts`, Aura/Reflex in `cross.test.ts`), Biss im Drill nachgewiesen: 5/5 GEFANGEN. Das Werkzeug selbst wurde dabei viermal nachgeschärft: ein Lauf, der nur die vorher roten Tests zeigt, gilt als UEBERLEBT statt als Flaky (ein blinder Fleck hatte sich als Rauschen getarnt), mehrzeilige Anker lesen die CRLF-normalisierte Wahrheit (der frische Worktree checkt mit autocrlf aus), die node_modules-Junction wird nur als Link gelöst (acht Worktree-Leichen und das Risiko eines rekursiven Loeschvorgangs beseitigt), und eine Auswahl ohne Treffer bricht ab, statt eine makellose 0/0-Bilanz zu melden. Beleg: tsc sauber, Tooling-Suite 62/62, Drill 5/5 gefangen; im Voll-Lauf bleibt allein `version.test.ts` rot (uncommitteter Regel-0-Zwischenstand einer Parallelsession, im Drill als Baseline-Fail gefiltert und deshalb dort als möglicher blinder Fleck gemeldet, nie als Fang gezählt).

- [Map/Findling] Der Findling fällt (Entscheidung 21.09.2026): `MapTileType` = pot | decor. Blockieren ist eine Aussage, und der Topf (`walkable: false`) macht sie bereits — ein zweiter reiner Blocker war Redundanz und Fracht für Shop-Posten, Startbestand, i18n (DE+EN), Sprite, Tutorial-Copy und jeden Test-Fixture. Drei stille Lügen fielen dabei mit auf: `rootCommands.ts` trug `tile: 'boulder'` als fest verdrahteten Träger in drei `TILE_REJECTED`-Payloads (beim Verkauf steht jetzt die Kachel WIRKLICH auf der Zelle, beim Feld-Kauf ein leerer Träger statt einer erfundenen Kachel), und `gameover_notice.test.ts` verdiente `max_count` am Findling-Deckel 6 ab — das prüft jetzt die Deko (`maxCount` 20, begehbar, also ohne `route_blocked`-Störung). **Der geometrische Softlock-Schutz geht damit an die Integritätsregel über:** mit 24 Töpfen ist eine volle Spaltenmauer möglich, einzige Schranke bleibt `route_blocked` (der letzte freie Weg bleibt stehen — genau das R2-Design). Doku: B3 in `contracts/ui.md`, B38 in `contracts/simulation.md`, die Kachel-Aufzählung in `contracts/visual.md` und Krix' Copy (DE+EN) nachgezogen. Belege: tsc sauber, Suite 68 Dateien mit ausschließlich dem fremden `version.test.ts`-Rot, E2E-Vertrag `mobile.spec.ts` auf die Topf-Karte gezogen, Live-Preview zeigt zwei Kacheln (Flower Pot, Decor).
- [Map/Weg] Der Weg ist kein Baumaterial mehr: `MapTileType` (damals noch) = pot | boulder | decor, das Weg-Tile (Gewicht 0,6) ist aus `config/map.source.ts` gestrichen — samt Startbestand, Shop-Posten, Tray-Karte, Sprite-Case und dem toten Path-Autoconnect (`resolvePathConnection`). Grund: Der Laufweg ist das ERGEBNIS des Pathfindings (R2/B16.1); eine Kachel, die den Weg nur ANZIEHT, machte die Route wieder zur Eingabe und stellte ein zweites Weg-Bild neben die gezeichnete Strecke. `PLACE_TILE` mit `path` antwortet jetzt `unknown_tile` — ohne Material-Abzug, ohne Karten-Write. Neu gemessen (Seed 2447771834, `maze_balance.test.ts` als Vertrag): Pflanzen sind eine ORTS-Schraube (Laufweg bleibt 22 = kürzestmöglich, nur die Gasse wandert; eine Pflanze genügt), die LÄNGE schrauben nur BLOCKER (zwei versetzte Topf-Wände: 44 statt 22 Felder). Die alte Weg-Bahn-Messung in `contracts/simulation.md` B38 ist als Vorgänger-Messung markiert, B3 in `contracts/ui.md` nennt die damals drei Kacheln. Krix' Tutorial-Copy nachgezogen („Du baust den Weg" war ab jetzt eine Lüge). Beleg: tsc sauber, alle 13 berührten Testdateien grün (Suite 682 Tests in 68 Dateien; rot bleiben zwei Fälle, die diese Änderung nicht verursacht: `version.test.ts` gegen eine uncommittete Hook-Version und ein 5-s-Timeout in `meta/identity_invariants.test.ts`).
- [B3/Tray] Leere Karten werden ausgeblendet (Playtest-Befund „Wurzelmauer ×0"): Pflanzen- und Bau-Kasten zeigen nur noch Karten mit Bestand — ein nicht wählbarer Platz mit ×0 sah wie eine Option aus, war aber keine. EINE Regel für beide Kästen (`cardsWithStock`, getestet), der Controller bricht die Auswahl bei Bestand 0 weiterhin selbst ab (Q17). E2E-Vertrag in `run.spec.ts` entsprechend nachgezogen (Karte WEG statt `aria-disabled`, plus Beweis, dass ein weiterer Platzierungsversuch nichts mehr pflanzt).
- [Regel 1] `simulation/root.ts` von 268 auf 215 Code-Zeilen: die Schuss-Auflösung (Blitz-Ableiter über den Leitfähigkeits-Dijkstra, Projektilstart, Vector-Deposit je Schuss) wandert als `simulation/plantShot.ts` in ein eigenes Modul mit Ownership-Vertrag — es hält keinen State und schreibt ausschließlich über die vier System-Ports (`VectorSystem.deposit`, `VectorAttractor.spawn`, `ProjectileSystem.fire`, `EnemySystem.apply*`), die Aufruf-Reihenfolge im Inneren ist vertraglich festgehalten. Verhalten bit-identisch: Golden-Hash-Anker, Suite 672/672, Gate `loc-caps` + `forbidden-patterns` offen (215/300 bzw. 76/300 Code-Zeilen).
- [Review] Die Slice-Regel wird eine Prüfung: Shinon-Check `commit-size` (Fehler `CSZ001`) blockiert Commits über `commit.maxFiles` (Default 25) Dateien im **Index** — der 152-Dateien-Commit `eccfede` mit Bugfix-Titel wäre damit nicht mehr durchgekommen; Selbsttest deckt Grenzfall und leeren Index ab.
- [Review] Die Testzahl driftet nicht mehr: `scripts/test-count.mjs` misst Tests und Dateien in der offiziellen Lane, `--check` weist abgeschriebene Zahlen in `README.md` ab (dasselbe Muster wie `quality-register --check`), CI veröffentlicht den Messwert; das Skript musste dafür in `.gitignore` freigegeben werden — der Doku-Referenz-Check hat die tote Referenz gefunden.
- [Review] `localeCompare` ist aus dem Spielcode verbannt: neues Kernmodul `core/order.ts` (`compareCodeUnits`, reiner Code-Unit-Vergleich), angewendet an allen acht Fundstellen (Genom-Hash `chain.ts`, Zustands-Hash `hash.ts`, Tie-Break im Leitfähigkeits-Dijkstra `vectorSystem.ts`); Gate-Regel „Deterministische Reihenfolge" plus Baum-Test. Dieselben Gen-IDs sortierten unter cs-CZ/da-DK/lt-LT anders als unter en-US — ein tschechischer Browser hätte einen anderen `genome_hash` ergeben.
- [Review] `plant_hmac` heißt jetzt `plant_ref`: der Feldname versprach einen HMAC, der Code war ein schlüsselloser FNV-Mischwert. Weil der Name im gehashten Payload steht, ist das eine Schema-Migration (v3): Feld umbenannt, Wert-Präfix `ph-` → `pr-`, Kette als Ganzes neu verkettet (`codex_migration.ts`), SQL-Spiegel `002_plant_ref.sql`; nebenbei die nie verdrahtete v1→v2-Wanderkette in `codex.ts` angeschlossen, die still Saves verworfen hätte.


- [Rebase Correction] Vier übersehene historische Dateien nachgetragen; selbst der Slice-Zähler bekam einen kleinen Käfer.
- [Rebase Slice 6] Kernzustand und Shinon-Verkabelung werden getrennt statt als historischer Brei serviert.
- [Rebase Slice 5] Simulations- und Renderpfade kommen in einer weiteren kontrollierten Scheibe.
- [Rebase Slice 4] Noch ein begrenzter Block; der Commit-Riese wird Stück für Stück entzaubert.
- [Vector-Gate] Golden-Hash-Anker fail-closed: fehlt `tools/.tmp/vector_golden_hash.txt`, ist der Test rot, statt den Ist-Wert still als Anker zu schreiben; Sichern nur noch bewusst via `GOLDEN_BOOTSTRAP=1`, CI injiziert den Wert aus dem Repo-Secret `GOLDEN_HASH` (Cross-Platform-Determinismus wird damit erstmals erzwungen statt angenommen). Bei Drift benennt der Test die erste abweichende Feldzelle (IST-only-Diagnose, Anker-Format v2).
- [Wave-Vertrag] Spawn-Pacing-Vertragstest: je Tick muss ΔQueue = ΔGegner gelten — die Red-Team-Mutation „Queue still ausdünnen" (`shift`→`splice(0,2)`) überlebte zuvor die komplette Suite und schlägt jetzt mit Tick-Genauigkeit an.
- [Shinon/Drill] Mutations-Drill als wiederholbares Werkzeug (`tools/shinon/mutate.ts`): vier Klassen (Logik, Ökonomie, Spawn, Persistenz), isolierter Worktree je Lauf mit Spiegelung des Arbeitsstands (Diffs + untracked), fail-closed beim Nicht-Greifen der Mutation, Flaky-Filter über Baseline, Bite-Bilanz mit Exit-Code. Erster E2E-Lauf: 4/4 gefangen.
- [Gate-Fix] `test-lane.mjs` verlor bei Pipes Teile der Vitest-Ausgabe (`process.exit` direkt nach `stdout.write` schneidet ungeflushete Reste ab) — Exit läuft jetzt über `process.exitCode`, zusätzlich Struktur- und ANSI-Fix im Skript.
- [test-lane] Voll-Lauf-Budget deterministisch statt Wanduhr: die gemessene Zeit ist Information (ms/Test gegen die Norm 25), anhaltende Langsamkeit nur bei Wiederholung bei gleicher Suite-Größe, Struktur-Befund ab 1000 Tests — Last-Spitzen auf geteilten Maschinen erzeugen keinen Fehlalarm mehr (Befund: derselbe Lauf 8,4 s ungelastet vs. 34,6 s unter Parallellast).
- [Vector-Gate] Wanduhr-Perf-Test ersetzt: statt `< 200 ms je 20 Ticks` (flakte unter Parallellast bei gesundem Code, 256 ms gemessen) sperrt der Test jetzt deterministisch die Feld-Sparsamkeit — Zellzahl ≤ Deposits × (2r+3)², also Fußabdruck plus genau ein Diffusionsring. Biss-Beweis: Schwelle-entfernt-Mutation → 1047 Zellen > 980, rot; Last kann den Test nicht mehr fälschlich rot machen.

- [Rebase Slice 3] Der nächste historische Block bleibt klein; selbst Git darf heute einmal ordentlich atmen.
- [Rebase Slice 2] Die historische Änderung bleibt in kleinen, prüfbaren Scheiben; Git darf weiter so tun, als sei ein 152-Dateien-Commit eine Persönlichkeit.
- [B5.1] Die Belohnung reist sichtbar: echter Kill-Ort im Payload statt erfundener Rastermitte, quadratische Bahn zum neuen Nektar-Zähler im Run-HUD, Ankunfts-Puls am Zähler (visual.md B5.1, ui.md B7.4). Der dadurch tote Partikel-Profileintrag `reward_flight` ist gelöscht; die bei der Sichtprüfung gefundenen, **nicht** behobenen Punkte stehen im Register (ROADMAP P-27 `grow`/`death`-Animation, P-28 `muzzle_puff`, P-29 Wellen-Bonus ohne Senke).
- [B5.1] Gegenprüfung der eigenen Scheibe: der Kopf-Dot landete nicht am Zähler, sondern brach bei 95,5 % der Bahn ab (`p = 1 - life/maxLife`, letzter Lebens-Tick fehlte) — live gemessen 13 px vor dem Chip, jetzt 0 px (`flightProgress`, per Test gepinnt). Gefundene, **nicht** behobene Punkte: ROADMAP P-31 (Kill-Zahl `+10` vs. Zähler-Delta `+2`), P-32 (Verifizierungspfad meldete Grün auf altem Modul-Kompilat), P-33 (Reise kappt still bei 8 Flügen).


### Für Spieler

- **Deine Sammlung zeigt jetzt Pflanzen statt Farbpunkte.** Im Hub stand neben jedem Samen ein
  kleiner Farbpunkt — jetzt siehst du dasselbe Bild, das später im Beet steht, gezeichnet aus
  derselben Ableitung. Die Karte kann damit kein anderes Wesen ankündigen als das, das wächst.
  Alte Spielstände mit unbekannten Samen zeigen bewusst ein neutrales graues Feld: lieber kein
  Bild als ein gelogenes. Die Spielversion steht damit auf **v0.0.74**.

- **Die Brutkandidaten sind jetzt sichtbar verschiedene Tiere — und die Gründer tragen wieder ihre
  eigenen Farben.** Vorher trugen in den meisten Bruten alle drei Kandidaten dieselbe Hauptfarbe,
  und die drei Gründer sahen **alle gleich** aus (dreimal dieselbe Farbe); ihre in der Source
  dokumentierten Farben — Blatthüpfer grün, Schildkäfer olive, Hummel gold — wurden gar nicht mehr
  gezeichnet. Beides ist behoben: die Gründer tragen ihren dokumentierten Anker, die Zucht streut
  über die gehegte Palette, und die Formunterschiede sind sichtbar. Alle Messwerte dazu stehen in
  Devlog 21 (`docs/process/devlog/2026-09-20_21_kaefer-sichtbarkeit.md`).
- **Die Karte sagt dir, was das Tier wert ist.** Jeder Kandidat zeigt ein Farbfeld (Panzer- und
  Musterfarbe) und nennt den Abstand zum stärksten Tier der Brut — `HP 107 −26 · ATK 4 · ×1`
  gegen `HP 133 · ATK 4 · ×1` —, statt drei Zahlenreihen zum Vergleichen.

- **Run-Top-Bar bricht mobil um (P-2).** Auf 390×844 ragte „Exit Run“ 29 px aus dem Bild
  (Reihe 407 px, `flexWrap: nowrap`). Die rechte Knopf-Gruppe umbricht jetzt rechtsbündig
  (Reihe 366 px, kein Knopf außerhalb); Desktop bleibt unverändert. Der DoD-Punkt „Mobile
  geprüft“ ist seit dieser Runde ein tragender E2E-Test (`tests/mobile.spec.ts`: Top-Bar,
  roter Geist auf der schließenden Zelle, Tray per synthetischem Klick).

- **Der Geist warnt jetzt, bevor ein Bau den Weg schließt.** Wenn du Findlinge oder Töpfe so
  setzen wolltest, dass kein freier Weg mehr übrig wäre, zeigte dir der Umriss bisher ein
  GRÜNES Ja — abgelehnt wurde erst beim Loslassen. Jetzt ist der Umriss dort rot und der Grund
  steht dabei („Das wäre der letzte freie Weg"). Es ist dieselbe Regel wie beim Bauen, nur
  vorher gefragt: das Spiel verspricht nichts mehr, was es gleich darauf zurücknimmt.
- **Die Werkzeug- und Kartenleiste ist mit der Tastatur bedienbar.** Die Karten nahmen Berührung
  und Maus an, aber keinen Tastendruck: Wer mit Tab auf „Spross" stand und Enter drückte, löste
  nichts aus — dasselbe galt für Vorlesewerkzeuge und für Agenten, die das Spiel prüfen. Jetzt
  wählt Enter (und jeder echte Klick von außen) genauso aus wie ein Finger, ohne dass ein
  Mausklick doppelt zählt.

- **Deine eigenen Pflanzen lassen sich wieder setzen.** In manchen Spielständen stand in der
  Leiste „Spross (Keim 6) ×1" — aber egal wohin du getippt hast, es passierte nichts: der Lauf
  kannte die Zahlen dieser Samen nicht mehr. Jetzt holt er sie beim Start aus dem Erbgut der
  Pflanze selbst, also stimmen Anzeige und Wirkung wieder überein. Betrifft alte Spielstände;
  neue Pflanzen waren nie betroffen.
- **Der Entwickler-Blick verdeckt nichts mehr.** Im Dev-Modus (URL mit `?dev=1`) lag das
  Diagnose-Fenster über der Werkzeugleiste und schluckte die Klicks: Karten ließen sich nicht
  mehr auswählen, das untere Drittel des Feldes nahm keine Berührung mehr an. Das Fenster ist
  jetzt reine Anzeige, nur sein FX-Schalter nimmt Klicks.

- **Der Blumentopf tut jetzt, was auf ihm steht.** Vorher war er nur ein Klotz im Weg, obwohl die
  Beschreibung „Platz für Pflanzen" versprach. Jetzt verstärkt er die Pflanze, die auf ihm steht —
  und seine FARBE sagt, wie: Bernstein mehr Schaden, Violett mehr Reichweite, Moos schießt
  schneller, Rost mehr Leben. Die Farbe gehört zur Stelle, nicht zum Kauf: dieselbe Stelle behält
  sie, du kannst also planen. Die FELD-Karte nennt alle vier Wirkungen.
- **Der Weg-Zähler sagt jetzt, was er meint.** Statt „WEG-GÜTE 100 %" (was auch für eine
  Treppe galt, die gar nicht gerade ist) steht oben die echte Laufweg-Länge und daneben der
  kürzeste mögliche Weg: „LAUFWEG 26 · min 16". Je weiter die zwei auseinanderliegen, desto
  länger stehen die Gegner unter Beschuss — genau das, worauf du beim Bauen hin spielst.
- **Die Brut zeigt dir drei echte Wahlen.** Bei manchen Kreuzungen sahen die drei Kandidaten
  zwar unterschiedlich aus, trugen aber exakt dieselben Kampfwerte — zwei Bilder desselben
  Tiers. Jetzt achtet das Spiel beim Würfeln auch auf die Werte und sucht weiter, bis sich die
  Kandidaten wirklich unterscheiden (bei gleichen Elternarten notfalls über ein neues Gen).
- **Die Käfer laufen jetzt wirklich.** Vorher standen die Beine still, während der Körper sich
  zeitgesteuert auf und ab schob — das Auge liest das als Gleiten. Jetzt treten sie im
  Dreibein-Schritt (Insekten-Gang), und die Schrittfolge hängt an der ZURÜCKGEGLEGTEN STRECKE:
  schneller laufen heißt schnellere Schritte, verlangsamt heißt langsamere, und wer steht, steht
  still. Kein Tritt mehr ins Leere, kein Schweben.
- **Krix ist wieder lesbar.** Im Handlungsschritt klappte die Sprechblase sich selbst auf eine
  Titelzeile ein — und der Knopf zum Aufklappen war gleichzeitig nicht anklickbar. Man sah den
  Text also nie. Jetzt steht die Notiz vollständig da, bis du sie wegklickst („✕ Gelesen", mit
  „▸ Notiz" jederzeit zurück) oder der nächste Schritt kommt. Getippt wird nur noch, wo die Blase
  selbst der Knopf ist — niemals dort, wo du wegklicken kannst und den Rest nie gelesen hättest.
- **Krix redet jetzt über DIESES Spiel.** Das Onboarding hat vorher einen Ablauf erklärt, den es
  nicht mehr gibt (Energie, „Material aus dem Vorrat", neue Karte pro Runde). Jetzt erzählt er,
  was wirklich gilt: dein Beet ist Besitz und bleibt, der Lauf beginnt MIT DEM BAUEN, Nektar
  verdienst du im Beet und gibst ihn im Flur aus, Samen/Tiles/Deko sind drei getrennte Vorräte —
  und die Käfer nehmen immer den schnellsten freien Weg, den DU gelegt hast.
- **Deine Karte bleibt — auch im nächsten Lauf.** Ein neuer Lauf startete auf der leeren
  Startkarte, obwohl du längst gebaut hattest. Schlimmer: sobald du dort etwas gesetzt hast,
  überschrieb das Spiel die gebaute Karte auch im Speicher — sie war wirklich weg, nicht nur
  unsichtbar. Jetzt liest jeder Lauf die Karte aus deinem Speicher, und gebaute Objekte bleiben,
  bis DU sie zurücksetzt.
- **Pflanzen schießen nach ihrem Erbgut.** `swift` lässt Schüsse schneller fliegen, `pierce`
  durchschlägt mehr Gegner (bis vier), `crit` erhöht die Krit-Chance (bis 35 %). Vorher waren
  das Zahlen auf der Karte, die den Schuss selbst nicht berührten — alle flogen gleich schnell.
- **Der zweite Effekt einer Pflanze wirkt jetzt.** Eine Blüte mit zwei Effekten verlor bisher
  den zweiten: es reiste nur der stärkste mit. Jetzt wirken beide — Schaden bleibt einmalig,
  der zweite Effekt setzt seinen Status (Brennen/Gift/Verlangsamung).

- [Fix/Spieltest v0.0.71] Zwei Befunde der Spieltestsession behoben, beide mit Beleg statt Behauptung: (1) **Weg-Integrität in der Vorschau** — der Geist zeigte auf der letzten Wegzelle grün, weil `placementRules` die Integritätsregel bewusst nicht vorab prüfte und `GhostCell.reason` nirgends gerendert wurde. Neu: `MapSystem.wouldClosePath` fragt dieselbe `computeRoute`-Regel read-only ab (mit zwei aus dem Regelwerk abgeleiteten Vorprüfungen — `walkable` schließt nie, und eine Zelle außerhalb des aktuellen Laufwegs kann ihn nicht schließen, was das O(V²)-Pathfinding auf die seltenen Fälle begrenzt), `SimulationRoot.wouldClosePath` ist der Zugang, `PlacementController` lehnt damit lokal mit `route_blocked` ab. Kein zweites Regelwerk: die UI fragt die Sim, statt zu raten. (2) **Tray-Aktivierung** — die Karten hatten nur `onPointerDown`; ein `<button>` wird von Tastatur/Screenreader/synthetischen Klicks aber über `click` (detail 0) aktiviert. Neuer `cardPress`-Vertrag in `components/PlacementTray.tsx` (Pointer UND Klick, ohne Doppel-Auslösung — echte Zeigegeräte liefern detail ≥ 1). Belege: `placement_map.test.ts` (Probe true ⇔ TILE_REJECTED `route_blocked`; Probe schreibt nichts: Zustand, Route und Event-Log unberührt; +2 Naht-Locks für die Cache-Invalidierung), `placementController.test.ts` (+5 Fälle Geist/Ablehnung/Reihenfolge), `placementTray.test.ts` (+4 Fälle Aktivierungsvertrag), Browser-Gegenprobe 6/6 (synthetischer Klick, `element.click()`, Tastatur-Enter, echter Mausklick doppel-frei) — mit entfernter Klick-Bindung wird GENAU die Tastatur-/Synthetik-Strecke rot, der Pointer-Pfad bleibt grün. **Nachbesserung aus dem adversarialen Review (noch im selben Task):** die Probe ist ein Dijkstra und kostet gemessen 0,80 ms (12×12), 3,28 ms (24×24) bzw. 26,77 ms (64×64) — pro `pointermove` wäre ein ruhender Zeiger auf einer Laufweg-Zelle in einer gewachsenen Welt ein eingefrorener Frame gewesen. Sie hängt jetzt an einem Antwort-Cache auf der **Kartenrevision** (`MapSystem.mapRev`, gehoben in `placeTile`/`removeTile`/`expandMap` — vollständig, weil `mapTiles` und die Fläche ausschließlich dort geschrieben werden): Wiederholung 0,0016 ms, Regel unverändert `computeRoute`. Live-Nachweis auf der laufenden Partie: UI-Tap schließt den Weg ⇒ Toast `route_blocked` und KEIN `TILE_REJECTED` am Bus (lokale Ablehnung, kein Command); derselbe Bau per Command direkt in die Sim ⇒ Bus meldet `route_blocked` (Positiv-Kontrolle, beide Seiten dieselbe Regel). Suite 569/569, getrackte E2E 27/27.
- [Docs/Quality] `quality-spec.md` domänenweise aufgeteilt: aus einer Sammel-Datei (1367 Zeilen, Befunde A1–A19 + Specs B0–B38 gemischt) wurden ein **Register** (124 Zeilen) plus **8 Domänen-Contracts** unter `docs/quality/contracts/` — je Domäne **genau ein Owner-Contract** (Owner, Writer, Readers, LOC-Caps, Befunde, Spec, DoD an einer Stelle). Zuschnitt folgt der Ownership-Karte in AGENTS.md: core, simulation, genome, meta, persistence, visual, ui, process. Die historischen IDs (A…/B…) sind **unverändert** und bleiben die stabile Referenz aus Code, Tests und Historie; das Register trägt die ID→Contract-Tabelle. Dabei entdoppelt: `A13.12` war zweimal vergeben (Doku-Dopplung **und** Zucht-Schleife) — die Doku-Dopplung heißt jetzt `A13.14` (Referenzen in Gate-Header, Config-Kommentar und CHANGELOG mitgezogen), die Zucht-Schleife behält `A13.12`. Inhaltsbeweis statt Vertrauen: 993 nicht-leere Originalzeilen gegen 1179 neue geprüft — die 8 Abweichungen sind ausschließlich die gewollten Umschreibungen (Titel, Part-A/B-Header, alte A13.12-Überschrift), kein Befund und keine Spec-Zeile verloren. Beim Prüfen der ID-Tabelle fand ich einen **eigenen Fehler aus dem Split**: drei Register-Zeilen waren aus gekürzter Anzeige abgeschrieben und mitten im Wort abgeschnitten (`B23` „zwei Spielerberich", `A13.14`, `B32`) — dazu war die Tabelle unvollständig (74 von 143 IDs). Sie ist jetzt **generiert statt getippt**: `scripts/quality-register.mjs` schreibt sie aus den Contract-Überschriften, liest die Domänen-Reihenfolge aus der Domänen-Tabelle des Registers selbst (keine zweite Liste) und prüft mit: doppelte ID ⇒ Abbruch, Contract ohne Domänen-Eintrag ⇒ Abbruch, Waise ⇒ Abbruch, rohes `|` ⇒ Abbruch. `--check` lief gegen eine echte Mutation rot und nach der Reparatur grün; der Prüflauf hängt jetzt zusätzlich in CI. Dabei wurden drei Fehlbefunde des Doku-Checks sichtbar: Links ohne `./`-Präfix löst er gegen die Repo-Wurzel auf, Markdown dagegen gegen das Dokument — 80 gemeldete „tote Referenzen" waren ausschließlich dieser Doppelauslegung geschuldet. Das Register schreibt die Links jetzt explizit und hält die Konvention als Regel 6 fest.
- [Regel/Gate] **Float-Exaktheit** festgeschrieben (`architecture-contract.md` §6, AGENTS.md, Domänen-Contract `simulation.md`): in `src/simulation/**` und `src/config/*.source.ts` sind `Math.pow`, `Math.hypot` und **alle Transzendenten** verboten; erlaubt bleiben die exakten Operationen, `Math.sqrt` und `abs/min/max/floor/ceil/round/trunc/sign`. Grund: `pow`, `hypot` und die Transzendenten rechnen intern über `exp`/`log` und sind plattformabhängig gerundet — ein daraus entstehender Spielzustand ist nicht über Maschinen hinweg derselbe. Durchgesetzt in zwei Reichweiten mit EINER Regelliste: die Gate-Regel „Float-Exaktheit" (Diff-Scope, `include: ['src/simulation/', 'src/config/*.source.ts']`; dafür bekam `ForbiddenRule` ein `include` und ein Pfad-Matching, das Präfix und `*`-Muster kann) plus der Baum-Test `tools/shinon/tests/determinism_rule.test.ts`, der denselben Check mit ALLEN Dateien des Geltungsbereichs fährt — weil das Gate nur geänderte Dateien sieht und ein unberührter Verstoß sonst unsichtbar bliebe. Der Baum-Test ist 3-fach: Scope nicht leer und exakt die zwei Einträge, kein Verstoß im gesamten Baum, und eine Gegenprobe auf einem Wegwerf-Baum, die belegt, dass die Regel beißt (`pow`/`hypot`/`sin` gefunden, `sqrt`/`abs`/`max` nicht, `*.test.ts` in `config/` außerhalb). **Ein echter Verstoß war im Scope vorhanden:** `driftFor` rechnete mit `Math.pow` — jetzt eine Multiplikationsschleife, die ausschließlich exakte Operationen benutzt. Gemessen: mit den echten Kurvenwerten (`retain 0.62`) sind Schleife und `pow` über g=1…500 **bit-identisch** (maximale Differenz exakt 0) — die Kurve bleibt also unverändert und die Balance unberührt; nur der plattformabhängige Rundungspfad ist weg. Die Messung ist nicht taub: mit `retain 0.85` weichen sie bis 5,6e-17 ab. `Generation 1 = start` gilt exakt und ist gepinnt. Belege: Gate gegen einen eingestagten Verstoß **rot** (2 Fehler, `sqrt` nicht geflaggt), nach dem Aufräumen offen · Tooling-Suite 37/37 · Projektsuite 539/539.
- [Gate] Zwei belegte Defekte im Gate-Umfeld mitbehoben, beide über die Doku-Regel hinaus: (1) Die **Changelog-Pflicht hing allein an `shinon.config.json`** — `GateChecks` deklarierte kein `changelog`-Feld, `checks/index.ts` las es trotzdem, und ein Klon ohne die JSON hätte den Check stillschweigend abgeschaltet (`enabled['changelog'] === true` gegen `undefined`). Jetzt steht der Default `changelog: true` im Typ wie bei jedem anderen Check, die JSON darf ihn nur übersteuern; ein Test in `tools/shinon/tests/checks.test.ts` hält das. (2) Der **Tooling-Typecheck war dauerhaft rot** (`tsc -p tools/tsconfig.json`): dem eigenen minimalen Node-Shim (`tools/types/node-min.d.ts`) fehlten `path.posix` (vom Doku-Check benutzt) und `fs.unlinkSync` (vom Commit-Komponisten benutzt) — sechs Fehler in Dateien, die niemand angefasst hatte, weshalb das Signal unbrauchbar war. Shim ergänzt, `tsc -b tools/tsconfig.json` jetzt exit 0. Ehrlich benannt und NICHT angefasst: `commands.changelog` in `shinon.config.json` verweist auf `scripts/check-changelog.sh`, das niemand liest — der Check rechnet selbst über Git. Dieser Config-Eintrag ist tote Konfiguration; ob die Datei bleibt, ist eine Werkzeug-Entscheidung, kein Nebeneffekt einer Regel. sondern **unfähig zu laufen**: `actions/setup-node` mit `cache: npm` und `npm ci` setzen eine getrackte Lockdatei voraus, und `package-lock.json`/`bun.lock` sind hier bewusst untracked (Commit `49ff364` „untrack lockfile conflict"). Der Job brach deshalb vor der ersten Prüfung ab. Jetzt lockfrei: `npm install --no-audit --no-fund` ohne Cache, dafür mit der Begründung im Workflow, damit die Zeile nicht versehentlich auf `npm ci` zurückgedreht wird. Aktionen auf den belegten Stand gehoben (`actions/checkout@v7`, `actions/setup-node@v7` — Majors per Release-API geprüft), Node 24 in CI, weil der Plattform-Build `nodejs@24.18.0` meldet und CI denselben Lauf verifizieren soll. Beweis lokal nachgestellt: `npm install` ohne Lockdatei in einer Wegwerf-Kopie (209 Pakete, Exit 0), danach alle vier CI-Schritte grün. Preis, ehrlich benannt: ohne Lockdatei ist der Abhängigkeitsbaum nicht eingefroren — wer das abdrehen will, trackt eine Lockdatei und zieht `npm ci` + `cache: npm` GEMEINSAM nach. Ein ehrlicher Rest an Grenze: die Probe lief auf dieser Maschine, deren npm `postinstall`-Skripte blockt (gemeldet: `esbuild`); auf einem Standard-Runner laufen sie, das kann ich hier nicht beweisen.
- [Docs/Architecture] Doku-Konsolidierung: AGENTS.md gestrafft (ohne Verlust), README im Tonfall von Krix neu gefasst, technische Details & Ownership Contracts je Domäne in architecture.md/architecture-contract.md verankert, ROADMAP konsolidiert (Status, Findings, geordnete Todos) und Root bereinigt.
- [Test-Perf] `gameover_notice.test.ts`: P1-Freeze-Tests teilen jetzt einen gemeinsamen gameover-Root (`beforeAll` statt 3× `forceGameOver`). Möglich weil `stepOnce` nach gameover ein echter no-op ist — kein Sicherheitsbruch, Testzeit -1200 ms (1932 ms → 741 ms). Voll-Suite 491/491 grün in ~4 s.

- **Deine Karte gehört dir.** Die Welt, die du baust, bleibt erhalten — über Runs hinweg
  und nach dem Neuladen. Beim Spielstart baust du sie weiter, statt eine neue Karte zu bekommen.
- **Start und Ausgang liegen diagonal.** Käfer erscheinen oben rechts und müssen zum Ausgang
  unten links — bei jeder Kartengröße. Wie sie laufen, entscheidet dein Bau.
- **Verkaufen ist da.** Im Bau-Kasten kannst du eigene Tiles wieder abreißen (50 % zurück).
  Verkaufst du mitten in einer Welle, sucht sich die Welle sofort einen neuen Weg — bis hin
  zum Rückweg durchs halbe Labyrinth.
- **Kein Energie-System mehr.** Bauen kostet keine Energie mehr: Du hast einen **Bau-Vorrat**
  (Töpfe, Wege, Findlinge, Deko, Felder), der jedem Lauf von Anfang an mitgegeben wird — der
  Vorrat steht als ×Zahl auf jeder Karte. Du baust damit so viel, wie dein Vorrat hergibt, und
  ein abgelehnter Bau kostet nie Material. Nektar gibst du weiterhin nur außerhalb eines Laufs aus.
- **Verkaufen ist ein eigener Knopf.** Statt als vierte Karte im Tile-Streifen sitzt „Verkauf"
  jetzt als breiter Knopf **über** dem Bau-Kasten — was du antippst, verkaufst du (das Material
  wandert zurück in deinen Vorrat).
- **Zwei Werkzeugkästen statt einem Teller.** „Pflanzen" und „Feld" sind getrennt umschaltbar:
  Pflanzenkarten bzw. Tiles und Verkauf erscheinen nie gemischt.
- **Nur noch ein Bau-Knopf.** Vorher standen zwei fast gleich beschriftete Knöpfe
  („Fertig gebaut") nebeneinander, während der Hinweis einen dritten nannte, den es nicht gab.
  Jetzt: „Welle starten" startet direkt, „Bauen beenden" geht in die Vorbereitung.
- **Trait-Tags sind übersetzt.** Die Eigenschafts-Tags neu gezüchteter Pflanzen standen
  fest auf Englisch („rapid fire") — auch in der deutschen Oberfläche.
- **Aufgeräumt statt zugemüllt.** Ein Haufen Code, den niemand mehr benutzt hat, ist raus
  (zwei ganze Module, tote Weg-Regeln aus dem alten Pfad-Modell, 12 Texte, die keine Stelle
  anzeigte). Für dich ändert sich nichts — außer dass das Spiel an genau diesen Stellen
  nicht mehr mit Altlasten zu tun hat.

- **Krix erklärt jetzt auch das Bauen.** Zwischen „Pflanze steht" und „Welle läuft" lag für
  die Tour ein Loch: sie verlangte „Welle starten", während der Run in der Bauphase beginnt.
  Jetzt sagt Krix ausdrücklich, dass die Karte dir gehört und dass „Welle starten" und
  „Bauen beenden ✓" zwei verschiedene Wege sind — einer sofort, einer mit Countdown.
- **Gezüchtete Pflanzen haben wieder Namen im Feld.** Im Lauf stand auf der Karte `seed_0 ×1`,
  im Gewächshaus hieß dieselbe Pflanze „Spross (Keim 1)". Jetzt steht überall der Name.
- **Kreuzungen und Bruten kosten wirklich Nektar.** Die Brutstätte zeigte „🍯 35", zog aber nie
  etwas ab — züchten war gratis, während der Samen-Shop korrekt abbuchte. Jetzt wird gebucht,
  und wenn der Nektar nicht reicht, passiert schlicht nichts (kein stiller Kredit).
- **Kein leerer Lauf mehr.** Wer noch keine eigene Pflanze mitgenommen hat, bekam den
  Krix-Spross bisher nur, wenn er GAR nichts besaß — ein einziger gekaufter Weg oder ein Samen
  im Regal nahm ihm die Leihe, und der Lauf startete ohne eine einzige platzierbare Pflanze.
  Jetzt leiht Krix immer dann, wenn **nichts einsatzbereit** ist — und es ist immer der Spross:
  die schwächste Pflanze, die garantiert angreift (vorher konnte die Leihe eine Wurzelmauer
  ohne Angriff sein).

- **Die Kreuzung ist jetzt deine Entscheidung.** Vorher würfelte „Aussäen" die Eltern aus
  deinem Bestand, und die Pflanzenkarten waren im Zuchtfenster nur Zierde. Jetzt wählst du
  A und B selbst: zwei Tipps auf deine Pflanzen, die Karten tragen A/B-Marken, und das Kind
  gehört genau diesem Paar. Ein dritter Tipp nimmt eine Karte wieder heraus.
- **Reifung wächst mit dir.** Du startest mit **3 Reifungsplätzen** (wie die Töpfe) und kaufst
  dir bis zu **12**. Jeder zusätzliche Platz verlangt BEIDES: Nektar und eine überlebte Welle —
  Platz 4: 100 🍯 + Welle 3, Platz 6: 300 + Welle 8, Platz 9: 1050 + Welle 18, Platz 12:
  3000 + Welle 30. Die Anzeige nennt den Preis und, wenn es noch nicht reicht, wie weit du bist.
- **Abbrechen beendet den Lauf.** Fortsetzen ist kein Freifahrtschein mehr: es kostet
  **25 Nektar je erreichter Welle, ohne Deckel**. Die Karte im Hub nennt den Preis und bleibt
  gesperrt, solange der Nektar nicht reicht.

- **Gegner sind jetzt Wesen mit eigenem Körper.** Vorher zeichnete das Spiel für jeden Gegnertyp
  immer dasselbe Bild: ein Grunt in Welle 3 und einer in Welle 23 waren identisch, und der
  „Schwarm" war ein Käfer, obwohl er fliegen sollte. Jetzt entsteht jeder Gegnertyp aus einem
  eigenen Erbgut — Panzerform, Flügel, Pelz, Stachel, Halschild und Beine kommen daraus. Der
  Schwarm ist pelzig und geflügelt (er sieht endlich aus wie das Insekt, das er sein soll),
  der Tank ist ein breiter Schildträger, der schnelle Gegner eine stromlinige Sprungform.
- **Jeder Boss ist ein Einzelstück.** Bosse sind die einzige Ausnahme von „eine Art, ein
  Aussehen": jeder Boss zieht sein eigenes Erbgut und unterscheidet sich damit von jedem
  anderen — derselbe Boss sieht bei jedem Angriff wieder gleich aus.
- **Gründer-Käfer haben richtiges Erbgut.** Blatthüpfer, Schildkäfer und Hummel trugen je ein
  einziges Gen. Deshalb sahen alle Nachkommen gleich aus (flache Panzerform, geschupptes Kleid).
  Jetzt trägt jeder 3–4 Gene, und eine Kreuzung bringt sichtbar verschiedene Körper hervor.
- **„Münzen" sind Erfahrung geworden.** Der stille Kontostand hieß „Münzen für den In-Run-Shop"
  — den Shop gibt es nicht mehr, also sammelte sich dort Geld ohne Zweck. Er heißt jetzt
  Erfahrung und ist ausdrücklich keine Währung: bezahlt wird nur mit Nektar, und nur außerhalb
  eines Laufs.

### Intern (Technik, Verträge & Tests)
- [Sim/Vector] **Der Attraktor hat eine Obergrenze gefunden („auf einmal folgt kein Creep mehr dem Weg").** Der Zug war `strength*0.1/d` — zur Feldmitte hin divergent, ohne Deckel. Gemessen am 20.09.2026 (Welle 2, Feld auf einer Wegzelle, alle 30 Ticks erneuert, 600 Ticks): Gegner auf **x = −519, 256, 382**, keiner über 50 % Weg-Fortschritt (ohne Feld 0,62) — sie liefen den Weg nicht mehr. Ursache belegt in den ECHTEN Spieldaten: sechs Pflanzen der Sammlung tragen `EFFECT_HASTE` (`seed_0/10/11`, `cross_14pwxbv_3`, `cross_1cbk84l_4`, `cross_1qn8od5_7`), und `EFFECT_HASTE → VECTOR_ATTRACTOR` ließ JEDE davon je Schuss ein Feld setzen. Jetzt: Zug fällt linear zum Rand ab, ist bei voller Feldstärke gedeckelt (`VECTOR_ATTRACTOR_CONFIG` in `config/vector_logic.source.ts`), und die Summe ALLER Felder ist je Opfer auf einen Anteil seines EIGENEN Tempos begrenzt (`maxShare 0.6`) ⇒ netto behält jeder Gegner ≥ 40 % Tempos in Weg-Richtung; die Grenze ist ein Anteil, damit ein späterer langsamerer Gegnertyp die Garantie erbt. Die Spawn-Werte der Pflanze (0.8/3/60 standen als Literale in `root.ts`) liegen ebenfalls in der Source. Belege: **Gate (e)** (`vector_engine_gate.test.ts`) — kein Gegner außerhalb des Bretts, Schrittweite ≤ Tempo·1,6 (gemessen grunt 0,0320 · fast 0,0720), Kontrolle ohne Feld exakt = Lauf-Tempo; **gegengeprüft durch Mutation**: mit dem alten Zug ist der Test rot (3 Gegner außerhalb). Suite 661/661, E2E 30/30, tsc 0. OFFEN und dem Eigentümer vorgelegt: die Zuordnung selbst (`EFFECT_HASTE → VECTOR_ATTRACTOR` erfüllt nur die Vollständigkeitsregel „jedes Gen speist einen Vector", inhaltlich ist Haste Kadenz, keine Anziehung).
- [Test/E2E] **Die Game-Over-Marge der Progression-Spec war auf eine schwächere Pflanze getaktet.** Der Lauf „Leih-Spross allein" endet gemessen erst bei Tick **~21 200**: der Spross tötet immer den vordersten Gegner, der Rest leakt nie, solange er steht (Leichen erst, wenn Tank/Boss ihn fressen) — 20 Leben über 19 Wellen. Der Test taktete 16 000 Ticks und wurde rot, obwohl er nichts Defektes prüfte; er taktet jetzt zweistufig wie sein Schwester-Test (fein, dann grob). E2E 30/30.
- [Sim/P-26] **Drei von vier Pflanzen tun nichts — also ließ ich die Gegner fressen (Devlog 22).** Black-Box-Spieltest v0.0.71 (5 Läufe, beste Welle 5): Mauer `EFFECT_REFLECT` und Myzel `EFFECT_HEAL` als `visual-only`-Tags — 300 HP nie berührt, Heil-Aura nur im `prep` ohne Wunden. Jetzt hält die Mauer auf: **Tank und Boss bleiben stehen und fressen** (`stopsToEat` je Archetyp + `ENEMY_BITE = {damage:10, cooldownTicks:30, reach:1.05, share:0.2}` als Content in `config/enemies.source.ts` — Tank ab Welle 6, Boss ab Welle 10; Grunt/Fast/Swarm ziehen vorbei). Geometrie-Eigentümer `biteTarget` in `enemySystem.ts` (Beißen und Halten lesen denselben Ort), Pflanzen-Writer `receiveBite` in `plantSystem.ts` (einziger Ort mit `PLANT_WITHERED`, Reflex = resolved Schaden bei `EFFECT_REFLECT`), Heilung im Kampf (`root.ts`: `healTick` im `wave`-Zweig, im `prep` nicht mehr). **Alle Zahlen gemessen, EINE Quelle:** Seed `555010`, Mauer (5,1), 1200 Ticks (40 s) → Welle 1: **300→300** (0 Bisse, 0 stehende Ticks), Welle 6: **300→0 in 30 Bissen**, **472 stehende Ticks (39 %)**, Tod bei ~1168, Tank 285 HP (150×1.9) — alle Details, Sonde und Grenzen in **Devlog 22** (`docs/process/devlog/2026-09-20_22_pflanzen-und-bericht.md`). Belege: `src/simulation/plant_defense.test.ts` (8 Pins). `ENEMY_BITE.share` und `healTick`-Umzug sind beabsichtigt (kein Revert). Tank 6 / Boss 10 ist **Entscheidung des Eigentümers** (Audit-Hinweis „erst ab Welle 10" war Grunt-Fassung, die Welle 2 unspielbar machte).
- [Tooling] Optimiere test-lane-Script (--coverage=false) und bereinige placement_map-Test (entferne unused imports und kommentierten Test)

- [Refactor] **Aufteilung der Brut-Domäne-Tests**: Die Datei `src/meta/brood_identity.test.ts` enthielt sowohl Identitäts- als auch Domänen-Tests und überschritt die LOC-Cap von 200 Zeilen. Trennung in `brood_identity.test.ts` (Identität, Migration, Kosten) und wiederhergestellte `brood_domain.test.ts` (B30-Domäne). Zusätzlich: Behebung des Tippfehlers `claimBroot` → `claimBrood`, Refactoring von MainMenu (Markt-Vorbau), NavIndicators (Hooks und Icons), mainMenuStyles (Inset-Schatten), Hinzufügung der Übersetzung „Schnellmenü“ in `texts_shell.ts` und Versionsbump auf 0.0.76.

- [UI] **B27 nachgezogen: EINE Pflanzen-Kachel für alle Listen.** `PlantVariantThumb`
  (`components/PhenotypeCanvas`) baut den Phänotyp mit derselben Ableitung wie das Feld
  (`genomeToVisualInput` + `GAME_SEED`); der Hub ersetzt damit seinen Farbpunkt
  (`MainMenu`, `mainMenuStyles.preview` → `thumb`). Unbekannte Alt-Save-IDs bleiben neutral grau —
  lieber kein Bild als ein gelogenes. Damit zeigt jede Pflanzen-Liste (Hub, Gewächshaus, Shop)
  dieselbe Anatomie, die das Feld später zeichnet.

- [Refactor] **Das Gewächshaus ist in Komponenten geteilt.** Aus der Sammeldatei
  `components/Greenhouse.tsx` wurden `components/greenhouse/{ParentSelection, SeedlingTray,
  PotRow, PendingQueue, SlotBuyButton, ResultCard}` plus `greenhouseStyles` (Präsentation) und
  `greenhouseHelpers` (Ableitungen); Greenhouse bleibt der **einzige Zustands-Owner**
  (`meta`/`onMetaChange`), jede Komponente deklariert ihre Props samt auf `TranslationKey`
  verengtem `t`. Live durchgespielt statt behauptet: Gewächshaus geöffnet, Elternpaar
  Spross × Myzel gesät — Ergebnis-Karte („Nachtsausnelke", Rapid fire · Pierce),
  Reifungs-Queue (2/3) und Slot-Gate gerendert, Konsole fehlerfrei; `tsc` 0 Fehler,
  Suite 578/578.

- [Docs] **Belegzahlen nachgezählt statt erinnert (B30/B39).** Die Zwilling-Messmenge der Brut
  ist 3 Gründer × alle GEORDNETEN Paarungen × 8 Brut-Indizes = **72 Bruten**; die Zahlen stehen
  jetzt einheitlich als „11 von 72 (15,3 %) vorher — 0 von 72 nachher" in
  `config/beetles.source`, im Kommentar von `meta/brood_domain.test.ts` und im Contract
  `docs/quality/contracts/genome.md` (Vorher-Wert gegen `4d50cc6^` nachgerechnet). Die Devlogs
  17_01/17_04 tragen ihre Nachträge mit Datum — die Grunt-Zahl ist am Bau jenes Commits gezählt,
  und die Krix-Verdeckung lag drei Tage später auch über der Desktop-Tray. Dazu die
  Ignorier-Zeile für die Scratch-Ablage der Experimente. Version **0.0.71 → 0.0.74**
  (`package.json` + `src/version.ts`, Lock in `version.test.ts`).

- [Sim] **P-26 Contract gepinnt.** `docs/quality/contracts/simulation.md` trägt jetzt den QA-Abgleich 20.09.2026 für P-26 (Content-Fahne, Halten+Weiterlaufen, `ENEMY_BITE`, `receiveBite`, `healTick` im Kampf) mit Verweis auf Devlog 22 als einzige Zahlenquelle; ROADMAP §3 (P-26) und §4 dokumentieren die Eigentümer-Entscheidung Tank 6 / Boss 10. Devlog-Verzeichnis: `docs/process/devlog/README.md` um Eintrag 22 erweitert.
- [Vertrag] **B31 — Sichtbarkeit der Brutkandidaten ist gepinnt (Devlog 21).** Der
  **Sichtbarkeits-Gewinn** der formtragenden Maße steht in `src/render/beetles`
  (`BEETLE_DRAW_GAIN` + `beetleDrawMetrics`, Zeichnung und Messung lesen dieselbe Formel); die
  **Farbe** leitet `pigmentFor` zuletzt ab und streut über einen Weg um die gehegte Palette
  (`BEETLE_PIGMENT_SCATTER`), während **dokumentierte Gründer ihren Source-Anker tragen**
  (opt-in über `specimenId`, Generation 1). Der Deskriptor gewichtet Pigment mit 0 — Form-Distanz
  und Neuheits-Maß bleiben bitgleich. `beetleVisibility.test.ts` pinnt die Brut-Aggregate, den
  Gründer-Anker, das schwächste Gründerpaar, die Untergrenze des schwächsten Kandidatenpaares und
  die Anker-Grenze; drei Mutationen geprüft. **Alle Zahlen in Devlog 21.** Suite **578/578** in
  62 Dateien.

- [Prozess] **Blocker gelöst: Gate wieder OFFEN (0 Fehler, 0 Warnungen), E2E 30/30, tsc 0.** Die
  fremden, unversionierten Agenten-Experimente (`src/lib`, `src/mcpServer` — 70 TS-Fehler, null
  Importe im Spielcode, bezogen sich auf das gestrichene Energie-Modell) und die rote untracked
  Explorer-Scratch-Spec blockierten Typecheck, Gate und E2E-Abschluss. Beide sind **unangetastet**
  in die git-ignorierte Quarantäne `experiments/pending/` verschoben — nichts gelöscht, nichts
  repariert; die Fortführungs-/Archivierungs-Entscheidung liegt beim Eigentümer (P-22). Suite:
  **570/570** in 61 Dateien.

- [Prozess/ROADMAP] **Vier offene Punkte nachgemessen statt hoffen (Devlog 20).** P-2 behoben
  (s. oben); **P-24 mobil widerlegt** (✕-Rechteck bei 390×844 verdeckt 0 Zellzentren — Desktop-
  Fall bleibt offen); **P-10 heute ohne Überlauf** (342=342, konfigurationsabhängig, Zeile bleibt
  mit Messwert); **P-14 widerlegt und als Invariante gepinnt** (der Root-Konstruktor leitet die
  erste Route selbst, `qa_p14_resume_route.test.ts` lockt das). Neu: **P-25** — die Tray-
  DOM überdeckt bei 390×844 die unterste Brettreihe inkl. Ausgang-Ecke (0,11) (Brett-Unterkante
  ~696 px vs. Tray-Kante ~652 px).

- [Prozess/ROADMAP] **Die ROADMAP sagt jetzt je Sache genau eine Wahrheit.** §1 nannte einen
  Messstand vom 19.09. (0 Typecheck-Fehler, 541 Tests in 56 Testdateien, E2E 27/27, Gate 0/0),
  der heute nicht mehr stimmt und damit wie eine grüne Freigabe las. Gemessen am 20.09.2026:
  **2 Typecheck-Fehler** (beide in einer fremden untracked Datei), **569 Tests in 60 Dateien**
  grün, **E2E 27 von 29** (zwei rot in einer untracked Scratch-Datei), **Gate: 0 Warnungen,
  1 Fehler** — alle drei Ursachen sind fremde, unversionierte Fremdänderungen und stehen jetzt
  als **P-22** in §3, statt als stiller Widerspruch in §1. Die Liste „2.2 Aktive Befunde" ist
  aufgelöst: jeder Eintrag hat genau einen Ort (**T3** → P-12; **T2** → überholt, Devlog 18;
  **N4** → behoben, 3/3, Beleg Devlog 17, der Rest in P-2/P-5/P-10/P-13; **B16.2–B16.5** und
  **B16.9** → §4 STUFE 1; **B14.7** → §4 STUFE 2), die Audit-IDs bleiben in den Aufgabentexten
  stehen, damit alte Verweise weiter auflösen. §2.1 heißt, was sie ist — Übersetzung alter
  ID-Paare, kein Status-Ersatz; die Status-Wahrheit je Fundstelle ist das Register
  `docs/quality/quality-spec.md` → `docs/quality/contracts/`. Keine P-Nummer und kein Beleg
  ist dabei verloren gegangen (Inventar vor/nach dem Umbau verglichen).

- [Prozess] **Die QA-Berichte sind zur Chronik geworden.** Die 20 Berichte der Sessions
  17./18.09.2026 lagen als Rohdateien auf `qa-reports` und beschrieben dieselben Dinge
  ein zweites Mal neben den Domänen-Contracts. Sie sind jetzt als `docs/process/devlog/`
  überführt: ein Index plus je Bericht ein Eintrag in Krix' Stimme — Datum, Version, Commit,
  Befunde, was gebaut wurde (mit Beleg), was offen blieb. Formatregel: gleiche Anatomie,
  nie gleiches Layout. Der Ablauf ist verbindlich festgeschrieben (Devlog-README +
  `AGENTS.md`): abholen → umsetzen → Devlog-Eintrag → offene Punkte zusätzlich in die
  ROADMAP → Erledigtes in den Domänen-Contract → **der konsolidierte Bericht wird aus `qa/`
  entfernt** (eine Wahrheit, keine zwei).
  Beim Abgleich gegen den heutigen Code entstanden sechs neue offene Punkte mit Beleg:
  P-10 Tray ohne Scroll-Hinweis (mobil, Q9), P-11 Brutvorschau ohne Kontostand (Q11,
  Designfrage), P-12 selbst-abwählendes Tile-Werkzeug (T3), P-13 Restfragen der
  Nachverifikation zum Nachmessen, P-14 leere Route direkt nach dem Fortsetzen
  (Beobachtung B, 0/3), P-15 fehlender Wiedereinstieg in die Krix-Notizen. Überholt ist
  T2 (zwei Preise für die Leihe) — das Energie-Konto existiert nicht mehr.

- [Meta/B1.1] **Run-Stats kennen jetzt JEDE Loadout-Variante (Befund: „kann keine Pflanze auf freie
  Plätze platzieren").** Ursache gemessen, nicht vermutet: der Run löst Zahlen über
  `getPlantStats(variantId, bredStats)` auf, und `bredStats` wird erst seit B1 bei der Registrierung
  geschrieben — Bestandssaves (hier: `seed_3/5/6/7` in `loadout`, `bredStats` nur `seed_13/14`)
  hatten für ihren Bestand keinen Eintrag. Folge: `plantStatsAt` → `null`, die Vorschau lehnt jede
  Zelle mit `unknown` ab, die Sim mit `no_inventory` — Tray zeigt ×1, nichts setzbar. BELEGT per
  lebender Mutation: mit eingetragenem Eintrag steht dieselbe Pflanze auf derselben Zelle.
  Reparatur an der Nachtstelle: `meta/run.ts:deriveRunStats` heilt fehlende Einträge aus dem Genom
  über DIESELBE Funktion wie die Registrierung (`deriveBredEntry`) — vorhandene Einträge bleiben
  bitgleich, der Leih-Anker bleibt die einzige Sonderregel. Vertrag + 7 Gates in
  `meta/run_stats.test.ts` (inkl. Sim-Fall), Mutation geprüft: ohne Heilung 4 rot.
- [Dev/B7.6] **Das Dev-Overlay nimmt keine Spiel-Eingabe mehr an.** Es liegt mit `left:8 right:8
  bottom:64` über Tray und unterem Brett; `elementFromPoint` lieferte auf der Tray-Karte das
  Overlay, der Karten-Handler lief nie (`releasePointerCapture` wurde nicht aufgerufen) — im
  Dev-Modus war keine Karte wählbar, und Brett-Taps im unteren Drittel kamen nicht an. Jetzt
  `pointerEvents:'none'` auf der Lesefläche, `'auto'` nur auf dem FX-Knopf (Toggle weiter belegt).

- [Sim/D1] **Kein Kontostand im Run: `resources.experience` ist gestrichen.** Das Feld hatte genau
  einen Writer (`scoreSystem.onEnemyDied`, 1–5 „Erfahrung" über den loot-Strom) und KEINEN Leser —
  kein UI, kein Command, keine Senke; der State-Hash ignorierte es bewusst. Ein deklariertes Feld
  ohne Leser ist eine zweite Wahrheit über Belohnung neben Score und Nektar, deshalb Entscheidung
  „streichen": Feld, Writer, die beiden Source-Konstanten und die Resume-Kopie sind weg, zwei
  Tests, die es pinnten, ebenso. Stattdessen pinnt `gateB.test.ts` die ENTSCHEIDUNG (ein Kill
  erzeugt keinen zweiten Kontostand). Nebenbefund derselben Durchsicht: zwei tote
  `state.resources.energy = 9999`-Zuweisungen in `maze_balance`/`maze_loan` (Rest des
  Energiesystems) liefen seit Monaten ins Leere und sind gefallen. Der `loot`-Namespace bleibt im
  RNG-Vertrag deklariert; heute beansprucht ihn kein System.

- [Sim/D1] **Angriff auf den Blumentopf: Farbe ⇒ Wirkung, an der ZELLE festgemacht.** Der Topf war
  ein reiner Weg-Blocker, während die Source ihn „Platzierfläche für Pflanzen" nannte — zwei
  Lesarten desselben Objekts. Jetzt ist er ein Booster: neue Source `config/pot.source.ts`
  (Bernstein +20 % Schaden · Violett +20 % Reichweite · Moos −20 % Nachladezeit · Rost +30 % Leben)
  und `simulation/potBoost.ts`, das die Farbe einer Zelle aus `deriveSeed(EPOCH_ROOT,'world','pot')`
  ableitet. **Bewusst ohne Zustand:** kein Farbfeld im Save, kein Schema-Bump, kein RNG — dieselbe
  Zelle trägt für immer dieselbe Farbe, auf jedem Rechner. Die Wirkung greift auf BESTEHENDE
  Achsen (`PlantStats`), kein neuer Kampfwert. EINE Wahrheit: `plantSystem.plantStatsAt(state,
  variantId, gx, gy)` speist Feuern, Heil-Aura, Lebensbalken, Reichweiten-Ring und die
  Platzierungs-Vorschau (`statsFor(variantId, cell)`); ohne Topf identisch zur Basis. Das Leben
  wird beim Setzen gewährt (Zustand, keine Ableitung) — verkauft man den Topf später, behält die
  stehende Pflanze ihr Leben. Belegte Grenze: 5 Vertragstests, davon einer mit Mutation geprüft
  (Boost entfernt ⇒ rot), plus Preview-Screenshot mit vier farbigen Töpfen auf einer Karte.

- [Sim/D5] **Der HUD misst jetzt den LAUFWEG in Feldern statt einer Prozent-Quote.** Die alte
  „WEG-GÜTE" (`Manhattan(Endpunkte)/Routenkosten`) lieferte gemessen für gerade Route, Stufen-
  treppe UND jede monotone Umleitung 1,000 — erst Rücklauf fiel (0,500); sie erkannte also nur
  Rücklauf, behauptete aber „100 % = gerader Weg". Im Mazing will man das GEGENTEIL: Zeit unter
  Feuer. `simulation/routeQuality.ts` ist durch `routeMetrics.ts` ersetzt (`routeWalkTiles`,
  `routeIdealTiles`), `ROUTE_CHANGED` trägt `tiles`/`ideal` statt `quality`, der Chip zeigt
  „LAUFWEG 22 · min 22", und der Lern-Kanal (`observationSerializer`) sowie Krix' Chip-Erklärung
  nennen dieselben Zahlen. Belege: `maze_plants.test.ts` (25 vs. 15 ⇒ 10 Felder Gewinn),
  `hudSnapshot.test.ts`, Live-Chip im Preview, E2E grün.

- [Genome/Vielfalt] **Die Brut liefert drei WAHLEN, nicht drei Bilder.** Der Neuheits-Vergleich
  der Kandidaten maß nur das AUSSEHEN — und Dominanz kippt bei Käfern die Form, nicht die Werte.
  Gemessen (Sonde über alle Specimen-Paarungen × 8 Brut-Indizes): **11 von 48 Bruten (22,9 %)**
  trugen zwei Kandidaten mit identischen Stats, ihre Form-Distanz lag bei 0,026–0,064
  (Schwelle 0,055) — der Spieler entschied zwischen zwei Ansichten desselben Tiers. Jetzt kennt
  `rollCandidates` eine optionale Domänen-Bedingung `distinct`: ein Entwurf mit bereits
  vergebenem KAMPFPROFIL verliert jeden Vergleich, und die Brut sucht 12 statt 6 Versuche
  (Pflanzen unverändert). Ergebnis: **0 von 48** Bruten mit Zwillingen, Form-Distanz der
  Kandidaten unverändert (Mittel 0,0753 → 0,0758), Determinismus nachgemessen (2× identisch).
  **Eigener Fehler, gefunden und verworfen:** der erste Versuch mischte die Kampfwerte als
  zusätzliche ACHSEN ins Form-Maß — gemessen senkte das die mittlere Form-Distanz von 0,075 auf
  0,069, also Vielfalt an anderer Stelle bezahlt. Die Bedingung ist deshalb ZUSATZ, keine
  Verdünnung; der gepinnte Kandidatensatz der Fachkreuzung bleibt dadurch bitgleich (nur
  Zwillings-Bruten würfeln anders — Specimen sind Daten, keine Migration). **Bewusst NICHT
  gebaut:** eine zweite Wurfschleife in `beetle.ts` (Duplikat des Kerns) und ein Anheben der
  Mutations-Chance (BALANCE des gemeinsamen Kerns, bewegt die Pflanzenzucht mit) — letzteres
  steht als P-9 in der ROADMAP zur Entscheidung.

- [Doku/QA-Abgleich] **Die QA-Berichte sind gegen den Code abgeglichen, nicht geglaubt.** Die
  Domänen-Contracts `genome.md` und `ui.md` tragen jetzt den Abschnitt „QA-Abgleich": dort steht
  BELEGT, was von den Befunden aus v0.0.36–v0.0.55/externem Playtest bereits erledigt ist
  (Gründer-Erbgut, Hinweisblase bleibt bis „✕ Gelesen" sichtbar, „Welle starten" vs. „Fertig
  gebaut", Vorschau nutzt die echte Weltgröße, Tray-Namen statt roher IDs, Signatur-Fragment
  „Needing" nur noch in der Signatur) — jeweils mit der Stelle, die es belegt. Die in der
  ROADMAP §3 neu verifiziert offenen Punkte P-6 bis P-9 kommen aus derselben Durchsicht
  (WEG-GÜTE erkennt „gebogen" nicht, `experience` ohne Senke, `reward`/`scoreValue` zahlenidentisch,
  Inzucht-Vielfalt hängt allein an der Mutation). Nebenbefund behoben: der Feld-Kommentar in
  `enemies.source.ts` behauptete noch „Score += reward×Combo", während `scoreSystem` `scoreValue`
  nutzt.

- [Discovery/P2'] **Der geteilte Beleg ist der Fund, nicht der Seed.** Neue Discovery-Einträge
  trugen bisher den rohen Zucht-Seed im Klartext — und im Share-Text gleich mit. Jetzt trägt
  jeder neue Eintrag `plant_hmac` (öffentlicher Identifier, `src/discovery/plantHmac.ts`) und
  keinen Seed; Gründer-Einträge der Epoche 0 behalten ihren historischen Seed, weil ihre Wurzel
  ohnehin öffentlich ist. Der Entry-Payload bleibt additiv-konditional und schreibt GENAU EINE
  Seed-Form; `verifyChain` weist Einträge mit beiden oder keinem ab. Share-Format
  (`lifeseed:ph-…:gen:hash`) und Codex-Anzeige nennen den Beleg. Die Migration 001 spiegelt das
  (nullable `plant_hmac`/`seed`, Constraint „genau eine Form"). **Bewusst NICHT gebaut:** ein
  zweites `seedVault.ts` mit eigener `crossPair`-Kopie — das wäre Verbot 1 (Modul-Duplikat)
  gewesen; die Server-Rolle aus P3 braucht einen Server und bleibt der Austauschpunkt
  `plantHmacOf`. Wirkung, ehrlich benannt: der Beleg TRENNT die zwei Wahrheiten, schützt aber
  auf der öffentlichen Epoche-0-Wurzel noch nicht gegen Offline-Vorausberechnung.

- [Discovery/P1+P2] **Die Wurzel ist ein Kontext, der Eintrag trägt seine Herkunft.** Statt der
  Konstante `GAME_SEED` leiten alle zehn Ableitungsstellen über `EPOCH_ROOT` (Epoche 0 = 1337,
  beweisbar bitgleich: Suite unverändert grün) — ein späterer Ticket-Worker tauscht die Wurzel,
  nicht die Ableitung. Jeder Discovery-Eintrag trägt jetzt `epoch_id`, `type` und
  `schema_version`; der Payload-Erweiterung ist additiv-konditional. Neuer Test `epoch.test.ts`
  pinnt die Verträge und fand dabei einen echten Konflikt in der ersten Migration: ein
  v1-Gründer trägt seinen Hash OHNE die neuen Felder, verifyChain rechnet MIT ihnen nach —
  die Migration ist deshalb eine NEUVERKETTUNG (Kette wird als Ganzes im v2-Schema neu gehasht
  und verkettet), dokumentiert statt still. **537/537 Tests.**

- [Codex] **Der Codex zeigt Ereignis statt erfundener Daten.** Die Anzeige formatierte den
  logischen Zeitstempel als Kalenderdatum (`new Date(ts * 1000)`) — mit deterministischen
  Zeitstempeln hieß das: 1970. Jeder Eintrag zeigt jetzt „Gen n · Seed x“ (das ist der Wert,
  den der Feldkommentar beschreibt), und der Feldkommentar in der Kette sagt dasselbe:
  logischer Zeitstempel, keine Uhr.

- [Tooling/CI] **Das Gate gehört jetzt zum Repo.** Shinon (Prüfklassen, Hooks, Konfiguration) zog
  von `git-noir/` (in `.gitignore`, nur auf einer Maschine) nach `tools/` — getrackt, mit CI
  (`.github/workflows/ci.yml`: frischer Klon besteht Typecheck, Voll-Suite und die
  Shinon-eigene Testsuite). Verdrahtet wurden umgestellt: `core.hooksPath = tools/hooks`, die
  drei Hook-Skripte, `HOOKS_RELATIVE_DIR`, `STATE_RELATIVE_PATH` (`tools/.shinon-state.json`,
  weiter ignoriert), die Fixture-Wurzel der Tooling-Tests (`tools/.tmp`, weiter ignoriert) und
  die Aufruf-Pfade in AGENTS.md, ROADMAP und Doku. Alte zweifelhafte Kopien
  (`config.ts.bak`, `checks/index.ts.bak`) sind gelöscht — zwei Wahrheiten weniger. Beweise:
  Gate-Lauf aus `tools/` grün, Shinon-Suite 34/34 (echte Git-Fixtures), Projekt-Suite 529/529.
  Bewusst NICHT in CI: das Gate selbst — es ist die lokale Entscheidungsinstanz, ein zweiter
  Lauf wäre eine zweite Wahrheit desselben Vertrags.

- [Tooling] **README-Block und Gate behaupten nicht mehr zwei verschiedene Caps.** Der Shinon-Starter
  zählte für den LOC-Hotspot-Block ROH-Zeilen (`split('\n').length`) und meldete damit z. B.
  `src/meta/store.ts` mit 142 % ÜBER Cap, während das bindende Gate (Code-Zeilen ohne Kommentare und
  Leerzeilen) 93 % sah. Der Starter nutzt jetzt dieselbe exportierte Funktion wie die Prüfklasse
  (`codeLineCount` aus `checks/check.ts`) — eine Regel, eine Zahl, eine Implementierung.
  Nebenbefund, der dabei auffiel: `forbidden-patterns` prüfte rohe Zeilen und schlug damit auf
  Kommentare an — ein Kommentar, der `Date.now()` nur ERWÄHNT, war selbst ein Gate-Fehler und
  blockierte genau die Datei, die das Verbot gerade behoben hatte. Die Prüfung sieht jetzt Code
  statt Prosa (Kommentarzeilen und trailing-Kommentare werden abgetrennt, Strings bleiben
  unangetastet), belegt mit einer Sonde: drei Prosa-Erwähnungen ohne Befund, eine echte
  Code-Zeile mit Befund.
- [Plan/Discovery] `docs/process/plan-discovery-chain.md` auf den geprüften Stand gebracht: die
  Nachrechen-Kosten sind jetzt **gemessen** statt behauptet (volle Kreuzung 81 967/s, Angreiferpfad
  Seed→Genome→Hash 46 512/s, 20 000/20 000 verschiedene Hashes — Methode und Gegenmessung stehen
  daneben) und die Reihenfolge lautet jetzt P1+P2 → öffentliches A → B, damit der spätere
  Wurzelwechsel eine Migration ist statt eines Bruchs. Ergänzt: direktes Client-Schreiben ist der
  dokumentierte Squatting-Pfad, `to authenticated` hilft nur ohne anonyme Sign-ins im Projekt
  (lokal nicht prüfbar), das Replay-Log gehört früh gebaut (es ist zugleich QA-Werkzeug), und
  Evidenz braucht kein Rohdaten-Archiv (SHA-256 des Pakets plus geschwärzte Zusammenfassung).

- [Vertrag] `AGENTS.md` verankert drei Grundsätze, die bisher nur im Gespräch galten und nirgends
  belegt waren (0 Treffer per Grep): **eigener Kritiker** (jede eigene Behauptung vor der Ausgabe
  gegenprüfen, aktiv den Gegenbeweis suchen, gefundene eigene Fehler benennen), **keine
  Sollbruchstellen** (kein „kommt später"-Seam, keine Platzhalter als Endlösung) und **„fertig"
  heißt bewiesen** (erledigt nur mit Test, Preview oder Beleg-Zeile — Plan, Kommentar und Doku
  zählen nicht). Dazu ein Header-Drift: die Liste hieß „Die 10 absoluten Verbote", enthielt aber
  14 Einträge (jetzt 17, Zahl aus dem Header entfernt). Bestehende Regeln blieben unverändert.

- [Plan/Discovery] Der vorgelegte Ticket-Chain-Plan ist gegen den echten Code geprüft und als
  `docs/process/plan-discovery-chain.md` festgehalten (20 Behauptungen, jede mit Datei/Zeile
  belegt). Ergebnis: Vorrechenbarkeit und fehlende Gesamtordnung bestätigt, „kein versionierter
  Hook" nur teilweise (die Skripte sind versioniert, unversioniert ist die Verdrahtung über
  `core.hooksPath = git-noir/hooks`), und eine echte Voraussetzung fehlt — ein Replay-Verifier
  braucht ein Kommando-Log, das es in der Persistenz nicht gibt. **Nichts davon ist umgesetzt:**
  das Dokument bewertet einen Plan, es ist kein Feature.

- [B41 Lauf-Gang] Die Beine standen still (EIN Backbild pro Wesen) und der Bob hing an `tick * 16`,
  also an der Wanduhr — ein Standbild, das sich zeitgesteuert schiebt, liest das Auge als Gleiten.
  Neu: `render/beetleGait.ts` (Präsentation, streckenbasiert) + Tripod-Gang in `beetles.drawLeg`
  (`legPhase(row, side, gait)`) + `GAIT_FRAMES`-Backbilder in `beetleSprites` (Cache-Key enthält
  den Frame). Die Phase kommt aus dem ECHTEN Positionsdelta der Sim — deshalb sind Stillstand,
  Verlangsamung und Tempo automatisch richtig, und 30 fps wie 120 fps zeigen denselben Lauf.
  Kein RNG, keine Uhr, kein Sim-Schreibrecht. Test: `render/beetleGait.test.ts` (8 Fälle).
- [B42 Tutorial-Nachlesbarkeit] Im cueMode war der Text AUTOMATISCH eingeklappt UND die Zeile
  pointer-durchlässig — der Aufklapp-Klick war damit unerreichbar, der volle Text nie lesbar
  (toter Pfad, dessen eigener Kommentar „R1 (Nachlesbarkeit)“ hieß). Jetzt: Text steht, bis der
  Spieler ihn wegklickt (`✕ Gelesen`, wieder aufklappbar mit `▸ Notiz`) oder der Schritt
  weitergeht; im Handlungsschritt wird NICHT getippt (der Spieler kann das Ziel anklicken, während
  der Text noch schreibt). Vertrag + Test: `bubbleTextVisible(cueMode, dismissed)`,
  `qa_befunde.test.ts`.
- [B43 Onboarding-Inhalt] `TUTORIAL_VERSION` 3 → 4: die Tour erklärt jetzt das AKTUELLE System
  (Besitz-Karte, Bauphase als Run-Start, Nektar nur außerhalb, drei getrennte Vorräte, kein
  Energie-System) statt eines Ablaufs, den es nicht mehr gibt. Ton: Krix bleibt Krix — ironisch,
  sarkastisch, zynisch, persönlich; DE und EN mit identischen Keys (`i18n_texts.test.ts`).


- [B40 Welt-Persistenz] Der Welt-Autor ersetzte bei jedem Flush sein eigenes Welt-Objekt
  (`applyWorldOps` ist rein), der Besitzer hielt die alte Karte: der nächste Run startete auf der
  Startwelt und schrieb sie beim ersten Bau über den Speicherstand (Datenverlust, nicht nur
  Anzeige). Fix in zwei Teilen — der Autor MELDET jede Flush-Welt an den Besitzer (ein Objekt,
  zwei Halter), und der Run-Start liest die Welt-Wahrheit aus dem WorldSave (`App.syncWorld`,
  fail-closed: ohne lesbare Welt bleibt die bisherige Sicht, nie eine leere Karte). Regression:
  `persistence/world_autor.test.ts` (6 Fälle, inkl. „der nächste Run sieht die gebaute Karte").
- [Ballistik, Regel 6] `config/ballistics.source.ts` (neu) besitzt Geschwindigkeit, Durchschlag,
  Krit, Trefferradius und Effekt-Slots; `genome/ballistics.ts` (neu) ist die EINZIGE Ableitung
  Genom → Profil — rein, in Basispunkten (`Math.round(power*10000)`, genau die Quantisierung des
  `genome_hash`), rollen-gesteuert (nur Schützen schießen). Die Zahlen `HIT_RADIUS 0.4`,
  `speed 0.15`, Pierce `2`, Crit `0.2` und die Statusdauern `90/3/5` standen vorher als Literale
  in der Simulation und sind jetzt Content (`effects.source.statusTicks`).
- [Effekt-Vertrag] `root.ts` reichte nur `effects[0]` durch (zweiter Effekt toter Content);
  jetzt `effectIds` auf dem Projektil, Schaden einmalig, Zweiteffekt über
  `EnemySystem.applyEffect` (Status-ART in `effectSupport`, Status-DAUER in der Source — beide
  Hälften im Test gegeneinander gepinnt).
- [Hash] Projektile hashen additive-optional `speed`, `pierce` und `effectIds` — Ballistik ist
  spielfähige Divergenz. Dabei die VIERTE Kopie der Hash-Projektion in `gateB.test.ts` entfernt
  (sie hätte die neuen Felder still verschluckt); Owner ist `snapshot.ts#toHashable`.
- [Altsave-Heilung] `bredStats` ohne `ballistics` (alles vor dieser Fassung) bekommt beim Lesen
  `legacyProfileFromEffects` — exakt das alte Verhalten, kein stiller Verlust von Durchschlag/Krit.
- [Goldset] `genome/ballistics.test.ts` pinnt zwölf Genome auf ihre Profile; wer Zahlen in der
  Source dreht, macht den Test rot und muss `BALLISTICS_VERSION` bewusst anheben.


- [LOC-Wahrheit] Die LOC-Hotspot-Liste im README zählt ROH-Zeilen, das Gate prüft CODE-Zeilen
  (Kommentare und Leerzeilen ausgenommen). Dadurch stand dieselbe Datei als „über Cap" im README
  und mit 0 Befunden im Gate. Drei der gemeldeten Überschreitungen waren Phantom-Werte:
  `components/Greenhouse.tsx` 392/400 (98 %, nicht 120 %), `config/phenotype.source.ts` 105/200
  (53 %, nicht 114 %), `render/gameRuntime.ts` 285/400 (71 %, nicht 101 %). Kein Modul liegt
  über seinem Cap; die einzige echte Enge ist Greenhouse (98 %).
- [LOC-Caps] Die Cap-Tabelle stand nur in der (gitignorierten) Tool-Config und war kürzer als der
  Vertrag in AGENTS.md: `src/meta/` und `src/i18n/` wurden überhaupt nicht geprüft. Jetzt liegen
  alle zwölf Regeln in der versionierten `shinon.config.json` — Cap-Regel und Vertrag sind eine
  Wahrheit statt zweier.
- [i18n] `i18n/translations.ts` war auf 362 Code-Zeilen (181 % des i18n-Caps) gewachsen und
  bediente gleichzeitig Titel, Shop, Lauf und Sammlung. Geschnitten nach Domäne (dasselbe Muster
  wie `help.ts`/`tutorial.ts`): `texts_shell` 76 · `texts_shop` 90 · `texts_run` 118 ·
  `texts_codex` 94, dahinter ein Barrel (11 Zeilen), der `translations` und `TranslationKey`
  unverändert nach außen gibt — kein Konsument musste angefasst werden. 177 Schlüssel je Sprache,
  keine verloren, keine doppelt: ein neuer Test sichert die Komposition ab (Modul-Summe ===
  Schlüsselmenge), sonst würde still das spätere Modul gewinnen.
- [E2E an den Shop-Vertrag gezogen] Zwei Specs hingen am alten Samen-Shop und waren rot: der
  Menü-Tab heißt seit den getrennten Pools „🛒 Shop — Seeds, Tiles & Decor" statt „Samen-Shop",
  und der Samen-Pool führt GENAU EINE Karte (vorher drei Seltenheits-Karten für denselben Keim).
  `router.spec` und `progression.spec` sind nachgezogen; die Besitz-Zusage im Kaufschritt prüft
  jetzt die PFLANZE (`variantCounts.seed_0` + Bibliothek) statt der Gesamt-Summe — die zählte seit
  dem Besitz-Modell das Bau-Material mit. E2E wieder 27/27.
- [Meta-Cap, bewusst offen] Mit dem neuen `src/meta/`-Cap fällt auf, dass
  `meta/brood_identity.test.ts` bei 233 Code-Zeilen liegt. LOC-Caps prüfen nur BERÜHRTE Dateien,
  deshalb ist sie heute grün — wer sie anfasst, splittet sie. Die Alternative (Testdateien ganz
  aus der Cap-Regel nehmen) ist nicht entschieden und wird hier nicht stillschweigend gesetzt.

- [Phänotyp global] Die Gegner benutzen jetzt dasselbe Kreaturen-Modell wie Brut und Käfer — der
  `switch` über fünf von Hand gezeichnete Körper in `render/layers/enemies.ts` ist gelöscht
  (87 → 16 Code-Zeilen). Kette: `config/enemyGenome.source.ts` (Erbgut-Rezepte) →
  `genome/enemyPhenotype.ts` (Archetyp + optionales Individuum ⇒ Genom ⇒ Anatomie) →
  `visual/enemyVisuals.ts` (Auflösung + Memoisation) → `render/beetleSprites.ts` (derselbe
  Zeichenpfad wie der gezüchtete Käfer). Präsentation bleibt Präsentation: die Ableitung liegt im
  `visual`-Namespace, HP/Tempo/Schaden stehen unverändert in `enemies.source.ts`, kein Sim-Feld
  wurde berührt (FX ON/OFF und jeder State-Hash unverändert). Boss-Ausnahme laut
  Nutzerentscheid: `individual: true` ⇒ Genstärken streuen deterministisch aus der Entity-ID und
  das Wesen zieht genau ein Zusatz-Gen aus dem Source-Pool — Einzelstück, aber reproduzierbar
  (gepinnt in `genome/enemy_phenotype.test.ts`, 11 Fälle).
- [Pool] Gemessene Wurzel der Käfer-Konvergenz: die Gründer trugen je EIN Gen, `carapaceShape`
  wurde fast nur von `phoenix`/`mandible` bewegt, `segmentation` fast nur von
  `broodhost`/`swarmborn` — deshalb lag `carapaceForm` bei allen drei Gründern auf `flat` und
  `dress` auf `scaled` (zwei der vier Formen, drei der vier Kleider waren über Kreuzungen kaum
  erreichbar). Fix in der Source: fünf neue Organ-Achsen (`wings`, `pelage`, `stinger`,
  `pronotum`, `jumpLegs`), fünf neue Organ-Gene, Form-/Struktur-Treiber über den ganzen Pool
  verteilt, lesbare KÖRPERPLÄNE (`beetle|stag|bee|wasp`) aus den Achsen. Gemessen: Gründer-Distanz
  0,286 / 0,149 / 0,285 (vorher 0,098–0,144); die Hummel ist `bee` mit Flügeln 0,57, Pelz 0,43.
- [Organe] Die neuen Organ-Funktionen liegen in einem eigenen Modul (`render/beetleOrgans.ts`:
  Flügel, Pelz, Stachel, Halschild, Sprungbein) samt der geteilten Käfer-Tusche — die
  Anatomie-Datei ruft sie nur noch auf (Regel 4.4: neue Achse = neue Funktion, kein weiteres `if`
  im Monolithen).
- [Währung] `resources.coins` ⇒ `resources.experience`, `COINS_PER_KILL_*` ⇒
  `EXPERIENCE_PER_KILL_*`. Grund: nach dem Energie-System war der In-Run-Shop tot, der Kontostand
  hatte keinen Ausgabepunkt und stand als zweite Geld-Wahrheit neben Nektar. Erfahrung ist
  bewusst keine Währung.
- [Konsolidierung] Vier Kopien derselben Hash-Projektion (`snapshot.ts`, `testkit.ts`, `gateB`,
  `DevOverlay.tsx`) sind auf EINE reduziert — `snapshot.ts#toHashable` ist der Owner, der Rest
  delegiert. Dabei entfernt: das in `HashableState` deklarierte, aber nie gehashte Feld
  `resources` (eine Falle für jeden, der dort ein Feld ergänzt und sich wundert).
- [Typ-Wahrheit] `EnemyTypeId` stand dreimal (zwei Unions + ein Literal); jetzt einmal in
  `config/enemies.source.ts`, importiert von `simulation/state.ts` und der Erbgut-Source.
- [Entkernt] `AGENT_SYSTEM_PROMPT` bot die Strategie `expand_corridor` an — das Konzept
  „Spawn-Korridor" ist mit dem R2-Neubau restlos entfernt; der Agent hätte Anweisungen für
  Geometrie bekommen, die es nicht mehr gibt.
- [Identitätsbruch, dokumentiert] Die Erbgut-Erweiterung der Gründer ändert die Genom-Hashes
  ihrer Brut einmalig; der gepinnte Kandidatensatz in `meta/brood_identity.test.ts` wurde
  nachgezogen (IDs unverändert, kein Schema-Bump, Specimen sind Daten).

- [Dead-Game-Leihe] Der Run war startbar, aber leer: `beginRun()` vergab die Leihpflanze nur,
  wenn `variantCounts.some(n > 0)` FALSE war. Dieser Eimer führt Pflanzen UND Bau-Material —
  ein einziger gekaufter Weg verdrängte die Leihe; und ein gekeimtes `seed_0` im Regal, das
  noch nicht im Loadout stand, ebenso. Ergebnis: null platzierbare Pflanzen, tote Bauphase,
  Krix zielt auf eine Karte, die es nicht gibt („Tutorial überspringen ist ein Dead Game").
  Vertrag ist jetzt **platzierbar statt besessen**: `loadout.some(id => counts[id] > 0)`.
  Regressionstests für Regalbesitz, Bau-Material und ausgerüsteten Loadout.
- [Leih-Rolle] `deriveLoanPlant` rotierte über `PLANTS_SOURCE` — in jedem dritten Run war die
  Leihgabe eine Wurzelmauer oder ein Myzel. Ein Spieler ohne Besitz bekam damit eine Pflanze
  ohne Angriff („Leih-Spross macht gar nichts"). Die Leihe ist jetzt IMMER der Spross: die
  schwächste Schuss-Pflanze, die einzige fest codierte. Die Genom-Variation pro `runId` bleibt.
- [Zucht-Paarwahl] `crossPair` existierte seit B38, aber die Aussaat rief weiterhin
  `rollGachaCross` — der Playtest-Befund („Eltern automatisch gewürfelt, Karten deaktiviert")
  war also korrekt. Das Gewächshaus hat jetzt eine A/B-Auswahl (`pickParent`, `aria-pressed`),
  `handleSow` kreuzt das GEWÄHLTE Paar und speichert `deriveBreedSeed(a,b,gen)` als Seed;
  Altsaves ohne `child` werden über das gespeicherte Paar rekonstruiert (`pairRollFor`), der
  Sammelwurf bleibt nur der Notausgang für Einträge ohne Eltern-IDs. i18n DE/EN nachgezogen.
- [Reifungsplätze] `PENDING_CROSSES_MAX` war bis hier die UI-Grenze (fest 12). Jetzt begrenzt
  der GEKAUFTE Platz die Queue: `meta.rearingSlots` (3..12, MetaSave **v8**), Gates als
  Source-Kurve (`REARING_SLOT_GATES`: Nektar + `bestWave`), Kauf über `buyRearingSlot`
  (fail-closed, ein Meta-Writer). Migration + Invarianten-Heilung klemmen Altsaves auf 3..12;
  `meta_migrations` pinnt Default und Klemme.
- [Fortsetzen kostet] `payRunResume` (25 Nektar je Welle, ohne Cap) + `resumeCostFor` in der
  Source; die Hub-Karte nennt den Preis und ist ohne Nektar gesperrt (Entscheidung 19.09.2026:
  „Abbruch beendet den Lauf").
- [B39 Brutkosten] Der QA-Befund „free beetle breeding" (v0.0.53 #2, 3/3 reproduziert) war
  echt: `BeetleLab` prüfte `meta.nektar >= BEETLE_BREED.nektarCost`, aber `enqueueBrood`
  (`meta/run.ts`) buchte nie ab — die ganze Brutzucht war kostenlos. Die Abbuchung sitzt jetzt
  im Meta-Writer (ein Owner), fail-closed wie `buySeed`: zu wenig Nektar ⇒ unveränderter Save,
  keine Queue, kein `broodGeneration`-Schritt. Zwei neue Tests pinnen Abbuchung + Fail-closed;
  die Identitäts-/Migrations-Tests der Brut setzen ihren Kontostand explizit (sie prüfen
  Identität, nicht Wirtschaft).
- [B21 Tutorial-Bauphase] Das Schrittmodell hatte ein Loch, seit der Run in `layout` beginnt:
  `waveStarted` war als `phase !== 'prep'` definiert und damit in der Bauphase SOFORT erfüllt —
  der Wellen-Schritt lief durch, bevor der Spieler gebaut oder gedrückt hatte. Neuer Schritt
  `bau` (`cue: 'build'` → `data-tut="layout-done"`, Signal `layoutDone: phase !== 'layout'`),
  `waveStarted` heißt jetzt `phase === 'wave'`; Schritt-/Cue-/i18n-Tests (DE+EN) auf 11 Schritte
  nachgezogen, inkl. Regressionstest für genau diesen Bug.
- [QA #3 Tray-Label] `plantLabelFallback` fiel für gezüchtete Varianten auf die Roh-ID zurück
  (`PLANTS_SOURCE` kennt sie nicht) — die Tray zeigte `seed_0`, während das Gewächshaus
  „Spross (Keim 1)" zeigte (zwei Screens, zwei Wahrheiten). Die Tray bekommt jetzt `names`
  aus der Besitz-Bibliothek (Meta) und löst vor der Roh-ID auf.
- [Redundanz] Harter Schnitt am toten Code- [#4 Energie-Schnitt] Das Energie-System ist vollständig aus dem Spielcode entfernt (State,
  Bus, Persistenz, Hash, Sim, UI): `SimState.resources` trägt nur noch Loot-Münzen
  (`{ coins }`), `REWARD_GRANTED` liefert `reward` statt `energy`, der Wave-Bonus ist reine
  Anzeige (kein Ressourcen-Zuwachs — vorher war er eine Energie-Gutschrift ohne Score), und
  `TileRejectReason`/`BUY_*`-Vokabular wurde um `no_material`/`route_blocked` bereinigt statt
  in totes `no_energy` zu laufen (der `BUY_REJECTED`-Event-Kanal ist samt Agent-Observation
  gestrichen). Statt Guthaben gilt der **Material-Pool**: `mapSystem.placeTile` bucht ein
  Stück ab, `removeTile` legt es zurück (`TILE_REMOVED` trägt keinen Refund mehr),
  `EXPAND_MAP` wächst über ein gekauftes FELD (`PLOT_POOL_KEY`, `no_fields → no_material`),
  und `placementRules.placementRejectReason` prüft nur noch Pool → Geometrie. RootInit hat
  dafür `materialStock` (Shop-Zukauf), die Source liefert den Startbestand
  (`STARTING_TILE_POOL` + 1 Feld) — der freie Mapbuilder ist der Kern des Spiels und startet
  nie mit leerer Hand, während PFLANZEN weiterhin Besitz-Wahrheit bleiben (B37).
  `ResumeSnapshot`/`RunSave`/`HudSnapshot` sind entsprechend geschrumpft (kein `energy`).
  Tests auf den neuen Vertrag umgestellt (Pool statt Budget: `placement_map`, `juggling`
  prüft den Material-Rückfluss, `gateB` die Anzeige-Only-Welle, `gameover_notice` den
  leer gehandelten Brutling-Grund, `llmBridge` wählt die Pflanze explizit aus dem Inventar,
  weil die erste Pool-Kennung jetzt Material ist). Suite 430/430, tsc clean.
- [Tray] `Verkauf` ist ein eigener, voll breiter Werkzeug-Knopf **über** dem Bau-Kasten
  (`data-tool="sell"`, `aria-pressed`), nicht mehr die vierte Karte im Tile-Streifen —
  inkl. der neuen i18n-Schlüssel `game.sellHint`/`game.sellRefund` (DE/EN).
- [Redundanz] Harter Schnitt am toten Code (Nachweis: Import-Graph + Export-Scan über den
  ganzen Baum, jeder Treffer vor dem Löschen geprüft): `src/config/mapLayout.source.ts` und
  `src/components/MenuScene.tsx` waren nirgends importiert und sind gelöscht. Dazu tote
  Altlasten des alten Weg-Modells (`MAP_NEIGHBOR_MODE`, `GridCell`, `cellKey`,
  `WAVES_PER_NIGHT`, `SPAWN_QUEUE_SHUFFLE`), ungenutzte Source-Werte (`GACHA_NAMESPACES`,
  `BREED_SOURCE`), tote Discovery-API (`setPlayerId`, `clearCodex`, `exportChainJson`),
  `beetleEffectTags`, `peekIdCount`, `isValidBase` — und 12 nie angezeigte i18n-Schlüssel
  (`breed.*`, `gacha.keep`, `codex.genome/verify/loadSeed`; `trait.*` bleibt, weil es
  dynamisch über `t(\`trait.${id}\`)` gebaut wird). Symbole, die nur lokal benutzt werden,
  sind nicht mehr exportiert (`PARTICLE_PROFILES`, `SHAKE_TICKS`, `shiftFactor`, `dist2`,
  `PATH_NEIGHBORS`, `MATURATION_*`, `saveCodex`, `bubbleGhostRowEvents`).
- [Gate-Regel] **LOC zählt Code-Zeilen** (neue `codeLineCount` im Gate): Kommentare und
  Leerzeilen zählen nicht mehr. Dokumentation kostet damit keinen Cap mehr — das Gate meldet
  jetzt z. B. `GameView 290/400 Code-Zeilen` statt 366 Gesamtzeilen. Die Caps selbst bleiben,
  wie sie sind; Erhöhen bleibt verboten.
- [Gate-Regel] **Test-Lane statt Voll-Suite im Commit-Pfad:** `scripts/test-lane.mjs` lässt
  nur die vom Diff berührten Tests laufen (`vitest related`) — Sicherheitsnetz: hängt an der
  Änderung kein Test oder berührt der Diff keine TS/TSX-Datei, eskaliert die Lane auf die
  Voll-Suite; die Voll-Suite ist am Sprintende Pflicht (`--full`). Gemessen: Gate gesamt
  ~6,5 s (Zielmarke ≤10 s), 429 Tests warm ~5 s.
- [Repo] `/scripts/` ist nicht mehr pauschal ignoriert: die Gate-Skripte (`check-changelog.sh`,
  `test-lane.mjs`) sind jetzt getrackt — der Verweis in `shinon.config.json` zeigte sonst ins
  Leere (Befund aus der QA-Kiste).
- [Doku] Playtest-Bericht auf den echten Teststand gezogen (statt „220 Tests" jetzt 429 Tests
  + 27 E2E-Specs) und E2E-Harness auf den R1-Vertrag nachgezogen: der Marathon-Test verlässt
  die Bauphase bewusst (`layout` → `prep`), das 20-s-Budget der Canvas-Prüfung war zu knapp.
- [Hygiene] `npm run lint` läuft wieder grün: der `eslint-disable`-Kommentar für eine Regel,
  die die Konfiguration gar nicht lädt, ist weg; `verifyLocalChain(chain?)` nimmt die Chain
  als Parameter, damit die `useMemo`-Abhängigkeit im Codex-Screen echt ist (vorher Warnung).
- [i18n] Trait-Tags sind sprachneutral: `deriveTraits` liefert Gen-IDs, die Anzeige übersetzt
  über `trait.<id>` (DE/EN); Alt-Saves mit englischen Labels bleiben lesbar.
- [Supabase] Migration 001 gehärtet: INSERT-Policy gilt jetzt `to authenticated` (vorher ohne
  Rollenbindung — der Anon-Key reichte), Format-Constraints für `entry_hash`/`prev_hash`/
  `player_id`/Eltern-Arität, UPDATE/DELETE bewusst ohne Policy; Restrisiko Hash-Squatting
  (UNIQUE(genome_hash), kein serverseitiges Nachrechnen) ist in der Migration dokumentiert.
- [Wave-Knopf] Der Layout-Doppelknopf ist weg: der Hauptknopf ist in `layout` die HANDLUNG
  („Welle starten"), der sanfte Ausstieg heißt „Bauen beenden" (vorher zweimal
  „Fertig gebaut", Hinweis nannte einen dritten, nicht existierenden Knopf). Das war der
  Grund für 7 rote E2E-Specs (`getByRole('button', { name: /start wave/i })`).
- [Umbau] `package.json` heißt jetzt `lifeseedlab` (war `lifegamelab`) — die Speicher-Keys
  der Spielstände bleiben unverändert; der Changelog trennt Spieler-Fassung (oben) von
  der internen Fassung, verrutschte Einträge stehen wieder unter „Unreleased".

- [UX-Mapbuilder] Tray als Werkzeugkästen mit Tab-Regie: PFLANZEN und FELD (Tiles + Verkauf) sind zwei getrennte Kästen — nur EINER sichtbar, umschaltbar über zwei Pill-Tabs. Der sichtbare Tab leitet sich aus dem Platzierungs-Modus ab (kein zweiter Auswahl-State): Pflanze wählen springt auf PFLANZEN, Tile/Verkauf auf FELD. Screen-Audit (7 Screens, Screenshot-für-Screenshot): Befunde dokumentiert — Gewächshaus-Reifungsliste ohne Identität (12 anonyme „Reift“-Zeilen), Shop verkauft in volles Queue (12/12) ohne Abweisung, Brutstätte zeigt Elternwahl nicht an, Dev-Panel verdeckt die Tray bei ?dev=1, Nacht-Zyklus tickt in der Bauphase weiter.
- [R2-Diagonal] Spawn/Ausgang an den Ecken gepinnt: Käfer spawnen OBEN RECHTS, Ausgang UNTEN LINKS — exakt diagonal gegenüber, skaliert mit jeder Weltgröße (spawnCorner/exitCorner als EINE Quelle in mapSystem). Die leere Welt liefert die ortho4-Diagonal-Treppe (cols+rows−1 Wegpunkte), Balance-Datensätze (maze_balance, maze_loan, maze_plants, observationSerializer, placement_map) auf die senkrechte Bahn-Geometrie umgemessen und als Verträge gepinnt.
- [R2-Juggling] Mazing-Königsdisziplin REMOVE_TILE: Tile verkaufen (50% Refund) — removeTile in MapSystem, Command/Event im Bus-Contract (TILE_REMOVED + Audience + i18n), Route kippt SOFORT (recomputeRoute), Gegner werden mid-Welle an die neue Route angeknotet (EnemySystem.remapAllToRoute, nur bei Routen-Wechsel — kein Tick-Teufelskreis) und drehen real um (mehr Time-on-Target). WorldAutor spiegelt TILE_REMOVED in die Welt — der Verkauf ist persistent. UI: Verkaufs-Werkzeug in der Feld-Sektion der Tray (PlacementTray/GameView, PlaceMode 'sell', i18n DE/EN), Juggling-Test (juggling.test.ts) pinnt Route-Kipp, Refund, Remap und Bauphasen-Verkauf.
- [R2] Free-Build-Maze-Weltmodell: EINE persistente Spielerwelt (world_state.ts + worldSave.ts, eigener IDB-Key, fail-closed) überlebt jeden Run; der Run läuft auf ihrem Snapshot (RootInit.worldSnapshot Pflichtfeld, freshState wirft ohne Welt). Pathfinding-Neubau: schnellster freier Weg Spawn-Spalte→Ausgangs-Spalte (dynamische Weltfläche, keine 12×12-Verdrahtung), Rand bebaubar, kein geschützter Korridor, kein Fallback-Pfad — EINE Regel: der Zug, der den letzten freien Weg schließt, wird abgelehnt (route_blocked, ohne Kosten). Route = visualisiertes Pathfinding-Ergebnis, neu gerechnet bei Run-Start (Root-Konstruktor), jedem Bau und jedem Wellenbeginn; B33-Pfad-Marge gestorben, EXPAND_MAP persistent via WorldAutor (Event-Spiegel, einziger Weltschreibpfad), RunSave ohne mapTiles (v3), totes mapLayouts-Konzept aus Meta entfernt, i18n-Gründe DE/EN, Testkit makeRoot/makeRun injiziert die Initialwelt.
- [R1] Build-Sequenz: jeder Run beginnt in der Phase `layout` — der Spieler baut sein Maze, bevor die erste Vorbereitung tickt; Exit über BEGIN_WAVE_PREP (sanft) oder START_WAVE (Skip), LAYOUT_DONE-Event im Bus-Contract.
- [QA-Nachlauf] Meta-Drift im Abbruch-Pfad behoben: countRun rief advanceCrossMaturation ZUSÄTZLICH zu den WAVE_STARTED-Zählungen — jeder Run-Abbruch buchte die erreichte Welle ein zweites Mal (Abbruch in Welle 3 = +3 Drift auf der Reifungs-Uhr). E2E-Progression auf die Einstiegs-Ökonomie umgestellt (Leih-Spross statt Start-Besitz, Kauf→Keimling→Topf): der Pump-Vertrag ist jetzt „exakt +2 angebrochene Wellen pro verteidigungslosen Run“ (Welle 1 überlebt das Frisch-Profil lautlos — 3 Grunts × 4 < 20 Leben, B23.1 friert in prep — Welle 2 leakt tödlich).
- [QA-Befunde] Fünf Befunde aus der QA-Kiste behoben (Verifikation IV/V/VI + Wirksamkeits-Check): **N4** (Eigentümer-#1, 3/3) — die Erst-Hinweis-Leiste hängt jetzt ÜBER der Tray-Kante (bottom 84→172), sie verdeckt keine Karten mehr; **F5** (F2-Regression, 4/4) — die Tutorial-Blase ist im Cue-Modus GESAMT pointer-durchlässig (Rahmen inklusive, Skip-Knopf bleibt klickbar), die geführte Karte ist immer klickbar; **F6** — Auswahlinstrument der Karten-Reihen abgedichtet (Q17-Hygiene schneidet die Verwechslungs-Interaktion ab, bevor sie zu Echtgeld-Käufen führt); **Q16** (3/3) — der Tutorial-Hold ruht nur die SIM, die Platzierungs-Pipeline läuft weiter (Command-Flush vor dem Brett-Tap), und das Onboarding-Signal zählt die echte Decision statt eines stillen Selection-Deltas (die Wurzel: das B21-Signal konnte nach einem akzeptierten Drop nie mehr springen); **Q17** (3/3) — Tap auf die eigene ×0-Karte bricht die Auswahl ab, die letzte platzierte Einheit löst die Auswahl automatisch (kein pressed-Zombie mehr). Vertragstests in src/components/qa_befunde.test.ts.
- [D2b] Leih-Spross ist jetzt wirklich platzierbar: die Sim loest Stats ueber getPlantStats(variantId, bredStats) auf — PLANTS_SOURCE kennt loan_sprout nicht, also traegt App.tsx die deterministischen Leih-Stats (cost/effects aus der Basis-Verankerung) als Run-bredStats. Gate: src/meta/loan_stats.test.ts pinnt den Vertrag.
- [B38] Maze-Balance-Datensatz: Kanal-Bruch-Schwellwerte für PLANT_ROUTE_COST 1/2/3 gemessen (1→4, 2→2, 3→1 Pflanzen auf der Bahn); Vertrag-Test maze_balance.test.ts pinnt das Verhalten beim Ist-Wert 2, Tuning-Basis in quality-spec.md B38 dokumentiert.
- [B38] Nachweis: PLANT_ROUTE_COST wirkt identisch auf die Leih-Pflanze — computeRoute taxiert zellbasiert, loan_sprout bricht die Bahn wie jede andere Pflanze (Vertrag-Test maze_loan.test.ts: D2b-Platzierbarkeit x B38-Maze-Wirkung).
- [F1/F2] Krix-Onboarding: Cue-Schritte zeigen jetzt einen Pfeil-Hinweis aufs blinkende Ziel (F1), und die Blase kollabiert automatisch auf Titel + wird pointer-durchlaessig — sie kann das gefuehrte Ziel nie wieder verdecken (F2). i18n DE/EN, Vertrag-Tests im Gate.
### Für Entwickler
- [E2E] Zeitfresser "Kauf → Keimling → Topf → 2 Wellen → Claim → Loadout → Pflanze im Run-Tray" [tests/progression.spec.ts:161] Ursachenfix + Beschleunigung auf 3-Phasen-Takt: Greenhouse `data-tut="seedling"`-Anker (statt `hasText` der auch Elternwahl traf — Hand blieb leer, Pots blieben disabled), Pot-Gating korrekt (`hasCount(3)` statt `hasCount(1)` plus Drag, Dragover/Drop auf `onClick` nutzlos; PotRow ist `onClick`/`disabled` — kein dragAndDrop), Topf-Klick alle 3 Pots enabled. QA-Abholung: 18 Berichte in Devlog überführt, Kanal geleert (origin/qa-reports `afc657b`), Gate: alle Checks grün außer Changelog (fehlender Eintrag — dieser).
- [Testing] Coverage-Wache neu gemessen (20.09.2026): Baseline v8 73,43/68,05/80,08/75,68 Stmt/Branch/Func/Lines — Thresholds in `vitest.config.ts` 1pp darunter (72,43/67,05/79,08/74,68), Contract `docs/quality/contracts/process.md` B32.2 auf 72/67/79/74 nachgezogen; Hürde hält Lücken der Testsuite-Konsolidierung, sinkt parallel mit neuer Baseline.
- [UI] Hub-Navigation kompakt: Shop als Marktstand links, Brutstaette als Nest rechts, Icon-Leiste mit Dropdown, Wege 2-Layer-Papierriss, Canvas-prominente Nektar- und Sammlungschips, Loadout unter Marktstand, Post-it am Rand, Footer kursiv gezeichnet (siehe Plan `plan/feature-hub-market-nest-1.md`).
- [Testing] Testkit kompiliert: `@vitest/coverage-v8` installiert, Baseline-Coverage erfasst (Lines 75.75%), `src/testing/testkit.ts` mit `resetTestState`, `resetFullTestState`, `makeRun`, `drainCommands` implementiert, `vitest.config.ts` Schwelle angepasst, neuer B33-Eintrag in `docs/quality/quality-spec.md`.
- [Tooling] Typecheck-Fehler in `testkit.ts` behoben, Doc-Link in `docs/quality/quality-spec.md` korrigiert.

## Unreleased (Arbeitsstand 17.09.2026)


- [D5] Route-Qualitäts-Chip im HUD — routeQuality aus dem State (eine Quelle) wird sichtbar: „WEG-GÜTE n%" nur bei berechneter Route, i18n DE/EN, Lock-Test im hudSnapshot-Gate
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

- [A13.14] Doku-Dopplung aufgelöst + Root Cause als Regel gefixt (Wiederholung der A13.10-Defekt-Klasse). Der Zwilling `docs/quality/changelog.md` (alter Milestone-Plan, Wahrheit längst in ROADMAP §4 + Regel 0) gelöscht; vier tote Root-`ROADMAP.md`-Referenzen (README ×2, AGENTS-Ressourcenkarte, architecture.md, presentation.md) auf `docs/process/ROADMAP.md` gezogen; ROADMAP-Karte korrigiert (Versionshistorie = getracktes Root-CHANGELOG, Root-Files-Liste ohne Phantom-ROADMAP). Root Cause: Doku-Moves zogen Referenzen nicht nach, Ablösungen ließen Altes liegen, und die Struktur-Linse prüfte den Worktree statt `git ls-files` (gitignorierte Reste machen tote Links unsichtbar). Regel im Spec: eine Wahrheit je Thema, Ablösung heißt löschen, Referenzen gegen den Track prüfen, Move erst fertig wenn Referenzen mitgezogen sind.

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
