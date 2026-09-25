# Contract: Prozess — Tests, Gate, Doku-Disziplin

**Owner (genau einer):** `tools/shinon/*` (Gate/Checker) · `tests/*` (E2E) · `scripts/*` (Lane) · `docs/**` (Doku-Disziplin)
**Writer:** Gate-Config `tools/shinon/config.ts`; Test-Lane `scripts/test-lane.mjs`; Doku-Wahrheit je Thema genau eine Datei
**Readers:** jeder Commit (Voraussetzung)
**LOC-Caps:** nach Zielort (Tests: 400 bzw. 300 unter `src/simulation/`; Tooling: 400)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Enthält die Doku-Referenz-Regel (gegen `git ls-files`, nicht gegen den Worktree) und das It-Ledger als gepinnte Test-Bilanz.

---

## A11. Tests — gaps (extend suite)

Missing gates: combo×score integration; effect-profile cross-reference gate (`EFFECTS_SOURCE.particleProfile/impactProfile/soundProfile` keys must exist); resume-shape contract (enemies/projectiles stripped); breeding determinism across `breedGeneration` persistence; meta migration v1→v2; day/night event emission. KEEP all 52 existing tests.

### A13.9 DEFECT — Doku-Querverweise nach dem Kebab-Case-Umzug verwaist · **REPARIERT**

Commit `6585a3d` hat die Dokumente nach `docs/{architecture,quality,setup}/` verschoben und auf kebab-case umbenannt, aber **keinen** der Verweise mitgezogen: 32 tote Links in 7 Dateien (`ARCHITECTURE_CONTRACT.md`, `ARCHITECTURE.md`, „docs/QUALITY_SPEC.md“). Zusätzlich verweisen `ROADMAP.md` auf „docs/quality/changelog.md“ und `CLAUDE.md` sowie B0.9 auf den Styleframe (docs/art, gitignored) — alle liegen in `.gitignore` und existieren für einen frischen Klon nicht. In diesem Arbeitsgang korrigiert (siehe A13.10).

### A13.10 REPARIERT (dieser Arbeitsgang) — Verweise + Doku-Stand

Tote Querverweise in `AGENTS.md`, `README.md`, `docs/architecture/architecture.md`, `docs/quality/{implementation-plan,lifegameplant-audit}.md`, `docs/setup/presentation.md` auf die neuen Pfade gezogen; Test-Badge (52 → 152) und Gate-Liste (🔄 → ✅) auf den echten Stand gehoben; `AGENTS.md`-Titel aus der vorhergehenden Absatzzeile gelöst (`werden.s# AGENTS.md` — H1 war nicht gerendert). Nicht repariert und bewusst offen: der Verweis auf das ignorierte Styleframe (A13.9, Entscheidung über Track-Zugehörigkeit nötig).

### A13.14 WIEDERHOLUNG derselben Defekt-Klasse — Doku-Dopplung + tote Karten-Referenzen (Root Cause + Reparatur)

**Befund (Struktur-Linse + Nachzählung):** (1) „docs/quality/changelog.md“ existierte als **Zwilling** des echten `CHANGELOG.md` — ein alter Milestone-Plan (Woche 38–41, englisch), dessen Wahrheit längst in `docs/process/ROADMAP.md` §4 und der Change-Pflicht (Regel 0) lebt. (2) Vier Dateien verwiesen auf `ROADMAP.md` **im Root** — dort liegt seit dem Doku-Move keine Datei mehr (nur `docs/process/ROADMAP.md` im Track): README ×2, AGENTS.md-Ressourcenkarte, architecture.md, presentation.md. Die Struktur-Linse meldete „alle 100 Referenzen existieren“ — **falsch beruhigend**: Sie prüft den Worktree, nicht den Track; gitignorierte Datei-Reste machen tote Referenzen unsichtbar.

**Root Cause (wie es dazu kommen konnte, zweimal):** Die Defekt-Klasse aus A13.10 („Datei verschoben, Referenz nicht mitgezogen“) wurde nicht als **Regel** gefixt, sondern nur als Einzelfall. Dazu zwei Verstärker: (a) Die alte Plan-Doku („docs/quality/changelog.md“) blieb bei Umbenennung/Ablösung liegen, statt gelöscht zu werden — Parallelwahrheit nach Regel 2, nur in Doku. (b) Keine Prüfung gegen **git-tracked** statt Platten-Bestand — die Linse glaubte dem Worktree.

**Reparatur (dieser Arbeitsgang):** Zwilling gelöscht („docs/quality/changelog.md“); ROADMAP-Karte bereinigt (Versionshistorie-Wahrheit: Root-`CHANGELOG.md`, getrackt; „Root-Files im Track“ korrigiert); die vier Root-ROADMAP-Referenzen auf `docs/process/ROADMAP.md` gezogen.

**Regel (verhindert die Klasse, nicht den Einzelfall):** (1) Jede Doku-Wahrheit hat genau einen Ort — ein Thema, eine Datei; Ablösung heißt **löschen**, nicht liegen lassen. (2) Doku-Referenzen prüfen gegen `git ls-files`, nie gegen den Worktree („Existiert auf der Platte“ ≠ „Existiert für einen frischen Klon“). (3) Bei jedem Doku-Move/Rename gilt dieselbe Disziplin wie bei Code: Der Move ist erst fertig, wenn alle Referenzen mitgezogen sind — Referenz-Prüfung gehört zum DoD des Moves.

### A16. DEFECT (verifiziert, behoben) — Encoding-Fossil: Mojibake als literale Zeichen

`src/components/Codex.tsx` enthielt `ðŸ§¬`, `âœ"`, `â€"`, `lÃ¤dt`. Das war **kein Laufzeit-Artefakt**: Die Zeichen standen wörtlich doppelkodiert in der Datei (UTF-8, einmal als Windows-1252 gelesen und wieder als UTF-8 gespeichert — das Muster eines Shell-Schreibvorgangs ohne UTF-8-Encoding). Repo-weites `git grep` nach den Mojibake-Sequenzen: betroffen war **genau diese eine** Datei.

Warum es überlebte: Die Verifikation prüfte Zeilenenden („CRLF durchgehend erhalten") — aber nie die Kodierung. Ein intaktes Zeilenende über einem zerstörten Zeichen sieht in jedem Diff unauffällig aus.

Behoben: byte-genaue Rückkodierung CP1252 → UTF-8, BOM und CRLF erhalten, 0 × U+FFFD, Umlaute/Emoji/✕/— verifiziert, `tsc` clean. Prävention: Gate `src/encoding.test.ts` (verbietet U+FFFD und die Mojibake-Sequenzen in allen `src/**/*.ts(x)`) + `.editorconfig` (`charset = utf-8`).

### A18.5 INCOMPLETE — E2E-Geometrie ist gespiegelt, nicht geteilt

`tests/run.spec.ts` rechnet Zellmitten mit hartcodierten `GRID/PAD/+8` nach; der Kommentar sagt ehrlich, dass der Test bei Renderer-Drift nichts mehr findet, ohne dass jemand weiß warum. Fix (B16-Auftrag): `Renderer.metrics()` ans DevGate hängen (`CELL/OX/OY` als Werte), dann liest der Test die Wahrheit statt einer Kopie. Die `waitForTimeout`-Sleeps sind bekannte Flaky-Kandidaten, solange die Suite lokal grün läuft.

### T9-Status (24.09.2026) — Route und E2E-Last abgeschlossen, Snapshot-Messung offen

P-23 ist durch `MapSystem.routeExists()` als O(V+E)-BFS umgesetzt, während der sichtbare Laufweg den Dijkstra behält. P-33 wird im FeedbackLayer nicht mehr still verworfen: ein Überlauf erzeugt eine Ankunft am Zähler. P-35 hat mit `tests/e2eLock.ts`, `e2eLock.test.ts` und `PW_SINGLE_RUN=1` eine klare Abbruch-Vorbedingung statt flakiger Timeout-Raten. B14.7 bleibt als offener Messauftrag: Die aktuelle Bibliotheks-/Save-Größe und der 10-Hz-Snapshot-Druck müssen noch mit einem reproduzierbaren Profil belegt werden, bevor die T9-DoD als vollständig behauptet werden darf.

## B13. Definition of Done for this work order

- [ ] Legacy symbols (`GameState`/`Tower`/`Enemy`/`Projectile`/`Worker*`) deleted; `types.ts` = meta/breeding only
- [ ] `genome.ts` on core/rng; `breedGeneration` persisted; single `createBaseVariants`
- [ ] DevGate hides all dev UI in release; HUD shows 5 elements max
- [ ] All 7 visual commands + reward flight executed; damage numbers visible
- [ ] Camera shake actually rendered
- [ ] Genome→visual: bred plants visually distinct (test-locked determinism)
- [ ] Crit chain: roll → event → observer → manga + audio
- [ ] Effect chain: slow/burn/poison/chain live in sim; profiles referenced by sources all exist (gate test)
- [ ] Resume contract implemented + test-locked (enemies/projectiles stripped, prep restart)
- [ ] Pause on hidden; resume overlay; `recordRunEnd` exactly once
- [ ] Run identity: single `runId` authority (meta-runId ↔ RootInit)
- [ ] Breeding ceremony replaces selects; thumbnails everywhere; no emoji final art
- [ ] Audio observer live (unlock on gesture, FX OFF silences)
- [ ] Title scene animated; menu illustrated; 390×844 verified
- [ ] New tests: B6 chain, combo×score, profile cross-ref gate, resume shape, breeding determinism, meta migration — suite ≥ 70 green
- [ ] LOC caps respected (renderer split into `render/layers/*` when > 400)

### B16.9 E2E liest die Geometrie vom Renderer (aus A18.5)

`Renderer.metrics()` wird über das DevGate als Werte exportiert (`CELL/OX/OY`); `tests/run.spec.ts` liest sie, statt `GRID/PAD/+8` zu spiegeln. Danach überlebt ein Renderer-Refactor die Tests ohne stillen Tot.

---

## B24. E2E-Harness — eine Quelle statt vierfacher Redundanz

### B24.1 Befund

`tests/progression.spec.ts` (483 Zeilen) und die übrigen Specs duplizierten dasselbe Werkzeug
vier- bis fünffach: `startRun` in vier Dateien, `devValue` dreifach, `freeCells` zweifach, die
`__simRootRef`-Bindungsprüfung dreifach inline, die Game-Over-Pump-Schleife fünfmal kopiert, der
Menü-Boot zweifach. Ein Fix an einer Brücke (`?dev=1`, Selektoren, Geometrie) musste an allen
Stellen gleichzeitig landen — eine vergessene Stelle prüfte still eine andere App.

### B24.2 Spec

1. **`tests/helpers/harness.ts`** ist die einzige Quelle für alle gemeinsamen E2E-Werkzeuge:
   `startRun` (DevGate `?dev=1`), `bootToMenu`, `ffUntil`, `pumpWave`, `freeCells`,
   Sim-Bindungsprüfung, Game-Over-Warten.
2. Specs enthalten **nur noch Tests und ihre Kommentare** — kein Werkzeug, kein Selektor, keine
   Geometrie.
3. Progression läuft auf demselben Pfad wie die anderen Specs; die Zucht-Tests booten bewusst
   nur ins Menü (`bootMenu`), ohne Run.

### B24.3 DoD für B24

- [x] `rg "async function startRun" tests/` findet genau eine Definition (im Harness)
- [x] Playwright erkennt dieselbe Testanzahl wie vorher (27)
- [x] Suite grün; Progression-Laufzeit von ~5 min auf ~31 s gesenkt (kein reales Wellen-Warten mehr)
- [x] Die Sim-Bindungsprüfung ist eine normale async Assertion-Funktion (`expectSimBound`) und
      nicht die nicht existente Playwright-API `expect.simBound`; der separate TypeScript-Lauf
      der neuen Specs bleibt fehlerfrei.

### B24.4 Build-Warnungen sind blockierend (24.09.2026)

`vite.config.ts` behandelt jede Vite-Warnung im Build als Fehler. Die Produktionsgrenze wird
zusätzlich durch echte Screen-Chunks statt wirkungsloser Dynamic-Import-Grenzen eingehalten:
`App.tsx` lädt Run und Nebenscreens lazy, während innerhalb eines Screens benötigte Writer
statisch bleiben. Ein Build mit `(!)`-Ausgabe ist damit kein gültiger Abschluss; der
Regressionstest `tests/buildWarningGate.test.ts` prüft Build-Block und unberührten Dev-Server.

Für den Produktloop ist ein eigener Single-Run-Modus definiert: `PW_SINGLE_RUN=1` erzwingt
`workers=1`, `retries=0`, `trace: 'on'` und `test-results/single-run/`. Das ist die einzige
zulässige E2E-Ausführung des nächsten Sprints; nach Rot wird der Trace ausgewertet, nicht
ungeplant wiederholt.

### B24.5 Visuelle Belege — die dritte Stufe des Sprint-Abschlusses (21.09.2026)

`tests/helpers/canvasProbe.ts` ist das Instrument für „Silence is not feedback": Frame-Freeze,
Farb-Centroid, Regionen-Vergleich (Details und Messwerte in `contracts/visual.md` B5.2,
Spec: `tests/visual_probe.spec.ts`). Regeln, die daraus für jeden weiteren Beleg gelten:

1. **Eine visuelle Behauptung ist eine Pixelaussage.** Handler-Aufruf, Event und Kommando sind kein
   Beleg; erst eine Messung im gezeichneten Bild ist einer.
2. **Keine Messung ohne Gegenprobe.** Jeder Moment prüft eine Negativ-Kontrolle (ohne Ursprung kein
   Flug, vor dem Treffer keine Antwort, die Zelle war vorher nicht rot) — sonst kann die Messung
   immer dasselbe zeigen und beweist nichts.
3. **Zeichenmodus und Farbmodus müssen zusammenpassen.** Deckende Zeichen (Gold-Dot, roter Puls)
   werden exakt verglichen; halbtransparente Effekte über Papier nur über den Farbton, sonst misst
   man die Einblendkurve bzw. den Untergrund (belegt: exakt ±24 ⇒ 0 Pixel in 28/28 Frames).
4. **Die Baseline des Regionen-Vergleichs liegt VOR dem gezeichneten Frame.** Bei pausierter Sim
   heißt das: Ereignis lesen → `capture` → `stepFrame`. Umgekehrt vergleicht man zwei Bilder nach
   dem Ereignis und misst die Gegnerbewegung.
5. **Das Messfenster wird am gemeldeten Punkt gebaut**, nicht über `cellWindow(cellRect(…))` —
   letzteres bläht ein Zellenrechteck auf und liegt eine halbe Zelle daneben.
6. **Ein Test, den der Runner nicht ausführt, ist kein Beleg** (P-32: `fsModuleCache` führte nach
   Edits das vorherige Kompilat aus — ein neuer Fall fehlte still). Vor einem „grün" auf geändertem
   Code: `rm -rf node_modules/.vitest-cache`.
7. **Laufzeit-Budget:** die drei Momente brauchen ~20–35 s zusammen. Das ist für einen Pixelbeleg
   in Ordnung; für alles Weitere (Perf-Panel, weitere Effekte) braucht es eine Last-Vorbedingung
   statt längerer Timeouts (P-35: unter paralleler Last meldeten 20-s-Specs Timeouts, die isoliert
   verschwinden).

## B32. Test-Suite-Konsolidierung — Baseline, Testkit und Abdeckungswache (Plan: `plan/refactor-test-suite-consolidation-1.md`)

### B32.1 Befund

Die Suite wächst pro Sprint-Meilenstein statt pro Modul-Domäne: 43 Testdateien mit 77
`describe`-Blöcken (Stand 17.09.2026), davon 9 allein unter `src/meta/`. Dieselben Setup-Zeilen
(`beforeEach(() => { resetMeta(); clearTestStorage(); })`, teils zusätzlich `resetIds()`) liegen
6-fach kopiert. Ohne Abdeckungsmessung ist nicht beweisbar, dass eine Konsolidierung nichts
verliert.

### B32.2 Spec

1. **Coverage-Baseline (gemessen 20.09.2026, Provider `@vitest/coverage-v8`):** Statements 73,43 % ·
   Branches 68,05 % · Functions 80,08 % · Lines 75,68 % (Spaltenreihenfolge der v8-Tabelle:
   Stmts | Branch | Funcs | Lines). Der Threshold in `vitest.config.ts`
   liegt absichtlich **1 Prozentpunkt darunter** (RISK-003 im Plan): statements ≥ 72, branches ≥ 67,
   functions ≥ 79, lines ≥ 74 — Fluktuationsschutz, keine Schönung.
2. **Testkit:** `src/testing/testkit.ts` ist der EINZIGE Owner der Test-Setup-Kapselung:
   `resetTestState()` (Meta + Storage), `resetFullTestState()` (zusätzlich ID-Zähler),
   `makeRun(runId?)` (deterministische `SimulationRoot`-Erzeugung nach App.tsx-Muster),
   `drainTicks(root, n)` (n `stepOnce()`-Ticks). Vertrags-Test: `src/testing/testkit.test.ts`.
3. **Regeln ab Phase 2 des Plans:** ein Testfile = eine Sub-Domäne, Cap 400 Zeilen (Split statt
   Cap-Erhöhung); Assertions nur über echte Signaturen (`variantId`, `stateHash`, `meta.runId`);
   Konstanten nie im Test hartkodieren, wenn sie aus `config/*.source.ts` ableitbar sind.

### B32.3 DoD für B32

- [x] Coverage-Baseline gemessen und im Threshold gepinnt (Abdeckungswache aktiv)
- [x] Testkit mit Vertrags-Test; Suite grün, tsc clean
- [x] Pilot-Domäne `meta/` konsolidiert (Phase 2): 9 Dateien → 5 Sub-Domänen-Dateien
      (`brood_identity`, `brood_loop`, `brood_loop_continuation`, `cross_lifecycle`,
      `meta_migrations`), It-Bilanz 73 = 73, Coverage ≥ Baseline. Plan-Abweichung TASK-006:
      6→1 hätte den 400-Zeilen-Cap verletzt — Split nach Sub-Domäne schlägt Plan-Tabelle
- [x] Zentrale `simulation/determinism.test.ts` (Phase 3): Replay + FX-Isolation +
      Run-Kontext-Pins (2447771834, B30); Replay-Dublette aus gateB.test.ts entfernt;
      Selbstkontrolle gegen False Truth (veränderter Stream ⇒ anderer Hash)
- [x] Phase 4: 43 → 32 Testdateien bei It-Bilanz 346 = 346; `i18n/` 3→1, `bus/` 3→2,
      `simulation/` 10→5; toHashable-Dublette (3-fach) im Testkit aufgelöst. Alle Fusionsdateien
      unter dem 400er-Cap (max. 393). Restziel ~20 wird von den Behalten-Dateien bestimmt —
      sie sind bereits domänenrichtig (components, core, config, visual, discovery)
- [x] Mutation-Stichproben-Protokoll über alle Gruppen (B32.4)

### B32.4 It-Ledger & Mutation-Stichproben-Protokoll (abschließend)

**It-Ledger (gepinnt, Stand Phase-5-Abschluss):** 34 Testdateien / 346 its — 5 meta (76:
brood_identity 20, brood_loop 19, brood_loop_continuation 9, cross_lifecycle 21, meta_migrations 7),
7 simulation (76: determinism 8, gateB 12, placement_map 17, wave_flow 8, beetle_fire_pair 11,
gameover_notice 7, resume 13), 3 bus (23: bus_events 6, bus_commands 11, bus_audience 6),
1 i18n (13), 1 testing (7), 17 Behalten-Dateien (components/core/config/visual/discovery/
persistence/genome/observers/dev). Abweichung von dieser Bilanz ohne quality-spec-Eintrag =
Gate-Befund. Gate-Anmerkung: das 300er-LOC-Cap gilt auch für Testdateien in src/simulation/ —
Fusionen wurden nachträglich gesplittet (wave_flow, gameover_notice).

Handgemachte Mutation-Tests statt Stryker (ALT-001 im Plan): je konsolidierter Gruppe wurde ein
Source-/Code-Wert gekippt und verifiziert, dass GENAU der erwartete Test rot wird — dann
zurückgesetzt. Ergebnis je Gruppe:

| Gruppe | Gekippt | Roter Test | Beweis |
|---|---|---|---|
| Determinismus (Replay) | Command-Stream (START_WAVE weggelassen) | `determinism.test.ts` — Selbstkontrolle „abweichender Stream ≠ gleicher Hash“ | Der Replay-Kern kann nicht blind grün sein |
| ID-Zähler (RISK-001) | `resetIds()` zwischen zwei Läufen weggelassen | `testkit.test.ts` — Determinismus-Test | `plant-0002` ≠ `plant-0001` im Hash — dokumentiert, warum `resetFullTestState()` existiert |
| B30-Brut-Domäne | Namespace `'brood'` ⇒ `'enemy'` (als Probe ausgeführt) | `brood_identity.test.ts` — Seed-Pins (905729497 etc.) | Probe-Test bestätigt: Pin hält, Flip erzeugt 951497721 ≠ Pin — sensitive |
| PlacementTray (fremdes B36) | JSX-Fragment im `.map()`-Return fehlte | tsc TS1005/TS1128 (Gate, nicht Suite) | Syntax-Bruch schlägt am Compiler an, nicht erst zur Laufzeit |

Kein Wert wurde dauerhaft gekippt; alle Stichproben sind im jeweiligen Test als
Selbstkontrolle verankert, wo sie dauerhaften Wert haben (Replay-Selbstkontrolle, ID-Reset).

### Nachtrag 21.09.2026 — zwei Prüfungen aus dem adversarialen Review (bewusst ohne Audit-ID)

**`commit-size` — die Slice-Grenze ist jetzt eine Prüfung.** Commit `eccfede` trug den Titel
„fix(sim): Attraktor-Zug auf den Weg begrenzen", keinen Body und **152 Dateien** (Vektor-Engine,
UI-Splits, Bus-Typen, gelöschte `src/cloud/*`, alte `.bak`). Ein Gate, das nur das Betreff-Format
prüft, ließ das durch; per `bisect` war danach Mechanik und Aufräumen nicht mehr trennbar.
Regel: mehr als `commit.maxFiles` (Default **25**) Dateien im **Index** ⇒ Fehler `CSZ001`
(`tools/shinon/checks/commit-size-check.ts`). Geprüft wird der Index, nicht der Arbeitsbaum —
ein unaufgeräumter Baum ist kein Commit. Der 152-Dateien-Commit ist zerlegt (7 Slices + ein
Korrektur-Slice, Union gegen den alten Stand geprüft: 152/152 Dateien erhalten).

**Commit-Nachricht ≥ 200 Wörter.** Einzeiler sagen bei Struktur-Änderungen nichts über Umfang
und Grenzen. Die Grenze ist nach oben offen (`MSG007`, `MIN_COMMIT_WORDS` in
`tools/shinon/checks/commit-message-check.ts`, Unicode-Wortzählung); der Ton bleibt ironisch,
die technische Aussage prüfbar. Beides ist mit Selbsttests gepinnt (`message --self-test`,
`checks.test.ts`, `komponist.test.ts`).

**Testzahl-Drift ist ein Fehler, kein Zahlenrätsel.** Die README nannte 570/570 in 61 Dateien,
die Lane maß 662 in 66 — und die Zahl war über 429/492/529/570 gewandert, obwohl ein Commit
„Zählweise eine Wahrheit" hieß. Ein abgeschriebener Messwert altert lautlos.
`scripts/test-count.mjs` misst die Suite (Vitest-JSON) und **veröffentlicht** die Zahl in der
CI-Zusammenfassung (`--summary`); `--check` **weist jede hartkodierte Testzahl in der README
ab** (Exit 1). Geltung nur dort: `CHANGELOG.md` und ROADMAP tragen datierte Messwerte — das ist
Chronik und darf sich nicht mitwachsen, dieselbe Ausnahme wie beim Doku-Referenz-Check.

## B33. Das Ausfuehr-Bit der Hooks gehoert in den Index (Befund: Gate/Windows-Index)

### B33.1 Befund

`installHooks` setzte das Ausfuehr-Bit nur mit `fs.chmodSync`. Bei `core.fileMode=false` — dem
Windows-Standard, wenn die Git-Konfiguration aus einer Nicht-Git-Umgebung stammt — liest Git das
Bit im Arbeitsbaum nicht, und `git add` legte darum `100644` ab. Die Hooks waren auf dieser
Platte ausfuehrbar, im Commit aber nicht, also auf jedem anderen Rechner tot. Der Test hat das
im frischen Temp-Repo zuverlaessig reproduziert (`expected '100644 ...' to match /^100755 /`).

Ein zweiter, davon unabhaengiger Befund: `core.autocrlf=true` materialisiert die Shell-Skripte
beim Checkout mit CRLF. Ein POSIX-Skript mit CRLF bricht unter `/bin/sh` mit „command not found"
ab. Eine `.gitattributes` allein genuegt dem Bericht nach nicht — sie greift nicht bei Dateien,
die der Generator **nach** dem Checkout neu schreibt.

### B33.2 Regel

`installHooks` schreibt das Bit in den Index: `git.update-index --add --chmod=+x`. Das `--add`
ist nicht Beiwerk — die Hooks sind beim Installieren meist untracked, und ohne `--add` waere der
Aufruf genau im Normalfall wirkungslos. Der Aufruf ist idempotent geklammert.

`.gitattributes` sichert die Zeilenenden dauerhaft ab: `tools/hooks/* text eol=lf` erzwingt LF
beim Checkout **und** beim Commit, unabhaengig von `core.autocrlf` und von Editor-Einstellungen.
Wer eine generierte Datei hinzufuegt, muss beide Haelften bedenken — Index-Modus und Zeilenenden
sind zwei verschiedene Ursachen mit zwei verschiedenen Orten.

Hinweis fuers Umstellen: `eol=lf` im selben Commit, der die Datei einbringt, materialisiert erst
ab dem naechsten Checkout. Bis dahin muss die Arbeitsbaum-Datei einmal physisch neu geschrieben
werden (loeschen und aus dem Index auschecken) — `checkout-index` ueberspringt unveraenderte
Dateien, und `git hash-object` meldet sie bereits als LF-konform, obwohl CRLF auf der Platte
liegen.

### B33.3 Der Modus wird verifiziert, nicht geglaubt (Review 26.09.2026, 4/4 Agenten)

`markExecutable()` lieferte einen `boolean`, und `installHooks` warf ihn weg. Ein gescheitertes
`update-index` — EPERM, read-only Index, `.git/index.lock` — liess die Zeile danach trotzdem in
`written` landen und `describeHookInstall` trotzdem „Hooks installiert" melden. Das ist die
teuerste Fehlerklasse des Werkzeugs: der Aufrufer glaubt, der Gate-Zwang sei im Commit aktiv,
und er ist es nicht; der naechste Commit laeuft an einem vorbei, der zu laufen glaubt.

Regel: der Zustand wird **gelesen**, nicht angenommen — nach `markExecutable` prueft
`installHooks` `isExecutableInIndex()` erneut und wirft, wenn der Index weiterhin `100644`
fuehrt. Fail-closed, mit einer Meldung, die die Ursache benennt (Index-Lock, Schreibrechte,
`core.fileMode`) statt nur „fehlgeschlagen". Beide `installHooks`-Aufrufer (`init`, `cli
install-hooks`) behandeln den Wurf als Abbruch — es gibt keinen Pfad, auf dem die Installation
als erfolgreich gemeldet wird, obwohl der Bit fehlt.

Beide Testhaelften gehoeren zusammen: der `100755`-Test pinnt den Erfolgsfall unter
`core.fileMode=false` (der Windows-Realfall, nicht der Zufall einer kooperativen Platte), der
Fail-closed-Test pinnt den Fehlerfall ueber ein `markExecutable`, das `false` liefert.
### B39 Der Gate-Zwang ist eine Behauptung, bis der Hook haengt (Review 26.09.2026)

Zwei Befunde aus derselben Ursache: das Gate wird nicht durch **Entscheidung** erzwungen,
sondern durch einen `pre-commit`-Hook — und dieser Hook haengt in keiner frischen Klonkopie.

**B39.1 Regel 0 beschreibt einen Bump, den es nicht gibt.** `AGENTS.md` Regel 0 sagt, der
pre-commit-Hook hebe die Patch-Version an (`package.json`/`src/version.ts` bleiben absichtlich
+1 uncommitted). `hookScripts()` (`tools/shinon/hooks.ts:29-31`) ruft ausschliesslich
`hook-entry.mjs gate` auf — eine Zeile, kein Versionsschritt. Eine Suche ueber `tools/` und
`scripts/` nach jeder Bump-Form (`patchVersion|raiseVersion|incrementVersion|bumpVersion|version\+\+`)
liefert **0 Treffer**. Die Version steht seit `d924a17` auf `0.0.96`; `package.json` wurde
seit drei Commits nicht angefasst. Regel 0 beschreibt damit einen Zustand, den es nicht gibt,
und `package.json`/`src/version.ts` sind seit diesem Commit **nicht** die Versions-Wahrheit
des laufenden Commits.

**B39.2 `VersionFilesCheck` erzwingt die Umkehrung und meldet Erfolg ohne Bump.** Der Check
(`checks/version-files-check.ts:33-40`) gibt `VRF000` „Vorsprung intakt" aus, **sobald die
Dateien nicht im Index stehen** — unabhaengig davon, ob je ein Bump stattgefunden hat. Die
Meldung behauptet also einen Vorsprung, den sie nie geprueft hat: `VRF000` feuert auch dann,
wenn `src/version.ts` exakt `0.0.96` sagt. `VRF001` (Datei steht im Index) blockiert jede
Bump-Aenderung, die Regel 0 verlangt. Der Kommentar nennt `--allow-version-files` als
Ausnahme; die Option existiert nicht (nur Kommentar). Wer Regel 0 heute *befolgen* will, bekommt
vom Gate ein `VRF001` und muss den Bump liegen lassen.

**Beleg (B39.1 + B39.2).** `git ls-remote`-Paritaet: `origin/main` == `419ee03` == HEAD.
`rg`-Suche: 0 Bump-Treffer. `VRF000`-Pfad: `hits.length === 0` genuegt fuer „Vorsprung intakt".

**Regel:** eine Doku-Regel und eine Gate-Regel duerfen sich nicht widersprechen. Wer eine
automatische Aenderung beschreibt, gehoert dazu **entweder** in den Hook **oder** in den
Check — nicht in beide mit umgekehrter Vorzeichenrichtung. Bis zur Entscheidung gilt:
`0.0.96` ist **nicht** als Bump fuer `419ee03` zu behandeln, und ein `VRF000` ist kein Beleg
fuer einen Vorsprung, sondern nur die Abwesenheit eines Konflikts. Entscheidung Eigentuemer
noetig: (a) Regel 0 korrigieren, sodass Versionsdateien **im** Index bleiben und `VRF001`
entfaellt, oder (b) den Bump wiederherstellen (Commit-Hook plus `VersionFilesCheck`, der ihn
verifiziert statt behauptet). Regel 2 zwingt: eine Wahrheit ueber die Versionsnummer, nicht
eine Doku-Wahrheit und eine Gate-Wahrheit mit umgekehrter Vorzeichenrichtung.

### B39.3 `core.hooksPath` ist nicht gesetzt — der Gate-Zwang ist lokal inaktiv (Review 26.09.2026)

`installHooks` setzt `core.hooksPath` auf `tools/hooks` (`hooks.ts:80-83`). Der Pfad ist im
Arbeitsverzeichnis **nicht** gesetzt (`git config --get core.hooksPath` → leer, Exit 1) und
`.git/hooks` enthaelt ausschliesslich `.sample`-Dateien. Ein einfaches `git commit` umgeht
das Gate damit **vollstaendig** — es laeuft kein Modulgrenzen-Check, kein Typecheck, kein
`CHANGELOG`-Nachweis, keine Nachrichtenregel. B33.3 verlangt Verifikation ueber den Index,
aber diese Verifikation schuetzt nur den Aufrufer von `installHooks`; sie stellt nicht sicher,
dass der installierte Hook ueberhaupt haengt.

**Beleg (gemessen, nicht geraten).** In einer Wegwerf-Klonkopie (`git clone --no-hardlinks`,
`user.name`/`user.email` lokal gesetzt) wurde `probe.txt` committet. Ausgabe: exakt die
drei Zeilen Standard-`git-commit` (`[main b6708b0] chore: bypass probe in clone`, 1 file
changed, create mode 100644) — **kein** Gate-Trace, kein shinon, kein `VRF`, kein
`CHANGELOG`-Hinweis, Exit 0. Der Klon ist danach geloescht.

`installHooks` ist ausschliesslich ueber `init.ts:91-92` und den manuellen CLI-Befehl
`install-hooks` (`cli.ts:241-242`) erreichbar; Starter und Pipeline rufen es nie auf. Die drei
Hook-Dateien stehen korrekt als `100755` im Index (das ist der Gegenstand von B33.3 und
bleibt richtig) — nur die **Verdrahtung** zum Git-Ereignis fehlt lokal.

**Regel:** „Gate gruen" ist eine Eigenschaft des Commits, nicht des Werkzeugs. Vor jedem
Abschluss ist `core.hooksPath` zu **pruefen** (`git config --get core.hooksPath`, erwartet
`tools/hooks`), nicht aus demuccessful `install-hooks` frueherer Tage abzuleiten. Der
Nachweis gehoert an den Commit-Pfad, nicht an eine einmalige Setup-Aktion: solange ein
`git commit` ohne Gate durchlaeuft, ist `enforcement=strict` eine Behauptung. Empfohlene
Umsetzung (Eigentuemer-Entscheidung): `init`/Pipeline setzt `core.hooksPath` und
`install-hooks` prueft es nach dem Schreiben zurueck, damit derselbe fail-closed-Pfad wie
in B33.3 auch hier gilt.
