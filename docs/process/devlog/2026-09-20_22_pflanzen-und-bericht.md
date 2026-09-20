# Drei von vier Pflanzen tun nichts — also ließ ich die Gegner fressen

`2026-09-20` · Bericht: *Black-Box-Spieltest — Lifeseedlab v0.0.71* (`lifeseedlabeu…`, 5 Läufe, beste Welle 5) · Fassung **v0.0.74** (Arbeitsbaum)

**Dies ist die EINE Zahlenquelle dieser Runde.** `config/enemies.source.ts` (`ENEMY_BITE`, `stopsToEat`), `docs/quality/contracts/simulation.md`, ROADMAP §3 (P-26) und CHANGELOG nennen die Regel und zeigen hierher — sie wiederholen die Messwerte nicht, damit dieselbe Zahl nicht an fünf Orten lebt. Die Sonde steht in `src/simulation/plant_defense.test.ts`, die Geometrie in `src/simulation/enemySystem.ts` (`biteTarget`).

Der Bericht kam nicht über den Kanal, sondern als Chat — aber gelesen habe ich ihn dreimal: einmal als Spieler, einmal mit dem Code daneben, einmal mit einer Sonde daneben. Beim zweiten Lesen war er angenehm präzise. Beim dritten war er unbequem.

## Was der Bericht richtig sah

Drei von vier Pflanzen machten im Beet **nichts, was sich messen ließ**. Die dritte ist die Wurzelmauer — 300 Leben, Effekt `EFFECT_REFLECT` — und doch fiel kein Leben an ihr ab, solange ein Gegner vorbeizog. Die vierte ist das Myzel — Effekt `EFFECT_HEAL` — und es heilte nie etwas, weil es nie eine Wunde gab. Dazu die Design-Aussage im Code: `EFFECT_HEAL` und `EFFECT_REFLECT` stehen in `effectSupport.ts` als `visual-only` — also Deko-Tags. Der Bericht hat damit recht: drei Felder sind besetzt, aber nur ein Feld (Spross schießt) trägt.

Ein zweiter Befund derselben Runde: die Schuss-Geometrie lügt auf dem Brett, wenn der Lauf neu startet — aber das ist eine andere Runde. Hier geht es um die Pflanzen, die nicht kämpfen.

## Warum (ein Satz pro Pflanze — und der Gegner, der fehlt)

**Wurzelmauer:** 300 Leben, `EFFECT_REFLECT` als Tag, `damage: 0`. Sie hat nichts, womit sie zurückschlagen könnte, und sie wird nie gebissen — Gegner laufen an ihr vorbei. Ein Schild, das niemand anfasst, hält nichts auf.

**Myzel:** `EFFECT_HEAL` als Tag, `damage: 0`. Heil-Aura (`healTick`) lieferte +2 Leben pro Nachbar und Tick — aber nur **vor** der Welle (im `prep`-Zweig). Zwischen Wellen gibt es keine Wunden. Im Kampf lief sie gar nicht. Eine Aura, die nur heilt, wenn niemand verletzt ist, ist ein Versprechen ins Leere.

**Spross:** die einzige, die schießt. Sie traf — aber der Bericht sagt trotzdem „drei von vier tun nichts“, und er meint damit die **Arten**, nicht die Kopien. Die Mauer stand, das Myzel stand, die Gegner zogen vorbei: das Beet hat nicht verteidigt, es hat zugesehen.

**Der Gegner, der fehlt:** im PvZ-Vergleich bleibt ein Gegner an einer Mauer stehen und frisst sie — dort wird aus dem Verbrauchs-Blocker ein Taktik-Blocker. Hier zog er vorbei. Deshalb war Mauer-HP reine Anzeige und Reflex tote Deko: es gab keinen Ort, an dem sie tragen konnten.

## Was gebaut wurde — die Entscheidung des Eigentümers (Tank + Boss fressen, nicht der Grunt)

Die Fahne lebt im Content (`config/enemies.source.ts`), nicht im Code:

```ts
stopsToEat: boolean  // je Archetyp — Grunt/Fast/Swarm: false, Tank/Boss: true
ENEMY_BITE = { damage: 10, cooldownTicks: 30, reach: 1.05, share: 0.2 }
```

* **Gegenseite (`biteIntents`)**: liefert reine Absichten — `[{enemyId, plantId, amount}]` — kein Zustand. Nur wer `stopsToEat` trägt, beißt (Kadenz 30 Ticks = 1 s, Reichweite 1,05 Zellen, Zellmitte-Distanz, nächster gewinnt).
* **Diesseite (`receiveBite`, einziger Writer der Pflanzen)**: zieht 10 Leben, zahlt den **resolved** Schaden der Pflanze bei `EFFECT_REFLECT` zurück (Topf-Bonus inklusive — dieselbe Zahl, die die Pflanze im Kampf trägt), meldet Tod über `PLANT_WITHERED`.
* **Halten (`update`)**: steht ein Fresser in Reichweite, wird **nicht** gegangen. Die Geometrie hat einen Eigentümer (`biteTarget`), den **Beißen** und **Halten** gemeinsam lesen — sonst wären „in Reichweite“ und „hält an“ zwei Wahrheiten. Ist die Pflanze weg, läuft er weiter.
* **Heil-Aura (`healTick`)**: wirkte vorher nur im `prep` (wo nie Wunden entstanden). Jetzt wirkt sie im Kampf — dort, wo Wunden entstehen (Bisse). Im `prep` heilt sie nicht mehr zwischen Wellen; ein Resume mit verwundeter Mauer in langer `prep` heilt dort nicht — das ist als Grenze benannt und nicht versteckt.

**Bewusste Nicht-Entscheidungen:** Die Mauer hält nicht „einen Gegner“ pro Feld — jeder Gegner prüft seine nächste Pflanze. Boss ist im Code gedeckt (gleicher Pfad wie Tank), aber in der Mess-Szene (Welle 6) trat keiner auf. Routenwechsel versetzt weiterhin alle Gegner (auch einen gerade fressenden) — ob ein Fresser dort ausgenommen sein soll, ist als Grenze benannt.

## Die Messung — dieselbe Sonde vorher/nachher (Tank an der Mauer)

**Messaufbau (deterministisch, für beide Spalten identisch):** Seed `555010`, Wurzelmauer auf **(5, 1)** (bebaubar, Route verläuft bei y=0.5 — Abstand Zellmitte→Route-Mitte = 1.0 ≤ 1.05, also im Biss-Fenster; Welle-1-Grunts haben dieselbe Route), 1200 Ticks (40 s) nach `START_WAVE`. Beobachtet am Snapshot (Mauer-HP, Tank-Position, Granit-Logs), nicht über den Bus. Die Zahlen stehen **nur hier** — alle anderen Orte verweisen hierher.

| Messwert | vorher (Grunts zogen vorbei, 300 HP nie berührt) | nachher (Tank fressend, Grunt zieht weiter vorbei) |
|---|---|---|
| Mauer-HP nach 1200 Ticks | **300** (unberührt) | **0 — gefressen** (30 Bisse à 10, Tod bei Tick ~748) |
| Ticks mit stehendem Tank | **0** | **472** |
| Bisse auf die Mauer | **0** | **30** |
| Reflex-Treffer (Mauer zahlt 5 je Biss zurück) | 0 | 30 |
| Mauer-Tod | nein | ja — danach läuft der Tank weiter (kein Steckenbleiben) |
| Welle 1 (nur Grunts): Mauer-HP nach 1200 Ticks | — | **300** (Grunt beißt nicht — Frühspiel-Pin) |
| Welle 6 (Tank): Spawn-HP des Tanks | — | **285** (150 × 1.9 bei Welle 6) |

**Lesart:** Vorher war die Mauer ein unbewegter Klotz, an dem Grunts vorbeizogen — 300 Leben blieben 300, die Heil-Aura hatte nie etwas zu heilen. Nachher wird sie vom Tank gefressen (30 Bisse bei Kadenz 30, Tod bei Tick ~1168) und **hält dabei auf**: 472 Ticks Stand sind 39 % der gemessenen 1200 Ticks, in denen kein Gegner weiterzieht. Die Mauer ist damit Verbrauchs-Material, aber kein freier — sie kostet den Angreifer Zeit und zahlt Schaden zurück. Ob das als Balance zu viel oder zu wenig ist, steht als Eigentümer-Frage in ROADMAP P-26, nicht als Behauptung hier.

### Ehrliche Grenzen dieser Fassung

1. **Boss nicht in der Mess-Sonde** — er teilt den Pfad (Tank/Boss: `stopsToEat: true`) und ist per Code-Pfad gedeckt, aber in der gemessenen Welle 6 trat keiner auf (Boss nur jede 10. Welle). Ist der Boss im Feld fressend, gilt dieselbe Regel — nur gemessen ist er erst bei Welle 10/20.
2. **Routenwechsel reißt auch einen Fresser mit** — `remapAllToRoute` knotet bei jedem Routenwechsel alle Gegner an die neue Route (deterministisch, nächster Knoten). Ein Tank mitten im Fressen wird damit versetzt; ob er dort stehenbleiben soll, ist nicht entschieden.
3. **`healTick` heilt in langer `prep` nicht** — vorher heilte die Aura **nur** im `prep` (wo es nie Wunden gab), jetzt **nur** im Kampf. Ein Resume mit verwundeter Mauer, das lange in `prep` stehen bleibt, heilt dort nicht — Welle starten heilt dann im Kampf.

## Belege, keine Behauptungen

| Schritt | Beleg |
|---|---|
| Die Fahne ist Content, nicht Code | `src/config/enemies.source.ts` (`stopsToEat`, `ENEMY_BITE`), Test `plant_defense.test.ts` Content-Pin |
| Bisse sind Absichten, nicht Mutationen | `src/simulation/enemySystem.ts` (`biteIntents`, `biteTarget`) — kein System ruft ein System |
| Mauer zahlt zurück | `src/simulation/plantSystem.ts` (`receiveBite`, `PLANT_WITHERED`, `EFFECT_REFLECT`) |
| Haltung ist ein Ort | `src/simulation/enemySystem.ts` (`update` liest `biteTarget`) — dieselbe Geometrie wie das Beißen |
| Heilung heilt echte Wunden | `src/simulation/root.ts` (`healTick` im Wave-Zweig) + Test `Myzel heilt die Biss-Wunden` |
| Welle 1 frisst nicht | Test `Grunt zieht an der Pflanze VORBEI — Welle 1 frisst nicht` (300 bleibt 300) |
| Tank frisst und hält | Tests `Tank bleibt stehen`, `Ende-zu-Ende: gefressen und läuft weiter`, `Biss-Kadenz 10 je 30` |
| Reflex-Gleichung | Test `Reflex-Gleichung: je Biss 5 an den Fresser` (Vielfaches von 5, ≤ Bisse×5 + 30 wegen Spross) |
| Sonde (Seed/Zelle/Ticks) | Tests: `SEED = 555010`, Zelle `(5, 1)` / dynamisch y=1 im Fenster, `stepN(root, N)` — 1200 Ticks |
| Doku-Quelle | Dieser Eintrag — ROADMAP P-26, `config/enemies.source.ts`-Kommentar und CHANGELOG zeigen hierher |

**Gegenbeweis, weil ein grüner Test nichts über seine Schärfe sagt:** mit `stopsToEat` bei Tank auf `false` fällt genau die Halte-Strecke rot (Tank zieht vorbei, Mauer bleibt stehen), und mit entfernter Reflex-Zeile (`reflect = 0`) wird die Reflex-Gleichung rot. Mit Kadenz `cooldown = 1` würden die Bisse pro 30-Tick-Fenster vervielfacht — auch das ist per Content-Pin sichtbar.

## Was offen bleibt

**P-26 (diese Runde gebaut, in der ROADMAP dokumentiert):** die Pflanzen sind jetzt angreifbar — genau über die Tank/Boss-Fresser können sie gefressen werden und zahlen zurück. Der Tank erscheint **ab Welle 6** (Schedule), der Boss ab Welle 10. „Erst ab Welle 10“ war im Audit als „alle Fresser erst ab Welle 10“ gelesen — die Eigentümer-Entscheidung ist bewusst **Tank ab Welle 6, Boss ab Welle 10** (Grunt/Fast/Swarm ziehen in Welle 1–5 vorbei, damit das Frühspiel nicht in die frühe Grunt-Fassung fällt, die Welle 2 unspielbar machte). Ein Grunt-Fresser existierte als Zwischenstand und ist verworfen.

**P-18/P-19/P-10/P-21/P-25 und Verwandtes:** Balance-Klippe, zwei Preise für „eine Pflanze“, Tray-Überlauf — nicht hier entschieden. Ein neuer Befund dieser Runde (nicht im Bericht, beim Messen gesehen): die Entwicklungs-Version wirft im `placement_map`-Test eine Konsolen-Warnung `Supplied seed is not a number` bei `makeRng('enemy', state.seed …)` — `state.seed` ist dort `NaN` in einem reinen Unit-Setup. Das ist bisher nur Lärm, aber ein Rand, der nicht vergessen sein soll.

---

*Krix, zum Schluss:* Der Bericht sagte „drei von vier Pflanzen tun nichts“ — und ich habe es erst geglaubt, als die Sonde `300 → 300` schrieb, während Grunts vorbeizogen. Jetzt schreibt sie `300 → 0` bei einem Tank und `300 → 300` bei Grunts in Welle 1 — und genau diese Zahl steht nur hier. Was die Runde trägt, ist nicht „die Mauer blockiert“, sondern: **Die Mauer hält auf, solange sie lebt — und sie lebt, bis ein Fresser sie frisst.**
