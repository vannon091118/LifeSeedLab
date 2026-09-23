# Modul: discovery

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/discovery/`

## Umfang

6 Dateien · importiert `components`, `genome` · wird importiert von `components`, `genome`

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`chain.test.ts`](./chain.test.ts) | 130 | 0 | CALL 117, IMPORTS 3, PASS 113, READ 56, RETURN 1, STRING_REFERENCE 93 |
| [`chain.ts`](./chain.ts) | 220 | 2 | CALL 23, EXPORTS 8, IMPORTS 5, PASS 21, READ 65, RETURN 18, STRING_REFERENCE 17 |
| [`codex.ts`](./codex.ts) | 189 | 1 | CALL 36, EXPORTS 5, IMPORTS 5, PASS 31, READ 37, RETURN 16, STRING_REFERENCE 12 |
| [`codex_migration.ts`](./codex_migration.ts) | 97 | 0 | CALL 11, EXPORTS 2, IMPORTS 1, PASS 11, READ 19, RETURN 9, STRING_REFERENCE 8 |
| [`epoch.test.ts`](./epoch.test.ts) | 195 | 0 | CALL 116, IMPORTS 5, PASS 120, READ 73, RETURN 1, STRING_REFERENCE 90 |
| [`plantRef.ts`](./plantRef.ts) | 46 | 0 | CALL 1, EXPORTS 1, IMPORTS 2, PASS 1, RETURN 1, STRING_REFERENCE 2 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `DiscoveryEntry` | interface | `src/discovery/chain.ts` | 48 |
| `DiscoveryEntryType` | type | `src/discovery/chain.ts` | 46 |
| `appendDiscovery` | function | `src/discovery/codex.ts` | 146 |
| `createEntry` | function | `src/discovery/chain.ts` | 128 |
| `getPlayerId` | function | `src/discovery/codex.ts` | 63 |
| `hashEntry` | function | `src/discovery/chain.ts` | 122 |
| `hashGenome` | function | `src/discovery/chain.ts` | 36 |
| `loadCodex` | function | `src/discovery/codex.ts` | 102 |
| `migrateToPlantRef` | function | `src/discovery/codex_migration.ts` | 66 |
| `migrateV1Entries` | function | `src/discovery/codex_migration.ts` | 37 |
| `plantRefOf` | function | `src/discovery/plantRef.ts` | 38 |
| `seedShareText` | function | `src/discovery/codex.ts` | 185 |
| `syncEntryStub` | function | `src/discovery/chain.ts` | 217 |
| `tryAppend` | function | `src/discovery/chain.ts` | 191 |
| `verifyChain` | function | `src/discovery/chain.ts` | 150 |
| `verifyLocalChain` | function | `src/discovery/codex.ts` | 178 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/discovery/chain.test.ts` | 7 | `'Discovery-Chain — genome_hash Determinismus'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | describe |
| `src/discovery/chain.test.ts` | 8 | `'gleicher Seed + gleiche Eltern ⇒ gleicher genome_hash (Beweis)'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 9 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 10 | `'rapid'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 11 | `hashGenome(a)` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 11 | `a` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 14 | `'ändert sich bei anderem Genom'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 15 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 16 | `'ice'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 17 | `hashGenome(a)` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 17 | `a` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 20 | `'ist stabil über Quantisierung (1e-4)'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 21 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 22 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 24 | `hashGenome(a)` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 24 | `a` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 26 | `hashGenome([g('fire', 0.123451)])` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 26 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 26 | `[g('fire', 0.123451)]` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 30 | `'Discovery-Chain — Hash-Chain & Verifikation'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | describe |
| `src/discovery/chain.test.ts` | 31 | `'verkettet prev_hash und ist verifizierbar'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 32 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 33 | `'ice'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 34 | `'heal'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 36 | `{ genome: g1, parents: ['base_shooter', 'base_wall'], seed: 111, generation: 0, ` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | createEntry |
| `src/discovery/chain.test.ts` | 37 | `{ genome: g2, parents: ['base_shooter', 'base_wall'], seed: 222, generation: 1, ` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | createEntry |
| `src/discovery/chain.test.ts` | 38 | `{ genome: g3, parents: ['base_wall', 'base_support'], seed: 333, generation: 2, ` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | createEntry |
| `src/discovery/chain.test.ts` | 39 | `e1.prev_hash` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 40 | `e2.prev_hash` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 41 | `e3.prev_hash` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 42 | `verifyChain([e1, e2, e3])` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 42 | `[e1, e2, e3]` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | verifyChain |
| `src/discovery/chain.test.ts` | 45 | `'erkennt Manipulation (entry_hash mismatch)'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 46 | `{ genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 1, generation: 0, player_` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | createEntry |
| `src/discovery/chain.test.ts` | 46 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 48 | `[bad]` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | verifyChain |
| `src/discovery/chain.test.ts` | 49 | `res.valid` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 50 | `res.index` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 53 | `'erkennt gebrochenen prev_hash'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 54 | `{ genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 1, generation: 0, player_` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | createEntry |
