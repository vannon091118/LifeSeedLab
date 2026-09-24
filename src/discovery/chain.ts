// Owner: DiscoveryChain (append-only, hash-linked). LOC ≤ 300.
// Neue Discovery-Einträge verwenden SHA-256 via WebCrypto. FNV bleibt für die Verkettung
// (entry_hash) und für ausdrücklich als Legacy markierte lokale Käfer-Anker erhalten.
//
// Schemaregel: alte Einträge (Schema 3, `hyb-...`) bleiben lesbar. Run-Einträge (Schema 4)
// tragen den öffentlichen Run-Seed, den Elternkontext und einen SHA-256-Genom-Hash. Das ist
// absichtlich additiv: ein gespeicherter alter Fund wird nicht so umgeschrieben, dass seine
// Herkunft plötzlich wie ein SHA-Beweis aussieht.

import type { Allele, Genome, PlantParentSnapshot } from '../types';
import { fnv1aHex, sha256Hex } from '../core/hash';
import { compareCodeUnits } from '../core/order';
import { EPOCH_ID } from '../config';
import { plantRefOf } from './plantRef';

function formatPower(power: number): string {
  return (Math.round(power * 10000) / 10000).toFixed(4);
}

function canonicalAllele(allele: Allele): string {
  return `${allele.id}:${formatPower(allele.power)}:${allele.dominant ? 'D' : 'r'}`;
}

/** Kanonische Genomdarstellung — gemeinsame Wahrheit für Hash und Share-Kontext. */
export function canonicalGenome(genome: Genome, includeGenotype = true): string {
  return [...genome]
    .sort((a, b) => compareCodeUnits(a.id, b.id))
    .map(g => {
      const expressed = canonicalAllele(g);
      if (!includeGenotype || !g.alleles) return expressed;
      return `${expressed}[${g.alleles.map(canonicalAllele).join(',')}]`;
    })
    .join('|');
}

/** SHA-256 des Genoms; der Prefix macht den Hashvertrag im Drahtformat erkennbar. */
export async function hashGenome(genome: Genome): Promise<string> {
  return `sha256-${await sha256Hex(canonicalGenome(genome))}`;
}

/** Legacy-FNV für alte Einträge und lokale Käfer-Anker — niemals als SHA ausgeben. */
export function legacyGenomeHash(genome: Genome): string {
  return `hyb-${fnv1aHex(canonicalGenome(genome, false))}`;
}

export type DiscoveryEntryType = 'cross' | 'found';

export interface DiscoveryEntry {
  /** FNV-Verkettung über den übrigen Payload; kein kryptografischer Genom-Hash. */
  entry_hash: string;
  /** SHA-256 (Schema 4) oder historisches `hyb-` (Schema 3). */
  genome_hash: string;
  /** Eltern-IDs; die Reihenfolge ist für die Zuchtableitung relevant. */
  parents: [string, string];
  /** Historischer Klartext-Seed nur für alte Gründer-Einträge. */
  seed?: number;
  /** Öffentliche Referenz, kein HMAC. */
  plant_ref?: string;
  /** Öffentlicher, run-lokaler Wurzelwert; in Schema 4 Pflicht. */
  run_seed?: number;
  /** Elternkontext für den Worker: IDs, Rollen und Genome der beiden Eltern. */
  parent_context?: [PlantParentSnapshot, PlantParentSnapshot];
  generation: number;
  player_id: string;
  timestamp: number;
  epoch_id: number;
  type: DiscoveryEntryType;
  schema_version: 3 | 4;
  prev_hash: string | null;
}

interface DiscoveryInput {
  genome: Genome;
  parents: [string, string];
  parentContext?: [PlantParentSnapshot, PlantParentSnapshot];
  seed: number;
  generation: number;
  player_id: string;
  timestamp: number;
  epoch_id?: number;
  rootSeed?: number;
  type?: DiscoveryEntryType;
}

function entryPayload(e: Omit<DiscoveryEntry, 'entry_hash'>): string {
  return JSON.stringify({
    genome_hash: e.genome_hash,
    parents: [...e.parents].sort(compareCodeUnits),
    ...(e.plant_ref !== undefined ? { plant_ref: e.plant_ref } : { seed: e.seed }),
    ...(e.run_seed !== undefined ? { run_seed: e.run_seed } : {}),
    ...(e.parent_context !== undefined ? { parent_context: e.parent_context } : {}),
    generation: e.generation,
    player_id: e.player_id,
    timestamp: e.timestamp,
    ...(e.epoch_id !== undefined ? { epoch_id: e.epoch_id } : {}),
    ...(e.type !== undefined ? { type: e.type } : {}),
    ...(e.schema_version !== undefined ? { schema_version: e.schema_version } : {}),
    prev_hash: e.prev_hash,
  });
}

export function hashEntry(entry: Omit<DiscoveryEntry, 'entry_hash'>): string {
  return fnv1aHex(entryPayload(entry));
}

/**
 * Erzeugt einen Eintrag. Ohne `rootSeed` bleibt der historische Test-/Migrationspfad
 * (Schema 3 + FNV) erhalten. Der Produktionspfad übergibt Run-Seed und Elternkontext und
 * schreibt damit Schema 4 + SHA-256.
 */
export function createEntry(input: DiscoveryInput & { rootSeed?: undefined }, prev: DiscoveryEntry | null): DiscoveryEntry;
export function createEntry(input: DiscoveryInput & { rootSeed: number }, prev: DiscoveryEntry | null): Promise<DiscoveryEntry>;
export function createEntry(input: DiscoveryInput, prev: DiscoveryEntry | null): DiscoveryEntry | Promise<DiscoveryEntry> {
  if (input.rootSeed === undefined) return createLegacyEntry(input, prev);
  return createRunEntry(input as DiscoveryInput & { rootSeed: number }, prev);
}

function validateContext(input: DiscoveryInput): void {
  if (input.parentContext && (
    input.parentContext[0].id !== input.parents[0] || input.parentContext[1].id !== input.parents[1]
  )) {
    throw new Error('Elternkontext und Eltern-IDs stimmen nicht überein.');
  }
}

function createLegacyEntry(input: DiscoveryInput, prev: DiscoveryEntry | null): DiscoveryEntry {
  validateContext(input);
  const parents: [string, string] = [...input.parents] as [string, string];
  const referenceParents = [...parents].sort(compareCodeUnits) as [string, string];
  const base: Omit<DiscoveryEntry, 'entry_hash'> = {
    genome_hash: legacyGenomeHash(input.genome),
    parents,
    plant_ref: plantRefOf(input.seed, referenceParents[0]!, referenceParents[1]!, input.generation),
    generation: input.generation,
    player_id: input.player_id,
    timestamp: input.timestamp,
    epoch_id: input.epoch_id ?? EPOCH_ID,
    type: input.type ?? 'cross',
    schema_version: 3,
    prev_hash: prev ? prev.entry_hash : null,
  };
  return { ...base, entry_hash: hashEntry(base) };
}

async function createRunEntry(input: DiscoveryInput & { rootSeed: number }, prev: DiscoveryEntry | null): Promise<DiscoveryEntry> {
  if (!input.parentContext) throw new Error('Run-Discovery benötigt den öffentlichen Elternkontext.');
  validateContext(input);
  const parents: [string, string] = [...input.parents] as [string, string];
  const referenceParents = [...parents].sort(compareCodeUnits) as [string, string];
  const base: Omit<DiscoveryEntry, 'entry_hash'> = {
    genome_hash: await hashGenome(input.genome),
    parents,
    plant_ref: plantRefOf(input.seed, referenceParents[0]!, referenceParents[1]!, input.generation, input.rootSeed),
    generation: input.generation,
    player_id: input.player_id,
    timestamp: input.timestamp,
    epoch_id: input.epoch_id ?? EPOCH_ID,
    type: input.type ?? 'cross',
    schema_version: 4,
    run_seed: input.rootSeed,
    parent_context: input.parentContext,
    prev_hash: prev ? prev.entry_hash : null,
  };
  return { ...base, entry_hash: hashEntry(base) };
}

type VerifyResult = { valid: true } | { valid: false; reason: string; index: number };

function validGenomeHash(hash: string, schema: 3 | 4): boolean {
  return schema === 4
    ? /^sha256-[0-9a-f]{64}$/.test(hash)
    : /^hyb-[0-9a-f]{8}$/.test(hash);
}

function validParentContext(context: unknown): context is [PlantParentSnapshot, PlantParentSnapshot] {
  if (!Array.isArray(context) || context.length !== 2) return false;
  return context.every(parent => {
    if (!parent || typeof parent !== 'object') return false;
    const p = parent as Partial<PlantParentSnapshot>;
    return typeof p.id === 'string' && typeof p.type === 'string' && Array.isArray(p.genome)
      && p.genome.every(g => typeof g?.id === 'string' && Number.isFinite(g?.power)
        && typeof g?.dominant === 'boolean');
  });
}

export function verifyChain(chain: DiscoveryEntry[]): VerifyResult {
  const seenGenome = new Set<string>();
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i]!;
    const { entry_hash: _entryHash, ...rest } = e;
    const expected = hashEntry(rest);
    if (e.entry_hash !== expected) {
      return { valid: false, reason: `hash mismatch at ${i}: expected ${expected} got ${e.entry_hash}`, index: i };
    }
    const expectedPrev = i === 0 ? null : chain[i - 1]!.entry_hash;
    if (e.prev_hash !== expectedPrev) {
      return { valid: false, reason: `prev_hash mismatch at ${i}`, index: i };
    }
    if (seenGenome.has(e.genome_hash)) {
      return { valid: false, reason: `duplicate genome_hash ${e.genome_hash} at ${i}`, index: i };
    }
    seenGenome.add(e.genome_hash);
    if (!validGenomeHash(e.genome_hash, e.schema_version) || e.parents.length !== 2 || !e.player_id) {
      return { valid: false, reason: `malformed entry at ${i}`, index: i };
    }
    if (e.schema_version === 4) {
      if (!Number.isInteger(e.run_seed) || !validParentContext(e.parent_context)) {
        return { valid: false, reason: `run context malformed at ${i}`, index: i };
      }
      if (e.parent_context![0].id !== e.parents[0] || e.parent_context![1].id !== e.parents[1]) {
        return { valid: false, reason: `parent context mismatch at ${i}`, index: i };
      }
    } else if (e.run_seed !== undefined || e.parent_context !== undefined) {
      return { valid: false, reason: `legacy entry carries run context at ${i}`, index: i };
    }
    if (e.plant_ref !== undefined && e.seed !== undefined) {
      return { valid: false, reason: `both plant_ref and seed at ${i}`, index: i };
    }
    if (e.plant_ref === undefined && e.seed === undefined) {
      return { valid: false, reason: `neither plant_ref nor seed at ${i}`, index: i };
    }
    if (e.plant_ref !== undefined && !/^pr-[0-9a-f]{8}$/.test(e.plant_ref)) {
      return { valid: false, reason: `plant_ref malformed at ${i}`, index: i };
    }
  }
  return { valid: true };
}

export function tryAppend(chain: DiscoveryEntry[], entry: DiscoveryEntry): { chain: DiscoveryEntry[]; appended: boolean; reason?: string } {
  if (chain.some(e => e.genome_hash === entry.genome_hash)) {
    return { chain, appended: false, reason: `genome_hash ${entry.genome_hash} already in chain — first discovery wins` };
  }
  const expectedPrev = chain.length === 0 ? null : chain[chain.length - 1]!.entry_hash;
  if (entry.prev_hash !== expectedPrev) {
    return { chain, appended: false, reason: 'prev_hash does not match tip' };
  }
  const { entry_hash: entryHash, ...rest } = entry;
  if (hashEntry(rest) !== entryHash) {
    return { chain, appended: false, reason: 'entry_hash invalid' };
  }
  return { chain: [...chain, entry], appended: true };
}

interface SyncResult {
  ok: boolean;
  reason?: string;
  remoteRejectedAsDuplicate?: boolean;
}

/** Kein Online-Sync behauptet: Der lokale Codex ist die einzige aktive Quelle. */
export async function syncEntryStub(_entry: DiscoveryEntry): Promise<SyncResult> {
  return { ok: false, reason: 'Online-Sync ist nicht konfiguriert; der Fund bleibt lokal.' };
}
