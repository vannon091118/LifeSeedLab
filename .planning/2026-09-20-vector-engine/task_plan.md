# Task Plan: Vector-Engine — Elementar + Effekt Vektoren, Attraktor, Drift

## Goal
Skalierbare, deterministische Vector-Engine als eigene Simulation-Engine: ElementarVectoren (Logik, vergänglich, drift-skaliert, flag-basiert mit Bridging) + EffektVectoren (reine Optik) + zentraler Attraktor-State (Gravity wiederverwendbar — auch für Feuerkugeln um Projektile). Basis-Chance je Vector * (1+Drift), Drift aus Star-Hash (Start) + Objektzahl (Druck). Kein starres Paar-Switch, kein Gate-Bruch bei neuem Vector. Pflanzen-Optik via Achsen, Käfer-Follow-up notiert als defensive Vector-Schicht.

## Next Step
Phase 8 Beetle-defensive Vectoren (eigener Sprint) — nur Content-Zeilen, kein Logik-Umbau. Sonst: Sprint-Abnahme.

## Current Phase
Phase 7 — Verifikation & Sprint-Abnahme (attestiert)

## Phases

### Phase 1: Requirements & Discovery
- [x] User-Intent, Drift, Vector, Engine-Trennung, OP/Vergänglichkeit, Beetle-Notiz, findings Katalog APPROVED
- **Status:** complete

### Phase 2: Architektur & Verträge
- [x] Engine-Schnitt 2 Module + Attraktor, State-Form vectors+attractors, Determinismus, Drift-Gleichung
- [x] Verträge: findings + progress führen — docs/quality Simulation Contract nach Phase 5 (kleiner Schritt zuerst)
- **Status:** complete

### Phase 3: Source-Truth
- [x] `src/config/vector_logic.source.ts` — 7 Vectoren, 72er DIR_TABLE gebacken, 8-Fragen geprüft, Gate Float-Exaktheit bestanden
- [x] `src/config/vector_visual.source.ts` — Optik-Trennung
- [x] `src/config/phenotype.source.ts` — kein eigenes Vokabular: bestehende Achsen (fire/ice/gravity/vortex …) tragen Vector-Sichtbarkeit, keine Duplikat-Achse
- [x] `src/config/sources.test.ts` — 7/7 Vollständigkeit Logic+Visual, Attributhygiene, DIR_TABLE 72, vectorForEffect deckt alle Gene
- **Status:** complete

### Phase 4: Simulations-Engine (deterministisch)
- [x] `src/simulation/state.ts` + `pipeline.ts` + `resume.ts` + `core/hash.ts` + `snapshot.ts` + `core.test.ts`
- [x] `src/simulation/vectorSystem.ts` — einziger Writer vectors, flaggen+addieren (Bridging), ttl/intensity, rng(cell,tick), drift, double-buffered
- [x] `src/simulation/vectorAttractor.ts` — einziger Writer attractors, Gravity zieht Gegner/Projektile via sqrt+* (kein sin)
- **Status:** complete

### Phase 5: Gameplay-Integration (Wiring, eine Wahrheit)
- [x] `src/simulation/root.ts` — feste Reihenfolge projectiles -> vectors -> attractors -> statusTicks
- [x] Vector-Deposit per Schuss via Root-Callback (fire-Callback, Topf->extraRadius, CHARGE-Nahkreis 2.5 tot) — plantSystem liest nur vectorForEffect
- [x] enemySystem/StatusSystem: Feld unter Füßen nur LESEN (tickDelta, wet+cold/tox-Kombos, oil-Verstärker) — Status-Writer getrennt vom Gegner
- [x] Blitz-Trace Dijkstra cost=1/conductivity — WET leitet, Ableiter emergent (root.ts wiring)
- [x] phenotype.source: Gene benutzen bestehende Achsen (fire/ice/gravity/vortex …) — kein eigenes Vector-Achsen-Vokabular nötig
- **Status:** complete

### Phase 6: Visual & Pflanzen-Optik (Observer, read-only)
- [x] `src/render/layers/vectorField.ts` — eigener Decal-Layer 30% Alpha je Vector (ember_burst/frost_mist/arc_jump/blob/ring_soft-Formen), Attraktor-Ring gepunktet
- [x] `src/render/renderer.ts` — Layer eingehängt (read-only Snapshot-Lesung)
- [x] `src/visual/generator.ts` + `src/observers/visualObserver.ts` — Farben/Profile aus vector_visual.source (eine Optik-Wahrheit)
- **Status:** complete

### Phase 7: Verifikation & Beetle-Follow-up
- [x] Gate-Tests a-d vollständig: NIE NICHTS (36 Kombis), Bridging 4 Tiles =1.2, Blitz nimmt WET, TTL<=180 -> 0, shuffle -> gleicher Hash
- [x] sources.test: Vollständigkeit 7/7 Logic+Visual, Attributhygiene, DIR_TABLE 72, vectorForEffect deckt alle Gene, Palette/Partikel-Hygiene
- [x] Performance: 12x12 sparse + 64x64 sparse je 20 Ticks <200ms
- [x] Modul-Audit: LOC alle OK (max root 289/300, logic 134/200), Single-Writer geprüft, Müll-Kommentar/toter Stub im vectorAttractor entfernt
- [x] Spieltest-Befund 20.09.2026 („kein Creep folgt mehr dem Weg"): Attraktor-Zug `strength*0.1/d` war divergent — Fix mit Obergrenze + Anteil am eigenen Tempo, Beleg Gate (e), Mutation gegengeprüft (rot bei Rückbau)
- [x] Voll-Suite 659/659 grün (20.09.2026, inkl. vector_engine_gate + ballistics + b39), tsc 0 Fehler, build grün, kein sin/cos/pow/random in Sim+Config
- [x] QA-Abholung 20.09.2026: `qa/` geleert (18 Berichte → Devlog 01–22), `origin/qa-reports` Stand `afc657b`, kein offener Bericht — Kanal frei
- [x] B39-Verstoß behoben: `GameOverlays.reason` Inline-Literal → `RunEndReason` aus `bus/events.ts` (Gate jetzt grün)
- [ ] Beetle Phase 8: defensive Vectoren — nur Content (separater Sprint)
- **Status:** complete

## Key Questions
1. Welche Vectoren? -> 7 APPROVED
2. Drift? -> activeCells + starNorm, Cap 0.85
3. Radius starr vs pot/größe? -> Basis starr, Instanz skaliert
4. Gravity Attraktor? -> Ja, state.attractors

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Wort Vector statt Effect | Richtung/Stärke/Reichweite/Zerfall |
| 2 Module + Attraktor | Eine Wahrheit je Frage |
| Gravity = Attraktor-State | Wiederverwendbar |
| Chance basis*(1+drift) | Deterministisch, emergent |
| Flaggen Radius 1-2 Bridging | Kein Paar-if |
| Vergänglich TTL 60-180 | OP erlaubt, nie permanent |
| Neuer Vector = 1 Zeile | Skalierbar |
| Double-buffered rng(cell,tick) | Reihenfolge-unabhängig |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| DIR_TABLE Math.cos/sin in Source | 1 | Gebackene Literale |
| nextId attractor nicht in EntityKind | 1 | system |
| Attraktor-Zug unbeschränkt (`strength*0.1/d`) ⇒ Gegner auf x=−519, Weg kaputt | 1 | `VECTOR_ATTRACTOR_CONFIG` (pullMax linear, maxShare am eigenen Tempo), Gate (e) + Mutations-Gegenprobe |
| E2E-Marge 16 000 Ticks auf schwächere Pflanze getaktet (Game Over erst ~21 200) | 1 | zweistufiges ffUntil wie der Schwester-Test |
| core.test missing vectors/attractors | 1 | Leere Arrays |

## Notes
- 8-Fragen-Sperre vor jedem Edit beachtet.
- Fix aus User-Hinweis war selbst Verstoß — gebacken behoben, verifiziert 0 Treffer im rg.
- Nächster Slice ist genau 1 Datei plantSystem Hook — kein großer Block.
