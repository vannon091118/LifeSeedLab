// Owner: StatusSystem (Status-Writer). LOC ≤ 200.
// EINE Wahrheit für die drei Gegner-Status (slow/burn/poison), aus zwei Quellen gelesen:
//   WELCHER Effekt welchen Status setzt → `effectSupport.ts` (Sim-Vertrag)
//   WIE LANGE er wirkt / WIE WEH der DoT tut → `config/effects.source.ts` (Content)
// Vorher war beides in `enemySystem.ts` gemischt (applyStatusTicks + setStatus); die
// Vector-Feld-Lesung (Phase 5) erweitert NUR dieses Modul, nicht den Gegner.
//
// ownership-Vertrag: `EnemySystem` bleibt die Fassade nach außen (root.ts kennt nur sie) —
// der SCHREIBER der drei Status-Felder ist ausschließlich diese Klasse. Der Direkt-Schaden
// (DoT) wird über einen Host-Callback ausgeführt: EIN Ereignis-Schreiber (EnemySystem.damage),
// die Ereignis-Reihenfolge und die Seq-Zähler bleiben bit-identisch zur vorherigen Pipeline.

import type { SimState, EnemyEntity } from './state';
import { statusForEffect, statusTicksOf, statusDotOf } from './effectSupport';
import { VECTOR_LOGIC_SOURCE } from '../config/vector_logic.source';

/** Host-Abhängigkeit: der Direkt-Schaden bleibt beim EnemySystem (ein DAMAGE_DEALT-Schreiber). */
interface StatusHost {
  damage: (state: SimState, e: EnemyEntity, amount: number, critical: boolean) => void;
}

export class StatusSystem {
  constructor(private readonly host: StatusHost) {}

  /**
   * Status setzen — die EINE Stelle. `null`-Effekt und nicht- gerechnete Effekte fallen
   * still durch (fail-closed via `statusForEffect`), wie im effectSupport-Vertrag.
   */
  setStatusOf(state: SimState, e: EnemyEntity, effectId: string | null): void {
    const status = statusForEffect(effectId);
    if (!status) return;
    const ticks = statusTicksOf(effectId);
    if (status === 'slow') e.slowUntil = state.clock.tick + ticks;
    else if (status === 'burn') e.burnTicks = ticks;
    else if (status === 'poison') e.poisonTicks = ticks;
  }

  /**
   * Damage-over-time + expiry, deterministisch (keine per-enemy Streams). Die DoT-Werte
   * kommen aus der Content-Wahrheit (`statusDotOf`), nicht aus Sim-Literalen. Tote Gegner
   * werden am Tick-Ende gefiltert — derselbe Vertrag wie im EnemySystem-Update.
   */
  tickStatusesOf(state: SimState): void {
    for (const e of state.enemies) {
      if (e.burnTicks > 0) {
        e.burnTicks--;
        this.host.damage(state, e, statusDotOf('burn'), false);
      }
      if (e.poisonTicks > 0) {
        e.poisonTicks--;
        this.host.damage(state, e, statusDotOf('poison'), false);
      }
      // Vector-Feld unter Füßen: nur LESEN — kein Schreiben, kein Tick-Timer
      const key = `${Math.floor(e.px)},${Math.floor(e.py)}`;
      const flags = state.vectors[key];
      if (!flags || flags.length === 0) continue;
      let dmg = 0;
      let hasWet = false, hasCold = false, hasOil = false, hasTox = false;
      for (const c of flags) {
        const src = VECTOR_LOGIC_SOURCE[c.vectorId as keyof typeof VECTOR_LOGIC_SOURCE];
        if (!src) continue;
        if (c.vectorId === 'VECTOR_WET') hasWet = true;
        if (c.vectorId === 'VECTOR_COLD') hasCold = true;
        if (c.vectorId === 'VECTOR_OIL') hasOil = true;
        if (c.vectorId === 'VECTOR_TOX') hasTox = true;
        dmg += src.tickDelta;
      }
      // Kombos: wet+cold = gefroren (+1), wet+tox = tox verstärkt (+1) — emergent, kein if-Paar
      if (hasWet && hasCold) dmg += 1;
      if (hasWet && hasTox) dmg += 1;
      if (hasOil && dmg > 0) dmg *= 2; // oil verstärkt positiven Schaden
      // WET heilt NIE den Gegner (Spec „Wasser heilt“ meint die Pflanze — vgl.
      // PlantSystem.healTick). Negatives tickDelta wird am Gegner geklemmt.
      if (dmg > 0) this.host.damage(state, e, Math.round(dmg), false);
      if (hasCold || hasOil) e.slowUntil = Math.max(e.slowUntil, state.clock.tick + 6);
    }
    state.enemies = state.enemies.filter(e => e.hp > 0);
  }
}
