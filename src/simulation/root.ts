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
import { MapSystem } from './mapSystem';
import { executeCommand, type CommandContext } from './rootCommands';
import { freshState } from './pipeline';
import { routeQuality } from './mapSystem';
import { CYCLE_TICKS } from '../core/clock';

/** E2 (A12): Catch-up-Klemme — max. nachgeholte Ticks pro Frame (Rest wird verworfen). */
const MAX_TICKS_PER_FRAME = 40; // Runaway-Schutz: über dem B32-Tempo-Vertrag (40 Ticks/Aufruf bei ×1) — alles darüber verfällt

export interface RootInit {
  seed: number;
  /** Authoritative run identity (mirrors MetaSave.runId). Defaults 0. */
  runId?: number;
  /** Carried bred variants (placeable in-run — B1 fixes the severed breeding loop). */
  loadout?: string[];
  /** B37: Besitz-Wahrheit — Run-Inventar spiegelt GENAU `ownedCounts` (Meta.variantCounts); nie mehr als besessen.
   *  Fehlt der Eintrag (Altsave/Tests ohne Meta): B1-Fallback je Loadout-Eintrag `loadoutStock` (Default 2). */
  ownedCounts?: Record<string, number>;
  /** B1-Fallback-Stückzahl je Loadout-Eintrag, wenn kein Besitz übergeben wird (Default 2). */
  loadoutStock?: number;
  /** Stats for carried bred variants (genome-derived at breeding time). */
  bredStats?: NonNullable<SimState['bredStats']>;
  /** P6: gezüchtete Specimen für den Brutling-Einsatz im Run. */
  beetles?: import('../types').BeetleSpecimen[];
  /** B2: gespeicherter Run-Zustand (Resume startet in `prep`, ohne Gegner/Projektile). */
  resume?: import('./resume').ResumeSnapshot;
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
  private map: MapSystem;
  private eventLog: GameEvent[] = [];
  /** Kill-Verwertung separat vom (öffentlichen) Event-Log — Reihenfolge-stabil, kein Log-Scraping. */
  private pendingKills: Extract<GameEvent, { type: 'ENEMY_DIED' }>[] = [];
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
    this.map = new MapSystem(e => this.publish(e));
  }

  private publish(e: GameEvent): void {
    if (e.type === 'ENEMY_DIED') this.pendingKills.push(e);
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
    // Sim-Tempo (B32): die Uhr multipliziert — die Tick-Schwelle und die Pipeline bleiben unverändert.
    this.accumulator += realMs * this.clock.get().speed;
    let executed = 0;
    // E2 (Audit A12): Catch-up-Klemme — max MAX_TICKS_PER_FRAME je Frame, Rest verworfen (Frame-Spike-Schutz).
    while (this.accumulator >= TICK_MS && executed < this.maxTicksThisFrame()) {
      this.accumulator -= TICK_MS;
      this.stepOnce();
      executed++;
    }
    if (this.accumulator > TICK_MS) this.accumulator = 0; // Rückstand verfällt, kein Schuldenlauf
    return executed;
  }

  /** Sim-Tempo ×1–×4 (UI-Eingang; Wahrheit liegt in der Uhr, deterministisch im Snapshot). */
  setSpeed(multiplier: number): void { this.clock.setSpeed(multiplier); }
  get speed(): number { return this.clock.speed; }

  /**
   * E2-Klemme, tempo-skaliert: bei ×1 begrenzt sie den Frame-Burst (max 40 Ticks je Aufruf),
   * ×4 darf die vertragliche Beschleunigung nicht durch die Klemme verlieren (B32-Tempo-Test).
   */
  private maxTicksThisFrame(): number { return MAX_TICKS_PER_FRAME * Math.max(1, this.clock.speed); }

  /** Execute exactly one deterministic simulation tick. */
  stepOnce(): void {
    const state = this.state;

    // 0) Game Over friert den Run am Owner ein (P1): Clock stoppt, Commands werden verworfen,
    //    Systeme ruhen. Die UI zeigt das Ende — die Sim vollstreckt es.
    if (state.phase === 'gameover') {
      this.commands.clear();
      this.clearEventLog();
      return;
    }

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
      const cycle = Math.floor(state.clock.tick / (CYCLE_TICKS * 2));
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

      // P6: Brutling kämpft mit (gleiche Kampfpfade, ein Writer für den Slice)
      this.enemies.updateBeetle(state);

      // combo scoring: kills handled via ENEMY_DIED events below
    } else if (state.phase === 'prep') {
      this.plants.healTick(state);
      this.waves.maybeAutoStart(state);
    }

    // 4) react to kills (score + combo) — authoritative consumers of ENEMY_DIED.
    //    Consumed from pendingKills (private buffer), NOT via eventLog.filter: external
    //    readers of getEventLog()/late side effects can never double-count or drop kills.
    const killEvents = this.pendingKills;
    this.pendingKills = [];
    for (const e of killEvents) {
      // combo multiplier applies to score (Defect A4-2) — energy stays flat by design
      this.score.onEnemyDied(state, e.payload.enemyId, e.payload.reward, e.payload.reward * state.combo.multiplier, e.payload.px, e.payload.py);
      this.combo.registerKill(state);
    }
    this.clearEventLog();

    // 4b) chain effect (B6): kills by chain plants arc 50% damage to the nearest enemy.
    //     Kills published here land in the fresh pendingKills → processed next tick (deferred, deterministic).
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

    // 6) game over (der Game-Over-Freeze oben greift ab dem nächsten Tick — P1)
    // B36: Die EINZIGE Niederlage-Bedingung ist lives <= 0 (Leaks am Wegende). Der Payload
    // trägt die Ursache — der K.O.-Screen sagt sie, statt den Spieler im Unklaren zu lassen.
    if (state.lives <= 0) {
      state.phase = 'gameover';
      this.publish({
        eventId: `${state.clock.tick}:system:run:GAME_OVER:0`,
        tick: state.clock.tick,
        type: 'GAME_OVER',
        sourceId: 'system:run',
        version: 1,
        payload: { wave: state.wave.number, score: state.score, reason: 'lives_depleted' },
      });
    }
  }

  // ── Commands (Interpretation ausgelagert: rootCommands.ts, Regel 1 Split) ──
  private handleCommand(state: SimState, cmd: Command): void {
    executeCommand(this.commandContext(), state, cmd);
  }

  private commandContext(): CommandContext {
    return {
      plants: this.plants, enemies: this.enemies, map: this.map, waves: this.waves,
      publish: (e) => this.publish(e),
      recomputeRoute: (s) => this.recomputeRoute(s),
      nextSeq: () => ++this.rejectSeq,
    };
  }

  // ── State access ────────────────────────────────────────────
  /** Defensive Kopie — der autoritative SimState verlässt NIE diese Klasse als Referenz. */
  getSnapshot(): SimState {
    return structuredClone(this.state);
  }

  /** P5: Route aus dem Map-Grid ableiten und an EnemySystem geben (Fallback: null = DEFAULT).
   * Ohne eigene Tiles gilt der gestaltete DEFAULT-Pfad (Terrain-Weg) — das leere
   * Spielfeld ist bereits gestaltet; erst Platzierungen lenken den Laufweg um. */
  private recomputeRoute(state: SimState): void {
    const hasTiles = Object.keys(state.mapTiles).length > 0;
    const route = hasTiles ? this.map.computeRoute(state) : null;
    // B16.1: die Route lebt NUR im State (Ein-Writer); EnemySystem liest sie pro Tick aus dem State —
    // keine zweite Kopie im System mehr (A14: getRoute/setRoute gestorben).
    state.currentRoute = route;
    // AP2 (M1): Route-Qualität hat jetzt einen Writer — der Payload trägt den echten Wert
    // (1 = gerade Route, kleiner = Maze erzwingt Umwege), statt dass die Observation `null` liefert.
    // M5: keine Route trotz Tiles = zugebaut — der Default-Pfad greift, und DAS wird gemeldet
    // (gestern noch unsichtbar: der Fallback lief stillschweigend durch Wände).
    this.publish({
      eventId: `${state.clock.tick}:system:map:ROUTE_CHANGED:${++this.rejectSeq}`,
      tick: state.clock.tick,
      type: 'ROUTE_CHANGED',
      sourceId: 'system:map',
      version: 1,
      payload: { waypoints: route?.length ?? 0, quality: routeQuality(route), blocked: hasTiles && route === null },
    });
  }

  /** Tiefkopie des Debug-Logs — auch die Event-Objekte teilen keine Referenz mit der Sim. */
  getEventLog(): readonly GameEvent[] {
    return structuredClone(this.eventLog);
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  /** Build a fresh deterministic state for a run — Fabrik lebt in pipeline.ts (E3-Split). */
  private freshState(seed: number, init: RootInit): SimState {
    return freshState(seed, init, this.clock);
  }
}

export { makeCommand };
