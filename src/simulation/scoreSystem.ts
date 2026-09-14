// Owner: ScoreSystem (score/energy slice). LOC ≤ 300.
// Score is computed ONLY here (contract Phase 4.4). Reads events, writes its slice.

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { makeRng } from '../core/rng';
import { COINS_PER_KILL_MIN, COINS_PER_KILL_MAX } from '../config/economy.source';

export class ScoreSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Called by SimulationRoot when ENEMY_DIED fires. scoreValue arrives combo-multiplied (B6). */
  onEnemyDied(state: SimState, enemyId: string, reward: number, scoreValue: number, px: number, py: number): void {
    state.score += scoreValue;
    state.resources.energy += reward;
    state.nektarEarned += Math.max(1, Math.floor(reward / 5));
    // 1–5 Shop-Münzen deterministisch via loot-RNG (pro Kill, kein Stream-State)
    const coins = makeRng('loot', (state.seed ^ Math.imul(state.clock.tick, 0x51ED) ^ Math.imul(enemyId.length, 0x9E37) ^ enemyId.charCodeAt(0)) >>> 0).nextInt(COINS_PER_KILL_MIN, COINS_PER_KILL_MAX);
    state.resources.coins += coins;

    this.emit(makeEvent(state.clock.tick, 'SCORE_CHANGED', 'system:score', ++this.seq, {
      score: state.score, delta: scoreValue,
    }));
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', 'system:score', ++this.seq, {
      energy: reward, sourceId: enemyId,
    }));
    this.emit(makeEvent(state.clock.tick, 'COINS_GRANTED', 'system:score', ++this.seq, {
      coins, sourceId: enemyId, enemyId,
    }));
    void px; void py;
  }

  /** Wave completion bonus (called by WaveSystem via root wiring). Energy only —
   *  score is combat result, so NO SCORE_CHANGED here (Defect A4-3: HUD delta must not lie). */
  grantWaveReward(state: SimState, wave: number, reward: number): void {
    state.resources.energy += reward;
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
