# 🗺️ ROADMAP

## 1. Projekt-Status

- **Code-Stand (`main`, 4a30d7d + Arbeitsbaum):** Phasen A–F sind implementiert und test-locked; Phase G (Multiplayer-Backend) bleibt bewusst zurückgestellt.
- **Baseline verifiziert (2026-09-16):** `npx tsc -b --noEmit` **0 Fehler** · `npx vitest run` **282/282 grün, 36 Dateien** · `npx playwright test` **27/27** · `npx vite build` grün.
- **Gate-Status:** Shinon als Commit+Push-Executor aktiv (Gate → Komponist → Push-Executor). Gate warm **~6–9 s** (inkrementeller Typecheck, Vitest-Modulcache, kein `npx` im Commit-Pfad); E2E bewusst **nicht** im Commit-Pfad (`gate.checks.e2e=false`).
- **Onboarding:** Scanner (`.agents/skills/lifeseedlab-onboarding/scripts/scan.mjs`) implementiert und verifiziert. **Spiel-Onboarding „Krix“ (B21) umgesetzt** — animierte Tour über drei Screens (Start → Hub → Feld), MetaSave v7 mit `tutorialVersion`.
- **Spielerberichte aufgearbeitet (2026-09-16, B21–B23 + B25):** Aufbauphase (leeres Feld startet keine Welle mehr, `prepStartTick` wandert mit), phasenrichter Wellen-Knopf, sichtbare Ablehnungsgründe (FieldToast), Score gerundet, Haltbarkeitsleiste am Feld, Loadout-Zähler aus einer Quelle mit der Liste, Codex-Sprachmix behoben („bleibt auf diesem Gerät“). Erst-Anzeige der Tray (B22, `hudSnapshot.ts`).
- **Befundlage:** `docs/quality/quality-spec.md` **A13** (Identitäts-/Lifecycle-Lücken, B14 erledigt) und **B21–B25** (Spielerberichte). Offen: **A13.8** (Snapshot-Budget), **A13.11** (Prüfpunkt `nextScopedId`), **B16.2–B16.5** (Genom-Modell), **B16.9** (E2E-Geometrie); aus den Berichten zusätzlich: Touch-Zuverlässigkeit beim Platzieren (Messung), Reichweiten-Kreis/Kampfwerte (Neubau), Brutstätte-Einstieg (Balance).

## 2. Dokumentationskarte
Alle relevanten Dokumente befinden sich nun unter `docs/`:

- **Architektur** (`docs/architecture/`)
  - [Architektur-Vertrag](docs/architecture/architecture-contract.md) - Die rechtsverbindlichen Regeln.
  - [Systemarchitektur](docs/architecture/architecture.md) - Technische Umsetzung.
  - [Art Direction](docs/architecture/papier-trifft-cgi.md) - Visuelles Konzept.
- **Qualität & QA** (`docs/quality/`)
  - [Qualitäts-Spezifikation](docs/quality/quality-spec.md) - Definition of Done & Anforderungen.
  - [Implementierungsplan](docs/quality/implementation-plan.md) - Roadmap der Feature-Entwicklung.
  - [Audit-Berichte](docs/quality/lifegameplant-audit.md) - Analyse bestehender Logik (historischer Stand).
  - *Versionshistorie:* `CHANGELOG.md` im Repo-Root (seit 0.0.18 getrackt, Changelog-Pflicht aus Regel 0) — der alte Milestone-Plan (ehemals docs/quality/changelog.md) ist gelöscht; Roadmap-Wahrheit ist §4 hier.
- **Setup & Onboarding** (`docs/setup/`)
  - [Präsentation](docs/setup/presentation.md) - Projektvorstellung.
  - [Script-Dokumentation](docs/setup/script-readme.md) - Hilfe zu den Tooling-Skripten.

**Root-Files im Track:** `AGENTS.md`, `README.md`, `CHANGELOG.md`, `LICENSE` (kein `ROADMAP.md` im Root — die Karte selbst liegt hier unter `docs/process/`)

**Nur lokal (gitignoriert, kein Bestandteil eines Klons):** `CLAUDE.md`, `docs/art/` (inkl. `styleframe.html`), `git-noir/`, `memory/`.

## 3. Qualität & Automation
- **Shinon (Commit + Push Executor):** Einziger Weg zum Git-Abschluss —
  Vorbereitung (Starter) → Gate → Komponist → Push-Executor. Details: `docs/setup/script-readme.md`.
  - **Nachrichtenregel:** `type(scope): description` (Conventional Commits) oder Prefix `[FOLD]`, `[CUT]`, `[SEED]`, `[STAMP]`
  - **Gate-Prüfungen:** LOC-Caps, Architektur-Constraints, Typecheck, Tests (Fail-Fast bei teuren Prüfungen)
  - **Push:** nur nach grünem Gate und Commit, mit Auth- und Upstream-Prüfung
- **Git-Hooks** (`core.hooksPath` → `git-noir/hooks`):
  - `pre-commit`: Gate-Stufe (Modulgrenzen, Constraints, Typecheck, Tests).
  - `commit-msg`: dieselbe Nachrichtenregel wie der Komponist.
  - `post-commit`: Push-Stufe (abschaltbar über `push.autoAfterCommit`).
- **Onboarding-Scanner:** `.agents/skills/lifeseedlab-onboarding/scripts/scan.mjs` prüft Pflichtdateien und Gate-Zustand.

## 4. Nächste Meilensteine

> Reihenfolge nach dem Arbeitsrhythmus des Vertrags: **Phase → Test → Gate → nächstes.**

### 🟢 Short-Term — Korrektheit vor Feature (**B14 + B15 + B17 + B18.1 erledigt**)

**B14 — umgesetzt und test-locked (18 neue Gates in `src/meta/brood_identity.test.ts`):**

1. ✅ **B14.1/B14.2 — Monotoner Brut-Zähler.** `MetaSave.broodGeneration` (v5 + Migration v1–v4) ersetzt das Fenster-Maximum in `enqueueBrood`; `BeetleLab` leitet den Index nicht mehr selbst ab. Behebt die verifizierte Doppel-Identität (A13.1/A13.2/A13.3).
2. ✅ **B14.3 — Identitäts-Gate.** Der Ist-Zustands-Beweis wurde zum Soll-Zustands-Regressionstest gedreht.
3. ✅ **B14.4 — Ein Reife-Gate, fail-closed.** `isCrossReady` zentral; unbekannter `crossIndex` ⇒ nicht reif; toter `number[]`-Rückgabewert entfällt; die Queue verwirft Gereiftes nicht mehr (A13.4/A13.7).
4. ✅ **B14.5 — Symmetrische Atomarität.** `keepCross` in einem Persistenzschritt wie `consumeSeedAndEnqueueCross` (A13.6).
5. ✅ **B14.6 — Kanonische Checksumme.** Integrität inhaltlich statt über JSON-Key-Reihenfolge, Alt-Saves bleiben lesbar (A13.5).

**Übernommen aus dem externen Review, jeder Punkt im Code nachgeprüft — A14–A16 → B16:**

- **A14 (DEFECT, verifiziert): die berechnete Map-Route wird nie gezeichnet.** `drawPath` liest statisch `ENEMY_PATH`, das Terrain wird einmal pro Seed gebacken, und `getRoute()` hat **null** Render-Konsumenten (nur `map.test.ts`) — obwohl sein Kommentar einen Renderer-Verbraucher behauptet. Ein umgeleiteter Pfad ist damit unsichtbar.
- **A15 (INCOMPLETE, gemessen): die Genom-Kreuzung mutiert — aber das Modell ist an der falschen Stelle offen.** Drei echte Mutationsachsen (Fremdgen p = 0.15, Stärke-Jitter, Dominanz-Drift), jedoch: die Allelmenge ist mit 15 Pool-Genen geschlossen, die Paarung läuft über Array-**Index** statt Gen-ID, und der Eingang ist ein Dreier-Menü (`PLANTS_SOURCE`). Test-gelockt in `src/genome/cross.test.ts`.
- **A16 (DEFECT, behoben): `Codex.tsx` war doppelkodiert** (Mojibake als literale Zeichen). Rückkodiert, verifiziert, und als Gate verboten (`src/encoding.test.ts` + `.editorconfig`).
- **A17 (DEFECT, gefunden in der Sichtprüfung): der Codex-Screen ist halb übersetzt** — deutsche Literale in der Komponente neben i18n-Texten, obwohl `codex.empty` bereits existiert. Kein Test konnte das finden; deshalb steht die Sichtprüfung im Sprint-Abschluss.
- **A18 (DEFECT-Klasse, behoben): die fail-open-Geschwister des B14-Fehlers** — `claimBrood` wählte bei ungültigem Index stillschweigend 0 und prüfte Reife nur in der UI; `keepCross` war über den optionalen Index umgehbar (und der Bypass war als Vertrag test-gelockt); die Inventar-Kappung hinterließ hängende Loadout-/bredStats-Referenzen; ein Save-Downgrade überschrieb still das neuere Save. Behoben fail-closed, mit 9 neuen Gates. Zwei weitere Review-Behauptungen (`recordRunEnd` tot, Discovery-Chain gebrochen) sind im Code **widerlegt** (A18.7). Offen als Design-Entscheidung: Kappungs-Politik (B16.8) und E2E-Geometrie vom Renderer lesen (B16.9).

**A19 (DEFECT-Klasse, aus dem Spielbetrieb gemeldet, behoben): die Meta-Wahrheit lag im React-State.** Der Run-Start reservierte die `runId` auf der Router-**Kopie** und persistierte sie — jeder Fortschritt, der während des Runs direkt in die Persistenz ging (überstandene Wellen), wurde beim nächsten Start überschrieben. Dasselbe Muster traf das Menü: es zeigte nach dem Run die Kopie und säte damit `startedWave`-Werte in die Zukunft, die **nie** reifen konnten („Samen keimen nicht"). Fix: `beginRun()` reserviert auf `loadMeta()`, das Menü liest beim Verlassen frisch, und `healRipeness` stellt Reifungs-Invarianten bei **jedem** Load her (die Storage-Schicht reicht aktuelle Versionen unverändert durch — eine Heilung nur im Migrationszweig liefe für die betroffenen Saves nie). 4 neue Gates in `src/meta/brood_loop.test.ts`, darunter eine Gegenprobe, die die alte Form als Verlust dokumentiert. **Entscheidungen getroffen und umgesetzt (2026-09-15):** Bestandsquelle B17.3 = Option A (Samen keimt zur Pflanze, atomar als `buySeedAndGerminate`) und Fortschrittsregel B17.4 = Option A (angebrochene Welle, `WAVE_STARTED → +1`, Doppelzählungs-Gate in E2E).

**B15 — umgesetzt (Zucht-Schleife erreichbar):**

1. ✅ **B15.2 — Reifung an Wellen gekoppelt, durch B17.4 geschärft.** Der Zähler tickt während des Runs (je angebrochener Welle +1 via `WAVE_STARTED`); `GAME_OVER` zählt nicht nach (keine Doppelzählung) — ein Writer, ein Aufrufanlass.
2. ✅ **B15.1/B15.3 — Beanspruchung aus der Queue.** Reife Queue-Zeilen zeigen das Kind (aus dem persistierten `PendingCross.seed` rekonstruiert) + Beanspruchen-Knopf; unreife die verbleibenden Wellen. Kein React-State über den Screen-Wechsel.
3. ✅ **B15.4 — Wurf reihenfolge-unabhängig.** `rollGachaCross` sortiert die Besitzliste kanonisch (nach id) vor dem Gewichten; Gate inkl. Gegenprobe in `src/meta/brood_loop.test.ts`.

**B17 — Persistenz-Korrektheit UND Bestandskreislauf umgesetzt:**

1. ✅ **B17.1 — Persistiert wird nie eine Kopie.** `meta/run.ts:beginRun()` reserviert die `runId` auf der persistierten Wahrheit; der Router hält keine schreibbare Kopie mehr und liest beim Verlassen des Runs frisch.
2. ✅ **B17.2 — Reifungs-Invarianten bei jedem Load.** `store.ts:healRipeness` hebt `startedWave` auf `totalWavesSurvived` (`≤`, idempotent, konservativ, auch für Bruten) — festgefressene Kreuzungen reifen wieder.
3. ✅ **B17.3 — Bestandsquelle = Option A.** Ein Kauf keimt **direkt** zur Pflanze (`buySeedAndGerminate`, ein atomarer Schritt, fail-closed ohne Nektar); Keim-Identität `seed_{index}` deterministisch aus dem Spiel-Seed (Discovery-Chain-Vertrag). Der test-gelockte Elternverbrauch (Keep 2→1) bleibt unangetastet.
4. ✅ **B17.4 — Fortschrittsregel = Option A.** Jede angebrochene Welle zählt +1 (`WAVE_STARTED`); Tod in Welle 1 bringt genau +1. „Keine Runde bringt was" ist strukturell unmöglich; das E2E-Gate lockt +0 und +2 als Defekte.

**Nächster offener Block — B16** (Genom-Modell schärfen B16.2–B16.5, E2E-Geometrie B16.9; Route sichtbar = B16.1 ✅ umgesetzt), danach die Mid-Term-Messschiene (B14.7 Snapshot-Budget, Bibliotheks-Wachstum).

**B18.1 — Loadout bedienbar (umgesetzt):** Das Menü trennt **Loadout (n/4, Mitnehmen/Ablegen über `toggleLoadout`)** von der Sammlung; gezüchtete Pflanzen erreichen den Run. Offen: **B18.2** Sichtbeweis, dass ein Kind im Run sichtbar anders spielt/aussieht (Verdrahtung steht, Bestätigung im Spielbetrieb).

### 🟡 Mid-Term — Messen statt hoffen

6. **B14.7 — Snapshot-Budget.** Der 10-Hz-HUD-Pfad klont den vollen `SimState`; gegen **B12** (frame ≤ 16 ms, sim ≤ 2 ms, 390×844) messen und entdrosseln (A13.8).
7. **E2E-Suite in den Sprint-Abschluss einhängen — erledigt; die Lücken sind geschlossen.** Die Suite liegt jetzt in `tests/` (**27 Tests, 6 Specs, gemeinsamer Harness** `tests/helpers/harness.ts` nach B24: Router, Platzierung, Run-Screen, Preview, Mechanik-Schnellchecks, Progression) und läuft grün; Stufe 2 des verbindlichen Sprint-Abschlusses (`AGENTS.md`) ist damit ausführbar und über `git-noir/shinon` als eigene Gate-Stufe registriert. **Spielverlust, Wellen-Ende und Reifungs-Fortschritt sind abgedeckt** (`tests/progression.spec.ts`): Der DevGate-Fast-Forward (`window.__ff`, nur hinter `?dev=1`, `src/dev/testHooks.ts`) führt deterministische `stepOnce()`-Ticks synchron aus — derselbe öffentliche Pipeline-Einstieg wie der RAF-Loop, keine State-Injection. Dabei aufgedeckt und behoben: **B19.1** Zombie-Sim nach Game-Over (Sim-Effect-Rebuild durch mid-run `onMetaChange` — frischer Root hinter dem Overlay auto-startete Wellen, blähte die Reifung auf und machte tote Runs resumierbar; Fix: Effect-Deps auf `[seed, runId, onMetaChange, devActive]`, Remount nur via `key={meta.runId}`) und **B19.2** Sow-Gate ohne Stash (B17.3 Option A lässt `seedStash` strukturell bei 0 — `consumeSeedAndEnqueueCross` forderte trotzdem 1 Stash ⇒ Zucht-Schleife unerreichbar, A13.12-Regression; Fix: Aussaat frei, Kosten verbleiben im Elternverbrauch beim Keep).
8. **`nextScopedId`-Injektivität prüfen.** Hash- statt Zähler-Kennung (`% 9000`) ist kollisionstheoretisch offen (A13.11).
9. **Entscheidung Track-Zugehörigkeit des Styleframes** (`docs/art/` gitignoriert) — entweder Ausnahme in `.gitignore` oder Verweis aus B0.9 entfernen (A13.9).
10. **Bibliotheks-Wachstum messen (B16.8-Nachlauf).** Die Kappungs-Entscheidung („Identität ist unverletzlich") beruht auf der 2ⁿ-Kostenkurve als natürlicher Bremse; das reale Save-Wachstum wird gegen B12 gemessen, nicht behauptet.

### 🔴 Long-Term — Ausbau & Release

10. **Restliche B13-Punkte abschließen** und die Checkliste ehrlich auf den Ist-Stand bringen (mehrere Häkchen sind faktisch erledigt).
11. **Phase G — Multiplayer-Backend** (bewusst zurückgestellt; Transport-Layer `Local`/`MockRemote` und Snapshot-/Hash-Verträge sind bereits nahtfähig).
12. **Finales QA-Audit** gegen `docs/quality/quality-spec.md` für v1.0.
