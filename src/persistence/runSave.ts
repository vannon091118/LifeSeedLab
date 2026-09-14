// Owner: PersistenceSystem. LOC ≤ 200.
// Saves authoritative run state only (Phase 17 MVP). Never saves presentation.

import type { SimState } from '../simulation/state';

const RUN_KEY = 'lifegamelab_run_v1';

export interface RunSave {
  version: 1;
  seed: number;
  tick: number;
  phase: SimState['phase'];
  waveNumber: number;
  energy: number;
  lives: number;
  score: number;
  combo: SimState['combo'];
  plants: SimState['plants'];
  enemies: SimState['enemies'];
  projectiles: SimState['projectiles'];
  inventory: Record<string, number>;
  nektarEarned: number;
}

export function saveRun(state: SimState): void {
  const s: RunSave = {
    version: 1,
    seed: state.seed,
    tick: state.clock.tick,
    phase: state.phase,
    waveNumber: state.wave.number,
    energy: state.resources.energy,
    lives: state.lives,
    score: state.score,
    combo: state.combo,
    plants: state.plants,
    enemies: state.enemies,
    projectiles: state.projectiles,
    inventory: state.inventory,
    nektarEarned: state.nektarEarned,
  };
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — skip silently
  }
}

export function loadRun(): RunSave | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunSave;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    // ignore
  }
}
