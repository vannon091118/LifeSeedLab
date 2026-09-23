// Owner: ScoreSystem (score slice). LOC ≤ 300.
// Score is computed ONLY here (contract Phase 4.4). Reads events, writes its slice.

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { WAVE_BONUS } from '../config/economy.source';

export class ScoreSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** Called by SimulationRoot when ENEMY_DIED fires. scoreValue arrives combo-multiplied (B6). */
  onEnemyDied(state: SimState, enemyId: string, reward: number, scoreValue: number, px: number, py: number): void {
    state.score += scoreValue;
    // P-31: die gebuchte Menge wird EINMAL hier gerechnet — gebucht UND emittiert. Die Anzeige
    // (Observer) zeigt denselben Betrag, den der Zähler wächst; keine Formel-Kopie im Observer.
    const granted = Math.max(1, Math.floor(reward / 5));
    state.nektarEarned += granted;
    void enemyId;

    this.emit(makeEvent(state.clock.tick, 'SCORE_CHANGED', 'system:score', ++this.seq, {
      score: state.score, delta: scoreValue,
    }));
    // B5.1: der Kill-Ort GEHÖRT zur Buchung — er ist der Ursprung der Belohnungsreise. Die
    // restlichen Payload-Felder bleiben, wie sie waren; der Ort ist kein zweiter Kontostand,
    // sondern die Tatsache, woher der Betrag kommt (der Observer reicht ihn nur durch).
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', 'system:score', ++this.seq, {
      reward, grantedNektar: granted, sourceId: enemyId, px, py,
    }));
    // B29/ENTSCHEIDUNG 19.09.2026 („Feld streichen"): Es gibt KEINEN zweiten Kontostand mehr.
    // Vorher schrieb jeder Kill 1–5 „Erfahrung" über den loot-Strom in `state.resources` —
    // gelesen hat sie niemand (kein UI, kein Command, keine Senke), und der Hash las sie
    // bewusst nicht. Ein deklariertes Feld ohne Leser ist eine zweite Wahrheit über Belohnung
    // neben Score und Nektar; es ist gestrichen statt ausgestattet. Der loot-Namespace bleibt
    // als Vertrags-Fläche in `core/rng` deklariert (kein System beansprucht ihn heute).
  }

  /** Wellen-Abschluss (via Root-Wiring).
   *  P-29 (Entscheidung des Eigentümers): der Bonus fällt nur auf jeder WAVE_BONUS.everyWaves-
   *  ten Welle an und wird mit der besten Combo DIESER Welle staffelt
   *  (`1 + (waveBestMult − 1) × comboStep` auf den Schedule-Reward). Gebucht wird dieselbe
   *  Währung wie beim Kill (`nektarEarned` → Meta-Wallet bei Run-Ende) — vorher emittierte
   *  diese Methode JEDE Welle ein Event, das niemand buchte (P-29: Belohnung ohne Senke).
   *  Der Ort bleibt `null`: ein Wellen-Bonus hat keine Quelle im Feld, der Observer zeigt
   *  die Ankunft AM Zähler statt einen Flug von einem erfundenen Punkt. */
  grantWaveReward(state: SimState, wave: number, scheduleReward: number, waveBestMult: number): void {
    if (WAVE_BONUS.everyWaves <= 0 || wave % WAVE_BONUS.everyWaves !== 0) return;
    const granted = Math.max(1, Math.floor(scheduleReward * (1 + (waveBestMult - 1) * WAVE_BONUS.comboStep)));
    state.nektarEarned += granted;
    this.emit(makeEvent(state.clock.tick, 'REWARD_GRANTED', `system:wave:${wave}`, ++this.seq, {
      reward: scheduleReward, grantedNektar: granted, sourceId: `wave-${wave}`, px: null, py: null,
    }));
  }

}
