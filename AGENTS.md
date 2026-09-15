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

## LOC-Caps (hart)

`300` Simulationssysteme/Bus/Clock/RNG/IDs/Hash · `400` Renderer/Generator/Partikel/Observer/UI-Komponenten · `200` Types/Source/Meta/i18n/Persistenz. Über dem Cap → STOP, Verantwortungs-Audit, splitten. Ausnahme nur mit Einzeiler-Begründung im Dateiheader.

## Determinismus (nie antasten)

- `Math.random`/`Date.now` sind in Spiel- und Präsentationslogik **verboten**. `performance.now` nur im Frame-Timing (GameView-Loop).
- Alle Zufälligkeit via `core/rng.ts`: `deriveSeed(rootSeed, namespace, entityId, eventId, version)`. Gameplay-Namespaces `world|wave|enemy|plant|loot`, Präsentation `visual|particle|cosmetic` — dürfen sich nie gegenseitig advanced/stören. FX ON/OFF muss bit-identisches Gameplay liefern.
- Seeds sind ableitbar, nie Zustand: Run-Identität = `runId` (eine Autorität, persistiert in Meta).

## Verifizierung (immer vor Abschluss — ohne Diskussion)

```bash
npx tsc -b --noEmit      # Typecheck muss 0 Fehler sein
npx vitest run           # komplette Suite muss grün sein
npx vite build           # muss durchbauen (nur wenn Build-relevant geändert)
```

Kein „sollte passen", kein claims ohne Ausführung. Dev-Server/Preview wird **nie** manuell gestartet/gestoppt/killt (Plattform-managed). `vite.config.ts` ist **tabu**.

## Sprint-Abschluss: Preview → E2E → Shinon (verbindlich)

Nach einem **erfolgreichen Umsetzungssprint** (Code steht, Typecheck/Tests/Build grün) ist der Abschluss fest vorgeschrieben. Die Reihenfolge ist bindend und keine Stufe ist optional:

1. **Preview prüfen.** Das Ergebnis in der laufenden Vorschau ansehen — mindestens der geänderte Screen, bei UI-Arbeit zusätzlich **390×844** und Desktop. Die Vorschau wird dabei nur betrachtet, nicht selbst gestartet/gestoppt (Plattform-managed, siehe oben).
2. **E2E laufen lassen.** `npm run test:e2e` (`playwright test`, `tests/`, Chromium, baseURL `http://localhost:5173`). Playwright verwaltet seinen Dev-Server selbst (`webServer` mit `reuseExistingServer`) — nicht von Hand dazwischenfunken. Rote E2E ⇒ der Sprint ist **nicht** abgeschlossen.
3. **Erst dann Shinon.** Commit und Push laufen **ausschließlich** über Shinon:

```bash
node git-noir/shinon/cli.ts finish --all   # Vorbereitung → Gate → Commit → Push
```

   Auch dort gilt die Reihenfolge: **ohne grünes Gate kein Commit, ohne Commit kein Push.** `git commit`/`git push` von Hand sind tabu — Shinon ist der einzige Git-Abschlusspfad.

Details: [`docs/setup/script-readme.md`](docs/setup/script-readme.md). Das Tooling in `git-noir/` ist lokal (gitignoriert): Werkzeug, nicht Inhalt.

> **Offener Punkt (ehrlich benannt):** Die E2E-Suite existiert noch nicht — `npx playwright test --list` meldet „Total: 0 tests in 0 files" (`tests/` fehlt), obwohl `playwright.config.ts` und `@playwright/test` im Projekt liegen. Stufe 2 ist damit derzeit nicht erfüllbar. Solange keine Spezifikationen stehen, muss jeder Sprint diesen Punkt **ausdrücklich als offen melden** — nicht stillschweigend überspringen und nicht als erledigt verbuchen.

## Verboten (ohne Ausnahme)

1. Zweiter RNG, zweiter EventBus, zweiter State-Owner, Dopplung bestehender Module.
2. `localStorage`/IndexedDB-Zugriff außerhalb `persistence/`.
3. Gameplay-Entscheidungen in Renderer/Observer/UI; Präsentations-Entscheidungen in der Sim.
4. Emojis als finale Grafik, zufällige Gradients, Stock-Icons (Art-Richtung: s. quality-spec.md B0).
5. Debug/Dev-Flächen (Seed-Badge, Hash, Zähler, `[D]`) außerhalb des DevGates (`?dev=1`).
6. Hardcoded Gameplay-Konstanten außerhalb `config/*.source.ts`.
7. Caps erhöhen, um Code unterbringen zu wollen.
8. Neue Dependencies ohne dokumentierte Begründung + Katalog-Prüfung; nie: Game Engine, State-Manager (derzeit).
9. Git-Abschluss von Hand: `git commit`/`git push` (siehe Sprint-Abschluss) — nur über Shinon.

## Ressourcenkarte (wo schaue ich nach?)

| Frage | Antwort steht in |
|---|---|
| Was ist defekt/unvollständig/Placeholder? | `docs/quality/quality-spec.md` Part A |
| Wie zeichne ich X / welche Asset-Spec gilt? | `docs/quality/quality-spec.md` Part B (B0 Art-Richtung, B4 Pflanzen, B10 Welt/Gegner, B11 Dramaturgie) |
| Welche Events/Commands/Payloads existieren? | `src/bus/events.ts`, `src/bus/commands.ts` (+ Ownership-Tabelle im Kommentar) |
| Welche Particle-Profiles/Effects/Sources sind gültig? | `src/observers/particles.ts`, `src/config/effects.source.ts` + Gate-Test `sources.test.ts` |
| Was ist der Save-/Resume-Vertrag? | `docs/architecture/architecture.md` §4 |
| Wie starte ich einen Run / wo wird der Seed hergeleitet? | `App.tsx` (`deriveSeed(GAME_SEED,'world','run',runId)`) → `SimulationRoot` |
| Was wird als nächstes gebaut? | `ROADMAP.md` §4 + `docs/quality/quality-spec.md` B1→B2→B3→B4–B6→B7/B9/B10→B12/B13 (DoD B13) |
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

Sequenziell: **Phase/Arbeitspaket → Test → Gate → nächstes.** Gate rot ⇒ STOP, Ursache lokalisieren, Owner identifizieren, fixen, Test wiederholen. Nie „weiterbauen und hoffen". Große Umbauten zuerst im Spec dokumentieren (quality-spec-Muster: Befund → Spec → DoD), dann umsetzen.
