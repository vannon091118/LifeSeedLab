// Owner: RngSystem (core). The ONLY RNG implementation. LOC ≤ 300.
// Contract: gameplay namespaces (world/wave/enemy/plant/loot) never share stream state
// with presentation namespaces (visual/particle/cosmetic).

export type RngNamespace =
  | 'world' | 'wave' | 'enemy' | 'plant' | 'loot'   // gameplay
  | 'visual' | 'particle' | 'cosmetic';              // presentation

export const GAMEPLAY_NAMESPACES: RngNamespace[] = ['world', 'wave', 'enemy', 'plant', 'loot'];
export const VISUAL_NAMESPACES: RngNamespace[] = ['visual', 'particle', 'cosmetic'];

function mulberry32(state: number): () => number {
  let s = state | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  readonly namespace: RngNamespace;
  private stream: () => number;
  private draws = 0;

  constructor(namespace: RngNamespace, seed: number) {
    this.namespace = namespace;
    this.stream = mulberry32(seed);
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.draws++;
    return this.stream();
  }

  nextFloat(): number {
    return this.next();
  }

  /** Uniform integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Uniform pick from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /** Weighted pick: entries with weight <= 0 are skipped. */
  pickWeighted<T>(arr: readonly T[], weightOf: (item: T) => number): T {
    let total = 0;
    for (const item of arr) total += Math.max(0, weightOf(item));
    let roll = this.next() * total;
    for (const item of arr) {
      roll -= Math.max(0, weightOf(item));
      if (roll <= 0) return item;
    }
    return arr[arr.length - 1];
  }

  /** Deterministic child stream for a sub-concern (per-entity bursts etc.). */
  fork(namespace: RngNamespace, salt: number | string): Rng {
    const childSeed = deriveSeed(rootSalt(this), namespace, 'fork', salt, 1);
    return new Rng(namespace, childSeed);
  }

  getDrawCount(): number {
    return this.draws;
  }
}

// Root salt binds a fork to its parent stream position deterministically.
function rootSalt(rng: Rng): number {
  return (rng.getDrawCount() * 0x9E3779B1) >>> 0;
}

// ── Seed derivation (Phase 2.3) ─────────────────────────────
// FNV-1a + mixing over structured parts. No Math.random anywhere.
export function deriveSeed(
  rootSeed: number,
  namespace: RngNamespace,
  entityId: string,
  eventId: number | string,
  version: number = 1
): number {
  let h = (rootSeed | 0) >>> 0;
  h = mix(h, 0x9E3779B9);                    // domain separator for seed derivation
  h = mixStr(h, namespace);
  h = mixStr(h, String(entityId));
  h = mix(h, typeof eventId === 'string' ? strHash(eventId) : eventId | 0);
  h = mix(h, version | 0);
  return h >>> 0;
}

export function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mix(h: number, v: number): number {
  h ^= Math.imul(v, 0x85EBCA6B) ^ (h >>> 13);
  return Math.imul(h, 0xC2B2AE35) >>> 0;
}

function mixStr(h: number, s: string): number {
  return mix(h, strHash(s));
}

export function makeRng(namespace: RngNamespace, seed: number): Rng {
  // Namespace-qualify the stream seed so identical numeric seeds in different
  // namespaces never produce correlated streams (contract Phase 2.2/2.3).
  const streamSeed = deriveSeed(seed | 0, namespace, 'stream', 0, 1);
  return new Rng(namespace, streamSeed);
}
