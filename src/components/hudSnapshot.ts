// Owner: UI (HUD-Abbild). LOC ≤ 200.
// Eine Quelle für das HUD: der RAF-Takt UND der Erst-Wert beim Mount bauen den Snapshot gleich.
// Ohne den Erst-Wert ist die Tray bis zum ersten HUD-Takt (~100 ms) leer und alle Karten sind
// deaktiviert — beim Betreten des Runs sieht der Spieler „×0" statt seines Bestands (B22).
import type { SimState } from '../simulation/state';
import { autoStartTicksLeft } from '../simulation/waveTiming';

export interface HudSnapshot {
  wave: number;
  energy: number;
  lives: number;
  combo: number;
  inventory: Record<string, number>;
  paused: boolean;
  phase: SimState['phase'];
  beetleDeployed: boolean;
  /** B23.2: Sim-Tick — Zeitbasis der Anzeige (Countdown, Toast-Lebensdauer). Keine Wanduhr. */
  tick: number;
  /** B23.1/2: Ticks bis zum Auto-Start der nächsten Welle; `null` ⇒ das Labor wartet auf dich. */
  prepTicksLeft: number | null;
}

/** Sim-Stand + Pause-Flag ⇒ HUD-Abbild. Reine Ableitung (read-only, kein Sim-Schreibzugriff). */
export function hudOf(state: SimState, paused: boolean): HudSnapshot {
  return {
    wave: state.wave.number,
    energy: state.resources.energy,
    lives: state.lives,
    combo: state.combo.count,
    inventory: { ...state.inventory },
    paused,
    phase: state.phase,
    beetleDeployed: state.deployedBeetle !== null,
    tick: state.clock.tick,
    // Dieselbe Regel wie im WaveSystem (B23.1) — nicht nachgebaut, sondern dieselbe Funktion.
    prepTicksLeft: autoStartTicksLeft({
      phase: state.phase,
      prepStartTick: state.wave.prepStartTick,
      tick: state.clock.tick,
      plantCount: state.plants.length,
      autoWaves: state.wave.autoWaves,
    }),
  };
}
