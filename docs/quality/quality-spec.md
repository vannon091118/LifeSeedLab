<!-- Ersetzt die frühere Sammel-Datei: Befunde A1–A19 und Specs B0–B38 liegen jetzt domänenweise in contracts/. -->
# LifeSeedLab — Qualitäts- & Spezifikations-Register

**Diese Datei ist ein REGISTER, keine Arbeitsliste.** Die Befunde (ehemals „Part A") und
Spezifikationen (ehemals „Part B") liegen domänenweise in `docs/quality/contracts/` — jede Domäne
hat dort **genau einen Owner-Contract** (Owner, Writer, Readers, Caps, Befunde, Spec, DoD an einer
Stelle). Die historischen IDs (A1…A19, B0…B38) sind **unverändert** und bleiben die stabile
Referenz aus Code, Tests und Commit-Historie.

Klassen der Befunde: `DEFECT` (kaputt/falsch) · `INCOMPLETE` (Vertrag existiert, Ausführung fehlt)
· `PLACEHOLDER` (Prototyp-Ersatz) · `WRONG` (architektonisch falsch → ausbauen) · `KEEP`.

## Domänen-Contracts

| Domäne | Contract | Owner (genau einer) |
|---|---|---|
| **Kern & Kontrakte** | [`contracts/core.md`](./contracts/core.md) | `src/core/*` (rng, hash, clock, ids) · `src/bus/*` · Content-Truth `src/config.ts` + `src/config/*.source.ts` |
| **Simulation** | [`contracts/simulation.md`](./contracts/simulation.md) | `simulation/*` — Gesamt-State `simulation/root.ts`, Systeme `plantSystem`, `enemySystem`, `projectileSystem`, `scoreSystem`, `comboSystem`, `waveSystem` |
| **Genom, Zucht-Mathematik & Phänotyp** | [`contracts/genome.md`](./contracts/genome.md) | `src/genome/*` (gacha, cross, pool, bases, beetle) · Allele `config/plants.source.ts` · Gen-Paare `config/genes.source.ts` |
| **Meta-Lebenszyklus — Run-Identität, Zucht-Queue, Ökonomie** | [`contracts/meta.md`](./contracts/meta.md) | `src/meta/*` — `store.ts` (Save-Schema + Heilung), `run.ts` (Run-/Zucht-Operationen), `economy.ts` (Reife-Gates, Shop-Logik) |
| **Persistenz** | [`contracts/persistence.md`](./contracts/persistence.md) | `src/persistence/storage.ts` — einziger I/O-Owner (localStorage/IDB) |
| **Visual, Beobachtung & Audio** | [`contracts/visual.md`](./contracts/visual.md) | `src/render/*` (renderer, camera, layers) · `src/visual/generator.ts` · `src/observers/*` (FX, particles, audio) |
| **Oberfläche — Router, Screens, Komponenten, i18n-Fläche** | [`contracts/ui.md`](./contracts/ui.md) | `src/App.tsx` (Router) + `src/components/*` + `src/i18n/*` |
| **Prozess — Tests, Gate, Doku-Disziplin** | [`contracts/process.md`](./contracts/process.md) | `tools/shinon/*` (Gate/Checker) · `tests/*` (E2E) · `scripts/*` (Lane) · `docs/**` (Doku-Disziplin) |

## Wo steht welche ID?

| ID | Contract | Thema |
|---|---|---|
| `A1` | [core.md](./contracts/core.md) | `src/types.ts` — WRONG (split) |
| `A3` | [core.md](./contracts/core.md) | `src/config.ts` — WRONG (duplicate source) |
| `A12` | [core.md](./contracts/core.md) | World source — KEEP + prune |
| `B29` | [core.md](./contracts/core.md) | Events ohne Konsumenten — entschieden, nicht vergessen (Befund: Event → Observer) |
| `B29.1` | [core.md](./contracts/core.md) | Befund |
| `B29.2` | [core.md](./contracts/core.md) | Die Entscheidungen (je Event eine, mit Begründung) |
| `B29.3` | [core.md](./contracts/core.md) | Spec |
| `B29.4` | [core.md](./contracts/core.md) | Gate-Tests |
| `B29.5` | [core.md](./contracts/core.md) | DoD für B29 |
| `A4` | [simulation.md](./contracts/simulation.md) | `src/simulation/root.ts` + systems — INCOMPLETE (effect pipeline), 4 DEFECTs |
| `B6` | [simulation.md](./contracts/simulation.md) | Effect chain (sim → visuals, first real pass) |
| `B38` | [simulation.md](./contracts/simulation.md) | Maze-Balance-Datensatz — PLANT_ROUTE_COST als Tuning-Basis (Messung 2026-09-18) |
| `A2` | [genome.md](./contracts/genome.md) | `src/genome.ts` — WRONG core, KEEP math |
| `A15` | [genome.md](./contracts/genome.md) | INCOMPLETE (verifiziert, gemessen) — Genom-Mutation: drei Achsen, ein falsches Nein |
| `B16` | [genome.md](./contracts/genome.md) | Route sichtbar machen & Genom-Modell schärfen (Auftrag aus A14/A15/A16) |
| `B16.2` | [genome.md](./contracts/genome.md) | Paarung entscheiden: Slot oder Gen (aus A15) |
| `B16.3` | [genome.md](./contracts/genome.md) | Allelmenge öffnen („unendlich viele Basen") |
| `B16.4` | [genome.md](./contracts/genome.md) | Zwei Stream-Verschmutzungen beheben (aus dem Review, verifiziert) |
| `B16.5` | [genome.md](./contracts/genome.md) | `generation` ist zwei Dinge |
| `B16.6` | [genome.md](./contracts/genome.md) | DoD für B16 |
| `B26` | [genome.md](./contracts/genome.md) | Gene als Paare — die Style-Ebene trägt Fähigkeits-Semantik (Befund: GAP-Zucht→Visual) |
| `B26.1` | [genome.md](./contracts/genome.md) | Befund |
| `B26.2` | [genome.md](./contracts/genome.md) | Spec |
| `B26.3` | [genome.md](./contracts/genome.md) | Gate-Tests (Konzept) |
| `B26.4` | [genome.md](./contracts/genome.md) | Prototyp-Umsetzung (dieser Sprint): ein Gen, drei Kanäle |
| `B26.5` | [genome.md](./contracts/genome.md) | DoD für B26 |
| `B30` | [genome.md](./contracts/genome.md) | Brut-Seed in eigener Domäne — Migrationsentscheidung statt Namensleihe (Befund: Source → Runtime) |
| `B30.1` | [genome.md](./contracts/genome.md) | Befund |
| `B30.2` | [genome.md](./contracts/genome.md) | Migrationsentscheidung |
| `B30.3` | [genome.md](./contracts/genome.md) | Spec |
| `B30.4` | [genome.md](./contracts/genome.md) | Gate-Tests |
| `B30.5` | [genome.md](./contracts/genome.md) | DoD für B30 |
| `A9` | [meta.md](./contracts/meta.md) | `src/App.tsx` — DEFECT (run identity) |
| `A13` | [meta.md](./contracts/meta.md) | Lifecycle-Identität, Snapshot-Grenzen & Doku-Verweise — DEFECT + INCOMPLETE (Nachtrag ebb4913) |
| `A13.1` | [meta.md](./contracts/meta.md) | DEFECT (verifiziert, kritisch) — `broodIndex` wird recycelt ⇒ doppelte Brut-Identitäten · **REPARIERT (B14.1–B14.3)** |
| `A13.2` | [meta.md](./contracts/meta.md) | DEFECT — zweite Ableitungsquelle für dieselbe Wahrheit · **REPARIERT (B14.1)** |
| `A13.3` | [meta.md](./contracts/meta.md) | INCONSISTENT — der Pflanzen-Pfad hat den Zähler schon · **REPARIERT (B14.1)** |
| `A13.4` | [meta.md](./contracts/meta.md) | DEFECT — order-abhängige First-Match-Zugriffe und ein invertiertes Gate · **REPARIERT (B14.4)** |
| `A13.6` | [meta.md](./contracts/meta.md) | INCOMPLETE — `keepCross` ist nicht atomar · **REPARIERT (B14.5)** |
| `A13.7` | [meta.md](./contracts/meta.md) | INCOMPLETE — drei Ableitungen von „ist die Brut reif" · **REPARIERT (B14.4)** |
| `A13.8` | [meta.md](./contracts/meta.md) | INCOMPLETE — `structuredClone` im 10-Hz-Hot-Path · **OFFEN (B14.7, Mid-Term: erst messen)** |
| `A13.11` | [meta.md](./contracts/meta.md) | Die systematische Frage — wo sonst leitet Code Identität aus einem Fenster ab? |
| `A13.12` | [meta.md](./contracts/meta.md) | DEFECT (verifiziert, kritisch) — die pflanzliche Zucht-Schleife ist unerreichbar |
| `A13.13` | [meta.md](./contracts/meta.md) | DEFECT (verifiziert) — `rollGachaCross` hängt von der Reihenfolge der Besitzliste ab |
| `A18` | [meta.md](./contracts/meta.md) | DEFECT-Klasse (verifiziert) — fail-open-Geschwister des B14-Fehlers |
| `A18.1` | [meta.md](./contracts/meta.md) | DEFECT (behoben) — `claimBrood` war fail-open |
| `A18.2` | [meta.md](./contracts/meta.md) | DEFECT (behoben) — `keepCross` war über den optionalen Index umgehbar |
| `A18.3` | [meta.md](./contracts/meta.md) | DEFECT (behoben) — Kappung hinterließ hängende Referenzen |
| `A18.6` | [meta.md](./contracts/meta.md) | DEFECT (behoben) — das Reife-Kriterium existierte zweimal |
| `A18.7` | [meta.md](./contracts/meta.md) | WIDERLEGT — zwei Review-Behauptungen, die der Code nicht trägt |
| `A19` | [meta.md](./contracts/meta.md) | DEFECT (verifiziert an Code **und** Live-Save) — die Meta-Wahrheit lag im React-State, nicht in der Persistenz |
| `B1` | [meta.md](./contracts/meta.md) | Run identity & loadout (repair: App.tsx, meta, root.ts) |
| `B14` | [meta.md](./contracts/meta.md) | Lifecycle-Identität, Snapshot-Budget & Reife-Gates (Auftrag aus A13) |
| `B14.1` | [meta.md](./contracts/meta.md) | Monotoner Brut-Zähler statt Fenster-Maximum |
| `B14.2` | [meta.md](./contracts/meta.md) | Migration v4 → v5 (kein Identitätsverlust, keine Doppelkennung) |
| `B14.3` | [meta.md](./contracts/meta.md) | Identitäts-Gate (Regressionstest) |
| `B14.4` | [meta.md](./contracts/meta.md) | Ein Reife-Gate, fail-closed |
| `B14.5` | [meta.md](./contracts/meta.md) | Symmetrische Atomarität für `keepCross` |
| `B14.6` | [meta.md](./contracts/meta.md) | Inhalts-Integrität statt Darstellungs-Integrität |
| `B14.7` | [meta.md](./contracts/meta.md) | Snapshot-Budget |
| `B14.8` | [meta.md](./contracts/meta.md) | DoD für B14 — **erfüllt (B14.1–B14.6)** |
| `B15` | [meta.md](./contracts/meta.md) | Zucht-Schleife erreichbar machen (Auftrag aus A13.12/A13.13) — **UMGESETZT (2026-09-15)** |
| `B15.1` | [meta.md](./contracts/meta.md) | Beanspruchung aus der Reifungs-Queue |
| `B15.2` | [meta.md](./contracts/meta.md) | Reifung an Wellen koppeln, nicht an den Run-Tod |
| `B15.3` | [meta.md](./contracts/meta.md) | Ehrliche Anzeige |
| `B15.4` | [meta.md](./contracts/meta.md) | Reihenfolge-Unabhängigkeit des Wurfs (A13.13) |
| `B15.5` | [meta.md](./contracts/meta.md) | DoD für B15 — **erfüllt (2026-09-15)** |
| `B16.8` | [meta.md](./contracts/meta.md) | Kappungs-Politik — **ENTSCHIEDEN (2026-09-15): Identität ist unverletzlich** |
| `B17` | [meta.md](./contracts/meta.md) | Persistenz-Wahrheit & Bestandskreislauf (Auftrag aus A19) |
| `B17.1` | [meta.md](./contracts/meta.md) | Eine Wahrheit: persistiert wird nie eine Kopie — **UMGESETZT (2026-09-15)** |
| `B17.2` | [meta.md](./contracts/meta.md) | Kein Eintrag darf in der Zukunft begonnen haben — **UMGESETZT (2026-09-15)** |
| `B17.3` | [meta.md](./contracts/meta.md) | Bestandsquelle entscheiden — **UMGESETZT (2026-09-15, Option A)** |
| `B17.4` | [meta.md](./contracts/meta.md) | Fortschrittsregel der Reifung entscheiden — **UMGESETZT (2026-09-15, Option A)** |
| `B17.5` | [meta.md](./contracts/meta.md) | DoD für B17 |
| `A8` | [persistence.md](./contracts/persistence.md) | `src/persistence/*` — INCOMPLETE |
| `A13.5` | [persistence.md](./contracts/persistence.md) | DEFECT — Checksumme an die JSON-Property-Reihenfolge gekoppelt · **REPARIERT (B14.6)** |
| `A18.4` | [persistence.md](./contracts/persistence.md) | DEFECT (behoben) — Persistenz: Downgrade überschrieb still das neuere Save |
| `B2` | [persistence.md](./contracts/persistence.md) | Persistence contract (new `persistence/storage.ts` ≤ 250 LOC) |
| `A6` | [visual.md](./contracts/visual.md) | `src/render/renderer.ts` — PLACEHOLDER ART + 3 DEFECTs |
| `A7` | [visual.md](./contracts/visual.md) | `src/observers/*` — INCOMPLETE |
| `A14` | [visual.md](./contracts/visual.md) | DEFECT (verifiziert) — die berechnete Route wird nie gezeichnet |
| `B0` | [visual.md](./contracts/visual.md) | Art direction contract (binding) |
| `B4` | [visual.md](./contracts/visual.md) | Plant visual identity from genome (renderer + generator) |
| `B5` | [visual.md](./contracts/visual.md) | Event → FX execution matrix (visualObserver + FeedbackLayer + manga) |
| `B5.1` | [visual.md](./contracts/visual.md) | Reward flight |
| `B8` | [visual.md](./contracts/visual.md) | Audio (new `observers/audioObserver.ts` ≤ 250 LOC) |
| `B10` | [visual.md](./contracts/visual.md) | World & entity render specification (renderer rewrite) |
| `B11` | [visual.md](./contracts/visual.md) | Wave dramaturgy timeline (per wave, driven by events only) |
| `B12` | [visual.md](./contracts/visual.md) | Mobile performance pass (acceptance) |
| `B16.1` | [visual.md](./contracts/visual.md) | Die aktive Route muss gezeichnet werden (aus A14) — **UMGESETZT (2026-09-16)** |
| `A5` | [ui.md](./contracts/ui.md) | `src/components/GameView.tsx` — WRONG presentation concerns + INCOMPLETE UX |
| `A10` | [ui.md](./contracts/ui.md) | UI screens — PLACEHOLDER (points 11–14, 26–29 of the critique) |
| `A17` | [ui.md](./contracts/ui.md) | DEFECT (verifiziert, in der Release-Fläche sichtbar) — der Codex-Screen ist halb übersetzt |
| `B3` | [ui.md](./contracts/ui.md) | Placement UX (pointer events, GameView extract `PlacementController`) |
| `B7` | [ui.md](./contracts/ui.md) | Screen specifications |
| `B9` | [ui.md](./contracts/ui.md) | UI kit + icons (SVG, single `ui/icons.tsx`) |
| `B16.7` | [ui.md](./contracts/ui.md) | Sprache der Release-Fläche (aus A17) |
| `B18` | [ui.md](./contracts/ui.md) | Loadout bedienbar machen — die Zucht muss im Run ankommen (Auftrag aus A19.6) |
| `B18.1` | [ui.md](./contracts/ui.md) | Sammlung und Loadout trennen |
| `B18.2` | [ui.md](./contracts/ui.md) | Der Run zeigt den Unterschied |
| `B18.3` | [ui.md](./contracts/ui.md) | Gates |
| `B18.4` | [ui.md](./contracts/ui.md) | DoD für B18 |
| `B21` | [ui.md](./contracts/ui.md) | Onboarding „Krix" — animiertes Dialog-System (Auftrag: Tutorial/Onboarding) |
| `B21.1` | [ui.md](./contracts/ui.md) | Befund |
| `B21.2` | [ui.md](./contracts/ui.md) | Spec |
| `B21.3` | [ui.md](./contracts/ui.md) | Schrittfolge (eine Quelle: `script.ts`) |
| `B21.4` | [ui.md](./contracts/ui.md) | DoD für B21 |
| `B21.5` | [ui.md](./contracts/ui.md) | Nachtrag — E2E-Beweis zurückgebaut |
| `B21.6` | [ui.md](./contracts/ui.md) | Nachtrag — die Tour begann zu spät (Befund: Erstspieler-Test) |
| `B22` | [ui.md](./contracts/ui.md) | Leere Tray beim Betreten des Runs (Befund: Erstspieler-Test) |
| `B22.1` | [ui.md](./contracts/ui.md) | Befund |
| `B22.2` | [ui.md](./contracts/ui.md) | Spec |
| `B22.3` | [ui.md](./contracts/ui.md) | DoD für B22 |
| `B23` | [ui.md](./contracts/ui.md) | Aufbauphase, phasenrichtiger Wellen-Knopf, sichtbare Ablehnung (Befund: zwei Spielerberichte) |
| `B23.1` | [ui.md](./contracts/ui.md) | Befund |
| `B23.2` | [ui.md](./contracts/ui.md) | Spec |
| `B23.3` | [ui.md](./contracts/ui.md) | DoD für B23 |
| `B25` | [ui.md](./contracts/ui.md) | Spielerbericht-Runde 2 — Verwelken, Zähler, Sprachmix (Befund: zwei Spielerberichte) |
| `B25.1` | [ui.md](./contracts/ui.md) | Befund |
| `B25.2` | [ui.md](./contracts/ui.md) | Spec |
| `B25.3` | [ui.md](./contracts/ui.md) | DoD für B25 |
| `B31` | [ui.md](./contracts/ui.md) | Signatur sichtbar, Easter Egg am Blattrand (Befund: Autorität ohne Namen) |
| `B31.1` | [ui.md](./contracts/ui.md) | Befund |
| `B31.2` | [ui.md](./contracts/ui.md) | Umsetzung |
| `B31.3` | [ui.md](./contracts/ui.md) | Gate-Tests |
| `B31.4` | [ui.md](./contracts/ui.md) | DoD für B31 |
| `A11` | [process.md](./contracts/process.md) | Tests — gaps (extend suite) |
| `A13.9` | [process.md](./contracts/process.md) | DEFECT — Doku-Querverweise nach dem Kebab-Case-Umzug verwaist · **REPARIERT** |
| `A13.10` | [process.md](./contracts/process.md) | REPARIERT (dieser Arbeitsgang) — Verweise + Doku-Stand |
| `A13.14` | [process.md](./contracts/process.md) | WIEDERHOLUNG derselben Defekt-Klasse — Doku-Dopplung + tote Karten-Referenzen (Root Cause + Reparatur) |
| `A16` | [process.md](./contracts/process.md) | DEFECT (verifiziert, behoben) — Encoding-Fossil: Mojibake als literale Zeichen |
| `A18.5` | [process.md](./contracts/process.md) | INCOMPLETE — E2E-Geometrie ist gespiegelt, nicht geteilt |
| `B13` | [process.md](./contracts/process.md) | Definition of Done for this work order |
| `B16.9` | [process.md](./contracts/process.md) | E2E liest die Geometrie vom Renderer (aus A18.5) |
| `B24` | [process.md](./contracts/process.md) | E2E-Harness — eine Quelle statt vierfacher Redundanz |
| `B24.1` | [process.md](./contracts/process.md) | Befund |
| `B24.2` | [process.md](./contracts/process.md) | Spec |
| `B24.3` | [process.md](./contracts/process.md) | DoD für B24 |
| `B32` | [process.md](./contracts/process.md) | Test-Suite-Konsolidierung — Baseline, Testkit und Abdeckungswache (Plan: `plan/refactor-test-suite-consolidation-1.md`) |
| `B32.1` | [process.md](./contracts/process.md) | Befund |
| `B32.2` | [process.md](./contracts/process.md) | Spec |
| `B32.3` | [process.md](./contracts/process.md) | DoD für B32 |
| `B32.4` | [process.md](./contracts/process.md) | It-Ledger & Mutation-Stichproben-Protokoll (abschließend) |

## Regeln für dieses Register

1. **Eine Wahrheit je Thema.** Ein neuer Befund oder eine neue Spezifikation wird **im Contract
   seiner Domäne** geführt — nicht hier. Das Register wächst nicht mit Inhalt, nur mit Domänen.
2. **IDs sind stabil.** A-/B-Nummern werden nie neu vergeben und nie umgedeutet; sie zeigen über
   diese Tabelle auf ihren Contract. Ausnahme mit Begründung: das doppelt vergebene `A13.12`
   (Doku-Dopplung **und** Zucht-Schleife) wurde entdoppelt — die Doku-Dopplung heißt seither
   `A13.14`; die Zucht-Schleife behält `A13.12` (sie trägt die Referenzen in Code und Tests).
   Beide Verwendungen sind unten sichtbar, damit alte Notizen nicht ins Leere laufen.
3. **Domänen-Zuschnitt = Ownership-Karte** (`AGENTS.md`). Wer eine neue Domäne braucht, ändert
   zuerst die Ownership-Karte — nicht stillschweigend dieses Register.
4. **DoD gehört zum Contract.** Abgehakte Arbeit bleibt lesbar (Historie der Entscheidung), offene
   Punkte stehen als `[ ]` im Contract ihrer Domäne.
5. **Doku-Referenzen gegen den Track**, nicht gegen den Worktree (`git ls-files`) — ein Move ist
   erst fertig, wenn alle Referenzen mitgezogen sind (A13.9/A13.14).
6. **Relative Links immer mit Präfix** (`./contracts/x.md`, `../y.md`). Ein Link ohne Präfix
   (`contracts/x.md`) wird vom Doku-Check **gegen die Repo-Wurzel** aufgelöst, Markdown-Renderer
   lösen ihn dagegen gegen dieses Dokument auf — zwei Auslegungen desselben Satzes. Das Präfix
   macht die eine Wahrheit explizit.
7. **Die ID-Tabelle ist generiert, nicht getippt.** `node scripts/quality-register.mjs` schreibt
   sie aus den Überschriften der Contracts; `--check` vergleicht nur (Exit 1 bei Abweichung) und
   läuft in CI. Geprüft wird dabei: jede ID existiert in **genau einem** Contract (Duplikat ⇒
   Abbruch), jede Contract-ID steht in der Tabelle (keine Waise), jeder Contract auf der Platte
   steht in der Domänen-Tabelle (kein vergessener Contract), keine Zelle enthält ein rohes `|`.
   Die Anwendungsreihenfolge liest das Skript aus der Domänen-Tabelle **dieses** Dokuments — es
   hält keine eigene Liste. Grund für die Automatisierung: von Hand gepflegt driftet die Tabelle,
   und sie enthielt bereits Zeilen, die aus gekürzter Anzeige mitten im Wort abgeschnitten waren
   (`B23`, `A13.14`, `B32`).

## Offener Befund in diesem Register (ehrlich benannt)

Der Split löst **Doku-Drift**, nicht Gameplay. Die Contracts behaupten nichts Neues: jeder Satz ist
aus dem bisherigen Dokument übernommen, lediglich sortiert. Wo in einem Contract von einer anderen
Domäne die Rede ist (z. B. B16 über Route/Genom/UI), steht die Querverweis-Domäne im Kopf des
Befunds — die Verantwortung bleibt beim jeweiligen Owner.
