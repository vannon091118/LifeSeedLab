// Owner: ScoreSystem (score slice). LOC ≤ 300.
// Score is computed ONLY here (contract Phase 4.4). Reads events, writes its slice.

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { makeRng } from '../core/rng';
import { EXPERIENCE_PER_KILL_MIN, EXPERIENCE_PER_KILL_MAX } from '../config/economy.source';

export class ScoreSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Called by SimulationRoot when ENEMY_DIED fires. scoreValue arrives combo-multiplied (B6). */
  onEnemyDied(state: SimState, enemyId: string, reward: number, scoreValue: number, px: number, py: number): void {
    state.score += scoreValue;
    state.nektarEarned += Math.max(1, Math.floor(reward / 5));
    // 1–5 Erfahrung deterministisch via loot-RNG (pro Kill, kein Stream-State)
    const experience = makeRng('loot', (state.seed ^ Math.imul(state.clock.tick, 0x51ED) ^ Math.imul(enemyId.length, 0x9E37) ^ enemyId.charCodeAt(0)) >>> 0).nextInt(EXPERIENCE_PER_KILL_MIN, EXPERIENCE_PER_KILL_MAX);
    state.resources.experience += experience;

    this.emit(makeEvent(state.clock.tick, 'SCORE_CHANGED', 'system:score', ++this.seq, {
      score: state.score, delta: scoreValue,
    }));
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', 'system:score', ++this.seq, {
      reward, sourceId: enemyId,
    }));
    // B29: kein COINS_GRANTED mehr. `resources.experience` bleibt State (deterministisch,
    // testbar), aber das Event war ein Contract ohne Consumer UND ohne Senke: kein Positionsfeld
    // (also kein Welt-FX möglich), der Stand ist Snapshot, und Erfahrung ist KEINE Währung — sie
    // wird nie ausgegeben. Genau deshalb heißt sie nicht mehr „coins": ein zweiter Kontostand
    // neben Nektar war eine zweite Wahrheit über Geld (Befund 19.09.2026).
    void px; void py;
  }

  /** Wellen-Abschluss (via Root-Wiring). #4: KEINE Ressource mehr — der Wellenbonus war eine
   *  reine Energie-Gutschrift und ist mit dem Energiesystem gestorben. Score bleibt Kampfergebnis
   *  (Defect A4-3: kein SCORE_CHANGED). Der Fakt bleibt als Event erhalten (FX/Beobachter). */
  grantWaveReward(state: SimState, wave: number, reward: number): void {
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', `system:wave:${wave}`, ++this.seq, {
      reward, sourceId: `wave-${wave}`,
    }));
  }

}
