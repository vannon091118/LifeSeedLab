// Owner: ProjectileSystem (projectiles slice). LOC ≤ 300.
// Gameplay only. Fires projectiles, integrates motion, detects hits,
// delegates damage application to EnemySystem via callback (no direct writes).

import type { SimState, ProjectileEntity, EnemyEntity } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { dist } from '../config/world.source';
import { nextId } from '../core/ids';
import { makeRng } from '../core/rng';

const HIT_RADIUS = 0.4;
const OFFSCREEN = -999;

export class ProjectileSystem {
  private seq = 0;

  constructor(
    private emit: (e: GameEvent) => void,
    private applyDamage: (state: SimState, enemyId: string, amount: number, critical: boolean, effectId: string | null, sourcePlantId: string | null) => { died: boolean }
  ) {}

  /** Spawn a projectile from a plant toward an enemy (root wiring). */
  fire(
    state: SimState,
    plant: PlantEntityRef,
    target: EnemyEntity,
    damage: number,
    pierce: number,
    effectId: string | null = null,
    critChance = 0
  ): ProjectileEntity {
    const dx = target.px - (plant.gx + 0.5);
    const dy = target.py - (plant.gy + 0.5);
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    const p: ProjectileEntity = {
      id: nextId('projectile'),
      px: plant.gx + 0.5,
      py: plant.gy + 0.5,
      dx: dx / d,
      dy: dy / d,
      speed: 0.15,
      damage,
      remainingPierce: pierce,
      plantId: plant.id,
      effectId,
    };
    state.projectiles.push(p);

    this.emit(makeEvent(state.clock.tick, 'PROJECTILE_FIRED', p.id, ++this.seq, {
      projectileId: p.id, plantId: plant.id, targetId: target.id, damage, effectId,
    }));
    void critChance; // crit rolls at hit time, deterministic per (seed, tick, projectile)
    return p;
  }

  /** Integrate motion + hit detection for one tick. */
  update(state: SimState): void {
    for (const p of state.projectiles) {
      p.px += p.dx * p.speed;
      p.py += p.dy * p.speed;

      for (const e of state.enemies) {
        if (e.hp <= 0) continue; // no double rewards
        if (dist(p.px, p.py, e.px, e.py) < HIT_RADIUS) {
          // deterministic crit roll per (seed, tick, projectile id) — no stream state
          const crit = p.effectId === 'EFFECT_CRIT'
            ? makeRng('enemy', (state.seed ^ Math.imul(state.clock.tick, 0x51ED) ^ Math.imul(p.id.charCodeAt(p.id.length - 1), 0x2701)) >>> 0).next() < 0.2
            : false;
          const dmg = crit ? Math.round(p.damage * 2) : p.damage;

          const res = this.applyDamage(state, e.id, dmg, crit, p.effectId, p.plantId);

          this.emit(makeEvent(state.clock.tick, 'PROJECTILE_HIT', p.id, ++this.seq, {
            projectileId: p.id, enemyId: e.id, damage: dmg, critical: crit,
            px: p.px, py: p.py, effectId: p.effectId,
          }));
          if (crit) {
            this.emit(makeEvent(state.clock.tick, 'CRITICAL_HIT', e.id, ++this.seq, {
              enemyId: e.id, amount: dmg, px: e.px, py: e.py,
            }));
          }

          if (p.remainingPierce > 0) {
            p.remainingPierce--;
          } else {
            p.px = OFFSCREEN; // mark for removal
          }
          if (res.died) break;
          break;
        }
      }
    }

    state.enemies = state.enemies.filter(e => e.hp > 0);
    state.projectiles = state.projectiles.filter(p => p.px > -100);
  }

  /** Remove projectiles referencing dead plants (plant removal). */
  removeForPlant(state: SimState, plantId: string): void {
    state.projectiles = state.projectiles.filter(p => p.plantId !== plantId);
  }
}

export interface PlantEntityRef {
  id: string;
  gx: number;
  gy: number;
}
