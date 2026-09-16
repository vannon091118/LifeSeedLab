// Owner: UI (HUD-Abbild). LOC ≤ 200.
// Eine Quelle für das HUD: der RAF-Takt UND der Erst-Wert beim Mount bauen den Snapshot gleich.
// Ohne den Erst-Wert ist die Tray bis zum ersten HUD-Takt (~100 ms) leer und alle Karten sind
// deaktiviert — beim Betreten des Runs sieht der Spieler „×0" statt seines Bestands (B22).
import type { SimState } from '../simulation/state';

export interface HudSnapshot {
  wave: number;
  energy: number;
  lives: number;
  combo: number;
  inventory: Record<string, number>;
  paused: boolean;
  phase: SimState['phase'];
  beetleDeployed: boolean;
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
  };
}
