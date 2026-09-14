// Owner: WaveSystem (wave slice). LOC ≤ 300.
// Owns wave, waveTimer, spawn schedule, wave completion (contract Phase 4.6).

import type { SimState } from './state';
import { makeEvent, type GameEvent } from '../bus/events';
import { generateWaveSchedule, waveEnemyCount, type WaveSchedule } from '../config/enemies.source';
import { makeRng } from '../core/rng';

export class WaveSystem {
  private seq = 0;

  constructor(private emit: (e: GameEvent) => void) {}

  /** START_WAVE command handler. Returns false if wave can't start. */
  startWave(state: SimState): boolean {
    if (state.phase !== 'prep') return false;

    state.wave.number++;
    const schedule = generateWaveSchedule(state.seed, state.wave.number);
    state.wave.schedule = schedule;
    state.phase = 'wave';
    state.clock.waveTime = 0; // wave timer reset (clock slice write: wave-scoped)

    // flatten groups into a spawn queue, deterministically shuffled
    const queue: { typeId: string; delay: number }[] = [];
    for (const g of schedule.groups) {
      for (let i = 0; i < g.count; i++) queue.push({ typeId: g.typeId, delay: g.delay });
    }
    const shuffler = makeRng('wave', (state.seed ^ Math.imul(state.wave.number, 0x0BADF00D)) >>> 0);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = shuffler.nextInt(0, i);
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    state.wave.spawnQueue = queue;
    state.wave.lastSpawnTick = state.clock.tick;

    this.emit(makeEvent(state.clock.tick, 'WAVE_STARTED', 'system:wave', ++this.seq, {
      wave: state.wave.number, enemyCount: waveEnemyCount(schedule),
    }));
    return true;
  }

  /** Spawn due enemies. Returns spawned entities for wiring (id list). */
  update(state: SimState): { typeId: string; index: number }[] {
    const spawned: { typeId: string; index: number }[] = [];
    if (state.phase !== 'wave') return spawned;
    if (state.wave.spawnQueue.length === 0) return spawned;

    const next = state.wave.spawnQueue[0];
    if (state.clock.tick - state.wave.lastSpawnTick >= next.delay) {
      spawned.push({ typeId: next.typeId, index: state.wave.number * 10000 + (state.wave.spawnQueue.length) });
      state.wave.spawnQueue.shift();
      state.wave.lastSpawnTick = state.clock.tick;
    }
    return spawned;
  }

  /** Wave completion check. Returns reward if a wave just completed, else null. */
  checkCompletion(state: SimState): number | null {
    if (state.phase !== 'wave') return null;
    if (state.wave.spawnQueue.length > 0) return null;
    if (state.enemies.length > 0) return null;

    const reward = state.wave.schedule?.reward ?? 0;
    state.phase = 'prep';
    this.emit(makeEvent(state.clock.tick, 'WAVE_COMPLETED', 'system:wave', ++this.seq, {
      wave: state.wave.number, reward,
    }));
    return reward;
  }

  /** Current schedule accessor (pre-generation for UI previews). */
  peekSchedule(rootSeed: number, waveNumber: number): WaveSchedule {
    return generateWaveSchedule(rootSeed, waveNumber);
  }
}
