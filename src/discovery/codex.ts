// Owner: DiscoveryCodex (local-first, Supabase-ready). LOC ≤ 250.
// Persistiert die append-only Entdeckungs-Kette und die Spieler-Identität.
// Keine Netzwerk-Deps — Supabase ist ein reiner INSERT-Stub hinter tryAppend.

import { load, save } from '../persistence/storage';
import { migrateToPlantRef, migrateV1Entries } from './codex_migration';
import {
  createEntry,
  hashGenome,
  tryAppend,
  verifyChain,
  syncEntryStub,
  type DiscoveryEntry,
} from './chain';
import { fnv1aHex } from '../core/hash';
import type { Genome } from '../types';

const CODEX_KEY = 'lifegamelab_codex';
// v3 (Befund 20.09.2026): Feld `plant_hmac` → `plant_ref`. Die Nummer steigt, weil der
// Feldname im gehashten Payload steht — alte Ketten werden beim Laden EINMAL neu verkettet.
const CODEX_VERSION = 3;
const PLAYER_KEY = 'lifegamelab_player_id';
const PLAYER_VERSION = 1;
const PLAYER_SEQ_KEY = 'lifegamelab_player_seq';

interface CodexSave {
  version: 3;
  chain: DiscoveryEntry[];
}

// ── Spieler-Identität (organisch sichtbar, kein Prestige-System) ─────
function generatePlayerId(): string {
  try {
    const g: unknown = globalThis as unknown;
    const cryptoObj = (g as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
    if (cryptoObj?.randomUUID) {
      return `player_${cryptoObj.randomUUID().slice(0, 8)}`;
    }
    if (cryptoObj?.getRandomValues) {
      const a = new Uint8Array(6);
      cryptoObj.getRandomValues(a);
      return `player_${Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {
    // ignore
  }
  // Fallback ohne Web-Crypto: Geräte-Fingerabdruck + persistenter Zähler — bewusst ohne
  // Uhr- oder Zufallsquelle (die Gate-Regel verbietet beides dateiweit) und damit ohne
  // Zeitabhängigkeit für die Identität. Der Zähler hält neue Identitäten auf demselben
  // Gerät eindeutig, der Fingerabdruck unterscheidet Geräte.
  let seq = 0;
  try {
    seq = Number(load<number>(PLAYER_SEQ_KEY, { version: 1, fallback: () => 0 })) || 0;
    save(PLAYER_SEQ_KEY, seq + 1, 1);
  } catch {
    // ignore — Persistenz der Identität ist best-effort
  }
  const nav = (globalThis as { navigator?: { userAgent?: string; language?: string; platform?: string; hardwareConcurrency?: number } }).navigator;
  const fingerprint = [nav?.userAgent, nav?.language, nav?.platform, nav?.hardwareConcurrency].join('~');
  return `player_${fnv1aHex(fingerprint)}${seq.toString(36)}`;
}

export function getPlayerId(): string {
  const existing = load<string | null>(PLAYER_KEY, {
    version: PLAYER_VERSION,
    fallback: () => null,
  });
  if (existing) return existing;
  const fresh = generatePlayerId();
  try {
    save(PLAYER_KEY, fresh, PLAYER_VERSION);
  } catch {
    // ignore — persist best-effort
  }
  return fresh;
}

// ── Codex-Persistenz ─────────────────────────────────────────────────
function defaultCodex(): CodexSave {
  return { version: 3, chain: [] };
}

/**
 * Wanderkette des CODEX-Speicherstands.
 *
 * Der Speicher-Owner (`persistence/storage.ts`) ruft sie bei `env.v < CODEX_VERSION` auf und
 * schreibt das Ergebnis unter der neuen Version zurück. Sie MUSS übergeben werden: ohne
 * `migrate` liefert `resolveVersion` den Fallback — eine leere Kette bei einem Bestandssave.
 * Genau das war bis v2 der Fall (die Funktion `migrateV1Entries` existierte, wurde aber nie
 * aufgerufen; ältere Ketten verschwanden still). Beide Schritte sind idempotent, deshalb
 * laufen sie unbedingt — nicht abhängig davon, welche Version die Hülle behauptet:
 *   v1 → v2: Gründer-Einträge anreichern (epoch_id/type/schema_version).
 *   v2 → v3: `plant_hmac` → `plant_ref` (Neuverkettung — der Feldname steckt im Hash).
 */
function migrateCodexSave(raw: unknown): CodexSave | null {
  const chain = (raw as { chain?: unknown } | null)?.chain;
  if (!Array.isArray(chain)) return null; // unbrauchbar ⇒ Quarantäne statt stiller Leerstand
  return { version: 3, chain: migrateToPlantRef(migrateV1Entries(chain as DiscoveryEntry[])) };
}

/** Lädt die Kette in der AKTUELLEN Struktur (v3); ältere Stände wandern durch `migrateCodexSave`. */
export function loadCodex(): DiscoveryEntry[] {
  const saveData = load<CodexSave>(CODEX_KEY, {
    version: CODEX_VERSION,
    migrate: migrateCodexSave,
    fallback: defaultCodex,
  });
  if (!saveData || !Array.isArray(saveData.chain)) return [];
  return saveData.chain;
}

function saveCodex(chain: DiscoveryEntry[]): void {
  save(CODEX_KEY, { version: 3, chain } satisfies CodexSave, CODEX_VERSION);
}

// ── Append (lokal-first, UNIQUE genome_hash) ─────────────────────────
interface AppendResult {
  entry: DiscoveryEntry | null;
  appended: boolean;
  reason?: string;
  chain: DiscoveryEntry[];
  genome_hash: string;
}

/** Input für appendDiscovery — timestamp wird intern deterministisch erzeugt. */
interface AppendDiscoveryInput {
  genome: Genome;
  parents: [string, string];
  /** Der PRIVATE Zucht-Seed — fließt nur in den logischen Zeitstempel und die
   *  Referenz-Ableitung ein, taucht NIE im Entry/Share-Format auf (P2'). */
  seed: number;
  generation: number;
  player_id?: string;
}

/**
 * Deterministischer Zeitstempel für Discovery-Einträge.
 * Nutzt (generation * 1_000_000) + (seed % 1_000_000) — reproduzierbar ohne Uhr.
 * Der Seed bleibt intern: er identifiziert das Ereignis, wird aber NICHT im Entry
 * geteilt (P2' — dort steht die öffentliche plant_ref).
 */
function logicalTimestamp(seed: number, generation: number): number {
  return generation * 1_000_000 + (seed % 1_000_000);
}

export function appendDiscovery(input: AppendDiscoveryInput): AppendResult {
  const chain = loadCodex();
  const player_id = input.player_id ?? getPlayerId();
  const genome_hash = hashGenome(input.genome);
  // lokale Deduplizierung — UNIQUE(genome_hash)
  if (chain.some(e => e.genome_hash === genome_hash)) {
    return { entry: null, appended: false, reason: 'duplicate genome_hash — first discovery wins', chain, genome_hash };
  }
  const prev = chain.length > 0 ? chain[chain.length - 1] : null;
  const timestamp = logicalTimestamp(input.seed, input.generation);
  const entry = createEntry({ ...input, player_id, timestamp }, prev);
  const res = tryAppend(chain, entry);
  if (res.appended) {
    saveCodex(res.chain);
    // fire-and-forget sync — lokal ist bereits autoritativ
    void syncEntryStub(entry).then(r => {
      if (r.remoteRejectedAsDuplicate) {
        // remote hat bereits einen anderen Erstentdecker — lokal bleibt bestehen,
        // UI kann Hinweis zeigen; kein Rollback nötig (lokal-first)
      }
    });
    return { entry, appended: true, chain: res.chain, genome_hash };
  }
  return { entry: null, appended: false, reason: res.reason, chain, genome_hash };
}

// ── Verifikation & Sharing ───────────────────────────────────────────
/**
 * Verifikation der lokalen Chain. Nimmt die Chain optional entgegen, damit Aufrufer mit
 * eigener Momentaufnahme (z. B. Codex-Screen) genau dann neu rechnen, wenn SICH verändert
 * hat — sonst liest die Funktion selbst aus dem Store.
 */
export function verifyLocalChain(chain?: DiscoveryEntry[]): ReturnType<typeof verifyChain> {
  return verifyChain(chain ?? loadCodex());
}

/** Share-Format (P2'): `lifeseed:<plant_ref>:<gen>:<genome_hash>` — der öffentliche
 *  Beleg statt des Klartext-Seeds. Der Empfänger kann die Pflanze IM CODEX wiederfinden,
 *  aber die Zuchtableitung nicht nachrechnen (Plan §1.2). */
export function seedShareText(plantRef: string, generation: number, genome: Genome): string {
  return `lifeseed:${plantRef}:${generation}:${hashGenome(genome)}`;
}

export type { DiscoveryEntry, Genome };
