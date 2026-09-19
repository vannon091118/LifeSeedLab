// Owner: DiscoveryChain (append-only, hash-linked). LOC ≤ 250.
// Blockchain-lite ohne Blockchain: deterministischer RNG ist der Beweis,
// FNV-Hash-Chain ist die Verkettung. Keine externen Deps, kein Mining,
// kein Token. Supabase-Spiegel via UNIQUE(genome_hash) — erste Entdeckung gewinnt.

import type { Genome } from '../types';
import { fnv1aHex } from '../core/hash';

// ── Genome-Hash (einzige Wahrheit für eine Kreuzung) ─────────────────
/** Kanonische Darstellung: Gene sortiert nach id, power auf 1e-4 quantisiert. */
function canonicalGenome(genome: Genome): string {
  const sorted = [...genome].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map(g => `${g.id}:${(Math.round(g.power * 10000) / 10000).toFixed(4)}:${g.dominant ? 'D' : 'r'}`).join('|');
}

/** Deterministischer genome_hash — gleicher Seed + gleiche Eltern ⇒ gleicher Hash. */
export function hashGenome(genome: Genome): string {
  return `hyb-${fnv1aHex(canonicalGenome(genome))}`;
}

// ── Discovery-Entry ──────────────────────────────────────────────────
export interface DiscoveryEntry {
  /** entry_hash — SHA256-lite (FNV-Hex) über alle Felder außer sich selbst. */
  entry_hash: string;
  /** FNV-Hex des Genoms — UNIQUE in Supabase, erste Entdeckung gewinnt. */
  genome_hash: string;
  /** Eltern-Varianten-IDs (sortiert kanonisch für deterministischen Hash). */
  parents: [string, string];
  /** Gacha-/Breed-Seed, der das Kind deterministisch erzeugt hat. */
  seed: number;
  generation: number;
  /** Spieler-Identität — organisch sichtbar, kein Prestige-System. */
  player_id: string;
  /** Logischer Zeitstempel (deterministisch aus Seed+Generation abgeleitet, KEINE Uhr) —
   *  derselbe Wert wie in `DiscoveryInput.timestamp`; er identifiziert das Zucht-EREIGNIS,
   *  nicht einen Kalendertag. */
  timestamp: number;
  /** Hash des Vorgängers — null beim Genesis-Eintrag. */
  prev_hash: string | null;
}

/** Eingabe zum Erzeugen eines Eintrags — entry_hash/prev_hash werden abgeleitet. */
export interface DiscoveryInput {
  genome: Genome;
  parents: [string, string];
  seed: number;
  generation: number;
  player_id: string;
  /** Logischer Zeitstempel (deterministisch, KEIN Date.now()). Caller muss liefern. */
  timestamp: number;
}

/** Stabile Serialisierung für den Entry-Hash (Feldreihenfolge fix). */
function entryPayload(e: Omit<DiscoveryEntry, 'entry_hash'>): string {
  return JSON.stringify({
    genome_hash: e.genome_hash,
    parents: [...e.parents].sort(),
    seed: e.seed,
    generation: e.generation,
    player_id: e.player_id,
    timestamp: e.timestamp,
    prev_hash: e.prev_hash,
  });
}

export function hashEntry(entry: Omit<DiscoveryEntry, 'entry_hash'>): string {
  return fnv1aHex(entryPayload(entry));
}

/** Erzeugt einen neuen Chain-Eintrag verkettet an `prev`. */
export function createEntry(input: DiscoveryInput, prev: DiscoveryEntry | null): DiscoveryEntry {
  const genome_hash = hashGenome(input.genome);
  const timestamp = input.timestamp; // required, deterministic — no Date.now()
  const parents: [string, string] = [...input.parents].sort() as [string, string];
  const base: Omit<DiscoveryEntry, 'entry_hash'> = {
    genome_hash,
    parents,
    seed: input.seed,
    generation: input.generation,
    player_id: input.player_id,
    timestamp,
    prev_hash: prev ? prev.entry_hash : null,
  };
  return { ...base, entry_hash: hashEntry(base) };
}

// ── Chain-Verifikation ───────────────────────────────────────────────
export type VerifyResult = { valid: true } | { valid: false; reason: string; index: number };

export function verifyChain(chain: DiscoveryEntry[]): VerifyResult {
  const seenGenome = new Set<string>();
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    // Hash-Integrität
    const { entry_hash, ...rest } = e;
    const expected = hashEntry(rest);
    if (entry_hash !== expected) {
      return { valid: false, reason: `hash mismatch at ${i}: expected ${expected} got ${entry_hash}`, index: i };
    }
    // Verkettung
    const expectedPrev = i === 0 ? null : chain[i - 1].entry_hash;
    if (e.prev_hash !== expectedPrev) {
      return { valid: false, reason: `prev_hash mismatch at ${i}`, index: i };
    }
    // genome_hash darf in einer ehrlichen lokalen Chain nicht doppelt vorkommen;
    // global gilt UNIQUE — hier als Warnung, nicht als Invalid (Fork wird vom Server abgelehnt).
    if (seenGenome.has(e.genome_hash)) {
      return { valid: false, reason: `duplicate genome_hash ${e.genome_hash} at ${i}`, index: i };
    }
    seenGenome.add(e.genome_hash);
    // Felder plausibel
    if (!e.genome_hash.startsWith('hyb-') || e.parents.length !== 2 || !e.player_id) {
      return { valid: false, reason: `malformed entry at ${i}`, index: i };
    }
  }
  return { valid: true };
}

/** Append mit Deduplizierung — UNIQUE(genome_hash) lokal erzwungen. */
export function tryAppend(chain: DiscoveryEntry[], entry: DiscoveryEntry): { chain: DiscoveryEntry[]; appended: boolean; reason?: string } {
  if (chain.some(e => e.genome_hash === entry.genome_hash)) {
    return { chain, appended: false, reason: `genome_hash ${entry.genome_hash} already in chain — first discovery wins` };
  }
  const expectedPrev = chain.length === 0 ? null : chain[chain.length - 1].entry_hash;
  if (entry.prev_hash !== expectedPrev) {
    return { chain, appended: false, reason: `prev_hash does not match tip` };
  }
  const { entry_hash, ...rest } = entry;
  if (hashEntry(rest) !== entry_hash) {
    return { chain, appended: false, reason: `entry_hash invalid` };
  }
  return { chain: [...chain, entry], appended: true };
}

// ── Supabase-Sync-Stub (local-first) ─────────────────────────────────
// Der echte Sync ist ein einziger INSERT mit UNIQUE(genome_hash).
// Lokal ist die Chain bereits autoritativ; der Stub dokumentiert die Grenze.

export interface SyncResult {
  ok: boolean;
  reason?: string;
  remoteRejectedAsDuplicate?: boolean;
}

/** Stub — ersetzt durch echten Supabase-Insert wenn `supabaseUrl` konfiguriert ist. */
export async function syncEntryStub(_entry: DiscoveryEntry): Promise<SyncResult> {
  // Kein Backend konfiguriert → lokal-first, kein Fehler.
  return { ok: true };
}
