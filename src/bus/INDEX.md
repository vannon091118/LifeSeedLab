# Modul: bus

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/bus/`

## Umfang

8 Dateien · importiert `components`, `dev`, `meta` +5 · wird importiert von `components`, `dev`, `meta` +5

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`bus.ts`](./bus.ts) | 49 | 2 | CALL 11, EXPORTS 1, IMPORTS 1, PASS 10, READ 20, RETURN 3, STRING_REFERENCE 1 |
| [`bus_audience.test.ts`](./bus_audience.test.ts) | 141 | 0 | CALL 56, IMPORTS 8, PASS 48, READ 48, STRING_REFERENCE 89 |
| [`bus_commands.test.ts`](./bus_commands.test.ts) | 84 | 0 | CALL 89, IMPORTS 6, PASS 76, READ 53, STRING_REFERENCE 35 |
| [`bus_events.test.ts`](./bus_events.test.ts) | 75 | 0 | CALL 52, IMPORTS 3, PASS 47, READ 31, STRING_REFERENCE 41 |
| [`commands.ts`](./commands.ts) | 111 | 12 | CALL 1, EXPORTS 6, IMPORTS 1, PASS 1, READ 7, RETURN 4, STRING_REFERENCE 19 |
| [`eventAudience.ts`](./eventAudience.ts) | 170 | 1 | CALL 6, EXPORTS 4, IMPORTS 1, PASS 6, READ 5, STRING_REFERENCE 98 |
| [`events.ts`](./events.ts) | 202 | 25 | CALL 2, EXPORTS 16, PASS 2, READ 18, RETURN 1, STRING_REFERENCE 72 |
| [`reject_reasons.test.ts`](./reject_reasons.test.ts) | 73 | 0 | CALL 41, IMPORTS 3, PASS 34, READ 27, RETURN 2, STRING_REFERENCE 28 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `BeetleRejectReason` | type | `src/bus/events.ts` | 67 |
| `Command` | type | `src/bus/commands.ts` | 45 |
| `CommandPayloads` | interface | `src/bus/commands.ts` | 25 |
| `CommandQueue` | class | `src/bus/commands.ts` | 73 |
| `CommandType` | type | `src/bus/commands.ts` | 6 |
| `EVENT_AUDIENCE` | const | `src/bus/eventAudience.ts` | 34 |
| `EventBus` | class | `src/bus/bus.ts` | 7 |
| `EventPayloads` | interface | `src/bus/events.ts` | 86 |
| `EventType` | type | `src/bus/events.ts` | 3 |
| `FX_EVENT_TYPES` | const | `src/bus/eventAudience.ts` | 160 |
| `FertilizeRejectReason` | type | `src/bus/events.ts` | 57 |
| `GameEvent` | type | `src/bus/events.ts` | 142 |
| `NOTICE_EVENT_TYPES` | const | `src/bus/eventAudience.ts` | 163 |
| `NoticeReason` | type | `src/bus/events.ts` | 80 |
| `OBSERVED_EVENT_TYPES` | const | `src/bus/eventAudience.ts` | 170 |
| `PlacementRejectReason` | type | `src/bus/events.ts` | 53 |
| `PlantRejectReason` | type | `src/bus/events.ts` | 55 |
| `PropagateRejectReason` | type | `src/bus/events.ts` | 59 |
| `RejectReason` | type | `src/bus/events.ts` | 82 |
| `RouteRejectReason` | type | `src/bus/events.ts` | 69 |
| `RunEndReason` | type | `src/bus/events.ts` | 76 |
| `TileRejectReason` | type | `src/bus/events.ts` | 65 |
| `UiRejectReason` | type | `src/bus/events.ts` | 74 |
| `assertEventContract` | function | `src/bus/events.ts` | 185 |
| `makeCommand` | function | `src/bus/commands.ts` | 56 |
| `makeEvent` | function | `src/bus/events.ts` | 167 |
| `makePlacementRejected` | function | `src/bus/commands.ts` | 96 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/bus/bus.ts` | 15 | `event` | 1 | [`src/bus/bus.ts`](bus.ts) | assertEventContract |
| `src/bus/bus.ts` | 23 | `event` | 1 | [`src/bus/bus.ts`](bus.ts) | h |
| `src/bus/bus.ts` | 33 | `type` | 1 | [`src/bus/bus.ts`](bus.ts) | unsubscribe |
| `src/bus/bus_audience.test.ts` | 60 | `7` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | makeEvent |
| `src/bus/bus_audience.test.ts` | 62 | `'B29 — Event-Audience: jede Zeile ist entschieden'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | describe |
| `src/bus/bus_audience.test.ts` | 63 | `'jedes Event hat eine Einordnung mit Begründung'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | it |
| `src/bus/bus_audience.test.ts` | 66 | `entry` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 67 | `entry.audiences.length` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 68 | `entry.why.length` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 71 | `Object.keys(EVENT_AUDIENCE)` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 74 | `'FX- und Notice-Listen sind Ableitungen, keine Zweitlisten'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | it |
| `src/bus/bus_audience.test.ts` | 75 | `EVENT_AUDIENCE[type].audiences` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 76 | `EVENT_AUDIENCE[type].audiences` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 77 | `new Set(OBSERVED_EVENT_TYPES)` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 78 | `FX_EVENT_TYPES.length` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 81 | `'jede fx-Zeile erzeugt wirklich Kommandos — und bei FX OFF keine'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | it |
| `src/bus/bus_audience.test.ts` | 84 | `type` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | sample |
| `src/bus/bus_audience.test.ts` | 85 | `on.pending` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 88 | `type` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | sample |
| `src/bus/bus_audience.test.ts` | 89 | `off.pending` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 93 | `'jede notice-Zeile liefert einen Grund, der ein Event ist (kein stiller Durchlau` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | it |
| `src/bus/bus_audience.test.ts` | 95 | `sample(type)` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | noticeFromEvent |
| `src/bus/bus_audience.test.ts` | 95 | `type` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | sample |
| `src/bus/bus_audience.test.ts` | 96 | `notice` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 97 | `notice!.tick` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 104 | `'jeder Ablehnungsgrund hat einen Text in DE und EN'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | it |
| `src/bus/bus_audience.test.ts` | 122 | `reason as NoticeReason` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | rejectTextKey |
| `src/bus/bus_audience.test.ts` | 123 | `translations.de[key]` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 124 | `translations.en[key]` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 128 | `translations.de[rejectTextKey('unknown')]` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 128 | `'unknown'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | rejectTextKey |
| `src/bus/bus_audience.test.ts` | 129 | `translations.en[rejectTextKey('unknown')]` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 129 | `'unknown'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | rejectTextKey |
| `src/bus/bus_audience.test.ts` | 132 | `'Registry-Notice-Liste und geprüfte Event-Liste stimmen überein'` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | it |
| `src/bus/bus_audience.test.ts` | 133 | `[...NOTICE_EVENT_TYPES].sort()` | 1 | [`src/bus/bus_audience.test.ts`](bus_audience.test.ts) | expect |
| `src/bus/bus_audience.test.ts` | 84 | `sample(type) as never` | 1 | [`src/observers/visualObserver.ts`](../observers/visualObserver.ts) | observe |
| `src/bus/bus_audience.test.ts` | 88 | `sample(type) as never` | 1 | [`src/observers/visualObserver.ts`](../observers/visualObserver.ts) | observe |
| `src/bus/bus_commands.test.ts` | 12 | `'Phase 3.3 Commands'` | 1 | [`src/bus/bus_commands.test.ts`](bus_commands.test.ts) | describe |
| `src/bus/bus_commands.test.ts` | 13 | `'command schema is complete and stable'` | 1 | [`src/bus/bus_commands.test.ts`](bus_commands.test.ts) | it |
| `src/bus/bus_commands.test.ts` | 14 | `7` | 1 | [`src/bus/bus_commands.test.ts`](bus_commands.test.ts) | makeCommand |
