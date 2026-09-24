# Modul: persistence

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/persistence/`

## Umfang

8 Dateien · importiert `components`, `discovery`, `meta` +4 · wird importiert von `components`, `discovery`, `meta` +4

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`persistence_resume.test.ts`](./persistence_resume.test.ts) | 137 | 0 | CALL 97, IMPORTS 5, PASS 81, READ 75, RETURN 3, STRING_REFERENCE 32 |
| [`runSave.ts`](./runSave.ts) | 87 | 5 | CALL 13, EXPORTS 6, IMPORTS 3, PASS 12, READ 51, RETURN 13, STRING_REFERENCE 18 |
| [`runSaveAutor.ts`](./runSaveAutor.ts) | 70 | 1 | CALL 20, EXPORTS 1, IMPORTS 1, PASS 13, READ 39, RETURN 2, STRING_REFERENCE 4 |
| [`storage.ts`](./storage.ts) | 239 | 2 | CALL 83, EXPORTS 10, PASS 70, READ 103, RETURN 44, STRING_REFERENCE 52 |
| [`testDom.ts`](./testDom.ts) | 30 | 5 | CALL 6, EXPORTS 2, PASS 3, READ 7, RETURN 2, STRING_REFERENCE 1 |
| [`worldAutor.ts`](./worldAutor.ts) | 92 | 1 | CALL 20, EXPORTS 1, IMPORTS 3, PASS 15, READ 58, STRING_REFERENCE 13 |
| [`worldSave.ts`](./worldSave.ts) | 61 | 1 | CALL 7, EXPORTS 5, IMPORTS 3, PASS 4, READ 10, RETURN 7, STRING_REFERENCE 18 |
| [`world_autor.test.ts`](./world_autor.test.ts) | 94 | 0 | CALL 55, IMPORTS 5, PASS 40, READ 36, STRING_REFERENCE 34 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `LoadResult` | type | `src/persistence/storage.ts` | 31 |
| `RunSave` | interface | `src/persistence/runSave.ts` | 19 |
| `RunSaveAutor` | class | `src/persistence/runSaveAutor.ts` | 13 |
| `WorldAutor` | class | `src/persistence/worldAutor.ts` | 23 |
| `WorldLoadResult` | type | `src/persistence/worldSave.ts` | 30 |
| `WriteResult` | type | `src/persistence/storage.ts` | 30 |
| `clearRun` | function | `src/persistence/runSave.ts` | 85 |
| `clearTestStorage` | function | `src/persistence/testDom.ts` | 28 |
| `ensureLocalStorage` | function | `src/persistence/testDom.ts` | 13 |
| `ensureWorld` | function | `src/persistence/worldSave.ts` | 50 |
| `idbGet` | function | `src/persistence/storage.ts` | 220 |
| `idbGetResult` | function | `src/persistence/storage.ts` | 192 |
| `idbRemove` | function | `src/persistence/storage.ts` | 225 |
| `idbSet` | function | `src/persistence/storage.ts` | 176 |
| `isValidRunSave` | function | `src/persistence/runSave.ts` | 39 |
| `load` | function | `src/persistence/storage.ts` | 144 |
| `loadResult` | function | `src/persistence/storage.ts` | 124 |
| `loadRun` | function | `src/persistence/runSave.ts` | 80 |
| `loadRunResult` | function | `src/persistence/runSave.ts` | 74 |
| `loadWorld` | function | `src/persistence/worldSave.ts` | 44 |
| `loadWorldResult` | function | `src/persistence/worldSave.ts` | 36 |
| `remove` | function | `src/persistence/storage.ts` | 154 |
| `save` | function | `src/persistence/storage.ts` | 149 |
| `saveRun` | function | `src/persistence/runSave.ts` | 51 |
| `saveWorld` | function | `src/persistence/worldSave.ts` | 20 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/persistence/persistence_resume.test.ts` | 54 | `'GAME_OVER'` | 1 | [`src/bus/bus.ts`](../bus/bus.ts) | subscribe |
| `src/persistence/persistence_resume.test.ts` | 35 | `makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 2, gy: 2 })` | 1 | [`src/bus/commands.ts`](../bus/commands.ts) | push |
| `src/persistence/persistence_resume.test.ts` | 36 | `makeCommand(0, 'START_WAVE', 2, {})` | 1 | [`src/bus/commands.ts`](../bus/commands.ts) | push |
| `src/persistence/persistence_resume.test.ts` | 55 | `makeCommand(0, 'START_WAVE', 1, {})` | 1 | [`src/bus/commands.ts`](../bus/commands.ts) | push |
| `src/persistence/persistence_resume.test.ts` | 77 | `makeCommand(0, 'START_WAVE', 1, {})` | 1 | [`src/bus/commands.ts`](../bus/commands.ts) | push |
| `src/persistence/persistence_resume.test.ts` | 30 | `'Gate B — Resume-Shape (RunSave v2)'` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | describe |
| `src/persistence/persistence_resume.test.ts` | 31 | `() => { localStorage.clear(); }` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | beforeEach |
| `src/persistence/persistence_resume.test.ts` | 33 | `'saveRun schreibt Resume-Shape ohne enemies/projectiles/schedule und mit version` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | it |
| `src/persistence/persistence_resume.test.ts` | 34 | `{ seed: 123 }` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeRoot |
| `src/persistence/persistence_resume.test.ts` | 35 | `0` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeCommand |
| `src/persistence/persistence_resume.test.ts` | 36 | `0` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeCommand |
| `src/persistence/persistence_resume.test.ts` | 40 | `root.getSnapshot()` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | saveRun |
| `src/persistence/persistence_resume.test.ts` | 45 | `{
      seed: 123,
      resume: {
        waveNumber: 20, lives: 1, score: 0,
 ` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeRoot |
| `src/persistence/persistence_resume.test.ts` | 55 | `0` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeCommand |
| `src/persistence/persistence_resume.test.ts` | 58 | `ended` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 59 | `gameoverRoot.getSnapshot()` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | saveRun |
| `src/persistence/persistence_resume.test.ts` | 67 | `shapeCheck.version` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 68 | `(shapeCheck as unknown as Record<string, unknown>)` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 69 | `(shapeCheck as unknown as Record<string, unknown>)` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 70 | `(shapeCheck as unknown as Record<string, unknown>)` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 73 | `'Resume startet in prep und regeneriert Schedule aus (seed, waveNumber+1)'` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | it |
| `src/persistence/persistence_resume.test.ts` | 76 | `{ seed: 42 }` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeRoot |
| `src/persistence/persistence_resume.test.ts` | 77 | `0` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | makeCommand |
| `src/persistence/persistence_resume.test.ts` | 82 | `root.getSnapshot().phase` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 83 | `root.getSnapshot()` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | saveRun |
| `src/persistence/persistence_resume.test.ts` | 88 | `loaded.tick` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 89 | `loaded.waveNumber` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 90 | `loaded.version` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 92 | `true` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 97 | `'Gate B — Meta-Migration v1/v2 → aktuell'` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | describe |
| `src/persistence/persistence_resume.test.ts` | 98 | `() => { localStorage.clear(); }` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | beforeEach |
| `src/persistence/persistence_resume.test.ts` | 100 | `'v1→aktuell Migration liefert Defaults ohne Crash'` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | it |
| `src/persistence/persistence_resume.test.ts` | 104 | `dataStr` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | fnv |
| `src/persistence/persistence_resume.test.ts` | 112 | `key` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | load |
| `src/persistence/persistence_resume.test.ts` | 113 | `loaded.version` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 114 | `loaded.nektar` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 115 | `loaded.runs` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 116 | `loaded.bestWave` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | expect |
| `src/persistence/persistence_resume.test.ts` | 119 | `'korruptes Meta wird quarantäniert und fallback greift'` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | it |
| `src/persistence/persistence_resume.test.ts` | 122 | `key` | 1 | [`src/persistence/persistence_resume.test.ts`](persistence_resume.test.ts) | load |
