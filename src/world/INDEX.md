# Modul: world

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/world/`

## Umfang

1 Dateien · importiert `components`, `persistence`, `render` +3 · wird importiert von `components`, `persistence`, `render` +3

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`world_state.ts`](./world_state.ts) | 113 | 10 | CALL 7, EXPORTS 10, IMPORTS 2, PASS 6, READ 29, RETURN 14, STRING_REFERENCE 15 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `WORLD_START_COLS` | const | `src/world/world_state.ts` | 19 |
| `WORLD_START_ROWS` | const | `src/world/world_state.ts` | 20 |
| `WorldOp` | type | `src/world/world_state.ts` | 89 |
| `WorldSnapshot` | interface | `src/world/world_state.ts` | 61 |
| `WorldState` | interface | `src/world/world_state.ts` | 29 |
| `applyWorldOps` | function | `src/world/world_state.ts` | 99 |
| `createInitialWorld` | function | `src/world/world_state.ts` | 50 |
| `deriveWorldSeed` | function | `src/world/world_state.ts` | 41 |
| `isValidWorldState` | function | `src/world/world_state.ts` | 72 |
| `worldSnapshotOf` | function | `src/world/world_state.ts` | 67 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/world/world_state.ts` | 42 | `EPOCH_ROOT` | 1 | [`src/world/world_state.ts`](world_state.ts) | deriveSeed |
