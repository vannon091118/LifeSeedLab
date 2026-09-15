# 🗺️ ROADMAP

## 1. Projekt-Status

- **Code-Stand (`main`, `ebb4913`):** Phasen A–F sind implementiert und test-locked; Phase G (Multiplayer-Backend) bleibt bewusst zurückgestellt.
- **Baseline verifiziert (2026-09-15):** `npx tsc -b --noEmit` **0 Fehler** · `npx vitest run` **170/170 grün, 20 Dateien** · `npx vite build` grün.
- **Gate-Status:** Shinon als Commit+Push-Executor aktiv (Gate → Komponist → Push-Executor).
- **Onboarding:** Scanner (`.agents/skills/lifeseedlab-onboarding/scripts/scan.mjs`) implementiert und verifiziert.
- **Zuletzt gehärtet (`ebb4913`):** Snapshot-Kopien (`getSnapshot`/`getEventLog`), atomares Aussäen (`consumeSeedAndEnqueueCross`), IDB-Parität im Quarantäne-/Checksum-Vertrag, event-getriebenes Run-Ende statt RAF-Polling.
- **Befundlage:** `docs/quality/quality-spec.md` **A13** (Identitäts-/Lifecycle-Lücken). **B14 ist umgesetzt** (A13.1–A13.7, A13.9, A13.10). Offen: **A13.8** (Snapshot-Budget), **A13.11** (Prüfpunkt `nextScopedId`), **A13.12** (Zucht-Schleife unerreichbar) und **A13.13** (`rollGachaCross` ist reihenfolge-abhängig) — die letzten beiden gehen in Auftrag **B15**.

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
  - *Versionshistorie:* aktuell nicht im Repo — `.gitignore` ignoriert `CHANGELOG.md`/`docs/quality/changelog.md`. Entweder Ausnahme in `.gitignore` oder Streichung aus der Karte (offen, siehe A13.9).
- **Setup & Onboarding** (`docs/setup/`)
  - [Präsentation](docs/setup/presentation.md) - Projektvorstellung.
  - [Script-Dokumentation](docs/setup/script-readme.md) - Hilfe zu den Tooling-Skripten.

**Root-Files im Track:** `AGENTS.md`, `README.md`, `ROADMAP.md`, `LICENSE`

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

**B14 — umgesetzt und test-locked (18 neue Gates in `src/meta/identity.test.ts`):**

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

**A19 (DEFECT-Klasse, aus dem Spielbetrieb gemeldet, behoben): die Meta-Wahrheit lag im React-State.** Der Run-Start reservierte die `runId` auf der Router-**Kopie** und persistierte sie — jeder Fortschritt, der während des Runs direkt in die Persistenz ging (überstandene Wellen), wurde beim nächsten Start überschrieben. Dasselbe Muster traf das Menü: es zeigte nach dem Run die Kopie und säte damit `startedWave`-Werte in die Zukunft, die **nie** reifen konnten („Samen keimen nicht"). Fix: `beginRun()` reserviert auf `loadMeta()`, das Menü liest beim Verlassen frisch, und `healRipeness` stellt Reifungs-Invarianten bei **jedem** Load her (die Storage-Schicht reicht aktuelle Versionen unverändert durch — eine Heilung nur im Migrationszweig liefe für die betroffenen Saves nie). 4 neue Gates in `src/meta/b17.test.ts`, darunter eine Gegenprobe, die die alte Form als Verlust dokumentiert. **Entscheidungen getroffen und umgesetzt (2026-09-15):** Bestandsquelle B17.3 = Option A (Samen keimt zur Pflanze, atomar als `buySeedAndGerminate`) und Fortschrittsregel B17.4 = Option A (angebrochene Welle, `WAVE_STARTED → +1`, Doppelzählungs-Gate in E2E).

**B15 — umgesetzt (Zucht-Schleife erreichbar):**

1. ✅ **B15.2 — Reifung an Wellen gekoppelt, durch B17.4 geschärft.** Der Zähler tickt während des Runs (je angebrochener Welle +1 via `WAVE_STARTED`); `GAME_OVER` zählt nicht nach (keine Doppelzählung) — ein Writer, ein Aufrufanlass.
2. ✅ **B15.1/B15.3 — Beanspruchung aus der Queue.** Reife Queue-Zeilen zeigen das Kind (aus dem persistierten `PendingCross.seed` rekonstruiert) + Beanspruchen-Knopf; unreife die verbleibenden Wellen. Kein React-State über den Screen-Wechsel.
3. ✅ **B15.4 — Wurf reihenfolge-unabhängig.** `rollGachaCross` sortiert die Besitzliste kanonisch (nach id) vor dem Gewichten; Gate inkl. Gegenprobe in `src/meta/b15.test.ts`.

**B17 — Persistenz-Korrektheit UND Bestandskreislauf umgesetzt:**

1. ✅ **B17.1 — Persistiert wird nie eine Kopie.** `meta/run.ts:beginRun()` reserviert die `runId` auf der persistierten Wahrheit; der Router hält keine schreibbare Kopie mehr und liest beim Verlassen des Runs frisch.
2. ✅ **B17.2 — Reifungs-Invarianten bei jedem Load.** `store.ts:healRipeness` hebt `startedWave` auf `totalWavesSurvived` (`≤`, idempotent, konservativ, auch für Bruten) — festgefressene Kreuzungen reifen wieder.
3. ✅ **B17.3 — Bestandsquelle = Option A.** Ein Kauf keimt **direkt** zur Pflanze (`buySeedAndGerminate`, ein atomarer Schritt, fail-closed ohne Nektar); Keim-Identität `seed_{index}` deterministisch aus dem Spiel-Seed (Discovery-Chain-Vertrag). Der test-gelockte Elternverbrauch (Keep 2→1) bleibt unangetastet.
4. ✅ **B17.4 — Fortschrittsregel = Option A.** Jede angebrochene Welle zählt +1 (`WAVE_STARTED`); Tod in Welle 1 bringt genau +1. „Keine Runde bringt was" ist strukturell unmöglich; das E2E-Gate lockt +0 und +2 als Defekte.

**Nächster offener Block — B16** (Route sichtbar machen, Genom-Modell schärfen, E2E-Geometrie), danach die Mid-Term-Messschiene (B14.7 Snapshot-Budget, Bibliotheks-Wachstum).

**B18.1 — Loadout bedienbar (umgesetzt):** Das Menü trennt **Loadout (n/4, Mitnehmen/Ablegen über `toggleLoadout`)** von der Sammlung; gezüchtete Pflanzen erreichen den Run. Offen: **B18.2** Sichtbeweis, dass ein Kind im Run sichtbar anders spielt/aussieht (Verdrahtung steht, Bestätigung im Spielbetrieb).

### 🟡 Mid-Term — Messen statt hoffen

6. **B14.7 — Snapshot-Budget.** Der 10-Hz-HUD-Pfad klont den vollen `SimState`; gegen **B12** (frame ≤ 16 ms, sim ≤ 2 ms, 390×844) messen und entdrosseln (A13.8).
7. **E2E-Suite in den Sprint-Abschluss einhängen — erledigt, zu verifizieren bleibt die Disziplin.** Die Suite liegt jetzt in `tests/` (11 Tests: Router, Platzierung, Run-Screen, Preview) und läuft grün; Stufe 2 des verbindlichen Sprint-Abschlusses (`AGENTS.md`) ist damit ausführbar und über `git-noir/shinon` als eigene Gate-Stufe registriert. Offen: die Specs decken den glücklichen Pfad ab — Spielverlust, Wellen-Ende und das Fortschreiten der Reifung fehlen.
8. **`nextScopedId`-Injektivität prüfen.** Hash- statt Zähler-Kennung (`% 9000`) ist kollisionstheoretisch offen (A13.11).
9. **Entscheidung Track-Zugehörigkeit des Styleframes** (`docs/art/` gitignoriert) — entweder Ausnahme in `.gitignore` oder Verweis aus B0.9 entfernen (A13.9).
10. **Bibliotheks-Wachstum messen (B16.8-Nachlauf).** Die Kappungs-Entscheidung („Identität ist unverletzlich") beruht auf der 2ⁿ-Kostenkurve als natürlicher Bremse; das reale Save-Wachstum wird gegen B12 gemessen, nicht behauptet.

### 🔴 Long-Term — Ausbau & Release

10. **Restliche B13-Punkte abschließen** und die Checkliste ehrlich auf den Ist-Stand bringen (mehrere Häkchen sind faktisch erledigt).
11. **Phase G — Multiplayer-Backend** (bewusst zurückgestellt; Transport-Layer `Local`/`MockRemote` und Snapshot-/Hash-Verträge sind bereits nahtfähig).
12. **Finales QA-Audit** gegen `docs/quality/quality-spec.md` für v1.0.
