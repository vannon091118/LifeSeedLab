// Owner: HashSystem (core). LOC ≤ 300.
// Deterministic FNV-1a over the canonical gameplay state fields.
// Contract Phase 2.6: same seed + same commands = same hash.

import type { ClockState } from './clock';

export interface HashableState {
  seed: number;
  clock: ClockState;
  wave: { number: number };
  resources: { coins: number };
  plants: { id: string; gx: number; gy: number; hp: number; variantId: string; lastShot: number }[];
  enemies: { id: string; hp: number; px: number; py: number; pathIndex: number }[];
  projectiles: { id: string; px: number; py: number; dx: number; dy: number }[];
  score: number;
  combo: { count: number; multiplier: number; timer: number; highest: number };
}

/**
 * Canonical FNV-1a as 8-digit hex — the one shared implementation for all hash
 * identities (discovery genome/entry hashes). One hash core, one truth.
 */
export function fnv1aHex(input: string): string {
  return fnv1a(0x811c9dc5, input).toString(16).padStart(8, '0');
}

/** FNV-1a core (raw u32) — single implementation for all identity/mixing hashes. */
export function fnv1a(h0: number, str: string): number {
  let h = h0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const NUM = (n: number) => {
  // stable numeric formatting: integers exact, floats quantized to 1e-4
  const q = Math.round(n * 10000) / 10000;
  return Number.isInteger(q) ? String(q) : q.toFixed(4);
};

export function hashState(s: HashableState): string {
  let h = fnv1a(0x811c9dc5, `v1|seed:${s.seed}`);
  h = fnv1a(h, `tick:${NUM(s.clock.tick)}|phase:${s.clock.phase}|prog:${NUM(s.clock.phaseProgress)}|waveTime:${NUM(s.clock.waveTime)}`);
  h = fnv1a(h, `wave:${NUM(s.wave.number)}|score:${NUM(s.score)}`);
  h = fnv1a(h, `combo:${s.combo.count}|${NUM(s.combo.multiplier)}|${NUM(s.combo.timer)}|${NUM(s.combo.highest)}`);

  // canonical ordering: sort by id so insertion order never affects the hash
  const plants = [...s.plants].sort((a, b) => a.id.localeCompare(b.id));
  h = fnv1a(h, `plants:${plants.length}`);
  for (const p of plants) {
    h = fnv1a(h, `${p.id}|${p.variantId}|${NUM(p.gx)},${NUM(p.gy)}|hp:${NUM(p.hp)}|ls:${NUM(p.lastShot)}`);
  }

  const enemies = [...s.enemies].sort((a, b) => a.id.localeCompare(b.id));
  h = fnv1a(h, `enemies:${enemies.length}`);
  for (const e of enemies) {
    h = fnv1a(h, `${e.id}|hp:${NUM(e.hp)}|pos:${NUM(e.px)},${NUM(e.py)}|path:${NUM(e.pathIndex)}`);
  }

  const projs = [...s.projectiles].sort((a, b) => a.id.localeCompare(b.id));
  h = fnv1a(h, `projs:${projs.length}`);
  for (const p of projs) {
    h = fnv1a(h, `${p.id}|pos:${NUM(p.px)},${NUM(p.py)}|dir:${NUM(p.dx)},${NUM(p.dy)}`);
  }

  return (h >>> 0).toString(16).padStart(8, '0');
}
