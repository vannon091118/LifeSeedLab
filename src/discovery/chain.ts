// Owner: DiscoveryChain (append-only, hash-linked). LOC ≤ 250.
// Blockchain-lite ohne Blockchain: deterministischer RNG ist der Beweis,
// FNV-Hash-Chain ist die Verkettung. Keine externen Deps, kein Mining,
// kein Token. Supabase-Spiegel via UNIQUE(genome_hash) — erste Entdeckung gewinnt.
//
// P2' (Plan „Seed-Identität, HMAC-Pflanzenschutz & Ghost-Map-Multiplayer" §1.2):
// NEUE Einträge tragen `plant_hmac` statt des Klartext-Zucht-Seeds — der Seed ist der
// PRIVATE Teil, der HMAC der ÖFFENTLICHE Identifier. Gründer-Einträge (Epoche 0, vor
// P2') behalten ihren historischen `seed` — das ist dokumentierte Herkunft, kein Leck:
// ihre Wurzel ist ohnehin öffentlich. Die Ableitung des HMAC lebt NICHT hier (Single
// Writer): gacha.ts bleibt der einzige Seed-Writer, `plantHmacOf` mixt seinen Wert.
// Der Payload bleibt ADDITIV-KONDITIONAL: ohne Feld hashen alte Einträge unverändert.

import type { Genome } from '../types';
import { fnv1aHex } from '../core/hash';
import { EPOCH_ID } from '../config';
import { plantHmacOf } from './plantHmac';

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
/**
 * Eintragstyp (P2, plan-discovery-chain.md): versioniert die HERKUNFT eines Fundes.
 * `cross` = aus zwei Eltern gekreuzt (heute der einzige Typ). Der Ticket-Worker (P4) ergänzt
 * später `found` (Feldfund) — das Feld ist die Migrations-Naht, nicht ein Platzhalter.
 */
export type DiscoveryEntryType = 'cross' | 'found';

export interface DiscoveryEntry {
  /** entry_hash — SHA256-lite (FNV-Hex) über alle Felder außer sich selbst. */
  entry_hash: string;
  /** FNV-Hex des Genoms — UNIQUE in Supabase, erste Entdeckung gewinnt. */
  genome_hash: string;
  /** Eltern-Varianten-IDs (sortiert kanonisch für deterministischen Hash). */
  parents: [string, string];
  /** Gacha-/Breed-Seed, der das Kind deterministisch erzeugt hat.
   *  NUR an Gründer-Einträgen (Epoche 0, vor P2') — neue Einträge tragen statt dessen
   *  `plant_hmac` (siehe unten). Ein Seed im Entry ist Herkunfts-Dokumentation, kein
   *  Share-Format: die Wurzel der Gründer-Epoche ist öffentlich, neuere nicht. */
  seed?: number;
  /** ÖFFENTLICHER Pflanzen-Identifier (HMAC über den Zucht-Kontext) — das Share-Format
   *  und der Codex-Beleg neuer Einträge. Nicht umkehrbar, kein Klartext-Seed. */
  plant_hmac?: string;
  generation: number;
  /** Spieler-Identität — organisch sichtbar, kein Prestige-System. */
  player_id: string;
  /** Logischer Zeitstempel (deterministisch aus Seed+Generation abgeleitet, KEINE Uhr) —
   *  derselbe Wert wie in `DiscoveryInput.timestamp`; er identifiziert das Zucht-EREIGNIS,
   *  nicht einen Kalendertag. */
  timestamp: number;
  /** Epoche des Fundes — identifiziert die Wurzel, aus der `seed` abgeleitet wurde.
   *  Ohne sie ist ein Eintrag nach einem Wurzel-Wechsel nicht mehr nachrechenbar (P1-Vertrag). */
  epoch_id: number;
  /** Herkunfts-Typ des Eintrags (siehe DiscoveryEntryType). */
  type: DiscoveryEntryType;
  /** Schema-Version der EINTRAGS-Struktur (unabhängig von der Codex-Speicher-Version). */
  schema_version: 2;
  /** Hash des Vorgängers — null beim Genesis-Eintrag. */
  prev_hash: string | null;
}

/** Eingabe zum Erzeugen eines Eintrags — abgeleitete Felder werden hier gesetzt. */
export interface DiscoveryInput {
  genome: Genome;
  parents: [string, string];
  /** Der private Zucht-Seed — wird NUR zur HMAC-Ableitung genutzt, verlässt die
   *  Entry-Bildung nie ins Share-Format. Gründer-Migration setzt ihn stattdessen direkt. */
  seed: number;
  generation: number;
  player_id: string;
  /** Logischer Zeitstempel (deterministisch, KEIN Date.now()). Caller muss liefern. */
  timestamp: number;
  /** Epoche des Fundes — default: die aktive (EPOCH_ID). */
  epoch_id?: number;
  /** Herkunfts-Typ — default: 'cross'. */
  type?: DiscoveryEntryType;
}

/** Stabile Serialisierung für den Entry-Hash (Feldreihenfolge fix). */
function entryPayload(e: Omit<DiscoveryEntry, 'entry_hash'>): string {
  return JSON.stringify({
    // ADDITIV-KONDITIONAL (D8-Muster, plan-discovery-chain.md §2): die neuen Felder hängen nur
    // an, wenn vorhanden — Epoche-0-Einträge alter Struktur hashen damit UNVERÄNDERT weiter,
    // neue Einträge tragen ihre Herkunft mit. Kein bestehender Hash bricht.
    genome_hash: e.genome_hash,
    parents: [...e.parents].sort(),
    // P2'-Verdichtung: genau EINE Seed-Form je Eintrag. Neue Einträge haben keinen
    // Klartext-Seed (privat), Gründer keinen HMAC (historisch) — beides wäre eine
    // zweite Wahrheit über dieselbe Herkunft.
    ...(e.plant_hmac !== undefined ? { plant_hmac: e.plant_hmac } : { seed: e.seed }),
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

/** Erzeugt einen neuen Chain-Eintrag verkettet an `prev` — mit Epoche, Typ und Schema (P2)
 *  und dem öffentlichen `plant_hmac` statt des Klartext-Seeds (P2'). */
export function createEntry(input: DiscoveryInput, prev: DiscoveryEntry | null): DiscoveryEntry {
  const genome_hash = hashGenome(input.genome);
  const timestamp = input.timestamp; // required, deterministic — no Date.now()
  const parents: [string, string] = [...input.parents].sort() as [string, string];
  const base: Omit<DiscoveryEntry, 'entry_hash'> = {
    genome_hash,
    parents,
    plant_hmac: plantHmacOf(input.seed, parents[0]!, parents[1]!, input.generation),
    generation: input.generation,
    player_id: input.player_id,
    timestamp,
    epoch_id: input.epoch_id ?? EPOCH_ID,
    type: input.type ?? 'cross',
    schema_version: 2,
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
    // P2'-Regel: genau EINE Seed-Form je Eintrag. Ein Eintrag mit BEIDEN wäre eine zweite
    // Wahrheit über dieselbe Herkunft; ein Eintrag mit KEINER hat keinen Identitäts-Beleg.
    if (e.plant_hmac !== undefined && e.seed !== undefined) {
      return { valid: false, reason: `both plant_hmac and seed at ${i}`, index: i };
    }
    if (e.plant_hmac === undefined && e.seed === undefined) {
      return { valid: false, reason: `neither plant_hmac nor seed at ${i}`, index: i };
    }
    if (e.plant_hmac !== undefined && !/^ph-[0-9a-f]{8}$/.test(e.plant_hmac)) {
      return { valid: false, reason: `plant_hmac malformed at ${i}`, index: i };
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
