import type { SimState } from '../simulation/state';
import { idbSet, idbGet, idbRemove } from './storage';

// Owner: PersistenceSystem (run schema adapter). LOC ≤ 200.
// Run-Snapshot v2 mit RESUME-VERTRAG (QUALITY_SPEC B2):
// Gespeichert werden nur deterministisch rekonstruierbare Felder.
// enemies/projectiles/schedule werden bewusst NICHT gespeichert —
// Resume startet in 'prep', das nächste Schedule regeneriert aus (seed, waveNumber+1).

const RUN_KEY = 'run';
const RUN_VERSION = 2;

export interface RunSave {
  version: 2;
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
  /** P5: Spieler-Tiles ("gx,gy":type) — die Map gehört zum Run-Zustand. */
  mapTiles: Record<string, string>;
}

export function saveRun(state: SimState): void {
  if (state.phase === 'gameover') return; // game over runs are not resumable
  const s: RunSave = {
    version: 2,
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
    mapTiles: state.mapTiles,
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
