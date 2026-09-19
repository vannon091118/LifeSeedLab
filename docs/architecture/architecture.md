# architecture.md — LifeSeedLab Technische Systemarchitektur

> Sprache: Deutsch (Regel 1). Beschreibt das technische „Wie“ und vertieft den rechtsverbindlichen [`architecture-contract.md`](architecture-contract.md).
> Arbeitsvertrag für Entwickler & Agenten: [`AGENTS.md`](../../AGENTS.md).
> Meilensteine, Todos & Findings: [`ROADMAP.md`](../process/ROADMAP.md).
> Qualitäts-Register: [`../quality/quality-spec.md`](../quality/quality-spec.md) · Domänen-Contracts (Arbeitsliste je Domäne): `docs/quality/contracts/`.

---

## 1. Technologie-Entscheidungen (Technology Stack)

| Ebene | Technologie | Status | Begründung |
|---|---|---|---|
| **UI & Build** | React 19 + Vite + TypeScript (strict) | Fest | Moderner reaktiver DOM-Shell, instant HMR, null Overhead. |
| **Simulation** | Eigene deterministische Core-Runtime | Fest | Single-Thread/Worker-fähig, Fixed-Timestep (30 TPS), FNV-1a Hash-Kette. |
| **Rendering** | **HTML5 Canvas 2D (handgeschrieben)** | Fest | **Keine externe Engine** (Pixi/Phaser abgelehnt). Pure Zeichenroutinen (`Path2D`, Bezier-Konturen) + vorgebackene Offscreen-Papercraft-Texturen aus dem `visual`-Namespace. Maximale FPS bei minimalem Speicherfootprint auf Mobile (390×844). |
| **Audio** | Web Audio API (`observers/audioObserver.ts`) | Fest | SFX synthetisiert via Oszillatoren + Noise-Buffer, gesteuert durch `soundProfile`. 0 Audio-Assets, 0 Byte Ladezeit. Read-only Bus-Abonnent (FX ON/OFF ändert keinen einzigen RNG-Tick). |
| **Persistenz** | Eigenes `persistence/storage.ts` (0 Deps) | Fest | Einziger Storage-Owner. Checksummen (FNV-1a), Quarantäne bei Korruption (`.corrupt`), atomare Saves, synchrone Meta-Hydration vor erstem Paint. |
| **Discovery** | Lokale Append-Only Hash-Chain + Supabase | Fest | Kryptografischer Genom-Beweis (`genome_hash`) via FNV-1a. Teilen per Link/String ohne Blockchain-Token. |
| **Tests** | Vitest + Playwright (E2E) | Fest | Vitest im Shared-Worker-Modus (`isolate: false`, ~5s Voll-Suite), Playwright für 390×844 Portrait & Progression. |

---

## 2. Mathematische Endgleichungen & Determinismus

Das gesamte Spielsystem basiert auf zwei unumstößlichen Gleichungen:

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS        = DETERMINISTIC GAME STATE
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED  = DETERMINISTIC PRESENTATION
```

### 2.1 Fixed-Step Clock (30 TPS)
- Der Simulations-Tick ist starr: $\Delta t = \frac{1}{30}\,\text{s} \approx 33{,}33\,\text{ms}$.
- Die Simulation schreitet ausschließlich über diskrete Ticks voran (`SimulationRoot.stepOnce()`).
- Frame-Drops oder variable Bildwiederholraten des Bildschirms (60Hz, 120Hz) beeinflussen niemals die Spielgeschwindigkeit oder Physik; der Renderer interpoliert Positionen rein optisch.

### 2.2 RNG-Isolation & Namespaces
Alle Zufallsentscheidungen müssen über `core/rng.ts` laufen:
$$\text{deriveSeed}(\text{rootSeed}, \text{namespace}, \text{entityId}, \text{eventId}, \text{version})$$

Es existieren exakt **8 isolierte Namespaces**:
- **Gameplay-Namespaces (nur Simulation):**
  - `world`: Welt- & Karten-Initialisierung, Spawn-Punkte.
  - `wave`: Gegner-Zusammenstellung, Schedule, Boss-Generierung.
  - `enemy`: Pfad-Auswahl, Verhalten, individuelle Schwellenwerte.
  - `plant`: Angriffs-Jitter, kritische Treffer, Projektil-Streuung.
  - `brood`: Käfer-Zucht, Vererbung, Genom-Mutationen, Phänotypen.
  - `loot`: Nektar-Tropfen, Belohnungswürfe.
- **Präsentations-Namespaces (nur Rendering/Observer):**
  - `visual`: Silhouetten, Farbtöne, Blattkrümmungen, Papierkorngröße.
  - `particle`: Partikel-Streuung, Lebensdauer, Rauchschwaden.
  - `cosmetic`: Screen-Shake-Offset, Audio-Frequenz-Jitter.

*Garantie:* Eine Aktion in einem Präsentations-Namespace verbraucht **keinen** Tick im Gameplay-RNG. Das Deaktivieren von FX liefert bit-identische Spielstände (`State Hash`).

---

## 3. Datenfluss & Pipeline

```
[Spieler-Eingabe (Touch / Pointer)]
               │
               ▼
   [CommandQueue.makeCommand()]  (Contract v1)
               │
               ▼  (Drain an diskreter Tick-Grenze)
    ┌──────────────────────────────────────────────────────────┐
    │                    SimulationRoot                        │
    │  1. Clock.step()                                         │
    │  2. Drain Commands (Place, Remove, StartWave)            │
    │  3. WaveSystem (Spawns, Schedule)                        │
    │  4. EnemySystem (Bewegung, Routing, Zielauswahl)         │
    │  5. PlantSystem (Cooldowns, Reichweiten, Schuss)         │
    │  6. ProjectileSystem (Flug, Kollision, Flächenschaden)   │
    │  7. ScoreSystem & ComboSystem (Nektar, Multiplikatoren)  │
    │  8. State Hash Berechnung (FNV-1a)                       │
    └──────────────────────────────────────────────────────────┘
               │
               ▼  (Publish)
          [EventBus] (Contract v1: eventId, tick, type, sourceId, payload)
         /          \
        ▼            ▼
 [VisualObserver]  [AudioObserver]  ──> (Synthesizer, read-only)
        │
        ▼  (VisualCommands)
┌───────────────────────────────────────────────────────────────┐
│                    Canvas 2D Renderer                         │
│  Layer 0: Background (Kraftpapier-Textur, vorgebacken)        │
│  Layer 1: Terrain & Map (Raster, Wege, Wände)                 │
│  Layer 2: Shadows (Dynamische Weichzeichner-Schatten)         │
│  Layer 3: Plants & Beetles (Tuschekontur, Specular Highlight) │
│  Layer 4: Enemies (Nintendo-Pop Kontrast)                     │
│  Layer 5: Projectiles (Sporen, Stacheln, Laser)               │
│  Layer 6: Particles (Partikel-Pool mit striktem Budget)       │
│  Layer 7: Feedback (Schadenszahlen, Trefferblitze)            │
│  Layer 8: Manga & Overlays (Geschwindigkeitslinien, Vignetten)│
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Persistenz- & Resume-Architektur

### 4.1 Single-Owner-Prinzip (`persistence/storage.ts`)
Keine Komponente außerhalb von `persistence/` darf direkt auf `localStorage` oder `IndexedDB` zugreifen.
- `load<T>(key, { version, migrate, fallback }): T`: Validiert Schema-Version und FNV-1a Checksumme.
- `save(key, value): void`: Schreibt Daten atomar mit serialisierter Prüfsumme.
- **Quarantäne-Schutz:** Bei Prüfsummen-Fehler wird der fehlerhafte Stand nach `${key}.corrupt` verschoben. Der Spieler erhält saubere Fallback-Defaults; das Spiel crasht niemals stillschweigend.

### 4.2 Die zwei Speicherbereiche
1. **`meta` (localStorage, synchron):**
   - Wird vor dem ersten React-Paint synchron geladen.
   - Enthält: Sprache (`lang`), Nektar-Guthaben, Zucht-Generation (`broodGeneration`), Sammlungs-Inventar, Loadout (max. 4), Run-Counter (`runId`), Tutorial-Status (`tutorialDone`).
2. **`run` (IndexedDB / localStorage, asynchron):**
   - Hält den Schnappschuss eines laufenden Runs für nahtloses Fortsetzen.
   - **Resume-Vertrag:** Gespeichert werden ausschließlich:
     $$\{ \text{version, runId, seed, tick, waveNumber, phase:'prep', energy, score, combo, plants[], inventory, nektarEarned} \}$$
   - *Explizit nicht gespeichert:* Laufende Gegner, fliegende Projektile, temporäre Partikel.
   - *Resume-Verhalten:* Das Spiel startet deterministisch in der Vorbereitungsphase (`phase: 'prep'`) vor der nächsten Welle. Das Spawnschedule wird aus `(seed, waveNumber + 1)` frisch generiert.

---

## 5. OWNERSHIP CONTRACTS je Domäne (Verbindlich)

Jede Domäne im Verzeichnis `src/` unterliegt einem strikten Vertrag hinsichtlich Autorschaft, Lesezugriffen, Schnittstellen und LOC-Caps.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DOMÄNEN-ÜBERSICHT                                    │
│                                                                                  │
│  [config] (Source) ──▶ [genome] ──▶ [visual]                                     │
│         │                  │           │                                         │
│         ▼                  ▼           ▼                                         │
│      [core] ───────▶ [simulation] ──▶ [bus] ──▶ [observers] ──▶ [render]        │
│                             │                                        ▲           │
│                             ▼                                        │           │
│                       [persistence] ──────────────────────────▶ [ui/components] │
│                             │                                                    │
│                             ▼                                                    │
│                        [discovery]                                               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Domäne `core` (`src/core/`)
- **Verantwortung:** Mathematisches und zeitliches Fundament (Clock, Determinismus-RNG, ID-Generierung, Hashing, Farbwerte).
- **Autoritativer Writer:** `GameClock` (schreibt Zeit-Ticks); mathematische Module sind zustandslos/pure.
- **Erlaubte Reader:** Alle Domänen.
- **LOC-Cap:** 300 Code-Zeilen je Datei.
- **Garantien:** Absoluter Determinismus, 0% `Math.random()`, 0% `Date.now()`.

### 5.2 Domäne `config` (`src/config/`)
- **Verantwortung:** **Content Truth (SOURCE)** aller Spielelemente (Pflanzen, Käfer, Gegner, Effekte, Gene, Namen, Map-Templates, Shop).
- **Autoritativer Writer:** Statische Konfigurationsdateien (`*.source.ts`). Keine dynamischen Laufzeitschreiber.
- **Erlaubte Reader:** `simulation`, `genome`, `visual`, `ui`.
- **LOC-Cap:** 200 Code-Zeilen je Datei.
- **Garantien:** Keine einzige spielmechanische Konstante (Schaden, Tempo, Kosten) existiert hartcodiert im TypeScript-Code außerhalb dieser Domäne.

### 5.3 Domäne `simulation` (`src/simulation/`)
- **Verantwortung:** Vollständige Gameplay-Logik, Zustandstransformationen, Regelprüfung, Kampf- und Wellenabwicklung.
- **Autoritativer Writer:** `SimulationRoot` steuert die Untersysteme; jedes Untersystem (`PlantSystem`, `EnemySystem`, `ProjectileSystem`, `ScoreSystem`, `ComboSystem`, `WaveSystem`, `MapSystem`) schreibt exakt sein eigenes State-Slice.
- **Erlaubte Reader:** Main-Thread via periodischem Snapshot (`hudSnapshot.ts`), Bus-Events.
- **LOC-Cap:** 300 Code-Zeilen je Datei.
- **Garantien:** Kein System ruft ein anderes System direkt auf. Kommunikation nach außen erfolgt ausschließlich über den `EventBus`. Niemals UI-/Canvas-Abhängigkeiten.

### 5.4 Domäne `bus` (`src/bus/`)
- **Verantwortung:** Entkoppelte Nachrichtenvermittlung über versionierte Verträge (Commands rein, Events raus).
- **Autoritativer Writer:** `EventBus` (puffert und verteilt Events), `CommandQueue` (puffert Spielerbefehle).
- **Erlaubte Reader:** Alle Domänen dürfen subskribieren (read-only) bzw. Commands einreichen.
- **LOC-Cap:** 300 Code-Zeilen je Datei.
- **Garantien:** Unidirektionaler Datenfluss. Schema-Versionierung (`version: 1`). Keine State-Mutation bei Event-Dispatch.

### 5.5 Domäne `genome` (`src/genome/`)
- **Verantwortung:** Mendel-Genetik, Kreuzungsalgorithmen, Phänotyp-Berechnung für Pflanzen und Käfer, Gacha-Ziehungen.
- **Autoritativer Writer:** Zustandslos; reine Berechnungsfunktionen (`crossGenomes`, `resolvePhenotype`).
- **Erlaubte Reader:** `simulation`, `persistence`, `ui`, `visual`.
- **LOC-Cap:** 300 Code-Zeilen je Datei.
- **Garantien:** Reiner Determinismus. Bei gleichen Eltern-Genomen und identischem Seed entsteht immer das exakt gleiche Kind-Genom.

### 5.6 Domäne `visual` (`src/visual/`)
- **Verantwortung:** Übersetzung von Genom + Quellwerten in deterministische Render-Instruktionen (`ResolvedVisual`).
- **Autoritativer Writer:** `generator.ts` (reine Funktionen).
- **Erlaubte Reader:** `render`, `ui/components`.
- **LOC-Cap:** 400 Code-Zeilen je Datei.
- **Garantien:** Nutzt ausschließlich den `visual`-Namespace des RNGs. Erfindet keine eigenen Gameplay-Stats.

### 5.7 Domäne `render` (`src/render/`)
- **Verantwortung:** Zeichnen der Spielwelt auf das HTML5 Canvas über 9 Schichten, Kamera-Projektion und Screen-Shake.
- **Autoritativer Writer:** `Renderer` und spezialisierte Layer-Dateien (Terrain, Enemies, Beetles, ParticlesDraw etc.).
- **Erlaubte Reader:** Reiner Grafikausgeber (keine Reader-Rückkopplung ins Gameplay).
- **LOC-Cap:** 400 Code-Zeilen je Datei.
- **Garantien:** **Absolutes Schreibverbot auf Gameplay-Zustände.** Wenn der Renderer ausfällt oder übersprungen wird (Headless-Modus), läuft die Simulation bit-identisch weiter.

### 5.8 Domäne `observers` (`src/observers/`)
- **Verantwortung:** Horcht auf Gameplay-Events und erzeugt visuelle Effekte (Partikel), Kamera-Impulse und SFX-Töne.
- **Autoritativer Writer:** `visualObserver.ts`, `audioObserver.ts`, `particles.ts`.
- **Erlaubte Reader:** Werden vom `render`-Modul visualisiert bzw. von Web Audio ausgegeben.
- **LOC-Cap:** 400 Code-Zeilen je Datei (AudioObserver: 250 LOC).
- **Garantien:** Read-Only Beobachter. Partikel und Sounds dürfen unter keinen Umständen Gameplay-Zustände modifizieren oder Zufallszahlen für Gameplay verbrauchen.

### 5.9 Domäne `persistence` (`src/persistence/`)
- **Verantwortung:** Dauerhafte Speicherung, Lade-Integrität, Migrationen alter Save-Versionen und Quarantäne.
- **Autoritativer Writer:** `storage.ts` (Einziger autorisierter Zugriff auf Web Storage APIs).
- **Erlaubte Reader:** `meta/`, `simulation/resume.ts`.
- **LOC-Cap:** 200 Code-Zeilen je Datei.
- **Garantien:** FNV-1a Validierung; kein stiller Datenverlust bei Schema-Änderungen.

### 5.10 Domäne `discovery` (`src/discovery/`)
- **Verantwortung:** Hash-Kette gefundener Mutationen, lokales Labor-Notizbuch (Codex), Remote-Spiegelung nach Supabase.
- **Autoritativer Writer:** `chain.ts` (hängt deterministische Entdeckungs-Blöcke an).
- **Erlaubte Reader:** `Codex.tsx`, Meta-Store.
- **LOC-Cap:** 300 Code-Zeilen je Datei.
- **Garantien:** Append-Only. `UNIQUE(genome_hash)` — der Erstentdecker besitzt die Spezies permanent.

### 5.11 Domäne `ui` (`src/components/`, `src/dev/`)
- **Verantwortung:** React-Benutzeroberfläche, Screen-Routing, Krix-Tutorial-Overlays, DevGate-Entwicklerwerkzeuge.
- **Autoritativer Writer:** React-Komponenten für ihren eigenen lokalen View-State.
- **Erlaubte Reader:** Liest Zustand über `hudSnapshot` und `loadMeta()`.
- **LOC-Cap:** 400 Code-Zeilen je Komponente.
- **Garantien:** Gameplay-Aktionen werden ausschließlich als `Command` über die `CommandQueue` an den Bus geschickt, niemals durch direkte Methodenaufrufe an Simulations-Objekte.
