// Owner: Simulation (resume contract). LOC ≤ 200.
// B2-Resume-Vertrag, test-locked: Wiederhergestellt werden NUR deterministisch
// rekonstruierbare Felder (Pflanzen, Wirtschaft, Welle). Gegner, Projektile und der
// Wellen-Schedule werden bewusst verworfen — die nächste Welle regeneriert sich
// deterministisch aus (seed, waveNumber+1). Deshalb startet ein Resume immer in `prep`.

import type { PlantEntity, SimState } from './state';
import { AUTO_WAVES_DEFAULT } from '../config/economy.source';

export interface ResumeSnapshot {
  waveNumber: number;
  lives: number;
  score: number;
  combo: SimState['combo'];
  plants: PlantEntity[];
  inventory: Record<string, number>;
  discoveredVariants: string[];
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
    autoWaves: AUTO_WAVES_DEFAULT, // Spieler-Entscheid ist Run-Sitzung, kein Save-Bestandteil (B32)
  };
  // Kein `resources` mehr (Entscheidung 19.09.2026): der Run hat keinen zweiten Kontostand.
  state.lives = snapshot.lives;
  state.score = snapshot.score;
  state.combo = { ...snapshot.combo };
  // P-29-Heilung: Altsaves ohne `waveBestMult` (Feld jünger als der Save) heilen auf die
  // Invariante — die Wellen-Combo der fortgesetzten Welle beginnt bei 1, kausal korrekt,
  // weil Kills ab hier sie ohnehin neu schreiben. Fail-closed statt undefined-Arithmetik.
  if (!Number.isFinite(state.combo.waveBestMult) || state.combo.waveBestMult < 1) {
    state.combo.waveBestMult = 1;
  }
  if (!Number.isFinite(state.combo.waveBestMultWave) || state.combo.waveBestMultWave < 0) {
    state.combo.waveBestMultWave = snapshot.waveNumber;
  }
  state.plants = snapshot.plants.map(p => ({ ...p }));
  state.inventory = { ...snapshot.inventory };
  state.discoveredVariants = [...snapshot.discoveredVariants];
  state.nektarEarned = snapshot.nektarEarned;

  // Vertrag: keine Wiederherstellung laufender Entitäten — Vectors/Attraktoren sterben mit (TTL, vergänglich).
  state.enemies = [];
  state.projectiles = [];
  state.vectors = {};
  state.attractors = [];
  state.currentRoute = null;
  state.deployedBeetle = null;
  // R2: mapTiles wird hier BEWUSST NICHT angefasst — die Run-Kopie der Welt kommt
  // ausschließlich aus dem Welt-Snapshot (freshState). Das ResumeSave ist kein Weltspeicher.
}
