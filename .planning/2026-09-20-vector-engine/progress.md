# Progress — Vector-Engine

## Session 2026-09-20 — Planung

### Phase 1: Requirements & Discovery — complete
- **Started:** 2026-09-20, **Completed:** 2026-09-20
- **Actions:**
  - User-Intent geklärt: kein Hardcode, voll simuliert, `p=basis*(1+Drift)`, Drift aus Star-Hash (Start) + Objektzahl (Druck), vergänglich, Vector-Begriff, Engine-Trennung Elementar/Effekt, Attraktor zentral, Skalierbarkeit wichtig, OP erlaubt, Beetle defensiv notiert
  - Architektur verifiziert: 18 EffectId, sim vs visual-only, GENE_POOL, phenotype Achsen + driftFor, breedGenome, state ohne Feld, projectileSystem crit-RNG, map Dijkstra, chain genome_hash FNV-1a, RNG NS, Gate-Verbote, ParticlePool Budgets
  - task_plan.md 7 Phasen, findings.md Katalog 7 Vectoren + Optik + Achsen + Drift + Beetle-Notiz
  - **Review:** APPROVED — Heat/Wet/Oil/Cold/Charge/Attractor/Tox als anpassbare Variablen (Farbe, Größe, Basis, radius, ttl, decay) mutierbar deterministisch via Genom+driftFor
- **Files created:** `.planning/2026-09-20-vector-engine/task_plan.md`, `findings.md`, `progress.md`
- **8-Fragen:** je Datei vor Edit geprüft, Drift-Formel wie besprochen

## Session 2026-09-20 — Build (Skelett)

### Phase 3: Source-Truth
- **Status:** vectors sources erstellt, 8-Fragen je Datei
- **Actions:**
  - `src/config/vector_logic.source.ts` neu: 7 Vectoren VECTOR_HEAT/WET/OIL/COLD/CHARGE/ATTRACTOR/TOX, gebackene 72er DIR_TABLE Literale (Gate Float-Exaktheit: kein sin/cos in Source), isValidVector
  - `src/config/vector_visual.source.ts` neu: Optik-Trennung je Vector (paletteModifier, particleProfile, projectileProfile, impactProfile, statusVisual, soundProfile)
  - Fehler: DIR_TABLE anfangs mit Math.cos/sin gebaut -> Gate-Bruch -> fix auf Literale via offline Bake, rg bestätigt kein Math.cos/sin in beiden vector Dateien
- **Files created:** `src/config/vector_logic.source.ts`, `src/config/vector_visual.source.ts`

### Phase 4: State-Shape + Hash (8-Fragen je Datei)
- **Actions:**
  - `src/simulation/state.ts`: VectorCell {vectorId,intensity,ttl}, VectorField Record<String,VectorCell[]>, AttractorEntity {id,x,y,strength,radius,ttl}, SimState +vectors/+attractors (Writer VectorSystem / VectorAttractor)
  - `src/simulation/pipeline.ts`: vectors:{}, attractors:[] im freshState
  - `src/simulation/resume.ts`: vectors/attractors löschen bei Resume (vergänglich, wie enemies/projectiles)
  - `src/core/hash.ts`: HashableState +vectors/+attractors, hashState sortiert nach key/vectorId, parallel zu plants/enemies/projectiles, version v1 prefix
  - `src/simulation/snapshot.ts`: toHashable mappt vectors/attractors
  - `src/core/core.test.ts`: vectors/attractors leere Defaults im Fixture
  - tsc --noEmit --skipLibCheck: grün (0 Fehler)
  - vitest: core.test 19/19, gateB 12/12, determinism 12/12, sources 9/9, projectile_ballistics 6/6, plant_defense 8/8, simulation_resume 13/13, bus_commands 11/11
- **Files modified:** `src/simulation/state.ts`, `pipeline.ts`, `resume.ts`, `core/hash.ts`, `simulation/snapshot.ts`, `core/core.test.ts`
- **Verified:** 8-Fragen vor jedem Edit (Existenz nein, Owner je Slice, Schicht Sim/Source, kein Event, Seed/Regel/Source/LOC/keine zweite Quelle) — bestehende SimState Erweiterung keine Duplikat-Source

### Phase 4b: Engine-Module (8-Fragen je Datei)
- **Actions:**
  - `src/simulation/vectorSystem.ts` neu (Owner VectorSystem, Sim, NS world, Source vector_logic, ≤300): deposit(radius 1-2, Addition Bridging: zwei Feuer flaggen Mitte -> Summe > threshold), update(double-buffered, rng(cell,tick) via deriveSeed/makeRng world, drift = min(0.85, driftFor(activeCells+1)+starNorm*0.2), ttl--, intensity*=decay, cleanup)
  - `src/simulation/vectorAttractor.ts` neu (Owner VectorAttractor, Sim, NS world, Source VECTOR_ATTRACTOR+DIR_TABLE, ≤300): spawn(x,y,strength,radius,ttl) via nextId system, update(attractors ttl--, Gegner/Projektile ziehen: pull=0.06-0.1*strength/dist, nur sqrt + */ , DIR_TABLE für Orbit)
  - tsc clean, Fehler attractor id kind -> nextId system korrigiert
- **Files created:** `src/simulation/vectorSystem.ts`, `src/simulation/vectorAttractor.ts`

### Phase 4c: Wiring
- **Actions:**
  - `src/simulation/root.ts`: VectorSystem + VectorAttractor import/fields/cstr, fixe Reihenfolge stepOnce: projectiles.update -> vectors.update -> attractors.update -> applyStatusTicks, Getter vectorSystem/attractorSystem für plantSystem hook (kein System ruft System direkt ausser via Root)
  - LOC: root 211 code (Cap 300, war 211 vor Vectors -> neu prüfen, 211+~10 = ~221 noch <300), alle Tests grün
- **Files modified:** `src/simulation/root.ts`

## Session 2026-09-20 — Spieltest-Befund „kein Creep folgt mehr dem Weg" (behoben)
- **Befund (Eigentümer, live):** „Gamebreaker durch die sprunghaften Käfer — auf einmal folgt kein Creep mehr dem Weg."
- **Diagnose gemessen** (Sonde am `SimulationRoot`, Welle 2, Feld auf einer Wegzelle, alle 30 Ticks erneuert, 600 Ticks): MIT Feld Gegner auf x = −519 / 256 / 382 (Brett verlassen), ø Fortschritt 0,41 gegen 0,62 ohne Feld. Ursache: `pull = strength*0.1/d` — divergent zur Feldmitte, ohne Deckel. Auslöser in ECHTEN Spieldaten: 6 Pflanzen der Sammlung tragen `EFFECT_HASTE` → `VECTOR_ATTRACTOR` → je Schuss ein Feld (0.8/3/60 als Literale in `root.ts`).
- **Fix:** `VECTOR_ATTRACTOR_CONFIG` in `config/vector_logic.source.ts` (spawn 0.8/3/60, `pullMax 0.05`, `maxShare 0.6`); `vectorAttractor.ts` zieht linear abfallend und deckelt die Zug-Summe aller Felder auf `maxShare` des EIGENEN Tempos des Opfers (Gegner UND Projektil, EINE Formel `accumulate`); `root.ts` nimmt die Spawn-Werte aus der Source.
- **Nachgemessen:** niemand außerhalb des Bretts; Schrittweite exakt Tempo·1,6 (grunt 0,0320 · fast 0,0720); ø Fortschritt 0,556 (Feld bremst/vorzieht, hält nicht); Kontrolle ohne Feld Schritt = exakt Lauf-Tempo.
- **Gegenbeweis:** Fix mutiert zurück ⇒ Gate (e) rot (3 Gegner außerhalb).
- **Verifikation:** tsc 0 · Suite **661/661** (2 neue Gate-(e)-Tests) · E2E **30/30** (davon 1 Marge-Fix in `tests/progression.spec.ts`: Game Over kommt gemessen erst bei Tick ~21 200, vorher 16 000 getaktet).
- **Offen (Eigentümer-Entscheid):** die Zuordnung `EFFECT_HASTE → VECTOR_ATTRACTOR` — sie erfüllt die Vollständigkeitsregel („jedes Gen speist einen Vector"), inhaltlich ist Haste Kadenz und keine Anziehung; damit krümmt jede Haste-Pflanze weiter den Weg.

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| tsc --noEmit --skipLibCheck | vectors+attractors+hash+snapshot+roots | 0 Fehler | 0 | ✓ |
| core.test 19 | makeState mit vectors/attractors leer | hash stabil | 19 pass | ✓ |
| gateB 12 | determinism unverändert | 12 pass | 12 pass | ✓ |
| determinism 12 | seed+commands hash | 12 pass | 12 pass | ✓ |
| plant_defense 8 | P-26 nach Wiring unverändert | 8 pass | 8 pass | ✓ |
| Math.cos/sin in vector sources | verboten | 0 Treffer | 0 Treffer | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-09-20 | vector_logic DIR_TABLE Math.cos/sin in Source | 1 | Gebackene Literale (offline 72 Werte 4 Dez) |
| 2026-09-20 | vectorAttractor nextId attractor nicht in EntityKind | 1 | nextId system |
| 2026-09-20 | core.test missing vectors/attractors | 1 | Leere Arrays ergänzt |

## Reboot Check (Phase 3-4b done)
| Question | Answer |
|----------|--------|
| Where am I? | Phase 4 (Engine-Skelett done, Phase 5 Wiring/Integration steht als minimaler Anschluss) |
| Where next? | Phase 5: plantSystem deposit Hook (Pfützen 1-3 via pot, size->range/speed) + enemy liest Feld + Blitz Dijkstra emergent + Verifikation |

## Session 2026-09-20 — Modul-Audit (abgeschlossen)
- **LOC-Audit** (Zählregel: nur Code-Zeilen, Kommentare/Leerzeilen/Blockkommentare raus): alle 18 berührten Dateien im Cap — root.ts 289/300, vector_logic 134/200, vectorSystem 173/300, state.ts 160/200, plantSystem 258/300, enemySystem 252/300, logic/visual/system/state/root/pipeline/resume/snapshot/hash/gate-test/vectorField/renderer/generator/visualObserver alles OK. Kein Überschreiten, kein Cap künstlich erhöht.
- **Single-Writer verifiziert** (Grep über alle Schreibpfade): `state.vectors`/`state.vectors[key]` nur in vectorSystem.ts + resume.ts (Reset, bewusst); `state.attractors` nur in vectorAttractor.ts + resume.ts; Status-Felder (slow/burn/poison) nur StatusSystem (Fassade über EnemySystem.damageDirect — ein Emit-Punkt); WET-Lesung in root.ts Blitze-Tracer nur LESEND. Keine zweite Route.
- **Defekte im vectorAttractor.ts gefunden + behoben:** 1) Müll-Kommentar (Devanagari-Zeile „2 Raum: 2 über एक…") — gelöscht; 2) toter Stub `removeForPlant` (kein Aufrufer im Baum, Vertrag „kein plantId auf Attraktor“ — gelöscht statt kommentiert, Regel 4 kein Code auf Vorrat); 3) tote `void src`/`void VECTOR_DIR_TABLE`-Zeilen + toter Import VECTOR_LOGIC_SOURCE entfernt; 4) Kommentar korrigiert: Orbit-Quer-Anteil ist Observer-Sache, Sim zieht radial.
- **Gate-Regeln geprüft:** grep über src/simulation + src/config (ohne Tests): kein Math.sin/cos/tan/exp/log/pow/hypot (einziger Treffer = Kommentar in phenotype.source, der die Schleifen-Alternative erklärt), kein Math.random/Date.now. DIR_TABLE bleibt gebackene Literale, 72 Einträge, Gate-Test (d) beweist Einheitslängen.
- **Test-Deckung:** vector_engine_gate 57 (a: 38 Kombis + Zahlenhygiene; b: 2; c: 3; d: TTL je Vector + Attraktor + DIR_TABLE + OP-Prüfstück + shuffle-Hash + Performance), sources 14 (7/7 Vollständigkeit, Attributhygiene, DIR_TABLE, Mapper, Palette-Hygiene), core 19, determinism 12. **Voll-Suite 649/649 in 9.4s**, tsc 0 Fehler.
- **Offen bewusst nicht gebaut (Nicht-Scope des Audits):** height→range/thickness→speed als *Gameplay*-Skalierung existiert NICHT — die Achsen sind rein visuell (plantPhenotype scale/stalk); range/cooldown kommen aus plants.source/potBoost. Das ist der nächste Content-Slice, kein Defekt. Beetle-Phase 8 unverändert offen.
- **Verifikation:** tsc --noEmit --skipLibCheck 0 Fehler; test-lane --full grün; Gate-Verträge (a)-(d) + goldener Hash-Anker unverändert.
