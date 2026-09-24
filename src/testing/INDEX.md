# Modul: testing

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/testing/`

## Umfang

2 Dateien · importiert `bus`, `components`, `meta` +3 · wird importiert von `bus`, `components`, `meta` +3

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`testkit.test.ts`](./testkit.test.ts) | 125 | 0 | CALL 108, IMPORTS 5, PASS 93, READ 56, STRING_REFERENCE 29 |
| [`testkit.ts`](./testkit.ts) | 163 | 32 | CALL 35, EXPORTS 13, IMPORTS 11, PASS 23, READ 52, RETURN 9, STRING_REFERENCE 18 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `VectorCellView` | interface | `src/testing/testkit.ts` | 58 |
| `describeFirstFieldDeviation` | function | `src/testing/testkit.ts` | 76 |
| `drainTicks` | function | `src/testing/testkit.ts` | 142 |
| `hashOfRoot` | function | `src/testing/testkit.ts` | 50 |
| `makeRoot` | function | `src/testing/testkit.ts` | 104 |
| `makeRun` | function | `src/testing/testkit.ts` | 125 |
| `makeRunSeed` | function | `src/testing/testkit.ts` | 95 |
| `pushCommand` | function | `src/testing/testkit.ts` | 157 |
| `resetFullTestState` | function | `src/testing/testkit.ts` | 28 |
| `resetTestState` | function | `src/testing/testkit.ts` | 21 |
| `stateToHashable` | function | `src/testing/testkit.ts` | 45 |
| `vectorFieldCellsOf` | function | `src/testing/testkit.ts` | 65 |
| `writeLegacyEnvelope` | function | `src/testing/testkit.ts` | 36 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/testing/testkit.test.ts` | 102 | `4` | 1 | [`src/simulation/root.ts`](../simulation/root.ts) | vectorDeposit |
| `src/testing/testkit.test.ts` | 19 | `'TestKit — Kontrakt (B32.2)'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | describe |
| `src/testing/testkit.test.ts` | 20 | `() => {
    resetFullTestState();
  }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | beforeEach |
| `src/testing/testkit.test.ts` | 24 | `'makeRun() ohne Meta reserviert runId 1 und leitet den dokumentierten Run-Seed a` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 27 | `state.runId` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 28 | `state.seed` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 28 | `1` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRunSeed |
| `src/testing/testkit.test.ts` | 29 | `state.phase` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 32 | `'zwei makeRun(1)-Instanzen produzieren hash-identische SimStates (Determinismus)` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 38 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 39 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | pushCommand |
| `src/testing/testkit.test.ts` | 40 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 43 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 44 | `a` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | runStream |
| `src/testing/testkit.test.ts` | 45 | `a.getSnapshot()` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | snapshotHash |
| `src/testing/testkit.test.ts` | 48 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 49 | `b` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | runStream |
| `src/testing/testkit.test.ts` | 50 | `b.getSnapshot()` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | snapshotHash |
| `src/testing/testkit.test.ts` | 52 | `hashA` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 53 | `hashA.length` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 56 | `'resetTestState() entfernt alle Meta-Spuren (frischer Zustand je Test)'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 60 | `meta.runId` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 61 | `meta.runs` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 62 | `meta.savedVariants` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 65 | `'drainTicks() läuft exakt n Ticks und liefert den Uhr-Stand'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 66 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 67 | `root` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 68 | `after` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 69 | `root.getSnapshot().clock.tick` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 72 | `'makeRunSeed() ist eine reine Funktion — gleicher runId ⇒ gleicher Seed'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 73 | `makeRunSeed(1)` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 73 | `1` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRunSeed |
| `src/testing/testkit.test.ts` | 74 | `makeRunSeed(2)` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
| `src/testing/testkit.test.ts` | 74 | `2` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRunSeed |
| `src/testing/testkit.test.ts` | 77 | `'resetFullTestState() setzt zusätzlich die ID-Zähler zurück (Sequenz-Identität)'` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | it |
| `src/testing/testkit.test.ts` | 78 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 79 | `a` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 81 | `{ runId: 1 }` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | makeRun |
| `src/testing/testkit.test.ts` | 82 | `b` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | drainTicks |
| `src/testing/testkit.test.ts` | 84 | `snapshotHash(a.getSnapshot())` | 1 | [`src/testing/testkit.test.ts`](testkit.test.ts) | expect |
