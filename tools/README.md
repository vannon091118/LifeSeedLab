# git-noir — Shinon (lokales Git-Tooling)

Dieses Verzeichnis ist **lokales Agent-Tooling** und bewusst in `.gitignore` (Zeile `git-noir/`):
es ist Werkzeug, nicht Inhalt. Deswegen darf es auch nichts am Projekt selbst verändern —
insbesondere keine `package.json`-Dependencies. Node 24 führt die TypeScript-Module direkt aus
(Type-Stripping), es braucht also kein `ts-node` und kein `tsx`.

## Einstieg

```bash
node git-noir/shinon/cli.ts prepare        # Status + README-Block + Gate (Preflight)
node git-noir/shinon/cli.ts gate --json    # nur prüfen, maschinenlesbar
node git-noir/shinon/cli.ts finish --all   # Vorbereitung → Gate → Commit → Push
node git-noir/shinon/cli.ts install-hooks  # Hooks schreiben, core.hooksPath setzen
```

Vollständige Beschreibung: [`docs/setup/script-readme.md`](../docs/setup/script-readme.md).

## Struktur

```
git-noir/
├── hooks/                pre-commit, commit-msg, post-commit (core.hooksPath zeigt hierher)
├── shinon/
│   ├── cli.ts            Einstieg für alle Stufen
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
│   └── tests/            23 Tests des Toolings
├── types/node-min.d.ts   minimale Ambient-Typen der genutzten Node-APIs
├── tsconfig.json         Typecheck des Toolings (unabhängig von src/)
├── vitest.config.ts      eigene Testsuite (unabhängig von der Projekt-Suite)
└── .shinon-state.json    erzeugt zur Laufzeit (lokal)
```

## Verifikation

```bash
npx tsc -p git-noir/tsconfig.json                  # 0 Fehler
npx vitest run --config git-noir/vitest.config.ts  # 23 Tests grün
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
- **Zustand bleibt aus dem Commit:** `git-noir/` nicht versionieren (in fremden Projekten also
  entweder ignorieren oder `core.hooksPath`/Nachrichtenpfad entsprechend konfigurieren).
