# Findings — Vector-Engine

## 1. Kontext: Was der User will (Bestätigt)

- Kein Hardcode-Paar-Switch `if(FIRE && OIL)`. Stattdessen voll simulierte, wahrscheinlichkeitsbasierte, deterministisch reproduzierbare Vektoren.
- Formel: `p = basis * (1 + Drift)` — Drift = Star-Hash-Start (wie stark driftet diese Welt überhaupt) + Objektzahl-Druck (wie weit sind wir gerade gedriftet). Basis berechenbar, Drift emergent, beides Integers. Drift nur Faktor.
- Vector flaggt intern Nachbarn + deren Nachbarn (Radius 2, unsichtbar), beide Feuer 4 Tiles entfernt flaggen Mitte additiv -> `heat > Schwelle && würfel<trifft` -> Brücke entsteht. Nichts hardcodiert, nur Addition + Schwelle.
- Gravity = zentraler Attraktor-State, wiederverwendbar für Gegner, Projektile, Feuerkugeln um Projektile (drawcall-batches).
- Wort Vector bevorzugt. Skalierbar: neuer Vector = 1 Zeile, bricht nie. OP erlaubt weil vergänglich (TTL). Beetle-Follow-up notiert: gleiche Engine, defensive Effekte.

## 2. Bestand am Code (Verifiziert 2026-09-20)

| Schicht | Befund | Datei |
|---------|--------|-------|
| Content | 18 EffectId, `EFFECTS_SOURCE` einzige Vokabular-Wahrheit | `src/config/effects.source.ts` |
| Sim-Vertrag | `sim` vs `visual-only` je Effect, kein zweiter Branch | `src/simulation/effectSupport.ts` |
| Ballistik | `SPEED_BASE/GRAIN/MAX`, `PIERCE_BASE/STEP/MAX`, `EFFECT_SLOTS=2` | `src/config/ballistics.source.ts` |
| Genom | `GENE_POOL` 15+8 Gene, `GENE_EFFECTS` Gen->Effect | `src/genome/pool.ts`, `src/config/genes.source.ts` |
| Phänotyp | 19 Achsen + 2 Interaktionen (rhythm/guard), `driftFor(g)` multiplikativ, kein Math.pow | `src/config/phenotype.source.ts` |
| Zucht | `breedGenome` mit drift+pressure, `rollCandidates` Neuheitsdruck | `src/genome/breeding.ts` |
| State | `plants/enemies/projectiles`, kein Feld/Vector, `hashState` sortiert nach id | `src/simulation/state.ts`, `src/core/hash.ts` |
| Projectile | crit via `makeRng('enemy', seed^imul(tick)^idHash)`, zustandslos | `src/simulation/projectileSystem.ts:78` |
| Plant | `update` closest-target `d<=range`, kein Donut, kein Flaggen | `src/simulation/plantSystem.ts:253` |
| Map | Dijkstra `computeRoute` ortho4, `PLANT_ROUTE_COST` | `src/simulation/mapSystem.ts` |
| Hash | `canonicalGenome` -> `fnv1aHex` (FNV-1a), `genome_hash = hyb-xxxxxxxx` | `src/discovery/chain.ts:21` |
| RNG | 6 Gameplay-NS (world/wave/enemy/plant/brood/loot) + 3 Presentation-NS, `deriveSeed(root,ns,entity,event,ver)` | `src/core/rng.ts` |
| Gate | Transzendente (`sin/cos/tan/exp/log/pow/hypot`) verboten in `simulation/**` + `config/*.source.ts` | `tools/shinon/config.ts` + Gate-Test |
| Render | ParticlePool Budget NORMAL 40 / BUSY 70 / CHAOS 100, Layer-Batching | `src/observers/particles.ts`, `src/render/layers/terrain.ts` |

Kein Feld/Vector existiert. Keine Kollision zu bereinigen — Neubau ist sauber.

## 3. Katalog: 7 Initiale Vectoren

### 3.1 ElementarVectoren — Logik (vector_logic.source.ts, je Vector 1 Zeile)

| ID | Basis | radius (Flag) | ttl | decay | Kern-Flag / Schwelle | Bridging-Beispiel |
|---|---|---|---|---|---|---|
| `HEAT` (Feuer) | volatility 0.35 | 2 (Nachbar der Nachbarn) | 120 | 0.96 | `heat` addiert, `heat>1.2` -> zündet | 2 Feuer 4 Tiles -> Mitte Summe -> Brücke |
| `WET` (Wasser) | conductivity 0.9 | 1 | 180 | 0.98 | `wet` heilt 3/Tick, leitet | Wasser zwischen Blitz+ Gegner -> Blitz nimmt Pfütze |
| `OIL` (Öl) | volatility 0.75, viscosity 0.6 | 2 (kriecht) | 150 | 0.97 | `slick` slow 0.7, brennt x2 | Oil-Pfütze 1-3 Tiles vor Pflanze (Topf), Feuer dahinter -> Flammenmeer |
| `COLD` (Eis) | freezeAt 0.8 | 1 | 120 | 0.97 | `cold` slow 0.5 | `wet+cold` -> `frozen 60t 2dmg` (Schwelle, kein if-Paar) |
| `CHARGE` (Blitz) | conductivity 0.95 | 0 (Trace, Dijkstra) | 10 | 1.0 (instant) | Dijkstra `cost=1/conductivity` | Reichweite riesig, minRange 2.5 tot innen (Donut emergent) |
| `ATTRACTOR` (Gravity) | pull 0.8 | 3 (Feld) | ∞ solange Quelle lebt | 1.0 | eigener State `Attraktor{x,y,stärke,radius}` zieht `0.1 Zelle/Tick` | Projektil trägt Attraktor, Feuerkugel umkreist es |
| `TOX` (Gift) | - | 2 | 150 | 0.98 | `tox` 1dmg/Tick | `tox+oil -> 2dmg` (zwei Flags auf selber Zelle) |

Erweiterungsregel: nur neue Zeile in vector_logic.source.ts, nie neues System. Alle Zahlen sind Content — balancing ohne Code.

**Drift-Gleichung (Contract):**
```
starNorm = (fnv1a(genome_hash) % 1000) / 1000   // 0..0.999 aus discovery/chain.ts
activeCells = |vectors| + |attractors|           // sparse, nur aktive
drift = min(0.85, driftFor(activeCells) + starNorm * 0.2)   // Cap wie BREEDING.drift.cap
p(cell) = base * (1 + drift * localCharge)       // localCharge = heat/wet/oil auf Zelle
würfel: makeRng('world', deriveSeed(seed,'world','vector:gx,gy',tick,1)).next() < p
```
`driftFor` = `cap - (cap-start)*retain^(g-1)` (phenotype.source.ts:62, multiplikativ). Double-buffered: alt lesen, neu schreiben.

### 3.2 EffektVectoren — Optik (vector_visual.source.ts, je Vector 1 Zeile)

| Vector | paletteModifier | particleProfile | projectileProfile | impactProfile | statusVisual | sound |
|---|---|---|---|---|---|---|
| HEAT | `#fb923c` | `ember_burst` | `flame` | `flare` | flame | fire |
| WET | `#7dd3fc` | `bubble_pop` | `orb` | `splash` | drop | blub |
| OIL | `#57534e` | `bubble_pop` dunkel | `blob` | `splash` | drop (ölig) | blub |
| COLD | `#93c5fd` | `frost_mist` | `orb` | `shatter` | snow | frost |
| CHARGE | `#fde047` | `arc_jump` | `zig` | `crackle` | bolt | zap |
| ATTRACTOR | `#8b8fb3` | `ring_soft`+`trail_fast` | `orb` | `thud` | wind | hum |
| TOX | `#a3e635` | `spawn_spore`/`bubble_pop` | `blob` | `splash` | drop | blub |

Wiederverwendung bestehender Profile — kein neues Partikelsystem.

### 3.3 Pflanzen-Optik Anpassungen (phenotype.source.ts Achsen)

Kein neues Vokabular, nur bestehende Achsen belegen. Jede Vector-Quelle verschiebt Phänotyp sichtbar:

| Vector | Achsen-Shift (additiv, mit Gen-Stärke gewichtet) |
|---|---|
| HEAT | `pigmentA+0.75, thorns+0.35, relief+0.20, attack+0.25` (rötlich, dornig) |
| WET | `flowers+0.40, pigmentB+0.35, vigour+0.20, sway+0.20` (blütig, türkis) |
| OIL | `pigmentA+0.55, pattern+0.35, relief+0.35` (dunkel gesprenkelt) |
| COLD | `relief+0.45, pigmentA+0.10, flowerSize+0.15, sway-0.15` (vereist, starr) |
| CHARGE | `pattern+0.45, asymmetry+0.30, flowers+0.25` (gezackt, hell) |
| ATTRACTOR | `thickness+0.45, height-0.25, vigour+0.20, sway-0.30` (gedrungen, schwer) |
| TOX | `pigmentA+0.55, pattern+0.50, thorns+0.10` |

Größe-Regel (bleibt, skaliert Vector-Radius): `height -> range 0.85+height*0.35`, `thickness -> speed`, Topf `violet 1.2` -> Vector-Radius `base + floor(potFactor)`.

## 4. Engine-Architektur (Entscheidungen)

- Zwei Module: `ElementarVector` (Logik) und `EffektVector` (Optik) — 1 Wahrheit je Frage (AGENTS Regel 2: 1 Modul 1 Verantwortung, Regel 4: eine Wahrheit).
- Gravity = Attraktor-State, nicht Effekt. Wiederverwendbar für alle Objekte. Performance: N Projektile * M Orbits -> ParticlePool gebatcht + gecappt, Renderer batcht Layer — messen in Phase 7.
- Neuer Vector bricht nie bestehenden Code/Gate (User-Wichtig-Forderung).
- OP erlaubt weil vergänglich (TTL 60-180, danach 0). Flammenbrücke 6 Felder ist stark, nach 3s weg.
- Determinismus: rng(cell,tick) zustandslos + double-buffered -> FX ON/OFF bit-identisch, shuffle(activeCells) -> gleicher Hash.

## 5. Beetle-Follow-up (Notiz, nicht vermischen)

Gleiche Engine, defensive Palette — nur andere Content-Zeilen, kein Logik-Umbau:
- `BARRIER` (shield), `MEND` (regen), `RETALIATE` (reflect/thorns), `TAUNT` (attractor-light), `VEIL` (prismatic dodge)
- Balance defensiv, Logik identisch (validiert Skalierbarkeit). Eigene Phase 8, nicht in 1-7.

## 6. Offenes (Phase 2 zu entscheiden)

- Drift-Druck: `activeCells` allein oder `distinctMaterials+activeCells`? Empfehlung: `activeCells` reicht für Start, bei 12x12 ist Cap sonst zu schnell — Messung in Phase 7.
- Attraktor life: solange Quell-Pflanze lebt vs. festes TTL? Empfehlung: lebt mit Quelle, zerfällt 0.98 pro Tick nach Quellen-Tod (sauberer Attraktor-Wechsel bei Projektil-Tod).
