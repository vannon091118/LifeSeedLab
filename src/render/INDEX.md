# Modul: render

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/render/`

## Umfang

18 Dateien · importiert `bus`, `components`, `observers` +1 · wird importiert von `bus`, `components`, `observers` +1

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`beetleGait.test.ts`](./beetleGait.test.ts) | 126 | 0 | CALL 114, IMPORTS 5, PASS 102, READ 71, RETURN 1, STRING_REFERENCE 36 |
| [`beetleGait.ts`](./beetleGait.ts) | 133 | 0 | CALL 23, EXPORTS 6, IMPORTS 2, PASS 18, READ 52, RETURN 6, STRING_REFERENCE 2 |
| [`beetleOrgans.ts`](./beetleOrgans.ts) | 164 | 0 | CALL 43, EXPORTS 10, IMPORTS 2, PASS 28, READ 100, STRING_REFERENCE 5 |
| [`beetleSprites.ts`](./beetleSprites.ts) | 61 | 0 | CALL 9, EXPORTS 2, IMPORTS 3, PASS 9, READ 12, RETURN 2, STRING_REFERENCE 6 |
| [`beetleVisibility.test.ts`](./beetleVisibility.test.ts) | 167 | 0 | CALL 108, IMPORTS 6, PASS 110, READ 142, RETURN 4, STRING_REFERENCE 19 |
| [`beetles.ts`](./beetles.ts) | 405 | 1 | CALL 134, EXPORTS 5, IMPORTS 4, PASS 87, READ 270, RETURN 3, STRING_REFERENCE 18 |
| [`camera.ts`](./camera.ts) | 48 | 6 | CALL 4, EXPORTS 1, IMPORTS 1, PASS 2, READ 31, RETURN 1, STRING_REFERENCE 2 |
| [`gameRuntime.ts`](./gameRuntime.ts) | 433 | 1 | CALL 132, EXPORTS 1, IMPORTS 32, PASS 95, READ 337, RETURN 12, STRING_REFERENCE 64 |
| [`layers/enemies.ts`](./layers/enemies.ts) | 76 | 0 | CALL 20, EXPORTS 4, IMPORTS 6, PASS 12, READ 31, STRING_REFERENCE 9 |
| [`layers/enemyStatus.test.ts`](./layers/enemyStatus.test.ts) | 70 | 0 | CALL 50, IMPORTS 2, PASS 45, READ 37, RETURN 1, STRING_REFERENCE 17 |
| [`layers/feedback.ts`](./layers/feedback.ts) | 257 | 2 | CALL 72, EXPORTS 2, IMPORTS 1, PASS 55, READ 260, RETURN 9, STRING_REFERENCE 21 |
| [`layers/mapTiles.ts`](./layers/mapTiles.ts) | 133 | 0 | CALL 45, EXPORTS 1, IMPORTS 2, PASS 29, READ 63, STRING_REFERENCE 24 |
| [`layers/particlesDraw.ts`](./layers/particlesDraw.ts) | 81 | 0 | CALL 57, EXPORTS 1, IMPORTS 1, PASS 30, READ 84, STRING_REFERENCE 11 |
| [`layers/terrain.ts`](./layers/terrain.ts) | 239 | 0 | CALL 131, EXPORTS 1, IMPORTS 2, PASS 75, READ 202, RETURN 1, STRING_REFERENCE 23 |
| [`layers/vectorField.ts`](./layers/vectorField.ts) | 146 | 0 | CALL 55, EXPORTS 1, IMPORTS 3, PASS 32, READ 97, RETURN 2, STRING_REFERENCE 10 |
| [`plants.ts`](./plants.ts) | 356 | 1 | CALL 123, EXPORTS 1, IMPORTS 2, PASS 94, READ 311, RETURN 5, STRING_REFERENCE 30 |
| [`renderer.ts`](./renderer.ts) | 424 | 1 | CALL 151, EXPORTS 2, IMPORTS 18, PASS 116, READ 350, RETURN 7, STRING_REFERENCE 60 |
| [`spriteCache.ts`](./spriteCache.ts) | 78 | 0 | CALL 10, EXPORTS 4, IMPORTS 2, PASS 9, READ 14, RETURN 3, STRING_REFERENCE 5 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `BEETLE_DRAW_GAIN` | const | `src/render/beetles.ts` | 40 |
| `BEETLE_INK` | const | `src/render/beetleOrgans.ts` | 16 |
| `BEETLE_INK_W` | const | `src/render/beetleOrgans.ts` | 17 |
| `Camera` | class | `src/render/camera.ts` | 16 |
| `EnemyStatusFlags` | interface | `src/render/layers/enemies.ts` | 46 |
| `FeedbackLayer` | class | `src/render/layers/feedback.ts` | 38 |
| `GAIT_FRAMES` | const | `src/render/beetleGait.ts` | 23 |
| `GAIT_STEPS_PER_CYCLE` | const | `src/render/beetleGait.ts` | 26 |
| `GaitTracker` | class | `src/render/beetleGait.ts` | 73 |
| `ORGAN_GATES` | const | `src/render/beetleOrgans.ts` | 164 |
| `RenderGhost` | interface | `src/render/renderer.ts` | 29 |
| `Renderer` | class | `src/render/renderer.ts` | 42 |
| `RunRuntime` | class | `src/render/gameRuntime.ts` | 78 |
| `STATUS_VISUAL` | const | `src/render/layers/enemies.ts` | 20 |
| `bakeTerrain` | function | `src/render/layers/terrain.ts` | 19 |
| `beetleBob` | function | `src/render/beetles.ts` | 402 |
| `beetleDarken` | const | `src/render/beetleOrgans.ts` | 19 |
| `beetleDrawMetrics` | const | `src/render/beetles.ts` | 46 |
| `beetleFrameFor` | function | `src/render/beetleSprites.ts` | 22 |
| `beetleLighten` | const | `src/render/beetleOrgans.ts` | 20 |
| `bobAmplitudeOf` | function | `src/render/beetleGait.ts` | 57 |
| `clearSpriteCache` | function | `src/render/spriteCache.ts` | 58 |
| `drawBeetleAnatomy` | function | `src/render/beetles.ts` | 252 |
| `drawBeetleSprite` | function | `src/render/beetleSprites.ts` | 48 |
| `drawEnemyBody` | function | `src/render/layers/enemies.ts` | 32 |
| `drawEnemyStatus` | function | `src/render/layers/enemies.ts` | 53 |
| `drawJumpLeg` | function | `src/render/beetleOrgans.ts` | 129 |
| `drawMapTile` | function | `src/render/layers/mapTiles.ts` | 108 |
| `drawParticle` | function | `src/render/layers/particlesDraw.ts` | 6 |
| `drawPelage` | function | `src/render/beetleOrgans.ts` | 63 |
| `drawPlantAnatomy` | function | `src/render/plants.ts` | 215 |
| `drawPronotum` | function | `src/render/beetleOrgans.ts` | 108 |
| `drawSprite` | function | `src/render/spriteCache.ts` | 66 |
| `drawStinger` | function | `src/render/beetleOrgans.ts` | 87 |
| `drawVectorField` | function | `src/render/layers/vectorField.ts` | 94 |
| `drawWings` | function | `src/render/beetleOrgans.ts` | 33 |
| `flightProgress` | function | `src/render/layers/feedback.ts` | 33 |
| `gaitFrameOf` | function | `src/render/beetleGait.ts` | 130 |
| `legPhase` | function | `src/render/beetles.ts` | 62 |
| `spriteCacheSize` | function | `src/render/spriteCache.ts` | 53 |
| `spriteFor` | function | `src/render/spriteCache.ts` | 26 |
| `strideCellsOf` | function | `src/render/beetleGait.ts` | 47 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/render/beetleGait.test.ts` | 15 | `{ genome: base.genome, generation: 0 }` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | beetlePhenotypeOf |
| `src/render/beetleGait.test.ts` | 20 | `'Lauf-Gang — Phase aus Strecke, nicht aus Zeit'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | describe |
| `src/render/beetleGait.test.ts` | 21 | `'gleiche Strecke ⇒ gleiche Phase, unabhängig von der Zahl der Aufrufe'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | it |
| `src/render/beetleGait.test.ts` | 33 | `stepB.phase` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 34 | `b.travelledOf('e1')` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 37 | `'Stillstand lässt die Beine stehen (kein Tritt ins Leere)'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | it |
| `src/render/beetleGait.test.ts` | 43 | `again.phase` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 44 | `again.frame` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 47 | `'doppelte Strecke ⇒ doppelte Zyklen (Tempo wird zu Schritten)'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | it |
| `src/render/beetleGait.test.ts` | 49 | `p` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | strideCellsOf |
| `src/render/beetleGait.test.ts` | 53 | `half.phase` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 55 | `full.phase` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 58 | `'Bild-Index deckt alle GAIT_FRAMES ab und bleibt im Bereich'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | it |
| `src/render/beetleGait.test.ts` | 59 | `gaitFrameOf(0)` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 59 | `0` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | gaitFrameOf |
| `src/render/beetleGait.test.ts` | 60 | `gaitFrameOf(0.999)` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 60 | `0.999` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | gaitFrameOf |
| `src/render/beetleGait.test.ts` | 61 | `gaitFrameOf(1.25)` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 61 | `1.25` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | gaitFrameOf |
| `src/render/beetleGait.test.ts` | 62 | `gaitFrameOf(-0.25)` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 62 | `-0.25` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | gaitFrameOf |
| `src/render/beetleGait.test.ts` | 64 | `i / GAIT_FRAMES + 0.001` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | gaitFrameOf |
| `src/render/beetleGait.test.ts` | 65 | `frames.size` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 68 | `'Tripod: Vorder-+Hinterbein links laufen mit dem Mittelbein rechts'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | it |
| `src/render/beetleGait.test.ts` | 70 | `0` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | legPhase |
| `src/render/beetleGait.test.ts` | 71 | `2` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | legPhase |
| `src/render/beetleGait.test.ts` | 72 | `1` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | legPhase |
| `src/render/beetleGait.test.ts` | 73 | `0` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | legPhase |
| `src/render/beetleGait.test.ts` | 74 | `1` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | legPhase |
| `src/render/beetleGait.test.ts` | 75 | `2` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | legPhase |
| `src/render/beetleGait.test.ts` | 77 | `frontLeft` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 78 | `frontLeft` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 80 | `frontRight` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 81 | `frontRight` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 83 | `Math.min(offset, 1 - offset)` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 87 | `'Phasen sind immer 0..1, auch bei Rückwärts-/Sprung-Bewegung'` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | it |
| `src/render/beetleGait.test.ts` | 93 | `s.phase` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 94 | `s.phase` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 95 | `s.frame` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
| `src/render/beetleGait.test.ts` | 96 | `s.frame` | 1 | [`src/render/beetleGait.test.ts`](beetleGait.test.ts) | expect |
