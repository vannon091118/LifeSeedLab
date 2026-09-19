# Contract: Meta-Lebenszyklus — Run-Identität, Zucht-Queue, Ökonomie

**Owner (genau einer):** `src/meta/*` — `store.ts` (Save-Schema + Heilung), `run.ts` (Run-/Zucht-Operationen), `economy.ts` (Reife-Gates, Shop-Logik)
**Writer:** je Slice genau einer; `MetaSave` hat genau einen Writer pro Operation (load → mutate → persist in einem Schritt)
**Readers:** App/Router (lesend), Screens (lesend), Sim-Start (`RootInit`)
**LOC-Caps:** 200 (Code-Zeilen)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Kernregel dieser Domäne: „persistiert wird nie eine Kopie" — jeder Schreibvorgang startet bei `loadMeta()`. Identität kommt aus einem monotonen Zähler, nie aus `max`/`length`/`last` eines Fensters.

---

## A9. `src/App.tsx` — DEFECT (run identity)

- `runSeed = deriveSeed(GAME_SEED, 'world', 'run', meta.runs + runKey)`: `runKey` is session-local React state ⇒ seed collides across sessions; `SimState.runCounter` dead. REPAIR (B1): `runId = meta.runs + 1` at run start; seed derived from `runId`; `runId` passed to `RootInit` and banked into meta at run end. One authority, persisted.

## A13. Lifecycle-Identität, Snapshot-Grenzen & Doku-Verweise — DEFECT + INCOMPLETE (Nachtrag ebb4913)

Status bei Aufnahme: **154/154 Tests grün, `tsc` clean.** Jeder Befund wurde an der Quelle gelesen bzw. ausgeführt, nicht angenommen.

### A13.1 DEFECT (verifiziert, kritisch) — `broodIndex` wird recycelt ⇒ doppelte Brut-Identitäten · **REPARIERT (B14.1–B14.3)**

`enqueueBrood` (`meta/run.ts`) leitet den nächsten Index aus dem **aktuellen Fenster** ab:
`meta.pendingBroods.reduce((m,p) => Math.max(m, p.broodIndex), -1) + 1`. Das ist als Aggregation reihenfolge-unabhängig (im Gegensatz zu `arr[arr.length-1]`), aber **nicht stabil**: `claimBrood` entfernt die Brut mit dem höchsten Index aus dem Fenster. Paart der Spieler danach **dieselben Eltern** erneut, fällt der Maximalwert zurück und der bereits verbrauchte Index wird erneut vergeben. `rollBrood` verwendet den Index als RNG-Namespace-Parameter (`deriveBroodSeed(A, B, generation)`) und bildet die Specimen-ID daraus (`brood_<seed>_<i>`) ⇒ identische Brut, identische ID. Ergebnis: `meta.beetles` enthält zwei Specimen mit **derselben `id`** (Doppel-Identität bei `key`, Lookup und Deploy-Spec).

Beweis: `src/meta/brood_identity.test.ts` (zuerst als Ist-Zustands-Beweis geführt, mit B14 in den Soll-Zustand gedreht).

### A13.2 DEFECT — zweite Ableitungsquelle für dieselbe Wahrheit · **REPARIERT (B14.1)**

`BeetleLab.tsx` berechnet `nextGen` mit **derselben** `reduce`/`Math.max`-Formel ein zweites Mal, um die Vorschau zu rendern. Vorschau und Enqueue können auseinanderlaufen („genau eine Quelle pro Wahrheit" verletzt; Ownership-Regel 2).

### A13.3 INCONSISTENT — der Pflanzen-Pfad hat den Zähler schon · **REPARIERT (B14.1)**

Pflanzenzucht ist korrekt monoton: `crossIndex = meta.breedGeneration` (persistiert, nie rückwärts). Der Käfer-Pfad ist die einzige Stelle im Repo, die eine Entitäts-Identität aus einem **schrumpfenden Array** ableitet. Das ist ein Musterfehler, kein Einzelfall-Zufall.

### A13.4 DEFECT — order-abhängige First-Match-Zugriffe und ein invertiertes Gate · **REPARIERT (B14.4)**

- `claimBrood` → `pendingBroods.find(p => p.broodIndex === idx)`, `Greenhouse.crossReady` → `pendingCrosses.find(...)`: **erster Treffer gewinnt** ⇒ bei doppelter Kennung entscheidet die Array-Reihenfolge über das Ergebnis.
- `crossReady` gibt bei **unbekanntem** `crossIndex` `true` zurück („nicht gefunden = reif") ⇒ fail-open. Ein Gate darf fail-closed sein.

### A13.6 INCOMPLETE — `keepCross` ist nicht atomar · **REPARIERT (B14.5)**

`keepCross` (`meta/run.ts`) persistiert in **drei** Schritten: `updateMeta(counts)` → `registerVariant()` → `updateMeta(bredStats)`. Genau der Zwischenzustand („Eltern verbraucht, kein Kind registriert"), den `consumeSeedAndEnqueueCross` für den Sow-Pfad geschlossen hat, ist hier offen. Die Härtung wurde nicht symmetrisch angewandt.

### A13.7 INCOMPLETE — drei Ableitungen von „ist die Brut reif" · **REPARIERT (B14.4)**

`advanceCrossMaturation` (gibt `number[]` zurück, **kein** Aufrufer nutzt den Rückgabewert), `Greenhouse.crossReady` (eigene Wave-Arithmetik) und `readyBroods` (Käfer-Parallele) prüfen dieselbe Bedingung mit je eigenem Code. `advanceCrossMaturation` liefert zudem einen `number[]`-Rückgabewert ohne Vertrag (Seeds, nicht Indizes) — totes Interface mit Irreführungspotenzial.

### A13.8 INCOMPLETE — `structuredClone` im 10-Hz-Hot-Path · **OFFEN (B14.7, Mid-Term: erst messen)**

Seit ebb4913 liefern `getSnapshot()`/`getEventLog()` Tiefkopien (korrekt gegen Fremd-Mutation). `GameView` ruft `getSnapshot()` aber alle 100 ms im RAF-HUD-Intervall, `DevOverlay` pro Tick ⇒ Voll-Klon von `plants`/`enemies`/`projectiles` als Dauerlast. Gegen das B12-Budget (frame ≤ 16 ms, sim ≤ 2 ms, 390×844) ist das ungemessen.

### A13.11 Die systematische Frage — wo sonst leitet Code Identität aus einem Fenster ab?

Prüfmuster für den Rest des Repos: jede Entitäts-Kennung muss aus einem **monotonen Zähler** oder einer **injektiv ableitbaren** Quelle kommen — nie aus `max`/`length`/`last`/`find` eines Fensters.

Geprüfte Kandidaten, gelesen und ohne Window-Befund: `nextId` (`ids.ts`: monotones `counters[kind]`), `MetaSave.runId`/`runs` (`reserveRunId`), Kappungen von `savedVariants`/`beetles` (bewusst verlustbehaftet, betreiben keine Identität), `discovery/chain.ts` (append-only, Hash-verkettet), `SimulationRoot.pendingKills` (privater Puffer, wird pro Tick vollständig geleert — kein Fenster).

**Offen (nicht verifiziert, eigener Prüfpunkt):** `nextScopedId` (`ids.ts`) leitet die Kennung nicht-monoton aus einem Hash ab (`h % 9000 + 1`) — theoretisch kollidierbar für verschiedene `(runOrMatchId, kind, seq)`. Keine Reproduktion versucht; bei Bedarf als eigenes Gate prüfen.

### A13.12 DEFECT (verifiziert, kritisch) — die pflanzliche Zucht-Schleife ist unerreichbar

`totalWavesSurvived` wird **ausschließlich** in `advanceCrossMaturation` geschrieben, und `advanceCrossMaturation` wird **ausschließlich** aus dem `GAME_OVER`-Handler von `GameView` gerufen. `App.tsx` ist ein `switch (screen)`-Router — es ist immer genau ein Screen gemountet. Daraus folgt zwingend:

1. Der Reifungszähler kann sich nicht erhöhen, während `Greenhouse` gemountet ist.
2. Jede Aussaat setzt `startedWave = totalWavesSurvived` und `neededWaves = wavesToUnlockFor(crossIndex) ≥ 2`, ist also unmittelbar nach dem Aussäen **nie** reif.
3. Der einzige Moment, in dem eine Kreuzung reif wird, ist `GAME_OVER` — und in genau diesem Moment (a) wird `Greenhouse` nicht gerendert, sodass `lastRoll` (React-State) verloren ist, und (b) hat `advanceCrossMaturation` den Eintrag vor diesem Arbeitsgang **aus der Queue gelöscht und seinen Seed verworfen**.

Ergebnis: „Behalten" ist im ausgelieferten Zustand **nicht auslösbar** — der Reifungsschritt zerstörte genau das, was er reifen ließ. Die Reifungs-Queue enthält außerdem keine Beanspruchungs-Oberfläche; der deterministisch gespeicherte `PendingCross.seed` ist damit toter Zustand. Mit B14.4 ist das **Datenverwerfen** behoben (gereifte Einträge bleiben erhalten), die **Erreichbarkeit** bleibt offen → B15.

### A13.13 DEFECT (verifiziert) — `rollGachaCross` hängt von der Reihenfolge der Besitzliste ab

`rollGachaCross` bildet `indexed = owned.map((v, i) => …)` und zieht Eltern über `rng.pickWeighted(indexed, …)` — also **positionsabhängig**. `owned` stammt aus `Object.keys(meta.variantCounts)` (Einfüge-Reihenfolge) und ändert sich, sobald Eltern verbraucht werden. Der Kommentar „Kind ist bei Aussaat schon deterministisch fest" gilt daher nur, solange die Besitzliste byte-identisch ist: allein aus `PendingCross.seed` ist das Kind **nicht** reproduzierbar. Für die Queue-Beanspruchung (B15) ist das blockierend, weil sie das Kind aus dem Seed rekonstruieren muss. Fix: kanonische Sortierung der Besitzliste (z. B. nach `id`) **vor** dem Gewichten — dann hängt der Wurf nur noch von Seed und Besitz-**Menge** ab.

**Reproduktion:** `resolveBreedTargets`-Reihenfolge vs. Seed — als Gate in B15.4 zu fixieren (nicht in diesem Durchgang, da es bestehende Wurf-Ergebnisse verändert und damit Balancing berührt).

### A18. DEFECT-Klasse (verifiziert) — fail-open-Geschwister des B14-Fehlers

Ausgangspunkt war ein externes Review von `d06afa4`; jeder Punkt wurde gegen den Code geprüft, bevor er galt — zwei Behauptungen des Reviews waren falsch und sind hier **widerlegt** (A18.7).

### A18.1 DEFECT (behoben) — `claimBrood` war fail-open

`rolled[chosenIndex] ?? rolled[0]` wählte bei ungültigem Kandidaten-Index stillschweigend 0; die Reife wurde ausschließlich in der UI über `readyBroods` geprüft — eine Gameplay-Entscheidung in der Komponente (Verbotspunkt 3). Jetzt: Reifeprüfung **in** `claimBrood` (`isMatured`), unbekannter Kandidat ⇒ unverändert, unbekannter `broodIndex` ⇒ unverändert. Alle drei Pfade test-gelockt (`brood_identity.test.ts`).

### A18.2 DEFECT (behoben) — `keepCross` war über den optionalen Index umgehbar

Schlimmer als im Review: der Bypass war **als Vertrag test-gelockt** (`brood_identity.test.ts`, „kommt ohne crossIndex aus (Rückwärtskompatibilität des Aufrufs)"). Der Kommentar an `keepCross` nannte die Ausbuchung den EINZIGEN Ort, an dem die Queue schrumpft — der Ort war aber freiwillig. Jetzt: `crossIndex` verpflichtend, Reifeprüfung **in** `keepCross` vor jedem Verbrauch (fail-closed); der alte Test ist invertiert und beweist jetzt das Gegenteil.

### A18.3 DEFECT (behoben) — Kappung hinterließ hängende Referenzen

`applyRegisterVariant` kappte `savedVariants` auf 60 und löschte die `variantCounts` der Verdrängten — aber nicht deren `bredStats` (unbegrenztes Wachstum) und nicht ihren `loadout`-Eintrag (Phantom-Referenzen). Jetzt räumt die Kappung alle drei mit. **Nicht behoben und bewusst offen (Design-Entscheidung, Spielerebene):** dass überhaupt gekappt wird, während die Discovery-Chain „erste Entdeckung ist für immer" verspricht — die Chain lebt in ihrem eigenen Store (`discovery/codex.ts`, `CODEX_KEY`) und ist davon unberührt, aber das Inventar wirft die älteste Züchtung weg, ohne den Spieler zu fragen. Entweder Bestand kappen statt Identität, oder der Spieler entscheidet.

### A18.6 DEFECT (behoben) — das Reife-Kriterium existierte zweimal

`isCrossReady` (Pflanzen) und `readyBroods` (Käfer) duplizierten dieselbe Arithmetik. Jetzt: `isMatured(startedWave, neededWaves, total)` ist DAS Kriterium, beide Gates rufen es.

### A18.7 WIDERLEGT — zwei Review-Behauptungen, die der Code nicht trägt

1. **„`recordRunEnd()` wird nicht aufgerufen"** — falsch: `GameView.tsx:162` ruft es event-getrieben im `GAME_OVER`-Handler (`e.payload.wave`, genau die B15.2-Vorbereitung).
2. **„`applyRegisterVariant` bricht die Discovery-Chain"** — falsch: die Chain lebt in einem eigenen Store (`discovery/codex.ts`, `CODEX_KEY`, append-only, hash-verkettet) und ist von der Inventar-Kappung unberührt. Der echte, getrennte Befund ist A18.3.

Zusätzlich verkannt: die Migrationskette in `store.ts` ist bewusst **Normalisierung** (`toCurrent(defaultMeta(), old)` aus jeder Version 1–4), kein `while`-Loop nötig — das reale Persistenzproblem war der Downgrade-Pfad (A18.4). Lehre: Ein Review, das Existenz statt Nutzung prüft, produziert dieselbe Fehlerklasse, die es anprangert.

### A19. DEFECT (verifiziert an Code **und** Live-Save) — die Meta-Wahrheit lag im React-State, nicht in der Persistenz

Spielbericht: „keine Runde bringt was, die States werden nur für die erste Runde getrackt und Samen keimen nicht." Jeder Punkt wurde gegen den Code und gegen den echten Browser-Save geprüft (`localStorage['lifegamelab_meta']`).

**A19.1 — Der Run-Start schrieb eine veraltete Kopie zurück. FIXED (B17.1).**
`App.tsx:handleStartRun` reservierte die `runId` auf dem React-State des Routers und persistierte diesen State: `persistMeta(reserveRunId(meta))`. Während eines Runs schreibt die Simulation aber **direkt** in die Persistenz (`advanceCrossMaturation` je überstandener Welle), ohne den Router zu informieren. Die Kopie war damit älter als die Wahrheit — und überschrieb sie bei jedem Run-Start. Beleg im Live-Save: `runId: 3` bei `runs: 2`; Beleg im Gate: `brood_loop.test.ts` (B17.1 überlebt, B17.2 dokumentiert die alte Form als Verlust). Fix: `meta/run.ts:beginRun()` reserviert auf `loadMeta()`.

**A19.2 — Das Menü zeigte nach dem Run die Kopie statt der Wahrheit. FIXED (B17.1).**
`handleExitRun` wechselte nur den Screen. Das Gewächshaus rechnete danach mit dem `totalWavesSurvived` von **vor** dem Run — und schrieb beim Säen genau diesen Wert als `startedWave` in die Kreuzung. Fix: beim Verlassen frisch lesen.

**A19.3 — Kreuzungen mit `startedWave` in der Zukunft reifen nie. FIXED (B17.3).**
Aus A19.2/​A19.1 kombiniert entstanden Einträge mit `startedWave > totalWavesSurvived`. Das Reife-Kriterium ist `total - started >= needed` — bei negativem Wertebereich ist die Kreuzung **garantiert** unreif, dauerhaft. Das ist das exakte Bild „Samen keimen nicht". Fix: `store.ts:healRipeness` bei **jedem** Load, nicht nur im Migrationspfad — die Storage-Schicht reicht Saves der aktuellen Version unverändert durch, eine Heilung nur im Migrationszweig liefe für genau die Saves nie, die sie brauchen. Sie ist idempotent, konservativ (kein Gratis-Fortschritt: der Eintrag beginnt ab jetzt zu warten) und gilt über dasselbe Kriterium auch für Bruten.

**A19.4 — OFFEN: Woher kommt eine neue Pflanze? (Design-Entscheidung)**
Der Live-Save zeigt `variantCounts: { sprout: 0, rootwall: 0, cross_p0pn4p_0: 1 }` — genau **eine** besessene Pflanze. `MainMenu` sperrt das Gewächshaus bei `ownedVariants.length < 2`, `Greenhouse.canSow` verlangt dasselbe. Ein einziger `keepCross` verbraucht die beiden Start-Pflanzen (2→1, test-gelockter Vertrag in `cross_lifecycle.test.ts`) — und es gibt **keinen Weg zurück**: der Shop verkauft Samen, aber ein Samen wird zum Kreuzungs-Ticket, nicht zum Bestand (`registerVariant` hat keinen Aufrufer).
Folge: Nach der ersten erfolgreichen Kreuzung ist die Zucht dauerhaft tot, unabhängig davon, wie viele Runden gespielt werden — genau das gemeldete „keine Runde bringt was". Die Start-Pflanzen sind laut Source (`economy.source.ts`: „genau 2 Pflanzen zu Beginn") der Anfangsbestand; dass der erste Keep diesen Bestand unter die eigene Startregel drückt, ist kein Gleichgewicht, sondern eine Sackgasse.

**A19.5 — OFFEN: Was zählt als Reifungs-Fortschritt? (Design-Entscheidung)**
Die Reifung hängt an **überstandenen** Wellen (B15.2). Wer mit zwei Pflanzen in Welle 1 stirbt, bekommt nichts. Vor B15.2 zählte der Run-Tod die erreichte Welle (+1 pro Runde) — das war faktisch die einzige Fortschrittsquelle im aktuellen Schwierigkeitsgrad. Die strengere Kopplung war als Korrektur richtig (der Zähler soll nicht am Tod hängen), aber als einzige Quelle macht sie „jede Runde bringt etwas" unmöglich.

**A19.6 — DEFECT (verifiziert): das Loadout ist nicht bedienbar — gezüchtete Pflanzen erreichen den Run nie.**
`toggleLoadout` (der einzige Writer des Loadouts) hat in `src/` **keinen Aufrufer**; `MainMenu:97` rendert unter der Überschrift `t('menu.loadout')` („LOADOUT (n)") die **Sammlung** (`ownedVariants`), nicht den Loadout. Folge: `meta.loadout` bleibt dauerhaft leer, `root.ts` startet jeden Run mit `STARTING_INVENTORY` (1 Sprout + 1 Rootwall) — `for (const id of loadout) inventory[id] = 2` läuft nie —, und `savedVariants.filter(v => loadout.includes(v.id))` liefert immer eine leere Liste, sodass auch die aufgelösten Visuals der gezüchteten Pflanzen den Run nie erreichen.
Damit ist der einzige Ort, an dem Zucht spielbar wird, unerreichbar: **jede Runde ist identisch**, egal wie viel gezüchtet wurde. Das ist der stärkste Beleg für die Meldung „keine Runde bringt was" — stärker als jede Zählerfrage. Vom E2E nicht auffindbar: `router.spec.ts` prüft nur, dass der Text `/LOADOUT/i` sichtbar ist (und der ist sichtbar — nur ohne Bedeutung).

## B1. Run identity & loadout (repair: App.tsx, meta, root.ts)

- `MetaSave` v2 adds: `runId: number`, `breedGeneration: number`, `loadout: string[]` (≤ 4 variant ids).
- Run start: `runId = meta.runs + 1` → `runSeed = deriveSeed(GAME_SEED,'world','run',runId,1)` → `RootInit { seed, runId, loadout }`.
- `freshState`: `discoveredVariants` = source ids ∪ loadout ids; `inventory` = STARTING_INVENTORY ∪ loadout×2; `runCounter = runId`.
- `BreedingLab` "Keep": consumes 1× of each parent count, increments `breedGeneration` (persisted), registers child.

## B14. Lifecycle-Identität, Snapshot-Budget & Reife-Gates (Auftrag aus A13)

Ziel: **jede Entitäts-Identität ist monoton und global eindeutig; jedes Gate ist fail-closed; jede Wahrheit hat genau eine Ableitung.**

### B14.1 Monotoner Brut-Zähler statt Fenster-Maximum

`MetaSave` erhält `broodGeneration: number` (monoton, persistiert). `enqueueBrood` liest `broodGeneration` als `broodIndex` und schreibt `+1` im **selben** `updateMeta`-Schritt. `rollBrood(A, B, generation)` bekommt genau diesen Wert — Vorschau und Enqueue leiten ihn aus derselben Quelle ab (A13.1, A13.2). Kein `reduce`/`Math.max` über `pendingBroods` mehr, auch nicht in `BeetleLab.tsx`.

### B14.2 Migration v4 → v5 (kein Identitätsverlust, keine Doppelkennung)

Altsaves setzen `broodGeneration = max(pendingBroods[].broodIndex, beetles[].generation) + 1` (untere Schranke 0). Damit kann ein nach der Migration erzeugter Brutling keine bestehende Kennung wiederverwenden. `META_VERSION` → 5; `migrate` akzeptiert 1–4; `toV3` wird zu `toCurrent` (kein zweiter Migrationspfad).

### B14.3 Identitäts-Gate (Regressionstest)

Gate: Nach `claimBrood` und erneuter Paarung **derselben** Eltern darf keine `BeetleSpecimen.id` doppelt in `meta.beetles` liegen (geprüft im P6-E2E-Sweep, kein dediziertes Testfile) und kein `broodIndex` doppelt in `meta.pendingBroods`. Der dafür gebaute Test (heute Teil der Meta-Suite) wird auf den Soll-Zustand gedreht (Erwartung invertiert).

### B14.4 Ein Reife-Gate, fail-closed

Genau **eine** Ableitung „ist diese Kreuzung/Brut reif": `meta/` exportiert `isCrossReady(meta, crossIndex)` und `readyBroods(meta)`; UI liest nur. Unbekannter `crossIndex` ⇒ **nicht** reif (A13.4). `advanceCrossMaturation` verliert den ungenutzten `number[]`-Rückgabewert (A13.7).

### B14.5 Symmetrische Atomarität für `keepCross`

`keepCross` führt Elternverbrauch, Kind-Registrierung und `bredStats`-Ableitung in **einem** load→mutate→persist-Zyklus aus (Muster von `consumeSeedAndEnqueueCross`) — kein Zustand „Eltern verbraucht, Kind fehlt" (A13.6).

### B14.6 Inhalts-Integrität statt Darstellungs-Integrität

Die Checksumme in `persistence/storage.ts` wird **kanonisch** gebildet (stabile Key-Sortierung vor dem Hash), sodass Umsortierungen von Keys gültige Saves nicht quarantänisieren. Bestehende Saves bleiben lesbar (Checksumme wird beim nächsten Schreiben kanonisiert) (A13.5).

### B14.7 Snapshot-Budget

`getSnapshot()` bleibt die defensive Kopie, aber der 10-Hz-HUD-Pfad in `GameView` klont nicht mehr den vollen `SimState`: entweder gedrosseltes Intervall oder eine flache HUD-Projektion (Wave/Energie/Leben/Combo/Inventar/Phase). Gemessen gegen B12 (frame ≤ 16 ms, 390×844) (A13.8).

### B14.8 DoD für B14 — **erfüllt (B14.1–B14.6)**

- [x] `broodGeneration` in `MetaSave` v5 + Migration v1–v4 getestet (Altsave ohne Feld ⇒ Startwert = höchste vergebene Kennung + 1)
- [x] Keine Identitäts-Ableitung aus `max`/`length`/`last` eines Fensters (Gate-Test B14.3 grün)
- [x] `BeetleLab` liest den Zähler, leitet ihn nicht selbst ab
- [x] `isCrossReady` fail-closed + genau ein Gate-Aufrufpfad (`Greenhouse`)
- [x] `keepCross` ein Persistenzschritt; Test: fehlender Elternteil lässt Eltern **und** Queue unangetastet
- [x] Kanonische Checksumme: umsortierte Keys ⇒ **kein** Quarantäne; echter Inhalts-Betrug ⇒ weiterhin Quarantäne
- [x] `tsc` clean, Suite grün (**170 Tests, 20 Dateien**), `vite build` grün
- [x] Keine LOC-Cap-Verletzung (`meta/store.ts`, `meta/run.ts`, `meta/economy.ts` ≤ 200; `persistence/storage.ts` ≤ 250 lt. Dateiheader)

**Nicht in B14 enthalten:** B14.7 (Snapshot-Budget) bleibt offen und ist als Messauftrag klassifiziert — er gehört zu B12, nicht zur Korrektheits-Schiene.

## B15. Zucht-Schleife erreichbar machen (Auftrag aus A13.12/A13.13) — **UMGESETZT (2026-09-15)**

Ziel: „Aussäen → reifen → behalten" wird tatsächlich spielbar, und das Kind ist aus dem gespeicherten Seed **reproduzierbar**.

### B15.1 Beanspruchung aus der Reifungs-Queue

Jeder gereifte `PendingCross` bietet in `Greenhouse` seine Beanspruchung an. Das Kind wird ausschließlich aus den persistierten Feldern rekonstruiert (`rollGachaCross(owned, entry.seed, entry.crossIndex)`) — kein React-State über den Screen-Wechsel hinweg. Die Queue-Zeile zeigt bei Reife Kind + Beanspruchen-Knopf, sonst die **verbleibenden** Wellen.

### B15.2 Reifung an Wellen koppeln, nicht an den Run-Tod

Der Reifungszähler darf nicht allein an `GAME_OVER` hängen (A13.12). Kandidat: `waveSystem` meldet `WAVE_COMPLETED`, `GameView` bündelt den Zähler-Fortschritt gedrosselt (nie pro Frame, nie im RAF-HUD-Pfad) und schreibt ihn **einmal** beim Run-Ende plus optional beim Wellenwechsel. Kein zweiter Writer auf `totalWavesSurvived`.

### B15.3 Ehrliche Anzeige

Die Reifungs-Zeile nennt verbleibende Wellen (nicht die Gesamtanforderung) und markiert gereifte Einträge sichtbar. Keine stillen Verluste: was in der Queue steht, ist beanspruchbar.

### B15.4 Reihenfolge-Unabhängigkeit des Wurfs (A13.13)

Die Besitzliste wird **kanonisch sortiert**, bevor sie gewichtet wird — der Wurf hängt dann nur von Seed und Besitz-**Menge** ab. Gate-Test: derselbe Seed + dieselbe Besitz-Menge in unterschiedlicher Array-Reihenfolge ⇒ identisches Kind. Dieser Fix ändert bestehende Wurf-Ergebnisse (Balancing) und wird deshalb bewusst separat ausgerollt.

### B15.5 DoD für B15 — **erfüllt (2026-09-15)**

- [x] Aussäen → Welle(n) → Beanspruchen ist in einem Score-Durchlauf **ohne** Screen-Wechsel-Verlust möglich (Reifung tickt pro Welle, Queue-Zeile zeigt das Kind + Beanspruchen-Knopf)
- [x] Gate-Test: Rekonstruktion des Kindes aus `PendingCross.seed` == beim Aussäen angezeigtes Kind (`src/meta/brood_loop.test.ts`)
- [x] Gate-Test B15.4 (Reihenfolge-Unabhängigkeit) grün — inkl. Gegenprobe, die den alten positionsabhängigen Pfad widerlegt
- [x] Kein Eintrag verschwindet aus der Queue, ohne beansprucht worden zu sein (Ausbuchung ausschließlich in `keepCross`)
- [x] 390×844 geprüft (E2E-Suite grün; Queue-Zeile + Knopf im bestehenden Layout, kein Hover-Zwang)
- [x] `tsc` clean, Suite grün (198/198), `vite build` grün

**Ehrliche Grenze (dokumentiert, nicht defekt):** B15.4 garantiert Reihenfolge-Unabhängigkeit — **nicht** Bestandsunabhängigkeit. Die Rekonstruktion nutzt die jetzige Besitz-Menge; wird ein Elternteil zwischen Aussaat und Reife verbraucht, kann der Wurf anders ausfallen. Die Queue-Zeile zeigt dann ehrlich „Eltern weg" statt eines falschen Kindes. Der Persistenz-Seed garantiert das Kind bei unveränderter Besitz-Menge.

### B16.8 Kappungs-Politik — **ENTSCHIEDEN (2026-09-15): Identität ist unverletzlich**

Entscheidung: `savedVariants` und `beetles` werden **nicht gekappt** — weder still noch per Spieler-Wahl. Begründung, jede Stufe im Code belegt:

1. Die Bibliothek wächst ausschließlich durch `keepCross`, und `keepCross` verbraucht je 1× beider Eltern (2→1-Regel) — der Bestand (`variantCounts`) ist bereits ökonomisch begrenzt: Eine Pflanze der Generation n hat 2ⁿ Samen gekostet. Eine Kappung wäre eine zweite Bremse hinter einer bestehenden.
2. Identität zu kappen bricht das Discovery-Chain-Versprechen („erste Entdeckung ist für immer"): Die Chain erinnert sich, das Inventar nicht — die Entdeckung wird zu totem Gewicht (nicht einsetzbar, nicht weiterzüchtbar).
3. Ein Brut-Cap hätte `beetleDeployed` (Meta-Referenz auf eine Specimen-ID) verwaisen können — dieselbe Fehlerklasse wie A18.3.

Das „Spieler-Entscheidung"-Modell wurde bewusst abgelehnt: Es baut UI für ein Problem, das die 2→1-Regel nicht hat. Kappung löst ein Wachstumsproblem, das ohne Kappung nicht existiert — sie kostet dafür Vertrauen.

**Umsetzung:** Die Hardcode-Caps (60/40, Verbotspunkt 6) sind aus `meta/run.ts` entfernt; das Miträum-Muster aus A18.3 bleibt als Regel dokumentiert, falls je wieder ein Cap eingeführt wird. **Invarianten sind test-gelockt** (`src/meta/cross_lifecycle.test.ts`, 5 Gates): kein Pfad verlässt einen Eintrag aus Bibliothek/Brut-Lager; jede Loadout-ID existiert; `bredStats` kennt keine Fremd-IDs; `beetleDeployed` verweist nie auf eine entfernte Specimen. Bringt jemand ein Cap zurück, schlagen diese Tests und erzwingen die Miträum-Pflicht.

**Offen (Mid-Term, Messschiene):** das reale Wachstum der Bibliothek messen — die 2ⁿ-Kostenkurve macht großes Wachstum unwahrscheinlich, aber gemessen statt behauptet wird es gegen B12 (Save-Größe / Snapshot-Budget).

## B17. Persistenz-Wahrheit & Bestandskreislauf (Auftrag aus A19)

### B17.1 Eine Wahrheit: persistiert wird nie eine Kopie — **UMGESETZT (2026-09-15)**

Jeder Meta-Schreibvorgang geht von `loadMeta()` aus; der Router hält keine schreibbare Kopie mehr.

- `meta/run.ts:beginRun()` reserviert die `runId` auf der persistierten Wahrheit und persistiert genau das. `App.tsx` ruft nur noch `setMeta(beginRun())`. (`persistMeta`/`reserveRunId` sind aus dem Router verschwunden.)
- `handleExitRun` liest beim Verlassen frisch — der Menü-Screen zeigt den echten Stand, nicht die Kopie von vor dem Run.
- Lock: `src/meta/brood_loop.test.ts` — B17.1 (Fortschritt überlebt den Run-Start) **und** B17.2 als Gegenprobe, dass die alte Form ihn verliert.

### B17.2 Kein Eintrag darf in der Zukunft begonnen haben — **UMGESETZT (2026-09-15)**

`store.ts:healRipeness` hebt `startedWave` bei jedem Load auf `totalWavesSurvived` (`≤`, idempotent, konservativ). Gilt für `pendingCrosses` und `pendingBroods` über dasselbe Kriterium (A18.6). Lock: `brood_loop.test.ts` B17.3.

### B17.3 Bestandsquelle entscheiden — **UMGESETZT (2026-09-15, Option A)**

Ein Samen ist heute ein Kreuzungs-Ticket, kein Bestand: `buySeed` → `seedStash` → `consumeSeedAndEnqueueCross`. Damit gibt es nach dem ersten Keep keinen Weg zu einer zweiten Pflanze (A19.4). Drei Ausgänge:

| Option | Wirkung | Preis |
|---|---|---|
| **A — Samen keimt zur Pflanze** | Ein gekaufter Samen wird Bestand (neue Basisklasse, deterministisch aus dem Samen-Index). Der Shop wird zur Bestandsquelle. | Neue Meta-Operation + UI; die „Reifung" verliert ihre Rolle als Bestandsquelle |
| **B — Basis-Arten sind Saatgut** | Die zwei Start-Pflanzen sind unerschöpflich (nie unter 1). | Ändert den test-gelockten Keep-Vertrag (Elternverbrauch gilt dann nur für gezüchtete Pflanzen) |
| **C — A und B** | Samen keimen **und** die Basis bleibt Saatgut. | Zwei Wege zum Bestand — muss begründet werden, sonst doppelte Wahrheit |

**Entscheidung: A, umgesetzt.** `buySeedAndGerminate(price, index)` ist **ein** atomarer Schritt (Nektar → Bestand, fail-closed ohne Nektar); der Shop ruft ihn direkt — der Umweg über ein bloßes Ticket (`seedStash`) im Kaufklick wäre ein Nektar-Drift gewesen (erster Klick zahlt, zweiter keimt gratis). Keim-Variante: `germinateVariant(index)` = Basisform aus `PLANTS_SOURCE` + Identität `seed_{index}` aus `deriveSeed(GAME_SEED,'plant','seed',index)` — derselbe Index ergibt weltweit dieselbe Pflanze. Die elteren `germinateSeed`/`buySeed` bleiben als Stash-Pfade erhalten (Gewächshaus). Locks: `src/meta/brood_loop_continuation.test.ts` (End-to-End-Kauf, fail-closed, Determinismus, zwei Indizes ⇒ zwei Keime).

### B17.4 Fortschrittsregel der Reifung entscheiden — **UMGESETZT (2026-09-15, Option A)**

| Option | Wirkung |
|---|---|
| **A — angebrochene Welle** | Jede gestartete Welle zählt (+1). Tod in Welle 1 bringt genau 1. „Keine Runde bringt was" ist strukturell unmöglich. |
| **B — überstandene Welle** | Status quo (B15.2). Strikt und ehrlich, aber der Startzustand (2 Pflanzen) schafft Welle 1 oft nicht. |
| **C — erreichte Welle am Run-Ende** | Wie vor B15.2 (+Welle beim Tod). Belohnt weites Kommen, hängt aber wieder am Run-Tod. |

**Entscheidung: A, umgesetzt.** `GameView` koppelt `WAVE_STARTED → advanceCrossMaturation(1)` (ein Writer: `meta/economy.ts`); `recordRunEnd` zählt **keine** Wellen mehr (eine zweite Addition wäre Doppelzählung — das E2E-Gate „Tod in Welle 1 ⇒ Zähler genau +1" in `tests/run.spec.ts` lockt genau das gegen +0 und +2).

### B17.5 DoD für B17

- [x] Persistiert wird nie eine Kopie (B17.1) — lock: `brood_loop.test.ts` B17.1/B17.2
- [x] Reifungs-Invarianten bei jedem Load (B17.2) — lock: `brood_loop.test.ts` B17.3
- [x] Bestandsquelle entschieden und umgesetzt (B17.3, Option A) — lock: `b18.test.ts`
- [x] Fortschrittsregel entschieden und umgesetzt (B17.4, Option A) — lock: `tests/run.spec.ts` +1-Gate
- [x] `tsc` clean, Suite grün (214/214), E2E 11/11, Build grün

---
