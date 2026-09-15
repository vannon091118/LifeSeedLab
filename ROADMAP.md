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

### 🟢 Short-Term — Korrektheit vor Feature (**B14 erledigt**, **B15 offen**)

**B14 — umgesetzt und test-locked (18 neue Gates in `src/meta/identity.test.ts`):**

1. ✅ **B14.1/B14.2 — Monotoner Brut-Zähler.** `MetaSave.broodGeneration` (v5 + Migration v1–v4) ersetzt das Fenster-Maximum in `enqueueBrood`; `BeetleLab` leitet den Index nicht mehr selbst ab. Behebt die verifizierte Doppel-Identität (A13.1/A13.2/A13.3).
2. ✅ **B14.3 — Identitäts-Gate.** Der Ist-Zustands-Beweis wurde zum Soll-Zustands-Regressionstest gedreht.
3. ✅ **B14.4 — Ein Reife-Gate, fail-closed.** `isCrossReady` zentral; unbekannter `crossIndex` ⇒ nicht reif; toter `number[]`-Rückgabewert entfällt; die Queue verwirft Gereiftes nicht mehr (A13.4/A13.7).
4. ✅ **B14.5 — Symmetrische Atomarität.** `keepCross` in einem Persistenzschritt wie `consumeSeedAndEnqueueCross` (A13.6).
5. ✅ **B14.6 — Kanonische Checksumme.** Integrität inhaltlich statt über JSON-Key-Reihenfolge, Alt-Saves bleiben lesbar (A13.5).

**Nächster Block — B15: die Zucht-Schleife erreichbar machen.** Der kritische Befund: „Aussäen → reifen → behalten" ist derzeit **nicht einmal auslösbar**, weil der Reifungszähler nur beim `GAME_OVER` fortschreitet und dieser Moment den Screen (und damit den Wurf) abräumt (A13.12). B15 liefert Beanspruchung aus der Queue (Kind aus dem persistierten Seed rekonstruiert), koppelt die Reifung an Wellen statt an den Run-Tod und macht den Wurf reihenfolge-unabhängig (A13.13).

### 🟡 Mid-Term — Messen statt hoffen

6. **B14.7 — Snapshot-Budget.** Der 10-Hz-HUD-Pfad klont den vollen `SimState`; gegen **B12** (frame ≤ 16 ms, sim ≤ 2 ms, 390×844) messen und entdrosseln (A13.8).
7. **E2E-Suite anlegen — blockiert den neuen Sprint-Abschluss.** `playwright.config.ts` und `@playwright/test` liegen im Projekt, aber `npx playwright test --list` meldet „Total: 0 tests in 0 files" (`tests/` fehlt). Ohne Spezifikationen ist Stufe 2 des verbindlichen Sprint-Abschlusses (`AGENTS.md`) nicht erfüllbar. Erste E2E-Gates: Run starten, Pflanze platzieren, Welle überleben, Game-Over-Karte, Screen-Router ohne Zustandsverlust.
8. **`nextScopedId`-Injektivität prüfen.** Hash- statt Zähler-Kennung (`% 9000`) ist kollisionstheoretisch offen (A13.11).
9. **Entscheidung Track-Zugehörigkeit des Styleframes** (`docs/art/` gitignoriert) — entweder Ausnahme in `.gitignore` oder Verweis aus B0.9 entfernen (A13.9).

### 🔴 Long-Term — Ausbau & Release

10. **Restliche B13-Punkte abschließen** und die Checkliste ehrlich auf den Ist-Stand bringen (mehrere Häkchen sind faktisch erledigt).
11. **Phase G — Multiplayer-Backend** (bewusst zurückgestellt; Transport-Layer `Local`/`MockRemote` und Snapshot-/Hash-Verträge sind bereits nahtfähig).
12. **Finales QA-Audit** gegen `docs/quality/quality-spec.md` für v1.0.
