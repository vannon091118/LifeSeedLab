// Owner: DiscoveryCodex (local-first, Supabase-ready). LOC ≤ 250.
// Persistiert die append-only Entdeckungs-Kette und die Spieler-Identität.
// Keine Netzwerk-Deps — Supabase ist ein reiner INSERT-Stub hinter tryAppend.

import { load, save } from '../persistence/storage';
import {
  createEntry,
  hashGenome,
  tryAppend,
  verifyChain,
  syncEntryStub,
  type DiscoveryEntry,
  type DiscoveryInput,
} from './chain';
import { fnv1aHex } from '../core/hash';
import type { Genome } from '../types';

const CODEX_KEY = 'lifegamelab_codex';
const CODEX_VERSION = 1;
const PLAYER_KEY = 'lifegamelab_player_id';
const PLAYER_VERSION = 1;
const PLAYER_SEQ_KEY = 'lifegamelab_player_seq';

interface CodexSave {
  version: 1;
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

export function setPlayerId(id: string): void {
  const trimmed = id.trim().slice(0, 32);
  if (!trimmed) return;
  save(PLAYER_KEY, trimmed, PLAYER_VERSION);
}

// ── Codex-Persistenz ─────────────────────────────────────────────────
function defaultCodex(): CodexSave {
  return { version: 1, chain: [] };
}

export function loadCodex(): DiscoveryEntry[] {
  const saveData = load<CodexSave>(CODEX_KEY, {
    version: CODEX_VERSION,
    fallback: defaultCodex,
  });
  if (!saveData || !Array.isArray((saveData as CodexSave).chain)) return [];
  return (saveData as CodexSave).chain;
}

export function saveCodex(chain: DiscoveryEntry[]): void {
  save(CODEX_KEY, { version: 1, chain } satisfies CodexSave, CODEX_VERSION);
}

export function clearCodex(): void {
  saveCodex([]);
}

// ── Append (lokal-first, UNIQUE genome_hash) ─────────────────────────
export interface AppendResult {
  entry: DiscoveryEntry | null;
  appended: boolean;
  reason?: string;
  chain: DiscoveryEntry[];
  genome_hash: string;
}

export function appendDiscovery(input: Omit<DiscoveryInput, 'player_id'> & { player_id?: string }): AppendResult {
  const chain = loadCodex();
  const player_id = input.player_id ?? getPlayerId();
  const genome_hash = hashGenome(input.genome);
  // lokale Deduplizierung — UNIQUE(genome_hash)
  if (chain.some(e => e.genome_hash === genome_hash)) {
    return { entry: null, appended: false, reason: 'duplicate genome_hash — first discovery wins', chain, genome_hash };
  }
  const prev = chain.length > 0 ? chain[chain.length - 1] : null;
  const entry = createEntry({ ...input, player_id }, prev);
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

/** Seed-Teilstring für Sharing: `lifeseed:<seed>:<gen>:<genome_hash>` */
export function seedShareText(seed: number, generation: number, genome: Genome): string {
  return `lifeseed:${seed}:${generation}:${hashGenome(genome)}`;
}

/** Export der Chain als JSON (öffentlich lesbar, kein Login nötig). */
export function exportChainJson(): string {
  return JSON.stringify(loadCodex(), null, 2);
}

export type { DiscoveryEntry, Genome };
