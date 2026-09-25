# Modul: config

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/config/`

## Umfang

18 Dateien · importiert ``, `components`, `genome` +7 · wird importiert von ``, `components`, `genome` +7

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`ballistics.source.ts`](./ballistics.source.ts) | 99 | 3 | EXPORTS 24 |
| [`beetlePhenotype.source.ts`](./beetlePhenotype.source.ts) | 183 | 3 | EXPORTS 20, READ 13, RETURN 1, STRING_REFERENCE 129 |
| [`beetles.source.ts`](./beetles.source.ts) | 166 | 11 | CALL 3, EXPORTS 7, IMPORTS 1, PASS 3, READ 3, RETURN 1, STRING_REFERENCE 34 |
| [`economy.source.ts`](./economy.source.ts) | 171 | 24 | CALL 3, EXPORTS 25, PASS 3, READ 6, RETURN 7, STRING_REFERENCE 13 |
| [`effects.source.ts`](./effects.source.ts) | 64 | 10 | CALL 1, EXPORTS 4, PASS 1, READ 1, RETURN 1, STRING_REFERENCE 135 |
| [`enemies.source.ts`](./enemies.source.ts) | 104 | 7 | CALL 14, EXPORTS 7, IMPORTS 1, PASS 13, READ 15, RETURN 2, STRING_REFERENCE 19 |
| [`enemyGenome.source.ts`](./enemyGenome.source.ts) | 57 | 4 | EXPORTS 4, IMPORTS 1, STRING_REFERENCE 19 |
| [`genes.source.ts`](./genes.source.ts) | 46 | 2 | EXPORTS 1, IMPORTS 1, STRING_REFERENCE 24 |
| [`map.source.ts`](./map.source.ts) | 93 | 18 | CALL 1, EXPORTS 10, PASS 1, READ 1, STRING_REFERENCE 9 |
| [`names.source.ts`](./names.source.ts) | 57 | 2 | EXPORTS 4, STRING_REFERENCE 52 |
| [`phenotype.source.ts`](./phenotype.source.ts) | 255 | 8 | CALL 1, EXPORTS 16, IMPORTS 1, PASS 1, READ 9, RETURN 2, STRING_REFERENCE 93 |
| [`plants.source.ts`](./plants.source.ts) | 101 | 11 | CALL 1, EXPORTS 5, PASS 1, READ 1, STRING_REFERENCE 51 |
| [`pot.source.ts`](./pot.source.ts) | 52 | 3 | EXPORTS 5, STRING_REFERENCE 16 |
| [`shop.source.ts`](./shop.source.ts) | 55 | 4 | CALL 2, EXPORTS 5, IMPORTS 2, PASS 2, READ 6, RETURN 4, STRING_REFERENCE 19 |
| [`sources.test.ts`](./sources.test.ts) | 177 | 0 | CALL 141, IMPORTS 8, PASS 128, READ 132, RETURN 1, STRING_REFERENCE 31 |
| [`vector_logic.source.ts`](./vector_logic.source.ts) | 167 | 10 | CALL 1, EXPORTS 11, PASS 1, READ 2, RETURN 2, STRING_REFERENCE 32 |
| [`vector_visual.source.ts`](./vector_visual.source.ts) | 31 | 4 | CALL 1, EXPORTS 4, IMPORTS 1, PASS 1, READ 1, RETURN 1, STRING_REFERENCE 49 |
| [`world.source.ts`](./world.source.ts) | 29 | 5 | CALL 3, EXPORTS 5, PASS 3, READ 2, RETURN 3 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `AUTO_WAVES_DEFAULT` | const | `src/config/economy.source.ts` | 120 |
| `AUTO_WAVE_DELAY_TICKS` | const | `src/config/economy.source.ts` | 116 |
| `BALLISTICS_VERSION` | const | `src/config/ballistics.source.ts` | 19 |
| `BEETLES_SOURCE` | const | `src/config/beetles.source.ts` | 81 |
| `BEETLE_AXES_BY_GENE` | const | `src/config/beetlePhenotype.source.ts` | 39 |
| `BEETLE_AXIS_RANGE` | const | `src/config/beetlePhenotype.source.ts` | 63 |
| `BEETLE_BASELINE` | const | `src/config/beetlePhenotype.source.ts` | 76 |
| `BEETLE_BODY_PLAN` | const | `src/config/beetlePhenotype.source.ts` | 103 |
| `BEETLE_BREED` | const | `src/config/beetles.source.ts` | 102 |
| `BEETLE_DESCRIPTOR_AXES` | const | `src/config/beetlePhenotype.source.ts` | 158 |
| `BEETLE_DESCRIPTOR_WEIGHTS` | const | `src/config/beetlePhenotype.source.ts` | 167 |
| `BEETLE_FORM_THRESHOLDS` | const | `src/config/beetlePhenotype.source.ts` | 89 |
| `BEETLE_GENES_SOURCE` | const | `src/config/beetles.source.ts` | 23 |
| `BEETLE_GENE_POOL` | const | `src/config/beetles.source.ts` | 45 |
| `BEETLE_IDS` | const | `src/config/beetles.source.ts` | 99 |
| `BEETLE_INTERACTION` | const | `src/config/beetlePhenotype.source.ts` | 149 |
| `BEETLE_INTERACTION_RANGE` | const | `src/config/beetlePhenotype.source.ts` | 153 |
| `BEETLE_PIGMENT_RAMP` | const | `src/config/beetlePhenotype.source.ts` | 115 |
| `BEETLE_PIGMENT_SCATTER` | const | `src/config/beetlePhenotype.source.ts` | 145 |
| `BEETLE_PIGMENT_SHIFT` | const | `src/config/beetlePhenotype.source.ts` | 126 |
| `BREEDING` | const | `src/config/phenotype.source.ts` | 179 |
| `BROOD_SEED_NAMESPACE` | const | `src/config/beetles.source.ts` | 166 |
| `BeetleAxis` | type | `src/config/beetlePhenotype.source.ts` | 27 |
| `BeetleBearing` | type | `src/config/beetlePhenotype.source.ts` | 18 |
| `BeetleMotion` | type | `src/config/beetlePhenotype.source.ts` | 14 |
| `BeetlePlan` | type | `src/config/beetlePhenotype.source.ts` | 25 |
| `COOLDOWN_BASE_CX` | const | `src/config/ballistics.source.ts` | 48 |
| `COOLDOWN_FLOOR_CX` | const | `src/config/ballistics.source.ts` | 52 |
| `COOLDOWN_PER_THICKNESS_CX` | const | `src/config/ballistics.source.ts` | 50 |
| `CRIT_CHANCE_BASE_BP` | const | `src/config/ballistics.source.ts` | 86 |
| `CRIT_CHANCE_MAX_BP` | const | `src/config/ballistics.source.ts` | 91 |
| `CRIT_GAIN_BP` | const | `src/config/ballistics.source.ts` | 89 |
| `CRIT_MIN_BP` | const | `src/config/ballistics.source.ts` | 87 |
| `CRIT_MULT` | const | `src/config/ballistics.source.ts` | 92 |
| `CarapaceForm` | type | `src/config/beetlePhenotype.source.ts` | 11 |
| `CarapaceStructure` | type | `src/config/beetlePhenotype.source.ts` | 13 |
| `ChitinDress` | type | `src/config/beetlePhenotype.source.ts` | 16 |
| `EFFECTS_SOURCE` | const | `src/config/effects.source.ts` | 37 |
| `EFFECT_IDS` | const | `src/config/effects.source.ts` | 60 |
| `EFFECT_SLOTS` | const | `src/config/ballistics.source.ts` | 99 |
| `EFFECT_TO_VECTOR` | const | `src/config/vector_logic.source.ts` | 41 |
| `ENEMIES_SOURCE` | const | `src/config/enemies.source.ts` | 45 |
| `ENEMY_BITE` | const | `src/config/enemies.source.ts` | 33 |
| `ENEMY_GENE_POWER` | const | `src/config/enemyGenome.source.ts` | 51 |
| `ENEMY_GENOMES_SOURCE` | const | `src/config/enemyGenome.source.ts` | 35 |
| `ENEMY_INDIVIDUAL_SPREAD` | const | `src/config/enemyGenome.source.ts` | 54 |
| `ENEMY_POWER_RANGE` | const | `src/config/enemyGenome.source.ts` | 57 |
| `EffectId` | type | `src/config/effects.source.ts` | 10 |
| `EnemySource` | interface | `src/config/enemies.source.ts` | 12 |
| `EnemyTypeId` | type | `src/config/enemies.source.ts` | 10 |
| `FERTILIZE_BONUS` | const | `src/config/economy.source.ts` | 155 |
| `GENE_EFFECTS` | const | `src/config/genes.source.ts` | 19 |
| `GENOME_SLOT_COUNT` | const | `src/config/phenotype.source.ts` | 19 |
| `GREENHOUSE_POT_SLOTS` | const | `src/config/economy.source.ts` | 31 |
| `GRID_COLS` | const | `src/config/world.source.ts` | 11 |
| `GRID_ROWS` | const | `src/config/world.source.ts` | 12 |
| `GROWTH_TICKS_BY_RARITY` | const | `src/config/economy.source.ts` | 138 |
| `HINT_FADE_AFTER_TICKS` | const | `src/config/economy.source.ts` | 126 |
| `HIT_RADIUS` | const | `src/config/ballistics.source.ts` | 22 |
| `LIFESPAN_TICKS_BY_RARITY` | const | `src/config/economy.source.ts` | 145 |
| `MAP_DEFAULT_WEIGHT` | const | `src/config/map.source.ts` | 46 |
| `MAP_TILES_SOURCE` | const | `src/config/map.source.ts` | 34 |
| `MAP_TILE_IDS` | const | `src/config/map.source.ts` | 43 |
| `MATURATION_WAVES_CAP` | const | `src/config/economy.source.ts` | 42 |
| `MapTileType` | type | `src/config/map.source.ts` | 13 |
| `NAME_CORE_BY_GENE` | const | `src/config/names.source.ts` | 13 |
| `NAME_FALLBACK_CORE` | const | `src/config/names.source.ts` | 57 |
| `NAME_PREFIXES` | const | `src/config/names.source.ts` | 45 |
| `NAME_SUFFIXES` | const | `src/config/names.source.ts` | 52 |
| `PENDING_CROSSES_MAX` | const | `src/config/economy.source.ts` | 51 |
| `PIERCE_BASE` | const | `src/config/ballistics.source.ts` | 77 |
| `PIERCE_MAX` | const | `src/config/ballistics.source.ts` | 82 |
| `PIERCE_MIN_BP` | const | `src/config/ballistics.source.ts` | 79 |
| `PIERCE_STEP_BP` | const | `src/config/ballistics.source.ts` | 81 |
| `PLANTS_SOURCE` | const | `src/config/plants.source.ts` | 25 |
| `PLANT_AXES_BY_GENE` | const | `src/config/phenotype.source.ts` | 50 |
| `PLANT_AXIS_RANGE` | const | `src/config/phenotype.source.ts` | 100 |
| `PLANT_DESCRIPTOR_AXES` | const | `src/config/phenotype.source.ts` | 151 |
| `PLANT_DESCRIPTOR_WEIGHTS` | const | `src/config/phenotype.source.ts` | 166 |
| `PLANT_FORM_THRESHOLDS` | const | `src/config/phenotype.source.ts` | 114 |
| `PLANT_HABIT_BY_ROLE` | const | `src/config/phenotype.source.ts` | 31 |
| `PLANT_IDS` | const | `src/config/plants.source.ts` | 91 |
| `PLANT_INTERACTION` | const | `src/config/phenotype.source.ts` | 94 |
| `PLANT_INTERACTION_RANGE` | const | `src/config/phenotype.source.ts` | 109 |
| `PLANT_PIGMENT_RAMP` | const | `src/config/phenotype.source.ts` | 131 |
| `PLANT_PIGMENT_SHIFT` | const | `src/config/phenotype.source.ts` | 145 |
| `PLANT_ROUTE_COST` | const | `src/config/map.source.ts` | 51 |
| `PLOT_POOL_KEY` | const | `src/config/map.source.ts` | 74 |
| `PLOT_PRICE` | const | `src/config/map.source.ts` | 75 |
| `POOL_KEYS` | const | `src/config/map.source.ts` | 91 |
| `POT_BOOSTS` | const | `src/config/pot.source.ts` | 40 |
| `POT_COLORS` | const | `src/config/pot.source.ts` | 31 |
| `POT_SEED_VERSION` | const | `src/config/pot.source.ts` | 52 |
| `PREP_WAITS_FOR_FIRST_PLANT` | const | `src/config/economy.source.ts` | 135 |
| `PlantAxis` | type | `src/config/phenotype.source.ts` | 38 |
| `PlantHabit` | type | `src/config/phenotype.source.ts` | 22 |
| `PlantSource` | interface | `src/config/plants.source.ts` | 7 |
| `PlantTypeId` | type | `src/config/plants.source.ts` | 5 |
| `PotBoost` | interface | `src/config/pot.source.ts` | 18 |
| `PotColor` | type | `src/config/pot.source.ts` | 32 |
| `RANGE_BASE_CX` | const | `src/config/ballistics.source.ts` | 38 |
| `RANGE_MAX_CX` | const | `src/config/ballistics.source.ts` | 42 |
| `RANGE_MIN_CX` | const | `src/config/ballistics.source.ts` | 44 |
| `RANGE_PER_HEIGHT_BP` | const | `src/config/ballistics.source.ts` | 40 |
| `REARING_SLOTS_MAX` | const | `src/config/economy.source.ts` | 61 |
| `REARING_SLOTS_START` | const | `src/config/economy.source.ts` | 60 |
| `REARING_SLOT_GATES` | const | `src/config/economy.source.ts` | 62 |
| `RESUME_NEKTAR_PER_WAVE` | const | `src/config/economy.source.ts` | 88 |
| `RoutePoint` | type | `src/config/world.source.ts` | 15 |
| `SEEDLING_GROWTH_FACTOR` | const | `src/config/economy.source.ts` | 164 |
| `SEED_POOL_ITEM` | const | `src/config/economy.source.ts` | 15 |
| `SEED_PRICE` | const | `src/config/economy.source.ts` | 16 |
| `SHOP_POOLS_SOURCE` | const | `src/config/shop.source.ts` | 35 |
| `SHOP_POOL_IDS` | const | `src/config/shop.source.ts` | 41 |
| `SPEED_BASE_BP` | const | `src/config/ballistics.source.ts` | 26 |
| `SPEED_GAIN_BP` | const | `src/config/ballistics.source.ts` | 28 |
| `SPEED_MAX_BP` | const | `src/config/ballistics.source.ts` | 30 |
| `STARTER_PLANT_COUNT` | const | `src/config/economy.source.ts` | 6 |
| `STARTING_INVENTORY` | const | `src/config/plants.source.ts` | 96 |
| `STARTING_MATERIAL` | const | `src/config/map.source.ts` | 87 |
| `STARTING_NEKTAR` | const | `src/config/economy.source.ts` | 23 |
| `STARTING_TILE_POOL` | const | `src/config/map.source.ts` | 64 |
| `ShopPoolId` | type | `src/config/shop.source.ts` | 16 |
| `VECTOR_ATTRACTOR_CONFIG` | const | `src/config/vector_logic.source.ts` | 83 |
| `VECTOR_DRIFT_CAP` | const | `src/config/vector_logic.source.ts` | 66 |
| `VECTOR_DRIFT_STAR_WEIGHT` | const | `src/config/vector_logic.source.ts` | 67 |
| `VECTOR_IDS` | const | `src/config/vector_logic.source.ts` | 38 |
| `VECTOR_LOGIC_SOURCE` | const | `src/config/vector_logic.source.ts` | 28 |
| `VECTOR_VISUAL_IDS` | const | `src/config/vector_visual.source.ts` | 27 |
| `VECTOR_VISUAL_SOURCE` | const | `src/config/vector_visual.source.ts` | 17 |
| `VectorId` | type | `src/config/vector_logic.source.ts` | 6 |
| `VectorLogicSource` | interface | `src/config/vector_logic.source.ts` | 10 |
| `VectorVisualSource` | interface | `src/config/vector_visual.source.ts` | 7 |
| `WAVE_BONUS` | const | `src/config/economy.source.ts` | 110 |
| `WEAKENED_THRESHOLD` | const | `src/config/economy.source.ts` | 152 |
| `WUCHS_HEIGHT` | const | `src/config/ballistics.source.ts` | 60 |
| `WUCHS_THICKNESS` | const | `src/config/ballistics.source.ts` | 68 |
| `WaveSchedule` | interface | `src/config/enemies.source.ts` | 62 |
| `beetleInteractionOf` | function | `src/config/beetlePhenotype.source.ts` | 178 |
| `beetleWavesToUnlock` | function | `src/config/beetles.source.ts` | 149 |
| `dist` | function | `src/config/world.source.ts` | 27 |
| `driftFor` | function | `src/config/phenotype.source.ts` | 237 |
| `generateWaveSchedule` | function | `src/config/enemies.source.ts` | 71 |
| `interactionOf` | function | `src/config/phenotype.source.ts` | 250 |
| `isInsideWorld` | function | `src/config/world.source.ts` | 18 |
| `isValidEffect` | function | `src/config/effects.source.ts` | 62 |
| `isValidVector` | function | `src/config/vector_logic.source.ts` | 165 |
| `isValidVectorVisual` | function | `src/config/vector_visual.source.ts` | 29 |
| `poolLabelKey` | function | `src/config/shop.source.ts` | 51 |
| `poolPriceOf` | function | `src/config/shop.source.ts` | 44 |
| `rarityForCost` | function | `src/config/economy.source.ts` | 167 |
| `rearingSlotGate` | function | `src/config/economy.source.ts` | 75 |
| `resumeCostFor` | function | `src/config/economy.source.ts` | 89 |
| `vectorForEffect` | function | `src/config/vector_logic.source.ts` | 62 |
| `waveEnemyCount` | function | `src/config/enemies.source.ts` | 102 |
| `wavesToUnlockFor` | function | `src/config/economy.source.ts` | 43 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/config/enemies.source.ts` | 72 | `'wave'` | 1 | [`src/config/enemies.source.ts`](enemies.source.ts) | makeRng |
| `src/config/sources.test.ts` | 17 | `'Phase 5 gate: source validation'` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | describe |
| `src/config/sources.test.ts` | 18 | `'exactly 18 effects exist (10 Grundstock + 8 der zweiten Gen-Gruppe)'` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 21 | `EFFECT_IDS` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 24 | `'jedes Pool-Gen hat einen Gameplay-Effekt aus der Source'` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 27 | `effect` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 28 | `isValidEffect(effect)` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 28 | `effect` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | isValidEffect |
| `src/config/sources.test.ts` | 29 | `EFFECTS_SOURCE[effect]` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 31 | `Object.keys(GENE_EFFECTS)` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 34 | `'KEIN Gen ist auf den Gameplay-Effekt reduziert: jedes verschiebt Phänotyp-Achse` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 39 | `axes` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 40 | `Object.keys(axes!).length` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 42 | `Object.keys(PLANT_AXES_BY_GENE)` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 45 | `'jede Gen-Achse liegt im geklemmten Fenster und benennt eine bekannte Achse'` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 48 | `PLANT_AXIS_RANGE` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 49 | `Math.abs(amount)` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 54 | `'Rollen-Tendenz und Pigment-Rampe sind vollständig (Anatomie braucht einen Grund` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 56 | `PLANT_HABIT_BY_ROLE[role]` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 58 | `PLANT_PIGMENT_RAMP.length` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 60 | `base` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 61 | `accent` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 65 | `'Zucht-Kurve ist eine stetige Drift-Kurve, kein Generations-Schalter'` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 78 | `g` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | keep |
| `src/config/sources.test.ts` | 80 | `d[i]!` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 81 | `d[i]! - d[i - 1]!` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 83 | `d[0]!` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 84 | `d[d.length - 1]!` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 87 | `d[0]!` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 88 | `1` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | driftFor |
| `src/config/sources.test.ts` | 88 | `driftFor(1)` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 91 | `'R2: die Route ist das Pathfinding-Ergebnis — es gibt keinen Fallback-Pfad mehr'` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 93 | `world.resolveActiveRoute` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 94 | `world.ENEMY_PATH` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 95 | `typeof world.isInsideWorld` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 98 | `'zwei Kacheln bleiben: Topf (Blocker) und Deko (kosmetisch) — Weg und Findling s` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | it |
| `src/config/sources.test.ts` | 104 | `MAP_TILE_IDS` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 106 | `raw.path` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 107 | `raw.boulder` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
| `src/config/sources.test.ts` | 109 | `MAP_TILES_SOURCE.pot.walkable` | 1 | [`src/config/sources.test.ts`](sources.test.ts) | expect |
