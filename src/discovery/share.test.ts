import { describe, expect, it } from 'vitest';
import { createBaseVariants } from '../genome/bases';
import { crossPair } from '../genome/gacha';
import type { PlantParentSnapshot } from '../types';
import { createEntry, verifyChain } from './chain';
import { formatShareText, parseShare, reconstructShare, reconstructShareInWorker } from './share';
import { seedShareText } from './codex';

const bases = createBaseVariants();
const runSeed = 0xdecafbad;
const parentA = bases[0]!;
const parentB = bases[1]!;
const context: [PlantParentSnapshot, PlantParentSnapshot] = [
  { id: parentA.id, type: parentA.type, genome: parentA.genome },
  { id: parentB.id, type: parentB.type, genome: parentB.genome },
];

describe('Lokaler Codex — öffentlicher Share-Vertrag', () => {
  it('formatiert fünf Felder und rechnet dasselbe Kind nach', async () => {
    const roll = crossPair(parentA, parentB, 3, runSeed);
    const share = await seedShareText(runSeed, context, 3, roll.child.genome);

    expect(share.split(':')).toHaveLength(5);
    expect(share.startsWith(`lifeseed:${runSeed}:`)).toBe(true);
    const parsed = parseShare(share);
    expect(parsed.kind).toBe('run');
    if (parsed.kind !== 'run') throw new Error(' parsed run share expected');
    expect(parsed.runSeed).toBe(runSeed);
    expect(parsed.parents[0].id).toBe(parentA.id);

    const rebuilt = await reconstructShare(share);
    expect(rebuilt.ok).toBe(true);
    if (rebuilt.ok) expect(rebuilt.genome).toEqual(roll.child.genome);
  });

  it('erkennt einen veränderten Hash', async () => {
    const roll = crossPair(parentA, parentB, 4, runSeed);
    const parts = (await seedShareText(runSeed, context, 4, roll.child.genome)).split(':');
    const hash = parts[parts.length - 1]!;
    const tampered = hash.slice(0, -1) + (hash.endsWith('0') ? '1' : '0');
    const share = formatShareText(runSeed, context, 4, tampered);
    const result = await reconstructShare(share);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Hash/);
  });

  it('lässt das alte vierteilige Format lesbar, aber nicht rekonstruierbar', async () => {
    const parsed = parseShare('lifeseed:pr-1234abcd:2:hyb-12345678');
    expect(parsed.kind).toBe('legacy');
    const result = await reconstructShare('lifeseed:pr-1234abcd:2:hyb-12345678');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.legacy).toBe(true);
  });

  it('legt neue Run-Einträge als Schema 4 mit SHA-256 und Elternkontext ab', async () => {
    const roll = crossPair(parentA, parentB, 5, runSeed);
    const entry = await createEntry({
      genome: roll.child.genome,
      parents: [parentA.id, parentB.id],
      parentContext: context,
      seed: 123,
      generation: 5,
      rootSeed: runSeed,
      player_id: 'local-test',
      timestamp: 99,
    }, null);
    expect(entry.schema_version).toBe(4);
    expect(entry.genome_hash).toMatch(/^sha256-[0-9a-f]{64}$/);
    expect(entry.run_seed).toBe(runSeed);
    expect(entry.parent_context?.[0].id).toBe(parentA.id);
    expect(verifyChain([entry])).toEqual({ valid: true });
  });

  it('nutzt im Browser den Worker und im Test den direkten Fallback', async () => {
    const roll = crossPair(parentA, parentB, 6, runSeed);
    const share = await seedShareText(runSeed, context, 6, roll.child.genome);
    const result = await reconstructShareInWorker(share);
    expect(result.ok).toBe(true);
  });
});
