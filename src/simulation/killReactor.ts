// Owner: Simulation (Kill-Verwertung). LOC ≤ 200.
// Extraktion aus root.ts (Regel 1): diese Reaktion ist keine Verdrahtung, sondern Gameplay —
// Score/Combo-Verwertung (4) und der Chain-Nachbrand (4b) wohnen hier als testbare Einheit.
// root.ts bleibt die EINZIGE Verdrahtung (ruft pro Tick exakt einmal), die REIHENFOLGE ist
// Teil des Vertrags und bit-identisch zur alten Pipeline:
//   1. Score/Combo für alle Kills des Ticks (Combo-Multiplikator, A4-2),
//   2. DANACH clearEventLog() (der Log-Reset sitzt zwischen 4 und 4b — absichtlich),
//   3. DANACH der Chain-Arc (Kills daraus landen im frischen pendingKills → nächster Tick).

import type { SimState } from './state';
import type { GameEvent } from '../bus/events';
import type { EnemySystem } from './enemySystem';
import { resolvePlantStats } from './plantSystem';

interface KillReactorDeps {
  score: {
    onEnemyDied(state: SimState, enemyId: string, reward: number, scoreGain: number, px: number, py: number): void;
  };
  combo: {
    registerKill(state: SimState): void;
  };
  enemies: {
    chainFrom(state: SimState, fromX: number, fromY: number, amount: number, range: number): void;
  };
}

/** Verwertet die Kill-Ereignisse EINES Ticks — Root liefert den Buffer, hier steht die Regel. */
export function reactToKills(
  state: SimState,
  killEvents: ReadonlyArray<Extract<GameEvent, { type: 'ENEMY_DIED' }>>,
  deps: KillReactorDeps,
): void {
  // combo multiplier applies to score (Defect A4-2) — nektar stays flat by design
  for (const e of killEvents) {
    deps.score.onEnemyDied(state, e.payload.enemyId, e.payload.reward, e.payload.reward * state.combo.multiplier, e.payload.px, e.payload.py);
    deps.combo.registerKill(state);
  }
}

/** Chain-Nachbrand (B6): Kills von Ketten-Pflanzen arken 50 % Schaden auf den nächsten Gegner. */
export function chainAftermath(
  state: SimState,
  killEvents: ReadonlyArray<Extract<GameEvent, { type: 'ENEMY_DIED' }>>,
  enemies: KillReactorDeps['enemies'],
): void {
  for (const e of killEvents) {
    const plant = e.payload.killerPlantId
      ? state.plants.find(p => p.id === e.payload.killerPlantId) : null;
    if (!plant) continue;
    const stats = resolvePlantStats(state, plant.variantId);
    if (!stats || !stats.effects.includes('EFFECT_CHAIN')) continue;
    enemies.chainFrom(state, e.payload.px, e.payload.py, 50, 2);
  }
}
