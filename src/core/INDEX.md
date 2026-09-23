# Modul: core

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/core/`

## Umfang

7 Dateien · importiert `bus`, `components`, `config` +10 · wird importiert von `bus`, `components`, `config` +10

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`clock.ts`](./clock.ts) | 107 | 7 | CALL 3, EXPORTS 6, PASS 2, READ 55, RETURN 6, STRING_REFERENCE 6 |
| [`color.ts`](./color.ts) | 36 | 8 | CALL 16, EXPORTS 5, PASS 16, READ 7, RETURN 7, STRING_REFERENCE 3 |
| [`core.test.ts`](./core.test.ts) | 200 | 0 | CALL 175, IMPORTS 5, PASS 137, READ 97, STRING_REFERENCE 85 |
| [`hash.ts`](./hash.ts) | 100 | 10 | CALL 52, EXPORTS 4, IMPORTS 2, PASS 52, READ 85, RETURN 4, STRING_REFERENCE 5 |
| [`ids.ts`](./ids.ts) | 46 | 20 | CALL 9, EXPORTS 5, PASS 9, READ 16, RETURN 3, STRING_REFERENCE 12 |
| [`order.ts`](./order.ts) | 27 | 2 | EXPORTS 1, RETURN 2 |
| [`rng.ts`](./rng.ts) | 127 | 33 | CALL 29, EXPORTS 7, IMPORTS 1, PASS 24, READ 21, RETURN 16, STRING_REFERENCE 22 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `CYCLE_TICKS` | const | `src/core/clock.ts` | 21 |
| `ClockState` | interface | `src/core/clock.ts` | 5 |
| `GAMEPLAY_NAMESPACES` | const | `src/core/rng.ts` | 19 |
| `GameClock` | class | `src/core/clock.ts` | 23 |
| `HashableState` | interface | `src/core/hash.ts` | 10 |
| `Rng` | class | `src/core/rng.ts` | 32 |
| `RngNamespace` | type | `src/core/rng.ts` | 15 |
| `SPEED_STEPS` | const | `src/core/clock.ts` | 19 |
| `TICK_MS` | const | `src/core/clock.ts` | 17 |
| `VISUAL_NAMESPACES` | const | `src/core/rng.ts` | 20 |
| `clocksEqual` | function | `src/core/clock.ts` | 99 |
| `compareCodeUnits` | function | `src/core/order.ts` | 24 |
| `darken` | function | `src/core/color.ts` | 36 |
| `deriveSeed` | function | `src/core/rng.ts` | 92 |
| `fnv1a` | function | `src/core/hash.ts` | 43 |
| `fnv1aHex` | function | `src/core/hash.ts` | 38 |
| `hashState` | function | `src/core/hash.ts` | 58 |
| `hexToRgb` | function | `src/core/color.ts` | 8 |
| `lighten` | function | `src/core/color.ts` | 33 |
| `makeRng` | function | `src/core/rng.ts` | 122 |
| `nextId` | function | `src/core/ids.ts` | 17 |
| `nextScopedId` | function | `src/core/ids.ts` | 24 |
| `resetIds` | function | `src/core/ids.ts` | 34 |
| `restoreIds` | function | `src/core/ids.ts` | 43 |
| `rgbToHex` | function | `src/core/color.ts` | 14 |
| `shiftChannels` | function | `src/core/color.ts` | 20 |
| `snapshotIds` | function | `src/core/ids.ts` | 39 |
| `strHash` | function | `src/core/rng.ts` | 108 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/core/color.ts` | 16 | `r` | 1 | [`src/core/color.ts`](color.ts) | c |
| `src/core/color.ts` | 21 | `hex` | 1 | [`src/core/color.ts`](color.ts) | hexToRgb |
| `src/core/color.ts` | 22 | `r + dr` | 1 | [`src/core/color.ts`](color.ts) | rgbToHex |
| `src/core/color.ts` | 27 | `hex` | 1 | [`src/core/color.ts`](color.ts) | hexToRgb |
| `src/core/color.ts` | 28 | `r + (255 - r) * f` | 1 | [`src/core/color.ts`](color.ts) | rgbToHex |
| `src/core/color.ts` | 29 | `r * (1 + f)` | 1 | [`src/core/color.ts`](color.ts) | rgbToHex |
| `src/core/color.ts` | 33 | `hex` | 1 | [`src/core/color.ts`](color.ts) | shiftFactor |
| `src/core/color.ts` | 36 | `hex` | 1 | [`src/core/color.ts`](color.ts) | shiftFactor |
| `src/core/core.test.ts` | 12 | `33.34` | 1 | [`src/core/clock.ts`](clock.ts) | advance |
| `src/core/core.test.ts` | 13 | `33.33` | 1 | [`src/core/clock.ts`](clock.ts) | advance |
| `src/core/core.test.ts` | 46 | `a.snapshot()` | 1 | [`src/core/clock.ts`](clock.ts) | restore |
| `src/core/core.test.ts` | 7 | `'Phase 2.1 GameClock'` | 1 | [`src/core/core.test.ts`](core.test.ts) | describe |
| `src/core/core.test.ts` | 8 | `'same tick input produces identical clock state'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 16 | `a.get().tick` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 17 | `b.get().tick` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 20 | `'two clocks fed identical steps are bit-identical'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 24 | `a.get()` | 1 | [`src/core/core.test.ts`](core.test.ts) | clocksEqual |
| `src/core/core.test.ts` | 24 | `clocksEqual(a.get(), b.get())` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 27 | `'fixed timestep: 30 ticks per simulated second'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 30 | `c.get().tick` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 31 | `c.get().elapsed` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 34 | `'phase cycles day/night deterministically'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 37 | `c.get().phase` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 39 | `c.get().phase` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 42 | `'restore reproduces exact state'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 48 | `a.get()` | 1 | [`src/core/core.test.ts`](core.test.ts) | clocksEqual |
| `src/core/core.test.ts` | 48 | `clocksEqual(a.get(), b.get())` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 52 | `'Phase 2.2 Seeded RNG'` | 1 | [`src/core/core.test.ts`](core.test.ts) | describe |
| `src/core/core.test.ts` | 53 | `'same seed produces same sequence'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 54 | `'world'` | 1 | [`src/core/core.test.ts`](core.test.ts) | makeRng |
| `src/core/core.test.ts` | 55 | `'world'` | 1 | [`src/core/core.test.ts`](core.test.ts) | makeRng |
| `src/core/core.test.ts` | 57 | `a.next()` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 61 | `'different seeds diverge'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 62 | `'world'` | 1 | [`src/core/core.test.ts`](core.test.ts) | makeRng |
| `src/core/core.test.ts` | 63 | `'world'` | 1 | [`src/core/core.test.ts`](core.test.ts) | makeRng |
| `src/core/core.test.ts` | 64 | `a.next()` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
| `src/core/core.test.ts` | 67 | `'nextInt is within bounds and deterministic'` | 1 | [`src/core/core.test.ts`](core.test.ts) | it |
| `src/core/core.test.ts` | 68 | `'wave'` | 1 | [`src/core/core.test.ts`](core.test.ts) | makeRng |
| `src/core/core.test.ts` | 69 | `'wave'` | 1 | [`src/core/core.test.ts`](core.test.ts) | makeRng |
| `src/core/core.test.ts` | 72 | `v` | 1 | [`src/core/core.test.ts`](core.test.ts) | expect |
