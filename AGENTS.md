**QA-Abholung vor Task-Start (PFLICHT):** Bevor ein Task beginnt, den QA-Berichte-Branch prüfen:

```bash
git fetch origin qa-reports
git log HEAD..origin/qa-reports --oneline -- qa/
```

Gibt es neue Berichte unter `qa/`: **Lesen** (jeder Bericht ist Eingabe für den Task),
Status der Befunde im Bericht auf `in-arbeit` / `erledigt` / `widerlegt` setzen
(kleiner Commit auf `qa-reports`, Betreff `docs(qa): status <bericht> <befund>`),
**erst dann** mit dem eigentlichen Task beginnen. Der Branch ist ein Übermittlungskanal —
nie mergen, nur Berichte pflegen (Details: `qa/README.md` auf `qa-reports`).

---

## VERPFLICHTENDER REPOSITORY-SEARCH WORKFLOW

BEVOR Dateien gelesen, bearbeitet oder Architekturentscheidungen getroffen werden:

1. Zuerst Repository-Struktur ermitteln.
2. Für Dateisuche `rg --files` verwenden.
3. Für Text-/Symbolsuche `rg` verwenden.
4. Suchbereich gezielt auf relevante Verzeichnisse und Dateitypen begrenzen.
5. Erst danach relevante Dateien lesen.
6. Niemals den gesamten Repository-Inhalt lesen, wenn eine gezielte Suche möglich ist.
7. Niemals `ls`, `dir`, `find` oder vergleichbare langsame/unkontrollierte Vollbaumsuchen als primäres Suchwerkzeug verwenden, wenn `rg` die Aufgabe erfüllen kann.
8. Bei unbekannter Architektur zuerst Search/Recon durchführen.
9. Vor Änderungen muss nach bestehenden Implementierungen gesucht werden.
10. Eine neue Struktur darf erst erstellt werden, nachdem geprüft wurde, ob bereits eine semantisch passende existiert.

Diese Regeln sind PFLICHT und dürfen nicht übersprungen werden.

# AGENTS.md — Arbeitsvertrag für Agenten (context-free briefing)

> Dieses Dokument ist die **einzige Pflichtlektüre** für einen Agenten ohne bisherigen Kontext.
> Lese es vollständig, bevor du Code schreibst. Vertiefung: [`architecture-contract.md`](docs/architecture/architecture-contract.md) (rechtsverbindlich) · [`architecture.md`](docs/architecture/architecture.md) (Technik) · [`quality-spec.md`](docs/quality/quality-spec.md) (Arbeitsliste).

---

## Regel 0 — Changelog‑Pflicht**Vor jedem Commit muss das Changelog (CHANGELOG.md) mit einem neuen Eintrag aktualisiert werden.** Der Eintrag beschreibt die getätigte Änderung im Stil einer einfachen Aufgabenliste (z. B. "- [Ticket] Beschreibung der Änderung"). Danach muss das Changelog staged sein (`git add CHANGELOG.md`). Der pre‑commit‑Hook prüft, dass das Changelog geändert wurde und erhöht automatisch die Patch‑Version in package.json.

Der Hook hebt die Version **nach** der Index-Aufnahme an: `package.json`/`src/version.ts` bleiben danach uncommitted um +1 zurück und werden erst vom nächsten Commit eingesammelt — eingebautes Muster, kein Fehler.

## Regel 1 — Sprache

**Antworte, dokumentiere und benenne Artefakte auf Deutsch.** Code, Identifier, Fehlermeldungen und zitierte Inhalte bleiben original (Ausnahme wie im Systemvertrag). Commit-Messages: Deutsch, prägnant, Intention vor Beschreibung.

## Regel 2 — Modularität & Ownership

**Wir bauen neu, wenn es Sinn macht — und brechen Zuständigkeits-Besitz nie auf.**

Konkret:
1. **Ein Modul = eine Hauptverantwortung.** Überschreitet eine Datei ihre Verantwortung oder ihr LOC-Cap: **splitten**, niemals das Cap erhöhen, niemals „später aufräumen".
2. **Ein State-Slice hat genau einen Writer.** Die Ownership-Tabelle (unten) ist fix. Cross-Slice-Einfluss nur via Command (rein) oder Event (raus). Wer einen zweiten Schreibpfad einführt, hat die Architektur gebrochen — egal ob der Test grün ist.
3. **Neu bauen > herumnudeln:** Ist ein Modul falsch (falsches Modell, Altlast, Dopplung), wird es **gelöscht und neu** gebaut — nicht um fünf Ifs erweitert. Bestehende, korrekte Module werden **nicht** aus Sentimentalität dupliziert oder parallel gehalten. Es gibt genau eine Quelle pro Wahrheit.
4. **Vor jedem Schreiben die 8-Fragen-Sperre** (aus dem Contract): Existiert die Funktion schon? Welches Modul besitzt sie? Gameplay/Source/Event/Observer/Rendering? Neues Event/Command nötig? Welcher Seed-Namespace? Regel in Source statt Code? LOC-Cap ok? Entsteht eine zweite State-Quelle? Erst dann implementieren.

---

## Regel 3 — Namenskonventionen

**Um Namenskollisionen zu vermeiden, müssen alle Dateien unter `src/` domänenspezifische Präfixe verwenden:**
`<domain>_<descriptiveName>.[ts|tsx]` (z. B. `beetle.test.ts` → `genome_beetle.test.ts`).

Dies verhindert Konflikte bei automatisierten Werkzeugen und erleichtert die Zuordnung von Dateien zu Verantwortungsbereichen.

Ein lokales Hilfsskript (check-duplicate-basenames, im ignorierten Werkzeug-Ordner scripts/) prüft, ob zwei Dateien denselben Basenamen (ohne Erweiterung) teilen. Es ist bewusst nicht Teil des Repositorys und sollte lokal ausgeführt werden.

## Ownership-Karte (Writer — nicht verhandelbar)

| Slice | Writer (genau einer) |
|---|---|
| Spielzeit (tick/phase/waveTime) | `core/clock.ts` (GameClock) |
| Pflanzen | `simulation/plantSystem.ts` |
| Gegner | `simulation/enemySystem.ts` |
| Projektile | `simulation/projectileSystem.ts` |
| Energie/Score/Nektar-Lauf | `simulation/scoreSystem.ts` |
| Combo | `simulation/comboSystem.ts` |
| Wellen/Schedule | `simulation/waveSystem.ts` |
| Gesamter SimState | `simulation/root.ts` (SimulationRoot) |
| Content-Werte | `config/*.source.ts` (SOURCE = CONTENT TRUTH) |
| Visuals | `visual/generator.ts` (visualSeed + Source = ResolvedVisual) |
| Kamera/FX/Partikel | `observers/*`, `render/camera.ts` (read-only Beobachter) |
| Persistenz | `persistence/` (Ziel: ein `storage.ts`-Owner; meta/runSave als Schema-Adapter) |
| React-State | Screen-Router `App.tsx` + jeweilige Komponente |

**Nie:** Canvas/React schreibt Gameplay · Particle beeinflusst Gameplay · Audio erzeugt RNG · System ruft System direkt (immer Bus).

## LOC-Caps (hart) — gezählt werden CODE-Zeilen

`300` Simulationssysteme/Bus/Clock/RNG/IDs/Hash · `400` Renderer/Generator/Partikel/Observer/UI-Komponenten · `200` Types/Source/Meta/i18n/Persistenz. Über dem Cap → STOP, Verantwortungs-Audit, splitten. Ausnahme nur mit Einzeiler-Begründung im Dateiheader.

**Zählregel:** Es zählen **nur Code-Zeilen**. Kommentare (Zeilen, die mit `//`, `/*`, `*` oder `*/`
beginnen, Block-Kommentare über `inBlock` verfolgt) und Leerzeilen zählen **nicht** — das Gate misst
genau das (`codeLineCount` in `git-noir/shinon/checks/check.ts`). Eine Datei darf also reich
kommentiert sein, ohne den Cap zu berühren; gewachsene *Logik* schlägt weiter an. Kein Erhöhen eines
Caps, um Code unterzubringen: verdichten oder splitten (Ist-Stand 19.09.2026: größe Code-Datei
`src/i18n/translations.ts` 362, absolute größte Datei `src/components/GameView.tsx` 290/400 —
Kommentar-Anteil liegt bei vielen Dateien zwischen 20 % und 40 %).

## Determinismus (nie antasten)

- `Math.random`/`Date.now` sind in Spiel- und Präsentationslogik **verboten**. `performance.now` nur im Frame-Timing (GameView-Loop).
- Alle Zufälligkeit via `core/rng.ts`: `deriveSeed(rootSeed, namespace, entityId, eventId, version)`. Gameplay-Namespaces `world|wave|enemy|plant|brood|loot`, Präsentation `visual|particle|cosmetic` — dürfen sich nie gegenseitig advanced/stören. (`brood` = Käferzucht, seit B30 eigene Domäne; vorher lief sie unter `enemy`. Namespace-Änderungen sind Identitätsbrüche: Migrationsentscheidung in quality-spec B30, Seeds test-gepinnt in `genome/genome_brood_domain.test.ts`.) FX ON/OFF muss bit-identisches Gameplay liefern.
- Seeds sind ableitbar, nie Zustand: Run-Identität = `runId` (eine Autorität, persistiert in Meta).

## Verifizierung (einmal am Ende der Aufgabe — NICHT nach jedem Edit)

Typecheck und Tests laufen **genau einmal**, wenn die Aufgabe inhaltlich fertig ist — unmittelbar
vor dem Commit (`shinon finish` fährt ohnehin das Gate). Während der Umsetzung: schreiben, nicht
in Dauerschleife prüfen. Ausnahme: eine gezielte, einzelne Testdatei zur Fehlersuche
(`node node_modules/vitest/vitest.mjs run <datei>`), kein kompletter Lauf zwischendurch.

**Kein `npx`/`npm run` in der Verifizierung** — das npm-Startup kostet auf dieser Maschine ~3 s
**pro Kommando** bei jedem Aufruf. Die Werkzeuge werden direkt über Node gerufen (identisch zum
Gate, `gate.commands` in `shinon.config.json`):

```bash
node node_modules/typescript/bin/tsc -b --noEmit   # Typecheck, inkrementell (~0,3 s warm)
node scripts/test-lane.mjs                         # Commit-Lane: NUR die berührten Tests
node scripts/test-lane.mjs --full                  # Sprintende: komplette Suite
node node_modules/vite/bin/vite.js build           # nur wenn Build-relevant geändert
```

**Test-Lane-Regel (Budget 10 s):** Im Commit-Pfad wird **nicht** mehr alles getestet. Das Gate ruft
`scripts/test-lane.mjs` — die Lane bestimmt aus dem Diff gegen `HEAD` die berührten Dateien und lässt
nur die Tests laufen, die an ihnen hängen (`vitest related`, gemessen 19.09.2026: eine geänderte
Source-Datei ⇒ 273 statt 429 Tests, ~3,4 s statt ~5,2 s). **Sicherheitsnetz, damit „nicht alles"
nie „nichts" bedeutet:** hängt an der Änderung kein Test (neues Modul, reine Datenänderung), oder
berührt der Diff keine TS/TSX-Datei, eskaliert die Lane automatisch auf die Voll-Suite; ein roter
Impacted-Lauf bricht ab, ohne zu eskalieren. Die **Voll-Suite ist am Sprintende Pflicht**
(`--full`, zusätzlich zu E2E) und bleibt im Gate die Wahrheit für den README-Status.

Kein „sollte passen", kein claims ohne Ausführung — aber auch kein Ressourcen-Verbrennen durch
wiederholte Läufe innerhalb einer Aufgabe. Dev-Server/Preview wird **nie** manuell gestartet/gestoppt/killt (Plattform-managed). `vite.config.ts` ist **tabu**.

Kosten & Haken der Werkzeuge: die Hooks in `git-noir/hooks` (`core.hooksPath`) fahren bei **jedem**
Commit das Gate — LOC-Caps, Architektur-Constraints, Typecheck, Test-Lane, **warm ~6,5 s**
(gemessen 19.09.2026: Gate gesamt ~6,5 s — Test-Lane IMPACTED 5,9 s, Typecheck 0,3 s,
LOC-Caps 0,004 s; Zielmarke ist **≤10 s** für den Commit-Pfad, mit der Voll-Suite am Sprintende),
fail-closed (rot ⇒ Commit abgebrochen). Die E2E-Stufe liegt bewusst **nicht** im Commit-Pfad
(`gate.checks.e2e=false` in `shinon.config.json`): sie kostet Minuten und läuft getrennt vor dem
Sprint-Abschluss (`node node_modules/playwright/test/cli.js test`).
Die Posten, die den Commit früher auf Minuten zogen (60-s-Gate vom 16.09.), sind an der Wurzel
abgestellt — nicht per abgeschwächter Prüfung:

1. **Typecheck** läuft inkrementell: `incremental: true` + `tsBuildInfoFile` in der `tsconfig.json`
   (Cache in `node_modules/.tmp`, `*.tsbuildinfo` ist gitignoriert). Vorher prüfte `tsc -b --noEmit`
   jede Datei neu (~8 s); warm sind es ~0,3 s. Der Cache schlägt über Inhalts-Hashes fehl, nie über
   Zeitstempel: neue und geänderte Dateien werden geprüft, gelöschte Dateien fallen aus dem Cache.
2. **Tests** laufen mit `isolate: false` (`vitest.config.ts`): ein Worker-Pool statt 41 Isolaten
   (je ~3,7 s Spawn-Overhead = ~27 s vor dem ersten Test); dazu `fsModuleCache: true` — die
   Transformate werden inhaltsgehasht gecacht statt pro Lauf neu erzeugt. Test-Suite kalt ~10 s,
   warm ~4–5 s (vorher 44–56 s), und die Parallelitäts-Timeouts in `meta/capping.test.ts` sind weg.
   **Dazu die Lane** (siehe oben): im Commit-Pfad nur die berührten Tests — die Suite darf wachsen,
   ohne das Budget zu sprengen.
3. **Kein `npx` im Gate.** `npx` kostet auf dieser Maschine ~3 s npm-Startup **pro Kommando**; das
   Gate ruft die Werkzeuge direkt über Node auf (`gate.commands` in `shinon.config.json`). Der
   Changelog-Check läuft über `spawnSync` (GitHelfer) statt `execSync`-Shell: ~1,1 s → ~0,1 s je
   Lauf, Fehlerpfad (CHG002) in `git-noir/shinon/tests/changelog-check.test.ts` gepinnt.

Kalt (frisches `node_modules`, erster Lauf nach Änderungen) kostet der erste Durchlauf einmalig
~15 s; das ist der Cache-Aufbau, kein Deckel auf das Ergebnis.
**Gate-Timeout ≠ echter Fehler:** ein `finish --all` kann unter kaltem Cache an einem Test-Timeout
hängen bleiben (Befund: `capping.test.ts`, 100-Register-Schleife ~2–3 s) — vorher zweimal grün,
danach einzeln grün. Reaktion: die Datei einzeln messen, nichts "fixen", Gate einfach erneut
fahren; der abgebrochene Lauf hat nichts committet (Push-Wahrheit prüfen).
Deshalb **einmal am Aufgabenende** `node node_modules/typescript/bin/tsc -b --noEmit` +
`node node_modules/vitest/vitest.mjs run` selbst laufen lassen (ohne `npx`-Overhead). Nachrichten per
`git commit -F <datei>` oder `git commit -F -` mit Heredoc übergeben; der `commit-message`-Check liest
die vorbereitete Nachricht aus `commit_msg.txt` im Repo-Root (bzw. die übergebene Nachricht).
Selbsttest der Nachrichtenregel: `node git-noir/shinon/cli.ts message --self-test`.

Werkzeug-/Regel-Haken beim Gate:
- Betreff muss `type(scope): …` folgen (MSG002), > 72 Zeichen ist nur Warnung (MSG003), „#“-Zeilen
  und fehlende Leerzeile sind Warnungen (MSG004/005).
- Die File-Lese-/Edit-Werkzeuge liefern für `git-noir/`-Dateien `[BLOCKED]` — Dateien dort per
  Terminal lesen/schreiben (`cat`/`sed`, python für Zeichen-genaue Ersetzungen).
- JS-Regex-Quirk beim Bearbeiten der Footer-Regel: `/^🤖?…/` matcht überraschend **nichts** ohne
  Emoji — Emoji-optional als `/^[\u{1F916}]?…/iu` schreiben.

## Tests: Determinismus statt E2E für Mechanik-Fragen

- Mechanik-/Balance-Fragen **in vitest gegen `SimulationRoot`** messen, nicht im Browser: der echte
  Run-Seed ist `deriveSeed(GAME_SEED,'world','run',runId,1)` mit `runId = max(meta.runId, meta.runs)+1`
  (frischer Run ⇒ 1 ⇒ Seed `2447771834`). Eine Zellen-/Wellen-Karte kostet so Sekunden statt Minuten.
- E2E-Platzierung: Sim **vor** dem Aufbau pausieren (der Prep-Auto-Start beginnt Welle 1 nach
  `AUTO_WAVE_DELAY_TICKS`, während der Test noch klickt ⇒ realzeit-abhängiges Ergebnis); Erfolg am
  **eigenen `variantId`** im Sim-Zustand verifizieren (nicht an `plants.length > 0`) und bei
  eingefrorener Sim die Commands per `__ff(1)` drainieren. `isEnabled()` folgt `aria-disabled`,
  der Auswahlzustand einer Tray-Karte ist `aria-pressed`.

## Sprint-Abschluss: Preview → E2E → Shinon (verbindlich)

Nach einem **erfolgreichen Umsetzungssprint** (Code steht, Typecheck/Tests/Build grün) ist der Abschluss fest vorgeschrieben. Die Reihenfolge ist bindend und keine Stufe ist optional:

1. **Preview prüfen.** Das Ergebnis in der laufenden Vorschau ansehen — mindestens der geänderte Screen, bei UI-Arbeit zusätzlich **390×844** und Desktop. Die Vorschau wird dabei nur betrachtet, nicht selbst gestartet/gestoppt (Plattform-managed, siehe oben).
   Quirk `register_preview { htmlPath }`: es wird **nur diese eine Datei** serviert — ein
   `<img src="…">` daneben bleibt kaputt. Workaround: SVG direkt ins Prüf-HTML inlinen; Details
   (z. B. eine Signatur-Ecke) über eine zweite Instanz mit `viewBox`-Crop vergößern. Prüfdatei in
   `dist/` anlegen und danach löschen (landet nicht im Commit).
2. **E2E laufen lassen** — einmal, am Sprint-Ende: `node node_modules/playwright/test/cli.js test` (`tests/`, Chromium, baseURL `http://localhost:5173`). Playwright verwaltet seinen Dev-Server selbst (`webServer` mit `reuseExistingServer`) — nicht von Hand dazwischenfunken. Rote E2E ⇒ der Sprint ist **nicht** abgeschlossen.
2b. **Voll-Suite einmal fahren** — am Sprintende ist die Impacted-Lane der Commits **nicht** genug:
   `node scripts/test-lane.mjs --full` (429 Tests/44 Dateien, warm ~5 s). Das ist die Stufe, die den
   README-Teststand und die Aussage „Suite grün" trägt; im Commit-Pfad läuft sie bewusst nicht mehr.
3. **Erst dann Shinon.** Commit und Push laufen **ausschließlich** über Shinon:

```bash
node git-noir/shinon/cli.ts finish --all   # Vorbereitung → Gate → Commit → Push
```

   Auch dort gilt die Reihenfolge: **ohne grünes Gate kein Commit, ohne Commit kein Push.** `git commit`/`git push` von Hand sind tabu — Shinon ist der einzige Git-Abschlusspfad.

   Das Gate läuft im **Enforcement-Modus**: Warnungen blockieren wie Fehler (`gate.enforcement=strict`, persistiert in `shinon.config.json`). „Grün" heißt damit **0 Fehler und 0 Warnungen**. Der Modus ist Konfiguration, kein Per-Lauf-Flag — er gilt auch für die Hooks, und es gibt bewusst keinen Schalter, der ihn für einen einzelnen Lauf aushebelt. Umschalten ausschließlich über `node git-noir/shinon/cli.ts enforce advisory|strict`.

Der `post-commit`-Hook ruft zusätzlich Shinons Push-Stufe (`push --auto`): ein grüner Commit liegt
**automatisch** auf `origin/main` — ein anschließendes `git push` meldet „Everything up-to-date".
Push-Wahrheit ist deshalb `git ls-remote origin main` gegen `git rev-parse HEAD`, nicht die lokale
Tracking-Ref. Cloudflare deployt jeden Push auf `main` sofort (Build: `npm run build`, Deploy:
`npx wrangler deploy`).

**Deploy-Parität (grün-lokal ≠ grün-remote):** Der lokale Typecheck prüft den **Worktree**, Cloudflare
baut den **Commit**. Ein Commit kann dadurch rot deployen, obwohl lokal alles grün war (Befund
16.09.2026: eine Datei lag im Index in der alten Fassung, der Fix nur im Worktree). Vor dem Abschluss
prüfen, was wirklich im Commit landet; Reproduktions-Snapshot: `git stash push --keep-index
--include-untracked` (danach `git stash pop`) zeigt den Index-Stand, den der Commit bekommt.

Details: [`docs/setup/script-readme.md`](docs/setup/script-readme.md). Das Tooling in `git-noir/` ist lokal (gitignoriert): Werkzeug, nicht Inhalt.

## Verboten (ohne Ausnahme)

1. Zweiter RNG, zweiter EventBus, zweiter State-Owner, Dopplung bestehender Module.
2. `localStorage`/IndexedDB-Zugriff außerhalb `persistence/` (Geltung: **Spielcode**; der Playwright-Harness unter `tests/` darf den Browser-Save lesend beobachten — schreiben darf er nichts, und die Ausnahme ist im Tooling als exakte Liste test-gelockt).
3. Gameplay-Entscheidungen in Renderer/Observer/UI; Präsentations-Entscheidungen in der Sim.
4. Emojis als finale Grafik, zufällige Gradients, Stock-Icons (Art-Richtung: s. quality-spec.md B0).
5. Debug/Dev-Flächen (Seed-Badge, Hash, Zähler, `[D]`) außerhalb des DevGates (`?dev=1`).
6. Hardcoded Gameplay-Konstanten außerhalb `config/*.source.ts`.
7. Caps erhöhen, um Code unterbringen zu wollen.
8. Neue Dependencies ohne dokumentierte Begründung + Katalog-Prüfung; nie: Game Engine, State-Manager (derzeit).
9. Git-Abschluss von Hand: `git commit`/`git push` (siehe Sprint-Abschluss) — nur über Shinon.
10. Maschinelle Commit-Signaturen: „Generated with …“ und „Co-Authored-By: Codebuff …/@codebuff.com“ sind Gate-Fehler (MSG006) — menschliche Co-Authored-By-Zeilen bleiben erlaubt.

## Ressourcenkarte (wo schaue ich nach?)

| Frage | Antwort steht in |
|---|---|
| Was ist defekt/unvollständig/Placeholder? | `docs/quality/quality-spec.md` Part A |
| Wie zeichne ich X / welche Asset-Spec gilt? | `docs/quality/quality-spec.md` Part B (B0 Art-Richtung, B4 Pflanzen, B10 Welt/Gegner, B11 Dramaturgie) |
| Welche Events/Commands/Payloads existieren? | `src/bus/events.ts`, `src/bus/commands.ts` (+ Ownership-Tabelle im Kommentar) |
| Welche Particle-Profiles/Effects/Sources sind gültig? | `src/observers/particles.ts`, `src/config/effects.source.ts` + Gate-Test `sources.test.ts` |
| Was ist der Save-/Resume-Vertrag? | `docs/architecture/architecture.md` §4 |
| Wie starte ich einen Run / wo wird der Seed hergeleitet? | `App.tsx` (`deriveSeed(GAME_SEED,'world','run',runId)`) → `SimulationRoot` |
| Was wird als nächstes gebaut? | `docs/process/ROADMAP.md` §4 + `docs/quality/quality-spec.md` B1→B2→B3→B4–B6→B7/B9/B10→B12/B13 (DoD B13) |
| Signatur/Easter-Egg ändern (Name, Motto, Fragmente)? | `components/CreatedBy.tsx` + Gate `createdBy.test.ts` — Motto-Halbsatz 1 buchstabiert VANNON (test-gepinnt); neuer Menü-Screen ⇒ Eintrag in `FRAGMENT_BY_SCREEN` + Test nachziehen |
| Wie schließe ich einen Sprint ab (Preview/E2E/Shinon)? | Sprint-Abschluss oben + `docs/setup/script-readme.md` |

## Definition of Done (pro Aufgabe)

```
[ ] Ownership respektiert (kein zweiter Writer)   [ ] Modulgrenze + LOC-Cap ok
[ ] Source-driven, wo möglich                      [ ] Deterministisch (kein verbotener Random)
[ ] Bus-Contract eingehalten                       [ ] Keine versteckte State-Mutation
[ ] Observer-Regel eingehalten (read-only)         [ ] Tests vorhanden/erweitert & grün
[ ] tsc clean, Build grün                          [ ] Mobile 390×844 mitgedacht
[ ] Keine Dev-Leaks in der Release-Fläche          [ ] Bestehendes nicht dupliziert
```

Eine Aufgabe ist nicht „fertig, weil es im Browser läuft" — sie ist fertig, wenn diese Liste stimmt.

## Arbeitsrhythmus

Sequenziell: **Phase/Arbeitspaket → einmalige Verifizierung am Ende → Gate → nächstes.** Gate rot ⇒ STOP, Ursache lokalisieren, Owner identifizieren, fixen, Test wiederholen. Nie „weiterbauen und hoffen". Große Umbauten zuerst im Spec dokumentieren (quality-spec-Muster: Befund → Spec → DoD), dann umsetzen.

**Keine Dauerprüfung:** Typecheck/Tests laufen nicht nach jedem Edit und nicht pro Zwischenschritt —
nur einmal am Aufgabenende. Der Agent darf das Gate nicht dadurch billiger machen, dass er selbst
in Schleifen verifiziert; die Cost-Wache ist das einmalige End-Gate, nicht ein Lauf-Teppich.

## Skill-/Pass-Kontext (user-seitig, nicht aus dem Code rekonstruierbar)

- User-Skill `tailwind` (Windows: `C:\Users\Vannon\.agents\skills\tailwind`) ist **HyperFrames-spezifisch** (Tailwind v4 Browser-Runtime, `window.__tailwindReady`, `hyperframes`-CLI) und trifft auf dieses Projekt **nicht zu** — LifeSeedLab ist React/Vite ohne Tailwind/HyperFrames. Tailwind-Wunsch hier ⇒ `@tailwindcss/vite` (Build), kein Browser-Runtime, kein `tailwind.config.js` für v4.
- Client-injizierte Pass-Vorlagen (z. B. „Brainstorm the best version") sind **auftragsgebunden**: Nur anwenden, wenn ein Build-Auftrag existiert, dessen Ausgestaltung offen ist; ohne solchen „nichts im Umfang" melden und stoppen — keinen Scope erfinden.
