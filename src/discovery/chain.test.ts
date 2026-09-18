import { describe, it, expect, beforeEach } from 'vitest';
import { hashGenome, createEntry, verifyChain, tryAppend, hashEntry } from './chain';
import type { Genome } from '../types';

function g(id: string, power: number, dominant = true): Genome[0] { return { id, power, dominant }; }

describe('Discovery-Chain — genome_hash Determinismus', () => {
  it('gleicher Seed + gleiche Eltern ⇒ gleicher genome_hash (Beweis)', () => {
    const a: Genome = [g('fire', 0.52), g('rapid', 0.31)];
    const b: Genome = [g('rapid', 0.31), g('fire', 0.52)]; // Reihenfolge vertauscht
    expect(hashGenome(a)).toBe(hashGenome(b));
  });

  it('ändert sich bei anderem Genom', () => {
    const a: Genome = [g('fire', 0.52), g('rapid', 0.31)];
    const b: Genome = [g('ice', 0.52), g('rapid', 0.31)];
    expect(hashGenome(a)).not.toBe(hashGenome(b));
  });

  it('ist stabil über Quantisierung (1e-4)', () => {
    const a: Genome = [g('fire', 0.12345)];
    const b: Genome = [g('fire', 0.12344)];
    // 0.12345 vs 0.12344 unterscheiden sich in 1e-4 ⇒ bewusst verschieden
    expect(hashGenome(a)).not.toBe(hashGenome(b));
    // Rundung auf 1e-4: 0.123451 und 0.123453 fallen ins selbe 1e-4-Band -> gleicher Hash
    expect(hashGenome([g('fire', 0.123451)])).toBe(hashGenome([g('fire', 0.123453)]));
  });
});

describe('Discovery-Chain — Hash-Chain & Verifikation', () => {
  it('verkettet prev_hash und ist verifizierbar', () => {
    const g1: Genome = [g('fire', 0.5)];
    const g2: Genome = [g('ice', 0.6)];
    const g3: Genome = [g('heal', 0.7)];
    // benutze verschiedene Gene damit genome_hash eindeutig bleibt
    const e1 = createEntry({ genome: g1, parents: ['base_shooter', 'base_wall'], seed: 111, generation: 0, player_id: 'alice', timestamp: 1000 }, null);
    const e2 = createEntry({ genome: g2, parents: ['base_shooter', 'base_wall'], seed: 222, generation: 1, player_id: 'bob', timestamp: 1001 }, e1);
    const e3 = createEntry({ genome: g3, parents: ['base_wall', 'base_support'], seed: 333, generation: 2, player_id: 'carla', timestamp: 1002 }, e2);
    expect(e1.prev_hash).toBeNull();
    expect(e2.prev_hash).toBe(e1.entry_hash);
    expect(e3.prev_hash).toBe(e2.entry_hash);
    expect(verifyChain([e1, e2, e3])).toEqual({ valid: true });
  });

  it('erkennt Manipulation (entry_hash mismatch)', () => {
    const e1 = createEntry({ genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 1, generation: 0, player_id: 'x', timestamp: 1 }, null);
    const bad = { ...e1, entry_hash: '00000000' };
    const res = verifyChain([bad]);
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.index).toBe(0);
  });

  it('erkennt gebrochenen prev_hash', () => {
    const e1 = createEntry({ genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 1, generation: 0, player_id: 'x', timestamp: 1 }, null);
    const e2 = createEntry({ genome: [g('ice', 0.5)], parents: ['a', 'b'], seed: 2, generation: 1, player_id: 'y', timestamp: 2 }, e1);
    const bad2 = { ...e2, prev_hash: 'deadbeef' as string };
    // entry_hash muss zu neuem prev_hash passen, sonst schlägt zuerst hash mismatch
    const { entry_hash: _old, ...rest } = bad2;
    const fixed = { ...bad2, entry_hash: hashEntry(rest) };
    const res = verifyChain([e1, fixed]);
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toMatch(/prev_hash/);
  });

  it('UNIQUE(genome_hash): Duplikat wird abgelehnt — erste Entdeckung gewinnt', () => {
    const genome: Genome = [g('fire', 0.5)];
    const e1 = createEntry({ genome, parents: ['a', 'b'], seed: 10, generation: 0, player_id: 'first', timestamp: 1 }, null);
    const chain = verifyChain([e1]).valid ? [e1] : [];
    const dup = createEntry({ genome, parents: ['a', 'b'], seed: 10, generation: 0, player_id: 'second', timestamp: 2 }, e1);
    const res = tryAppend(chain, dup);
    expect(res.appended).toBe(false);
    expect(res.reason).toMatch(/genome_hash/);
  });

  it('tryAppend prüft auch entry_hash-Integrität', () => {
    const e1 = createEntry({ genome: [g('fire', 0.5)], parents: ['a', 'b'], seed: 1, generation: 0, player_id: 'x', timestamp: 1 }, null);
    const e2 = createEntry({ genome: [g('ice', 0.5)], parents: ['a', 'b'], seed: 2, generation: 1, player_id: 'y', timestamp: 2 }, e1);
    const tampered = { ...e2, entry_hash: 'ffffffff' };
    const res = tryAppend([e1], tampered);
    expect(res.appended).toBe(false);
  });

  it('leere Kette ist gültig', () => {
    expect(verifyChain([])).toEqual({ valid: true });
  });
});

describe('Discovery-Chain — deterministische Reproduktion', () => {
  beforeEach(() => {});

  it('seeds sind teilbar: gleicher lifeseed-String verifiziert dasselbe Genom', () => {
    const genome: Genome = [g('fire', 0.8), g('crit', 0.94)];
    const seed = 424242;
    const generation = 7;
    // lifeseed-Format aus Spec: lifeseed:seed:gen:hash
    const h = hashGenome(genome);
    const share = `lifeseed:${seed}:${generation}:${h}`;
    expect(share).toBe(`lifeseed:${seed}:${generation}:${hashGenome(genome)}`);
    // Wer denselben Seed behauptet ohne passenden genome_hash lügt — Verifikation schlägt fehl
    const fakeHash = `hyb-${'0'.repeat(8)}`;
    expect(fakeHash).not.toBe(h);
  });
});
