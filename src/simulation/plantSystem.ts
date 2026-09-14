// Owner: PlantSystem (plants slice). LOC ≤ 300.
// May: create, place, remove, update (attack), receive gameplay effects.
// May not: draw, animate, play sound, touch React (contract Phase 4.1).

import type { SimState, PlantEntity, EnemyEntity } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { PLANTS_SOURCE, type PlantSource } from '../config/plants.source';
import { ENEMY_PATH, PLACEMENT_PATH_MARGIN, isInsideGrid, dist } from '../config/world.source';
import { nextId } from '../core/ids';

export interface PlantStats {
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
  cost: number;
  /** EFFECT ids (source-driven for bases, genome-derived for bred — B6). */
  effects: string[];
}

export type PlaceResult =
  | { ok: true; plant: PlantEntity }
  | { ok: false; reason: 'occupied' | 'on_path' | 'no_inventory' | 'no_energy' };

export function resolvePlantStats(state: SimState, variantId: string): PlantStats | null {
  return getPlantStats(variantId, state.bredStats);
}

/** State-independent stats lookup (used by renderer observers too). */
export function getPlantStats(variantId: string, bred?: Record<string, PlantStats>): PlantStats | null {
  const base = (PLANTS_SOURCE as Record<string, PlantSource>)[variantId];
  if (base) {
    return { ...base.stats, cost: base.cost, effects: base.effects };
  }
  return bred?.[variantId] ?? null;
}

export class PlantSystem {
  constructor(private emit: (e: GameEvent) => void) {}

  place(state: SimState, variantId: string, gx: number, gy: number): PlaceResult {
    const stats = resolvePlantStats(state, variantId);
    if (!stats) return { ok: false, reason: 'no_inventory' };

    const inv = state.inventory[variantId] || 0;
    if (inv <= 0) return { ok: false, reason: 'no_inventory' };
    if (state.resources.energy < stats.cost) return { ok: false, reason: 'no_energy' };
    if (!isInsideGrid(gx, gy)) return { ok: false, reason: 'on_path' };

    const cx = gx + 0.5, cy = gy + 0.5;
    for (const p of ENEMY_PATH) {
      if (dist(cx, cy, p.x, p.y) < PLACEMENT_PATH_MARGIN) {
        return { ok: false, reason: 'on_path' };
      }
    }
    if (state.plants.some(p => p.gx === gx && p.gy === gy)) {
      return { ok: false, reason: 'occupied' };
    }

    state.resources.energy -= stats.cost;
    state.inventory[variantId] = inv - 1;

    const plant: PlantEntity = {
      id: nextId('plant'),
      variantId,
      gx, gy,
      hp: stats.hp,
      lastShot: 0,
    };
    state.plants.push(plant);

    this.emit(makeEvent(state.clock.tick, 'PLANT_PLACED', plant.id, state.plants.length, {
      plantId: plant.id, variantId, gx, gy,
    }));
    return { ok: true, plant };
  }

  remove(state: SimState, plantId: string): boolean {
    const idx = state.plants.findIndex(p => p.id === plantId);
    if (idx < 0) return false;
    const plant = state.plants[idx];
    const stats = resolvePlantStats(state, plant.variantId);
    const refund = Math.floor((stats?.cost ?? 0) * 0.5);
    state.resources.energy += refund;
    state.inventory[plant.variantId] = (state.inventory[plant.variantId] || 0) + 1;
    state.plants.splice(idx, 1);
    this.emit(makeEvent(state.clock.tick, 'PLANT_REMOVED', plant.id, state.plants.length, {
      plantId, refund,
    }));
    return true;
  }

  /** Shooters acquire targets and request projectile spawns via callback. */
  update(
    state: SimState,
    fire: (plant: PlantEntity, target: EnemyEntity, damage: number) => void
  ): void {
    for (const plant of state.plants) {
      const stats = resolvePlantStats(state, plant.variantId);
      if (!stats || stats.damage <= 0) continue;
      if (state.clock.tick - plant.lastShot < stats.cooldown) continue;

      let target: EnemyEntity | null = null;
      let best = Infinity;
      for (const e of state.enemies) {
        const d = dist(plant.gx + 0.5, plant.gy + 0.5, e.px, e.py);
        if (d <= stats.range && d < best) { target = e; best = d; }
      }
      if (!target) continue;

      plant.lastShot = state.clock.tick;
      fire(plant, target, stats.damage);
      this.emit(makeEvent(state.clock.tick, 'PLANT_ATTACKED', plant.id, plant.lastShot, {
        plantId: plant.id, targetId: target.id,
      }));
    }
  }

  /** Support plants: heal aura. */
  healTick(state: SimState): void {
    for (const plant of state.plants) {
      const stats = resolvePlantStats(state, plant.variantId);
      if (!stats || stats.damage > 0) continue;

      for (const other of state.plants) {
        if (other.id === plant.id) continue;
        const d = dist(plant.gx + 0.5, plant.gy + 0.5, other.gx + 0.5, other.gy + 0.5);
        if (d <= stats.range) {
          const maxHp = resolvePlantStats(state, other.variantId)?.hp ?? 100;
          other.hp = Math.min(maxHp, other.hp + 2);
        }
      }
    }
  }
}
