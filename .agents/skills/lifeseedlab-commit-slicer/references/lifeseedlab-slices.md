# LifeSeedLab Slice-Katalog

Diese Referenz ist eine Navigationshilfe für `lifeseedlab-commit-slicer`. Sie ist keine zweite Architektur-Wahrheit. Die verbindlichen Regeln stehen in `AGENTS.md` und `docs/architecture/architecture-contract.md`.

## Owner-Pfade

| Bereich | Typische Pfade | Verantwortung | Typische Co-Changes |
|---|---|---|---|
| Source | `src/config/*.source.ts` | Content-Wahrheit, Preise, Wellen, Gene, Effekte | Simulation, Genome, UI, i18n, passender Contract |
| Core | `src/core/` | Clock, RNG, IDs, Hash, kanonische Ordnung | Simulation, Discovery, passender Core-Contract |
| Simulation | `src/simulation/` | Tick-State, Gameplay, Systeme, Snapshot | Config, Bus, Tests, Simulation-Contract |
| Bus | `src/bus/` | Commands, Events, Runtime-Contract | Simulation, Observer, UI, Event-Tests |
| Genome | `src/genome/` | Kreuzung, Vererbung, Phänotyp, Gacha | Source, Discovery, Visual, Genome-Contract |
| Meta | `src/meta/` | Run-Identität, Queue, Wirtschaft, Loadout | Persistence, Source, UI, Meta-Contract |
| Persistence | `src/persistence/` | Storage, Saves, Migration, Quarantäne | Meta, Simulation/Resume, App, Contract |
| Visual | `src/visual/` | Genom/Source → `ResolvedVisual` | Genome, Config, Render, Visual-Contract |
| Observer | `src/observers/` | Read-only FX, Audio, Partikel, Visual-Commands | Bus, Render, Visual-Contract |
| Render | `src/render/` | Canvas-Layer, Kamera, Status, Feedback | Observer, Visual, Renderer-Tests, Visual-Contract |
| UI | `src/components/`, `src/i18n/`, `src/dev/` | Screens, Router, Eingabe, sichtbarer Zustand | Simulation-Commands, Source, E2E, UI-Contract |
| Tests | `src/**/*.test.ts(x)`, `tests/` | Regression, Contract, E2E, Harness | Der Produkt-Slice, der den Vertrag auslöst |
| Tooling | `tools/shinon/`, `tools/indexer/`, `scripts/` | Gate, Index, Test-Lane, Drift-Prüfung | passender Prozess-Contract, eigene Tool-Tests |
| Prozess-Doku | `docs/`, `CHANGELOG.md`, `AGENTS.md` | Regeln, Findings, Chronik, Navigation | genau die betroffene Domäne, nicht das ganze Repo |

## Empfohlene Abhängigkeitsrichtung

```text
Source/Contract
  → Core/Simulation
  → Bus
  → Observer/Renderer/UI
  → Tests/Belege
  → Roadmap/Devlog/Contract/Changelog
```

Das ist keine starre Dateisortierung. Ein Repro-Test gehört in den Slice, dessen Verhalten er schützt. Ein generierter Index gehört in einen eigenen Slice, wenn eine neue oder verschobene Datei die Indexquelle verändert.

## Historisch belegte Muster

### Große Commits werden zu Slices

- `eccfede` umfasste 152 Dateien und vermischte Vector-, UI-, Typ-, Tooling- und Aufräumarbeit.
- `1a430da` bis `1908bb3` zerlegten diesen historischen Block in sieben kontrollierte Rebase-Slices.
- `d924a17` und `bca1d38` machten daraus eine Gate-Regel: maximal 25 Dateien pro Index-Commit.

**Skill-Regel:** Niemals einen Riesen-Commit durch willkürliches Nachbenennen von Dateien verkleinern. Erst Root Cause und Verhaltensgrenze bestimmen, dann fachlich schneiden.

### Eine Wahrheit reist durch die Kette

- `6ddc9b2` koppelte Belohnung und Bonus an die echte Buchung.
- `6b1d964` trug Ort und Farbe aus der echten Source in Observer/Renderer.
- `6441333` schloss öffentliche Writer und Runtime-Grenzen.

**Skill-Regel:** Wenn ein Wert in Producer, Event, Observer, UI oder Changelog auftaucht, muss der Plan eine einzige Quelle und die vollständige Kette nennen. Ein Fix am Rand ohne Writer-/Payload-Korrektur ist unvollständig.

### Tests gehören zum Vertrag

- `38564d5` zog mehrfach kopierten E2E-Helfercode in `tests/helpers/harness.ts`.
- `436ccee` verband Tank-/Boss-Biss mit Source, Simulation und Regressionstests.
- `d86c463` konsolidierte Contracts, Devlog und Canvas-Belege nach der eigentlichen T1–T11-Arbeit.

**Skill-Regel:** Tests nicht als nachträglicher Deckel behandeln. Der Test gehört zum Verhaltens-Slice; Harness-Refactor und Produktfeature bleiben getrennt, wenn die Verantwortungen auseinanderfallen.

### Dokumentation folgt der Erkenntnis

- `ba1ff94` überführte QA-Chronik in Devlog und offene Punkte in die ROADMAP.
- `badb425` zog Contracts und Prozessdoku nach.
- `d86c463` schloss T1–T11 und markierte Grenzen offen.

**Skill-Regel:** Ein QA-Bericht ist Arbeitspapier. Devlog = Historie, ROADMAP = offene Arbeit, Domänen-Contract = Regel. Nicht dieselbe Aussage in allen drei als parallele Wahrheit führen.

### Generierte Ausgabe bleibt eine eigene Grenze

- `0cb8829` erzeugte den Index aus dem Code.
- `508007b` verhinderte, dass eine neue untracked Datei einen scheinbar aktuellen Index erzeugt.
- `b6e0b4e` zeigte, warum ein Index-Build nach einer neuen Datei erst nach `git add` sinnvoll ist.

**Skill-Regel:** `INDEX.md` und `.index/index.json` nicht neben beliebigem Produktcode in einen Commit mischen. Ein Index-Slice nennt Track-Status, Build/Check und Doku-Linkprüfung.

## Kleine Entscheidungsmatrix

| Beobachtung im Diff | Empfohlene Behandlung |
|---|---|
| Nur Source + passender Source-Test | Ein Source-Slice |
| Source + Simulation + Bus + Test | Ein Vertrags-Slice, sofern eine Root Cause |
| Simulation + Render + UI + E2E | Erst prüfen; meist in Gameplay-Slice und sichtbaren Beleg-Slice teilen |
| Nur Test-Harness-Duplikat | Eigener Testinfrastruktur-Slice |
| Nur Link-/Index-Drift | Eigener Doku-/Index-Slice |
| QA-Bericht + Devlog + Roadmap + Contract | Konsolidierungs-Slice; Status und Löschung getrennt prüfen |
| staged/unstaged gesplittet | Blocker; niemals als ein Commit darstellen |
| >25 Dateien | Fachliche Teil-Slices; Gate-Grenze ernst nehmen |

## Was der Skill nicht behaupten darf

- Dass ein geplanter Test grün wird.
- Dass ein QA-Bericht den aktuellen HEAD repräsentiert.
- Dass ein Changelog-Eintrag ein Verhalten beweist.
- Dass ein Index-Build allein die Doku-Querverweise repariert.
- Dass ein kleingeschriebener Commit die alte Problemklasse grundsätzlich gelöst hat.

Diese Aussagen gehören in den jeweiligen Ausführungs- oder Testbeleg, nicht in den Slice-Plan.
