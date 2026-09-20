# Contract: Simulation

**Owner (genau einer):** `simulation/*` — Gesamt-State `simulation/root.ts`, Systeme `plantSystem`, `enemySystem`, `projectileSystem`, `scoreSystem`, `comboSystem`, `waveSystem`
**Writer:** je Slice genau einer (Ownership-Karte, AGENTS.md); `SimulationRoot` ist der einzige Writer des SimState
**Readers:** Renderer, UI, Observer — ausschließlich über `getSnapshot()` (Tiefkopie)
**LOC-Caps:** 300 (Code-Zeilen)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Gameplay-Wahrheit. Deterministisch: `Math.random`/`Date.now` verboten, Zufall nur über `core/rng.ts` mit Gameplay-Namespaces (`world`, `wave`, `enemy`, `plant`, `brood`, `loot`).
> **Float-Exaktheit** (Regel: `architecture-contract.md` §6): `Math.pow`, `Math.hypot` und Transzendente sind in dieser Domäne verboten, erlaubt sind exakte Operationen und `Math.sqrt` — geprüft von der Gate-Regel „Float-Exaktheit" und dem Baum-Test `tools/shinon/tests/determinism_rule.test.ts`.

---

## A4. `src/simulation/root.ts` + systems — INCOMPLETE (effect pipeline), 4 DEFECTs

- DEFECT: **pierce hack** — `const pierce = plant.variantId === 'sprout' ? 2 : 0`. Ignores `stats.effects`/`EFFECT_PIERCE`. Replace with effect-driven combat (B6).
- DEFECT: **combo multiplier never applied** — `onEnemyDied` adds `scoreValue` raw; `combo.multiplier` (1–5) is cosmetic-only. Design says kills within combo window scale. Wire `scoreValue × multiplier`.
- DEFECT: `grantWaveReward` emits `SCORE_CHANGED {delta: reward}` but score is **not** incremented — HUD delta lies. Wave rewards are energy; emit `REWARD_GRANTED` only.
- DEFECT: `DAY_STARTED`/`NIGHT_STARTED` exist in the event contract but **no producer emits them** — `GameClock` flips phase silently. Clock cannot own the bus; SimulationRoot must diff `clock.phase` per tick and publish transitions (this unlocks day/night presentation + wave dramaturgy).
- INCOMPLETE: `CRITICAL_HIT` type exists, zero producers. `crit` gene + `EFFECT_CRIT` defined; `applyDamage` hardcodes `critical: false`. Add crit roll in combat (B6), route `CRITICAL_HIT` → observer.
- DEFECT (minor): `EnemySystem.rng` member seeded via `reseed()` is dead state — `spawn()` derives its own per-spawn RNG. Remove member, keep per-spawn derivation (it is the correct pattern).
- INCOMPLETE: `state.discoveredVariants` initialized from `STARTING_INVENTORY` only — meta loadout is never injected. **Bred plants are unplaceable in runs** ⇒ the entire breeding→defense loop is severed. Fix via `RootInit.loadout` (B1).
- INCOMPLETE: `SimState.runCounter` always 0; run identity actually derived in `App.tsx` from `meta.runs + runKey` (React-session state). One authority required: `runId` (B1).

## B6. Effect chain (sim → visuals, first real pass)

- `ProjectileEntity` gains `effectId: EffectId | null`.
- `root.ts` wiring: `pierce = stats.effects.includes('EFFECT_PIERCE') ? 2 : 0`; crit roll `if (stats.effects.includes('EFFECT_CRIT') || genome crit power > 0.5) rng('enemy',tick) < 0.15 → damage×2, critical=true`.
- `applyDamage` emits `DAMAGE_DEALT{critical}` + `CRITICAL_HIT` on crit (producer fixed).
- Statuses v1 (deterministic, no per-enemy RNG streams): `EFFECT_SLOW` → `e.slowUntil = tick+90`, speed×0.5, frost tint via observer; `EFFECT_BURN` → 3×(damage/3) ticks poison-style DoT, ember tint; `EFFECT_POISON` → 5 ticks DoT; `EFFECT_CHAIN` → on kill, jump to nearest enemy ≤ 2 cells for 50% damage (arc FX between positions); `EFFECT_HEAL`/`SHIELD`/`HASTE`/`REFLECT` remain support/wall tags (heal aura exists; reflect = thorns contact damage when enemies touch walls — contact combat arrives with walls being hittable, tracked for Phase D).
- `PROJECTILE_HIT`/`PROJECTILE_FIRED` payloads gain `effectId` → observer picks profile/palette/sound from `EFFECTS_SOURCE` (the coupling point the contract already declares).

## B38. Maze-Balance-Datensatz — PLANT_ROUTE_COST als Tuning-Basis (Messung 2026-09-18)

**Frage:** Wie stark beugt das Zucht-Layout den Laufweg je Wert der Maze-Schraube
`PLANT_ROUTE_COST` (Source: `config/map.source.ts`, D4)? Die Antwort ist die
Tuning-Basis für jede künftige Balance-Änderung.

**Messaufbau (deterministisch, Seed 2447771834, `simulation/maze_balance.test.ts` als
dauerhafter Vertrag beim Ist-Wert, Probe-Artefakt für die 1/3-Vergleiche):**
Weg-Bahn aus 8 Weg-Tiles in Reihe 7 (gx 2..9, Gewicht 0.6), Pflanzen ab gx=4
AUF der Bahn auffüllend (gx 4..7). Gemessen wird die Kanal-Bruch-Schwelle n —
die kleinste Pflanzenzahl, bei der die Dijkstra-Route die Bahn verlässt.

**Messwerte:**

| PLANT_ROUTE_COST | Kanal-Bruch bei n Pflanzen auf der Bahn | Lesart |
|---|---|---|
| 1 | n = 4 | Maze-Wirkung fast tot: Tax 1 < Umweg-Restkosten 2 — die Bahn hält fast immer |
| **2 (Ist)** | **n = 2** | 2 Pflanzen reissen den Kanal auf — sichtbare Maze-Wirkung pro Zucht-Schritt |
| 3 | n = 1 | Jede Pflanze auf der Bahn lenkt sofort aus — aggressiv, droht Weg-Tiles wertlos zu machen |

**Post-Break-Formen beim Ist-Wert 2** (in `maze_balance.test.ts` gepinnt):

| Pflanzen auf der Bahn | Route | Geometrie |
|---|---|---|
| 0 (nur Weg) | Reihe 7, 12 Knoten, Qualität 1.0 | gerade Bahn |
| 1 | Reihe 7 (unverändert) | Tax 2.6/Zelle ≤ Ausweich-Kosten |
| 2 | Knick über Reihe 6, 13 Knoten | erster Kanal-Bruch |
| 3 | Knick über Reihe 6, 13 Knoten (länger) | Ausweg wächst mit |
| 4 | totale Auslenkung (Reihe 0), 12 Knoten | Bahn komplett verlassen |

**Wichtige Nebenbefunde:**

1. **Der Schwellwert-Mathe:** Ausweichen kostet ~2 Gewichtseinheiten mehr als die
   Bahn (Knick hin+zurück, Weg-Tile-Vorsprung 0.4/Zelle). Die Schwelle ist damit
   `ceil(2 / (PLANT_ROUTE_COST - 0.6))`-nah — jede Wert-Änderung verschiebt die
   Schwelle NICHT linear: 1→4, 2→2, 3→1 (degressive Wirkung nach oben).
2. **Gleichkosten-Tie:** Bei totaler Auslenkung wählt der Dijkstra die zuerst
   gefundenen Ziel-Reihe (First-Set-Order) — mehrere Parallel-Kanäle haben
   identische Kosten. Die Route ist deterministisch (gleicher Seed ⇒ gleiche Reihe),
   aber nicht „die intuitive“.
3. **Pflanzen ohne Weg-Tiles lenken NICHT:** 7 Pflanzen in einer Reihe auf der
   Wiese ändern die Default-Route nicht (alle Zellen gleich teuer, die Reihe ist
   eine von mehreren Parallel-Optimalen). Maze-Wirkung braucht die Weg-Bahn als
   Anker — erst Bahn + Pflanzen am/an der Bahn erzeugen Lenkung.
4. **Pflanzen AUF Weg-Tiles sind legal** (Platzierung prüft nur Pflanzen-Kollision):
   die stärkste Lenk-Mechanik ist Zucht AUF der gebauten Bahn. Das ist das
   beabsichtigte Spiel: Weg legen → Pflanzen darauf → Kanal bricht Richtung Feuerraum.

**Tuning-Regeln für künftige Änderungen:**

- Werte unter 2 töten die Maze-Wirkung praktisch (Schwelle ≥ 4 Pflanzen — unerreichbar
  in frühem Gameplay): nur wählen, wenn Weg-Tiles dominieren sollen.
- Wert 3 macht jede Bahnpflanze zur sofortigen Umlenkung: nur wählen, wenn das
  Weg-Tile-System abgeschwächt werden soll.
- Wert 2 ist der dokumentierte Sweet Spot: 2 Pflanzen = 1 sichtbarer Knick, 4 = totale
  Auslenkung. Änderungen daran sind Balance-Entscheidungen mit diesem Datensatz als
  Vorher-Nachher-Basis — der Vertrag-Test (`maze_balance.test.ts`) muss mitgezogen werden.

---

## QA-Abgleich (19.09.2026) — erledigte Befunde dieser Domäne

Quelle: Verständnis-QA v0.0.55 + QA v0.0.49. Nur Punkte, die am aktuellen Code **belegt**
erledigt sind; alles weiterhin Offene steht in `docs/process/ROADMAP.md` §3.

- **T1 / BUG 1 — State-Hash war nur pro Prozess stabil. BEHOBEN (19.09.2026).** `nextId(kind)`
  zählt prozess-global, und `snapshot.toHashable` nimmt die Entity-ID in den Hash auf — zwei
  identische Runs im selben Tab ergaben `plant-0010` vs. `plant-0011` und damit verschiedene
  Hashes. Der `SimulationRoot`-Konstruktor setzt die Zähler jetzt selbst zurück (Run-Start =
  Reset), womit der dokumentierte Vertrag wieder prozessübergreifend gilt. Lock:
  `determinism.test.ts` Kern 1b — **ohne** manuellen Reset; die Mutation (Reset entfernt) macht
  ihn rot, nachgewiesen. Grenze, im Code benannt: genau EINE lebende Simulation je Prozess;
  ein zweiter gleichzeitiger Lauf muss `nextId`-frei über `nextScopedId(runId, kind, seq)` gehen.
- **PATH QUALITY war bedeutungslos (immer 100 %). BEHOBEN.** Die Referenz ist nicht mehr die
  Feld-Diagonale (die jeden Umweg auf 1 cappt), sondern die Manhattan-Distanz der
  ROUTE-Endpunkte; das Modul `simulation/routeQuality.ts` trägt die Begründung. Der Wert fließt
  als `quality` über `ROUTE_CHANGED` in den HUD-Chip.
- **`resources.coins` ohne Senke. BEHOBEN durch Entfernung.** Der zweite Kontostand existiert
  nicht mehr; `scoreSystem` dokumentiert, warum (Nektar ist die eine Meta-Währung).
- **Blumentopf hatte keine Wirkung. BEHOBEN (19.09.2026).** Er war reiner Maze-Blocker, während
  die Source ihn „Platzierfläche" nannte — zwei Lesarten desselben Objekts. Jetzt ist er ein
  **Booster**: `config/pot.source.ts` trägt vier Farben auf vier BESTEHENDEN Achsen (Bernstein
  +Schaden, Violett +Reichweite, Moos −Nachladezeit, Rost +Leben), `simulation/potBoost.ts` leitet
  die Farbe aus der ZELLE ab (`deriveSeed(EPOCH_ROOT,'world','pot')` — kein Save-Feld, kein RNG,
  gleiche Zelle ⇒ gleiche Farbe), und `plantSystem.plantStatsAt(state, variantId, gx, gy)` ist die
  EINE Wahrheit für Feuern, Heil-Aura, Reichweiten-Ring und Vorschau. Beleg: `potBoost.test.ts`,
  Mutation (Boost-Anwendung entfernt) wird rot.
- **WEG-GÜTE konnte „gerade" nicht von „gebogen" unterscheiden. ERSETZT (19.09.2026).** Gemessen:
  gerade Route 1,000 · Stufentreppe 1,000 · Hin-und-zurück 0,500 — die Quote erkannte nur
  Rücklauf, behauptete aber „100 % = gerader Weg". `simulation/routeQuality.ts` ist durch
  `routeMetrics.ts` ersetzt: `routeWalkTiles` (Felder des echten Wegs = Zeit unter Feuer) und
  `routeIdealTiles` (kürzestmöglich). Der Abstand beider Werte IST der Maze-Gewinn. Der
  `ROUTE_CHANGED`-Payload trägt `tiles`/`ideal` statt `quality`; die Anzeige liest dieselbe Quelle.
- **Kein zweiter Kontostand im Run. ENTFERNT (19.09.2026).** `resources.experience` hatte genau
  einen Writer und keinen Leser (der Hash ignorierte es bewusst). Das Feld ist gestrichen statt
  ausgestattet — Wertung bleibt `score`/`combo`/`nektarEarned`. Ein Kill erzeugt keinen zweiten
  Kontostand; `gateB.test.ts` pinnt genau das. Nebenbefund derselben Aufräumung: zwei tote
  `state.resources.energy = 9999`-Zuweisungen in `maze_balance`/`maze_loan` (Rest des
  Energiesystems) sind gefallen.
- **`scoreValue` schien tot. BEHOBEN/aufgelöst.** `scoreSystem.onEnemyDied` verbraucht ihn
  (`state.score += scoreValue`); `reward` bleibt der Energie-/Nektarwert. Zwei Werte, zwei
  benannte Zwecke — eine Wahrheit je Feld.

## QA-Abgleich (20.09.2026) — erledigte Befunde dieser Domäne

Quelle: Spieltest-Bericht „Tester-Perspektive" v0.0.71 (Devlog 19). Nur belegte Punkte; alles
Offene steht in `docs/process/ROADMAP.md` §3.

- **Die Weg-Integrität war für die Vorschau nicht befragbar. BEHOBEN (20.09.2026).** Befund:
  „Stilles Bauversagen — ein Bau auf der einzigen Wegzelle wird abgelehnt, ohne sichtbare
  Begründung." Die Sim war nie stumm (die Ablehnung kommt als `TILE_REJECTED route_blocked` mit
  Text an), aber die VORSCHAU versprach vorher ein grünes Ja und nahm es erst beim Loslassen
  zurück. Regel jetzt: dieselbe Integritätsregel ist als **read-only Frage** zugänglich —
  `MapSystem.wouldClosePath(state, gx, gy, tile)` (Datei-Header: „derselbe Vertrag wie
  `placeTile`", über `SimulationRoot.wouldClosePath` an die UI), `PlacementController` lehnt
  damit lokal mit `route_blocked` ab und `GhostCell.reason` wird sichtbar (roter Umriss).
  Zwei Vorprüfungen sind aus dem Regelwerk abgeleitet, nicht geraten: `walkable` schließt nie,
  und eine Zelle außerhalb des aktuellen Laufwegs kann ihn nicht schließen (der bestehende Weg
  bleibt gültig) — nur Zellen AUF dem Laufweg kosten das Pathfinding. Fehlt die Route, wird
  NICHT abgekürzt (fail-closed). Belege: `placement_map.test.ts` (Probe `true` ⇔ `TILE_REJECTED
  route_blocked`; die Probe schreibt nichts — Zustand, Route und Event-Log unverändert),
  `placementController.test.ts` (5 neue Fälle). Grenze, bewusst benannt: die Geometrie- und
  Pool-Vorprüfung bleibt der UI, das übrige Karten-Regelwerk (maxCount, Baufläche) weiterhin
  allein der Sim.

- **Drei von vier Pflanzen tun nichts — also ließ ich die Gegner fressen (P-26, 20.09.2026).** Befund: Black-Box-Spieltest v0.0.71 (5 Läufe, beste Welle 5) — „3/4 Pflanzen machen einfach gar nichts" (Mauer `EFFECT_REFLECT` und Myzel `EFFECT_HEAL` als `visual-only`-Tags in `effectSupport.ts`, 300 HP nie berührt, Heil-Aura lief nur im `prep` ohne Wunden). Jetzt hält die Wurzelmauer auf: **Tank und Boss** (nicht Grunt/Fast/Swarm — Grunt-Fassung machte Welle 2 unspielbar) bleiben an einer Pflanze stehen und fressen sie (`stopsToEat` je Archetyp in `config/enemies.source.ts`, `ENEMY_BITE = {damage:10, cooldownTicks:30, reach:1.05, share:0.2}` als Content). Die Geometrie hat einen Eigentümer (`biteTarget` in `enemySystem.ts` — Beißen und Halten lesen denselben Ort, sonst zwei Wahrheiten; ist die Pflanze weg, läuft der Gegner weiter). Die Pflanze ist Writer (`plantSystem.receiveBite` — einziger Ort mit `PLANT_WITHERED`, Reflex = `resolved` Schaden bei `EFFECT_REFLECT`). `healTick` wirkt jetzt im Kampf (`wave`, `root.ts`) — im `prep` nicht mehr (Grenze: Resume in langer `prep` heilt dort nicht). **Alle Zahlen gemessen, EINE Quelle:** Seed `555010`, Mauer (5, 1) im Biss-Fenster, 1200 Ticks (40 s) → Welle 1: **300→300** (Grunt zieht vorbei), Welle 6: **300→0 in 30 Bissen, 472 stehende Ticks, Tod bei ~1168, Tank 285 HP (150×1.9)** — Details, Grenzen und Sonde: **Devlog 22** (`docs/process/devlog/2026-09-20_22_pflanzen-und-bericht.md`). Belege: `src/simulation/plant_defense.test.ts` (8 Pins: Content-Fahne, Grunt-Vorbei, Biss-Kadenz, Reflex-Gleichung, Myzel-Hilung, Halten+Weiterlaufen). Tank ab **Welle 6**, Boss ab Welle 10 — zum Audit-Hinweis „erst ab Welle 10": bewusst nicht alle Fresser auf 10, damit das Frühspiel nicht leer frisst (Entscheidung des Eigentümers, 20.09.2026). `ENEMY_BITE.share` und `healTick`-Umzug sind beabsichtigt (kein Revert).
