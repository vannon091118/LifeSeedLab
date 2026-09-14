// Owner: ProjectileSystem (projectiles slice). LOC ≤ 300.
// Gameplay only. Fires projectiles, integrates motion, detects hits,
// delegates damage application to EnemySystem via callback (no direct writes).

import type { SimState, ProjectileEntity, EnemyEntity } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { dist } from '../config/world.source';
import { nextId } from '../core/ids';

const HIT_RADIUS = 0.4;
const OFFSCREEN = -999;

export class ProjectileSystem {
  private seq = 0;

  constructor(
    private emit: (e: GameEvent) => void,
    private applyDamage: (state: SimState, enemyId: string, amount: number) => { died: boolean }
  ) {
    void this.applyDamage;
  }

  /** Spawn a projectile from a plant toward an enemy (called by PlantSystem via root wiring). */
  fire(
    state: SimState,
    plant: PlantEntityRef,
    target: EnemyEntity,
    damage: number,
    pierce: number
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
    };
    state.projectiles.push(p);

    this.emit(makeEvent(state.clock.tick, 'PROJECTILE_FIRED', p.id, ++this.seq, {
      projectileId: p.id, plantId: plant.id, targetId: target.id, damage,
    }));
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
          const res = this.applyDamage(state, e.id, p.damage);

          this.emit(makeEvent(state.clock.tick, 'PROJECTILE_HIT', p.id, ++this.seq, {
            projectileId: p.id, enemyId: e.id, damage: p.damage, critical: false,
            px: p.px, py: p.py,
          }));

          if (p.remainingPierce > 0) {
            p.remainingPierce--;
          } else {
            p.px = OFFSCREEN; // mark for removal
          }
          if (res.died) break; // projectile continues if pierce remains, else dies
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
