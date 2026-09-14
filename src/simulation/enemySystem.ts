// Owner: EnemySystem (enemies slice). LOC ≤ 300.
// May: move, target, receive damage, die, carry statuses.
// May not: render, spawn particles, shake camera (contract Phase 4.2).

import type { SimState, EnemyEntity } from './state';
import { ENEMIES_SOURCE, type EnemySource } from '../config/enemies.source';
import { ENEMY_PATH } from '../config/world.source';
import { makeEvent, type GameEvent } from '../bus/events';
import { nextId } from '../core/ids';
import { makeRng } from '../core/rng';

export class EnemySystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Deterministic per (rootSeed, waveNumber, spawnIndex) — no stream state (A4-6 pattern). */
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
      slowUntil: 0,
      burnTicks: 0,
      poisonTicks: 0,
      lastHitByPlantId: null,
    };
    state.enemies.push(e);
    return e;
  }

  /** Move all enemies along the path; returns lives leaked this tick. */
  update(state: SimState): number {
    let leaked = 0;
    for (const e of state.enemies) {
      if (e.pathIndex >= ENEMY_PATH.length - 1) {
        leaked += e.damage;
        e.hp = 0;
        continue;
      }
      const target = ENEMY_PATH[e.pathIndex + 1];
      const dx = target.x - e.px;
      const dy = target.y - e.py;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      const src = (ENEMIES_SOURCE as Record<string, EnemySource>)[e.typeId];
      const slowed = state.clock.tick < e.slowUntil;
      const speed = (src?.speed ?? 0.02) * (slowed ? 0.5 : 1);
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

  /** Damage-over-time + expiry for statuses (deterministic — no per-enemy streams). */
  applyStatusTicks(state: SimState): void {
    for (const e of state.enemies) {
      if (e.burnTicks > 0) {
        e.burnTicks--;
        this.damage(state, e, 2, false);
      }
      if (e.poisonTicks > 0) {
        e.poisonTicks--;
        this.damage(state, e, 1, false);
      }
    }
    state.enemies = state.enemies.filter(e => e.hp > 0);
  }

  /** Chain effect (B6): 50% damage arc to the nearest other enemy within range cells. */
  chainFrom(state: SimState, fromX: number, fromY: number, amount: number, range: number): void {
    let best: EnemyEntity | null = null;
    let bestD = Infinity;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.px - fromX, dy = e.py - fromY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= range && d < bestD) { best = e; bestD = d; }
    }
    if (best) this.damage(state, best, amount, false);
    state.enemies = state.enemies.filter(e => e.hp > 0);
  }

  /** Called by ProjectileSystem via callback: apply damage, return true if died. */
  applyDamage(
    state: SimState,
    enemyId: string,
    amount: number,
    critical: boolean,
    effectId: string | null,
    sourcePlantId: string | null = null
  ): { died: boolean } {
    const e = state.enemies.find(x => x.id === enemyId);
    if (!e || e.hp <= 0) return { died: false };
    e.hp -= amount;
    if (sourcePlantId) e.lastHitByPlantId = sourcePlantId;

    this.emit(makeEvent(state.clock.tick, 'DAMAGE_DEALT', e.id, ++this.seq, {
      enemyId: e.id, amount, critical, hp: Math.max(0, e.hp), px: e.px, py: e.py,
    }));

    // status application (B6) — deterministic expiry ticks
    if (effectId === 'EFFECT_SLOW') e.slowUntil = state.clock.tick + 90;
    if (effectId === 'EFFECT_BURN') e.burnTicks = 3;
    if (effectId === 'EFFECT_POISON') e.poisonTicks = 5;

    if (e.hp <= 0) {
      this.emit(makeEvent(state.clock.tick, 'ENEMY_DIED', e.id, ++this.seq, {
        enemyId: e.id, px: e.px, py: e.py, reward: e.reward, killerPlantId: e.lastHitByPlantId,
      }));
      return { died: true };
    }
    return { died: false };
  }

  private damage(state: SimState, e: EnemyEntity, amount: number, critical: boolean): void {
    e.hp -= amount;
    this.emit(makeEvent(state.clock.tick, 'DAMAGE_DEALT', e.id, ++this.seq, {
      enemyId: e.id, amount, critical, hp: Math.max(0, e.hp), px: e.px, py: e.py,
    }));
  }
}
