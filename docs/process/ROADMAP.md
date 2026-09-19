# 🗺️ ROADMAP — LifeSeedLab Meilensteine, Findings & Aufgaben

> Verbindliche Aufgaben- und Meilenstein-Planung.
> Rechtsverbindliche Systemregeln: [`docs/architecture/architecture-contract.md`](../architecture/architecture-contract.md).
> Qualitäts-Register: [`docs/quality/quality-spec.md`](../quality/quality-spec.md) · Arbeitsliste je Domäne: `docs/quality/contracts/`.
> Agenten-Arbeitsvertrag: [`AGENTS.md`](../../AGENTS.md).

---

## 1. Aktueller Projektstatus

- **Code-Stand (`main`):** Phasen A–F vollständig implementiert und test-locked. Phase G (Multiplayer/Backend) bewusst aufgeschoben.
- **Verifizierungs-Baseline:**
  - TypeScript inkrementell: **0 Fehler** (`tsc -b --noEmit`)
  - Test-Suite: **429+ Tests in 44 Testdateien alle grün** (`node scripts/test-lane.mjs --full`)
  - E2E-Suite: **27/27 Tests grün** (`tests/`, Chromium 390×844 Portrait & Progression)
  - Vite-Build: **Produktions-Build fehlerfrei**
- **Qualitäts-Gate (Shinon):**
  - Gate-Modus: `enforcement=strict` (0 Fehler, 0 Warnungen)
  - Test-Lane: Ausführung relevanter Tests (`vitest related`) im Commit-Pfad ≤ 10 s
  - Git-Abschluss: Ausschließliche Ausführung über `node tools/shinon/cli.ts finish --all`
- **Spielerlebnis & Onboarding:**
  - **Krix-Tutorial (B21):** Vollständiges Strichmännchen-Onboarding über 3 Screens (Start → Hub → Feld)
  - **Spieler-Feedback (B22–B25):** Aufbauphase vor erster Welle, optische Ablehnungsgründe (`FieldToast`), Haltbarkeitsanzeige am Feld, einheitlicher Loadout-Zähler, honest Codex.

---

## 2. Konsolidiertes Findings- & Befunde-Inventar

Alle historischen und aktuellen Befunde aus Code-Audits (jetzt domänenweise in `docs/quality/contracts/`) und QA-Test-Sessions (`qa-reports`) sind hier konsolidiert:

### 2.1 Gelöste Befunde (Status: ERLEDIGT)
- **A13 / B14 (Identitäts- & Lifecycle-Lücken):** Monotoner Brut-Zähler `MetaSave.broodGeneration` (v5), zentrales Reife-Gate `isCrossReady`, atomares `keepCross`, kanonische FNV-1a Prüfsumme.
- **A14 / B16.1 (Versteckte Map-Route):** Dynamische Routen-Berechnung wird nun korrekt visualisiert.
- **A16 (Mojibake-Encoding):** UTF-8 Zeichencodierung im Codex bereinigt; Encoding-Gate in `src/encoding.test.ts`.
- **A17 (Halb übersetzter Codex):** Alle Literale in `translations.ts` überführt.
- **A18 (Fail-Open Geschwister):** `claimBrood`, `keepCross` und Inventar-Kappung fail-closed abgesichert.
- **A19 / B17 (Meta-Wahrheit in React-State):** `beginRun()` reserviert direkt auf persistiertem Stand; `healRipeness` stellt Invarianten bei jedem Laden her.
- **B15 (Zucht-Schleife):** Reifung an Wellenfortschritt gekoppelt (`WAVE_STARTED → +1`); deterministischer Gacha-Wurf.
- **R1 / R2 (Zwei Weg-Wahrheiten):** Widerspruch zwischen statischem und dynamischem Pfad aufgelöst; R2-Welt-Neubau umgesetzt.
- **F1–F6 (Spielfluss & Interaktion):** Nachbar-Auswahl, Button-States und UI/Sim-Divergenzen bereinigt.

### 2.2 Aktive Befunde (Status: IN ARBEIT / OFFEN)
- **T2 / T3 (Mazing & Weg-Lenkung):** Feinschliff der Pfad-Auswahl und Rand-Routen beim Setzen von Pflanzen (Verhinderung von Deadlocks).
- **N4 (Mobile UX):** Hinweis-Sprechblase von Krix verdeckt auf schmalen Displays (390×844) stellenweise den oberen Bereich des Trays.
- **B16.2–B16.5 (Genom-Modell):** Vererbung von 15 Pool-Genen auf ein offenes Allel-System mit dynamischer Stärke und Dominanz umstellen.
- **B16.9 (E2E-Geometrie):** Playwright-Tests sollen Klick-Koordinaten direkt aus den berechneten Renderer-Bounds lesen statt statischer CSS-Offsets.
- **B14.7 (Snapshot-Budget):** Der 10-Hz-HUD-Snapshot klont den `SimState`; Profiling gegen das Budget (Frame ≤ 16 ms, Sim ≤ 2 ms).

---

## 3. Konsolidierte Meilensteine in logischer Reihenfolge

Die Umsetzung erfolgt strikt sequenziell nach dem Arbeitsrhythmus: **Aufgabe → Test → Gate → Commit**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOGISCHE REIHENFOLGE                            │
│                                                                        │
│  [STUFE 1: Sofort]  ──▶  [STUFE 2: Performance] ──▶  [STUFE 3: Endgame]│
│  - Mazing-Stabilität     - HUD-Snapshot Budget       - Brutstätten-    │
│  - N4 Blasen-Layout      - Touch-Latenz (390x844)      Balancing       │
│  - B16 Genom-Modell      - Savegame-Skalierung       - Boss-Wellen     │
│  - Kampfwerte-Anzeige    - B12/B13 Gates               & Progression   │
│                                                              │         │
│                                                              ▼         │
│                                                     [STUFE 4: Ausblick]│
│                                                     - Convex Backend   │
│                                                     - Supabase Sync    │
└────────────────────────────────────────────────────────────────────────┘
```

### 🟢 STUFE 1: Sofort / Mechanik- & UX-Stabilisierung
Fokus: Beseitigung aller offenen QA-Befunde und Schärfung des Genom-Gameplays.

1. **N4 UX-Layout (Mobile 390×844):**
   - Sprechblase (`SpeechBubble.tsx`) und Hinweisfelder so anordnen, dass das Placement-Tray und die Aktions-Buttons niemals blockiert werden.
2. **T2/T3 Mazing & Weg-Lenkung:**
   - Sicherstellen, dass Pflanzenplatzierungen keine geschlossenen Weg-Blockaden erzeugen.
   - Routen-Aktualisierung bei jeder Feld-Veränderung synchron an `EnemySystem` und `Renderer` melden.
3. **B16 Genom-Modell & Vererbungs-Tiefe:**
   - Genom-Allel-Matrix erweitern (nicht nur geschlossene 15 Gene).
   - Kampfwerte, Reichweitenkreise und Schadensarten im Feld-Inspektor klar visualisieren.
4. **B16.9 E2E-Harness Geometrie:**
   - `tests/helpers/harness.ts` liest Zellenkoordinaten dynamisch aus dem Canvas-Viewport.

### 🟡 STUFE 2: Mid-Term / Performance & Mobile-Optimierung
Fokus: Messen statt hoffen — strikte Einhaltung der B12/B13 Spezifikationen.

5. **B14.7 Snapshot-Budget:**
   - `hudSnapshot.ts` optimieren: Nur geänderte Felder übertragen (Dirty-Flagging oder flache Projektion), um GC-Druck zu minimieren.
   - Messziel: Sim-Tick ≤ 2 ms, Frame-Render ≤ 16 ms auf mobilen Endgeräten.
6. **Mobile Touch-Optimierung (390×844 Portrait):**
   - Touch-Latenz beim Drag-and-Drop / Tap-to-Place evaluieren.
   - Mindest-Touch-Target-Größe von 44×44 px für alle interaktiven HUD-Elemente garantieren.
7. **Bibliotheks-Wachstum & Save-Skalierung:**
   - Messung des Lade- und Serialisierungsaufwands bei Sammlungen mit > 100 gezüchteten Pflanzen und Käfern.
   - Bestätigung, dass die 2ⁿ-Kostenkurve im Gacha-System Speicherüberläufe zuverlässig verhindert.
8. **Finalisierung der B12/B13 Gates:**
   - Vollständige Validierung der DoD-Checkliste für den stabilen Release-Kandidaten.

### 🟠 STUFE 3: Endgame, Balance & Content-Ausbau
Fokus: Spieltiefe, Langzeitmotivation und harmonische Verzahnung von Zucht und Abwehr.

9. **Brutstätten-Balancing (Käfer / Brood):**
   - Synergien zwischen Pflanzen (Shooter, Wall, Slow) und Käfer-Begleitern (Nahkampf, Chitin-Rüstung, Aas-Verwertung) ausbalancieren.
   - Kostenkurve für Nektar und Bruteier im Shop kalibrieren.
10. **Endless-Wave Progression & Boss-Phasen:**
    - Bosse alle 10 Wellen mit einzigartigen Fähigkeiten (Schild-Auren, Sporen-Resistenz, Erdschlag).
    - Tag/Nacht-Einfluss vertiefen (Nachtaktive Pflanzen schießen schneller, Pilze leuchten).
11. **Codex-Vollendung:**
    - Visuelle Stammbaum-Darstellung im Codex (`src/components/Codex.tsx`).

### 🔵 STUFE 4: Ausblick & Vernetzung (Phase G)
Fokus: Asynchrones Teilen und Community-Features (bewusst nachgelagert).

12. **Build-Sharing via Convex:**
    - Schematisierung des Export-Formats: `{ rootSeed, genomePair, commandLogHash, variantKey, version }`.
    - Kein Gameplay-Einfluss; Anbindung über `bus/remote`-Adapter.
13. **Discovery-Chain Supabase-Spiegel:**
    - Synchronisation des lokalen Codex mit `supabase/migrations/001_discoveries.sql`.
    - Weltweites Leaderboard für seltene Mutationen.

---

## 4. Dokumentations-Architektur (Wo steht was?)

| Bereich | Primäres Dokument |
|---|---|
| **Verbindliche Regeln & Gate** | [`AGENTS.md`](../../AGENTS.md) |
| **Rechtsverbindlicher Vertrag** | [`docs/architecture/architecture-contract.md`](../architecture/architecture-contract.md) |
| **Systemarchitektur & Contracts** | [`docs/architecture/architecture.md`](../architecture/architecture.md) |
| **Qualitäts-Register & Domänen-Contracts** | [`docs/quality/quality-spec.md`](../quality/quality-spec.md) → `docs/quality/contracts/` |
| **Roadmap, Findings & Meilensteine**| [`docs/process/ROADMAP.md`](ROADMAP.md) |
| **Art Direction & Assets** | [`docs/architecture/papier-trifft-cgi.md`](../architecture/papier-trifft-cgi.md) |
| **Tooling & Shinon-CLI** | [`docs/setup/script-readme.md`](../setup/script-readme.md) |
