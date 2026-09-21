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
   `startRun` (inkl. `?tutorial=0`), `bootMenu`, `ffUntil`, `pumpWave`, `freeCells`,
   Sim-Bindungsprüfung, Game-Over-Warten.
2. Specs enthalten **nur noch Tests und ihre Kommentare** — kein Werkzeug, kein Selektor, keine
   Geometrie.
3. Progression läuft auf demselben Pfad wie die anderen Specs; die Zucht-Tests booten bewusst
   nur ins Menü (`bootMenu`), ohne Run.

### B24.3 DoD für B24

- [x] `rg "async function startRun" tests/` findet genau eine Definition (im Harness)
- [x] Playwright erkennt dieselbe Testanzahl wie vorher (27)
- [x] Suite grün; Progression-Laufzeit von ~5 min auf ~31 s gesenkt (kein reales Wellen-Warten mehr)

### B24.4 Visuelle Belege — die dritte Stufe des Sprint-Abschlusses (21.09.2026)

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
