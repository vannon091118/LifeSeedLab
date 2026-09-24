# Modul: discovery

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/discovery/`

## Umfang

9 Dateien · importiert `components`, `genome` · wird importiert von `components`, `genome`

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`chain.test.ts`](./chain.test.ts) | 130 | 0 | CALL 117, IMPORTS 3, PASS 113, READ 56, RETURN 1, STRING_REFERENCE 93 |
| [`chain.ts`](./chain.ts) | 253 | 2 | CALL 46, EXPORTS 12, IMPORTS 5, PASS 46, READ 129, RETURN 34, STRING_REFERENCE 26 |
| [`codex.ts`](./codex.ts) | 152 | 2 | CALL 36, EXPORTS 6, IMPORTS 6, PASS 32, READ 44, RETURN 15, STRING_REFERENCE 14 |
| [`codex_migration.ts`](./codex_migration.ts) | 98 | 0 | CALL 11, EXPORTS 2, IMPORTS 1, PASS 11, READ 19, RETURN 10, STRING_REFERENCE 8 |
| [`epoch.test.ts`](./epoch.test.ts) | 195 | 0 | CALL 116, IMPORTS 5, PASS 120, READ 73, RETURN 1, STRING_REFERENCE 90 |
| [`genomeWorker.ts`](./genomeWorker.ts) | 26 | 0 | CALL 6, IMPORTS 1, PASS 6, READ 10, STRING_REFERENCE 7 |
| [`plantRef.ts`](./plantRef.ts) | 47 | 0 | CALL 1, EXPORTS 1, IMPORTS 2, PASS 1, RETURN 1, STRING_REFERENCE 2 |
| [`share.test.ts`](./share.test.ts) | 80 | 0 | CALL 64, IMPORTS 7, PASS 64, READ 70, STRING_REFERENCE 24 |
| [`share.ts`](./share.ts) | 153 | 0 | CALL 44, EXPORTS 10, IMPORTS 3, PASS 40, READ 84, RETURN 17, STRING_REFERENCE 47 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `AppendDiscoveryInput` | interface | `src/discovery/codex.ts` | 94 |
| `DiscoveryEntry` | interface | `src/discovery/chain.ts` | 48 |
| `DiscoveryEntryType` | type | `src/discovery/chain.ts` | 46 |
| `ParsedShare` | type | `src/discovery/share.ts` | 14 |
| `ShareParentContext` | type | `src/discovery/share.ts` | 12 |
| `ShareResult` | type | `src/discovery/share.ts` | 18 |
| `WorkerRequest` | type | `src/discovery/share.ts` | 129 |
| `WorkerResponse` | type | `src/discovery/share.ts` | 130 |
| `appendDiscovery` | function | `src/discovery/codex.ts` | 108 |
| `canonicalGenome` | function | `src/discovery/chain.ts` | 25 |
| `createEntry` | function | `src/discovery/chain.ts` | 111 |
| `createEntry` | function | `src/discovery/chain.ts` | 112 |
| `createEntry` | function | `src/discovery/chain.ts` | 113 |
| `formatShareText` | function | `src/discovery/share.ts` | 78 |
| `getPlayerId` | function | `src/discovery/codex.ts` | 55 |
| `hashEntry` | function | `src/discovery/chain.ts` | 102 |
| `hashGenome` | function | `src/discovery/chain.ts` | 37 |
| `legacyGenomeHash` | function | `src/discovery/chain.ts` | 42 |
| `loadCodex` | function | `src/discovery/codex.ts` | 73 |
| `migrateToPlantRef` | function | `src/discovery/codex_migration.ts` | 67 |
| `migrateV1Entries` | function | `src/discovery/codex_migration.ts` | 37 |
| `parseShare` | function | `src/discovery/share.ts` | 90 |
| `plantRefOf` | function | `src/discovery/plantRef.ts` | 38 |
| `reconstructShare` | function | `src/discovery/share.ts` | 109 |
| `reconstructShareInWorker` | function | `src/discovery/share.ts` | 135 |
| `seedShareText` | function | `src/discovery/codex.ts` | 141 |
| `shareTextForEntry` | function | `src/discovery/share.ts` | 122 |
| `syncEntryStub` | function | `src/discovery/chain.ts` | 251 |
| `tryAppend` | function | `src/discovery/chain.ts` | 229 |
| `verifyChain` | function | `src/discovery/chain.ts` | 186 |
| `verifyLocalChain` | function | `src/discovery/codex.ts` | 136 |

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
| `src/discovery/chain.test.ts` | 11 | `await hashGenome(a)` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 11 | `a` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 14 | `'ändert sich bei anderem Genom'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 15 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 16 | `'ice'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 17 | `await hashGenome(a)` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 17 | `a` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 20 | `'ist stabil über Quantisierung (1e-4)'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | it |
| `src/discovery/chain.test.ts` | 21 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 22 | `'fire'` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | g |
| `src/discovery/chain.test.ts` | 24 | `await hashGenome(a)` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
| `src/discovery/chain.test.ts` | 24 | `a` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | hashGenome |
| `src/discovery/chain.test.ts` | 26 | `await hashGenome([g('fire', 0.123451)])` | 1 | [`src/discovery/chain.test.ts`](chain.test.ts) | expect |
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
