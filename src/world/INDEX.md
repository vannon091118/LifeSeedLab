# Modul: world

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/world/`

## Umfang

2 Dateien · importiert `components`, `persistence`, `render` +3 · wird importiert von `components`, `persistence`, `render` +3

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`world_state.test.ts`](./world_state.test.ts) | 23 | 0 | CALL 19, IMPORTS 2, PASS 16, READ 8, STRING_REFERENCE 11 |
| [`world_state.ts`](./world_state.ts) | 110 | 10 | CALL 4, EXPORTS 9, IMPORTS 1, PASS 4, READ 38, RETURN 14, STRING_REFERENCE 13 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `WORLD_START_COLS` | const | `src/world/world_state.ts` | 18 |
| `WORLD_START_ROWS` | const | `src/world/world_state.ts` | 19 |
| `WorldOp` | type | `src/world/world_state.ts` | 86 |
| `WorldSnapshot` | interface | `src/world/world_state.ts` | 53 |
| `WorldState` | interface | `src/world/world_state.ts` | 28 |
| `applyWorldOps` | function | `src/world/world_state.ts` | 96 |
| `createInitialWorld` | function | `src/world/world_state.ts` | 43 |
| `isValidWorldState` | function | `src/world/world_state.ts` | 64 |
| `worldSnapshotOf` | function | `src/world/world_state.ts` | 59 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/world/world_state.test.ts` | 4 | `'WorldState semantic validation'` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | describe |
| `src/world/world_state.test.ts` | 5 | `'rejects unknown tile types instead of accepting a checksum-valid save'` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | it |
| `src/world/world_state.test.ts` | 7 | `isValidWorldState(world)` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | expect |
| `src/world/world_state.test.ts` | 7 | `world` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | isValidWorldState |
| `src/world/world_state.test.ts` | 10 | `'rejects a blocked spawn or exit cell'` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | it |
| `src/world/world_state.test.ts` | 14 | `isValidWorldState(spawn)` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | expect |
| `src/world/world_state.test.ts` | 14 | `spawn` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | isValidWorldState |
| `src/world/world_state.test.ts` | 15 | `isValidWorldState(exit)` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | expect |
| `src/world/world_state.test.ts` | 15 | `exit` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | isValidWorldState |
| `src/world/world_state.test.ts` | 18 | `'accepts walkable decoration at both boundary corners'` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | it |
| `src/world/world_state.test.ts` | 21 | `isValidWorldState(world)` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | expect |
| `src/world/world_state.test.ts` | 21 | `world` | 1 | [`src/world/world_state.test.ts`](world_state.test.ts) | isValidWorldState |
