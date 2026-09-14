// Owner: SimulationRoot. LOC ≤ 300.
// The deterministic step function: drain commands → advance clock → run systems → emit events.
// This is the ONLY place systems are wired together.

import type { SimState } from './state';
import { GameClock } from '../core/clock';
import { EventBus } from '../bus/bus';
import { CommandQueue, makeCommand, type Command } from '../bus/commands';
import type { GameEvent } from '../bus/events';
import { PlantSystem, resolvePlantStats } from './plantSystem';
import { EnemySystem } from './enemySystem';
import { ProjectileSystem } from './projectileSystem';
import { ScoreSystem } from './scoreSystem';
import { ComboSystem } from './comboSystem';
import { WaveSystem } from './waveSystem';
import { STARTING_INVENTORY } from '../config/plants.source';

export interface RootInit {
  seed: number;
}

export class SimulationRoot {
  readonly bus = new EventBus();
  readonly commands = new CommandQueue();
  readonly clock = new GameClock();

  private state: SimState;
  private plants: PlantSystem;
  private enemies: EnemySystem;
  private projectiles: ProjectileSystem;
  private score: ScoreSystem;
  private combo: ComboSystem;
  private waves: WaveSystem;
  private eventLog: GameEvent[] = [];

  constructor(init: RootInit) {
    this.state = this.freshState(init.seed);

    this.plants = new PlantSystem(e => this.publish(e));
    this.enemies = new EnemySystem(e => this.publish(e));
    this.projectiles = new ProjectileSystem(e => this.publish(e), (s, id, amt) => this.enemies.applyDamage(s, id, amt));
    this.score = new ScoreSystem(e => this.publish(e));
    this.combo = new ComboSystem(e => this.publish(e));
    this.waves = new WaveSystem(e => this.publish(e));

    this.enemies.reseed(init.seed);
  }

  private publish(e: GameEvent): void {
    this.eventLog.push(e);
    this.bus.publish(e);
  }

  /** Advance by real ms (frames); fixed-step accumulator executes 0..n ticks. */
  advance(realMs: number): number {
    return this.clock.advance(realMs);
  }

  /** Execute exactly one deterministic simulation tick. */
  stepOnce(): void {
    const state = this.state;

    // 1) drain commands
    for (const cmd of this.commands.drain()) {
      this.handleCommand(state, cmd);
    }

    // 2) advance clock
    this.clock.step();

    // 3) systems in fixed order (determinism)
    this.combo.update(state);

    if (state.phase === 'wave') {
      for (const s of this.waves.update(state)) {
        this.enemies.spawn(state, s.typeId, s.index);
      }

      const leaked = this.enemies.update(state);
      if (leaked > 0) {
        state.lives = Math.max(0, state.lives - leaked);
      }

      this.plants.update(state, (plant, target, damage) => {
        const stats = resolvePlantStats(state, plant.variantId);
        // v1: pierce from EFFECT_PIERCE tag; full effect pipeline arrives in Phase 5/6
        const pierce = stats && plant.variantId === 'sprout' ? 2 : 0;
        this.projectiles.fire(state, plant, target, damage, pierce);
      });
      this.projectiles.update(state);

      // combo scoring: kills handled via ENEMY_DIED events below
    } else if (state.phase === 'prep') {
      this.plants.healTick(state);
      this.score.prepDrip(state);
    }

    // 4) react to kills (score + combo) — authoritative consumers of ENEMY_DIED
    for (const e of this.eventLog) {
      if (e.type === 'ENEMY_DIED') {
        const enemy = state.enemies.find(x => x.id === e.payload.enemyId);
        const scoreValue = e.payload.reward; // v1: score == reward value
        this.score.onEnemyDied(state, e.payload.enemyId, e.payload.reward, scoreValue, e.payload.px, e.payload.py);
        this.combo.registerKill(state);
        void enemy;
      }
    }
    this.clearEventLog();

    // 5) wave completion (only while still alive)
    if (state.phase === 'wave' && state.lives > 0) {
      const reward = this.waves.checkCompletion(state);
      if (reward !== null) {
        this.score.grantWaveReward(state, state.wave.number, reward);
      }
    }

    // 6) game over
    if (state.lives <= 0 && state.phase !== 'gameover') {
      state.phase = 'gameover';
      this.publish({
        eventId: `${state.clock.tick}:system:run:GAME_OVER:0`,
        tick: state.clock.tick,
        type: 'GAME_OVER',
        sourceId: 'system:run',
        version: 1,
        payload: { wave: state.wave.number, score: state.score },
      });
    }
  }

  // ── Commands ────────────────────────────────────────────────
  private handleCommand(state: SimState, cmd: Command): void {
    switch (cmd.type) {
      case 'PLACE_PLANT':
        this.plants.place(state, cmd.payload.variantId, cmd.payload.gx, cmd.payload.gy);
        break;
      case 'REMOVE_PLANT':
        this.plants.remove(state, cmd.payload.plantId);
        break;
      case 'START_WAVE':
        this.waves.startWave(state);
        break;
      case 'SELECT_PLANT':
      case 'CANCEL_PLACEMENT':
      case 'INSPECT':
      case 'BREED_PLANTS':
        // UI-level concerns handled outside the deterministic sim (Phase 15/22)
        break;
    }
  }

  // ── State access ────────────────────────────────────────────
  getSnapshot(): SimState {
    return this.state;
  }

  getEventLog(): readonly GameEvent[] {
    return this.eventLog;
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  /** Build a fresh deterministic state for a run. */
  private freshState(seed: number): SimState {
    const inventory: Record<string, number> = { ...STARTING_INVENTORY };
    return {
      seed,
      clock: this.clock.get() as SimState['clock'],
      phase: 'prep',
      wave: { number: 0, schedule: null, spawnQueue: [], lastSpawnTick: 0 },
      resources: { energy: 150 },
      lives: 20,
      inventory,
      discoveredVariants: Object.keys(STARTING_INVENTORY),
      plants: [],
      enemies: [],
      projectiles: [],
      score: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      nektarEarned: 0,
      runCounter: 0,
      counters: { enemy: 0, plant: 0, projectile: 0 },
    };
  }
}

export { makeCommand };
