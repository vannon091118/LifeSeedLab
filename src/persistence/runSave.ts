import type { SimState } from '../simulation/state';
import { idbSet, idbGetResult, idbRemove, type LoadResult, type WriteResult } from './storage';
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

export function isValidRunSave(raw: unknown): raw is RunSave {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Partial<RunSave>;
  if (s.version !== 3 || typeof s.appVersion !== 'string') return false;
  const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  if (!numeric(s.runId) || !numeric(s.seed) || !numeric(s.tick) || !numeric(s.waveNumber) || !numeric(s.lives) || !numeric(s.score) || !numeric(s.nektarEarned) || !numeric(s.cols) || !numeric(s.rows)) return false;
  if (s.runId < 0 || s.seed < 0 || s.tick < 0 || s.waveNumber < 0 || s.lives < 0 || s.score < 0 || s.cols < 4 || s.rows < 4) return false;
  if (!s.combo || typeof s.combo !== 'object' || !Array.isArray(s.plants) || !s.inventory || typeof s.inventory !== 'object') return false;
  if (!Array.isArray(s.discoveredVariants) || !s.bredStats || typeof s.bredStats !== 'object') return false;
  return Object.values(s.inventory).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
}

export function saveRun(state: SimState): Promise<WriteResult> {
  if (state.phase === 'gameover') return Promise.resolve({ status: 'skipped' }); // game over runs are not resumable
  const s: RunSave = {
    version: 3,
    appVersion: APP_VERSION,
    runId: state.runId,
    seed: state.seed,
    tick: 0, // resume starts prep at tick 0 of the prep window — honest contract
    waveNumber: state.wave.number,
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
  return idbSet(RUN_KEY, s, RUN_VERSION);
}

export async function loadRunResult(): Promise<LoadResult<RunSave>> {
  const result = await idbGetResult<RunSave>(RUN_KEY, { version: RUN_VERSION, fallback: () => null as never });
  if (result.status === 'valid' && !isValidRunSave(result.value)) return { status: 'corrupt' };
  return result;
}

export async function loadRun(): Promise<RunSave | null> {
  const result = await loadRunResult();
  return result.status === 'valid' ? result.value : null;
}

export async function clearRun(): Promise<WriteResult> {
  return idbRemove(RUN_KEY);
}
