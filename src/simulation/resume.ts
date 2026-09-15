// Owner: Simulation (resume contract). LOC ≤ 200.
// B2-Resume-Vertrag, test-locked: Wiederhergestellt werden NUR deterministisch
// rekonstruierbare Felder (Pflanzen, Wirtschaft, Welle). Gegner, Projektile und der
// Wellen-Schedule werden bewusst verworfen — die nächste Welle regeneriert sich
// deterministisch aus (seed, waveNumber+1). Deshalb startet ein Resume immer in `prep`.

import type { MapTiles, PlantEntity, SimState } from './state';

export interface ResumeSnapshot {
  waveNumber: number;
  energy: number;
  lives: number;
  score: number;
  combo: SimState['combo'];
  plants: PlantEntity[];
  inventory: Record<string, number>;
  discoveredVariants: string[];
  mapTiles: MapTiles;
  nektarEarned: number;
}

/** Wendet einen gespeicherten Snapshot auf einen frisch erzeugten Zustand an. */
export function applyResume(state: SimState, snapshot: ResumeSnapshot): void {
  state.phase = 'prep';
  state.wave = {
    number: snapshot.waveNumber,
    schedule: null,
    spawnQueue: [],
    lastSpawnTick: 0,
    prepStartTick: state.clock.tick,
  };
  state.resources = { ...state.resources, energy: snapshot.energy };
  state.lives = snapshot.lives;
  state.score = snapshot.score;
  state.combo = { ...snapshot.combo };
  state.plants = snapshot.plants.map(p => ({ ...p }));
  state.inventory = { ...snapshot.inventory };
  state.discoveredVariants = [...snapshot.discoveredVariants];
  state.mapTiles = { ...snapshot.mapTiles };
  state.nektarEarned = snapshot.nektarEarned;

  // Vertrag: keine Wiederherstellung laufender Entitäten.
  state.enemies = [];
  state.projectiles = [];
  state.currentRoute = null;
  state.deployedBeetle = null;
}
