# 🗺️ ROADMAP

## 1. Projekt-Status
- **Status:** Onboarding-Phase abgeschlossen, Architektur-Verträge etabliert.
- **Gate-Status:** Repository-Struktur konsolidiert, Shinon-Validator aktiv.
- **Onboarding:** Scanner (`scripts/scan.mjs`) implementiert und verifiziert.

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
- **Shinon-Validator:** Überprüft Commit-Messages auf das geforderte Format:
  - `type(scope): description` (Conventional Commits)
  - Special-Prefixes: `[FOLD]`, `[CUT]`, `[SEED]`, `[STAMP]`
- **Git-Hooks:**
  - `commit-msg`: Verhindert Commits mit ungültigen Messages.
  - `post-commit`: Automatisiert den Push auf `origin main` bei Commits im Main-Branch.
- **Onboarding-Scanner:** `node scripts/scan.mjs` prüft die Integrität der Pflichtdateien und den Validator-Status.

## 4. Nächste Meilensteine

### 🟢 Short-Term (Stabilisierung)
- [ ] Abschluss der Basis-Features B1-B3.
- [ ] Feinabstimmung des Shinon-Validators und der Hooks.
- [ ] Vollständige Typisierung des Simulation-Roots.

### 🟡 Mid-Term (Kern-Gameplay)
- [ ] Implementierung B4-B6 (Pflanzen-Interaktion, Energie-System).
- [ ] Optimierung der "Papier-trifft-CGI" Render-Pipeline.
- [ ] Implementierung des deterministischen RNG-Seed-Systems.

### 🔴 Long-Term (Polishing & Release)
- [ ] Feature-Set B7-B13 (Wellen-System, Mobile-Perf).
- [ ] Implementierung der Persistenz-Layer (Save/Resume).
- [ ] Finales QA-Audit gegen `quality-spec.md` für v1.0.
