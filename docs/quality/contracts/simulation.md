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
