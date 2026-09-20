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
  - Test-Suite: **541 Tests in 56 Testdateien alle grün** (`node scripts/test-lane.mjs --full`, 19.09.2026)
  - Tooling-Suite: **38 Tests in 8 Dateien grün** (`--config tools/vitest.config.ts`)
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

## 3. Bekannte Probleme (verifiziert am Code, 19.09.2026)

Aufgenommen ist nur, was am heutigen Stand **im Code belegt** offen ist — jede Zeile nennt
Beleg und Owner. Was die Berichte gemeldet haben und inzwischen behoben ist, steht in den
Domänen-Contracts (`docs/quality/contracts/`) und in der Chronologie des Devlogs
(`docs/process/devlog/` — die QA-Berichte selbst werden nach der Überführung gelöscht,
damit dieselbe Sache nicht an zwei Orten lebt).
Entschiedene Punkte wandern nach unten in die Spur-Abschnitte (Nummern bleiben stabil).

| # | Problem | Beleg am Code | Owner |
|---|---|---|---|
| P-2 | **Mobile Hochformat im Run.** Die rechte Knopf-Gruppe der Top-Bar steht ohne `flexWrap` in einer Zeile; auf 390×844 kann „Run beenden" dadurch aus dem Bild ragen. Das E2E deckt 390×844 nur für Router/Hub ab, nicht den Run-Screen — der Beleg in der laufenden App fehlt noch. | `components/gameViewStyles.ts` `topRight`, `tests/router.spec.ts` (Screen-Abdeckung) | `components/` |
| P-3 | **Duell-Brett verbraucht Hub-Aufmerksamkeit.** Die Karte ist gleich groß wie die spielbaren, liefert aber nur „Bald verfügbar". | `i18n/texts_shell.ts` `menu.pvp`/`menu.pvpDesc` | `components/` + `i18n/` |
| P-4 | **Technische Identifikatoren in Normalansichten.** Die Codex-Karte zeigt `genome_hash`/`entry_hash` direkt im Spielerfluss; der externe Playtest wünscht sie in einer Detailansicht. | `components/Codex.tsx` | `components/` |
| P-5 | **Krix-Blase auf 390×844.** Der Umbau des Tutorials hat die alte Verankerung (`anchor.y`, zu kurze Bühne) ersetzt; ein Beleg-Screenshot bei 390×844 nach dem Umbau steht aus. Nicht als behobene Behauptung führen, sondern nachmessen. | `components/tutorial/`, `components/gameViewStyles.ts` | `components/` |
| P-8 | **`reward` und `scoreValue` sind in der Source für ALLE fünf Gegnertypen zahlenidentisch** (grunt 10/10 · fast 15/15 · tank 30/30 · swarm 5/5 · boss 150/150). Beide werden gelesen (Nektar-Anteil bzw. Score), die Trennung ist also echt — aber solange die Werte gleich sind, ist jeder Balance-Eingriff an einem Feld eine halbe Wahrheit. Offen: bewusst differenzieren oder ein Feld benennen. | `config/enemies.source.ts`, `simulation/scoreSystem.ts` | `config/` |
| P-9 | **Inzucht-Vielfalt hängt allein an der Mutation.** Die Mutations-Chance ist fix (`BREEDING.mutationChance`), der Neuheitsdruck skaliert nur Drift/Dominanz — bei genetisch gleichen Eltern erhält die Rekombination die Kräfte EXAKT, und ein Dominanz-Kippen bewegt die Käfer-Werte gar nicht. Die Brut fängt das mit 12 statt 6 Versuchen ab (gemessen: vorher 7 von 48 Bruten nur zwei Profile, jetzt 0 von 48) — der Kern selbst bleibt eng. Offen als BALANCE-Entscheidung, weil sie die Pflanzenzucht mitbewegt: Druck an die Mutations-Chance koppeln oder Pool/Content erweitern. | `config/phenotype.source.ts` `BREEDING`, `genome/breeding.ts` | `config/` |
| P-10 | **Tray ohne Scroll-Hinweis (mobil).** Der Kartenstreifen einer Sparte ist breiter als 390 px (`overflowX: 'auto'`) und zeigt keinen Fade-, Pfeil- oder Zähler-Hinweis — ein Teil der Bau-Optionen ist unsichtbar, ohne dass etwas darauf deutet. Befund aus der Mobile-Runde (Q9, 1/3), seither nicht neu gemessen. | `components/PlacementTray.tsx` (`sectionRow`), Devlog 04 | `components/` |
| P-11 | **Brutvorschau rendert ohne genug Nektar.** Die drei Kandidaten erscheinen, sobald zwei Eltern gewählt sind — der Kontostand beeinflusst nur die Knopf-Optik. Entweder ist das ein Teaser (dann fehlt die Kennzeichnung) oder ein Pfad, der die Wirtschaftsprüfung umgeht. Designfrage aus Q11. | `components/BeetleLab.tsx` (`preview`, `handleBreed`), Devlog 04 | `components/` + `i18n/` |
| P-12 | **Tile-Werkzeug schaltet sich selbst ab (T3).** Die Werkzeug-Knöpfe sind Umschalter; beim Serien-Bau wählt der zweite Klick den Modus ab, und der Zustand ist an der Karte nicht schnell genug ablesbar. Kein Kaufschaden, aber ein Bruch mitten im Bauen. Kandidat 1/3 aus der Taktik-Session. | `components/placementController.ts` (`selectTile`), Devlog 18 | `components/` |
| P-13 | **Restfragen der Nachverifikation** (Leih-Karte überragt die Tray um ~10 px, Größe der Krix-Blase). Beide wurden an der Oberfläche vor dem Tray-Umbau und vor dem neuen Onboarding gemessen — nicht als behoben führen, sondern an der heutigen Fläche nachmessen. | Devlog 17, `components/PlacementTray.tsx`, `components/tutorial/` | `components/` |
| P-14 | **Leere Route direkt nach dem Fortsetzen** (Beobachtung B, 0/3). `applyResume` setzt `currentRoute = null`, abgeleitet wird sie erst im ersten Tick (`root.ts`) — für einen Moment zeigt das Brett keinen Laufweg. Bisher nicht reproduziert; entweder messen oder die Ableitung in den Resume ziehen. | `simulation/resume.ts`, `simulation/root.ts`, Devlog 10/13 | `simulation/` |
| P-15 | **Wiedereinstieg in die Krix-Notizen.** Die Entscheidung von Q3 gilt (Überspringen verwirft bewusst, kein erneutes Aufdrängen) — der damals zugesagte Weg, die Notizen später auf Wunsch nachzulesen, wurde nie gebaut. Offen als Wunsch, nicht als Bug. | Devlog 01/06, `components/tutorial/` | `components/` |

### Am 19.09.2026 entschieden und umgesetzt (Nummern bleiben stabil)

Diese drei standen hier als offen und sind jetzt Code + belegt — die Zeile bleibt als Spur stehen,
damit die Nummern nicht wandern und alte Verweise gültig bleiben:

- **P-1 Blumentopf** → **Booster** (Entscheidung „Farbe ⇒ Effekt, Zelle bestimmt Farbe"):
  `config/pot.source.ts` (vier Farben, vier Achsen), `simulation/potBoost.ts` (Zell-Ableitung),
  `plantSystem.plantStatsAt` (EINE Wahrheit für Sim, Renderer und Vorschau). Beleg:
  `potBoost.test.ts` (5 Tests, Mutation geprüft), Preview-Screenshot (vier Farben auf der Karte).
- **P-6 WEG-GÜTE** → **LAUFWEG in Feldern** (Entscheidung „Laufweg in Feldern zeigen"):
  `simulation/routeMetrics.ts` ersetzt `routeQuality.ts`; Chip „LAUFWEG 22 · min 22",
  `ROUTE_CHANGED` trägt `tiles`/`ideal`. Belege: `maze_plants.test.ts` (25 vs. 15 = 10 Felder
  Gewinn), `hudSnapshot.test.ts`, Live-Chip im Preview.
### Am 20.09.2026 entschieden und umgesetzt

- **P-16 Platzierbarkeit der eigenen Sammlung** → **behoben** (`5f14dbc`): Bestandssaves trugen
  für ihren Bestand keinen `bredStats`-Eintrag, wodurch die Vorschau jede Zelle mit `unknown`
  und die Sim mit `no_inventory` ablehnte (Tray zeigte ×1, gesetzt wurde nichts). Jetzt heilt
  `deriveRunStats` die Run-Stats beim Start aus dem Genom (dieselbe Ableitung wie bei der
  Registrierung). Beleg: `src/meta/run_stats.test.ts` (7 Gates, Mutation geprüft), Live-Preview
  mit echtem Profil. Regel: `docs/quality/contracts/meta.md` B1.1.
- **Q10 Mobile/Dev-Blende** (aus Devlog 04) → **behoben** (`5f14dbc`): Das Dev-Overlay lag über
  der Tray und schluckte Karten- und Brett-Taps; es ist jetzt Lesefläche (`pointer-events: none`),
  nur der FX-Knopf bleibt bedienbar. Beleg: Karten-Klick trifft mit Overlay den Handler,
  FX toggelt weiter. Regel: `docs/quality/contracts/ui.md` (B7.6).

- **P-7 `resources.experience`** → **Feld gestrichen** (Entscheidung „Feld streichen"): kein
  zweiter Kontostand im Run; Writer, Source-Konstanten, Resume-Kopie und die Tests, die ihn
  pinnten, sind weg. Dabei fielen zwei tote `resources.energy`-Zuweisungen in den Maze-Tests auf
  (Rest des Energiesystems). Belege: `gateB.test.ts` pinnt jetzt, dass ein Kill KEINEN zweiten
  Kontostand erzeugt; `hash.ts` trägt keine `resources`-Falle mehr.

---

## 4. Konsolidierte Meilensteine in logischer Reihenfolge

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

## 5. Dokumentations-Architektur (Wo steht was?)

| Bereich | Primäres Dokument |
|---|---|
| **Verbindliche Regeln & Gate** | [`AGENTS.md`](../../AGENTS.md) |
| **Rechtsverbindlicher Vertrag** | [`docs/architecture/architecture-contract.md`](../architecture/architecture-contract.md) |
| **Systemarchitektur & Contracts** | [`docs/architecture/architecture.md`](../architecture/architecture.md) |
| **Qualitäts-Register & Domänen-Contracts** | [`docs/quality/quality-spec.md`](../quality/quality-spec.md) → `docs/quality/contracts/` |
| **Roadmap, Findings & Meilensteine**| [`docs/process/ROADMAP.md`](ROADMAP.md) |
| **Art Direction & Assets** | [`docs/architecture/papier-trifft-cgi.md`](../architecture/papier-trifft-cgi.md) |
| **Tooling & Shinon-CLI** | [`docs/setup/script-readme.md`](../setup/script-readme.md) |
