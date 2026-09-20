# AGENTS.md — Arbeitsvertrag für Agenten

> **Pflichtlektüre vor Code-Entstehung.**
> Vertiefung: [`architecture-contract.md`](docs/architecture/architecture-contract.md) (bindend) · [`architecture.md`](docs/architecture/architecture.md) (Technik) · [`quality-spec.md`](docs/quality/quality-spec.md) (Register) + Arbeitsliste je Domäne in `docs/quality/contracts/`.

## QA-Abholung vor Task-Start (PFLICHT)
```bash
git fetch origin qa-reports
git log HEAD..origin/qa-reports --oneline -- qa/
```
Neue Berichte unter `qa/` lesen (Input für Task), Status der Befunde auf `in-arbeit` / `erledigt` / `widerlegt` setzen (`docs(qa): status <bericht> <befund>` auf `qa-reports`), **erst dann** Task starten. Branch nie in `main` mergen (Details: `qa/README.md`).

## QA-Konsolidierung nach Task-Ende (PFLICHT, normaler Ablauf)
1. **Überführen:** je abgeschlossenem Bericht **ein** Devlog-Eintrag in `docs/process/devlog/` — Datum, Version/Commit, Befunde, was gebaut wurde (mit Beleg), was offen blieb. Gleiche Anatomie, nie gleiches Layout (Krix' Stimme, s. `devlog/README.md`).
2. **Offenes sichtbar halten:** jeder verbliebene Punkt zusätzlich in `docs/process/ROADMAP.md` §3 „Bekannte Probleme" (fortlaufende P-Nummer, Beleg + Owner).
3. **Erledigtes an die Regelstelle:** Befund → Domänen-Contract (`in-arbeit`/`erledigt` mit Fundstelle), nicht in den Devlog allein.
4. **Aufräumen:** der konsolidierte Bericht wird von `qa/` **entfernt** (eine Wahrheit, keine zwei) — Historie im Devlog, Arbeit in der Roadmap, Regel im Contract.
5. **Erst dann** Commit/Push über Shinon.

## Repository-Search-Workflow (PFLICHT)
1. Repository-Struktur ermitteln (`rg --files`, gezielte Pfade/Dateitypen).
2. Erst danach relevante Dateien gezielt lesen — niemals den gesamten Workspace.
3. `ls`/`dir`/`find` verboten, wenn `rg` verfügbar ist. Vor Änderungen bestehende Implementierungen suchen.
4. Neue Strukturen erst nach Prüfung auf semantisch passende Existenz anlegen.
5. **READ double or Shut up:** Keine Annahmen als Wahrheit behaupten. Jede Behauptung muss durch **Read/Grep/tsc/vitest** verifiziert sein, bevor sie als Fakt verwendet wird. Der deterministische Weg (Nachprüfen) hat Vorrang vor dem offensichtlichen (Raten).

---

## Die 5 Grundregeln

- **Regel 0 — Changelog-Pflicht:** Vor jedem Commit `CHANGELOG.md` ergänzen (`- [Ticket] Beschreibung`), `git add CHANGELOG.md`. Der pre-commit Hook prüft dies und hebt die Patch-Version an (`package.json`/`src/version.ts` bleiben absichtlich +1 uncommitted für Folge-Commit).
- **Regel 1 — Sprache:** Deutsch für Antworten, Doku, Artefakte, Commit-Messages (prägnant, Intention vor Beschreibung). Original-Englisch für Code, Identifier, Fehlermeldungen, Systembegriffe.
- **Regel 2 — Modularität & Ownership:** 1 Modul = 1 Hauptverantwortung (bei LOC-Überhang splitten, nie Cap erhöhen). 1 State-Slice = genau 1 Writer. Neu bauen > herumnudeln (falsche Module löschen & neu modular bauen; korrekte Module nie duplizieren). **8-Fragen-Sperre vor jedem Edit:** Existiert Funktion schon? Modul-Owner? Gameplay/Source/Event/Observer/Render? Neues Event/Command? Welcher Seed-Namespace? Regel in Source? LOC-Cap ok? Zweite State-Quelle vermieden?
- **Regel 3 — Namenskonvention (Kollisionsfreiheit):** Kein Basisname darf unter `src/` doppelt existieren (ohne Extension). Domäne steuert Ordner (`simulation/`, `genome/`, `render/` etc.). Bei Mehrdeutigkeit Domänen-Präfix `<domain>_<descriptiveName>.[ts|tsx]` vergeben.
- **Regel 4 — Wahrheiten, Konflikte, Neubau:** Eine Wahrheit überall (zwei Repräsentationen desselben Faktums = Defekt). Auflösung nur mit messbarem Gewinn für Gameplay, Determinismus, Lesbarkeit oder Performance. Kein Code auf Vorrat (Totes löschen). Strukturfehler = Modul neu bauen. Reihenfolge: Wahrheit → Darstellung → Verhalten → UI.
- **Regel 5 — Kontext-Integrität & Ehrlichkeit:** 
  - **Kontextverlust:** Wenn Kontext verloren geht (Datei nicht mehr im Kontext, unklare Zusammenhänge) → **sofort melden**, nicht raten.
  - **Déjà-vu-Fragen:** Wenn eine Frage bekannt vorkommt, die schon gestellt/beantwortet wurde → **Abbruch, Bescheid geben**, nicht wiederholen.
  - **Kleine Tasks:** Lieber in **kleineren, verifizierbaren Schritten** arbeiten als große Blöcke, die scheitern.
  - **Keine Halluzinationen:** Niemals Annahmen als Wahrheit behaupten – erst prüfen (Read/Grep/tsc), dann handeln.
  - **Eigener Kritiker:** Jede eigene Behauptung vor der Ausgabe gegenprüfen und aktiv den Gegenbeweis suchen („was würde mich widerlegen?"). Ein gefundener eigener Fehler wird **benannt**, nicht verdeckt.
  - **Keine Sollbruchstellen:** Kein Bau auf „kommt später" — keine Platzhalter als Endlösung, keine Naht, die beim nächsten Feature bricht. Was nicht trägt, wird jetzt richtig gebaut oder gar nicht.
  - **Fertig heißt bewiesen:** „Erledigt" erst, wenn das Verhalten belegt ist (Test, Preview, Beleg-Zeile). Plan, Kommentar und Doku sind **kein** Fertig-Beweis.
  - **Dokumentation aktiv pflegen:** Änderungen an Regeln/Architektur werden **in die Source-Dokumente eingepflegt**, nicht nur angehängt.

---

- **Regel 6 — Berater-Modus:** Bei Auslösung durch das Stichwort "Berater" antwortet der Agent ausschließlich im direkten, zynischen, kurzen Ton — kein Fülltext, keine Erklärungen, nur die notwendige Aussage.

## Ownership-Karte (Writer — nicht verhandelbar)

| Slice | Writer (genau einer) | Readers / Transfer |
|---|---|---|
| Spielzeit (`tick`/`phase`/`waveTime`) | `core/clock.ts` (`GameClock`) | Alle Systeme, UI |
| Pflanzen | `simulation/plantSystem.ts` | Renderer, UI, Observer |
| Gegner | `simulation/enemySystem.ts` | Renderer, UI, Observer |
| Projektile | `simulation/projectileSystem.ts` | Renderer, Observer |
| Energie, Score, Nektar-Lauf | `simulation/scoreSystem.ts` | Renderer, UI |
| Combo (Count, Multiplier) | `simulation/comboSystem.ts` | Renderer, UI |
| Wellen, Schedule | `simulation/waveSystem.ts` | Alle Systeme |
| Gesamt-SimState | `simulation/root.ts` (`SimulationRoot`) | Main Thread via Snapshot |
| Content-Werte | `config/*.source.ts` | **SOURCE = CONTENT TRUTH** |
| Visuals | `visual/generator.ts` | `visualSeed + Source = ResolvedVisual` |
| Kamera, FX, Partikel | `observers/*`, `render/camera.ts` | Read-only Beobachter |
| Persistenz | `persistence/storage.ts` | Schema-Adapter: `meta/`, `runSave.ts` |
| React-State | `App.tsx` + Screens | UI-Komponenten |

*Verboten:* Canvas/React schreibt Gameplay · Partikel beeinflussen Gameplay · Audio erzeugt RNG · System ruft System direkt (immer Bus).

---

## LOC-Caps & Zählregeln (hart)

| Cap (Code-Zeilen) | Gültigkeitsbereich |
|---|---|
| **300** | Simulationssysteme, Bus, Clock, RNG, IDs, Hash |
| **400** | Renderer, Visual-Generator, Partikel, Observer, UI-Komponenten |
| **200** | Types, Config/Source, Meta, i18n, Persistenz |

*Zählregel:* Es zählen **nur Code-Zeilen** (Kommentare `//`, `/* */` und Leerzeilen zählen **nicht**, gemessen via `codeLineCount`). Bei Cap-Überschreitung: Audit & Splitten, niemals Cap künstlich erhöhen. Ausnahme nur mit Einzeiler-Begründung im Dateikopf.

---

## Determinismus (nie antasten)

- `Math.random` & `Date.now` in Spiel-/Präsentationslogik **strikt verboten**; `performance.now` nur im Frame-Timing von `GameView`.
- Alle Zufallswerte via `core/rng.ts`: `deriveSeed(rootSeed, namespace, entityId, eventId, version)`.
  - Gameplay-Namespaces: `world`, `wave`, `enemy`, `plant`, `brood`, `loot` (nur Simulation).
  - Präsentations-Namespaces: `visual`, `particle`, `cosmetic` (nur Observer/Renderer).
  - Keine gegenseitige Beeinflussung! FX ON/OFF muss bit-identischen Spielzustand liefern.
- **Float-Exaktheit:** In `src/simulation/**` + `src/config/*.source.ts` sind `Math.pow`, `Math.hypot` und alle Transzendenten (`sin/cos/tan/…`, `exp/log/…`) verboten — erlaubt sind exakte Operationen und `Math.sqrt`. Potenz = Multiplikationsschleife. Durchgesetzt von der Gate-Regel „Float-Exaktheit" + Baum-Test (`tools/shinon/tests/determinism_rule.test.ts`); Präsentation (`render/`, `observers/`) darf trigonometrisch zeichnen. Details: `architecture-contract.md` §6.
- Run-Identität = `runId` (Autorität in `meta`).

---

## Verifizierung & Sprint-Abschluss

### Verifizierung (genau einmal am Aufgabenende vor dem Commit)
Kein `npx`/`npm run` im Verifizierungs- und Commit-Pfad (~3s Node-Spawn sparen):
```bash
node node_modules/typescript/bin/tsc -b --noEmit   # Typecheck (inkrementell, ~0.3s warm)
node scripts/test-lane.mjs                         # Commit-Lane: nur berührte Tests (Ziel ≤10s)
node scripts/test-lane.mjs --full                  # Sprintende: komplette Suite (429+ Tests)
node node_modules/vite/bin/vite.js build           # Nur bei Build-Relevanz
```
*Gezielter Einzeltest zur Fehlersuche:* `node node_modules/vitest/vitest.mjs run <datei>`. Keine Dauerschleifen!
*Mechanik-Fragen:* Immer in Vitest gegen `SimulationRoot` testen, nicht im Browser. E2E pausiert die Sim vor Aktionen.

### Verbindlicher Sprint-Abschluss (Reihenfolge bindend)
1. **Preview prüfen:** Geänderter Screen (bei UI zusätzlich 390×844 Portrait und Desktop). Plattform-managed Server nicht neustarten/killen.
2. **E2E:** `node node_modules/playwright/test/cli.js test` (`tests/`, Chromium). Playwright verwaltet Server selbst. Rote E2E = kein Abschluss.
3. **Voll-Suite:** `node scripts/test-lane.mjs --full` (429+ Tests grün).
4. **Shinon Commit & Push:**
   ```bash
   node tools/shinon/cli.ts finish --all   # Vorbereitung → Gate → Commit → Push
   ```
   - Gate-Modus: `enforcement=strict` (0 Fehler, 0 Warnungen). Manuelles `git commit`/`git push` ist **verboten**.
   - Commit-Format: `type(scope): Betreff` (Conventional Commits).
   - Remote-Wahrheit: `git ls-remote origin main` gegen `git rev-parse HEAD`. Deploy-Parität beachten (Index vs. Worktree).

---

## Absolute Verbote

1. Zweiter RNG, zweiter EventBus, zweiter State-Owner, Modul-Duplikate.
2. `localStorage` / IndexedDB-Zugriff außerhalb von `persistence/`.
3. Gameplay-Entscheidungen in Renderer/Observer/UI oder Präsentation in Simulation.
4. Emojis als finale Grafik, zufällige Farb-Gradients, Stock-Icons.
5. Debug/Dev-Ausgaben (`Seed-Badge`, `Hash`, `[D]`) außerhalb des DevGates (`?dev=1`).
6. Hardcodierte Gameplay-Konstanten außerhalb von `config/*.source.ts`.
7. LOC-Caps erhöhen, um Code unterzubringen.
8. Unbegründete neue Dependencies (keine fremden Game-Engines oder externen State-Manager).
9. Git-Abschluss von Hand via `git commit` / `git push`.
10. Maschinelle Commit-Signaturen („Generated with …", „Co-Authored-By: Codebuff …").
11. **Annahmen als Wahrheit halluzinieren** — Jede Behauptung muss durch **Read/Grep/tsc/vitest** verifiziert sein (READ double or Shut up).
12. **Kontextverlust verschweigen** — Statt zu raten: sofort melden („Hab den Faden verloren“).
13. **Déjà-vu-Fragen wiederholen** — Bekannte Frage → Abbruch, Flag setzen, nicht neu beantworten.
14. **Große Blöcke ohne Verifikation** — Nur kleine, testbare Schritte (Read → Prüf → Edit → Test).
15. **Sollbruchstellen bauen** — Kein „kommt später"-Seam, kein Platzhalter als Endlösung.
16. **Fertig behaupten, ohne Beleg** — Erledigt gilt nur mit Test, Preview oder Beleg-Zeile.
17. **Den eigenen Fehler verdecken** — Gefundene eigene Fehler gehören in die Antwort, nicht unter den Teppich.

---

## Ressourcenkarte

| Frage | Fundstelle |
|---|---|
| Defekte, Lücken, Befunde | Register `docs/quality/quality-spec.md` → Domänen-Contract |
| Art Direction, Asset-Specs (Pflanzen, Welt, Manga) | `docs/quality/contracts/visual.md` (B0, B4, B5, B10, B11) |
| Screens, UI-Kit, Onboarding (Krix), Loadout | `docs/quality/contracts/ui.md` (B3, B7, B9, B18, B21–B23, B31) |
| Zucht, Gene, Phänotyp, Brut-Domäne | `docs/quality/contracts/genome.md` (A2, A15, B16, B26, B30) |
| Run-Identität, Meta-Queue, Ökonomie | `docs/quality/contracts/meta.md` (A13, A18, A19, B14, B15, B17) |
| Persistenz, Save-Verträge | `docs/quality/contracts/persistence.md` (A8, B2) |
| Tests, Gate, Doku-Disziplin | `docs/quality/contracts/process.md` (A11, B13, B24, B32) |
| Events, Commands, Payloads | `src/bus/events.ts`, `src/bus/commands.ts` |
| Partikel-Profile & Effekte | `src/observers/particles.ts`, `src/config/effects.source.ts` |
| Save- / Resume-Vertrag | `docs/architecture/architecture.md` §4 |
| Run-Start & Seed-Ableitung | `App.tsx` (`deriveSeed(GAME_SEED, 'world', 'run', runId)`) |
| Roadmap & Meilensteine | `docs/process/ROADMAP.md` |
| Signatur / Easter-Egg (VANNON-Motto) | `src/components/CreatedBy.tsx` + `createdBy.test.ts` |
| Shinon & Tooling | `docs/setup/script-readme.md` |

---

## Definition of Done (DoD)

```
[ ] Ownership respektiert (Single Writer)         [ ] Modulgrenze & LOC-Cap eingehalten
[ ] Source-driven (keine hardcodierten Werte)     [ ] Deterministisch (kein Math.random/Date.now)
[ ] Bus-Contract eingehalten                      [ ] Keine versteckte State-Mutation
[ ] Observer-Regel beachtet (read-only)           [ ] Tests vorhanden/erweitert & grün
[ ] tsc clean & Build grün                        [ ] Mobile 390×844 Portrait geprüft
[ ] Release-Fläche frei von DevGate-Leaks         [ ] Bestehendes erweitert statt dupliziert
```

---

## Kontext & Skills
- **Tailwind:** Der User-Skill `tailwind` ist für HyperFrames und gilt hier **nicht** (LifeSeedLab nutzt Vanilla CSS / Vite).
- **Pass-Vorlagen:** Nur bei explizitem Auftrag anwenden, sonst stoppen und keinen Scope erfinden.
