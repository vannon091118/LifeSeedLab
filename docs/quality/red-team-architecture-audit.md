# Red-Team-Audit — Architektur, Persistenz und Laufzeitgrenzen

**Datum:** 24.09.2026<br>
**Stand:** `main`, Commit `9dc37f6` zum Abschluss des Audits; Arbeitsbaum mit bereits vorhandenen, nicht von diesem Audit veränderten Fremdänderungen<br>
**Methode:** statische Ownership-/Datenflussprüfung, gezielte Quellen- und Testlesung, adversarial gedachte Ausfallpfade, `tsc` und ausgewählte Vitest-Dateien<br>
**Status:** Bericht; die Befunde sind **offen**. Dieser Audit hat keinen Produktivcode repariert.

---

## 1. Kurzurteil

Die Kernsimulation ist erfreulich klar: `SimulationRoot` hält den Run, die Systeme ticken synchron, Events werden versioniert und die wichtigsten Meta-Gates sind fail-closed. Der rote Faden liegt nicht in der normalen Gameplay-Pipeline, sondern an den Grenzen:

1. **Persistenz entscheidet nicht zuverlässig, ob ein fehlender oder korrumpierter Zustand vorliegt.**
2. **Asynchrone Lösch-/Speicheroperationen können sich gegenseitig überholen.**
3. **Mehrere öffentliche Meta-Writer sind trotz Darstellung als atomar nicht atomar und akzeptieren ungeprüfte Eingaben.**
4. **Schema- und Event-Verträge werden überwiegend typisiert, aber an Laufzeitgrenzen nicht erzwungen.**

Das ist kein Beweis, dass jeder Spielerlauf sofort bricht. Es ist ein Beweis, dass die dokumentierten Verträge an ihren gefährlichsten Kanten nicht vollständig verteidigt werden. Ein Red-Team-Audit muss gerade die Stellen angreifen, an denen ein Fehler nicht als roter Test auffällt, sondern als plausibler neuer Spielzustand weiterläuft.

---

## 2. Positive Gegenproben

Bevor die Befunde kommen: Diese Prüfungen blieben **sauber**. Sie verhindern, dass der Bericht eine alte Architekturkritik gegen den aktuellen Stand wiederholt.

- **Keine Storage-API außerhalb von `persistence/`:** `rg` findet produktive `localStorage`-/`indexedDB`-Zugriffe nur in `src/persistence/storage.ts` und dem Persistence-Testhelfer.
- **Simulation ist synchron:** `SimulationRoot.stepOnce()` ruft die Systeme in fester Reihenfolge auf; der Render-Loop treibt sie über `advance(realMs)`, nicht umgekehrt.
- **Save-Snapshot ist read-only:** `getSnapshot()` liefert `structuredClone(this.state)`. UI und Renderer schreiben darüber nicht in die Simulation.
- **Resume-Vertrag ist im vorhandenen Test belegt:** `src/persistence/persistence_resume.test.ts` deckt Save-Shape und Resume-Pipeline ab; der gezielte Lauf war grün.
- **Meta-Zahlungs-Gates bestehen die vorhandenen Tests:** `src/meta/shop_pools.test.ts`, `entry_loop.test.ts`, `brood_loop.test.ts` waren zusammen 48 Tests grün.
- **Bus-Grundvertrag besteht die vorhandenen Tests:** `src/bus/bus_events.test.ts` und `bus_commands.test.ts` waren 13 Tests grün.
- **Determinismus-Gates existieren:** `tsc -b --noEmit` war grün; der vorhandene Determinismus-Test und die Rule-Tests sind im Repository vorhanden.

Diese Gegenproben sind kein Freifahrtschein. Sie zeigen nur, dass die Befunde unten **andere** Grenzen betreffen.

---

## 3. Befunde

### RT-01 — Weltkorruption wird als Erststart behandelt

**Schwere:** P1 / Datenverlust<br>
**Status:** OFFEN<br>
**Owner:** `persistence/` + `App.tsx`

**Beleg:**

- `src/persistence/worldSave.ts:30-36` unterscheidet nicht zwischen „fehlend“ und „korrumpiert“; beide liefern `null`.
- `src/persistence/worldSave.ts:40-45` behandelt jedes `null` als Erststart, erzeugt eine frische Welt und speichert sie.
- `src/App.tsx:48-51` ruft beim Boot `ensureWorld()` auf.

**Angriffspfad:**

1. Ein gültig verpackter, aber semantisch beschädigter `world`-Datensatz wird durch den IDB-Read als `null` behandelt.
2. `ensureWorld()` überschreibt ihn beim nächsten Start mit `createInitialWorld()`.
3. Die Spielerwelt geht verloren, obwohl der Kommentar in `worldSave.ts` ausdrücklich „kein stiller Ersatz“ verspricht.

**Warum die vorhandenen Tests es nicht fangen:** Die Persistenztests prüfen Meta-Quarantäne, aber nicht den Unterschied zwischen fehlendem und ungültigem WorldSave.

**Maßnahme:** `loadWorld()` muss einen dritten, expliziten Zustand liefern, z. B. `missing | valid | corrupt`. Nur `missing` darf eine Erstwelt erzeugen. `corrupt` muss sichtbar blockieren oder eine ausdrückliche Recovery-Entscheidung verlangen. Der Aufrufer darf keinen `null`-Wert als Freigabe interpretieren.

---

### RT-02 — Run-Exit hat eine Save/Löschen-Race

**Schwere:** P1 / resurrectierbarer Run<br>
**Status:** OFFEN<br>
**Owner:** `render/gameRuntime.ts` + `persistence/runSave.ts`

**Beleg:**

- `src/render/gameRuntime.ts:419-431` ruft bei `countRun()` zuerst `void clearRun()` auf.
- `src/render/gameRuntime.ts:405-415` ruft beim anschließenden `destroy()` wieder `saveRun(this.root.getSnapshot())` auf.
- `clearRun()` und `saveRun()` sind beide asynchron, fire-and-forget über IndexedDB.

**Angriffspfad:**

1. Spieler beendet einen laufenden Run.
2. `countRun()` startet das Löschen des alten Snapshots.
3. React unmountet `GameView`; `destroy()` startet danach das Speichern desselben letzten Snapshots.
4. IndexedDB-Transaktionen werden nicht durch die fire-and-forget-API serialisiert. Der spätere `put` kann den vorherigen `delete` überleben.

Das ist besonders unangenehm, weil der Kommentar bei `clearRun()` das Gegenteil behauptet: „Abbruch darf nicht wieder auferstehen“.

**Gegenprobe:** Im Game-Over-Pfad schützt `saveRun()` durch `state.phase === 'gameover'`; der manuelle Exit-Pfad tut das nicht. Der Befund ist deshalb auf den Exit-/CountRun-Pfad begrenzt, nicht auf den Game-Over-Pfad.

**Maßnahme:** Einen einzigen terminalen Run-Lifecycle-Owner bauen. `exit` muss `finalize → clear/save` in einer geordneten Operation ausführen; `destroy()` darf danach keinen Run-Snapshot mehr schreiben. Asynchrone Persistenz braucht eine Reihenfolge-/ generationsbedingte Schreibsperre.

---

### RT-03 — „Atomare“ Meta-Käufe sind mehrstufig und race-anfällig

**Schwere:** P1 / Wirtschafts- und Datenintegrität<br>
**Status:** OFFEN<br>
**Owner:** `meta/economy.ts` + `meta/store.ts`

**Beleg:**

- `buySeedAndGerminate()` in `src/meta/economy.ts:47-53` ruft zuerst `registerVariant()` und danach separat `updateMeta()` auf.
- `germinateSeed()` in `src/meta/economy.ts:65-70` macht dasselbe.
- `buySeedling()` in `src/meta/economy.ts:184-195` macht dasselbe; dieser Pfad wird vom aktuellen `SeedShop` benutzt.
- `updateMeta()` in `src/meta/store.ts:201-204` liest, merged und schreibt ohne Lock, Version oder Compare-and-swap.
- `storage.save()` verschluckt Schreibfehler in `src/persistence/storage.ts:120-122`.

**Ausfall A — Fehler zwischen den Writes:**

`registerVariant()` schreibt die Pflanze. Schlägt der spätere `updateMeta()`-Write fehl, bleibt die Pflanze erhalten, aber Nektar, `seedStash`, `breedGeneration` oder `seedlings` werden nicht korrekt gebucht. Der Spieler erhält Besitz ohne vollständige Transaktion; der UI-Autoritätspfad behauptet trotzdem Erfolg.

**Ausfall B — zwei Tabs:**

Beide Tabs lesen denselben Meta-Stand. Beide berechnen aus demselben `breedGeneration` einen Keimling. Der zweite Write überschreibt Teile des ersten; dadurch kann derselbe `seed_<index>` doppelt vergeben werden oder eine andere Zählung gewinnen.

**Maßnahme:** `registerVariant` nicht als Teil einer öffentlichen Meta-Transaktion verwenden. Eine interne `applyPurchaseAndRegister`/`applyGerminate`-Funktion muss genau einmal `load → mutate → persist` ausführen. Zusätzlich braucht `updateMeta` eine monotonic revision oder einen Storage-Adapter mit serialisierter Transaktion. „Atomar“ darf erst nach einem Failure-Injection-Test als Tatsache gelten.

---

### RT-04 — Same-Version-Saves sind nur checksum-validiert, nicht schema-validiert

**Schwere:** P1 / Absturz oder semantisch falscher Run<br>
**Status:** OFFEN<br>
**Owner:** `persistence/storage.ts` + `persistence/runSave.ts`

**Beleg:**

- `src/persistence/storage.ts:92-93` gibt bei gleicher Version `env.data as T` zurück.
- `src/persistence/runSave.ts:62-65` übernimmt dieses Ergebnis ohne Runtime-Validator als `RunSave`.
- `src/simulation/resume.ts:27-43` vertraut subsequently auf `snapshot.combo`, `snapshot.plants`, `snapshot.inventory` und weitere Formen.
- `src/persistence/worldSave.ts:30-36` hat zwar eine zusätzliche Weltvalidierung; `RunSave` besitzt keine entsprechende vollständige Validierung.

**Angriffspfad:** Ein semantisch defekter, aber checksum-korrekter oder durch einen Softwarefehler falsch serialisierter `RunSave` passiert die Envelope-Prüfung. `applyResume()` kann dann mit fehlenden/ungültigen Feldern crashen oder einen halb gültigen Zustand erzeugen. FNV schützt nicht vor Schema-Drift und ist keine Authentizität.

**Maßnahme:** Für `RunSave` und `WorldSave` echte `isValid...`-Guards vor der Rückgabe aus `load` einführen. Unknown/fehlende Felder müssen entweder migrationsfähig geheilt oder sichtbar quarantänisiert werden. Der Testfall „gültige Prüfsumme, ungültige Form“ muss explizit rot werden, wenn der Validator entfernt wird.

---

### RT-05 — Weltvalidierung prüft Syntax, nicht die Spielinvariante

**Schwere:** P1 / semantisch kaputter Weltzustand<br>
**Status:** OFFEN<br>
**Owner:** `world/world_state.ts` + `simulation/mapSystem.ts`

**Beleg:**

- `src/world/world_state.ts:73-86` akzeptiert jeden String als Tile-Typ.
- Es gibt dort keine Prüfung, dass der Tile-Typ in `MAP_TILE_IDS` existiert.
- Es gibt dort keine Prüfung, dass Spawn und Ausgang erreichbar bleiben.
- `src/simulation/enemySystem.ts:39-43` fällt bei `currentRoute === null` auf einen Default-Punkt zurück, statt einen Run abzubrechen.
- `src/simulation/root.ts:136-138` stellt `wouldClosePath` als read-only Frage bereit, aber der geladene Weltzustand selbst wird nicht gegen diese Regel geprüft.

**Angriffspfad:** Ein syntaktisch gültiger WorldSave mit einem unbekannten Tile oder einem Topf auf Spawn/Exit besteht `isValidWorldState()`. `SimulationRoot` bekommt `currentRoute = null`; beim Wellenstart greift der Default-Pfad im EnemySystem. Damit wird genau die Integritätsregel umgangen, die die Map-Owner für Live-Bauten schützt.

**Maßnahme:** `isValidWorldState()` muss mindestens bekannte Tile-IDs und eine Route von Spawn nach Ausgang verlangen. Alternativ muss der Root einen validierten World-Contract erhalten und bei `null` fail-closed abbrechen. Der Default-Pfad im EnemySystem darf nicht als Sicherheitsnetz für einen vertraglich ungültigen Weltzustand dienen.

---

### RT-06 — Öffentliche Meta-Writers akzeptieren beliebige Preise und Mengen

**Schwere:** P1 / negativer Preis und gebrochene Source-Wahrheit<br>
**Status:** OFFEN<br>
**Owner:** `meta/economy.ts`

**Beleg:**

- `buySeed(price: number)` akzeptiert jeden Aufruferwert in `src/meta/economy.ts:15-18`.
- `buySeedAndGerminate(price: number, index: number)` nutzt denselben beliebigen Preis in `src/meta/economy.ts:47-53`.
- `buyPoolItem(key, amount)` prüft nur `amount < 1`; `amount = 1.5` ist erlaubt in `src/meta/economy.ts:30-38`.
- Der aktuelle Shop ruft zwar `buySeedling()` mit dem Source-Preis auf, aber die Writer sind über `src/meta.ts` öffentlich exportiert.

**Konkrete Fehlannahme:**

- `buySeed(-100)` erhöht Nektar um 100 und Stash um 1.
- `buySeedAndGerminate(-100, 0)` erhöht Nektar und registriert eine Pflanze.
- `buyPoolItem('pot', 1.5)` bucht 1,5 Stück Material gegen 1,5 × Source-Preis.

Das verletzt die Source-Regel und ist ein valider direkter Aufrufpfad für einen alternativen Screen, Test-Harness oder späteres Tooling.

**Maßnahme:** Preisparameter aus öffentlichen Meta-Writers entfernen oder strikt gegen die Source-ID auflösen. `amount` muss eine positive ganze Zahl sein. Source-Preise dürfen nicht als beliebige `number`-Argumente durchgereicht werden. Ein Negativpreis-Mutationstest gehört in die Meta-Suite.

---

### RT-07 — EventBus transportiert typisierte Events, erzwingt den Event-Contract aber nicht

**Schwere:** P1 / beschädigte Downstream-Zustände<br>
**Status:** OFFEN<br>
**Owner:** `bus/bus.ts` + `bus/events.ts`

**Beleg:**

- `src/bus/events.ts:184-200` enthält `assertEventContract()`.
- `src/bus/bus.ts:9-17` ruft diese Funktion in `publish()` nicht auf.
- `makeEvent()` ist im Wesentlichen ein TypeScript-Cast in `src/bus/events.ts:167-181`.
- Die vorhandenen Tests rufen `assertEventContract()` separat auf; sie beweisen nicht, dass der Bus sie beim Dispatch erzwingt.

**Angriffspfad:** Ein System erzeugt ein Event mit falschem `eventId`, `version`, leerem Payload oder ungültigem Source-Feld. Der Bus verteilt es trotzdem an FX, Audio, Persistenz oder Meta-Listener. Je nach Consumer entstehen stiller Toast, kaputter Visual-Command oder eine falsche Meta-Buchung.

**Maßnahme:** `EventBus.publish()` muss den Contract an der einzigen Laufzeitgrenze prüfen. Die Prüfung darf nicht nur Tests sein. Alternativ braucht jeder interne Publisher einen geprüften Factory-Weg und der Bus muss unreferenzierte/ungültige Events ablehnen. `assertEventContract` darf nicht nur ein optionales Test-API bleiben.

---

### RT-08 — SimulationRoot exportiert zusätzliche Writer statt nur read-only Zugänge

**Schwere:** P2 / Ownership-Schlupfloch<br>
**Status:** OFFEN<br>
**Owner:** `simulation/root.ts`

**Beleg:**

- `src/simulation/root.ts:285-286` gibt `vectorSystem` und `attractorSystem` als öffentliche Objekte zurück.
- `src/simulation/root.ts:293-299` stellt `vectorDeposit()` und `attractorSpawn()` als öffentliche Mutationsmethoden bereit.
- `rg` findet produktive Aufrufer dieser Writer nicht; die aktuellen Aufrufer sind Tests. Damit ist der Befund latent, nicht als aktueller Produktionsfehler bewiesen.

**Risiko:** Ein neuer Renderer, Test oder Effect darf außerhalb des Root-Tick-Fadens in einen autoritativen Slice schreiben. Das umgeht die beabsichtigte Reihenfolge „Tick → Systeme → Effekte“ und macht die Single-Writer-Zusage nur für den heutigen Call-Graph wahr.

**Maßnahme:** Für Tests einen DevGate-only Harness oder eine interne Test-Freundschaft schaffen. Produktive API: nur `getSnapshot()` und read-only Query-Funktionen. Writer bleiben `private` und werden ausschließlich im Root-Step oder über den Command-Pfad aufgerufen.

---

### RT-09 — Persistenzfehler werden als Erfolg behandelt

**Schwere:** P1 / stiller Datenverlust<br>
**Status:** OFFEN<br>
**Owner:** `persistence/storage.ts` + Aufrufer

**Beleg:**

- `idbSet()` fängt alle Fehler in `src/persistence/storage.ts:146-157` und liefert ein erfülltes `Promise<void>` ohne Fehlerstatus.
- `saveWorld()` ruft `void idbSet()` in `src/persistence/worldSave.ts:20-22` auf.
- `saveRun()` ruft `void idbSet()` in `src/persistence/runSave.ts:59` auf.
- `save()` für localStorage fängt Quota-/Private-Mode-Fehler in `src/persistence/storage.ts:120-122` ab.

**Auswirkung:** Ein Full-Storage-, Private-Mode- oder IDB-Fehler wird vom UI nicht als Fehler sichtbar. Der Run läuft weiter, Meta-Transaktionen melden Erfolg, und beim Reload fehlen die Änderungen. Das ist besonders problematisch, weil RT-03 bereits von mehrstufigen Writes abhängt.

**Maßnahme:** Persistenzergebnis mindestens als `written | skipped | failed` an den Owner melden. Kritische Writes dürfen nicht still in Erfolg umgewandelt werden. Der Spielbildschirm braucht einen sichtbaren, reparierbaren Speicherfehlerzustand oder eine nicht-blockierende, explizite Warnung mit Retry.

---

### RT-10 — Migration schreibt zurück, wartet aber nicht auf den Write

**Schwere:** P2 / Migration kann bei Tab-Ende verloren gehen<br>
**Status:** OFFEN<br>
**Owner:** `persistence/storage.ts`

**Beleg:** `resolveVersion()` ruft in `src/persistence/storage.ts:100-106` `writeBack(migrated)` auf. `idbGet()` übergibt in `src/persistence/storage.ts:171-174` `idbSet(...)` als Callback, ohne den returned Promise zu awaiten. `load()` awaited den lokalen Save-Callback ebenfalls nicht, weil `save()` selbst synchron bleibt; beim IDB-Pfad ist die Lücke relevant.

**Auswirkung:** `loadRun()`/`loadWorld()` kann einen migrierten Wert zurückgeben, obwohl die persistente Neuformalisierung noch nicht abgeschlossen ist. Ein Tab-Wechsel oder Prozessabbruch kann den alten Datensatz erneut laden.

**Maßnahme:** Den IDB-Migrationspfad async und awaited ausführen. Erst nach erfolgreichem Commit den migrierten Wert zurückgeben; bei Schreibfehler sichtbar `corrupt/unpersisted` behandeln. Test muss den Schreibfehler und den Tab-Ende-Zeitpunkt simulieren.

---

### RT-11 — `worldSeed` ist persistiert, aber nicht die Weltwahrheit

**Schwere:** P2 / irreführende Provenienz<br>
**Status:** OFFEN<br>
**Owner:** `world/world_state.ts` + `simulation/potBoost.ts`

**Beleg:**

- `src/world/world_state.ts:32` speichert `worldSeed`.
- `worldSnapshotOf()` in `src/world/world_state.ts:67-69` überträgt `worldSeed` nicht in den Run.
- `src/simulation/potBoost.ts:22-24` leitet Topf-Farben aus `EPOCH_ROOT` und Zellkoordinaten ab, nicht aus `world.worldSeed`.
- Produktive Leser von `worldSeed` wurden nicht gefunden; der Wert wird im WorldSave validiert, aber nicht in die Gameplay-Ableitung übernommen.

**Bewertung:** Die aktuelle Weltstruktur ist deterministisch, aber nicht aus dem persistierten Feld ableitbar. Das QA-Risiko W2 („worldSeed ändert sich pro Reload“) wurde im aktuellen Source-Stand nicht reproduziert: `deriveWorldSeed()` ist aus `EPOCH_ROOT` abgeleitet. Das widerlegt die konkrete QA-Beobachtung, nicht den semantischen Architekturwiderspruch.

**Maßnahme:** Entweder `worldSeed` als echte Wurzel in Weltgenerierung, Pot-Boost und Renderer übernehmen oder das Feld entfernen. Ein persistiertes Provenienzfeld, das niemand liest, ist eine zweite, irreführende Wahrheit.

---

### RT-12 — `crossIndex` wird als Identität akzeptiert, aber nicht uniqueness-geprüft

**Schwere:** P2 / Queue-Identität<br>
**Status:** OFFEN<br>
**Owner:** `meta/economy.ts` + `meta/run.ts`

**Beleg:**

- `consumeSeedAndEnqueueCross()` übernimmt `crossIndex` direkt in `src/meta/economy.ts:98-124`.
- `isCrossReady()` sucht per `find()` in `src/meta/economy.ts:163-165`.
- `keepCross()` filtert alle Einträge mit derselben ID in `src/meta/run.ts:216-220`.

**Angriffspfad:** Ein alternativer Aufrufer oder ein beschädigter Meta-Stand enqueuet zweimal dieselbe `crossIndex`. Reife und Claim werden über den ersten Treffer entschieden; ein erfolgreicher Claim entfernt alle Duplikate. Das erzeugt entweder einen stillen Datenverlust mehrerer Kreuzungen oder eine nicht eindeutige Queue.

**Maßnahme:** `crossIndex` nur als monotonen, intern vergebenen Writer akzeptieren. Vor dem Enqueue muss die ID gegen `meta.breedGeneration` und alle Pending-Einträge geprüft werden. Der Testfall „doppelte ID“ muss den ersten und den zweiten Eintrag getrennt behandeln.

---

## 4. Root-Cause-Analyse

**Ergebnis:** Die zwölf Befunde sind nicht zwölf unabhängige Fehler. Sie verdichten sich zu fünf systemischen Ursachen. Die konkrete Fehlstelle ist jeweils nur der letzte sichtbare Punkt einer Kette; die eigentliche Ursache liegt an der Vertrags- oder Operationsgrenze.

### 4.1 Root-Cause-Matrix

| Root Cause | Systemische Ursache | Konkreter Nachweis | Befunde |
|---|---|---|---|
| **RC-01 — Ergebniszustände werden zu grob modelliert** | `missing`, `corrupt`, `unavailable`, `rejected`, `written` und `failed` werden als `null`, Fallback, `void`, `Promise<void>` oder Exceptions bzw. als normaler Rückgabewert vermischt. Dadurch kann ein Aufrufer einen Fehler als „nichts vorhanden" oder einen Schreibversuch als Erfolg behandeln. | `loadWorld(): Promise<WorldState \| null>`; `idbGet<T>()` mit `fallback`; `saveRun()`/`saveWorld()` geben `void` zurück; `idbSet()` verschluckt Fehler und liefert trotzdem `Promise<void>`. | RT-01, RT-09, RT-10 |
| **RC-02 — Async-Lifecycle besitzt keinen Transaktions-Owner** | Asynchrone Storage-Aktionen werden unabhängig gestartet. Es gibt keinen terminalen Run-Lifecycle, keine Write-Sequenz, kein generationsbedingtes „älterer Write darf nicht gewinnen" und kein `await` für Migrationen. | `countRun()` startet `void clearRun()`, `destroy()` startet danach `saveRun()`; `resolveVersion()` übergibt `idbSet` als `void`-Callback; jeder IDB-Schreibvorgang öffnet eine eigene Transaktion. | RT-02, RT-10 |
| **RC-03 — Atomarität ist Kommentar, nicht Operationsgrenze** | Ein Meta-Writer darf mehrere öffentliche Schreibfunktionen aufrufen, obwohl die eigentliche Transaktion ein einzelner load→mutate→persist-Schritt sein müsste. `updateMeta()` ist nur ein öffentlicher Read/Merge/Write-Helfer und besitzt weder Revision noch Lock. | `buySeedling()` und `buySeedAndGerminate()` rufen `registerVariant()` und danach separat `updateMeta()` auf; `updateMeta()` lädt, merged und schreibt ohne Absicherung. | RT-03 |
| **RC-04 — Typisierte Verträge enden an der Laufzeitgrenze** | TypeScript-Typen, Kommentare und separate Assertion-Funktionen werden wie ein Validator behandelt, obwohl persistierte Daten, Events und Queue-Identitäten an der Grenze unabhängig geprüft werden müssen. | `resolveVersion()` castet `env.data as T`; `RunSave` hat keinen vollständigen Guard; `assertEventContract()` wird nicht von `EventBus.publish()` aufgerufen; `isValidWorldState()` akzeptiert beliebige Tile-Strings; `crossIndex` wird nicht uniqueness-geprüft. | RT-04, RT-05, RT-07, RT-12 |
| **RC-05 — Ownership und Source-Autorität sind durch öffentliche APIs nicht geschützt** | Low-Level-Writer und fachliche Parameter werden nach außen gereicht. Dadurch können Aufrufer Source-Preise, Mengen, Identitäten oder autoritative Systeme umgehen; persistierte Provenienz kann außerdem vom Runtime-Graph getrennt bleiben. | `buySeed(price)`/`buyPoolItem(key, amount)`; `SimulationRoot.vectorSystem` und `attractorSpawn()`; `worldSnapshotOf()` überträgt `worldSeed` nicht, während `potBoostAt()` eine andere Seed-Wurzel nutzt. | RT-06, RT-08, RT-11 |

### 4.2 Kausalketten der Befunde

- **RT-01:** Semantisch ungültige Welt → `isValidWorldState()` lehnt sie ab → `loadWorld()` macht daraus `null` → `ensureWorld()` interpretiert `null` als fehlende Welt → `createInitialWorld()` + `saveWorld()` überschreibt den Bestand. Die Ursache ist nicht der Validator, sondern der nicht unterscheidbare Rückgabevertrag.
- **RT-02:** `countRun()` beendet den Run nicht als eine Operation, sondern startet nur ein Löschen. Der anschließende Unmount startet unabhängig ein Speichern. Ohne Sequenz-/Terminal-Operator entscheidet der IndexedDB-Commit, nicht der Run-Lifecycle.
- **RT-03:** `loadMeta()` → `registerVariant()` schreibt den Bestand → `updateMeta()` lädt erneut und schreibt Zahlung/Generation separat. Ein Fehler zwischen den Schritten erzeugt eine Teilbuchung; zwei Tabs erzeugen einen verlorenen Merge.
- **RT-04/RT-07:** Ein gültiger TypeScript-Typ bzw. eine vorhandene `assertEventContract()`-Funktion beweist nur die Compile-Zeit. Weil Storage und Bus die Funktion nicht an ihrer einzigen Eingangsgrenze ausführen, wird die gleiche strukturelle Lücke auf Save und Event übertragen.
- **RT-05/RT-12:** Die vorhandenen Guards prüfen Form, nicht die Domäneninvariante: beliebige Tile-Strings und nicht-eindeutige `crossIndex`-Werte gelten als strukturell gültig. Der Default-Pfad im EnemySystem bzw. das `find()`/`filter()`-Verhalten sind Folgen der fehlenden Eingangs-Invariante, nicht deren Ursprung.
- **RT-06/RT-08:** Öffentliche Meta- und Root-APIs nehmen fachliche Entscheidungen bzw. autoritative Writer als Parameter bzw. Rückgabe an. Source-Wahrheit und Single-Owner sind damit nicht strukturell erzwungen.
- **RT-09/RT-10:** `idbSet()` fängt den Fehler und liefert trotzdem ein erfülltes `Promise<void>`; Migrationen werden nicht awaited. Dadurch kann die obere Schicht einen nicht geschriebenen Wert als gültig zurückgeben.
- **RT-11:** `worldSeed` wird als persistierte Provenienz geführt, aber nicht in den `WorldSnapshot`-Graph übernommen und von keinem Produktivleser als Gameplay-Wurzel verwendet. Das ist Vertragsdrift zwischen Datenmodell und Ableitungsgraph, nicht ein Reproduktionsfehler des RNG.

### 4.3 Was damit **nicht** die Ursache ist

- Nicht die bloße Existenz von Unit-Tests: Die vorhandenen Tests prüfen lokale Writer gut; sie übersehen die Kombination aus unabhängigen Writes und Laufzeitgrenzen.
- Nicht `Math.random` oder fehlende Determinismus-Disziplin: Die betroffenen Determinismus-Gegenproben waren grün.
- Nicht der `EnemySystem`-Defaultpfad als alleinige Ursache für RT-05: Er ist der sichtbare Notfallpfad; die eigentliche Lücke ist die fehlende semantische Weltvalidierung.
- Nicht `worldSeed` als zufällige Seed-Quelle: Der konkrete QA-Bericht W2 wurde nicht reproduziert. Offen bleibt die Architekturwahrheit, dass ein persistiertes Feld nicht in die Runtime-Wahrheit eingeht.
- Nicht die Existenz des Checksumsmechanismus: RT-04/RT-09 entstehen, weil Integrität/Fehlerstatus nicht mit Schema- und Operationsvalidierung verbunden sind.

**Konsequenz für die Behebung:** Nicht zwölf Einzelfixes nebeneinander bauen. Zuerst müssen Ergebnismodell (RC-01), Transaktions-/Lifecycle-Owner (RC-02/03), ausführbare Grenzvalidierung (RC-04) und eine source-gebundene, gekapselte API (RC-05) hergestellt werden. Danach sind die zwölf Befunde überwiegend Folgeerscheinungen dieser fünf Ursachen und nicht zwölf neue Produktentscheidungen.

---

## 5. Umsetzungsplan aus den Root Causes

**Arbeitsregel:** Erst rote Vertragstests, dann die kleinste Produktionsänderung, die genau diesen Test grün macht. Keine Phase gilt als fertig, wenn nur der lokale Einzelfall grün ist; die Phase muss zusätzlich den Ausfall des neuen Vertragsmechanismus rot werden lassen.

### 5.1 Abhängigkeitsreihenfolge

```text
T0 Baseline
  ↓
T1 Ergebnis-/Fehlerverträge (RC-01)
  ↓
T2 terminaler Run-Lifecycle (RC-02)
  ↓
T3 Meta-Transaktionen (RC-03)
  ↓
T4 Runtime-Grenzvalidierung (RC-04)
  ↓
T5 gekapselte APIs und Provenienz (RC-05)
  ↓
T6 Gesamt-Gate und Restredundanz-Audit
```

Die Reihenfolge ist intentional: Meta-Transaktionen können keinen ehrlichen Fehlerstatus liefern, solange Storage `void`/`Promise<void>` verschluckt; Runtime-Validatoren können keinen stabilen Save-Status liefern, solange die Ergebnisform fehlt. Umgekehrt müssen die Validatoren nicht auf eine spätere, bereits umgebaute Transaktions-API warten.

### 5.2 Testreihenfolge

| Testphase | Zuerst rot schreiben | Danach implementieren | Primär-Owner |
|---|---|---|---|
| **T0 — Baseline** | — | Bestehende Tests unverändert als Ausgangspunkt; keine Änderung als Beweis missverstehen. | `process/` |
| **T1 — Ergebnisvertrag** | `persistence_resume.test.ts` plus neuer Failure-Injection-Test: corrupt WorldSave darf nicht durch `ensureWorld()` ersetzt werden; Write-Fehler und fehlgeschlagene Migration dürfen nicht als Erfolg enden. | `storage.ts` liefert unterscheidbare Load-/Write-Ergebnisse; `worldSave.ts`/`runSave.ts` übersetzen sie; `App.tsx` behandelt `corrupt`/`failed` sichtbar. | `persistence/`; `App.tsx` nur als UI-Reader/Recovery-Entscheider |
| **T2 — Run-Lifecycle** | Neuer Runtime-/Save-Autor-Test mit gestuftem IDB-Scheduler: `clearRun()` und `saveRun()` dürfen nach Exit nicht in beliebiger Reihenfolge committen. | Ein terminaler Run-Abschluss entscheidet einmal über `finalize/clear/save`; `destroy()` schreibt nach diesem Abschluss keinen Snapshot mehr. | `persistence/runSave.ts` + Save-Autor; `render/gameRuntime.ts` nur Aufrufer |
| **T3 — Meta-Operation** | `brood_loop.test.ts`, `cross_lifecycle.test.ts` und Failure-Injection zwischen Registrierung und Zahlung; zwei gleiche Revisionen dürfen keine verlorene/teilweise Buchung erzeugen. | Eine interne `load→mutate→persist`-Transaktion; `registerVariant()` darf nicht als unabhängiger öffentlicher Writer in einer Kaufoperation hängen. | `meta/store.ts` (Transaktionsprimitive), `meta/economy.ts`/`run.ts` (Operationen) |
| **T4 — Grenzvalidierung** | `simulation_resume.test.ts`: gültige Envelope/ungültige `RunSave`; Welt-Test: unbekannter Tile und blockierter Spawn/Exit; `bus_events.test.ts`: ungültiges Event; Cross-Test: doppelte `crossIndex`. | `isValidRunSave`, semantische Welt-/Route-Prüfung, `EventBus.publish()`-Assertion und `crossIndex`-Uniqueness als Eingangs-Gates. Ungültige Daten werden quarantänisiert oder sichtbar abgewiesen, nicht still normalisiert. | `persistence/runSave.ts`, `world/`, `simulation/root.ts`, `bus/` |
| **T5 — Ownership/Source** | `shop_pools.test.ts`: negativer Preis und nicht-ganzzahlige Menge; `vector_engine_gate.test.ts`/API-Test: keine produktiven Root-Writer; Welt-Provenance-Test: `worldSeed` entweder im Runtime-Graph oder entfernt. | Source-Preise werden nicht als freie Parameter akzeptiert; Mengen werden als positive ganze Zahlen geprüft; Simulations-Writer werden privat/Test-only; `worldSeed` erhält genau eine dokumentierte Rolle. | `meta/economy.ts`, `simulation/root.ts`, `world/` + `potBoost.ts` |
| **T6 — Gesamtbeleg** | Bestehende Suite plus die neuen Mutationsproben. | Vollständige Lane, Typecheck, Build und der für den Sprint vorgeschriebene Gate-Lauf; jede entfernte Schutzschicht muss den zugehörigen Test rot machen. | `process/` + jeweilige Domänen-Owner |

**Testdisziplin:** Für T1–T5 wird jeweils eine Gegenprobe mit abgeschalteter Schutzschicht verlangt. Ein Test, der nur den aktuellen Fehlerbildpfad prüft, aber nicht den entfernten Guard/Transaktionsschritt, zählt nicht als Root-Cause-Gegenprobe.

### 5.3 Umsetzungsschritte und Owner-Grenzen

#### Phase 1 — Ergebnis- und Fehlervertrag (RC-01)

1. In `persistence/storage.ts` die bisherige `fallback`-/`void`-Semantik durch explizite Load- und Write-Ergebnisse ersetzen. Für IndexedDB und localStorage dürfen die gemeinsamen fachlichen Zustände nicht unterschiedlich benannt werden.
2. In `worldSave.ts` mindestens `missing`, `valid`, `corrupt` und `unavailable` unterscheiden. Nur `missing` darf eine Erstwelt erzeugen; `corrupt` und `unavailable` niemals automatisch durch `createInitialWorld()` ersetzen.
3. In `runSave.ts` und allen Save-Autoren den Write-Status bis zum Owner durchreichen. Fehler werden nicht geloggt und anschließend als Erfolg zurückgegeben.
4. **Exit:** T1 grün; ein corrupt WorldSave bleibt sichtbar, ein Schreibfehler erzeugt `failed`, und ein gültiger Save liefert ausschließlich `valid`.

#### Phase 2 — Terminaler Run-Lifecycle (RC-02)

1. Den Abschluss als eine Persistence-Operation modellieren; der Runtime-Layer darf keinen zweiten konkurrierenden Save-Impuls starten.
2. `countRun()` und `destroy()` dürfen nicht mehr unabhängig über `clearRun()`/`saveRun()` entscheiden. Ein Run darf höchstens einen terminalen Abschlussversuch besitzen.
3. **Exit:** T2 grün; der Scheduler-Test beweist unabhängig von IDB-Commit-Timing genau ein finales Ergebnis und keinen wieder auferstehenden Run.

#### Phase 3 — Meta-Transaktion (RC-03)

1. Eine interne Transaktionsfunktion in `meta/store.ts` einführen, die den geladenen Meta-Snapshot einmal mutiert und einmal persistiert.
2. `economy.ts` und `run.ts` bauen Kauf, Keimung, Zucht und Freigabe auf dieser Funktion auf; Registrierung und Zahlung dürfen nicht mehr über getrennte öffentliche Writer laufen.
3. Revision/CAS oder eine äquivalente Single-Writer-Serialisierung gegen konkurrierende Tabs vorsehen. Loses Merge-Verhalten ist kein Atomaritätsbeweis.
4. **Exit:** T3 grün; ein Fehler nach der ersten Teilmutation hinterlässt keinen halben Kauf, und zwei konkurrierende Revisionen erzeugen eine deterministische Ablehnung oder Serialisierung.

#### Phase 4 — Ausführbare Runtime-Verträge (RC-04)

1. `isValidRunSave` vor `applyResume()` und vor jeder Rückgabe aus `loadRun()` ausführen. Ein gültiger Envelope ist nur Transportintegrität, kein gültiger Runtime-Snapshot.
2. Welt-Validatoren müssen bekannte Tile-IDs und die Spawn→Ausgang-Invariante prüfen. Der Root muss bei fehlender Route fail-closed abbrechen; der EnemySystem-Default darf nur einen echten Vor-Initialisierungsfall behandeln, nicht einen ungültigen Save.
3. `EventBus.publish()` validiert vor `seq`, Ringpuffer und Dispatch. Ein ungültiges Event darf keinen Listener und keinen Debug-Eintrag erreichen.
4. `crossIndex` wird beim Meta-Load/Enqueue auf Eindeutigkeit geprüft. Duplikate werden nicht still per `filter()` entfernt; der Datenverlust bleibt sichtbar und recoveriespeicherbar.
5. **Exit:** T4 grün; jeder ungültige Boundary-Wert wird vor seiner Folgeaktion abgewiesen, und ein absichtlich entfernter Guard macht den Test rot.

#### Phase 5 — Source-gebundene und gekapselte APIs (RC-05)

1. In `meta/economy.ts` freie Preisparameter aus öffentlichen Käufen entfernen oder auf eine Source-ID abbilden; `amount` nur als positive ganze Zahl.
2. Vector-/Attraktor-Writer aus der produktiven `SimulationRoot`-Oberfläche entfernen. Tests erhalten einen expliziten Test-Harness oder bleiben im DevGate; die Simulation mutiert weiterhin nur im Root-Step.
3. Für `worldSeed` eine einzige Entscheidung erzwingen: entweder in `WorldSnapshot`, Root-Init und sämtliche deterministischen Verbraucher aufnehmen oder aus dem persistenten Schema entfernen. Ein unbenutztes Provenienzfeld bleibt nicht als Zwischenlösung liegen.
4. **Exit:** T5 grün; Source-Wahrheit und Writer-Ownership sind aus der API heraus strukturell nicht mehr umgehbar, und `worldSeed` besitzt genau eine dokumentierte Bedeutung.

### 5.4 Abschluss- und Stop-Kriterien

- **Nach jeder Phase:** gezielte Tests zuerst, dann Typecheck; ein roter Alt-Test wird nicht mit einem größeren Scope verdeckt.
- **Nach T1–T4:** mindestens ein Failure-Injection- und ein Mutationstest je neuer Grenze; die absichtlich entfernte Schutzschicht muss reproduzierbar rot werden.
- **Nach T5:** `tsc -b --noEmit`, gezielte Lane, `vite build` und am Sprintende die vollständige Suite. E2E nur bei ausdrücklicher Anweisung.
- **Vor dem Commit:** alle RT-IDs entweder mit grünem Testbeleg schließen oder im Roadmap/Contract als offen mit neuem Beleg stehen lassen.
- **Stop:** Wenn die WorldSeed-Rolle nicht entschieden ist, wird sie nicht still entfernt und nicht parallel verdrahtet. Wenn Async-IDB die synchrone Meta-Hydration gefährdet, wird der Backend-Vertrag vor der API geändert.

---

## 6. Priorität und Reihenfolge

### Sofort / vor weiterer Persistenz-Arbeit

1. **RT-01:** missing vs. corrupt bei WorldSave trennen.
2. **RT-02:** Run-Exit als eine geordnete terminale Transaktion bauen.
3. **RT-03/RT-09:** atomare Meta-Transaktionen und sichtbare Write-Fehler.
4. **RT-04/RT-05:** Runtime-Validatoren für Run- und WorldSave.
5. **RT-06:** negative Preise und nicht-ganzzahlige Mengen blockieren.

### Danach

6. **RT-07:** Event-Contract im Bus erzwingen.
7. **RT-10:** IDB-Migration awaited und fehlerhaft sichtbar machen.
8. **RT-08/RT-11:** öffentliche Simulations-Writer und `worldSeed` bereinigen.
9. **RT-12:** Cross-Index-Uniqueness erzwingen.

---

## 7. Empfohlene Testmatrix

Der Audit hat keine neuen Tests geschrieben. Für die Behebung sollten mindestens diese roten Ausgangstests entstehen:

- corrupt WorldSave ⇒ **kein** `ensureWorld()`-Overwrite;
- `delete` und anschließender `put` aus Exit ⇒ am Ende kein Snapshot;
- simulierter Fehler zwischen `registerVariant` und Zahlungswrite ⇒ keine Teilbuchung;
- zwei konkurrierende `buySeedling`-Tabs ⇒ eindeutige Generation/Inventar-ID;
- `buySeed(-1)`, `buySeedAndGerminate(-1, 0)`, `buyPoolItem('pot', 1.5)` ⇒ unveränderter Save;
- gültiger Envelope mit ungültigem `RunSave` ⇒ `null`/sichtbarer Fehler, kein Resume-Crash;
- Welt mit bekanntem Tile auf Spawn/Exit ⇒ ungültig;
- Event mit kaputtem `eventId`/`version` ⇒ `EventBus.publish()` wirft oder verwirft;
- `vectorDeposit()`/`attractorSpawn()` aus Produktivcode ⇒ verboten oder nur DevGate;
- IDB-Migration mit Write-Fehler ⇒ migrierter Zustand wird nicht als dauerhaft gespeichert behauptet.

---

## 8. Ausführungsbelege

Ausgeführt am 24.09.2026:

```text
node node_modules/typescript/bin/tsc -b --noEmit
→ exit 0

node node_modules/vitest/vitest.mjs run \
  src/meta/brood_loop.test.ts \
  src/meta/entry_loop.test.ts \
  src/meta/shop_pools.test.ts \
  src/persistence/persistence_resume.test.ts \
  src/bus/bus_events.test.ts \
  src/bus/bus_commands.test.ts
→ 6 Dateien, 66 Tests grün

node tools/indexer/cli.ts check
→ exit 1: .index/index.json, INDEX.md, src/meta/INDEX.md und src/simulation/INDEX.md veraltet
```

Der Indexer-Fehler ist in diesem Bericht **kein Red-Team-Befund**: Er stammt aus dem bereits veränderten Arbeitsbaum/Index-Zustand und wurde nicht durch den Audit verursacht. Er verhindert aber gerade, dass man einen grünen Gate-Lauf als Beleg für den gesamten Repository-Zustand ausgibt.

---

## 9. Schlussfolgerung

LifeSeedLab hat nicht „zu wenig Tests“, sondern zu wenige Tests an den **Transaktionsgrenzen**. Die vorhandenen Tests prüfen viele lokale Verträge sehr gut; genau deshalb ist es leicht, einen globalen Fehler zu übersehen: ein sauberer Einzelwriter, zwei unverbundene Async-Writes oder ein syntaktisch gültiger, semantisch kaputter Save sieht lokal korrekt aus.

Der nächste sinnvolle Schritt ist kein weiterer Content-Sprint. Zuerst müssen Speichern, Laden, Beenden und Kaufen als **eine sichtbare, serialisierte Wahrheit** gebaut werden. Sonst kann die sauberste Simulation der Welt trotzdem gegen ein beschädigtes Memo abstürzen.
