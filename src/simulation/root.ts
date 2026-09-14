// Owner: SimulationRoot. LOC ≤ 300.
// The deterministic step function: drain commands → advance clock → run systems → emit events.
// This is the ONLY place systems are wired together.

import type { SimState } from './state';
import { GameClock, TICK_MS } from '../core/clock';
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
import { makePlacementRejected } from '../bus/commands';

export interface RootInit {
  seed: number;
  /** Authoritative run identity (mirrors MetaSave.runId). Defaults 0. */
  runId?: number;
  /** Carried bred variants (placeable in-run — B1 fixes the severed breeding loop). */
  loadout?: string[];
  /** Stats for carried bred variants (genome-derived at breeding time). */
  bredStats?: NonNullable<SimState['bredStats']>;
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
  private accumulator = 0;
  private rejectSeq = 0;

  constructor(init: RootInit) {
    this.state = this.freshState(init.seed, init);

    this.plants = new PlantSystem(e => this.publish(e));
    const enemies = new EnemySystem(e => this.publish(e));
    this.enemies = enemies;
    this.projectiles = new ProjectileSystem(
      e => this.publish(e),
      (s: SimState, id: string, amt: number, crit: boolean, eff: string | null, src: string | null) => enemies.applyDamage(s, id, amt, crit, eff, src)
    );
    this.score = new ScoreSystem(e => this.publish(e));
    this.combo = new ComboSystem(e => this.publish(e));
    this.waves = new WaveSystem(e => this.publish(e));

  }

  private publish(e: GameEvent): void {
    this.eventLog.push(e);
    this.bus.publish(e);
  }

  /**
   * Advance by real ms (frame timing); fixed-step accumulator executes 0..n ticks.
   * THE one frame entry point — each executed tick runs the full stepOnce() pipeline
   * (commands → clock → systems → events). Clock.advance() is NOT used here: it would
   * advance time without running any system (the silent-sim defect, QUALITY_SPEC A0).
   */
  advance(realMs: number): number {
    this.accumulator += realMs;
    let executed = 0;
    while (this.accumulator >= TICK_MS) {
      this.accumulator -= TICK_MS;
      this.stepOnce();
      executed++;
    }
    return executed;
  }

  /** Execute exactly one deterministic simulation tick. */
  stepOnce(): void {
    const state = this.state;

    // 1) drain commands
    for (const cmd of this.commands.drain()) {
      this.handleCommand(state, cmd);
    }

    // 2) advance clock + publish day/night transitions (Defect A4-4: producer lives here,
    //    the Clock itself cannot own the bus)
    const prevPhase = state.clock.phase;
    this.clock.step();
    const nowPhase = state.clock.phase;
    if (prevPhase !== nowPhase) {
      const cycle = Math.floor(state.clock.tick / 4800);
      this.publish(nowPhase === 'night'
        ? { eventId: `${state.clock.tick}:system:clock:NIGHT_STARTED:${cycle}`, tick: state.clock.tick, type: 'NIGHT_STARTED', sourceId: 'system:clock', version: 1, payload: { cycle } }
        : { eventId: `${state.clock.tick}:system:clock:DAY_STARTED:${cycle}`, tick: state.clock.tick, type: 'DAY_STARTED', sourceId: 'system:clock', version: 1, payload: { cycle } });
    }

    // 3) systems in fixed order (determinism)
    this.plants.tickLifecycle(state);
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
        if (!stats) return;
        // B6: effect-driven combat — pierce and crit come from the variant's EFFECT tags
        const pierce = stats.effects.includes('EFFECT_PIERCE') ? 2 : 0;
        const critChance = stats.effects.includes('EFFECT_CRIT') ? 0.2 : 0;
        this.projectiles.fire(state, plant, target, damage, pierce, stats.effects[0] ?? null, critChance);
      });
      this.projectiles.update(state);
      this.enemies.applyStatusTicks(state);

      // combo scoring: kills handled via ENEMY_DIED events below
    } else if (state.phase === 'prep') {
      this.plants.healTick(state);
      this.score.prepDrip(state);
      this.waves.maybeAutoStart(state);
    }

    // 4) react to kills (score + combo) — authoritative consumers of ENEMY_DIED.
    const killEvents = this.eventLog.filter(e => e.type === 'ENEMY_DIED');
    for (const e of killEvents) {
      // combo multiplier applies to score (Defect A4-2) — energy stays flat by design
      this.score.onEnemyDied(state, e.payload.enemyId, e.payload.reward, e.payload.reward * state.combo.multiplier, e.payload.px, e.payload.py);
      this.combo.registerKill(state);
    }
    this.clearEventLog();

    // 4b) chain effect (B6): kills by chain plants arc 50% damage to the nearest enemy
    for (const e of killEvents) {
      const plant = e.payload.killerPlantId
        ? state.plants.find(p => p.id === e.payload.killerPlantId) : null;
      if (!plant) continue;
      const stats = resolvePlantStats(state, plant.variantId);
      if (!stats || !stats.effects.includes('EFFECT_CHAIN')) continue;
      this.enemies.chainFrom(state, e.payload.px, e.payload.py, 50, 2);
    }

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
      case 'PLACE_PLANT': {
        const r = this.plants.place(state, cmd.payload.variantId, cmd.payload.gx, cmd.payload.gy);
        if (!r.ok) {
          // Rejections are EVENTS, not silence (Defect: stilles Scheitern — UI/FX hängen am Bus)
          this.publish(makePlacementRejected(state.clock.tick, ++this.rejectSeq, cmd.payload.gx, cmd.payload.gy, r.reason));
        }
        break;
      }
      case 'REMOVE_PLANT':
        this.plants.remove(state, cmd.payload.plantId);
        break;
      case 'START_WAVE':
        this.waves.startWave(state);
        break;
      case 'FERTILIZE_PLANT': {
        const r = this.plants.fertilize(state, cmd.payload.plantId);
        if (!r.ok) {
          this.publish({
            eventId: `${state.clock.tick}:system:plant:FERTILIZE_REJECTED:${++this.rejectSeq}`,
            tick: state.clock.tick,
            type: 'FERTILIZE_REJECTED',
            sourceId: 'system:plant',
            version: 1,
            payload: { plantId: cmd.payload.plantId, reason: r.reason },
          });
        }
        break;
      }
      case 'PROPAGATE_PLANT': {
        const r = this.plants.propagate(state, cmd.payload.plantId);
        if (!r.ok) {
          this.publish({
            eventId: `${state.clock.tick}:system:plant:PROPAGATE_REJECTED:${++this.rejectSeq}`,
            tick: state.clock.tick,
            type: 'PROPAGATE_REJECTED',
            sourceId: 'system:plant',
            version: 1,
            payload: { plantId: cmd.payload.plantId, reason: r.reason },
          });
        }
        break;
      }
      case 'SELECT_PLANT':
      case 'CANCEL_PLACEMENT':
      case 'INSPECT':
      case 'BREED_PLANTS':
        // UI-level concerns handled outside the deterministic sim
        break;
      default: {
        const _exhaustive: never = cmd as never;
        void _exhaustive;
        break;
      }
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
  private freshState(seed: number, init: RootInit): SimState {
    const inventory: Record<string, number> = { ...STARTING_INVENTORY };
    const loadout = (init.loadout ?? []).filter(id =>
      !Object.prototype.hasOwnProperty.call(STARTING_INVENTORY, id));
    for (const id of loadout) inventory[id] = (inventory[id] ?? 0) + 2;
    const discovered = [...Object.keys(STARTING_INVENTORY), ...loadout];
    return {
      seed,
      runId: init.runId ?? 0,
      loadout,
      clock: this.clock.get() as SimState['clock'],
      phase: 'prep',
      wave: { number: 0, schedule: null, spawnQueue: [], lastSpawnTick: 0, prepStartTick: this.clock.get().tick },
      resources: { energy: 150, coins: 0 },
      lives: 20,
      inventory,
      bredStats: init.bredStats ? { ...init.bredStats } : undefined,
      discoveredVariants: discovered,
      plants: [],
      enemies: [],
      projectiles: [],
      score: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      nektarEarned: 0,
      counters: { enemy: 0, plant: 0, projectile: 0 },
    };
  }
}

export { makeCommand };
