# 🗺️ ROADMAP

## 1. Projekt-Status
- **Status:** Onboarding-Phase abgeschlossen, Architektur-Verträge etabliert.
- **Gate-Status:** Shinon als Commit+Push-Executor aktiv (Gate → Komponist → Push-Executor).
- **Onboarding:** Scanner (`.agents/skills/lifeseedlab-onboarding/scripts/scan.mjs`) implementiert und verifiziert.

## 2. Dokumentationskarte
Alle relevanten Dokumente befinden sich nun unter `docs/`:

- **Architektur** (`docs/architecture/`)
  - [Architektur-Vertrag](docs/architecture/architecture-contract.md) - Die rechtsverbindlichen Regeln.
  - [Systemarchitektur](docs/architecture/architecture.md) - Technische Umsetzung.
  - [Art Direction](docs/architecture/papier-trifft-cgi.md) - Visuelles Konzept.
- **Qualität & QA** (`docs/quality/`)
  - [Qualitäts-Spezifikation](docs/quality/quality-spec.md) - Definition of Done & Anforderungen.
  - [Implementierungsplan](docs/quality/implementation-plan.md) - Roadmap der Feature-Entwicklung.
  - [Audit-Berichte](docs/quality/lifegameplant-audit.md) - Analyse bestehender Logik.
  - [Changelog](docs/quality/changelog.md) - Versionshistorie.
- **Setup & Onboarding** (`docs/setup/`)
  - [Präsentation](docs/setup/presentation.md) - Projektvorstellung.
  - [Script-Dokumentation](docs/setup/script-readme.md) - Hilfe zu den Tooling-Skripten.

**Root-Files:** `AGENTS.md`, `CLAUDE.md`, `README.md`, `LICENSE`

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

### 🟢 Short-Term (Stabilisierung)
- [ ] Abschluss der Basis-Features B1-B3.
- [x] Shinon zum vollständigen Commit+Push-Executor ausgebaut (Gate, Komponist, Push, Hooks).
- [ ] Vollständige Typisierung des Simulation-Roots.

### 🟡 Mid-Term (Kern-Gameplay)
- [ ] Implementierung B4-B6 (Pflanzen-Interaktion, Energie-System).
- [ ] Optimierung der "Papier-trifft-CGI" Render-Pipeline.
- [ ] Implementierung des deterministischen RNG-Seed-Systems.

### 🔴 Long-Term (Polishing & Release)
- [ ] Feature-Set B7-B13 (Wellen-System, Mobile-Perf).
- [ ] Implementierung der Persistenz-Layer (Save/Resume).
- [ ] Finales QA-Audit gegen `quality-spec.md` für v1.0.
