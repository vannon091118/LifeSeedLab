# Modul: meta

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/meta/`

## Umfang

16 Dateien · importiert `genome`, `simulation`, `src` +1 · wird importiert von `genome`, `simulation`, `src` +1

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`brood_domain.test.ts`](./brood_domain.test.ts) | 151 | 0 | CALL 97, IMPORTS 8, PASS 89, READ 75, STRING_REFERENCE 41 |
| [`brood_identity.test.ts`](./brood_identity.test.ts) | 184 | 0 | CALL 145, IMPORTS 9, PASS 128, READ 91, STRING_REFERENCE 28 |
| [`brood_loop.test.ts`](./brood_loop.test.ts) | 306 | 0 | CALL 243, IMPORTS 8, PASS 200, READ 168, STRING_REFERENCE 41 |
| [`brood_loop_continuation.test.ts`](./brood_loop_continuation.test.ts) | 216 | 0 | CALL 162, IMPORTS 9, PASS 137, READ 139, RETURN 1, STRING_REFERENCE 48 |
| [`cross_lifecycle.test.ts`](./cross_lifecycle.test.ts) | 233 | 0 | CALL 197, IMPORTS 8, PASS 156, READ 147, STRING_REFERENCE 68 |
| [`economy.ts`](./economy.ts) | 212 | 0 | CALL 38, EXPORTS 12, IMPORTS 9, PASS 28, READ 49, RETURN 27, STRING_REFERENCE 11 |
| [`entry_loop.test.ts`](./entry_loop.test.ts) | 211 | 0 | CALL 198, IMPORTS 7, PASS 159, READ 133, STRING_REFERENCE 46 |
| [`identity_invariants.test.ts`](./identity_invariants.test.ts) | 121 | 0 | CALL 59, IMPORTS 5, PASS 50, READ 66, STRING_REFERENCE 21 |
| [`loan.ts`](./loan.ts) | 62 | 1 | CALL 6, EXPORTS 3, IMPORTS 5, PASS 6, READ 5, RETURN 2, STRING_REFERENCE 9 |
| [`loan_stats.test.ts`](./loan_stats.test.ts) | 46 | 0 | CALL 25, IMPORTS 3, PASS 23, READ 22, STRING_REFERENCE 10 |
| [`metaInvariants.ts`](./metaInvariants.ts) | 95 | 0 | CALL 17, EXPORTS 6, IMPORTS 3, PASS 17, READ 31, RETURN 9, STRING_REFERENCE 14 |
| [`meta_migrations.test.ts`](./meta_migrations.test.ts) | 124 | 0 | CALL 102, IMPORTS 5, PASS 89, READ 64, STRING_REFERENCE 23 |
| [`run.ts`](./run.ts) | 283 | 0 | CALL 51, EXPORTS 12, IMPORTS 9, PASS 45, READ 94, RETURN 24, STRING_REFERENCE 18 |
| [`run_stats.test.ts`](./run_stats.test.ts) | 103 | 0 | CALL 68, IMPORTS 9, PASS 61, READ 61, RETURN 1, STRING_REFERENCE 44 |
| [`shop_pools.test.ts`](./shop_pools.test.ts) | 125 | 0 | CALL 124, IMPORTS 8, PASS 106, READ 99, STRING_REFERENCE 37 |
| [`store.ts`](./store.ts) | 209 | 6 | CALL 43, EXPORTS 8, IMPORTS 11, PASS 42, READ 78, RETURN 10, STRING_REFERENCE 36 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `LOAN_PLANT_ID` | const | `src/meta/loan.ts` | 22 |
| `META_KEY` | const | `src/meta/store.ts` | 18 |
| `META_VERSION` | const | `src/meta/store.ts` | 19 |
| `advanceCrossMaturation` | function | `src/meta/economy.ts` | 145 |
| `applyRunEnd` | function | `src/meta/run.ts` | 93 |
| `beginRun` | function | `src/meta/run.ts` | 71 |
| `buyPoolItem` | function | `src/meta/economy.ts` | 30 |
| `buyRearingSlot` | function | `src/meta/economy.ts` | 77 |
| `buySeed` | function | `src/meta/economy.ts` | 15 |
| `buySeedAndGerminate` | function | `src/meta/economy.ts` | 47 |
| `buySeedling` | function | `src/meta/economy.ts` | 184 |
| `canonicalVariantId` | function | `src/meta/run.ts` | 14 |
| `canonicalVariantId` | function | `src/meta/metaInvariants.ts` | 15 |
| `claimBrood` | function | `src/meta/run.ts` | 251 |
| `consumeSeedAndEnqueueCross` | function | `src/meta/economy.ts` | 98 |
| `defaultMeta` | function | `src/meta/store.ts` | 38 |
| `deriveBredEntry` | function | `src/meta/store.ts` | 24 |
| `deriveBroodGeneration` | function | `src/meta/metaInvariants.ts` | 56 |
| `deriveLoanPlant` | function | `src/meta/loan.ts` | 33 |
| `deriveRunStats` | function | `src/meta/run.ts` | 36 |
| `enqueueBrood` | function | `src/meta/run.ts` | 221 |
| `germinateSeed` | function | `src/meta/economy.ts` | 65 |
| `germinateVariant` | function | `src/meta/economy.ts` | 132 |
| `grantStartingMaterial` | function | `src/meta/metaInvariants.ts` | 28 |
| `healRipeness` | function | `src/meta/metaInvariants.ts` | 80 |
| `isCrossReady` | function | `src/meta/economy.ts` | 169 |
| `isLoanVariant` | function | `src/meta/loan.ts` | 25 |
| `isMatured` | function | `src/meta/economy.ts` | 161 |
| `keepCross` | function | `src/meta/run.ts` | 170 |
| `loadMeta` | function | `src/meta/store.ts` | 184 |
| `persistMeta` | function | `src/meta/store.ts` | 195 |
| `plantSeedlingIntoPot` | function | `src/meta/economy.ts` | 202 |
| `readyBroods` | function | `src/meta/run.ts` | 276 |
| `recordRunEnd` | function | `src/meta/run.ts` | 121 |
| `registerVariant` | function | `src/meta/run.ts` | 149 |
| `reserveRunId` | function | `src/meta/run.ts` | 53 |
| `resetMeta` | function | `src/meta/store.ts` | 207 |
| `sanitizeCounts` | function | `src/meta/metaInvariants.ts` | 40 |
| `sanitizePots` | function | `src/meta/metaInvariants.ts` | 87 |
| `toggleLoadout` | function | `src/meta/run.ts` | 206 |
| `updateMeta` | function | `src/meta/store.ts` | 201 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/meta/brood_domain.test.ts` | 37 | `'B30 — Brut-Domäne'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | describe |
| `src/meta/brood_domain.test.ts` | 38 | `() => {
    resetTestState();
    // B39 (QA v0.0.53 #2): die Brut kostet Nektar` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | beforeEach |
| `src/meta/brood_domain.test.ts` | 42 | `{ nektar: 5000 }` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | updateMeta |
| `src/meta/brood_domain.test.ts` | 45 | `'führt eine eigene Spiel-Domäne (FX ON/OFF darf sie nie stören)'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | it |
| `src/meta/brood_domain.test.ts` | 46 | `BROOD_SEED_NAMESPACE` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 47 | `GAMEPLAY_NAMESPACES` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 48 | `VISUAL_NAMESPACES` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 51 | `'trennt Brut-, Gegner- und Pflanzen-Domäne bei identischen Eingaben'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | it |
| `src/meta/brood_domain.test.ts` | 52 | `A` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | deriveBroodSeed |
| `src/meta/brood_domain.test.ts` | 53 | `GAME_SEED` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | deriveSeed |
| `src/meta/brood_domain.test.ts` | 53 | `brood` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 54 | `GAME_SEED` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | deriveSeed |
| `src/meta/brood_domain.test.ts` | 54 | `brood` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 56 | `brood` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 59 | `'friert Seed, Kandidaten-IDs und die unberührte Gegner-Domäne ein'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | it |
| `src/meta/brood_domain.test.ts` | 61 | `A` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | deriveBroodSeed |
| `src/meta/brood_domain.test.ts` | 61 | `deriveBroodSeed(A, B, 1)` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 62 | `'bumble'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | deriveBroodSeed |
| `src/meta/brood_domain.test.ts` | 62 | `deriveBroodSeed('bumble', B, 3)` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 80 | `c` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | broodGenomeHash |
| `src/meta/brood_domain.test.ts` | 80 | `rollBrood(A, B, 1).map(c => `${c.id}\|${broodGenomeHash(c)}`)` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 80 | `A` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | rollBrood |
| `src/meta/brood_domain.test.ts` | 87 | `makeRng('enemy', 12345).next()` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 87 | `'enemy'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | makeRng |
| `src/meta/brood_domain.test.ts` | 89 | `makeRng('brood', 12345).next()` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 89 | `'brood'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | makeRng |
| `src/meta/brood_domain.test.ts` | 90 | `makeRng('brood', 12345).next()` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 90 | `'brood'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | makeRng |
| `src/meta/brood_domain.test.ts` | 93 | `'Migrations-Invariante: jede persistierte Brut bleibt abholbar (3 gültige Kandid` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | it |
| `src/meta/brood_domain.test.ts` | 95 | `A` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | rollBrood |
| `src/meta/brood_domain.test.ts` | 96 | `brood` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 97 | `new Set(brood.map(c => c.id)).size` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 99 | `candidate.stats.hp` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 100 | `toDeploySpec(candidate).cost` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 100 | `candidate` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | toDeploySpec |
| `src/meta/brood_domain.test.ts` | 105 | `'Migrations-Entscheidung: die Brut speichert keine Ableitung (kein Schema-Bump)'` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | it |
| `src/meta/brood_domain.test.ts` | 110 | `A` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | enqueueBrood |
| `src/meta/brood_domain.test.ts` | 112 | `Object.keys(stored).sort()` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 120 | `stored.parentAAncestor!.specimenId` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
| `src/meta/brood_domain.test.ts` | 121 | `stored.parentAAncestor!.genome.map(g => g.id)` | 1 | [`src/meta/brood_domain.test.ts`](brood_domain.test.ts) | expect |
