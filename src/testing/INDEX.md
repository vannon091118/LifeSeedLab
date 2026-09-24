# Modul: testing

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/testing/`

## Umfang

3 Dateien · importiert `bus`, `components`, `meta` +3 · wird importiert von `bus`, `components`, `meta` +3

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`testkit.test.ts`](./testkit.test.ts) | 126 | 0 | CALL 108, IMPORTS 5, PASS 93, READ 55, STRING_REFERENCE 29 |
| [`testkit.ts`](./testkit.ts) | 164 | 30 | CALL 35, EXPORTS 13, IMPORTS 11, PASS 23, READ 52, RETURN 9, STRING_REFERENCE 19 |
| [`vectorHooks.ts`](./vectorHooks.ts) | 21 | 0 | CALL 3, EXPORTS 3, IMPORTS 2, PASS 3, READ 4, RETURN 1, STRING_REFERENCE 2 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `VectorCellView` | interface | `src/testing/testkit.ts` | 59 |
| `describeFirstFieldDeviation` | function | `src/testing/testkit.ts` | 77 |
| `drainTicks` | function | `src/testing/testkit.ts` | 143 |
| `hashOfRoot` | function | `src/testing/testkit.ts` | 51 |
| `makeRoot` | function | `src/testing/testkit.ts` | 105 |
| `makeRun` | function | `src/testing/testkit.ts` | 126 |
| `makeRunSeed` | function | `src/testing/testkit.ts` | 96 |
| `pushCommand` | function | `src/testing/testkit.ts` | 158 |
| `resetFullTestState` | function | `src/testing/testkit.ts` | 29 |
| `resetTestState` | function | `src/testing/testkit.ts` | 22 |
| `stateToHashable` | function | `src/testing/testkit.ts` | 46 |
| `testAttractorSpawn` | function | `src/testing/vectorHooks.ts` | 15 |
| `testTraceCharge` | function | `src/testing/vectorHooks.ts` | 19 |
| `testVectorDeposit` | function | `src/testing/vectorHooks.ts` | 11 |
| `vectorFieldCellsOf` | function | `src/testing/testkit.ts` | 66 |
| `writeLegacyEnvelope` | function | `src/testing/testkit.ts` | 37 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/testing/testkit.test.ts` | 20 | `'TestKit — Kontrakt (B32.2)'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | describe |
| `src/testing/testkit.test.ts` | 21 | `() => {
    resetFullTestState();
  }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | beforeEach |
| `src/testing/testkit.test.ts` | 25 | `'makeRun() ohne Meta reserviert runId 1 und leitet den dokumentierten Run-Seed a` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 28 | `state.runId` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 29 | `state.seed` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 29 | `1` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRunSeed |
| `src/testing/testkit.test.ts` | 30 | `state.phase` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 33 | `'zwei makeRun(1)-Instanzen produzieren hash-identische SimStates (Determinismus)` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 39 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 40 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | pushCommand |
| `src/testing/testkit.test.ts` | 41 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 44 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 45 | `a` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | runStream |
| `src/testing/testkit.test.ts` | 46 | `a.getSnapshot()` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | snapshotHash |
| `src/testing/testkit.test.ts` | 49 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 50 | `b` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | runStream |
| `src/testing/testkit.test.ts` | 51 | `b.getSnapshot()` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | snapshotHash |
| `src/testing/testkit.test.ts` | 53 | `hashA` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 54 | `hashA.length` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 57 | `'resetTestState() entfernt alle Meta-Spuren (frischer Zustand je Test)'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 61 | `meta.runId` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 62 | `meta.runs` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 63 | `meta.savedVariants` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 66 | `'drainTicks() läuft exakt n Ticks und liefert den Uhr-Stand'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 67 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 68 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 69 | `after` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 70 | `root.getSnapshot().clock.tick` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 73 | `'makeRunSeed() ist eine reine Funktion — gleicher runId ⇒ gleicher Seed'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 74 | `makeRunSeed(1)` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 74 | `1` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRunSeed |
| `src/testing/testkit.test.ts` | 75 | `makeRunSeed(2)` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 75 | `2` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRunSeed |
| `src/testing/testkit.test.ts` | 78 | `'resetFullTestState() setzt zusätzlich die ID-Zähler zurück (Sequenz-Identität)'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 79 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 80 | `a` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 82 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 83 | `b` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 85 | `snapshotHash(a.getSnapshot())` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 85 | `a.getSnapshot()` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | snapshotHash |
