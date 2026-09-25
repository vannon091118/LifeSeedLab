import { beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCommand } from '../bus/commands';
import {
  describeFirstFieldDeviation,
  hashOfRoot,
  makeRoot,
  resetFullTestState,
  testAttractorSpawn,
  testVectorDeposit,
  vectorFieldCellsOf,
  type VectorCellView,
} from '../testing/testkit';
import type { SimulationRoot } from './root';

const SEED = 2447771834;
const GOLDEN_FILE = fileURLToPath(new URL('../../tools/.tmp/vector_golden_hash.txt', import.meta.url));
const GOLDEN_IS_CI = process.env.CI === 'true'
  || process.env.GITHUB_ACTIONS === 'true'
  || process.env.GOLDEN_HASH !== undefined;
const GOLDEN_BOOTSTRAP = !GOLDEN_IS_CI && process.env.GOLDEN_BOOTSTRAP === '1';
const skipMissingLocalGolden = !existsSync(GOLDEN_FILE) && !GOLDEN_IS_CI && !GOLDEN_BOOTSTRAP;

function vectorRoot(): SimulationRoot {
  const root = makeRoot({ seed: SEED });
  root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
  root.stepOnce();
  return root;
}

function fieldOf(root: SimulationRoot): string {
  return JSON.stringify(vectorFieldCellsOf(root));
}

function anchorScene(root: SimulationRoot): void {
  testVectorDeposit(root, 4, 6, 'VECTOR_HEAT', 1.0);
  testVectorDeposit(root, 8, 6, 'VECTOR_HEAT', 1.0);
  testVectorDeposit(root, 6, 6, 'VECTOR_OIL', 1.0);
  testVectorDeposit(root, 6, 6, 'VECTOR_WET', 1.0);
  testAttractorSpawn(root, 6, 6, 1.0, 3, 180);
  for (let i = 0; i < 30; i++) root.stepOnce();
}

function goldenCellsFrom(raw: string): VectorCellView[] | null {
  const separator = raw.indexOf('\n');
  if (separator < 0) return null;
  const payload = raw.slice(separator + 1).trim();
  if (!payload) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('ANKER-FORMAT: v2-Feldprojektion ist kein gültiges JSON.');
  }
  const valid = Array.isArray(parsed) && parsed.every(cell => {
    if (!cell || typeof cell !== 'object') return false;
    const value = cell as Partial<VectorCellView>;
    return typeof value.key === 'string'
      && typeof value.vectorId === 'string'
      && Number.isFinite(value.intensity)
      && Number.isFinite(value.ttl);
  });
  if (!valid) throw new Error('ANKER-FORMAT: v2-Feldprojektion hat eine unvollständige Zelle.');
  return parsed as VectorCellView[];
}

beforeEach(() => {
  resetFullTestState();
});

describe('Vector-Determinismus — gleicher Seed, gleiche Deposits, gleiche Welt', () => {
  it('zwei frische Roots mit gleichem Seed liefern Feld UND State-Hash identisch', () => {
    const first = vectorRoot();
    anchorScene(first);
    const second = vectorRoot();
    anchorScene(second);
    expect(fieldOf(first)).toBe(fieldOf(second));
    expect(hashOfRoot(first)).toBe(hashOfRoot(second));
  });

  it('Deposit-Reihenfolge an verschiedenen Zellen ist gleichgültig', () => {
    const first = vectorRoot();
    testVectorDeposit(first, 2, 2, 'VECTOR_OIL', 1.0);
    testVectorDeposit(first, 9, 9, 'VECTOR_WET', 1.0);
    const second = vectorRoot();
    testVectorDeposit(second, 9, 9, 'VECTOR_WET', 1.0);
    testVectorDeposit(second, 2, 2, 'VECTOR_OIL', 1.0);
    for (let i = 0; i < 10; i++) {
      first.stepOnce();
      second.stepOnce();
    }
    expect(fieldOf(first)).toBe(fieldOf(second));
  });

  it.skipIf(skipMissingLocalGolden)('GOLDENER HASH: Szenario ist gegen den privaten Anker gepinnt', () => {
    const root = vectorRoot();
    anchorScene(root);
    const hash = hashOfRoot(root);
    const cells = vectorFieldCellsOf(root);
    if (!existsSync(GOLDEN_FILE)) {
      if (GOLDEN_BOOTSTRAP) {
        mkdirSync(dirname(GOLDEN_FILE), { recursive: true });
        writeFileSync(GOLDEN_FILE, `${hash}\n${JSON.stringify(cells)}`, 'utf8');
        return;
      }
      throw new Error('ANKER-FEHLT: tools/.tmp/vector_golden_hash.txt existiert nicht.');
    }
    const raw = readFileSync(GOLDEN_FILE, 'utf8').trim();
    const separator = raw.indexOf('\n');
    const goldenHash = (separator < 0 ? raw : raw.slice(0, separator)).trim();
    const goldenCells = goldenCellsFrom(raw);
    expect(goldenHash.length).toBeGreaterThan(0);
    if (hash !== goldenHash) {
      const diagnostic = goldenCells ? describeFirstFieldDeviation(cells, goldenCells) : '';
      throw new Error(`GOLDEN-HASH-DRIFT: ${diagnostic || 'Anker im alten Format (nur Hash).'}`);
    }
  });
});
