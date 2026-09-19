// Owner: UI (Wellen-Knopf-Zustand). LOC ≤ 200.
// Reine Ableitung „was zeigt der Wellen-Knopf?" aus Phase und Restzeit — ohne DOM, ohne Sim,
// damit der Vertrag testbar ist. Befund beider Spielerberichte: der Knopf stand auch während der
// laufenden Welle als „Start Wave" da und tat beim Klick nichts. Ein Hauptknopf, der nichts tut,
// ist eine Sackgasse — der Spieler weiß dann nicht, ob die Welle läuft oder er sie starten muss.

import type { TranslationKey } from '../i18n';
import { autoStartSecondsLeft } from '../simulation/waveTiming';

export interface WaveButtonState {
  /** Beschriftung des Knopfes: die HANDLUNG („Welle starten") oder der Zustand („Welle n läuft"). */
  labelKey: TranslationKey;
  /** true ⇒ während dieser Phase gibt es nichts zu drücken (Anzeige statt Knopf). */
  disabled: boolean;
  /** Hinweiszeile unter der Leiste; `null` ⇒ kein Hinweis nötig. */
  hintKey: TranslationKey | null;
  /** Sekunden bis zum Auto-Start (in den Hinweis eingesetzt); `null` ⇒ kein Auto-Start geplant. */
  seconds: number | null;
  /** true ⇒ das Labor wartet noch auf die erste Pflanze (B23.1). */
  waitingForPlant: boolean;
}

/**
 * Der Knopf behält in der Vorbereitung seine HANDLUNGS-Beschriftung („Welle starten") — nur so
 * bleibt erkennbar, dass man drücken kann. Wann es von selbst losgeht, steht als Hinweis daneben:
 * „Welle startet in 3s" bzw. „Das Labor wartet auf deine erste Pflanze." Während der Welle wird
 * aus dem Knopf eine Anzeige.
 */
export function waveButtonState(input: { phase: string; prepTicksLeft: number | null }): WaveButtonState {
  if (input.phase === 'wave') {
    return { labelKey: 'wave.running', disabled: true, hintKey: null, seconds: null, waitingForPlant: false };
  }
  // R1: Build-Sequenz — der Hauptknopf ist die HANDLUNG („Welle starten") und startet Welle 1
  // direkt; der sanfte Weg („Bauen beenden" → Vorbereitung mit Countdown) steht daneben (TopBar).
  // Vorher hieß der Hauptknopf im Layout selbst „Fertig gebaut" — gleich benannt wie der
  // Layout-Knopf daneben, während der Hinweis „Welle starten" nannte: zwei fast gleiche Knöpfe
  // und ein Hinweis auf einen dritten, der nicht existierte.
  if (input.phase === 'layout') {
    return { labelKey: 'game.startWave', disabled: false, hintKey: 'layout.hint', seconds: null, waitingForPlant: false };
  }
  if (input.phase === 'prep') {
    if (input.prepTicksLeft === null) {
      // Kein Auto-Start geplant: noch keine Pflanze (B23.1) oder keine Vorbereitung offen.
      return { labelKey: 'game.startWave', disabled: false, hintKey: 'wave.waitingHint', seconds: null, waitingForPlant: true };
    }
    return {
      labelKey: 'game.startWave',
      disabled: false,
      hintKey: 'wave.startIn',
      seconds: autoStartSecondsLeft(input.prepTicksLeft),
      waitingForPlant: false,
    };
  }
  // gameover: der Run ist vorbei, hier startet nichts mehr.
  return { labelKey: 'game.startWave', disabled: true, hintKey: null, seconds: null, waitingForPlant: false };
}
