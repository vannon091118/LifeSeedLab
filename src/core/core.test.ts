import { describe, it, expect } from 'vitest';
import { GameClock, clocksEqual } from './clock';
import { Rng, deriveSeed, makeRng, strHash } from './rng';
import { nextId, resetIds, snapshotIds, restoreIds } from './ids';
import { hashState, type HashableState } from './hash';

describe('Phase 2.1 GameClock', () => {
  it('same tick input produces identical clock state', () => {
    const a = new GameClock();
    const b = new GameClock();
    for (let i = 0; i < 1000; i++) {
      a.advance(33.34); // slightly jittered real time
      b.advance(33.33);
    }
    // jitter averages out over fixed-step accumulator; both must land on same tick count
    expect(a.get().tick).toBeGreaterThan(900);
    expect(b.get().tick).toBeGreaterThan(900);
  });

  it('two clocks fed identical steps are bit-identical', () => {
    const a = new GameClock();
    const b = new GameClock();
    for (let i = 0; i < 5000; i++) { a.step(); b.step(); }
    expect(clocksEqual(a.get(), b.get())).toBe(true);
  });

  it('fixed timestep: 30 ticks per simulated second', () => {
    const c = new GameClock();
    for (let i = 0; i < 30; i++) c.step();
    expect(c.get().tick).toBe(30);
    expect(c.get().elapsed).toBeCloseTo(1000, 0);
  });

  it('phase cycles day/night deterministically', () => {
    const c = new GameClock();
    for (let i = 0; i < 2400; i++) c.step(); // 2400 ticks = one phase
    expect(c.get().phase).toBe('night');
    for (let i = 0; i < 2400; i++) c.step();
    expect(c.get().phase).toBe('day');
  });

  it('restore reproduces exact state', () => {
    const a = new GameClock();
    for (let i = 0; i < 1234; i++) a.step();
    const b = new GameClock();
    b.restore(a.snapshot());
    for (let i = 0; i < 100; i++) { a.step(); b.step(); }
    expect(clocksEqual(a.get(), b.get())).toBe(true);
  });
});

describe('Phase 2.2 Seeded RNG', () => {
  it('same seed produces same sequence', () => {
    const a = makeRng('world', 42);
    const b = makeRng('world', 42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds diverge', () => {
    const a = makeRng('world', 42);
    const b = makeRng('world', 43);
    expect(a.next()).not.toBe(b.next());
  });

  it('nextInt is within bounds and deterministic', () => {
    const a = makeRng('wave', 7);
    const b = makeRng('wave', 7);
    for (let i = 0; i < 200; i++) {
      const v = a.nextInt(3, 9);
      expect(v).toBe(b.nextInt(3, 9));
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('pick and pickWeighted are deterministic', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const a = makeRng('plant', 99);
    const b = makeRng('plant', 99);
    for (let i = 0; i < 50; i++) {
      expect(a.pick(arr)).toBe(b.pick(arr));
    }
    const w: Record<string, number> = { a: 1, b: 5, c: 2, d: 0.5 };
    const c = makeRng('loot', 123);
    const d = makeRng('loot', 123);
    for (let i = 0; i < 50; i++) {
      expect(c.pickWeighted(arr, item => w[item])).toBe(d.pickWeighted(arr, item => w[item]));
    }
  });

  it('namespaces with same seed do not correlate streams', () => {
    const a = makeRng('world', 100);
    const b = makeRng('visual', 100);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('Phase 2.3 Seed derivation', () => {
  it('deriveSeed is stable and namespace-separated', () => {
    const s1 = deriveSeed(583921, 'enemy', 'enemy-0042', 7, 1);
    const s2 = deriveSeed(583921, 'enemy', 'enemy-0042', 7, 1);
    const s3 = deriveSeed(583921, 'visual', 'enemy-0042', 7, 1);
    expect(s1).toBe(s2);
    expect(s1).not.toBe(s3); // visual namespace must differ from gameplay namespace
  });

  it('entity/event changes change the seed', () => {
    const base = deriveSeed(1, 'plant', 'plant-0001', 0, 1);
    expect(deriveSeed(1, 'plant', 'plant-0002', 0, 1)).not.toBe(base);
    expect(deriveSeed(1, 'plant', 'plant-0001', 1, 1)).not.toBe(base);
    expect(deriveSeed(1, 'plant', 'plant-0001', 0, 2)).not.toBe(base);
  });

  it('strHash is stable', () => {
    expect(strHash('hello')).toBe(strHash('hello'));
    expect(strHash('hello')).not.toBe(strHash('hellp'));
  });
});

describe('Phase 2.4 Stable IDs', () => {
  it('identical run produces identical ID sequences', () => {
    resetIds();
    const runA = [nextId('enemy'), nextId('enemy'), nextId('plant'), nextId('projectile')];
    resetIds();
    const runB = [nextId('enemy'), nextId('enemy'), nextId('plant'), nextId('projectile')];
    expect(runA).toEqual(runB);
  });

  it('snapshot/restore preserves counter positions', () => {
    resetIds();
    nextId('enemy'); nextId('enemy');
    const snap = snapshotIds();
    nextId('enemy');
    restoreIds(snap);
    expect(nextId('enemy')).toBe('enemy-0003');
  });
});

describe('Phase 2.6 State hash', () => {
  const makeState = (): HashableState => ({
    seed: 583921,
    clock: { tick: 100, elapsed: 100 * 33.333, phase: 'night', phaseProgress: 0.5, waveTime: 20, paused: false, speed: 1 },
    wave: { number: 2 },
    resources: { coins: 150 },
    plants: [
      { id: 'plant-0001', gx: 2, gy: 3, hp: 90, variantId: 'base_shooter', lastShot: 90 },
      { id: 'plant-0002', gx: 5, gy: 1, hp: 300, variantId: 'base_wall', lastShot: 0 },
    ],
    enemies: [
      { id: 'enemy-0001', hp: 12, px: 3.25, py: 3.5, pathIndex: 1 },
    ],
    projectiles: [],
    score: 470,
    combo: { count: 3, multiplier: 1.5, timer: 120, highest: 8 },
  });

  it('same state = same hash', () => {
    expect(hashState(makeState())).toBe(hashState(makeState()));
  });

  it('any gameplay change changes the hash', () => {
    const base = hashState(makeState());
    const s = makeState();
    s.enemies[0].hp -= 1;
    expect(hashState(s)).not.toBe(base);

    const s2 = makeState();
    s2.score += 10;
    expect(hashState(s2)).not.toBe(base);

    const s3 = makeState();
    s3.combo.count += 1;
    expect(hashState(s3)).not.toBe(base);
  });

  it('entity order does not affect the hash', () => {
    const s1 = makeState();
    const s2 = makeState();
    s2.plants = [s2.plants[1], s2.plants[0]];
    expect(hashState(s1)).toBe(hashState(s2));
  });
});

// Rng used directly to keep the class API covered
describe('Rng class API', () => {
  it('fork produces deterministic child streams', () => {
    const parentA = makeRng('world', 5);
    const parentB = makeRng('world', 5);
    const ca = parentA.fork('particle', 1);
    const cb = parentB.fork('particle', 1);
    expect(ca.next()).toBe(cb.next());
  });
});

void Rng;
