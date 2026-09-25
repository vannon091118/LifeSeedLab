---
name: lifeseedlab-commit-slicer
description: Analysiere den aktuellen LifeSeedLab-Worktree und schlage kohärente, verifizierbare Commit-Slices vor, ohne Dateien zu verändern, zu stagen, zu committen oder zu pushen. Verwende diesen Skill immer vor größeren Features, Refactors, Rebases, Commit-Vorbereitungen oder wenn staged/unstaged Änderungen auseinanderfallen, auch wenn der User nur „Commit vorbereiten“, „Slice aufteilen“ oder „Shinon vorbereiten“ sagt.
compatibility: Benötigt git und das LifeSeedLab-Repository; nutzt die vorhandenen Node-/Shinon-Werkzeuge nur als Ziel der Verifikation, nie als Ersatz für die Analyse.
---

# LifeSeedLab Commit-Slicer

## Zweck

Dieser Skill ist ein **read-only Architektur- und Commit-Planer**. Er untersucht den echten Repository-Zustand, ordnet Änderungen dem richtigen Owner zu und schreibt einen prüfbaren Slice-Plan. Er führt keine Git-Schreiboperation aus und ersetzt weder Shinon noch `test-lane`, Indexer, QA oder den Mutations-Drill.

Das ist wichtig, weil die Historie bereits einen 152-Dateien-Commit (`eccfede`) und mehrere daraus folgende Reparatur-Slices zeigt. Ein guter Plan verhindert genau diese Vermischung von Gameplay, Präsentation, Tests, Dokumentation und Generated Output.

## Trigger

Nutze den Skill, wenn mindestens eines zutrifft:

- eine nicht-triviale Änderung liegt im Worktree vor;
- ein Diff betrifft mehr als einen Ownership-Bereich;
- ein Rebase-, Merge- oder Historie-Slice wird geplant;
- staged und unstaged Änderungen könnten auseinanderlaufen;
- vor `node tools/shinon/cli.ts finish --all` soll der Commit-Schnitt geprüft werden;
- der User nennt „Commit aufteilen“, „Slice“, „Committext“, „Changelog“, „Index“, „großer Diff“ oder „Shakeout“.

Bei einer reinen Frage mit leerem Worktree lies den Zustand und berichte knapp; erfinde keine Arbeit.

## Nicht-Ziele

- Keine Dateien editieren, löschen, verschieben oder generieren.
- Kein `git add`, `git commit`, `git push`, `git reset`, `git clean`, `git rebase`, Branch-Wechsel oder Worktree-Wechsel.
- Keine Verlagerung von Verantwortung in einen zweiten State-Owner, EventBus oder RNG.
- Keine Änderung an bestehenden Shinon-, Test-Lane- oder Indexer-Checks.
- Keine Behauptung „fertig“, wenn nur der Plan existiert.

## Verbindliche Vorprüfung

Vor jeder Aussage über den aktuellen Zustand:

1. Lies `AGENTS.md`, `docs/architecture/architecture-contract.md` und `docs/quality/quality-spec.md` oder die bereits im Kontext verifizierten Fenster davon.
2. Lies die relevante Domänen-Contract aus `docs/quality/contracts/`; für Dokument-/Tooling-Slices zusätzlich `docs/quality/contracts/process.md` und `docs/setup/script-readme.md`.
3. Führe nur lesende Git-Kommandos aus:

```bash
git status --short --branch
git rev-parse --show-toplevel
git rev-parse HEAD
git log -n 20 --date=short --pretty=format:'%h|%ad|%s'
git diff --name-status HEAD
git diff --cached --name-status
git diff --check HEAD
git ls-files --others --exclude-standard
```

Wenn der Branch, HEAD oder Worktree zwischen zwei Prüfungen wechselt, beginne die Analyse erneut. Behandle Änderungen anderer Sessions als fremd und fasse sie nicht zusammen.

### QA-Abholung

Wenn die Aufgabe aus einem QA-/Playtest-Impuls stammt, übernimm zusätzlich die Abholung aus `AGENTS.md`:

```bash
git fetch origin qa-reports
git log HEAD..origin/qa-reports --oneline -- qa/
```

Der Skill setzt keine QA-Statuswerte und committet keinen Bericht. Wenn `git fetch` den Branch nicht findet, prüfe eine eventuell vorhandene lokale Tracking-Referenz nur als historische Quelle und kennzeichne sie ausdrücklich als nicht aktuell; daraus darf kein „keine neuen Befunde“ abgeleitet werden.

## 8-Fragen-Sperre vor jedem Slice

Beantworte für jede vorgeschlagene Änderung:

1. Existiert die Funktion, der Typ oder der Test bereits?
2. Welches Modul besitzt den Slice?
3. Ist die Änderung Gameplay, Source, Event, Observer, Rendering oder UI?
4. Braucht sie einen neuen Command oder ein neues Event?
5. Welcher Seed-Namespace wäre betroffen?
6. Gehört der Wert nach `config/*.source.ts` statt in den Code?
7. Bleibt jede Datei unter ihrem LOC-Cap?
8. Entsteht eine zweite Wahrheit oder ein zweiter Writer?

Wenn eine Antwort nicht aus Read/Grep/Git belegbar ist, markiere sie als **offen** und schiebe die betroffene Änderung in einen Klärungs-Slice.

## Slicing-Algorithmus

### 1. Tatsächlichen Scope erfassen

Trenne vier Zustände:

- **HEAD:** letzte gemeinsame Repository-Wahrheit;
- **staged:** bereits für einen Commit vorgesehener Teil;
- **unstaged:** weiterer lokaler Fortschritt;
- **untracked:** neue Dateien, die der Index noch nicht kennt.

Ein Slice mit staged Simulation und untracked Test ist nicht commit-fähig, auch wenn `tsc` grün ist. Markiere das als Blocker, statt stillschweigend beide Teile zusammenzuziehen.

### 2. Nach Ownership gruppieren

Nutze die projektspezifische Zuordnung aus `references/lifeseedlab-slices.md`. Verwende sie als Navigationshilfe; die eigentliche Ownership steht in `AGENTS.md` und dem Architektur-Contract.

Bilde bevorzugt folgende Reihenfolge, sofern die Abhängigkeiten es erlauben:

1. Source/Vertrag und Core-Determinismus;
2. Simulation und State-Writer;
3. Bus-Commands/Events;
4. Observer/Renderer/UI;
5. Tests, die den neuen Vertrag auslösen;
6. Domänen-Contract, Roadmap, Devlog und Changelog.

Das ist eine Abhängigkeitsrichtung, keine mechanische Dateisortierung. Ein Test, der einen neuen Bug reproduziert, gehört in denselben Verhaltens-Slice wie die Reparatur, sofern dadurch der Slice nicht seine Grenze verliert.

### 3. Verhalten statt Dateien zusammenhängen

Ein Slice bekommt eine klar formulierte Wirkung:

- eine konkrete Root-Cause-Reparatur;
- ein abgeschlossener Source→Simulation→Bus-Vertrag;
- ein isolierter Präsentationspfad mit sichtbarem Beleg;
- ein Test-/Harness-Vertrag;
- eine Doku-/Index-Wahrheit.

Nicht in denselben Slice legen:

- Gameplay-Fix und unabhängigen Visual-Rewrite;
- Meta-Transaktion und neue Shop-Gestaltung;
- Test-Harness-Refactor und Produktfeature;
- Source-Umbenennung, Persistenz-Migration und neue UI;
- den generierten Index neben unabhängigem handgeschriebenem Code;
- Changelog, Doku und Test-Harness nur als künstliche Auffüllung.

### 4. Slice-Grenze prüfen

Für jeden Slice dokumentiere:

- Ziel und Root Cause;
- Owner und betroffene Source-Dateien;
- Abhängigkeit von vorherigen Slices;
- Test-/Messbeleg;
- Dokumentations-/Contract-Änderung;
- erwartete Dateianzahl;
- ausdrückliche Nicht-Ziele.

Die harte Grenze sind **25 Dateien im Index** (`shinon.config.json`, `commit.maxFiles`). Bei 10+ Dateien ist ein Split vorgeschrieben, wenn die Änderungen nicht einatomar sind. Eine einzelne Datei oder ein notwendiger generierter Index darf die Grenze nicht durch künstliche Dateikopien umgehen.

### 5. Staged-Satz auf Kohärenz prüfen

Der Plan muss `git diff --cached` als vollständigen Commit-Satz behandeln. Markiere:

- staged Code ohne zugehörigen Test als unvollständig, nicht als erledigt;
- staged Doku ohne Contract/ROADMAP-Änderung als möglicherweise unvollständig;
- untracked neue Datei als fehlenden Indexbestand;
- staged/unstaged-Überlappungen als Worktree-Kollision;
- Secrets, `.env`, Lockfiles oder Build-Artefakte als Stopp.

## Projekttypische Slice-Muster

Nutze `references/lifeseedlab-slices.md` für die vollständige Pfadmatrix. Die wichtigsten Muster sind:

- **Determinismus:** `core`, betroffene Simulation, Hash-/Replay-Test, Architektur-Contract.
- **Persistenz:** Storage/Migration, ein Testvertrag, betroffener Persistenz-Contract.
- **Event/FX:** Event-Payload, Producer, Observer, Renderer und gegebenenfalls Pixel-/E2E-Beleg.
- **UI/Produkt:** Source/i18n, UI, Mobile-E2E und UI-Contract.
- **QA-Konsolidierung:** Status, Devlog, ROADMAP und Domänen-Contract; niemals zwei QA-Wahrheiten.
- **Generierter Index:** Datei-Track, Index-Build/Check und Doku-Linkprüfung als eigener Slice.

## Verifikationsplan

Der Skill führt die Tests nicht automatisch aus. Er wählt nur die passende nächste Prüfung und begründet sie:

- TypeScript/Source-Änderung: `node node_modules/typescript/bin/tsc -b --noEmit`;
- berührte Tests: `node scripts/test-lane.mjs`;
- Sprintabschluss: `node scripts/test-lane.mjs --full`;
- Build-relevante Änderung: `node node_modules/vite/bin/vite.js build`;
- UI: Preview auf Desktop und `390×844` Portrait;
- Gameplay: Vitest gegen `SimulationRoot`, nicht nur Browserbeobachtung;
- sichtbare Wirkung: vorhandene Canvas-/Preview-Sonde mit Gegenprobe;
- Testqualität: fokussierter Test und bei strukturellen Änderungen Mutations-Stichprobe;
- Commitabschluss: ausschließlich der bestehende Shinon-Pfad, nur nach expliziter Freigabe.

E2E wird nicht automatisch gestartet. Das Projekt verlangt dafür eine ausdrückliche Anweisung.

## Ausgabeformat

Antworte auf Deutsch und verwende genau diese Struktur:

```markdown
# Commit-Slice-Plan

## Ausgangslage
- Branch / HEAD:
- Worktree:
- staged / unstaged / untracked:
- relevanter historischer Kontext:
- Unsicherheiten:

## Blocker
- [ ] ... (oder `keine`)

## Slices

### Slice 1 — <Titel>
- Ziel / Root Cause:
- Owner:
- Dateien:
- Abhängigkeiten:
- Tests / Beleg:
- Dokumentation / Changelog:
- Dateianzahl: N/25
- Nicht-Ziele:

### Slice 2 — <Titel>
- ...

## Reihenfolge und Übergaben
1. ...
2. ...

## Commit-Nachricht-Entwurf
`type(scope): <Intent>`
<ausreichend langer deutscher Entwurf mit Zweck, Belegen, Grenzen und Verifikation; für den echten Commit mindestens 200 Wörter>

## Abschluss-Check
- [ ] Ownership geprüft
- [ ] keine zweite Wahrheit
- [ ] staged Satz kohärent
- [ ] Tests/Belege benannt
- [ ] Changelog/Contract/ROADMAP eingeordnet
- [ ] keine Git-Schreiboperation ausgeführt
```

Wenn keine Änderung vorliegt, ersetze den Slice-Teil durch `keine Slice-Vorschläge — Worktree ist sauber` und bleib ehrlich.

## Committext vorbereiten, nicht ausführen

Für einen tatsächlichen Shinon-Commit gilt im Projekt eine Mindestlänge von 200 Wörtern. Der read-only Entwurf darf knapper bleiben, muss aber so lang sein, dass Zweck, Belege und Grenzen nicht in einer leeren Ein-Zeilen-Behauptung verschwinden. Er nennt:

1. warum die Änderung nötig war;
2. welche Root Cause behandelt wurde;
3. welche Dateien und welcher Owner betroffen sind;
4. welche Tests oder Messungen die Aussage stützen;
5. welche Grenzen und Nicht-Ziele bewusst gelten;
6. welche Folgearbeit offen bleibt.

Er darf nicht behaupten, dass Commit, Push, QA, E2E oder Build erfolgt seien, wenn das nicht belegt ist.

## Abbruch- und Eskalationsregeln

- Bei unklarem Branch-/HEAD-Wechsel: nicht raten; erneut lesen.
- Bei fremden Änderungen: nur die eigene Zuordnung analysieren, nichts überschreiben.
- Bei fehlendem QA-Branch: historische lokale Ref nur als historisch kennzeichnen; keine aktuellen Befunde erfinden.
- Bei staged/unstaged-Spaltung: Slice-Plan liefern, aber keinen Commit vorbereiten, der die Lücke verdeckt.
- Bei mehr als 25 Dateien: nicht künstlich verkleinern; fachliche Teil-Slices vorschlagen.
- Bei Secret-/History-Verdacht: stoppen und den Besitzer informieren, nicht „reparieren“.

## Ressourcen

- `references/lifeseedlab-slices.md` — Pfad-, Owner-, Co-Change- und Historienmuster.
- `AGENTS.md` — verbindliche Projektwahrheit.
- `docs/architecture/architecture-contract.md` — Ownership, Determinismus, LOC-Caps.
- `docs/quality/contracts/process.md` — Tests, Docs, Gate und Commit-Prozess.
- `docs/setup/script-readme.md` — Shinon, Test-Lane und bestehende Werkzeuge.
