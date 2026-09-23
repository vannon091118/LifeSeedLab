# Modul: observers

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/observers/`

## Umfang

5 Dateien · importiert `bus`, `render`, `simulation` · wird importiert von `bus`, `render`, `simulation`

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`audioObserver.ts`](./audioObserver.ts) | 131 | 1 | CALL 49, EXPORTS 1, IMPORTS 1, PASS 43, READ 81, RETURN 15, STRING_REFERENCE 71 |
| [`observers.test.ts`](./observers.test.ts) | 303 | 0 | CALL 244, IMPORTS 9, PASS 210, READ 239, RETURN 3, STRING_REFERENCE 140 |
| [`particles.ts`](./particles.ts) | 149 | 3 | CALL 16, EXPORTS 2, IMPORTS 1, PASS 9, READ 77, RETURN 6, STRING_REFERENCE 82 |
| [`visualExecutor.ts`](./visualExecutor.ts) | 27 | 1 | CALL 3, EXPORTS 1, IMPORTS 4, PASS 3, READ 11, STRING_REFERENCE 6 |
| [`visualObserver.ts`](./visualObserver.ts) | 239 | 5 | CALL 54, EXPORTS 2, IMPORTS 5, PASS 53, READ 192, RETURN 8, STRING_REFERENCE 149 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `AudioObserver` | class | `src/observers/audioObserver.ts` | 11 |
| `Particle` | interface | `src/observers/particles.ts` | 9 |
| `ParticlePool` | class | `src/observers/particles.ts` | 67 |
| `VisualCommand` | type | `src/observers/visualObserver.ts` | 14 |
| `VisualObserver` | class | `src/observers/visualObserver.ts` | 40 |
| `executeVisualCommand` | function | `src/observers/visualExecutor.ts` | 10 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/observers/audioObserver.ts` | 49 | `e` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | profileFor |
| `src/observers/audioObserver.ts` | 54 | `profile` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | play |
| `src/observers/audioObserver.ts` | 116 | `'square'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 117 | `0.06` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | noise |
| `src/observers/audioObserver.ts` | 117 | `'sine'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 118 | `'sine'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 119 | `0.25` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | noise |
| `src/observers/audioObserver.ts` | 120 | `0.18` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | noise |
| `src/observers/audioObserver.ts` | 120 | `'sawtooth'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 121 | `'sawtooth'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 122 | `'sine'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 123 | `'triangle'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 124 | `0.14` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | noise |
| `src/observers/audioObserver.ts` | 125 | `0.08` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | noise |
| `src/observers/audioObserver.ts` | 125 | `'sine'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 126 | `'sawtooth'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 127 | `0.4` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | noise |
| `src/observers/audioObserver.ts` | 127 | `'sine'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/audioObserver.ts` | 128 | `'triangle'` | 1 | [`src/observers/audioObserver.ts`](audioObserver.ts) | tone |
| `src/observers/observers.test.ts` | 14 | `makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 })` | 1 | [`src/bus/commands.ts`](../bus/commands.ts) | push |
| `src/observers/observers.test.ts` | 15 | `makeCommand(0, 'START_WAVE', 2, {})` | 1 | [`src/bus/commands.ts`](../bus/commands.ts) | push |
| `src/observers/observers.test.ts` | 11 | `'Phase 8: Visual Observer purity'` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | describe |
| `src/observers/observers.test.ts` | 12 | `'observer never mutates gameplay state (Test G light)'` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | it |
| `src/observers/observers.test.ts` | 13 | `{ seed: 583921 }` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | makeRoot |
| `src/observers/observers.test.ts` | 14 | `0` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | makeCommand |
| `src/observers/observers.test.ts` | 15 | `0` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | makeCommand |
| `src/observers/observers.test.ts` | 25 | `after` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 28 | `'FX on/off produces identical visual command structure except queue emptiness'` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | it |
| `src/observers/observers.test.ts` | 32 | `5` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | makeEvent |
| `src/observers/observers.test.ts` | 37 | `on.drain().length` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 38 | `off.drain().length` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 41 | `'P-28: der Mündungspuff startet am ABSCHUSSORT in der Effektfarbe (B5-Vertrag er` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | it |
| `src/observers/observers.test.ts` | 43 | `6` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | makeEvent |
| `src/observers/observers.test.ts` | 50 | `puff` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 51 | `puff!.x` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 52 | `puff!.y` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 54 | `puff!.color` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
| `src/observers/observers.test.ts` | 57 | `'P-34: der Einschlag trägt die EFFEKTFARBE (kein Papier mehr auf Papier)'` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | it |
| `src/observers/observers.test.ts` | 59 | `7` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | makeEvent |
| `src/observers/observers.test.ts` | 63 | `bursts.some(b => b.color === '#a3e635')` | 1 | [`src/observers/observers.test.ts`](observers.test.ts) | expect |
