// P1+P2-Verträge (plan-discovery-chain.md): Epoche-Wurzel als Kontext, versionierte Einträge,
// Migration v1→v2, additiv-konditionale Hash-Erweiterung. Jeder Test ist der Beweis eines
// Vertrags, kein Smoke-Test.
import { describe, it, expect } from 'vitest';
import { GAME_SEED, EPOCH_ROOT, EPOCH_ID } from '../config';
import { createEntry, hashEntry, verifyChain, tryAppend, type DiscoveryEntry } from './chain';
import { migrateToPlantRef, migrateV1Entries } from './codex_migration';
import { deriveSeed } from '../core/rng';

const g = (id: string, power: number) => ({ id, power, dominant: false });

describe('P1 — Epoche-Wurzel als Kontext (bitgleich auf Epoche 0)', () => {
  it('EPOCH_ROOT ist auf Epoche 0 exakt GAME_SEED', () => {
    expect(EPOCH_ROOT).toBe(GAME_SEED);
    expect(EPOCH_ID).toBe(0);
  });

  it('Ableitungen über EPOCH_ROOT liefern auf Epoche 0 die Konstanten-Seeds', () => {
    // Der Beweis, dass der Austausch GAME_SEED → EPOCH_ROOT bitgleich ist: dieselbe
    // Ableitung mit der Konstante direkt muss denselben Wert liefern.
    expect(deriveSeed(EPOCH_ROOT, 'plant', 'gacha', 'roll', 3))
      .toBe(deriveSeed(GAME_SEED, 'plant', 'gacha', 'roll', 3));
    expect(deriveSeed(EPOCH_ROOT, 'world', 'run', 1, 1))
      .toBe(deriveSeed(GAME_SEED, 'world', 'run', 1, 1));
  });
});

describe('P2 — Einträge tragen Epoche, Typ und Schema', () => {
  it('neue Einträge erhalten epoch_id/type/schema_version aus der aktiven Epoche', () => {
    const e = createEntry(
      { genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 7, generation: 2, player_id: 'p', timestamp: 1000 },
      null,
    );
    expect(e.epoch_id).toBe(0);
    expect(e.type).toBe('cross');
    // v3 seit der Umbenennung plant_hmac → plant_ref (Feldname ist Teil des Hashes).
    expect(e.schema_version).toBe(3);
    expect(verifyChain([e])).toEqual({ valid: true });
  });

  it('der Entry-Hash deckt die neuen Felder ab — ein manipuliertes epoch_id fällt auf', () => {
    const e = createEntry(
      { genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 7, generation: 2, player_id: 'p', timestamp: 1000 },
      null,
    );
    const tampered: DiscoveryEntry = { ...e, epoch_id: 9 };
    const { entry_hash: _drop, ...rest } = tampered;
    expect(hashEntry(rest)).not.toBe(e.entry_hash);
  });

  it('ein explizit übergebener Typ bleibt erhalten (Found-Fund der Zukunft)', () => {
    const e = createEntry(
      { genome: [g('ice', 0.4)], parents: ['a', 'b'], seed: 9, generation: 1, player_id: 'p', timestamp: 1, type: 'found', epoch_id: 2 },
      null,
    );
    expect(e.type).toBe('found');
    expect(e.epoch_id).toBe(2);
    expect(verifyChain([e])).toEqual({ valid: true });
  });
});

describe("P2' — Migration v2→v3 (plant_hmac → plant_ref)", () => {
  /**
   * Ein Eintrag im alten v2-Format: Feld `plant_hmac`, Wert-Präfix `ph-`. Der Hash wird mit dem
   * ALTEN Payload gebildet — genau er ist nach der Umbenennung nicht mehr nachrechenbar und
   * muss von der Migration ersetzt werden (der Test hält beide Zustände getrennt).
   */
  function legacyV2Entry(generation: number): DiscoveryEntry {
    const base = {
      genome_hash: 'hyb-12345678',
      parents: ['a', 'b'] as [string, string],
      plant_hmac: 'ph-0a1b2c3d',
      generation,
      player_id: 'p',
      timestamp: 1000,
      epoch_id: 0,
      type: 'cross' as const,
      schema_version: 2,
      prev_hash: null as string | null,
    };
    return {
      ...base,
      entry_hash: hashEntry(base as unknown as Omit<DiscoveryEntry, 'entry_hash'>),
    } as unknown as DiscoveryEntry;
  }

  it('benennt das Feld um, schreibt den Präfix um und verkettet neu', () => {
    const entry = legacyV2Entry(3);
    expect((entry as unknown as Record<string, unknown>).plant_hmac).toBe('ph-0a1b2c3d');

    const migrated = migrateToPlantRef([entry]);
    const first = migrated[0]!;
    expect(first.plant_ref).toBe('pr-0a1b2c3d');
    expect((first as unknown as Record<string, unknown>).plant_hmac).toBeUndefined();
    expect(first.schema_version).toBe(3);
    expect(first.entry_hash).not.toBe(entry.entry_hash);
    expect(verifyChain(migrated)).toEqual({ valid: true });
  });

  it('Gründer-Einträge (nur seed) wandern auf v3, ohne eine Referenz zu erfinden', () => {
    const founder = {
      genome_hash: 'hyb-87654321',
      parents: ['a', 'b'],
      seed: 42,
      generation: 0,
      player_id: 'founder',
      timestamp: 1000,
      epoch_id: 0,
      type: 'cross',
      schema_version: 2,
      prev_hash: null,
      entry_hash: '',
    } as unknown as DiscoveryEntry;
    const { entry_hash: _drop, ...rest } = founder;
    founder.entry_hash = hashEntry(rest as Omit<DiscoveryEntry, 'entry_hash'>);

    const migrated = migrateToPlantRef([founder]);
    expect(migrated[0]!.plant_ref).toBeUndefined();
    expect(migrated[0]!.seed).toBe(42);
    expect(migrated[0]!.schema_version).toBe(3);
    expect(verifyChain(migrated)).toEqual({ valid: true });
  });

  it('ist idempotent: eine v3-Kette bleibt bitgleich', () => {
    const e = createEntry(
      { genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 7, generation: 2, player_id: 'p', timestamp: 1000 },
      null,
    );
    expect(migrateToPlantRef([e])[0]).toEqual(e);
  });
});

describe('P2 — Migration v1→v2 (Gründer-Einträge)', () => {
  it('Altbestand ohne Felder wird auf Epoche 0 gehoben und bleibt verifizierbar', () => {
    // Ein Epoche-0-Eintrag im v1-Format: die neuen Felder fehlen, der Hash wurde OHNE sie gebildet
    // (additiv-konditional) — er muss also auch ohne sie weiter gültig sein.
    const legacy = {
      genome_hash: 'hyb-12345678',
      parents: ['a', 'b'],
      seed: 42,
      generation: 1,
      player_id: 'founder',
      timestamp: 1000,
      prev_hash: null,
      entry_hash: '',
    } as unknown as DiscoveryEntry;
    const { entry_hash: _drop, ...rest } = legacy;
    legacy.entry_hash = hashEntry(rest as Omit<DiscoveryEntry, 'entry_hash'>);

    const migrated = migrateV1Entries([legacy]);
    expect(migrated[0]!.epoch_id).toBe(0);
    expect(migrated[0]!.type).toBe('cross');
    // Die v1-Anreicherung endet bewusst auf v2 (Zwischenform mit `plant_hmac`); den Schritt
    // auf v3 macht `migrateToPlantRef`.
    expect(migrated[0]!.schema_version).toBe(2);
    expect(verifyChain(migrated)).toEqual({ valid: true });
  });

  it('Migration rundet bestehende v2-Felder nicht an (idempotent)', () => {
    const e = createEntry(
      { genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 7, generation: 2, player_id: 'p', timestamp: 1000 },
      null,
    );
    const migrated = migrateV1Entries([e]);
    expect(migrated[0]).toEqual(e);
  });

  it('eine gemischte Kette (Gründer + v2) verkettet und verifiziert', () => {
    const founder = {
      genome_hash: 'hyb-12345678',
      parents: ['a', 'b'],
      seed: 42,
      generation: 0,
      player_id: 'founder',
      timestamp: 1000,
      prev_hash: null,
      entry_hash: '',
    } as unknown as DiscoveryEntry;
    const { entry_hash: _drop, ...rest } = founder;
    founder.entry_hash = hashEntry(rest as Omit<DiscoveryEntry, 'entry_hash'>);

    const next = createEntry(
      { genome: [g('ice', 0.4)], parents: ['c', 'd'], seed: 11, generation: 1, player_id: 'p', timestamp: 1001 },
      founder,
    );
    const chain = migrateV1Entries([founder, next]);
    expect(chain[0]!.prev_hash).toBeNull();
    expect(chain[1]!.prev_hash).toBe(chain[0]!.entry_hash);
    expect(verifyChain(chain)).toEqual({ valid: true });
    expect(tryAppend(chain, createEntry(
      { genome: [g('heal', 0.6)], parents: ['e', 'f'], seed: 12, generation: 2, player_id: 'q', timestamp: 1002 },
      chain[chain.length - 1]!,
    )).appended).toBe(true);
  });
});
