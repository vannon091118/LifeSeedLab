# Modul: visual

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/visual/`

## Umfang

4 Dateien · importiert `components`, `dev`, `genome` +2 · wird importiert von `components`, `dev`, `genome` +2

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`beetleGenerator.ts`](./beetleGenerator.ts) | 78 | 5 | CALL 15, EXPORTS 4, IMPORTS 4, PASS 17, READ 24, RETURN 4, STRING_REFERENCE 11 |
| [`enemyVisuals.ts`](./enemyVisuals.ts) | 56 | 3 | CALL 6, EXPORTS 4, IMPORTS 4, PASS 8, READ 10, RETURN 5, STRING_REFERENCE 5 |
| [`generator.test.ts`](./generator.test.ts) | 93 | 0 | CALL 86, IMPORTS 6, PASS 79, READ 83, RETURN 1, STRING_REFERENCE 40 |
| [`generator.ts`](./generator.ts) | 113 | 12 | CALL 14, EXPORTS 6, IMPORTS 9, PASS 14, READ 22, RETURN 6, STRING_REFERENCE 19 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `ResolvedBeetleVisual` | interface | `src/visual/beetleGenerator.ts` | 14 |
| `ResolvedVisual` | interface | `src/visual/generator.ts` | 22 |
| `VisualInput` | interface | `src/visual/generator.ts` | 37 |
| `clearEnemyVisualCache` | function | `src/visual/enemyVisuals.ts` | 54 |
| `enemyDrawScale` | function | `src/visual/enemyVisuals.ts` | 46 |
| `enemyVisualCacheSize` | function | `src/visual/enemyVisuals.ts` | 50 |
| `enemyVisualFor` | function | `src/visual/enemyVisuals.ts` | 29 |
| `previewColor` | function | `src/visual/generator.ts` | 109 |
| `resolveBeetleVisual` | function | `src/visual/beetleGenerator.ts` | 31 |
| `resolveBeetleVisualFor` | function | `src/visual/beetleGenerator.ts` | 44 |
| `resolveBeetleVisuals` | function | `src/visual/beetleGenerator.ts` | 74 |
| `resolveBredVisuals` | function | `src/visual/generator.ts` | 96 |
| `resolveVisual` | function | `src/visual/generator.ts` | 69 |
| `vectorTintForEffect` | function | `src/visual/generator.ts` | 62 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/visual/beetleGenerator.ts` | 27 | ``${g.id}:${g.power.toFixed(3)}:${g.dominant ? 'd' : 'r'}`` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | strHash |
| `src/visual/beetleGenerator.ts` | 33 | `{ id: spec.id, genome: spec.genome, generation: spec.generation ?? 1 }` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | resolveBeetleVisualFor |
| `src/visual/beetleGenerator.ts` | 34 | `rootSeed` | 2 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | resolveBeetleVisualFor |
| `src/visual/beetleGenerator.ts` | 35 | `spec` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | beetleGenomeHash |
| `src/visual/beetleGenerator.ts` | 35 | `beetleGenomeHash(spec)` | 3 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | resolveBeetleVisualFor |
| `src/visual/beetleGenerator.ts` | 50 | `{
    genome: [...input.genome],
    generation: input.generation,
    jitterNam` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | beetlePhenotypeOf |
| `src/visual/beetleGenerator.ts` | 55 | ``${g.id}:${g.power.toFixed(3)}:${g.dominant ? 'd' : 'r'}`` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | strHash |
| `src/visual/beetleGenerator.ts` | 56 | `rootSeed` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | deriveSeed |
| `src/visual/beetleGenerator.ts` | 63 | `base` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | shiftChannels |
| `src/visual/beetleGenerator.ts` | 67 | `base` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | shiftChannels |
| `src/visual/beetleGenerator.ts` | 69 | `phenotype` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | beetlePhenotypeKey |
| `src/visual/beetleGenerator.ts` | 76 | `spec` | 1 | [`src/visual/beetleGenerator.ts`](beetleGenerator.ts) | resolveBeetleVisual |
| `src/visual/enemyVisuals.ts` | 30 | `typeId` | 1 | [`src/visual/enemyVisuals.ts`](enemyVisuals.ts) | keyFor |
| `src/visual/enemyVisuals.ts` | 33 | `typeId` | 1 | [`src/visual/enemyVisuals.ts`](enemyVisuals.ts) | enemyAncestorFor |
| `src/visual/enemyVisuals.ts` | 36 | `{ id: key, genome: ancestor.genome, generation: ancestor.generation }` | 1 | [`src/visual/enemyVisuals.ts`](enemyVisuals.ts) | resolveBeetleVisualFor |
| `src/visual/enemyVisuals.ts` | 37 | `EPOCH_ROOT` | 2 | [`src/visual/enemyVisuals.ts`](enemyVisuals.ts) | resolveBeetleVisualFor |
| `src/visual/enemyVisuals.ts` | 38 | `undefined` | 3 | [`src/visual/enemyVisuals.ts`](enemyVisuals.ts) | resolveBeetleVisualFor |
| `src/visual/enemyVisuals.ts` | 39 | `'visual'` | 4 | [`src/visual/enemyVisuals.ts`](enemyVisuals.ts) | resolveBeetleVisualFor |
| `src/visual/generator.test.ts` | 23 | `[{ id: 'fire', power: 0.8, dominant: true }, { id: 'rapid', power: 0.5, dominant` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | variantOf |
| `src/visual/generator.test.ts` | 24 | `[{ id: 'ice', power: 0.7, dominant: false }, { id: 'heavy', power: 0.6, dominant` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | variantOf |
| `src/visual/generator.test.ts` | 26 | `'R3 gate: ResolvedVisual ist eine reine Phänotyp-Auflösung'` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | describe |
| `src/visual/generator.test.ts` | 27 | `'gleiches Input ⇒ identisches ResolvedVisual (byte-gleich)'` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | it |
| `src/visual/generator.test.ts` | 28 | `A` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | genomeToVisualInput |
| `src/visual/generator.test.ts` | 29 | `resolveVisual(input)` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 29 | `input` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | resolveVisual |
| `src/visual/generator.test.ts` | 32 | `'jede Grundpflanze löst über DENSELBEN Pfad auf (kein BASE-Zweig mehr)'` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | it |
| `src/visual/generator.test.ts` | 34 | `id` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | basePlantVisualInput |
| `src/visual/generator.test.ts` | 35 | `input` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 36 | `input!` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | resolveVisual |
| `src/visual/generator.test.ts` | 37 | `v.variantKey.startsWith('plant\|')` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 38 | `v.phenotype.stalk.height` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 42 | `'kein Baukasten-Rest im Ergebnis (keine Layer-, Base- oder Extra-Liste)'` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | it |
| `src/visual/generator.test.ts` | 43 | `A` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | genomeToVisualInput |
| `src/visual/generator.test.ts` | 43 | `genomeToVisualInput(A, SEED)` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | resolveVisual |
| `src/visual/generator.test.ts` | 44 | `v['layers']` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 45 | `v['baseId']` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 46 | `v['extraIds']` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 47 | `v['visualVersion']` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | expect |
| `src/visual/generator.test.ts` | 50 | `'variantKey ist stabil und folgt der Anatomie, nicht der Variant-ID'` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | it |
| `src/visual/generator.test.ts` | 51 | `A` | 1 | [`src/visual/generator.test.ts`](generator.test.ts) | genomeToVisualInput |
