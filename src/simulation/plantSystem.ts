// Owner: PlantSystem (plants slice). LOC ≤ 300.
// May: create, place, remove, update (attack), receive gameplay effects.
// May not: draw, animate, play sound, touch React (contract Phase 4.1).

import type { SimState, PlantEntity, EnemyEntity } from './state';
import type { BallisticProfile, BredStatsEntry } from '../types';
import { ballisticsOf, legacyProfileFromEffects } from '../genome/ballistics';
import { makeEvent, type GameEvent } from '../bus/events';
import { PLANTS_SOURCE, type PlantSource } from '../config/plants.source';
import { isInsideWorld, dist } from '../config/world.source';
import { placementRejectReason } from './placementRules';
import { applyPotBoost, potBoostAt } from './potBoost';
import { nextId } from '../core/ids';
import {
  GROWTH_TICKS_BY_RARITY,
  LIFESPAN_TICKS_BY_RARITY,
  FERTILIZE_BONUS,
  SEEDLING_GROWTH_FACTOR,
  rarityForCost,
} from '../config/economy.source';

export interface PlantStats {
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
  cost: number;
  /** EFFECT ids (source-driven for bases, genome-derived for bred — B6). */
  effects: string[];
  /**
   * Schuss-Verhalten aus dem Genom. Immer gefüllt — auch für Altsaves ohne Profil-Feld:
   * dann rekonstruiert `legacyProfileFromEffects` genau das alte Verhalten. Damit gibt es
   * EINEN Ort, an dem ein Schuss seine Zahlen findet, und keinen dritten Fallback im System.
   */
  ballistics: BallisticProfile;
}

export type PlaceResult =
  | { ok: true; plant: PlantEntity }
  | { ok: false; reason: 'occupied' | 'on_path' | 'no_inventory' };

export function resolvePlantStats(state: SimState, variantId: string): PlantStats | null {
  return getPlantStats(variantId, state.bredStats);
}

/**
 * EFFEKTIV-Stats EINER ZELLE: Basis (Source/BredStats) + Wirkung des Topfes, auf dem die Pflanze
 * steht. Das ist die EINE Wahrheit für alles, was nach dem Setzen passiert — Feuern (Schaden,
 * Reichweite, Nachladezeit), Heil-Aura und Reichweiten-Ring im Renderer lesen dieselbe Funktion.
 *
 * Ohne Topf identisch zu `resolvePlantStats`. Die Farbe kommt aus der ZELLE (`potBoostAt`) und
 * wird nirgends gespeichert: keine zweite Wahrheit, kein Save-Feld, kein RNG.
 */
export function plantStatsAt(state: SimState, variantId: string, gx: number, gy: number): PlantStats | null {
  const base = resolvePlantStats(state, variantId);
  if (!base) return null;
  const boost = potBoostAt(state.mapTiles, gx, gy);
  return boost ? applyPotBoost(base, boost) : base;
}

/** State-independent stats lookup (used by renderer observers too). */
export function getPlantStats(variantId: string, bred?: Record<string, BredStatsEntry>): PlantStats | null {
  const base = (PLANTS_SOURCE as Record<string, PlantSource>)[variantId];
  if (base) {
    return {
      ...base.stats,
      cost: base.cost,
      effects: base.effects,
      ballistics: ballisticsOf(base.genome, base.role),
    };
  }
  const entry = bred?.[variantId];
  if (!entry) return null;
  return { ...entry, ballistics: entry.ballistics ?? legacyProfileFromEffects(entry.effects) };
}

export class PlantSystem {
  constructor(private emit: (e: GameEvent) => void) {}

  place(state: SimState, variantId: string, gx: number, gy: number): PlaceResult {
    // Zell-gebundene Stats: steht hier ein Topf, trägt die Pflanze dessen Wirkung
    // (Leben wird damit beim Setzen gewährt — ein später verkaufter Topf nimmt einer
    // stehenden Pflanze ihr Leben nicht wieder weg; das Leben ist Zustand, keine Ableitung).
    const stats = plantStatsAt(state, variantId, gx, gy);
    if (!stats) return { ok: false, reason: 'no_inventory' };

    const inv = state.inventory[variantId] || 0;
    // B3: identische Regel wie die UI-Vorschau (PlacementController) — eine Wahrheit.
    // B37+Korrektur: Platzieren kostet Inventory, kein Harz (user: pflanzen aus loadout, 0 passives Einkommen).
    const reject = placementRejectReason({
      board: { gx, gy, plants: state.plants, cols: state.cols, rows: state.rows },
      inventoryCount: inv,
    });
    if (reject) return { ok: false, reason: reject };

    state.inventory[variantId] = inv - 1;

    const rarity = rarityForCost(stats.cost);
    const baseGrowth = GROWTH_TICKS_BY_RARITY[rarity];
    const baseLife = LIFESPAN_TICKS_BY_RARITY[rarity];
    const growthTotal = baseGrowth;
    const plant: PlantEntity = {
      id: nextId('plant'),
      variantId,
      gx, gy,
      hp: stats.hp,
      maxHp: stats.hp,
      lastShot: 0,
      growthState: 'growing',
      growthTicksLeft: growthTotal,
      growthTicksTotal: growthTotal,
      lifeTicksLeft: baseLife,
      lifeTicksTotal: baseLife,
      fertilizeCount: 0,
      extraDamage: 0,
      extraCooldown: 0,
      isWeakened: false,
      isSeedling: false,
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
    state.inventory[plant.variantId] = (state.inventory[plant.variantId] || 0) + 1;
    state.plants.splice(idx, 1);
    this.emit(makeEvent(state.clock.tick, 'PLANT_REMOVED', plant.id, state.plants.length, {
      plantId,
    }));
    return true;
  }

  /** Düngen: nur während Wachstum, boostet Werte und verlängert Haltbarkeit, erhöht Cooldown. */
  fertilize(state: SimState, plantId: string): { ok: true } | { ok: false; reason: 'not_growing' | 'max_reached' | 'not_found' } {
    const plant = state.plants.find(p => p.id === plantId);
    if (!plant) return { ok: false, reason: 'not_found' };
    if (plant.growthState !== 'growing') return { ok: false, reason: 'not_growing' };
    if (plant.fertilizeCount >= FERTILIZE_BONUS.maxApplications) return { ok: false, reason: 'max_reached' };
    plant.fertilizeCount++;
    plant.extraDamage += FERTILIZE_BONUS.damage;
    plant.extraCooldown += FERTILIZE_BONUS.cooldownPenalty;
    plant.maxHp += FERTILIZE_BONUS.hp;
    plant.hp += FERTILIZE_BONUS.hp;
    plant.lifeTicksTotal += FERTILIZE_BONUS.lifespan;
    plant.lifeTicksLeft += FERTILIZE_BONUS.lifespan;
    // Werte sind pro Durchgang fixiert — nach Reife nicht mehr änderbar (guard oben)
    this.emit(makeEvent(state.clock.tick, 'PLANT_FERTILIZED', plant.id, plant.fertilizeCount, {
      plantId: plant.id, variantId: plant.variantId, count: plant.fertilizeCount,
    }));
    return { ok: true };
  }

  /** Setzling ziehen: reife Pflanze erzeugt Nachkommen mit halber Wachstumszeit. */
  propagate(state: SimState, plantId: string): { ok: true; plant: PlantEntity } | { ok: false; reason: 'not_mature' | 'not_found' | 'on_path' | 'occupied' } {
    const source = state.plants.find(p => p.id === plantId);
    if (!source) return { ok: false, reason: 'not_found' };
    if (source.growthState !== 'mature') return { ok: false, reason: 'not_mature' };
    const base = resolvePlantStats(state, source.variantId);
    if (!base) return { ok: false, reason: 'not_found' };
    const pos = this.findFreeNeighbor(state, source.gx, source.gy);
    if (!pos) return { ok: false, reason: 'occupied' };
    // Der Setzling wächst auf SEINER Zelle — dort gilt die Topf-Wirkung, nicht die der Mutter.
    const stats = plantStatsAt(state, source.variantId, pos.gx, pos.gy) ?? base;
    if (!isInsideWorld(state.cols, state.rows, pos.gx, pos.gy)) return { ok: false, reason: 'on_path' };
    if (state.plants.some(p => p.gx === pos.gx && p.gy === pos.gy)) return { ok: false, reason: 'occupied' };
    const rarity = rarityForCost(stats.cost);
    const baseGrowth = GROWTH_TICKS_BY_RARITY[rarity];
    const baseLife = LIFESPAN_TICKS_BY_RARITY[rarity];
    const growthTotal = Math.max(1, Math.floor(baseGrowth * SEEDLING_GROWTH_FACTOR));
    const plant: PlantEntity = {
      id: nextId('plant'),
      variantId: source.variantId,
      gx: pos.gx, gy: pos.gy,
      hp: stats.hp,
      maxHp: stats.hp,
      lastShot: 0,
      growthState: 'growing',
      growthTicksLeft: growthTotal,
      growthTicksTotal: growthTotal,
      lifeTicksLeft: baseLife,
      lifeTicksTotal: baseLife,
      fertilizeCount: 0,
      extraDamage: 0,
      extraCooldown: 0,
      isWeakened: false,
      isSeedling: true,
    };
    state.plants.push(plant);
    this.emit(makeEvent(state.clock.tick, 'PLANT_PROPAGATED', plant.id, state.plants.length, {
      sourcePlantId: source.id, plantId: plant.id, variantId: plant.variantId, gx: plant.gx, gy: plant.gy,
    }));
    return { ok: true, plant };
  }

  private findFreeNeighbor(state: SimState, gx: number, gy: number): { gx: number; gy: number } | null {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    for (const [dx, dy] of dirs) {
      const nx = gx + dx, ny = gy + dy;
      if (!isInsideWorld(state.cols, state.rows, nx, ny)) continue;
      if (state.plants.some(p => p.gx === nx && p.gy === ny)) continue;
      return { gx: nx, gy: ny };
    }
    // fallback: scan outward ring 2
    for (let r = 2; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = gx + dx, ny = gy + dy;
        if (!isInsideWorld(state.cols, state.rows, nx, ny)) continue;
        if (state.plants.some(p => p.gx === nx && p.gy === ny)) continue;
        return { gx: nx, gy: ny };
      }
    }
    return null;
  }

  /** Lifecycle-Tick: Wachstum → Reife. Kein Verwelken in der Runde — 1× platziert bleibt bis GameOver (user). */
  tickLifecycle(state: SimState): void {
    for (const plant of state.plants) {
      if (plant.growthState !== 'growing') continue;
      plant.growthTicksLeft--;
      if (plant.growthTicksLeft <= 0) {
        plant.growthState = 'mature';
        plant.growthTicksLeft = 0;
        this.emit(makeEvent(state.clock.tick, 'PLANT_GROWN', plant.id, state.clock.tick, {
          plantId: plant.id, variantId: plant.variantId, gx: plant.gx, gy: plant.gy,
        }));
      }
    }
  }

  /** Shooters acquire targets and request projectile spawns via callback. */
  update(
    state: SimState,
    fire: (plant: PlantEntity, target: EnemyEntity, damage: number) => void
  ): void {
    for (const plant of state.plants) {
      const stats = plantStatsAt(state, plant.variantId, plant.gx, plant.gy);
      if (!stats || stats.damage <= 0) continue;
      const effectiveCooldown = stats.cooldown + plant.extraCooldown;
      if (state.clock.tick - plant.lastShot < effectiveCooldown) continue;

      let target: EnemyEntity | null = null;
      let best = Infinity;
      for (const e of state.enemies) {
        const d = dist(plant.gx + 0.5, plant.gy + 0.5, e.px, e.py);
        if (d <= stats.range && d < best) { target = e; best = d; }
      }
      if (!target) continue;

      // weakened halves damage; growing slightly reduces damage (not yet at full power)
      let effectiveDamage = stats.damage + plant.extraDamage;
      if (plant.isWeakened) effectiveDamage = Math.floor(effectiveDamage * 0.5);
      else if (plant.growthState === 'growing') effectiveDamage = Math.floor(effectiveDamage * 0.7);
      if (effectiveDamage <= 0) continue;
      plant.lastShot = state.clock.tick;
      fire(plant, target, effectiveDamage);
      this.emit(makeEvent(state.clock.tick, 'PLANT_ATTACKED', plant.id, plant.lastShot, {
        plantId: plant.id, targetId: target.id,
      }));
    }
  }

  /** Support plants: heal aura. */
  healTick(state: SimState): void {
    for (const plant of state.plants) {
      const stats = plantStatsAt(state, plant.variantId, plant.gx, plant.gy);
      if (!stats || stats.damage > 0) continue;

      for (const other of state.plants) {
        if (other.id === plant.id) continue;
        const d = dist(plant.gx + 0.5, plant.gy + 0.5, other.gx + 0.5, other.gy + 0.5);
        if (d <= stats.range) {
          const maxHp = plantStatsAt(state, other.variantId, other.gx, other.gy)?.hp ?? 100;
          other.hp = Math.min(maxHp, other.hp + 2);
        }
      }
    }
  }
}
