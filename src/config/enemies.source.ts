// Owner: Source (content truth). LOC ≤ 200.
// Enemy archetypes + deterministic wave schedule. Changing values here changes
// gameplay with zero code edits elsewhere (contract: SOURCE = CONTENT TRUTH).

import { makeRng } from '../core/rng';

/** DIE Gegner-Typ-Wahrheit. Vorher stand dieselbe Union an drei Stellen (hier, `state.ts#typeId`,
 *  `config/enemyGenome.source.ts`); ein neuer Archetyp hätte an zwei davon vergessen werden können.
 *  Jede Datei, die Gegner-Typen nennt, importiert diesen Typ. */
export type EnemyTypeId = 'grunt' | 'fast' | 'tank' | 'swarm' | 'boss';

export interface EnemySource {
  id: EnemyTypeId;
  hp: number;
  speed: number;      // cells per tick
  damage: number;     // lives lost when reaching the end
  reward: number;     // Nektar-/Score-Wert bei Tod (nektarEarned += floor(reward/5), Score += reward×Combo) — es gibt KEIN Energie-System
  scoreValue: number;
}

export const ENEMIES_SOURCE: Record<EnemySource['id'], EnemySource> = {
  // Q1 (QA 2026-09-17): Welle 1 tötete Erstspieler in ~15 s. Grunt-Durchbruch war mit 10
  // = halbes Leben — zwei Durchbrüche ware Game Over, bevor der Loop vermittelbar ist.
  // 4 ist vermittelbar (5 Durchbrüche), 40 HP lassen 3 Spross-Treffer zu (15 dmg).
  grunt: { id: 'grunt', hp: 40,  speed: 0.02,  damage: 4,   reward: 10,  scoreValue: 10 },
  fast:  { id: 'fast',  hp: 25,  speed: 0.045, damage: 5,   reward: 15,  scoreValue: 15 },
  tank:  { id: 'tank',  hp: 150, speed: 0.012, damage: 25,  reward: 30,  scoreValue: 30 },
  swarm: { id: 'swarm', hp: 15,  speed: 0.035, damage: 3,   reward: 5,   scoreValue: 5 },
  boss:  { id: 'boss',  hp: 800, speed: 0.008, damage: 100, reward: 150, scoreValue: 150 },
};

export interface WaveSpawnGroup {
  typeId: EnemySource['id'];
  count: number;
  delay: number; // ticks between spawns of this group
}

export interface WaveSchedule {
  waveNumber: number;
  groups: WaveSpawnGroup[];
  reward: number;
}

const WAVE_SEED_DOMAIN = 0x57415645; // 'WAVE'

/** Fully deterministic per (rootSeed, waveNumber). */
export function generateWaveSchedule(rootSeed: number, waveNumber: number): WaveSchedule {
  const rng = makeRng('wave', (rootSeed ^ Math.imul(waveNumber, WAVE_SEED_DOMAIN)) >>> 0);
  const groups: WaveSpawnGroup[] = [];

  // Q1: Welle 1 ist das Onboarding-Fenster — Minimal-Bau (Leih-Spross) muss überleben.
  // Ab Welle 2 wächst die Menge wie zuvor (4 + floor(n*1.5 + rand*3)).
  const gruntCount = waveNumber === 1
    ? 3
    : 4 + Math.floor(waveNumber * 1.5 + rng.next() * 3);
  groups.push({
    typeId: 'grunt',
    count: gruntCount,
    delay: Math.max(6, 18 - waveNumber),
  });
  if (waveNumber >= 3) {
    groups.push({ typeId: 'fast', count: 2 + Math.floor(waveNumber * 0.8), delay: Math.max(4, 12 - Math.floor(waveNumber / 2)) });
  }
  if (waveNumber >= 6) {
    groups.push({ typeId: 'tank', count: 1 + Math.floor(waveNumber / 5), delay: 20 });
  }
  if (waveNumber >= 9) {
    groups.push({ typeId: 'swarm', count: 4 + waveNumber * 2, delay: 2 });
  }
  if (waveNumber % 10 === 0) {
    groups.push({ typeId: 'boss', count: 1, delay: 40 });
  }

  const reward = 20 + waveNumber * 10;
  return { waveNumber, groups, reward };
}

export function waveEnemyCount(schedule: WaveSchedule): number {
  return schedule.groups.reduce((s, g) => s + g.count, 0);
}
