// Owner: ProjectileSystem (projectiles slice). LOC ≤ 300.
// Gameplay only. Fires projectiles, integrates motion, detects hits,
// delegates damage application to EnemySystem via callback (no direct writes).

import type { SimState, ProjectileEntity, EnemyEntity } from './state';
import type { BallisticProfile } from '../types';
import { makeEvent, type GameEvent } from '../bus/events';
import { dist } from '../config/world.source';
import { HIT_RADIUS, EFFECT_SLOTS } from '../config/ballistics.source';
import { nextId } from '../core/ids';
import { makeRng } from '../core/rng';

const OFFSCREEN = -999;

export class ProjectileSystem {
  private seq = 0;

  constructor(
    private emit: (e: GameEvent) => void,
    private applyDamage: (state: SimState, enemyId: string, amount: number, critical: boolean, effectId: string | null, sourcePlantId: string | null) => { died: boolean },
    /** Wirkung ohne Schaden — der zweite Effekt eines Schusses (EnemySystem bleibt der Writer). */
    private applyEffect: (state: SimState, enemyId: string, effectId: string | null) => void
  ) {}

  /**
   * Spawn a projectile from a plant toward an enemy (root wiring).
   * Das PROFIL kommt aus dem Genom (`genome/ballistics.ballisticsOf`) — Geschwindigkeit,
   * Durchschlag und Krit-Chance sind damit Gene statt Konstanten.
   */
  fire(
    state: SimState,
    plant: PlantEntityRef,
    target: EnemyEntity,
    damage: number,
    profile: BallisticProfile,
    effectIds: string[] = []
  ): ProjectileEntity {
    const dx = target.px - (plant.gx + 0.5);
    const dy = target.py - (plant.gy + 0.5);
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    const carried = effectIds.slice(0, EFFECT_SLOTS);
    const p: ProjectileEntity = {
      id: nextId('projectile'),
      px: plant.gx + 0.5,
      py: plant.gy + 0.5,
      dx: dx / d,
      dy: dy / d,
      speed: profile.speed,
      damage,
      remainingPierce: profile.pierce,
      plantId: plant.id,
      effectIds: carried,
      critChance: profile.critChance,
      critMult: profile.critMult,
    };
    state.projectiles.push(p);

    // Der Event trägt den FÜHRENDEN Effekt (Projektion fürs Publikum), die Entität trägt alle.
    // P-28: der MÜNDUNGSORT reist mit — der Puff des B5-Vertrags braucht ihn, ohne State-Zugriff.
    this.emit(makeEvent(state.clock.tick, 'PROJECTILE_FIRED', p.id, ++this.seq, {
      projectileId: p.id, plantId: plant.id, targetId: target.id, damage, effectId: carried[0] ?? null,
      px: p.px, py: p.py,
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
          // Deterministischer Krit-Wurf je (Seed, Tick, Projektil) — kein Stromzustand.
          // Die CHANCE kommt aus dem Genom (`p.critChance`), das Vielfache aus der Source.
          const crit = p.critChance > 0
            && makeRng('enemy', (state.seed ^ Math.imul(state.clock.tick, 0x51ED) ^ Math.imul(p.id.charCodeAt(p.id.length - 1), 0x2701)) >>> 0).next() < p.critChance;
          const dmg = crit ? Math.round(p.damage * p.critMult) : p.damage;

          const lead = p.effectIds[0] ?? null;
          const res = this.applyDamage(state, e.id, dmg, crit, lead, p.plantId);
          for (const extra of p.effectIds.slice(1)) this.applyEffect(state, e.id, extra);

          this.emit(makeEvent(state.clock.tick, 'PROJECTILE_HIT', p.id, ++this.seq, {
            projectileId: p.id, enemyId: e.id, damage: dmg, critical: crit,
            px: p.px, py: p.py, effectId: lead,
          }));
          // P-34-Farbe liegt auf DAMAGE_DEALT (emittiert in applyDamage mit effectId) — hier
          // nur der dokumentierte Hinweis, warum der Einschlag inzwischen doppelt sichtbar ist.
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

interface PlantEntityRef {
  id: string;
  gx: number;
  gy: number;
}
