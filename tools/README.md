# tools — Shinon (Git-Tooling)

Dieses Verzeichnis enthält das lokale Agent-Tooling des Projekts. Die TypeScript-Implementierung
wird über den kleinen Plain-Node-Loader `shinon/hook-entry.mjs` ausgeführt; dadurch bleiben die
Hooks ohne globale `ts-node`-/`tsx`-Runtime ausführbar.

## Einstieg

```bash
node tools/shinon/hook-entry.mjs prepare        # Status + README-Block + Gate (Preflight)
node tools/shinon/hook-entry.mjs gate --json    # nur prüfen, maschinenlesbar
node tools/shinon/hook-entry.mjs finish --all   # Vorbereitung → Gate → Commit → Push
node tools/shinon/hook-entry.mjs install-hooks  # Hooks schreiben, core.hooksPath setzen
```

Der direkte Start von `shinon/cli.ts` unter plain Node ist nicht der unterstützte Einstieg; der
Loader in `hook-entry.mjs` ist die ausführbare Grenze. `--dry-run` bleibt auf den prüfenden und
vorbereitenden Stufen read-only; Schreibbefehle wie `init` oder `install-hooks` werden damit nicht
still akzeptiert.

Vollständige Beschreibung: [`docs/setup/script-readme.md`](../docs/setup/script-readme.md).

## Struktur

```
tools/
├── hooks/                pre-commit, commit-msg, post-commit (core.hooksPath zeigt hierher)
├── shinon/
│   ├── hook-entry.mjs    Plain-Node-Einstieg für alle Stufen
│   ├── hook-loader.mjs   lokaler TypeScript-Loader für den Einstieg
│   ├── cli.ts            CLI-Implementierung und Orchestrierung
│   ├── runner.ts         Prozessausführung (Argumente ohne Shell, Windows-Shims via cmd.exe)
│   ├── git-helfer.ts     ShinonGitHelfer — Fassade für git + gh
│   ├── github-helfer.ts  GitHub-CLI-Teil (Auth, repo view/create, slug)
│   ├── checks/           spezialisierte Prüfklassen (Nachricht, LOC, Constraints, Typecheck, Tests, Build)
│   ├── gate.ts           ShinonGate — Orchestrierung, Fail-Fast, Bericht
│   ├── starter.ts        ShinonStarter — Status, README-Block, Preflight
│   ├── commit-komponist.ts  der einzige Commit-Pfad (git commit -F -)
│   ├── push-executor.ts  Push-Stufe mit Vorbedingungen und Auth-Prüfung
│   ├── pipeline.ts       Ablauf: Vorbereitung → Gate → Commit → Push
│   ├── init.ts           Einrichtung (Repo, Remote, GitHub, Hooks) — ohne Push
│   ├── hooks.ts          Hook-Erzeugung und core.hooksPath
│   ├── config.ts         Defaults (LifeSeedLab-Profil) + Overrides
│   ├── context.ts        Aufbau des Prüfkontexts aus dem echten Repository-Zustand
│   ├── state.ts          letzter Gate-/Commit-/Push-Stand
│   └── tests/            Tooling-Tests
├── types/node-min.d.ts   minimale Ambient-Typen der genutzten Node-APIs
├── tsconfig.json         Typecheck des Toolings (unabhängig von src/)
├── vitest.config.ts      eigene Testsuite (unabhängig von der Projekt-Suite)
└── .shinon-state.json    erzeugt zur Laufzeit (lokal)
```

## Verifikation

```bash
node node_modules/typescript/bin/tsc -p tools/tsconfig.json
node node_modules/vitest/vitest.mjs run --config tools/vitest.config.ts
```

## Randbedingungen

- **Keine Shell für Argumente:** Prozesse werden ohne Shell gestartet; `*.cmd`-Shims unter Windows
  laufen über `cmd.exe /d /s /c` mit korrekter Quotierung, erst im Fehlerfall.
- **Kein neuer Dependency-Eintrag:** `types/node-min.d.ts` deklariert nur die genutzten Node-APIs.
  (`@types/node` würde die globalen Typen des Spielcodes mitverschieben — nicht gewollt.)
- **Nur ein Writer pro Stufe:** `git`/`gh` ausschließlich über `git-helfer.ts`, README-Block
  ausschließlich über `starter.ts`, Commits ausschließlich über `commit-komponist.ts`.
- **Modulgrenzen:** jede Datei bleibt unter dem Cap von 300 Zeilen (Verantwortung splitten, nicht
  Cap erhöhen).
- **Zustand bleibt aus dem Commit:** `tools/.shinon-state.json` und `tools/.tmp/` sind Laufzeit-
  bzw. Scratch-Zustand und gehören nicht in den Commit.
