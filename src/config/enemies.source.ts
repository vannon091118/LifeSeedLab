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
  // Zwei getrennte Achsen (kein Duplikat): `reward` speist den Nektar-Anteil
  // (`nektarEarned += floor(reward/5)`), `scoreValue` den Score (`state.score += scoreValue`,
  // combo-multipliziert). Es gibt KEIN Energie-System. Beide Werte sind heute zahlenidentisch —
  // das ist Content-Stand, keine Regel: sie dürfen sich trennen, ohne dass Code folgt.
  reward: number;
  scoreValue: number;
  /** P-26 (Entscheidung des Eigentümers, 20.09.2026): bleibt der Gegner an einer Pflanze
   *  stehen und frisst sie (`ENEMY_BITE`), statt weiterzuziehen. Die Wurzelmauer hält damit
   *  auf und zahlt per EFFECT_REFLECT zurück. TRUE nur für Tank und Boss: eine erste Fassung
   *  mit fressenden Grunts machte das Frühspiel unspielbar (Game Over in Welle 2). */
  stopsToEat: boolean;
}

/** Der Biss der Gegner auf PFLANZEN (P-26) und der Gegenzahn auf den Brutling (P6):
 *  ein Content-Objekt, damit Balance keine Code-Edits braucht. Gemessen (Seed 555010,
 *  Tank an der Mauer): Devlog 22 — die EINE Zahlenquelle dieser Mechanik. */
export const ENEMY_BITE = {
  /** Schaden je Biss auf die Pflanze. */
  damage: 10,
  /** Anteil des Gegner-Schadens, den der Brutling pro Gegenzahn nimmt (P6, vorher 0.2/0.1
   *  als Literale im Code — der Mit-Brutling nimmt die Hälfte). */
  share: 0.2,
  /** Biss-Kadenz in Ticks (alle 30 Ticks = 1 s). */
  cooldownTicks: 30,
  /** Biss-Reichweite in Zellen (Zellmitte zu Gegnerposition). */
  reach: 1.05,
} as const;

export const ENEMIES_SOURCE: Record<EnemySource['id'], EnemySource> = {
  // Q1 (QA 2026-09-17): Welle 1 tötete Erstspieler in ~15 s. Grunt-Durchbruch war mit 10
  // = halbes Leben — zwei Durchbrüche ware Game Over, bevor der Loop vermittelbar ist.
  // 4 ist vermittelbar (5 Durchbrüche), 40 HP lassen 3 Spross-Treffer zu (15 dmg).
  grunt: { id: 'grunt', hp: 40,  speed: 0.02,  damage: 4,   reward: 10,  scoreValue: 10,  stopsToEat: false },
  fast:  { id: 'fast',  hp: 25,  speed: 0.045, damage: 5,   reward: 15,  scoreValue: 15,  stopsToEat: false },
  tank:  { id: 'tank',  hp: 150, speed: 0.012, damage: 25,  reward: 30,  scoreValue: 30,  stopsToEat: true },
  swarm: { id: 'swarm', hp: 15,  speed: 0.035, damage: 3,   reward: 5,   scoreValue: 5,   stopsToEat: false },
  boss:  { id: 'boss',  hp: 800, speed: 0.008, damage: 100, reward: 150, scoreValue: 150, stopsToEat: true },
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
