// Owner: DiscoveryCodex (local-first). LOC ≤ 250.
// Persistiert die append-only Entdeckungskette und die Spieler-Identität.
// Neue Einträge sind run-scoped (Schema 4/SHA-256); alte Schema-3-Funde bleiben lesbar.

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
import { formatShareText, shareTextForEntry } from './share';
import type { Genome, PlantParentSnapshot } from '../types';

const CODEX_KEY = 'lifegamelab_codex';
const CODEX_VERSION = 3;
const PLAYER_KEY = 'lifegamelab_player_id';
const PLAYER_VERSION = 1;
const PLAYER_SEQ_KEY = 'lifegamelab_player_seq';

interface CodexSave {
  version: 3;
  chain: DiscoveryEntry[];
}

function generatePlayerId(): string {
  try {
    const g: unknown = globalThis as unknown;
    const cryptoObj = (g as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
    if (cryptoObj?.randomUUID) return `player_${cryptoObj.randomUUID().slice(0, 8)}`;
    if (cryptoObj?.getRandomValues) {
      const a = new Uint8Array(6);
      cryptoObj.getRandomValues(a);
      return `player_${Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {
    // Der Fallback ist nur eine Geräte-Identität, keine Spielwurzel.
  }
  let seq = 0;
  try {
    seq = Number(load<number>(PLAYER_SEQ_KEY, { version: 1, fallback: () => 0 })) || 0;
    save(PLAYER_SEQ_KEY, seq + 1, 1);
  } catch {
    // Persistenz der Identität ist best-effort.
  }
  const nav = (globalThis as { navigator?: { userAgent?: string; language?: string; platform?: string; hardwareConcurrency?: number } }).navigator;
  const fingerprint = [nav?.userAgent, nav?.language, nav?.platform, nav?.hardwareConcurrency].join('~');
  return `player_${fnv1aHex(fingerprint)}${seq.toString(36)}`;
}

export function getPlayerId(): string {
  const existing = load<string | null>(PLAYER_KEY, { version: PLAYER_VERSION, fallback: () => null });
  if (existing) return existing;
  const fresh = generatePlayerId();
  try { save(PLAYER_KEY, fresh, PLAYER_VERSION); } catch { /* best-effort */ }
  return fresh;
}

function defaultCodex(): CodexSave {
  return { version: CODEX_VERSION, chain: [] };
}

function migrateCodexSave(raw: unknown): CodexSave | null {
  const chain = (raw as { chain?: unknown } | null)?.chain;
  if (!Array.isArray(chain)) return null;
  return { version: CODEX_VERSION, chain: migrateToPlantRef(migrateV1Entries(chain as DiscoveryEntry[])) };
}

export function loadCodex(): DiscoveryEntry[] {
  const saveData = load<CodexSave>(CODEX_KEY, {
    version: CODEX_VERSION,
    migrate: migrateCodexSave,
    fallback: defaultCodex,
  });
  return saveData && Array.isArray(saveData.chain) ? saveData.chain : [];
}

function saveCodex(chain: DiscoveryEntry[]): void {
  save(CODEX_KEY, { version: CODEX_VERSION, chain } satisfies CodexSave, CODEX_VERSION);
}

interface AppendResult {
  entry: DiscoveryEntry | null;
  appended: boolean;
  reason?: string;
  chain: DiscoveryEntry[];
  genome_hash: string;
}

export interface AppendDiscoveryInput {
  genome: Genome;
  parentContext: [PlantParentSnapshot, PlantParentSnapshot];
  /** Privater Zucht-Seed; bleibt außerhalb von Entry und Share. */
  seed: number;
  generation: number;
  rootSeed: number;
  player_id?: string;
}

function logicalTimestamp(seed: number, generation: number): number {
  return generation * 1_000_000 + (seed % 1_000_000);
}

export async function appendDiscovery(input: AppendDiscoveryInput): Promise<AppendResult> {
  const chain = loadCodex();
  const playerId = input.player_id ?? getPlayerId();
  const genomeHash = await hashGenome(input.genome);
  if (chain.some(e => e.genome_hash === genomeHash)) {
    return { entry: null, appended: false, reason: 'duplicate genome_hash — first discovery wins', chain, genome_hash: genomeHash };
  }
  const parents: [string, string] = [input.parentContext[0].id, input.parentContext[1].id];
  const entry = await createEntry({
    genome: input.genome,
    parents,
    parentContext: input.parentContext,
    seed: input.seed,
    generation: input.generation,
    rootSeed: input.rootSeed,
    player_id: playerId,
    timestamp: logicalTimestamp(input.seed, input.generation),
  }, chain.length > 0 ? chain[chain.length - 1]! : null);
  const res = tryAppend(chain, entry);
  if (res.appended) {
    saveCodex(res.chain);
    // Fire-and-forget: Ein fehlender Online-Sync darf den lokalen Fund nicht zurückrollen.
    void syncEntryStub(entry);
    return { entry, appended: true, chain: res.chain, genome_hash: genomeHash };
  }
  return { entry: null, appended: false, reason: res.reason, chain, genome_hash: genomeHash };
}

export function verifyLocalChain(chain?: DiscoveryEntry[]): ReturnType<typeof verifyChain> {
  return verifyChain(chain ?? loadCodex());
}

/** Baut den fünfteiligen Share-Text und berechnet den SHA-256 erst am asyncen Rand. */
export async function seedShareText(
  runSeed: number,
  parentContext: [PlantParentSnapshot, PlantParentSnapshot],
  generation: number,
  genome: Genome,
): Promise<string> {
  return formatShareText(runSeed, parentContext, generation, await hashGenome(genome));
}

export { formatShareText, shareTextForEntry };
export { reconstructShare, reconstructShareInWorker, parseShare } from './share';
export type { DiscoveryEntry, Genome };
