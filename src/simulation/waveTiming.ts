// Owner: Simulation (wave timing). LOC ≤ 200.
// EINE Quelle für die Frage „startet die nächste Welle jetzt von selbst?" — das WaveSystem
// entscheidet damit, und das HUD zeigt damit an. Ohne diese Trennung stünde die Regel zweimal im
// Code (einmal als Verhalten, einmal als Anzeige) und die Anzeige würde irgendwann lügen.

import { AUTO_WAVE_DELAY_TICKS, PREP_WAITS_FOR_FIRST_PLANT } from '../config/economy.source';
import { TICK_MS } from '../core/clock';

export interface WaveTimingInput {
  phase: string;
  /** Tick, in dem die Vorbereitung begann (`null` ⇒ keine Vorbereitung läuft). */
  prepStartTick: number | null;
  tick: number;
  /** Zahl der stehenden Pflanzen — Bereitschafts-Signal (B23.1). */
  plantCount: number;
}

/**
 * Ticks bis zum automatischen Start der nächsten Welle.
 * `null` ⇒ es läuft KEIN Auto-Start: nicht in der Vorbereitung, keine Vorbereitung begonnen —
 * oder das Feld ist leer und das Labor wartet auf die erste Pflanze (B23.1).
 */
export function autoStartTicksLeft(o: WaveTimingInput): number | null {
  if (o.phase !== 'prep' || o.prepStartTick === null) return null;
  if (PREP_WAITS_FOR_FIRST_PLANT && o.plantCount === 0) return null;
  return Math.max(0, AUTO_WAVE_DELAY_TICKS - (o.tick - o.prepStartTick));
}

/** true ⇒ die Vorbereitung ist abgelaufen und die Welle soll von selbst starten. */
export function autoStartDue(o: WaveTimingInput): boolean {
  return autoStartTicksLeft(o) === 0;
}

/** Sekunden bis zum Auto-Start (aufgerundet) — Anzeige-Wahrheit, nicht Spielentscheidung.
 *  Die Tick-Rate kommt aus `core/clock` (eine Quelle), nicht als zweite 30 im Code. */
export function autoStartSecondsLeft(ticksLeft: number | null): number | null {
  if (ticksLeft === null) return null;
  return Math.ceil((ticksLeft * TICK_MS) / 1000);
}
