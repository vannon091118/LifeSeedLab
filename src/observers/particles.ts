// Owner: ParticleSystemObserver. LOC ≤ 400.
// Pool-based: acquire/update/release. Burst seeds from event+entity+index (Phase 11.3).

import { makeRng } from '../core/rng';

export type ParticleKind = 'DOT' | 'SPARK' | 'SMOKE' | 'DUST' | 'GLOW' | 'RING' | 'SHARD' | 'BUBBLE' | 'SPORE' | 'LEAF';

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number; y: number;      // world coords (cells)
  vx: number; vy: number;    // cells per tick
  life: number; maxLife: number;
  size: number;
  rotation: number; vrotation: number;
  gravity: number;
  color: string;
  alpha: number;
}

export interface ParticleProfile {
  kind: ParticleKind;
  count: number;
  lifetime: number;          // ticks
  size: [number, number];    // min/max in cell units
  velocity: [number, number];
  gravity: number;
  rotationSpeed: number;
  alphaCurve: 'linear' | 'easeOut' | 'fadeInOut';
  spawnShape: 'point' | 'ring' | 'cone';
}

export const PARTICLE_PROFILES: Record<string, ParticleProfile> = {
  impact_ring: { kind: 'RING',    count: 8,  lifetime: 18, size: [0.08, 0.16], velocity: [0.02, 0.06], gravity: 0,     rotationSpeed: 0,   alphaCurve: 'easeOut',   spawnShape: 'ring' },
  death_pop:   { kind: 'SPARK',   count: 12, lifetime: 24, size: [0.06, 0.14], velocity: [0.04, 0.10], gravity: 0.004, rotationSpeed: 0.2, alphaCurve: 'linear',    spawnShape: 'ring' },
  dust_puff:   { kind: 'DUST',    count: 6,  lifetime: 20, size: [0.10, 0.20], velocity: [0.01, 0.03], gravity: -0.001,rotationSpeed: 0.1, alphaCurve: 'fadeInOut', spawnShape: 'point' },
  frost_mist:  { kind: 'SMOKE',   count: 8,  lifetime: 30, size: [0.08, 0.18], velocity: [0.01, 0.04], gravity: -0.002,rotationSpeed: 0.05, alphaCurve: 'fadeInOut', spawnShape: 'ring' },
  ember_burst: { kind: 'GLOW',    count: 10, lifetime: 22, size: [0.05, 0.12], velocity: [0.03, 0.09], gravity: -0.003,rotationSpeed: 0.3, alphaCurve: 'easeOut',   spawnShape: 'ring' },
  reward_flight:{ kind: 'GLOW',   count: 5,  lifetime: 26, size: [0.05, 0.10], velocity: [0.02, 0.05], gravity: -0.004,rotationSpeed: 0,   alphaCurve: 'easeOut',   spawnShape: 'point' },
};

// FX budget (Phase 11.4)
export type FxBudget = 'NORMAL' | 'BUSY' | 'CHAOS';
const BUDGET_CAPS: Record<FxBudget, number> = { NORMAL: 40, BUSY: 70, CHAOS: 100 };

export class ParticlePool {
  private pool: Particle[] = [];
  private free: Particle[] = [];
  private budget: FxBudget = 'NORMAL';

  setBudget(b: FxBudget): void {
    this.budget = b;
  }

  get cap(): number {
    return BUDGET_CAPS[this.budget];
  }

  get activeCount(): number {
    return this.pool.length - this.free.length;
  }

  private acquire(): Particle | null {
    const free = this.free.pop();
    if (free) return free;
    if (this.pool.length >= this.cap) return null; // budget exhausted
    const p: Particle = {
      active: true, kind: 'DOT', x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, size: 0.1, rotation: 0, vrotation: 0,
      gravity: 0, color: '#fff', alpha: 1,
    };
    this.pool.push(p);
    return p;
  }

  /** Spawn a burst deterministically from (eventSeed + particle index). */
  burst(profileKey: string, x: number, y: number, color: string, eventSeed: number, intensityScale = 1): void {
    const profile = PARTICLE_PROFILES[profileKey];
    if (!profile) return;

    const rng = makeRng('particle', (eventSeed | 0) >>> 0);
    const count = Math.max(1, Math.round(profile.count * intensityScale));

    // budget: ambient effects degrade first (Phase 11.4 order)
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return; // cap reached

      const angle = profile.spawnShape === 'ring'
        ? (i / count) * Math.PI * 2
        : rng.next() * Math.PI * 2;
      const speed = profile.velocity[0] + rng.next() * (profile.velocity[1] - profile.velocity[0]);
      const size = profile.size[0] + rng.next() * (profile.size[1] - profile.size[0]);

      p.kind = profile.kind;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = profile.lifetime;
      p.life = profile.lifetime;
      p.size = size;
      p.rotation = rng.next() * Math.PI * 2;
      p.vrotation = (rng.next() - 0.5) * profile.rotationSpeed;
      p.gravity = profile.gravity;
      p.color = color;
      p.alpha = 1;
      p.active = true;
    }
  }

  update(): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life--;
      if (p.life <= 0) { p.active = false; this.free.push(p); continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vrotation;
    }
  }

  /** Active particles for rendering. */
  forEachActive(fn: (p: Particle) => void): void {
    for (const p of this.pool) {
      if (p.active) fn(p);
    }
  }

  clear(): void {
    for (const p of this.pool) { p.active = false; this.free.push(p); }
  }
}
