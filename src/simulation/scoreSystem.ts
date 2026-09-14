// Owner: ScoreSystem (score/energy slice). LOC ≤ 300.
// Score is computed ONLY here (contract Phase 4.4). Reads events, writes its slice.

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';

export class ScoreSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Called by SimulationRoot when ENEMY_DIED fires. */
  onEnemyDied(state: SimState, enemyId: string, reward: number, scoreValue: number, px: number, py: number): void {
    state.score += scoreValue;
    state.resources.energy += reward;
    state.nektarEarned += Math.max(1, Math.floor(reward / 5));

    this.emit(makeEvent(state.clock.tick, 'SCORE_CHANGED', 'system:score', ++this.seq, {
      score: state.score, delta: scoreValue,
    }));
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', 'system:score', ++this.seq, {
      energy: reward, sourceId: enemyId,
    }));
    void px; void py; // position available for reward-flight observers later (Phase 10.6)
  }

  /** Wave completion bonus (called by WaveSystem via root wiring). */
  grantWaveReward(state: SimState, wave: number, reward: number): void {
    state.resources.energy += reward;
    this.emit(makeEvent(state.clock.tick, 'SCORE_CHANGED', 'system:score', ++this.seq, {
      score: state.score, delta: reward,
    }));
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', `system:wave:${wave}`, ++this.seq, {
      energy: reward, sourceId: `wave-${wave}`,
    }));
  }

  /** Passive prep-phase energy drip. */
  prepDrip(state: SimState, amount = 2): void {
    if (state.clock.tick % 30 !== 0) return;
    state.resources.energy += amount;
  }
}
