// Owner: DiscoveryShare (public verification contract). LOC ≤ 220.
// Das öffentliche Format ist bewusst fünfteilig:
//   lifeseed:<runSeed>:<beleg>:<gen>:<sha256-genom-hash>
// `beleg` enthält den versionierten, URL-kodierten Elternkontext (IDs, Rollen, Genome).
// Dadurch kann ein Worker das Kind mit demselben Zuchtpfad nachrechnen. Der Hash beweist
// die Übereinstimmung, nicht die Echtheit einer Person — das bleibt eine lokale Prüfung.

import type { Genome, PlantParentSnapshot, PlantType } from '../types';
import { deriveChildGenome } from '../genome/gacha';
import { hashGenome, legacyGenomeHash, type DiscoveryEntry } from './chain';

export type ShareParentContext = [PlantParentSnapshot, PlantParentSnapshot];

export type ParsedShare =
  | { kind: 'run'; runSeed: number; parents: ShareParentContext; generation: number; genomeHash: string }
  | { kind: 'legacy'; plantRef: string; generation: number; genomeHash: string };

export type ShareResult =
  | { ok: true; parsed: Extract<ParsedShare, { kind: 'run' }>; genome: Genome; computedHash: string }
  | { ok: false; legacy: true; reason: string }
  | { ok: false; legacy: false; reason: string; computedHash?: string; genome?: Genome };

const CONTEXT_PREFIX = 'ctx1.';
const UINT32_MAX = 0xffffffff;

function quantizePower(power: number): number {
  return Math.round(power * 10000) / 10000;
}

function snapshotOf(parent: PlantParentSnapshot): PlantParentSnapshot {
  return {
    id: parent.id,
    type: parent.type,
    genome: parent.genome.map(gene => ({
      id: gene.id,
      power: quantizePower(gene.power),
      dominant: gene.dominant,
    })),
  };
}

function encodeContext(parents: ShareParentContext): string {
  const canonical = parents.map(snapshotOf);
  return `${CONTEXT_PREFIX}${encodeURIComponent(JSON.stringify(canonical))}`;
}

function parseUint(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${label} ist keine unsigned integer.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`${label} ist außerhalb des gültigen Bereichs.`);
  return number;
}

function parseContext(value: string): ShareParentContext {
  if (!value.startsWith(CONTEXT_PREFIX)) throw new Error('Unbekannter Beleg-Version.');
  const raw = decodeURIComponent(value.slice(CONTEXT_PREFIX.length));
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error('Beleg enthält nicht genau zwei Eltern.');
  const parents = parsed.map((entry): PlantParentSnapshot => {
    if (!entry || typeof entry !== 'object') throw new Error('Eltern-Snapshot ist ungültig.');
    const p = entry as Partial<PlantParentSnapshot>;
    if (typeof p.id !== 'string' || !['shooter', 'wall', 'support'].includes(p.type as PlantType)
      || !Array.isArray(p.genome) || p.genome.length === 0) {
      throw new Error('Eltern-Snapshot ist unvollständig.');
    }
    const genome = p.genome.map(gene => {
      if (!gene || typeof gene.id !== 'string' || !Number.isFinite(gene.power)
        || gene.power < 0 || gene.power > 1 || typeof gene.dominant !== 'boolean') {
        throw new Error('Genom-Snapshot ist ungültig.');
      }
      return { id: gene.id, power: quantizePower(gene.power), dominant: gene.dominant };
    });
    return { id: p.id, type: p.type as PlantType, genome };
  }) as ShareParentContext;
  return parents;
}

export function formatShareText(
  runSeed: number,
  parents: ShareParentContext,
  generation: number,
  genomeHash: string,
): string {
  if (!Number.isInteger(runSeed) || runSeed < 0 || runSeed > UINT32_MAX) throw new Error('Run-Seed ist ungültig.');
  if (!Number.isInteger(generation) || generation < 0) throw new Error('Generation ist ungültig.');
  if (!/^sha256-[0-9a-f]{64}$/.test(genomeHash)) throw new Error('Share-Hash ist kein SHA-256-Genom-Hash.');
  return `lifeseed:${runSeed}:${encodeContext(parents)}:${generation}:${genomeHash}`;
}

export function parseShare(text: string): ParsedShare {
  const parts = text.trim().split(':');
  if (parts[0] !== 'lifeseed') throw new Error('Unbekannter Share-Präfix.');
  if (parts.length === 5) {
    const runSeed = parseUint(parts[1]!, 'Run-Seed');
    if (runSeed > UINT32_MAX) throw new Error('Run-Seed ist außerhalb des gültigen Bereichs.');
    const generation = parseUint(parts[3]!, 'Generation');
    const genomeHash = parts[4]!;
    if (!/^sha256-[0-9a-f]{64}$/.test(genomeHash)) throw new Error('Share-Hash ist kein SHA-256-Genom-Hash.');
    return { kind: 'run', runSeed, parents: parseContext(parts[2]!), generation, genomeHash };
  }
  if (parts.length === 4) {
    const generation = parseUint(parts[2]!, 'Generation');
    if (!/^(hyb-[0-9a-f]{8}|sha256-[0-9a-f]{64})$/.test(parts[3]!)) throw new Error('Legacy-Hash ist ungültig.');
    return { kind: 'legacy', plantRef: parts[1]!, generation, genomeHash: parts[3]! };
  }
  throw new Error('Share hat nicht vier oder fünf Felder.');
}

export async function reconstructShare(text: string): Promise<ShareResult> {
  const parsed = parseShare(text);
  if (parsed.kind === 'legacy') {
    return { ok: false, legacy: true, reason: 'Legacy-Beleg enthält keinen Run-Seed und keine Elterngenome.' };
  }
  const genome = deriveChildGenome(parsed.parents[0], parsed.parents[1], parsed.generation, parsed.runSeed);
  const computedHash = await hashGenome(genome);
  if (computedHash !== parsed.genomeHash) {
    return { ok: false, legacy: false, reason: 'Der nachgerechnete Hash stimmt nicht überein.', computedHash, genome };
  }
  return { ok: true, parsed, genome, computedHash };
}

export function shareTextForEntry(entry: DiscoveryEntry): string {
  if (entry.schema_version === 4 && entry.run_seed !== undefined && entry.parent_context) {
    return formatShareText(entry.run_seed, entry.parent_context, entry.generation, entry.genome_hash);
  }
  return `lifeseed:${entry.plant_ref ?? `seed-${entry.seed ?? '?'}`}:${entry.generation}:${entry.genome_hash}`;
}

export type WorkerRequest = { type: 'reconstruct'; text: string };
export type WorkerResponse =
  | { type: 'result'; result: ShareResult }
  | { type: 'error'; reason: string };

/** Führt die Rekonstruktion im echten Browser-Worker aus; Vitest nutzt den direkten Pfad. */
export function reconstructShareInWorker(text: string): Promise<ShareResult> {
  if (typeof Worker === 'undefined') return reconstructShare(text);
  const worker = new Worker(new URL('./genomeWorker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const finish = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      finish();
      if (event.data.type === 'error') reject(new Error(event.data.reason));
      else resolve(event.data.result);
    };
    worker.onerror = event => {
      finish();
      reject(new Error(event.message || 'Der Codex-Worker ist fehlgeschlagen.'));
    };
    worker.postMessage({ type: 'reconstruct', text } satisfies WorkerRequest);
  });
}

export { legacyGenomeHash };
