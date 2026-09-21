# LifeSeedLab — Tiefen-Audit & Perfektions-Roadmap („LifeGameLab")

> Stand: Commit `e977f61` (2026-09-17). Grundlage: vollständige Lektüre der Sim-/Render-/Core-/Bus-/Persistenz-Ebene + `docs/quality/lifegameplant-audit.md` (Reuse-Matrix), `docs/process/ROADMAP.md`, `docs/quality/quality-spec.md`.
> Methodik: Datei-für-Datei-Lektüre der Gameplay-Pfade (Simulation, Core, Bus, Render-Runtime, Persistenz, Meta), Quellen-Recherche zu TD-Maze-Patterns (Red Blob Games, Leif Erkenbrach/Planetary Annihilation, Wikipedia D*/Dijkstra) und LLM-Agenten-Architekturen (Voyager, Generative Agents, LATM, MetaGPT, Utility-AI/The Sims).

---

# Teil 1 — Code-Audit (Befunde mit Beleg)

## 1.1 Architektur-Bestand (was steht und gut ist)

| Ebene | Dateien | Urteil |
|---|---|---|
| Kern | `core/clock.ts` (30 tps Fixed-Step, `TICK_MS`, `SPEED_STEPS`), `core/rng.ts` (mulberry32, 8 Namespaces, `deriveSeed`), `core/ids.ts`, `core/hash.ts` (FNV) | **Solide.** Determinismus-Vertrag wird von `determinism.test.ts` (Replay-Hash über 600 Ticks, FX-Isolation) beweisbar gehalten. |
| Bus | `bus/events.ts` (Event-Contract v1), `bus/commands.ts`, `bus/eventAudience.ts` (Registry: JEDES Event hat Audience + Begründung) | **Überdurchschnittlich.** Die Audience-Registry (`eventAudience.ts`, 155 LOC) ist ein seltenes Qualitätsmerkmal: tote Events sind strukturell unmöglich. |
| Sim | `simulation/root.ts` (300/300 LOC — **am Cap**), 7 Single-Writer-Systeme | **Korrekt, aber am Kapazitätsrand** (siehe 1.3/1.4). |
| Render | `render/renderer.ts` (289), `render/gameRuntime.ts` (358/400), `render/layers/*`, `render/spriteCache.ts` | Gut strukturiert; zwei Performance-Befunde (1.4). |
| Persistenz | `persistence/runSave.ts` (Resume-Vertrag: enemies/projectiles/schedule bewusst NICHT gespeichert), `meta/store.ts` (META_VERSION 7 + Migrationen) | **Fail-closed-Vertrag gepinnt** — vorbildlich für die Klasse. |

## 1.2 Game-Loop, Tick & Rendering

**Befund A12 — Doppelter Accumulator (Risiko: Tempo-Drift bei Frame-Spikes).**
`SimulationRoot.advance()` (`simulation/root.ts:93-105`) hat einen **eigenen** Accumulator, während `GameClock` (`core/clock.ts:44-52`) einen zweiten besitzt, der außer in Tests **nie** mitläuft. Beide nutzen denselben Multiplikator (`clock.get().speed`). Der Root-Accumulator hat **kein Upper Bound**: Bei einem Frame-Burst (RAF pausiert im Hintergrund-Tab, dann ein Frame mit dt ≫ 100 ms)执行iert `while (this.accumulator >= TICK_MS)` potentiell **Dutzende Ticks in einem Frame** — die Sim holt auf, aber die Frame-Zeit explodiert (unbegrenzter Catch-up). **Fix:** Cap im Root (`maxTicksPerFrame = 4`, Rest verwerfen) oder Accumulator auf `Math.min(accumulator, 4 * TICK_MS)` klemmen. (Referenz: Game Programming Patterns, „Update Method" / Fix Your Timestep.)

**Befund A13 — `renderer.render()` bekommt pro Frame ZWEI vollständige `structuredClone`-Snapshots.**
`render/gameRuntime.ts:246-251`: `this.root.getSnapshot()` wird **zweimal pro RAF-Frame** gerufen (einmal für den Renderer, einmal für `ghostForRender(..., this.root.getSnapshot().clock.tick)`), plus einmal pro HUD-Tick (~100 ms, `gameRuntime.ts:257`). Jeder Aufruf ist `structuredClone(this.state)` (`simulation/root.ts:229`) — ein Full-Deep-Copy des gesamten SimState inkl. aller Entities. Bei 60 fps × 2 Clones sind das **120 Deep-Copies/Sekunde** eines Objektgraphen mit hunderten Entities. `structuredClone` ist die teuerste mögliche Kopie. **Fix:** Ein Snapshot pro Frame cachen (`const snap = this.root.getSnapshot()` einmal am Loop-Anfang, tick aus demselben Objekt) → unmittelbar −50 % Clone-Last ohne Semantikänderung. Mittelfristig (E6): read-only-Projection statt `structuredClone` — der Deep-Copy ist reine Paranoia gegen eine Mutation, die das Single-Writer-Modell architektonisch bereits ausschließt.

**Befund A14 — `getEventLog()` klont bei jedem DevGate-Frame.**
`root.ts:253-255` + `dev/DevOverlay.tsx` ruft `getEventLog()` im DevGate-Takt — auch das ist ein Full-Copy pro Frame. Dev-only, aber im DevGate-Modus messbar.

## 1.3 Grid, Pathfinding & Maze-Mechanik

**Befund B1 — Pathfinding ist ein einmaliger Dijkstra pro `PLACE_TILE`, kein Feld.**
`simulation/mapSystem.ts:100-160` (`computeRoute`): Dijkstra von der Spawn-Spalte zur Ausgangs-Spalte, **O(n²)-Scan statt Priority Queue** (Kommentar: „Raster ist klein, 12×8"). Ergebnis: **eine einzige Wegpunkt-Liste** (`state.currentRoute`), die ALLE Gegner als Line-Walker ablaufen (`enemySystem.ts:69-100`).
Konsequenzen:
1. **Kein echtes Maze-Mazing.** Gegner folgen alle exakt derselben Zellzentren-Linie. Keine lokale Ausweich-Suche, kein „Gegner B weicht von Gegner A ab". Das ist die Desktop-TD-Form **ohne** deren Kern-Feature: Dort entscheiden Hindernisse pro Einheit neu; hier entscheidet ein globaler Pfad einmal.
2. **Recompute-Trigger fehlen:** `recomputeRoute` wird nur bei `PLACE_TILE`/`EXPAND_MAP` gerufen (`rootCommands.ts`). Pflanzen sind für das Pathfinding **unsichtbar** — das Maze lebt nur auf der Tile-Ebene, obwohl das Zucht-Layout der eigentliche Maze-Bauwerk sein sollte.
3. **Fallback `null` = Default-Pfad** (`world.source.ts:23-28`, `resolveActiveRoute`) — gut (Anti-Softlock, `MAP_FALLBACK_TO_DEFAULT_PATH`), aber unsichtbar: Baut der Spieler den Pfad zu, laufen Gegner stillschweigend den Standard-Weg, **durch die gebauten Wände hindurch**. **Fix (M5): Der Fallback muss sichtbar sein** (Terrain-Tint oder Warn-Toast bei `ROUTE_CHANGED { waypoints: 0 }`).

**Befund B2 — `MAP_NEIGHBOR_MODE` ist toter Code.**
`map.source.ts` definiert `MAP_NEIGHBOR_MODE = 'ortho4'`, und `mapSystem.ts:147-151` brancht darauf — **beide Zweige sind identisch** (ortho8 fehlt komplett). YAGNI-Verstoß gegen die eigene Source-Philosophie: Zweig löschen oder ortho8 implementieren (Kommentar in `map.source.ts:36` sagt explizit „kein diagonales Schneiden" — der tote Zweig ist trotzdem rot).

**Befund B3 — `weight`-Skala ungenutzt.**
`map.source.ts:16-19`: path weight 0.45, default 1, boulder/pot 999. Keine Zwischenwerte — ein Weg-Tile ist entweder 2,2× attraktiver oder irrelevant. Ein 3er-Spektrum (paved 0.3 / path 0.6 / stepping 0.85) verdoppelt die Maze-Tiefe ohne neue Systeme.

**Befund B4 — Gegner-Bewegung starr an Zellzentren gekoppelt.**
`enemySystem.ts:69-84`: `px/py` ist float, aber Ziel immer das nächste Waypoint in `pathIndex`. Kein Separations-Verhalten — 50 Gegner in einer Sackgasse stapeln sich exakt aufeinander. Der wichtigste **Emergent-Behavior-Hebel** bleibt ungenutzt (→ M6).

## 1.4 Combat, Ziel-Auswahl & Balance

**Befund C1 — Ziel-Auswahl ist immer „nächster Gegner".**
`plantSystem.ts:238-246`: `if (d <= stats.range && d < best)`. Keine Ziel-Priorität (first/closest/strongest). TD-Standard für Shooter ist „first" (größter Weg-Fortschritt); `pathProgress` existiert bereits (`enemySystem.ts:82`). Ein **Gen-getriebener Ziel-Modus** (Gen `sniper` → „strongest", Gen `swarm` → „closest", Default → „first") verzahnt Zucht- mit Combat-System (→ M3).

**Befund C2 — Crit-Roll-Mathematik inkonsistent abgeleitet.**
`projectileSystem.ts:70-73` nutzt Namespace `'enemy'` (B30 hat dafür `brood` abgespalten — crit lebt aber weiter dort) und `charCodeAt(id.length-1)` statt `strHash(p.id)` — nur ~36 Entropie-Werte statt voller Hash-Verteilung. Determinismus bleibt gewahrt, Verteilung ist unnötig verzerrt. **Fix (E5):** eigener Namespace `'combat'` + `strHash`.

**Befund C3 — `chainFrom` filtert O(n) pro Event.**
`enemySystem.ts:117-131` allokiert das Enemies-Array **pro Chain-Hit neu** (`state.enemies = state.enemies.filter(...)`). Insgesamt 4 Filter-Sweeps pro Tick über Sub-Systeme verteilt. **Fix (E4):** Ein Sweep am Pipeline-Ende.

**Befund C4 — Brutling-KI (P6) Balance-Anomalien.**
`enemySystem.ts:221-278`: (a) `biteCooldown = 30` gesetzt, dann im selben Tick `--` → erster Biss effektiv 29 Ticks (Off-by-one). (b) Gegner-Gegenschlag hängt an `state.clock.tick % 30 === 0` — eine **zweite, abweichende Cooldown-Quelle** (Modulo auf globalem Tick statt Bites-Zähler). Zwei Wahrheiten für denselben Effekt.

## 1.5 Meta & Persistenz

**Befund D1 — Migrations-Regel hängt am Test, nicht an der Struktur.**
`meta/store.ts:7` (`META_VERSION = 7`) + fail-closed-Migration (`meta_migrations.test.ts` gepinnt) — gut. Nice-to-have: `META_VERSION` als Literal-Typ exportieren und in `migrate()` per `satisfies` erzwingen, damit ein Versions-Bump ohne Migrations-Fall nicht kompiliert.

## 1.6 LOC-Caps (Gate-gemessen, Shinon-Lauf zum Commit e977f61)

```
src/render/gameRuntime.ts                358/400
src/components/GameView.tsx              319/400
src/simulation/root.ts                   300/300  ← AM CAP (jede Änderung erzwingt Split)
src/render/renderer.ts                   289/400
src/simulation/enemySystem.ts            278/300
src/simulation/plantSystem.ts            264/300
```

`root.ts` hat **0 Zeilen Luft** — jede Roadmap-Änderung an der Step-Pipeline zwingt zuerst zum Split (→ E3).

---

# Teil 2 — Recherche: TD-Maze, Emergent Behavior, LLM-Agenten im Grid

## 2.1 Pfadfindung bei veränderbarem Labyrinth

**Red Blob Games, „Flow Field Pathfinding for Tower Defense"** (redblobgames.com/pathfinding/tower-defense): „A game like Desktop Tower Defense has lots of enemy positions (sources) and one destination for all of them… Instead of running A* once per enemy, we can run an algorithm once, and it will calculate the path for all enemies… This is sometimes called a flow field."

**Leif Erkenbrach (Planetary Annihilation)** (leifnode.com/2013/12/flow-field-pathfinding/): Drei Felder — **Cost Field** (byte pro Zelle: 1 = normal, 2–254 = vermeidbar, 255 = Wand), **Integration Field** (modifizierter Dijkstra vom Ziel), **Flow Field** (Vektor je Zelle = Richtung des günstigsten Nachbarn). Kern-Eigenschaft: „Since units only read from the flow field and are not given static paths the whole recalculation process takes a constant amount of time **regardless of the number of units**."

**Wann welcher Ansatz:**

| Ansatz | Passt wenn | Quelle |
|---|---|---|
| A* pro Einheit | wenige Einheiten, statisches Ziel | Standard |
| Dijkstra-Map / Flow Field | viele Einheiten → EIN Ziel, dynamische Hindernisse | Red Blob; Erkenbrach |
| D* Lite | Ziel wandert, Karten-Discovery | Wikipedia „D*": inkrementell, „more efficient than repeated A*" (Mars-Rover, DARPA Urban Challenge) |

**LifeSeedLab-Einordnung:** 12×12-Grid, ein Ziel (Ausgangsspalte), max ~50 Gegner. Der bestehende Dijkstra (`mapSystem.computeRoute`) ist bereits der **halbe Flow-Field-Weg** — es fehlt: (a) Integration Field statt nur Backpointer-Route speichern, (b) Gegner lesen ihre Richtung pro Tick aus dem Feld statt aus einem globalen Waypoint-Array. Bei 144 Zellen kostet Full-Recompute < 0,1 ms — Recompute **pro Placement** ist trivial billig.

## 2.2 Emergent Behavior aus einfachen Regeln

- **Boids (Reynolds 1986):** Separation/Alignment/Cohesion — „complexity arises from the interaction of individual agents adhering to a set of simple rules". Pro-Tick-Lesevorgänge aus lokalem Nachbar-Slice, O(n·k).
- **Cellular Automata (Wolfram-Klasse 4):** „extremely complex… may last for a long time" entsteht aus lokalen Regeln auf finitem Grid — das mathematische Rückgrat für „Lebenssim-Raster": Zellzustand hängt nur von Nachbarschaft ab, Tiefe entsteht aus Iteration.
- **Emergent Gameplay (Wikipedia):** Design-Hebel: (1) konsistente, durchschaubare Weltregeln (Dwarf-Fortress/Minecraft-Muster), (2) Werkzeuge statt Skripte (Scribblenauts-Muster), (3) Kombinatorik aus wenigen Dimensionen.
- **Utility AI (The Sims 3, Dave Mark IAUS):** „behaviors… sort themselves out by priority based on the scores generated by mathematical modeling" statt harter Prioritäts-Listen — natürlicher nächster Schritt über den „nächster Gegner"-Hardcode (Befund C1).

## 2.3 LLM-Agenten in Grid-/Spiel-Umgebungen

- **Voyager (arXiv 2305.16291):** Referenz-Architektur für LLM-Agenten in offenen Grid-Welten: (1) automatischer Curriculum, (2) wachsende **Skill-Library aus ausführbarem Code** („temporally extended, interpretable, and compositional"), (3) iteratives Prompting mit Umwelt-Feedback + Selbstverifikation. Kern-Lektion: **Das LLM entscheidet nie pro Tick** — es schreibt/ruft Skills, die deterministisch laufen.
- **Generative Agents (arXiv 2304.03442):** Beobachtung → Planung → Reflexion; Ablation beweist den Beitrag jeder Komponente. Übertragbar: Der Agent braucht einen **Ereignis-Speicher** und einen **Reflexions-Zyklus** (wellen-/phasenweise), keinen Tick-Loop.
- **LATM (arXiv 2305.17126):** Tool-Making (teuer, selten) vs. Tool-Using (billig, oft). Übertragbar: Strategie (Build-Order, Wellen-Antwort) = LLM, selten; taktisches Mikro = lokal, utility-based, kein LLM-Tick.
- **MetaGPT (arXiv 2308.00352):** SOPs in Prompt-Sequenzen + **Zwischenergebnis-Verifikation** gegen kaskadierende Halluzinationen. Übertragbar: Jede Agent-Entscheidung MUSS ein validierbarer Command-Payload sein, den die Sim verifiziert (bestehendes fail-closed Command-System!).

**Konsens-Muster für Grid-TD + LLM:**
1. LLM auf **Strategie-Ebene** (ereignis-gesteuert: `WAVE_COMPLETED`, prep-Start, `GAME_OVER`).
2. **Deterministische Ausführung**: LLM-Ausgabe → Commands der bestehenden Queue; die Sim bleibt die Wahrheit (Owner-Modell unangetastet).
3. **Observation als kompaktes Diff** (nicht full state).
4. **Verifikation:** Ungültige Ausgabe ⇒ `*_REJECTED`-Event (B29-Kanal!) — der Agent lernt aus demselben Feedback wie der Spieler.

---

# Teil 3 — Perfektions-Roadmap „LifeGameLab"

## 3.1 Engine & Architektur (P0 — Grundlage)

| # | Maßnahme | Beleg | Aufwand |
|---|---|---|---|
| E1 | **Snapshot-Budget:** Ein `getSnapshot()` pro RAF-Frame (Cache in gameRuntime), `ghostForRender` liest tick aus demselben Objekt. −50 % Clone-Last sofort. | A13 | XS |
| E2 | **Tick-Cap:** `SimulationRoot.advance()` klemmt den Accumulator (max 4 Ticks/Frame). | A12 | XS |
| E3 | **Root-Split:** `stepOnce`-Pipeline → `simulation/pipeline.ts`; Root wird Wiring-only (~150 LOC). | 1.6 | S |
| E4 | **Filter-Sweep:** Enemies-Array einmal pro Tick am Pipeline-Ende. | C3 | XS |
| E5 | **Crit-Domäne:** Namespace `'combat'` + `strHash(projectileId)`. Namespace-Flip = Migrations-Entscheidung nach B30-Muster. | C2 | S |
| E6 | **Read-only-Snapshot:** `structuredClone` ersetzen durch Projection der Hot-Pfade; Full-Copy nur für Resume/Persistenz. | A13 (mittel) | M |

## 3.2 Maze- & TD-Mechanik (P1 — Spiel-Tiefe)

| # | Maßnahme | Recherche-Beleg |
|---|---|---|
| M1 | **Flow Field statt Waypoint-Route:** `computeRoute` → Integration Field (144 Zellen), `state.currentRoute` wird `Int16Array(144)`. Gegner lesen pro Tick den besten Nachbarn aus ihrer Zelle. Recompute nur bei Tile-Change. | Red Blob; Erkenbrach („constant time regardless of units") |
| M2 | **Cost Field aus Pflanzen (optional):** Thorn-Pflanzen verlangsamen (cost 2), Rootwall verteuert (cost 3) statt blockiert — das Zucht-Layout wird zum Maze-Bauwerk. | Erkenbrach Cost-Skala 1–255 |
| M3 | **Ziel-Priorität als Gen:** `targeting: 'first'\|'closest'\|'strongest'` in `PlantStats`, Gen-Mapping nach B6-Muster. Default „first" (TD-Standard). | C1 + Utility-AI |
| M4 | **Drei Weg-Gewichte:** `path 0.45` → `{ paved: 0.3, path: 0.6, stepping: 0.85 }`. Source-only (Regel 6). **Hinfällig seit 21.09.2026** — der Weg ist kein Tile mehr (Laufweg = Pathfinding-Ergebnis); Gewichtsspreizung hätte nichts mehr zu lenken. S. `contracts/simulation.md` B38. | B3 |
| M5 | **Sichtbarer Fallback:** Bei `ROUTE_CHANGED { waypoints: 0 }` → Terrain-Warnung + Toast. | B1.3 |
| M6 | **Gegner-Separation (Boids-light):** Separations-Radius 0.3 Zellen, nur Positionskorrektur. O(n²) bei n≤60 ok, später Spatial Hash. | Boids (Reynolds) |
| M7 | **ortho4/ortho8 entscheiden:** toten Branch löschen ODER ortho8 für `diagonal: true`-Gegner. | B2 |

**Mathematischer Kern (M1+M2):** Cost field `c(cell) ∈ {1, 2, 3, ∞}`, Integration per Dijkstra vom Ausgang, Bewegung = `argmin` über ortho4-Nachbarn (+ M6-Separation als zweite Kraft, Gewicht 0.3). Damit ist jede Zucht-Entscheidung gleichzeitig ein Pathfinding-Eingriff — das Genom-System (B6) trägt zwei Spielsysteme (Combat + Maze). Das ist die eigentliche „Perfektion" von LifeSeedLab.

## 3.3 LLM-Kognitions-Schnittstelle (P2 — Agent)

**Architektur-Entscheidung** (aus Voyager/Generative Agents/LATM abgeleitet): LLM als **Strateg**, nicht als Tick-Treiber. Agent läuft ereignis-gesteuert und gibt Commands an die bestehende Queue; die Sim verifiziert wie bei Spieler-Input (fail-closed, B29-Kanal als Lern-Feedback).

### JSON-Schema: Observation (Sim → Agent)

```jsonc
{
  "$schema": "lifeseedlab/observation@1",
  "tick": 1440,
  "phase": "prep",                       // prep | wave | gameover
  "prepTicksLeft": 42,                   // null wenn wave
  "wave": { "number": 3, "nextPreview": ["grunt×8", "fast×4"] },
  "resources": { "energy": 210, "lives": 17, "nektarEarned": 34 },
  "inventory": { "sprout": 2, "cross_ab12_3": 1 },
  "board": {
    "cols": 12, "rows": 12,
    "plants": [
      { "id": "plant-0007", "v": "sprout", "gx": 4, "gy": 3,
        "growth": "mature", "hpFrac": 0.8 }
    ],
    "tiles": { "5,3": "path", "6,3": "boulder" },
    "threats": [                         // nur in phase=wave, komprimiert
      { "t": "fast", "px": 7.2, "py": 5.5, "prog": 0.61, "hpFrac": 0.4 }
    ]
  },
  "meta": { "bestWave": 4, "runs": 2, "nektar": 95,
            "collection": 3, "pendingCrosses": 1 },
  "recent": [                            // Ereignis-Diff seit letztem Agent-Tick
    { "type": "WAVE_COMPLETED", "wave": 2 },
    { "type": "PLANT_WITHERED", "plantId": "plant-0003" }
  ],
  "legalActions": ["place_plant", "place_tile", "start_wave", "sow", "claim", "noop"]
}
```

### JSON-Schema: Action (Agent → Sim)

```jsonc
{
  "$schema": "lifeseedlab/action@1",
  "tick": 1440,                          // Echo — Sim verwirft bei Drift (staleness guard)
  "reasoning": "max 200 chars",          // audit-only, niemals Gameplay-Eingang (Regel 2/3)
  "actions": [                           // 1..5 pro Agent-Tick, sequentiell
    { "op": "place_plant", "variantId": "cross_ab12_3", "gx": 6, "gy": 4 },
    { "op": "place_tile",  "tile": "path", "gx": 5, "gy": 4 },
    { "op": "start_wave" },
    { "op": "sow",         "parentA": "sprout", "parentB": "mycelia" },
    { "op": "noop" }
  ]
}
```

**Verifikations-Pfad:** Jeder `actions[i]` wird 1:1 zu einem `makeCommand(...)` der bestehenden Queue (`rootCommands`-Vokabular). Ablehnung ⇒ `*_REJECTED`-Event ⇒ fließt in die **nächste** Observation (`recent`) — der Agent lernt aus exakt demselben Feedback-Kanal wie der Spieler (B29-Infrastruktur wird wiederverwendet; Regel 2: kein zweiter State-Writer).

**Verboten (Contract):** LLM-Output schreibt niemals direkt in SimState; `reasoning` verlässt nie den Audit-Log; Agent-Entscheidungen werden als Command-Stream mitgeloggt, damit der Determinismus-Replay-Vertrag erhalten bleibt.

## 3.4 Reihenfolge (Abhängigkeiten)

```
E1, E2, E4 (XS, sofort)           → Basis-Performance
E3 (Root-Split)                   → räumt Cap für M1
M1 (Flow Field) → M5 → M4 → M2    → Maze-Kern (M5 SOFORT nach M1, nie später)
M6 + M3 parallel                  → Emergenz + Tiefe
E5, M7, E6                        → Hygiene
P2: Agent-Schema → Agent-Loop → Voyager-Skill-Library (Zucht-Strategien als wiederverwendbare "Builds")
```

Jede Stufe einzeln verifizierbar (Determinismus-Replay bleibt grün — M1 ändert Movement-Pfade, also wird die Route-Wahrheit im `determinism.test.ts` neu gepinnt).

---

## Quellen

1. Red Blob Games — *Flow Field Pathfinding for Tower Defense*: https://www.redblobgames.com/pathfinding/tower-defense/
2. Leif Erkenbrach — *Flow Field Pathfinding* (Planetary-Annihilation-Ansatz): https://leifnode.com/2013/12/flow-field-pathfinding/
3. Wikipedia — *D\** (D* Lite, inkrementelle Neuplanung): https://en.wikipedia.org/wiki/D*
4. Wikipedia — *Dijkstra's Algorithm*: https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
5. Wikipedia — *Boids* (Reynolds 1986): https://en.wikipedia.org/wiki/Boids
6. Wikipedia — *Cellular Automaton* (Wolfram-Klasse 4): https://en.wikipedia.org/wiki/Cellular_automaton
7. Wikipedia — *Emergent Gameplay*: https://en.wikipedia.org/wiki/Emergent_gameplay
8. Wikipedia — *Utility System* (The Sims 3, IAUS/Dave Mark): https://en.wikipedia.org/wiki/Utility_system
9. Wang et al. — *Voyager* (arXiv 2305.16291): https://arxiv.org/abs/2305.16291
10. Park et al. — *Generative Agents* (arXiv 2304.03442): https://arxiv.org/abs/2304.03442
11. Cai et al. — *LLMs as Tool Makers* (LATM, arXiv 2305.17126): https://arxiv.org/abs/2305.17126
12. Hong et al. — *MetaGPT* (arXiv 2308.00352): https://arxiv.org/abs/2308.00352
13. Nystrom — *Game Programming Patterns, Update Method*: https://gameprogrammingpatterns.com/update-method.html
