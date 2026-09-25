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
  → ShinonStarter  liest den realen Projektstatus und aktualisiert die README
  → Staging         `finish --all` committet erst danach den vollständigen Zielzustand (`git add -A`)
  → ShinonGate      prüft den tatsächlichen Index (Pre-Commit) und entscheidet (offen / geschlossen)
  → ShinonCommitKomponist  liest commit_msg.txt und führt `git commit -F -` mit genau diesem Inhalt aus
  → ShinonPushExecutor     prüft Vorbedingungen und Authentifizierung, pusht den Branch
```

Reihenfolge ist bindend: **erst stagen, dann das Gate auf den tatsächlichen Index anwenden; ohne grünes Gate kein Commit, ohne Commit kein Push.** `--dry-run` ist für `prepare`, `gate`, `commit`, `push` und `finish` read-only und verändert weder README noch State; die schreibenden Befehle `init`, `install-hooks` und `enforce <modus>` lehnen den Probelauf fail-closed ab.

## Module

| Modul | Verantwortung |
|---|---|
| `tools/shinon/hook-entry.mjs` | Einziger ausführbarer Einstieg (lokal registrierter TypeScript-Loader; alle Stufen, `--json`, `--quiet`, `--dry-run`) |
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
node tools/shinon/hook-entry.mjs status         # nur lesen: Branch, HEAD, Arbeitsbaum, LOC-Hotspots
node tools/shinon/hook-entry.mjs prepare        # Status + README aktualisieren + Gate (preflight)
node tools/shinon/hook-entry.mjs gate           # nur prüfen (--phase=pre-commit, --only=<ids>, --json)
node tools/shinon/hook-entry.mjs commit         # Komponist: commit_msg.txt → git commit -F -
node tools/shinon/hook-entry.mjs push           # Push-Executor (--dry-run read-only)
node tools/shinon/hook-entry.mjs finish --all   # kompletter Ablauf inkl. Staging und Push
node tools/shinon/hook-entry.mjs init --slug=owner/repo   # Einrichtung, ohne Push
node tools/shinon/hook-entry.mjs install-hooks  # Hooks schreiben, core.hooksPath setzen
node tools/shinon/hook-entry.mjs enforce        # Enforcement-Modus anzeigen / setzen (advisory|strict)
```

## Hooks

`core.hooksPath` zeigt auf `tools/hooks`. Die Hooks entscheiden nichts selbst, sie rufen den CLI
auf:

| Hook | Wirkung |
|---|---|
| `pre-commit` | Gate-Stufe (Nachricht, Modulgrenzen, Constraints, Typecheck, Tests) |
| `commit-msg` | dieselbe Nachrichtenregel, die der Komponist anwendet |
| `post-commit` | Push-Stufe für normale Git-Commits — automatisch, abschaltbar über `push.autoAfterCommit`; `finish` unterdrückt den Hook, damit die Pipeline genau einmal pusht |

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
node tools/shinon/hook-entry.mjs enforce            # aktuellen Modus + Quelle anzeigen
node tools/shinon/hook-entry.mjs enforce strict     # Enforcement aktivieren (schreibt shinon.config.json)
node tools/shinon/hook-entry.mjs enforce advisory   # zurück auf advisory
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
node scripts/test-lane.mjs                  # Commit-Lane: berührte Projekt- und Tooling-Tests (Ziel ≤ 10 s)
node scripts/test-lane.mjs --full           # Sprintende: komplette Suite
```

`quality-register.mjs` hält `docs/quality/quality-spec.md` mit den Contracts deckungsgleich: es
liest die Domänen-Reihenfolge aus der Domänen-Tabelle des Registers (keine eigene Liste), die
ID→Contract-Zuordnung aus den Überschriften der Contracts, und bricht ab bei doppelter ID, Waise,
vergessenem Contract oder rohem `|` in einer Zelle. Die Prüfung gehört in CI, weil ein Register,
das nur auf dieser Maschine stimmt, für einen frischen Klon keine Aussage hat.

## Mutations-Drill (Red-Team der Suite)

```bash
node tools/shinon/mutate.ts                                     # ganze Registry
node tools/shinon/mutate.ts --klasse vererbung,gacha            # eine Domäne
node tools/shinon/mutate.ts --id N1-dominanz-gewicht-im-kraft-index,N3-typ-vererbung-verschoben
```

Der Drill bringt eine chirurgische Falschheit in eine Wahrheit ein und misst, welche Tests sie
fangen — „600+ grün" ist erst ein Beweis, wenn die Suite beißt. Klassen: `logik`, `oekonomie`,
`spawn`, `persistenz`, `vererbung`, `phaenotyp`, `gacha`, `werte` (18 Mutationen).

**Struktur — ein Einstieg, drei Zuständigkeiten:** `tools/shinon/mutate.ts` ist nur der Ablauf
(auswählen → Sandkasten → Baseline → je Mutation anwenden/laufen/zurücknehmen) samt CLI und
Exit-Codes; daneben liegen `drill/registry.ts` (**was** mutiert wird: Daten, Registry-Selbstcheck,
fail-closed-Auswahl), `drill/worktree.ts` (**wo** es läuft: isolierter Worktree, Spiegelung,
Verknüpfung, Anwenden/Zurücknehmen/Abbau) und `drill/verdict.ts` (**wie** gelesen wird:
Vitest-Ausgabe, Baseline-Wache, Verdikt). `verdict.ts` ist reine Textarbeit ohne Prozess und ohne
Datei — genau deshalb liegt die Verdikt-Leiter dort und nicht im Ablauf, und genau deshalb ist
sie ohne Worktree testbar. Datenfluss: `mutate.ts` liest Registry und Worktree, reicht die
Ausgabe an `verdict.ts` und schreibt nichts zurück, was nicht über `git checkout` heilbar wäre.

**Bilanz je Mutation:** `GEFANGEN` (mit den Wächter-Tests namentlich) · `UEBERLEBT` (blinder
Fleck: kein Test reagiert) · `FEHLGESCHLAGEN` (Ersetzung griff nicht — fail-closed). Exit 1,
sobald etwas überlebt.

**Roter Ausgangsstand = NICHT BEWERTBAR (Exit 2).** Ist schon VOR der ersten Mutation ein Test
rot (typisch: uncommitteter Regel-0-Zwischenstand einer Parallelsession), bricht der Drill ab und
nennt die betroffenen Tests. Grund: „kein Test reagiert“ wäre dann nicht von „lag schon vorher
rot“ zu trennen — in der Genom-Runde tarnte genau das vier ungedeckte Hebel (N1/N2/N4/N5) als
Rauschen. Bei grüner Baseline heißt `UEBERLEBT` dagegen beweisbar: kein Test reagiert.

**Isolation (P-26):** je Lauf ein eigener Worktree; der Arbeitsstand wird gespiegelt
(uncommittete Diffs per `git apply`, untracked UND ignorierte Tooling-Dateien unter `scripts/`
und `tools/` kopiert — sonst startet `test-lane` im Worktree in einen `MODULE_NOT_FOUND`).
Der Hauptbaum wird nur lesend angefasst; die Mutation wird per `git checkout` zurückgenommen.

**Fünf Befunde, die das Werkzeug selbst betrafen** (Genom-Runde 21.09.2026):
1. Ein Lauf, der **nur** die vorher schon roten Tests zeigt, ist kein Flake, sondern
   `UEBERLEBT` — als „FLAKY" getarnt sah ein blinder Fleck wie Rauschen aus (N1/N2/N4/N5).
2. Frische Worktrees checken unter `core.autocrlf` mit **CRLF** aus: mehrzeilige Anker griffen
   nicht, obwohl der Selbstcheck (normalisiert) grün war — jetzt lesen Prüfung und Ersetzung
   dieselbe normalisierte Wahrheit.
3. Die `node_modules`-Verknüpfung wird **nur als Link** gelöst, bevor der Worktree fällt: ein
   rekursives `rm -rf` folgt der Junction und würde das echte `node_modules` löschen.
4. Auswahl (`--klasse`/`--id`) ist fail-closed: unbekannter Name oder leere Auswahl bricht ab,
   statt eine makellose „0/0"-Bilanz zu melden.
5. Eine **rote Baseline** war ein stiller Filter: Mutationen wirkten dann wie „unauffällig".
   Jetzt ist sie ein benannter, nicht bewertbarer Ausnahmezustand (Exit 2, siehe oben).

## Tests des Toolings

```bash
node node_modules/typescript/bin/tsc -p tools/tsconfig.json     # Typecheck des Toolings
node node_modules/vitest/vitest.mjs run --config tools/vitest.config.ts   # Gate, Enforcement, Komponist, Starter
```

Die Projekt-Suite (`node node_modules/vitest/vitest.mjs run`) bleibt unberührt und prüft weiterhin
ausschließlich `src/**`; die getrennte Tooling-Suite läuft mit `tools/vitest.config.ts`. Die Commit-Lane
wählt für Projekt- und Tooling-Änderungen automatisch die passende Konfiguration. Kein `npx`/`npm run` —
das npm-Startup kostet auf dieser Maschine ~3 s pro Kommando (siehe AGENTS.md, Verifizierung).
