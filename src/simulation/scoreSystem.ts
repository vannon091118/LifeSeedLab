// Owner: ScoreSystem (score slice). LOC ≤ 300.
// Score is computed ONLY here (contract Phase 4.4). Reads events, writes its slice.

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';

export class ScoreSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Called by SimulationRoot when ENEMY_DIED fires. scoreValue arrives combo-multiplied (B6). */
  onEnemyDied(state: SimState, enemyId: string, reward: number, scoreValue: number, px: number, py: number): void {
    state.score += scoreValue;
    state.nektarEarned += Math.max(1, Math.floor(reward / 5));
    void enemyId;

    this.emit(makeEvent(state.clock.tick, 'SCORE_CHANGED', 'system:score', ++this.seq, {
      score: state.score, delta: scoreValue,
    }));
    // B5.1: der Kill-Ort GEHÖRT zur Buchung — er ist der Ursprung der Belohnungsreise. Die
    // restlichen Payload-Felder bleiben, wie sie waren; der Ort ist kein zweiter Kontostand,
    // sondern die Tatsache, woher der Betrag kommt (der Observer reicht ihn nur durch).
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', 'system:score', ++this.seq, {
      reward, sourceId: enemyId, px, py,
    }));
    // B29/ENTSCHEIDUNG 19.09.2026 („Feld streichen"): Es gibt KEINEN zweiten Kontostand mehr.
    // Vorher schrieb jeder Kill 1–5 „Erfahrung" über den loot-Strom in `state.resources` —
    // gelesen hat sie niemand (kein UI, kein Command, keine Senke), und der Hash las sie
    // bewusst nicht. Ein deklariertes Feld ohne Leser ist eine zweite Wahrheit über Belohnung
    // neben Score und Nektar; es ist gestrichen statt ausgestattet. Der loot-Namespace bleibt
    // als Vertrags-Fläche in `core/rng` deklariert (kein System beansprucht ihn heute).
  }

  /** Wellen-Abschluss (via Root-Wiring). #4: KEINE Ressource mehr — der Wellenbonus war eine
   *  reine Energie-Gutschrift und ist mit dem Energiesystem gestorben. Score bleibt Kampfergebnis
   *  (Defect A4-3: kein SCORE_CHANGED). Der Fakt bleibt als Event erhalten (FX/Beobachter). */
  grantWaveReward(state: SimState, wave: number, reward: number): void {
    // Kein Weltursprung: der Wellen-Bonus hat keine Quelle im Feld (und bucht keine Ressource,
    // s. Register) — ein Flug daraus wäre erfunden. `null` ist die ehrliche Antwort.
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', `system:wave:${wave}`, ++this.seq, {
      reward, sourceId: `wave-${wave}`, px: null, py: null,
    }));
  }

}
