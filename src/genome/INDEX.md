# Modul: genome

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/genome/`

## Umfang

20 Dateien · importiert `components`, `config`, `discovery` +4 · wird importiert von `components`, `config`, `discovery` +4

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`ballistics.test.ts`](./ballistics.test.ts) | 227 | 0 | CALL 243, IMPORTS 8, PASS 242, READ 115, STRING_REFERENCE 181 |
| [`ballistics.ts`](./ballistics.ts) | 132 | 3 | CALL 25, EXPORTS 5, IMPORTS 3, PASS 28, READ 21, RETURN 9, STRING_REFERENCE 11 |
| [`bases.ts`](./bases.ts) | 30 | 6 | CALL 6, EXPORTS 1, IMPORTS 3, PASS 6, READ 18, RETURN 2, STRING_REFERENCE 14 |
| [`beetle.ts`](./beetle.ts) | 188 | 9 | CALL 35, EXPORTS 9, IMPORTS 8, PASS 34, READ 96, RETURN 16, STRING_REFERENCE 13 |
| [`beetlePhenotype.test.ts`](./beetlePhenotype.test.ts) | 156 | 0 | CALL 151, IMPORTS 8, PASS 152, READ 136, RETURN 1, STRING_REFERENCE 58 |
| [`beetlePhenotype.ts`](./beetlePhenotype.ts) | 274 | 8 | CALL 123, EXPORTS 4, IMPORTS 8, PASS 118, READ 172, RETURN 8, STRING_REFERENCE 45 |
| [`breeding.test.ts`](./breeding.test.ts) | 201 | 0 | CALL 153, IMPORTS 6, PASS 150, READ 101, RETURN 5, STRING_REFERENCE 54 |
| [`breeding.ts`](./breeding.ts) | 271 | 0 | CALL 56, EXPORTS 13, IMPORTS 3, PASS 48, READ 120, RETURN 14, STRING_REFERENCE 7 |
| [`cross.test.ts`](./cross.test.ts) | 136 | 0 | CALL 125, IMPORTS 7, PASS 120, READ 97, STRING_REFERENCE 47 |
| [`cross.ts`](./cross.ts) | 218 | 1 | CALL 84, EXPORTS 5, IMPORTS 7, PASS 82, READ 123, RETURN 22, STRING_REFERENCE 41 |
| [`effects.ts`](./effects.ts) | 23 | 0 | CALL 3, EXPORTS 1, IMPORTS 3, PASS 3, READ 8, RETURN 1, STRING_REFERENCE 3 |
| [`enemyPhenotype.ts`](./enemyPhenotype.ts) | 74 | 1 | CALL 18, EXPORTS 3, IMPORTS 6, PASS 15, READ 29, RETURN 5, STRING_REFERENCE 8 |
| [`enemy_phenotype.test.ts`](./enemy_phenotype.test.ts) | 114 | 0 | CALL 122, IMPORTS 7, PASS 114, READ 72, STRING_REFERENCE 60 |
| [`gacha.ts`](./gacha.ts) | 113 | 6 | CALL 34, EXPORTS 7, IMPORTS 5, PASS 32, READ 39, RETURN 9, STRING_REFERENCE 19 |
| [`genome_beetle.test.ts`](./genome_beetle.test.ts) | 104 | 0 | CALL 75, IMPORTS 4, PASS 73, READ 94, STRING_REFERENCE 35 |
| [`phenotypeShared.ts`](./phenotypeShared.ts) | 16 | 0 | EXPORTS 2, RETURN 2 |
| [`plantPhenotype.test.ts`](./plantPhenotype.test.ts) | 173 | 0 | CALL 140, IMPORTS 8, PASS 139, READ 116, RETURN 2, STRING_REFERENCE 75 |
| [`plantPhenotype.ts`](./plantPhenotype.ts) | 240 | 4 | CALL 105, EXPORTS 5, IMPORTS 7, PASS 104, READ 169, RETURN 5, STRING_REFERENCE 73 |
| [`pool.ts`](./pool.ts) | 30 | 1 | EXPORTS 1 |
| [`visualMap.ts`](./visualMap.ts) | 65 | 7 | CALL 10, EXPORTS 3, IMPORTS 7, PASS 12, READ 21, RETURN 5, STRING_REFERENCE 10 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `BeetleParentRef` | type | `src/genome/beetle.ts` | 26 |
| `BeetlePhenotype` | interface | `src/genome/beetlePhenotype.ts` | 28 |
| `Descriptor` | type | `src/genome/breeding.ts` | 27 |
| `GENE_POOL` | const | `src/genome/pool.ts` | 6 |
| `GachaRoll` | interface | `src/genome/gacha.ts` | 10 |
| `LeafShape` | type | `src/genome/plantPhenotype.ts` | 25 |
| `PlantPhenotype` | interface | `src/genome/plantPhenotype.ts` | 35 |
| `ancestorOf` | function | `src/genome/beetle.ts` | 46 |
| `ballisticsOf` | function | `src/genome/ballistics.ts` | 90 |
| `basePlantVisualInput` | function | `src/genome/visualMap.ts` | 56 |
| `beetleMeasure` | const | `src/genome/beetlePhenotype.ts` | 256 |
| `beetlePhenotypeKey` | function | `src/genome/beetlePhenotype.ts` | 260 |
| `beetlePhenotypeOf` | function | `src/genome/beetlePhenotype.ts` | 155 |
| `beetlePower` | function | `src/genome/beetle.ts` | 29 |
| `bp` | function | `src/genome/ballistics.ts` | 44 |
| `breedGenome` | function | `src/genome/breeding.ts` | 43 |
| `broodGenomeHash` | function | `src/genome/beetle.ts` | 176 |
| `bucket` | function | `src/genome/phenotypeShared.ts` | 7 |
| `candidateRng` | function | `src/genome/breeding.ts` | 153 |
| `candidateSeed` | function | `src/genome/breeding.ts` | 148 |
| `carriedGenes` | function | `src/genome/breeding.ts` | 269 |
| `clamp` | function | `src/genome/phenotypeShared.ts` | 14 |
| `cooldownCxOf` | function | `src/genome/ballistics.ts` | 80 |
| `createBaseVariants` | function | `src/genome/bases.ts` | 9 |
| `crossGenomes` | function | `src/genome/cross.ts` | 179 |
| `crossPair` | function | `src/genome/gacha.ts` | 85 |
| `deriveBeetleStats` | function | `src/genome/beetle.ts` | 61 |
| `deriveBreedSeed` | function | `src/genome/gacha.ts` | 110 |
| `deriveBroodSeed` | function | `src/genome/beetle.ts` | 91 |
| `deriveChildGenome` | function | `src/genome/gacha.ts` | 74 |
| `deriveColor` | function | `src/genome/cross.ts` | 73 |
| `deriveGachaSeed` | function | `src/genome/gacha.ts` | 64 |
| `deriveStats` | function | `src/genome/cross.ts` | 21 |
| `deriveTraits` | function | `src/genome/cross.ts` | 66 |
| `descriptorDistance` | function | `src/genome/breeding.ts` | 158 |
| `enemyAncestorFor` | function | `src/genome/enemyPhenotype.ts` | 57 |
| `enemyGenomeFor` | function | `src/genome/enemyPhenotype.ts` | 37 |
| `enemyPhenotypeFor` | function | `src/genome/enemyPhenotype.ts` | 67 |
| `expressed` | function | `src/genome/breeding.ts` | 138 |
| `generateName` | function | `src/genome/cross.ts` | 80 |
| `genomeEffectIds` | function | `src/genome/effects.ts` | 15 |
| `genomeKey` | function | `src/genome/breeding.ts` | 264 |
| `genomePower` | function | `src/genome/breeding.ts` | 143 |
| `genomeToVisualInput` | function | `src/genome/visualMap.ts` | 41 |
| `legacyProfileFromEffects` | function | `src/genome/ballistics.ts` | 125 |
| `nearestDistance` | function | `src/genome/breeding.ts` | 183 |
| `parentSimilarityOk` | function | `src/genome/breeding.ts` | 258 |
| `plantMeasure` | const | `src/genome/plantPhenotype.ts` | 223 |
| `plantPhenotypeKey` | function | `src/genome/plantPhenotype.ts` | 227 |
| `plantPhenotypeOf` | function | `src/genome/plantPhenotype.ts` | 100 |
| `plantVisualInputFor` | function | `src/genome/visualMap.ts` | 25 |
| `rangeCxOf` | function | `src/genome/ballistics.ts` | 74 |
| `resolveAncestor` | function | `src/genome/beetle.ts` | 56 |
| `rollBrood` | function | `src/genome/beetle.ts` | 111 |
| `rollCandidates` | function | `src/genome/breeding.ts` | 196 |
| `rollGachaCross` | function | `src/genome/gacha.ts` | 22 |
| `toDeploySpec` | function | `src/genome/beetle.ts` | 181 |
| `variantPower` | function | `src/genome/gacha.ts` | 18 |
| `weightedDistance` | function | `src/genome/breeding.ts` | 171 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/genome/ballistics.test.ts` | 25 | `'Ballistik-Adapter — Genom ⇒ Schuss'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | describe |
| `src/genome/ballistics.test.ts` | 26 | `'Basispunkte sind die Quantisierung des genome_hash'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | it |
| `src/genome/ballistics.test.ts` | 27 | `0.3` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | bp |
| `src/genome/ballistics.test.ts` | 27 | `bp(0.3)` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 28 | `0.74996` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | bp |
| `src/genome/ballistics.test.ts` | 28 | `bp(0.74996)` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 29 | `0.75004` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | bp |
| `src/genome/ballistics.test.ts` | 29 | `bp(0.75004)` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 30 | `-1` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | bp |
| `src/genome/ballistics.test.ts` | 30 | `bp(-1)` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 31 | `5` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | bp |
| `src/genome/ballistics.test.ts` | 31 | `bp(5)` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 34 | `'ohne Gene: genau die alten Konstanten (Geschwindigkeit, kein Durchschlag, kein ` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | it |
| `src/genome/ballistics.test.ts` | 35 | `[g('rapid', 0.9)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 35 | `'rapid'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 36 | `p.speed` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 37 | `p.pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 38 | `p.critChance` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 39 | `p.critMult` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 42 | `'Durchschlag braucht den Effekt-Tag UND skaliert mit der Genstärke'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | it |
| `src/genome/ballistics.test.ts` | 44 | `[g('pierce', 0.29)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 44 | `ballisticsOf([g('pierce', 0.29)], 'shooter').pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 44 | `'pierce'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 46 | `[g('pierce', 0.3)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 46 | `ballisticsOf([g('pierce', 0.3)], 'shooter').pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 46 | `'pierce'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 48 | `[g('pierce', 0.5)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 48 | `ballisticsOf([g('pierce', 0.5)], 'shooter').pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 48 | `'pierce'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 49 | `[g('pierce', 1.0)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 49 | `ballisticsOf([g('pierce', 1.0)], 'shooter').pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 49 | `'pierce'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 51 | `[g('pierce', 0.9)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 51 | `ballisticsOf([g('pierce', 0.9)], 'shooter').pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 51 | `'pierce'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 54 | `'Der Effekt-Tag allein genügt nicht — das Gen muss ihn tragen'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | it |
| `src/genome/ballistics.test.ts` | 56 | `[g('swift', 1)]` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | ballisticsOf |
| `src/genome/ballistics.test.ts` | 56 | `ballisticsOf([g('swift', 1)], 'shooter').pierce` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | expect |
| `src/genome/ballistics.test.ts` | 56 | `'swift'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | g |
| `src/genome/ballistics.test.ts` | 59 | `'Krit: Basis 0.2 über der Schwelle, gedeckelt bei 0.35'` | 1 | [`src/genome/ballistics.test.ts`](ballistics.test.ts) | it |
