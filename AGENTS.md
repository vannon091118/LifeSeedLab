# AGENTS.md — Arbeitsvertrag für Agenten (context-free briefing)

> Dieses Dokument ist die **einzige Pflichtlektüre** für einen Agenten ohne bisherigen Kontext.
> Lese es vollständig, bevor du Code schreibst. Vertiefung: [`ARCHITECTURE_CONTRACT.md`](ARCHITECTURE_CONTRACT.md) (rechtsverbindlich) · [`ARCHITECTURE.md`](ARCHITECTURE.md) (Technik) · [`docs/QUALITY_SPEC.md`](docs/QUALITY_SPEC.md) (Arbeitsliste).

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

## Verboten (ohne Ausnahme)

1. Zweiter RNG, zweiter EventBus, zweiter State-Owner, Dopplung bestehender Module.
2. `localStorage`/IndexedDB-Zugriff außerhalb `persistence/`.
3. Gameplay-Entscheidungen in Renderer/Observer/UI; Präsentations-Entscheidungen in der Sim.
4. Emojis als finale Grafik, zufällige Gradients, Stock-Icons (Art-Richtung: s. QUALITY_SPEC B0).
5. Debug/Dev-Flächen (Seed-Badge, Hash, Zähler, `[D]`) außerhalb des DevGates (`?dev=1`).
6. Hardcoded Gameplay-Konstanten außerhalb `config/*.source.ts`.
7. Caps erhöhen, um Code unterbringen zu wollen.
8. Neue Dependencies ohne dokumentierte Begründung + Katalog-Prüfung; nie: Game Engine, State-Manager, Playwright (derzeit).

## Ressourcenkarte (wo schaue ich nach?)

| Frage | Antwort steht in |
|---|---|
| Was ist defekt/unvollständig/Placeholder? | `docs/QUALITY_SPEC.md` Part A |
| Wie zeichne ich X / welche Asset-Spec gilt? | `docs/QUALITY_SPEC.md` Part B (B0 Art-Richtung, B4 Pflanzen, B10 Welt/Gegner, B11 Dramaturgie) |
| Welche Events/Commands/Payloads existieren? | `src/bus/events.ts`, `src/bus/commands.ts` (+ Ownership-Tabelle im Kommentar) |
| Welche Particle-Profiles/Effects/Sources sind gültig? | `src/observers/particles.ts`, `src/config/effects.source.ts` + Gate-Test `sources.test.ts` |
| Was ist der Save-/Resume-Vertrag? | `ARCHITECTURE.md` §4 |
| Wie starte ich einen Run / wo wird der Seed hergeleitet? | `App.tsx` (`deriveSeed(GAME_SEED,'world','run',runId)`) → `SimulationRoot` |
| Was wird als nächstes gebaut? | QUALITY_SPEC B1→B2→B3→B4–B6→B7/B9/B10→B12/B13 (DoD B13) |

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

Sequenziell: **Phase/Arbeitspaket → Test → Gate → nächstes.** Gate rot ⇒ STOP, Ursache lokalisieren, Owner identifizieren, fixen, Test wiederholen. Nie „weiterbauen und hoffen". Große Umbauten zuerst im Spec dokumentieren (QUALITY_SPEC-Muster: Befund → Spec → DoD), dann umsetzen.
