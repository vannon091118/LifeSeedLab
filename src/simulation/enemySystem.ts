// Owner: EnemySystem (enemies slice). LOC ≤ 300.
// May: move, target, receive damage, die.
// May not: render, spawn particles, shake camera (contract Phase 4.2).

import type { SimState, EnemyEntity } from './state';
import { ENEMIES_SOURCE, type EnemySource } from '../config/enemies.source';
import { ENEMY_PATH } from '../config/world.source';
import { makeEvent, type GameEvent } from '../bus/events';
import { nextId } from '../core/ids';
import { makeRng } from '../core/rng';

export class EnemySystem {
  // dedicated 'enemy' namespace stream — gameplay RNG, isolated from wave/visual
  private rng = makeRng('enemy', 0);
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Re-seed per run; deterministic per run seed. */
  reseed(rootSeed: number): void {
    this.rng = makeRng('enemy', rootSeed);
    this.seq = 0;
  }

  /** Deterministic per (rootSeed, waveNumber, spawnIndex) — no stream state. */
  spawn(state: SimState, typeId: string, spawnIndex: number): EnemyEntity | null {
    const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[typeId as keyof typeof ENEMIES_SOURCE];
    if (!src) return null;

    const seed = makeRng('enemy', (state.seed ^ Math.imul(state.wave.number, 0x454e454d) ^ spawnIndex) >>> 0);
    const mult = 1 + state.wave.number * 0.15;
    const hp = Math.round(src.hp * mult);
    const reward = src.reward + Math.floor(seed.next() * 6); // ± deterministic jitter

    const e: EnemyEntity = {
      id: nextId('enemy'),
      typeId: typeId as EnemyEntity['typeId'],
      hp, maxHp: hp,
      px: ENEMY_PATH[0].x, py: ENEMY_PATH[0].y,
      pathIndex: 0,
      pathProgress: 0,
      damage: src.damage,
      reward,
      scoreValue: src.scoreValue,
    };
    state.enemies.push(e);
    return e;
  }

  /** Move all enemies along the path; returns lives leaked this tick. */
  update(state: SimState): number {
    let leaked = 0;
    for (const e of state.enemies) {
      if (e.pathIndex >= ENEMY_PATH.length - 1) {
        // reached the end: leak and die silently
        leaked += e.damage;
        e.hp = 0;
        continue;
      }
      const target = ENEMY_PATH[e.pathIndex + 1];
      const dx = target.x - e.px;
      const dy = target.y - e.py;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      const speed = (ENEMIES_SOURCE as Record<string, EnemySource>)[e.typeId]?.speed ?? 0.02;
      if (d < speed) {
        e.pathIndex++;
        e.px = target.x;
        e.py = target.y;
      } else {
        e.px += (dx / d) * speed;
        e.py += (dy / d) * speed;
      }
      e.pathProgress = e.pathIndex / (ENEMY_PATH.length - 1);
    }

    state.enemies = state.enemies.filter(e => e.hp > 0);
    return leaked;
  }

  /** Called by ProjectileSystem via callback: apply damage, return true if died. */
  applyDamage(state: SimState, enemyId: string, amount: number): { died: boolean; leakedTick: boolean } {
    const e = state.enemies.find(x => x.id === enemyId);
    if (!e || e.hp <= 0) return { died: false, leakedTick: false };
    e.hp -= amount;

    this.emit(makeEvent(state.clock.tick, 'DAMAGE_DEALT', e.id, ++this.seq, {
      enemyId: e.id, amount, critical: false, hp: Math.max(0, e.hp),
    }));

    if (e.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'ENEMY_DIED', e.id, ++this.seq, {
        enemyId: e.id, px: e.px, py: e.py, reward: e.reward, killerPlantId: null,
      }));
      return { died: true, leakedTick: false };
    }
    return { died: false, leakedTick: false };
  }
}
