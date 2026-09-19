# Shinon — Commit + Push Executor

Shinon kontrolliert den Git-Abschluss eines Arbeitsvorgangs. Es ist die **einzige** Stelle, an der
geprüft, committet und gepusht wird — der Agent bereitet Arbeit und Commit-Nachricht vor, Shinon
entscheidet und führt aus.

> Das Tooling liegt **getrackt im Repo** unter `tools/` (früher lokal unter `git-noir/`, jetzt für
> jeden Klon verfügbar) — Werkzeug ist und nicht Inhalt. Alle hier beschriebenen Pfade sind
> relativ zum Repository-Root.

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
| `tools/shinon/cli.ts` | Einziger Einstieg (alle Stufen, `--json`, `--quiet`, `--dry-run`) |
| `tools/shinon/config.ts` | Konfiguration + Defaults (LifeSeedLab-Profil), Override über `shinon.config.json` |
| `tools/shinon/git-helfer.ts` | ShinonGitHelfer: Git **und** `gh` — Status, Init, Remote, Auth, Commit, Push |
| `tools/shinon/checks/` | Spezialisierte Prüfklassen (Nachricht, LOC-Caps, Constraints, Typecheck, Tests, Build) |
| `tools/shinon/gate.ts` | ShinonGate: Orchestrierung, Fail-Fast, Bericht |
| `tools/shinon/starter.ts` | ShinonStarter: Statuserhebung, README-Block, Preflight |
| `tools/shinon/commit-komponist.ts` | ShinonCommitKomponist: der einzige Commit-Pfad |
| `tools/shinon/push-executor.ts` | ShinonPushExecutor: Vorbedingungen, Auth-Prüfung, Push |
| `tools/shinon/pipeline.ts` | ShinonPipeline: Vorbereitung → Gate → Commit → Push |
| `tools/shinon/init.ts` | ShinonInit: Repo, Remote, GitHub-Repository, Hooks — **ausdrücklich ohne Push** |
| `tools/shinon/hooks.ts` | Erzeugt die Hooks in `tools/hooks` und setzt `core.hooksPath` |
| `tools/shinon/state.ts` | Letzter Gate-/Commit-/Push-Stand für den README-Status |

## Befehle

```bash
node tools/shinon/cli.ts status         # nur lesen: Branch, HEAD, Arbeitsbaum, LOC-Hotspots
node tools/shinon/cli.ts prepare        # Status + README aktualisieren + Gate (preflight)
node tools/shinon/cli.ts gate           # nur prüfen (--phase=pre-commit, --only=<ids>, --json)
node tools/shinon/cli.ts commit         # Komponist: commit_msg.txt → git commit -F -
node tools/shinon/cli.ts push           # Push-Executor (--dry-run möglich)
node tools/shinon/cli.ts finish --all   # kompletter Ablauf inkl. Staging und Push
node tools/shinon/cli.ts init --slug=owner/repo   # Einrichtung, ohne Push
node tools/shinon/cli.ts install-hooks  # Hooks schreiben, core.hooksPath setzen
node tools/shinon/cli.ts enforce        # Enforcement-Modus anzeigen / setzen (advisory|strict)
```

## Hooks

`core.hooksPath` zeigt auf `tools/hooks`. Die Hooks entscheiden nichts selbst, sie rufen den CLI
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
    "enforcement": "strict",
    "checks": { "typecheck": true, "tests": true, "build": false },
    "locCaps": [{ "path": "src/simulation/", "cap": 300, "label": "Simulationssystem" }],
    "commands": { "tests": { "command": "npx", "args": ["vitest", "run"], "enabled": true } }
  },
  "push": { "remote": "origin", "branch": "main", "autoAfterCommit": true, "requireAuth": true }
}
```

## Enforcement-Modus

Das Gate kennt genau zwei Modi (`gate.enforcement`):

| Modus | Wirkung |
|---|---|
| `advisory` (Tooling-Default) | Nur Fehler schließen das Gate; Warnungen werden berichtet |
| `strict` (**dieses Repository**) | Warnungen blockieren wie Fehler — grün heißt 0 Fehler **und** 0 Warnungen |

Der Modus ist **persistierte Konfiguration, kein Per-Lauf-Flag**. Das ist Absicht: Ein Flag wäre ein
zweiter Weg am Gate vorbei. Weil die Entscheidung in `shinon.config.json` im Repository liegt, gilt
sie für die CLI **und** für die Hooks — und bleibt es auch nach einem frischen Clone.

```bash
node tools/shinon/cli.ts enforce            # aktuellen Modus + Quelle anzeigen
node tools/shinon/cli.ts enforce strict     # Enforcement aktivieren (schreibt shinon.config.json)
node tools/shinon/cli.ts enforce advisory   # zurück auf advisory
```

Die Blockier-Regel lebt an **einer** Stelle (`checks/check.ts`: `isBlocking`) und wird von Fail-Fast,
Einzelurteil, Gesamturteil und Nachrichtenprüfung gemeinsam benutzt — Entscheidung und Bericht können
nicht auseinanderlaufen. Bericht und README-Status nennen den Modus; bei reiner Warnungslage schließt
das Gate mit `GATE GESCHLOSSEN (Enforcement)`.

Ausnahme mit Begründung: Die Architektur-Regel „Persistenz nur über `persistence/`" gilt für
**Spielcode**. Der Playwright-Harness unter `tests/` darf den Browser-Save lesend beobachten (er läuft
außerhalb der App und kann den Owner nicht importieren); Schreiben bleibt verboten, und die Ausnahme ist
in `checks.test.ts` als exakte Liste gelockt, damit sie nicht still wächst.

## Doku-Pflege (außerhalb von Shinon)

```bash
node scripts/quality-register.mjs           # ID-Tabelle des Registers aus den Contracts schreiben
node scripts/quality-register.mjs --check   # nur prüfen (Exit 1 bei Abweichung) — läuft in CI
node scripts/test-lane.mjs                  # Commit-Lane: nur berührte Tests (Ziel ≤ 10 s)
node scripts/test-lane.mjs --full           # Sprintende: komplette Suite
```

`quality-register.mjs` hält `docs/quality/quality-spec.md` mit den Contracts deckungsgleich: es
liest die Domänen-Reihenfolge aus der Domänen-Tabelle des Registers (keine eigene Liste), die
ID→Contract-Zuordnung aus den Überschriften der Contracts, und bricht ab bei doppelter ID, Waise,
vergessenem Contract oder rohem `|` in einer Zelle. Die Prüfung gehört in CI, weil ein Register,
das nur auf dieser Maschine stimmt, für einen frischen Klon keine Aussage hat.

## Tests des Toolings

```bash
node node_modules/typescript/bin/tsc -p tools/tsconfig.json     # Typecheck des Toolings
node node_modules/vitest/vitest.mjs run --config tools/vitest.config.ts   # Gate, Enforcement, Komponist, Starter
```

Die Projekt-Suite (`node node_modules/vitest/vitest.mjs run`) bleibt unberührt und prüft weiterhin
ausschließlich `src/**`. Kein `npx`/`npm run` — das npm-Startup kostet auf dieser Maschine ~3 s pro
Kommando (siehe AGENTS.md, Verifizierung).
