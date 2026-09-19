# LifeSeedLab — Architecture Contract

Status: **RECHTSVERBINDLICH (BINDING)**. Jede Datei im Projekt muss die folgenden Regeln einhalten.
Ergänzende technische Details: [`architecture.md`](architecture.md).
Arbeitsvertrag für Agenten & Entwickler: [`AGENTS.md`](../../AGENTS.md).

---

## 1. Kern-Identität & Grundsätze

```
ONE MODULE      = ONE PRIMARY RESPONSIBILITY
ONE STATE OWNER = ONE AUTHORITY per authoritative slice
ALL GRAPHICS    = OBSERVERS (read-only on gameplay state)
GAMEPLAY        ≠ RENDERING (Canvas/React never write simulation state)
SOURCE          = CONTENT TRUTH (no gameplay constants in code)
SEED            = DETERMINISM INPUT (deriveSeed across 8 namespaces)
CLOCK           = GAME TIME AUTHORITY (fixed-step 30 TPS)
BUS             = HANDOVER PROTOCOL (no direct cross-system calls)
```

---

## 2. Endgleichungen des Determinismus

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS        = DETERMINISTIC GAME STATE
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED  = DETERMINISTIC PRESENTATION
```

---

## 3. Ownership Contracts je Domäne

| Domäne | Pfad | Autoritativer Writer | Erlaubte Reader / Konsumenten | LOC-Cap |
|---|---|---|---|---|
| **`core`** | `src/core/` | `GameClock` (Zeit); Core-Module sind pure | Alle Domänen | 300 |
| **`config`** | `src/config/` | Statische Source-Dateien (`*.source.ts`) | `simulation`, `genome`, `visual`, `ui` | 200 |
| **`simulation`** | `src/simulation/` | `SimulationRoot` (leitet an Subsysteme) | Main Thread via Snapshot, Bus-Events | 300 |
| **`bus`** | `src/bus/` | `EventBus` (Events), `CommandQueue` (Commands)| Alle Domänen (read-only Abonnenten) | 300 |
| **`genome`** | `src/genome/` | Reine mathematische Berechnungen | `simulation`, `persistence`, `ui`, `visual` | 300 |
| **`visual`** | `src/visual/` | `generator.ts` (reine Funktionen) | `render`, `ui/components` | 400 |
| **`render`** | `src/render/` | `Renderer` & Canvas-Layer (read-only auf Sim) | Reine Bildschirmausgabe | 400 |
| **`observers`**| `src/observers/` | `visualObserver`, `audioObserver`, `particles`| `render`, Web Audio API | 400 |
| **`persistence`**| `src/persistence/`| `storage.ts` (einziger Web-Storage Writer) | `meta/`, `simulation/resume.ts` | 200 |
| **`discovery`**| `src/discovery/`| `chain.ts` (Append-Only Hash-Chain) | `Codex.tsx`, `meta/store.ts` | 300 |
| **`ui`** | `src/components/`| React Screen-Router & Komponenten | DOM / Spieler | 400 |

*Regel:* Kein System schreibt außerhalb seines Slices. Cross-Slice-Kommunikation erfolgt **ausschließlich** über Commands (rein) oder Events (raus).

---

## 4. LOC-Caps (Hart) — Zählung von Code-Zeilen

| Cap (LOC) | Geltungsbereich |
|---|---|
| **300** | Simulationssysteme, Bus, Clock, RNG, Seed, IDs, Hash, Discovery |
| **400** | Renderer, Visual Generator, Partikel, Observer, UI-Komponenten |
| **200** | Typen, Config/Source, Meta-Adapter, i18n, Persistenz |

*Zählregel:* Gemessen werden **nur reine Code-Zeilen** (Kommentare und Leerzeilen zählen nicht, gemessen via Gate `codeLineCount`). Überschreitungen führen zum sofortigen STOPP und modularen Splitten.

---

## 5. Event & Command Verträge (v1, Binding)

### Event-Schema
```ts
type GameEvent = {
  eventId: string;   // format: `${tick}:${sourceId}:${type}:${seq}`
  tick: number;      // von Clock autorisiert
  type: EventType;   // UPPER_SNAKE_CASE
  sourceId: string;  // Entity-ID oder 'system:<Name>'
  version: 1;
  payload: object;   // dokumentiert in bus/events.ts
};
```

### Command-Schema
```ts
type Command = {
  commandId: string;
  tick: number;
  type: 'PLACE_PLANT' | 'REMOVE_PLANT' | 'START_WAVE' | 'BREED_PLANTS' | 'SELECT_PLANT' | 'CANCEL_PLACEMENT' | 'INSPECT';
  actorId: string;   // 'player'
  version: 1;
  payload: object;
};
```

*Verbindlicher Datenfluss:*  
Input (Pointer/Touch) → `CommandQueue` → `SimulationRoot` → `EventBus` → `Observers` → `Renderer`.

---

## 6. Determinismus & RNG-Isolation

- 8 autorisierte Namespaces:
  - **Gameplay:** `world`, `wave`, `enemy`, `plant`, `brood`, `loot` (nur Simulation).
  - **Präsentation:** `visual`, `particle`, `cosmetic` (nur Darstellung).
- RNG-Aufrufe der Präsentation dürfen niemals den Gameplay-RNG vorantreiben.
- `Math.random` und `Date.now` sind im gesamten Spielcode **verboten**. `performance.now` ist ausschließlich für Frame-Deltas in `GameView` zulässig.

---

## 7. Die 8-Fragen-Sperre (Vor jedem Schreiben anzuwenden)

1. Existiert diese Funktion oder dieser Datentyp bereits im Projekt?
2. Welches Modul besitzt die exklusive Verantwortung (Ownership)?
3. Handelt es sich um Gameplay, Source, Event, Observer oder Rendering?
4. Ist ein neues Command oder Event im Bus-Vertrag erforderlich?
5. Welchem der 8 Seed-Namespaces ist der Zufall zuzuordnen?
6. Gehört der Wert als Konstante in eine `*.source.ts`-Datei statt in den Code?
7. Bleibt die Datei nach der Änderung unter ihrem LOC-Cap?
8. Wird garantiert keine zweite Quelle der Wahrheit (State-Kopie) geschaffen?
