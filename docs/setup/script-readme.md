# Shinon — Commit + Push Executor

Shinon kontrolliert den Git-Abschluss eines Arbeitsvorgangs. Es ist die **einzige** Stelle, an der
geprüft, committet und gepusht wird — der Agent bereitet Arbeit und Commit-Nachricht vor, Shinon
entscheidet und führt aus.

> Das Tooling liegt in `git-noir/` und ist **lokal**: `git-noir/` steht in `.gitignore`, weil es
> Werkzeug ist und nicht Inhalt. Alle hier beschriebenen Pfade sind relativ zum Repository-Root.

## Ablauf

```
Agent arbeitet
  → ShinonStarter  liest den realen Projektstatus, aktualisiert die README, startet das Preflight-Gate
  → ShinonGate     lädt die Prüfklassen, sammelt Befunde, entscheidet (offen / geschlossen)
  → ShinonCommitKomponist  liest commit_msg.txt und führt `git commit -F -` mit genau diesem Inhalt aus
  → ShinonPushExecutor     prüft Vorbedingungen und Authentifizierung, pusht den Branch
```

Reihenfolge ist bindend: **ohne grünes Gate kein Commit, ohne Commit kein Push.**

## Module

| Modul | Verantwortung |
|---|---|
| `git-noir/shinon/cli.ts` | Einziger Einstieg (alle Stufen, `--json`, `--quiet`, `--dry-run`) |
| `git-noir/shinon/config.ts` | Konfiguration + Defaults (LifeSeedLab-Profil), Override über `shinon.config.json` |
| `git-noir/shinon/git-helfer.ts` | ShinonGitHelfer: Git **und** `gh` — Status, Init, Remote, Auth, Commit, Push |
| `git-noir/shinon/checks/` | Spezialisierte Prüfklassen (Nachricht, LOC-Caps, Constraints, Typecheck, Tests, Build) |
| `git-noir/shinon/gate.ts` | ShinonGate: Orchestrierung, Fail-Fast, Bericht |
| `git-noir/shinon/starter.ts` | ShinonStarter: Statuserhebung, README-Block, Preflight |
| `git-noir/shinon/commit-komponist.ts` | ShinonCommitKomponist: der einzige Commit-Pfad |
| `git-noir/shinon/push-executor.ts` | ShinonPushExecutor: Vorbedingungen, Auth-Prüfung, Push |
| `git-noir/shinon/pipeline.ts` | ShinonPipeline: Vorbereitung → Gate → Commit → Push |
| `git-noir/shinon/init.ts` | ShinonInit: Repo, Remote, GitHub-Repository, Hooks — **ausdrücklich ohne Push** |
| `git-noir/shinon/hooks.ts` | Erzeugt die Hooks in `git-noir/hooks` und setzt `core.hooksPath` |
| `git-noir/shinon/state.ts` | Letzter Gate-/Commit-/Push-Stand für den README-Status |

## Befehle

```bash
node git-noir/shinon/cli.ts status         # nur lesen: Branch, HEAD, Arbeitsbaum, LOC-Hotspots
node git-noir/shinon/cli.ts prepare        # Status + README aktualisieren + Gate (preflight)
node git-noir/shinon/cli.ts gate           # nur prüfen (--phase=pre-commit, --only=<ids>, --json)
node git-noir/shinon/cli.ts commit         # Komponist: commit_msg.txt → git commit -F -
node git-noir/shinon/cli.ts push           # Push-Executor (--dry-run möglich)
node git-noir/shinon/cli.ts finish --all   # kompletter Ablauf inkl. Staging und Push
node git-noir/shinon/cli.ts init --slug=owner/repo   # Einrichtung, ohne Push
node git-noir/shinon/cli.ts install-hooks  # Hooks schreiben, core.hooksPath setzen
```

## Hooks

`core.hooksPath` zeigt auf `git-noir/hooks`. Die Hooks entscheiden nichts selbst, sie rufen den CLI
auf:

| Hook | Wirkung |
|---|---|
| `pre-commit` | Gate-Stufe (Nachricht, Modulgrenzen, Constraints, Typecheck, Tests) |
| `commit-msg` | dieselbe Nachrichtenregel, die der Komponist anwendet |
| `post-commit` | Push-Stufe — automatisch, abschaltbar über `push.autoAfterCommit` |

## Konfiguration

Defaults gelten ohne Datei. Überschreiben lässt sich alles über `shinon.config.json` im
Repository-Root (oder `SHINON_CONFIG=<pfad>`):

```json
{
  "commit": { "messageFile": "commit_msg.txt", "freeForm": false },
  "gate": {
    "checks": { "typecheck": true, "tests": true, "build": false },
    "locCaps": [{ "path": "src/simulation/", "cap": 300, "label": "Simulationssystem" }],
    "commands": { "tests": { "command": "npx", "args": ["vitest", "run"], "enabled": true } }
  },
  "push": { "remote": "origin", "branch": "main", "autoAfterCommit": true, "requireAuth": true }
}
```

## Tests des Toolings

```bash
npx tsc -p git-noir/tsconfig.json                        # Typecheck des Toolings
npx vitest run --config git-noir/vitest.config.ts        # 24 Tests: Gates, Komponist, Starter
```

Die Projekt-Suite (`npx vitest run`) bleibt unberührt und prüft weiterhin ausschließlich `src/**`.
