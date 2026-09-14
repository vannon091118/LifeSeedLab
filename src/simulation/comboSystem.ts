// Owner: ComboSystem (combo slice). LOC ≤ 300.
// Owns comboCount, comboTimer, multiplier, highestCombo (contract Phase 4.5).

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';

const WINDOW_TICKS = 120; // 4s at 30tps
const HIT_INCREMENT = 1;

export class ComboSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Called on each kill (SimulationRoot wires ENEMY_DIED). */
  registerKill(state: SimState): void {
    state.combo.count += HIT_INCREMENT;
    state.combo.timer = WINDOW_TICKS;

    // multiplier: 1 + count/10, capped
    const prev = state.combo.multiplier;
    state.combo.multiplier = Math.min(5, 1 + state.combo.count * 0.1);
    if (state.combo.count > state.combo.highest) {
      state.combo.highest = state.combo.count;
    }

    if (prev !== state.combo.multiplier || state.combo.count === 1) {
      this.emit(makeEvent(state.clock.tick, 'COMBO_CHANGED', 'system:combo', ++this.seq, {
        count: state.combo.count, multiplier: state.combo.multiplier,
      }));
    }
  }

  /** Per-tick decay. */
  update(state: SimState): void {
    if (state.combo.count === 0) return;
    state.combo.timer--;
    if (state.combo.timer <= 0) {
      state.combo.count = 0;
      state.combo.multiplier = 1;
      this.emit(makeEvent(state.clock.tick, 'COMBO_CHANGED', 'system:combo', ++this.seq, {
        count: 0, multiplier: 1,
      }));
    }
  }
}
