import type { SimState } from '../simulation/state';
import { idbSet, idbGet, idbRemove } from './storage';
import { APP_VERSION } from '../version';

// Owner: PersistenceSystem (run schema adapter). LOC ≤ 200.
// Run-Snapshot v3 mit RESUME-VERTRAG (QUALITY_SPEC B2):
// Gespeichert werden nur deterministisch rekonstruierbare Felder.
// enemies/projectiles/schedule werden bewusst NICHT gespeichert —
// Resume startet in 'prep', das nächste Schedule regeneriert aus (seed, waveNumber+1).
//
// R2-NEUBAU: mapTiles ist hier GESTORBEN — die Welt ist kein Run-Zustand. Sie lebt
// ausschließlich im WorldSave (eigener IDB-Key) und wird jedem Run als Snapshot
// injiziert (RootInit.worldSnapshot). Der Resume-Snapshot beschreibt nur den
// Run-Fortschritt, nie die Karte.

const RUN_KEY = 'run';
const RUN_VERSION = 3;

export interface RunSave {
  version: 3;
  /** Produktversion beim Speichern (Diagnose: Altsaves/Never-versionierte Felder zuordnen). */
  appVersion: string;
  runId: number;
  seed: number;
  tick: number;
  waveNumber: number;
  energy: number;
  lives: number;
  score: number;
  combo: SimState['combo'];
  plants: SimState['plants'];
  inventory: Record<string, number>;
  discoveredVariants: string[];
  bredStats: NonNullable<SimState['bredStats']>;
  nektarEarned: number;
  cols: number;
  rows: number;
}

export function saveRun(state: SimState): void {
  if (state.phase === 'gameover') return; // game over runs are not resumable
  const s: RunSave = {
    version: 3,
    appVersion: APP_VERSION,
    runId: state.runId,
    seed: state.seed,
    tick: 0, // resume starts prep at tick 0 of the prep window — honest contract
    waveNumber: state.wave.number,
    energy: state.resources.energy,
    lives: state.lives,
    score: state.score,
    combo: state.combo,
    plants: state.plants,
    inventory: state.inventory,
    discoveredVariants: state.discoveredVariants,
    bredStats: state.bredStats ?? {},
    nektarEarned: state.nektarEarned,
    cols: state.cols,
    rows: state.rows,
  };
  void idbSet(RUN_KEY, s, RUN_VERSION);
}

export async function loadRun(): Promise<RunSave | null> {
  const opts = { version: RUN_VERSION, fallback: () => null };
  const result = await idbGet<RunSave | null>(RUN_KEY, opts);
  return result ?? null;
}

export async function clearRun(): Promise<void> {
  await idbRemove(RUN_KEY);
}
