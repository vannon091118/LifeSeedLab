# Contract: Genom, Zucht-Mathematik & Phänotyp

**Owner (genau einer):** `src/genome/*` (gacha, cross, pool, bases, beetle) · Allele `config/plants.source.ts` · Gen-Paare `config/genes.source.ts`
**Writer:** Seed-Ableitung `genome/gacha.ts` · Kreuzung `genome/cross.ts` · Visual-Ableitung `genome/visualMap.ts`
**Readers:** meta (Zucht-Queue), visual (Phänotyp), discovery (Genom-Hash), Renderer
**LOC-Caps:** 300 (Simulation/Genom-Logik) · 200 (Config/Source)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> B16 ist domänenübergreifend zerlegt: B16.1 (Route zeichnen) liegt in `visual`, B16.7 (Release-Sprache) in `ui`, B16.9 (E2E-Geometrie) in `process` — der DoD B16.6 fasst sie hier zusammen.

---

## A2. `src/genome.ts` — WRONG core, KEEP math

- WRONG: private `makeRng` duplicates `core/rng.ts` (same name, different signature — name collision across modules).
- DEFECT: module-level `let breedCounter = 0` resets on reload ⇒ **same parents + same generation produce different children after a page reload**. Determinism gap in the flagship feature.
- DEFECT: `createBaseVariants()` duplicated as `createBaseVariantsSafe()` in `MainMenu.tsx` ("inlined to avoid circular import" — false, `MainMenu` already imports from `genome.ts`). Two sources of truth for base plants.
- KEEP: `crossGenomes`, `deriveStats`, `deriveTraits`, `generateName`, weighted mutation.
- REPAIR: route all randomness through `core/rng` (`deriveBreedSeed` → `deriveSeed(rootSeed,'plant',aId,bId,generation)`); generation counter persists in `MetaSave.breedGeneration`; delete duplicate; export single `createBaseVariants()`.

### A15. INCOMPLETE (verifiziert, gemessen) — Genom-Mutation: drei Achsen, ein falsches Nein

Frage: Gibt es in `crossGenomes` überhaupt Mutation oder nur Rekombination? Antwort, per Gate über 200 deterministische Seeds gemessen (`src/genome/cross.test.ts`) — **Mutation existiert, auf drei Achsen:**

1. **Fremdgen** (p = 0.15 je Slot): ein Gen aus `GENE_POOL`, das in **keinem** Elternteil liegt, mit frischer Stärke 0.1–0.7.
2. **Stärke-Jitter:** `blend = 0.5 ± 0.15` gegen die Eltern, danach `±0.05` Rauschen, auf 0..1 geklemmt — Stärken werden neu gewürfelt, nicht kopiert.
3. **Dominanz-Drift:** `dominant ? rng.next() > 0.2 : rng.next() < 0.3` — dominant → rezessiv mit p = 0.2, rezessiv → dominant mit p = 0.3.

**Was daran trotzdem geschlossen ist:** Fremdgene stammen aus `GENE_POOL` (hartcodiert in `genome/pool.ts`, 15 Einträge), und ihre Dominanz ist ein **Pool-Attribut** — kein Mutationsergebnis. Mutation erfindet also kein neues Gen, sie reshuffelt die 15 mit neuen Stärken. „Unendlich viele Basen" ist derzeit auf der **Stärkeachse offen** und auf der **Allelachse geschlossen**. Das ist gute Nachricht und Grenze zugleich: das Modell ist bereits „endlich viele Allele, unendlich viele Kombinationen" — nur der **Eingang** ist ein Dreier-Menü (`PLANTS_SOURCE`: sprout/rootwall/mycelia, je 2 Gene = 6 Allele im Umlauf).

**Positionskopplung statt Genkopplung.** `cross.ts` paart `a[i % a.length]` gegen `b[i % b.length]` — nach Array-**Index**, nicht nach Gen-ID. Bei 2+2 Genen heißt das: `rapid` konkurriert immer mit `shield`, `pierce` immer mit `thorns`. Bei ungleichen Längen wrappt `%` und paart beliebige Gene. Deshalb fühlt sich der Genpool trotz Mutation schnell erschöpft an: praktisch sind es 2 Slots × 3 Basen, nicht 15 Allele.

**Der stärkste Mechanismus ist unbemerkt.** Die Dedup-Stufe (`seen`, Behalten bei `g.power > existing.power`) sichert je Gen-ID das **stärkere** Gen — zusammen mit Blend und Jitter ist das die eigentliche „stärker"-Mechanik des Spiels. Sie funktioniert, war aber nirgends benannt und ungetestet, bis dieses Gate entstand.

**Korrektur an meiner eigenen ersten Messung (Protokollpflicht):** Der erste Dominanz-Test benutzte Sprout + Rootwall als Eltern — beide tragen ausschließlich **dominante** Gene. „Dominanz kann entstehen" ist mit diesem Paar strukturell unmöglich; der Test schlug fehl, ohne dass der Code defekt war. Korrigiert wurde nicht der Code, sondern das Kriterium (Gewinn-Messung gegen Sprout + Mycelia, die einzige Basis mit rezessiven Genen). Das steht hier, damit dieser Fehlschlag niemandem später als Bug-Beweis dient.

## B16. Route sichtbar machen & Genom-Modell schärfen (Auftrag aus A14/A15/A16)

### B16.2 Paarung entscheiden: Slot oder Gen (aus A15)

Entweder Paarung nach Gen-**ID** (Alignment über die Allelmenge) oder die Slot-Semantik wird explizit als Design dokumentiert. Beides verändert Wurf-Ergebnisse und damit Balancing ⇒ separat ausrollen, wie B15.4.

### B16.3 Allelmenge öffnen („unendlich viele Basen")

`PLANTS_SOURCE` bleibt die Definition der **Allele** (was ein Gen kann, kostet, rendert); ein Samen erhält einen Index, und `deriveSeed(GAME_SEED, 'seed', index)` zieht Rolle + 3–5 Gene mit Stärke und Dominanz deterministisch. `createBaseVariants()` wird damit eine Schleife um dieselbe Config statt einer Drei-Einträge-Liste — die Discovery-Chain funktioniert dafür bereits heute. Gate: gleicher Index ⇒ identisches Genom, verschiedene Indizes ⇒ verschiedene Genome.

### B16.4 Zwei Stream-Verschmutzungen beheben (aus dem Review, verifiziert)

- `generateCrossResults` zieht `rng.next()` für `probability`, **nachdem** das Kind fertig ist — und **niemand** liest den Wert (nur die Typdeklaration in `types.ts`). Er liegt aber im Gameplay-Strom: Kandidat *i+1* hängt von ihm ab. Ein Anzeigewert gehört nicht in den Gameplay-Strom.
- `generateName` zieht Präfix/Suffix aus **demselben** Strom wie `crossGenomes`. Damit verschiebt jede Änderung an `names.source` — Präsentationsdaten — alle nachfolgenden Genome und damit jeden `lifeseed:`-Hash der Discovery-Chain.

Fix: Namens- und Anzeige-Zufall in den `visual`-Namespace (eigener, abgeleiteter Stream). Verändert bestehende Ergebnisse ⇒ versioniert ausrollen.

### B16.5 `generation` ist zwei Dinge

In `rollGachaCross` wird `generation: crossIndex` gesetzt, in `generateCrossResults` ist `generation` der Parameter (Stamm-Generation). Ein Feld, zwei Bedeutungen — wer das später „vereinheitlicht", ändert die IDs gespeicherter Kreuzungen. Entweder umbenennen oder die Doppelbedeutung im Typ dokumentieren.

### B16.6 DoD für B16

- [x] Renderer zeichnet die aktive Route (A14); Re-Bake nur bei Routen-/Seed-Wechsel — **UMGESETZT (2026-09-16)**
- [x] `getRoute()` hat einen Konsumenten oder existiert nicht mehr; Kommentar richtiggestellt — **existiert nicht mehr**
- [x] Gate: Route-Vertrag grün, kein Frame-Rebake (B12-Messung bleibt grün) — `placement_map.test.ts` (State-Vertrag + Render-Parität), `sources.test.ts` (Resolver)
- [ ] Entscheidung B16.2 dokumentiert und umgesetzt
- [ ] Gate: Anzeige-/Namenszufall außerhalb des Gameplay-Stroms; Discovery-Hashes stabil
- [ ] Gate: gleicher Samen-Index ⇒ identisches Genom (B16.3)
- [ ] `tsc` clean, Suite grün, `vite build` grün

## B26. Gene als Paare — die Style-Ebene trägt Fähigkeits-Semantik (Befund: GAP-Zucht→Visual)

### B26.1 Befund

Das Genom spricht über Gen-ID (15 Allele in `genome/pool.ts`) zwei getrennte Sprachen, die nur
zufällig derselben Quelle entspringen: `GENE_TO_EXTRA` (visuelles Ornament) und
`GENE_TO_EFFECT` (Gameplay-Effekt) in `config/genes.source.ts` sind **zwei lose Tabellen**. Das
Größenproblem: `fire` gibt `EXTRA_SPIKE` UND `EFFECT_BURN`, aber nichts erzwingt, dass der
Dorn visuell zum Brand passt — die Zuordnung ist ungewollt entkoppelt. Konsequenz in der Fläche:
Ein Spieler, der eine Dornen-Pflanze sieht, kann nicht ableiten, was sie tut; umgekehrt hat
eine Pflanze mit Effekt-Tint keinen erkennbaren Grund, diesen Tint zu tragen. Die Skala
(`strength → scale`) ist die einzige sicher lesbare Genom-Aussage. Dazu die Vorschau-Lücke
(seit B27 im Code behoben): Zucht- und Hub-Vorschau zeigten `variant.color` statt der
`ResolvedVisual`-Palette — die Zucht entschied unterhalb der echten Pipeline.

Ziel (Spielentscheidung): **Extras sind Style mit Fähigkeits-Semantik.** Jedes sichtbare
Ornament trägt einen passenden Effekt („Dornen schießen durch = pierce“, „Hut schildet =
shield“), bis hin zu komplexeren Mechaniken — das Gen ist die Quelle, das Paar
(Gene → Extra+Effect) die Aussage. Kein Genom-Neubau: Das Pool-Modell (15 Gene, Power,
Dominanz) bleibt; die zwei Mappings werden zu **einem** Paar-Vertrage verdichtet.

### B26.2 Spec

1. **Eine Quelle pro Paar** (`config/genes.source.ts`): `GENE_TO_EXTRA` + `GENE_TO_EFFECT`
   wurden im Prototyp zu einem einzigen Vertrag `GENE_PAIRS: Record<GeneId, { extra: ExtraId;
   effect: EffectId }>`. Die alten zwei Tabellen werden Views über dieses Paar (Exporte
   bleiben, damit Konsumenten nicht brechen) — oder Konsumenten werden direkt umgestellt;
   beides ist zulässig, solange **genau eine Tabellen-Wahrheit** existiert. **Gewählt: die
   zweite Variante** — beide Alt-Tabellen sind entfernt, alle drei Konsumenten
   (`genome/visualMap.ts` für Ornament+Tint, `meta/store.ts` für `bredStats`→Projektil-Riding,
   Gate-Tests) lesen `GENE_PAIRS` direkt.
2. **Semantische Paarung statt Zufall:** Jedes Paar wird explizit geprüft: passt das
   Ornament zur Fähigkeit? Bestehende Paare sind überwiegend stimmig (`fire → spike/burn`,
   `shield → hat/shield`), Korrekturbedarf nur wo die Metapher bricht (`heavy → hat` liest
   sich nicht als „schwerer Treffer“ — Vorschlag: ein sichtbar dichtes/dunkles Extra für
   Masse). Neue Paare (Komplex-Mechanik) kommen künftig als Paar, nie als lose Tabellenzeile.
3. **`visualMap.ts` bleibt die einzige Ableitung:** `genomeToVisualInput` liest das Paar
   statt zweier Tabellen; die Top-2-Extras/Top-1-Effect-Kappung (B16.8-Kostenkurve) bleibt
   unverändert — Verdichtung, keine Erweiterung des Feature-Raums pro Pflanze.
4. **Vorschau-Parität ist gelockt** (B27-Vorarbeit): Zucht- und Hub-Vorschau lesen
   `resolveVisual(genomeToVisualInput(...)).palette.base` — dieselbe Ableitung wie der Run.
   **Präzise Zusage (im Prototyp gemessen):** garantiert identisch ist die **Komposition**
   (Basis, Ornament-Layer, Effect, Reihenfolge) — sie hängt allein am Genom bzw. `geneHash`.
   Nicht identisch ist der **Hex-Wert**: die Vorschau bindet an `GAME_SEED`, das Feld an
   `deriveSeed(GAME_SEED,'world','run',runId,1)`, und `resolvePalette`/`resolveGeometry`
   verbrauchen diesen Seed (Mutation ±20/Kanal, Rarity-Zweig, Scale ±0.05). Messung:
   Vorschau `#f57d52` vs. Feld `#f27a4f`, über acht Run-Seeds `#f27a4f`…`#ff9744`.
   Ein Gate-Test lockt daher die **Komposition** über beide Seeds (nicht den Hex-Wert).
   Offene Entscheidung: Vorschau an den kommenden Run-Seed binden (exakter Treffer) oder den
   Jitter aus `variantKey` statt `rootSeed` ableiten (dann ist die Vorschau bildgleich).
5. **Kein Sync-Verstoß:** `bredStats`/Projektil-Riding (B6) lesen dieselbe Paar-Zeile
   (via `genomeEffectIds`) — die Verdichtung darf die Gameplay-Semantik nicht ändern, nur
   die Tabellen-Verwaltung. Verifiziert durch unveränderte `cross.test.ts`-Schwellen.

### B26.3 Gate-Tests (Konzept)

Ergänzung in `src/config/sources.test.ts` (dort leben bereits die Source-Validierungen):

1. **Paar-Vollständigkeit:** jedes Gen im `GENE_POOL` hat ein Paar in `GENE_PAIRS`; jedes
   Paar-Extra/Paar-Effect referenziert gültige `EXTRA_*`/`EFFECT_*`-IDs (bestehende
   IDs-Checks laufen unverändert weiter).
2. **Keine Zweittabellen:** im Prototyp dadurch erzwungen, dass die Alt-Namen **gelöscht**
   sind — ein Import von `GENE_TO_EXTRA`/`GENE_TO_EFFECT` kompiliert nicht mehr (stärker als
   ein String-Test). Paar-Vollständigkeit (Test 1) ist damit die einzige Tabellen-Wahrheit.
3. **Basis-Kompatibilität:** für jede Base in `TYPE_BASES` gilt: das erlaubte
   Extra/Effect-Paar jedes ihrer Gene überlebt `resolveCompatibility` (kein Gen, dessen
   Ornament/Effekt von der Basis weggefiltert würde — sonst sichtbare stillschweigende
   Verluste). **Prototyp-Befund (gemessen, noch nicht gedreht):** der Verlust ist real —
   `EXTRA_SPIKE` ist nur mit `BASE_CACTUS/THORN/ROOT` kompatibel, Schützen ziehen aus
   `THORN/FROND/FLOWER`; über 12 Feuerschützen-Genome zeigt **1/12** den Dorn. Zusätzlich:
   `EXTRA_EYE/MOUTH/SCAR` erzeugt **kein Gen** (tote Ornament-Vokabel), und
   `EXTRA_SPIKE` steht für vier Gene (`fire/thorns/venom/pierce`) — das Ornament ist also
   mehrdeutig, das Gen am Bild nicht eindeutig ablesbar. Beide Tests pinnen den Ist-Zustand
   (Muster B14.3). Die Auflösung ist eine Content-Entscheidung: Kompatibilität erweitern,
   Basis nach dem Paar wählen, oder Zwei-Gang-System (Basis-Ornament + Fähigkeits-Aufsatz).
4. **Vorschau-Parität:** für eine deterministische Genom-Stichprobe: Farbe in der Vorschau
   (Greenhouse/MainMenu-Pfad) == Farbe im Run (Renderer-Pfad) — derselbe `variantKey`.
5. **Gameplay-Neutralität:** `genomeEffectIds`-Ausgaben sind identisch vor/nach der
   Verdichtung (Fix-Test mit eingefrorenen Erwartungswerten aus der alten Tabelle).

### B26.4 Prototyp-Umsetzung (dieser Sprint): ein Gen, drei Kanäle

Gebaut wurde das Referenz-Paar `fire → EXTRA_SPIKE + EFFECT_BURN` und der Beweis, dass **eine
Zeile** alle drei Konsumenten speist (Test: `simulation_beetle_fire_pair.test.ts`, Gate: `sources.test.ts`):

| Kanal | Pfad | Gemessen an `cross_fire` (Seed 4242) |
|---|---|---|
| 1 visualMap | `genomeToVisualInput` → `resolveVisual` | Basis `BASE_THORN`, Layer `stalk·thorns·bud·spike·effect_tint`, Tint `#fb923c` = `EFFECT_BURN.paletteModifier` aus der Source |
| 2 Vorschau | `previewColor(variant, GAME_SEED)` | `#f57d52` == Feld-Palette `palette.base` (`resolveBredVisuals`) — Gewächshaus und Hub lesen jetzt diese eine Funktion, nicht mehr `variant.color` |
| 3 Run | `genomeEffectIds` → `deriveBredEntry.effects` → `stats.effects[0]` → `projectile.effectId` | Projektil trägt `EFFECT_BURN`, Treffer setzt `burnTicks` — der Brand ist im echten `SimulationRoot`-Lauf nachgewiesen |

Die Verdichtung ist **gameplay-neutral**: alle 15 Paare sind 1:1 aus den Alt-Tabellen übernommen,
`cross.test.ts`-Schwellen und `genomeEffectIds`-Ausgaben unverändert. Was der Prototyp sichtbar
machte, ist Content — nicht Code (siehe B26.3/3).

### B26.5 DoD für B26

- [x] `GENE_PAIRS` existiert in `genes.source.ts`; die alten zwei Tabellen sind **entfernt**
      (kein View-Ballast, kein Konsument liest mehr `GENE_TO_*`)
- [x] `genomeToVisualInput` liest das Paar; Kappung Top-2/Top-1 unverändert
- [x] Gate-Tests grün; `cross.test.ts`-Schwellen unverändert (Gameplay neutral)
- [x] Vorschau/Run-Farb-Parität test-gelockt (deterministisch, `previewColor`)
- [x] Riding-Beweis im echten Run (Projektil-Effekt + Burn-Treffer, nicht nachgebildet)
- [ ] Review der 15 Paare als Content entschieden (mehrdeutige Ornamente, tote Vokabel
      `EYE/MOUTH/SCAR`, `heavy → EXTRA_HAT`) — Befunde sind gepinnt, Auflösung offen
- [ ] Basis-Kompatibilität gedreht: Paar-Ornament darf nicht stillschweigend wegfallen
      (1/12-Befund) — Kompatibilität, Basis-Wahl oder Zwei-Gang-System entscheiden

---

### T7-Status (24.09.2026) — Source-Wahrheiten belegt, Balance offen

`SEED_PRICE`, `poolPriceOf`, Brut-Reife und Slot-Gates liegen in `config/*.source.ts`; die Anzeigeformel für Nektar liegt nur noch im `ScoreSystem`. Die offenen Punkte P-8/P-9/P-11/P-18/P-19 sind keine weitere Implementierungsaufgabe, sondern eine nicht getroffene Produktentscheidung: differenzierte `reward`-/`scoreValue`-Kurven, Saatpreis versus Raritätswert, Brutkosten sowie die gewünschte Wellen- und Mutationskurve. Bis dahin bleiben die bestehenden Werte unverändert und als Balanceentscheidung sichtbar.

## B30. Brut-Seed in eigener Domäne — Migrationsentscheidung statt Namensleihe (Befund: Source → Runtime)

### B30.1 Befund

Die Käferzucht lief unter dem RNG-Namespace `enemy`. Unter diesem einen Namen lagen drei
verschiedene Spielbereiche: Gegner-Spawns (`enemySystem`), Crit-Rolls (`projectileSystem`) und die
Brut-Identität (`deriveBroodSeed` plus der Brut-Wurf-Strom in `rollBrood`). Geteilter Strom-State
war dabei **kein** Problem — `makeRng` erzeugt je Aufruf einen unabhängigen Strom aus
(namespace, seed), es gab also keinen zufälligen Übersprecher. Falsch war die **Benennung der
Domäne**: wer die Brut-Ableitung anfasst, zieht lautlos das Gegnerverhalten mit (und umgekehrt).
Zusätzlich trug `rollBrood` den Namen zweimal — einmal als Konstante `BROOD_SEED_NAMESPACE`,
 einmal als Literal im `makeRng`-Aufruf; die zwei Stellen hätten auseinanderlaufen können.

Die Zuchtwirtschaft ist außerdem die einzige **bezahlte** Ableitung im Spiel (35 Nektar je Brut),
während Gegnerverhalten nichts kostet. Genau deshalb braucht der Wechsel eine ausgewiesene
Migrationsentscheidung — nicht nur ein umbenanntes Literal.

### B30.2 Migrationsentscheidung

**Scharfer Schnitt, keine Datenmigration.** Die Ableitungs-Eingaben bleiben (Eltern-IDs +
`broodIndex` aus dem monotonen Zähler), nur die Domäne wechselt. Die Folgen sind benannt:

| Was passiert | Warum das vertretbar ist |
|---|---|
| Ein **noch nicht abgeholter** Wurf zeigt einmalig drei andere Kandidaten | Die bezahlte Zusage lautet „drei Kandidaten, du wählst einen“ — sie bleibt unverletzt. Sichtbar wird der Unterschied nur, wer Kandidaten gemerkt hat und **vor** dem Abholen aktualisiert: ein Fenster innerhalb eines Besuchs, denn Ansehen und Abholen sind derselbe Vorgang |
| `neededWaves`, `startedWave`, `broodIndex`, `broodGeneration` | unverändert — kein Nektar, keine Queue, kein Zähler betroffen |
| Bereits abgeholte Käfer (`meta.beetles`) | unverändert: Specimen sind **Daten**, keine Ableitung |
| Save-Schema | **kein Bump** — es wird keine Datenform geändert. Der Eintrag trägt weiterhin nur Eingaben (kein Seed, keine Kandidaten) |

Verworfen wurden zwei Alternativen, beide bewusst: **(a)** ein pro Brut gespeichertes
Namespace-/Versionsfeld — hätte eine Legacy-Verzweigung für alle Zeiten etabliert (genau die
Parallelwahrheit, die B26/B29 gerade abgebaut haben) für einen Effekt im Sekundenbereich;
**(b)** die drei Kandidaten beim Buchen einzufrieren — widerspricht dem Vertrag „Seeds sind
ableitbar, nie Zustand“ und hätte ein größeres Feldschema plus Migrationspfad gekostet.
Der etablierte Präzedenzfall im Repo ist derselbe Schnitt: `RUN_SEED_VERSION` (App wirft einen
Save weg, dessen Seed nicht zur aktuellen Ableitung passt).

### B30.3 Spec

1. **Eigene Spiel-Domäne:** `RngNamespace` und `GAMEPLAY_NAMESPACES` erhalten `brood`; die
   Präsentations-Listen bleiben unberührt (FX ON/OFF darf die Zucht nie stören).
2. **Eine Konstante, zwei Verwendungen:** `BROOD_SEED_NAMESPACE = 'brood'` gilt für die
   Seed-Ableitung **und** den Wurf-Strom (`makeRng(BROOD_SEED_NAMESPACE, seed)`) — das frühere
   zweite Literal ist weg, die beiden Stellen können nicht mehr driften.
3. **Der Schnitt ist test-gepinnt:** Seeds, Kandidaten-IDs und Genome-Hashes sind eingefroren;
   zusätzlich ein Literal der **Gegner**-Domäne, das sich nicht bewegen darf.
4. **Die Invariante, die den Schnitt trägt:** jede persistierte Brut bleibt abholbar (für
   gespeicherte `broodIndex`-Werte liefert `rollBrood` genau drei gültige, eindeutig
   identifizierte und einsatzfähige Kandidaten).
5. **Die Entscheidung selbst ist gepinnt:** ein `PendingBrood`-Eintrag trägt genau seine sechs
   Eingabefelder. Wer ein Seed-/Namespace-Feld ergänzt, muss diese Sperre bewusst ändern und die
   Migrationsfrage neu beantworten.

### B30.4 Gate-Tests

`src/meta/brood_identity.test.ts` (7 Fälle):

1. Domäne vorhanden (gameplay) und **nicht** in den Präsentations-Namespaces
2. Dieselben Eingaben ergeben in `brood`, `enemy` und `plant` verschiedene Seeds; der alte
   `enemy`-Wert kommt nicht mehr heraus
3. Literale eingefroren: `deriveBroodSeed`, Kandidaten-IDs + Genome-Hashes, `makeRng('enemy')`
   unverändert, `makeRng('brood')` als anderer Strom bei gleichem Zahlen-Seed
4. Migrations-Invariante über die gespeicherten `broodIndex`-Werte 0/1/2/7/42
5. Kein Schema-Bump: Schlüsselmenge des gespeicherten Eintrags
6. Abholung eines **unveränderten Alteintrags** ohne Migrationscode — Vorschau == Abholung
7. Eine neu gebuchte Brut reift und wird zum Specimen der neuen Domäne

### B30.5 DoD für B30

- [x] `brood` ist eine eigene Spiel-Domäne; Ableitung und Wurf-Strom nutzen EINE Konstante
- [x] Migrationsentscheidung dokumentiert (scharfer Schnitt) samt verworfenen Alternativen
- [x] Kein Schema-Bump; Alteinträge werden ohne Migrationscode abgeholt
- [x] Gegner-Domäne nachweislich unberührt (Literal-Test)
- [x] Gate-Tests grün, tsc clean, `vite build` grün, E2E grün
- [x] Kandidaten tragen nie zwei identische Kampfprofile (19.09.2026) — der frühere Vorbehalt
      „zwei der drei Kandidaten mit gleichen Stats" ist damit geschlossen; Lock siehe QA-Abgleich

---

## QA-Abgleich (19.09.2026) — erledigte Befunde dieser Domäne

Quelle: Spielerbericht v2, QA v0.0.49, Re-Test + DE-Fassung v0.0.53, Verständnis-QA v0.0.55,
externer Spieler-Playtest 19.09.2026. Nur am aktuellen Code **belegte** Erledigungen; alles
weiterhin Offene steht in `docs/process/ROADMAP.md` §3.

- **„Warum sehen alle Käfer fast identisch aus" — BEHOBEN (Gründer-Erbgut).** `beetles.source.ts`
  dokumentiert den Bruch selbst: vorher trug jeder Gründer GENAU EIN Gen, und weil die Gene nur
  Panzerdecken-Achsen bewegten, lag `carapaceForm` bei allen auf `flat` und `dress` auf `scaled`.
  Jetzt trägt jeder Gründer ein Erbgut (Blatthüpfer sprinter+jumper+winged, Schildkäfer
  carapace+hardshell+taunt, Hummel swarmborn+furry+winged+sting) und jede Art einen Körperplan.
- **„Ein Farbwechsel allein ist kein neues Tier" — BEHOBEN.** Der Käfer-Deskriptor gewichtet Form
  (Körper, Panzer, Mandibeln, Fühler, Beine, Decken, Organe) und setzt die Pigment-Achsen auf
  Gewicht 0; der Neuheits-Vergleich läuft über diesen Vektor, nicht über die Farbe.
- **„Zucht ist Glücksspiel / Elternähnlichkeit unsichtbar" — BEHOBEN.** Vererbung läuft über den
  gemeinsamen Kern (`genome/breeding.ts`): Dominanz entscheidet die Form, die Kraft mischt beide
  Allele in KANONISCHER Reihenfolge (vertauschte Eltern ergeben dasselbe Kind), rezessive Anlagen
  wandern gedämpft mit und erwachen mit der Drift. Die Elternbindung ist als Vertrag gepinnt
  (`parentSimilarityOk` gegen die stetige `driftFor`-Kurve), die Generation zählt wirklich weiter
  (jüngster Elternteil + 1).
- **Kandidaten konnten Zwillings-Profile tragen — BEHOBEN (19.09.2026).** Der Neuheits-Vergleich
  maß nur das AUSSEHEN: gemessen trugen **11 von 72 Bruten (15,3 %)** zwei Kandidaten mit
  identischen Stats, und die Form-Distanz dieser Paare lag bei 0,026–0,064 (Schwelle 0,055) —
  der Spieler wählte zwischen zwei Bildern desselben Tiers. Eingriff, Source-driven und modular:
  `rollCandidates` kennt die **optionale Domänen-Bedingung `distinct`** (ein Entwurf mit bereits
  vergebenem Kampfprofil verliert jeden Vergleich), und die Brut sucht 12 statt 6 Versuche
  (`BEETLE_BREED.noveltyAttempts`); die Pflanzenzucht bleibt unverändert bei 6. Ergebnis:
  **0 von 72** Bruten mit Zwillingen (Messmenge: 3 Gründer, alle geordneten Paarungen × 8
  Brut-Indizes = 72 Bruten; „vorher" ist mit `4d50cc6^` nachgerechnet, nicht erinnert),
  Form-Distanz der Kandidaten unverändert (Mittel 0,0753 →
  0,0758), Determinismus nachgemessen (zwei Aufrufe bytegleich). Lock: `genome_beetle.test.ts`
  „drei Kandidaten, drei WAHLEN" fährt ALLE Specimen-Paarungen × 8 Brut-Indizes; die Mutation
  (Bedingung entfernt) macht ihn rot — belegt, nicht behauptet.
- **Verworfener Zwischenstand (eigener Fehler, benannt).** Der erste Versuch mischte die
  Kampfwerte als zusätzliche ACHSEN ins Form-Maß. Gemessen senkte das die mittlere Form-Distanz
  der Kandidaten von 0,075 auf 0,069 — „mehr Wahl" wäre also mit „weniger sichtbarem
  Unterschied" bezahlt worden. Deshalb ist das Profil eine ZUSATZ-Bedingung statt eines
  Achsen-Zusatzes; der gepinnte Kandidatensatz der Fachkreuzung bleibt dadurch bitgleich, und
  nur Bruten mit Zwillingen würfeln anders (Specimen sind Daten — keine Meta-Migration).
- **Ehrliche Grenze (gemessen, nicht behoben — sie ist Physik dieser Maschine).** Sind zwei Eltern
  genetisch gleich, erhält die Rekombination die Kräfte EXAKT: beide Allele sind identisch, also
  kürzt sich der Misch-Bias heraus, und ein Dominanz-Kippen ändert die Käfer-Werte gar nicht
  (Dominanz wirkt nur auf die Form). Vielfalt entsteht dort ausschließlich über Mutation — genau
  deshalb steht das Brut-Budget bei 12 Versuchen. Wer noch mehr Vielfalt will, muss die
  Mutations-Chance mit dem Neuheitsdruck koppeln; das ist eine BALANCE-Entscheidung des
  gemeinsamen Kerns (sie bewegt auch die Pflanzenzucht) und steht als P-9 in der ROADMAP.
- **B31 — Die Brutkandidaten sind SICHTBAR verschieden (20.09.2026, Spieltest-Befund am Preview).**
  „Drei Wahlen" war bis hierhin eine Zusage über ZAHLEN: die Stats waren verschieden, das BILD war
  es nicht. **Alle Messwerte dieser Regel (48 Bruten, Farbabstände, Pixelmaße, gepinnte
  Untergrenzen, Mutationsprüfung) stehen in Devlog 21** — der Contract nennt die Regel und die
  Belege, nicht die Zahlen noch einmal.
  Vertrag jetzt, an EINER Stelle je Wahrheit:
  · Der **Sichtbarkeits-Gewinn** der Formmaße lebt in `src/render/beetles` (`BEETLE_DRAW_GAIN` +
    `beetleDrawMetrics`) — Zeichnung und Messung lesen dieselbe Formel, keine zweite Wahrheit.
  · Die **Farbe** wird in `pigmentFor` ZULETZT abgeleitet; ihre Streuung liegt auf der Pigment-
    Achse bzw. einem Weg um die gehegte Palette (`BEETLE_PIGMENT_SCATTER`), nie als Filter über
    dem Ergebnis. Damit bleibt jede Farbe ein Rampen-Eintrag.
  · Der Deskriptor gewichtet Pigment mit **0**: Farbe ist Anzeige-Wahrheit, nie Balance — die
    Streuung verschiebt das Neuheits-Maß nicht (Mittel 0,0758 → 0,076, nachgemessen).
  · **Gründer tragen ihre DOKUMENTIERTE Farbe**: `beetlePhenotypeOf({…, specimenId})` setzt bei
    Generation 1 den Source-Anker als Hauptfarbe (Muster/Familie bleiben aus dem Genom, ohne
    Streuung). Ein gezüchtetes Tier erbt die `specimenId` eines Elternteils, nie dessen Generation
    — es streut weiter. Vorher trugen alle drei Gründer dieselbe Farbe; der Anker war faktisch tot.
  · Die gestreute Farbe ist eine Zusage über **Anzeige**, nicht über Balance: Pigment wiegt im
    Deskriptor 0, die Form-Distanz bleibt bitgleich.
  Lock: `beetleVisibility.test.ts` (B31) pinnt die Brut-Aggregate, den Gründer-Anker, die
  Untergrenze des schwächsten Gründerpaares, die Untergrenze des schwächsten Kandidatenpaares,
  die Anker-Grenze (nur Generation 1) und Determinismus. **Mutation geprüft** (Zeichen-Gewinn
  entfernt, Streuung entfernt, Anker entfernt) — welche Pins dabei fallen, steht in Devlog 21.
  Ehrliche Grenze: die Fühlerzahl ist in jeder Brut gleich (fester Schwellwert), und bei rein auf
  das Genom gestützter Farbe können zwei Geschwister dieselbe Stufe treffen — die gepinnte
  Untergrenze des schwächsten Paares ist entsprechend dünn (Devlog 21 nennt die Zahl). Eine
  Garantie INNERHALB der Brut bräuchte eine SICHT-Bedingung in der Brut-Suche (wie `distinct` für
  die Stats) — bewusst nicht gebaut, sie kostet Suchbudget und ist eine Eigentümer-Entscheidung.


## B31. Descriptor-Achsen und Gewichte muessen zeichengleich lang sein (Befund: GAP-Zucht→Neuheit)

### B31.1 Befund

`BEETLE_DESCRIPTOR_AXES` in `beetlePhenotype.source.ts` hatte 29 Eintraege, `BEETLE_DESCRIPTOR_WEIGHTS`
nur 27. `weightedDistance` in `breeding.ts` paart die beiden Arrays **positionsweise** mit
`n = Math.min(a.length, b.length, weights.length)` und bricht danach kommentarlos ab — eine
stille Trunkierung, kein Fehler. Ab Index 17 trug jede Achse das Gewicht ihres Nachbarn, und die
letzten beiden Achsen `pronotum` und `jumpLegs` fielen aus dem Mass ganz heraus. Gemessen an einem
Organ-Tausch: **erwartet groesser als 0, erhalten 0** — der Tausch zaehlte exakt null Neuheit,
`hardshell` und `jumper` konnten so gar kein neues Tier erzeugen.

### B31.2 Regel

Die Laengengleichheit der beiden Arrays ist Teil des Contracts, keine Formatfrage. Ein neu
aufgenommenes Achsenpaar gehoert **gemeinsam** in beide Listen. Neu aufgenommen:

- `sheen` (Glanz) und `asymmetry` (Asymmetrie) stehen auf **0**. Beide enden ausschliesslich im
  Renderer (`observers/beetles.ts`, `globalAlpha` und Seitenversatz) und stehen dort unter
  `beetlePhenotype.ts:71`: „Farbe ist Anzeige-Wahrheit, nie Balance". Ein Nullgewicht ist damit
  keine Balanceentscheidung, sondern die Umsetzung dieser Regel — dieselbe Logik wie beim
  Pigment der Pflanze (`phenotype.source.ts`).
- Der Test `beetlePhenotype.test.ts` (`DESCRIPTOR-VERTRAG`) pinnt Laengengleichheit und die
  Nullgewichte. `ORGAN-TAUSCH zaehlt als Neuheit` pinnt das Mass selbst.