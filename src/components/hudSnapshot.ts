// Owner: UI (HUD-Abbild). LOC ≤ 200.
// Eine Quelle für das HUD: der RAF-Takt UND der Erst-Wert beim Mount bauen den Snapshot gleich.
// Ohne den Erst-Wert ist die Tray bis zum ersten HUD-Takt (~100 ms) leer und alle Karten sind
// deaktiviert — beim Betreten des Runs sieht der Spieler „×0" statt seines Bestands (B22).
import type { SimState } from '../simulation/state';
import { autoStartTicksLeft } from '../simulation/waveTiming';
import { routeWalkTiles, routeIdealTiles } from '../simulation/mapSystem';

export interface HudSnapshot {
  wave: number;
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
  /** D5/Entscheidung 19.09.2026: Felder, die die Gegner wirklich laufen (Zeit unter Feuer). */
  routeTiles: number | null;
  /** Kürzester möglicher Weg — der Abstand zu `routeTiles` IST der Maze-Gewinn. */
  routeIdealTiles: number | null;
  /** B5.1: im Lauf verdienter Nektar — die Wahrheit steht in der Sim (`state.nektarEarned`),
   *  das HUD spiegelt sie; der Betrag wird beim Run-Ende gebucht (recordRunEnd). */
  nektarEarned: number;
}

/** Sim-Stand + Pause-Flag ⇒ HUD-Abbild. Reine Ableitung (read-only, kein Sim-Schreibzugriff). */
export function hudOf(state: SimState, paused: boolean): HudSnapshot {
  return {
    wave: state.wave.number,
    lives: state.lives,
    combo: state.combo.count,
    inventory: { ...state.inventory },
    paused,
    phase: state.phase,
    beetleDeployed: state.deployedBeetle !== null,
    tick: state.clock.tick,
    // D5: EINE Quelle (routeMetrics über die State-Route) — der Writer-Wert wird in Feldern
    // sichtbar statt nur emittiert; keine zweite Formel im HUD.
    routeTiles: routeWalkTiles(state.currentRoute),
    routeIdealTiles: routeIdealTiles(state.currentRoute),
    // B5.1: eine Quelle — der Zähler ist der Anker der Belohnungsreise, kein Schätzwert des UI.
    nektarEarned: state.nektarEarned,
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
