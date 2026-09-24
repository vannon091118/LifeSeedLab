// Owner: SimulationRoot. LOC ≤ 300.
// The deterministic step function: drain commands → advance clock → run systems → emit events.
// This is the ONLY place systems are wired together. Die SCHUSS-Auflösung (Blitz-Ableiter,
// Projektilstart, Vector-Deposit) wohnt in plantShot.ts (Regel-1-Split) — hier bleibt allein die
// Verdrahtung und ihre Reihenfolge.

import type { SimState } from './state';
import { GameClock, TICK_MS } from '../core/clock';
import { EventBus } from '../bus/bus';
import { CommandQueue, makeCommand, type Command } from '../bus/commands';
import type { GameEvent } from '../bus/events';
import { resetIds } from '../core/ids';
import { PlantSystem } from './plantSystem';
import { EnemySystem } from './enemySystem';
import { ProjectileSystem } from './projectileSystem';
import { VectorSystem } from './vectorSystem';
import { VectorAttractor } from './vectorAttractor';
import { resolvePlantShot, type ShotPorts } from './plantShot';
import { ScoreSystem } from './scoreSystem';
import { ComboSystem } from './comboSystem';
import { WaveSystem } from './waveSystem';
import { MapSystem } from './mapSystem';
import type { MapTileType } from '../config/map.source';
import { executeCommand, type CommandContext } from './rootCommands';
import { reactToKills, chainAftermath } from './killReactor';
import { freshState } from './pipeline';
import { routeWalkTiles, routeIdealTiles } from './mapSystem';
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
  /** #4: gekaufter Bau-Vorrat (Shop) — wird dem Source-Startbestand ZUGESCHLAGEN. Der freie
   *  Mapbuilder ist der Kern des Spiels: der Run startet nie ohne Material, und der Shop
   *  erweitert den Vorrat außerhalb des Runs. */
  materialStock?: Record<string, number>;
  /** Stats for carried bred variants (genome-derived at breeding time). */
  bredStats?: NonNullable<SimState['bredStats']>;
  /** P6: gezüchtete Specimen für den Brutling-Einsatz im Run. */
  beetles?: import('../types').BeetleSpecimen[];
  /** B2: gespeicherter Run-Zustand (Resume startet in `prep`, ohne Gegner/Projektile). */
  resume?: import('./resume').ResumeSnapshot;
  /**
   * R2: Die persistente Welt des Spielers als Run-Snapshot — PFLICHTFELD.
   * Ein Run ohne Welt ist ein Vertragsbruch (stiller Default = der alte Fehler:
   * „persistente nirgendwo“). freshState wirft ohne dieses Feld fail-closed.
   */
  worldSnapshot: import('../world/world_state').WorldSnapshot;
}

export class SimulationRoot {
  readonly bus = new EventBus();
  readonly commands = new CommandQueue();
  readonly clock = new GameClock();

  private state: SimState;
  private plants: PlantSystem;
  private enemies: EnemySystem;
  private projectiles: ProjectileSystem;
  private vectors: VectorSystem;
  private attractors: VectorAttractor;
  private score: ScoreSystem;
  private combo: ComboSystem;
  private waves: WaveSystem;
  private map: MapSystem;
  /** Die Writer, die ein Pflanzenschuss braucht — einmal gebaut, nie pro Schuss allokiert. */
  private readonly shotPorts: ShotPorts;
  private eventLog: GameEvent[] = [];
  /** Kill-Verwertung separat vom (öffentlichen) Event-Log — Reihenfolge-stabil, kein Log-Scraping. */
  private pendingKills: Extract<GameEvent, { type: 'ENEMY_DIED' }>[] = [];
  private accumulator = 0;
  private rejectSeq = 0;

  constructor(init: RootInit) {
    // RUN-START-RESET der ID-Zähler (Verständnis-QA v0.0.55, T1/BUG 1): `nextId(kind)` zählt
    // prozess-global. Ohne diesen Reset hing die Entity-ID — und damit der State-Hash über
    // `snapshot.toHashable` — davon ab, wie viele Entitäten dieser PROZESS schon erzeugt hatte:
    // zwei identische Runs im selben Tab ergaben plant-0010 vs plant-0011 und damit verschiedene
    // Hashes. Jetzt gilt der dokumentierte Vertrag wieder prozessübergreifend (architecture.md:
    // "gleicher Seed + gleiche Commands = identischer State-Hash").
    //
    // Grenze, bewusst hier benannt: genau EINE lebende Simulation je Prozess (produktiv der
    // Fall — `gameRuntime` konstruiert den Root einmalig). Wer je zwei gleichzeitig laufen lässt
    // (z. B. ein Ghost-Map-Replay), darf NICHT diesen Reset nutzen, sondern `nextScopedId(runId,
    // kind, seq)` — der laufgebundene Pfad liegt dafür schon in `core/ids.ts`.
    resetIds();
    this.state = this.freshState(init.seed, init);
    this.plants = new PlantSystem(e => this.publish(e));
    const enemies = new EnemySystem(e => this.publish(e));
    this.enemies = enemies;
    this.projectiles = new ProjectileSystem(
      e => this.publish(e),
      (s: SimState, id: string, amt: number, crit: boolean, eff: string | null, src: string | null) => enemies.applyDamage(s, id, amt, crit, eff, src),
      (s: SimState, id: string, eff: string | null) => enemies.applyEffect(s, id, eff)
    );
    this.vectors = new VectorSystem();
    this.attractors = new VectorAttractor();
    this.score = new ScoreSystem(e => this.publish(e));
    this.combo = new ComboSystem(e => this.publish(e));
    this.waves = new WaveSystem(e => this.publish(e));
    this.map = new MapSystem(e => this.publish(e));
    // P-29: Wellenwechsel-Reset der Wellen-Combo — EIN Writer (ComboSystem), EIN Draht (hier,
    // der einzigen Verdrahtungsstelle). Das Reset läuft VOR den Kills der neuen Welle:
    // WAVE_STARTED wird in waves.update emittiert, die Kills des neuen Schedule kommen danach.
    this.bus.subscribe('WAVE_STARTED', () => this.combo.onWaveStarted(this.state));
    this.shotPorts = { vectors: this.vectors, attractors: this.attractors, projectiles: this.projectiles, enemies };
    // R2: RUN-START — die erste Route wird aus dem Welt-Snapshot abgeleitet (Vertrag:
    // Neuberechnung bei Run-Start, jedem Bau und jedem Wellenbeginn). Die UI/Terrain
    // sehen damit ab dem ersten Bild das echte Pathfinding-Ergebnis, nie einen Default.
    this.recomputeRoute(this.state);
  }

  private publish(e: GameEvent): void {
    if (e.type === 'ENEMY_DIED') this.pendingKills.push(e);
    this.eventLog.push(e);
    this.bus.publish(e);
  }

  /**
   * Read-only Frage der Vorschau: würde dieser Bau den letzten freien Weg schließen?
   * Die Regel bleibt im Map-Owner (`MapSystem.wouldClosePath` — dieselbe wie `placeTile`);
   * dieser Zugang existiert nur, weil die Presentation den Root hält und sonst nichts schreibt.
   * Kein Event, keine Mutation, kein RNG — fragen ist keine Spielentscheidung.
   */
  wouldClosePath(gx: number, gy: number, tile: MapTileType): boolean {
    return this.map.wouldClosePath(this.state, gx, gy, tile);
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

      // Schuss-Auflösung: ein Aufruf je Schuss in einem eigenen Modul (plantShot.ts) — die
      // Reihenfolge im Inneren ist dort vertraglich festgehalten und bit-identisch zur alten
      // Pipeline (Blitz-Ableiter → Projektile/Deposits).
      this.plants.update(state, (plant, target, damage) =>
        resolvePlantShot(state, this.shotPorts, plant, target, damage));
      this.projectiles.update(state);
      this.vectors.update(state);
      this.attractors.update(state);
      this.enemies.applyStatusTicks(state);

      // P-26: Biss → Reflex. Kein System ruft ein System: biteIntents liefert reine Absichten,
      // receiveBite ist der Writer der Pflanzen, und der Reflex geht über applyDamage —
      // denselben Pfad wie ein Pflanzenschuss (quelle: die beißende Pflanze).
      for (const intent of this.enemies.biteIntents(state)) {
        const res = this.plants.receiveBite(state, intent.plantId, intent.amount);
        if (res.reflect > 0) {
          this.enemies.applyDamage(state, intent.enemyId, res.reflect, false, null, intent.plantId);
        }
      }

      // Heil-Aura wirkt im KAMPF: Wunden entstehen durch Bisse (P-26). Vorher lief sie nur
      // im prep — wo es nie Wunden gab, deshalb „Myzel macht nichts“ (Spieltest-Befund).
      this.plants.healTick(state);

      // P6: Brutling kämpft mit (gleiche Kampfpfade, ein Writer für den Slice)
      this.enemies.updateBeetle(state);

      // combo scoring: kills handled via ENEMY_DIED events below
    } else if (state.phase === 'prep') {
      this.waves.maybeAutoStart(state);
    }

    // 4) react to kills (score + combo) — authoritative consumers of ENEMY_DIED.
    //    Consumed from pendingKills (private buffer), NOT via eventLog.filter: external
    //    readers of getEventLog()/late side effects can never double-count or drop kills.
    //    Die REAKTION wohnt in killReactor.ts (Regel-1-Split); root bleibt alleiniger Draht
    //    und hält die Reihenfolge als Vertrag: Kills → Log-Reset → Chain (bit-identisch).
    const killEvents = this.pendingKills;
    this.pendingKills = [];
    reactToKills(state, killEvents, { score: this.score, combo: this.combo, enemies: this.enemies });
    this.clearEventLog();
    chainAftermath(state, killEvents, this.enemies);

    // 5) wave completion (only while still alive)
    if (state.phase === 'wave' && state.lives > 0) {
      const reward = this.waves.checkCompletion(state);
      if (reward !== null) {
        this.score.grantWaveReward(state, state.wave.number, reward, state.combo.waveBestMult);
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

  private get vectorSystem(): VectorSystem { return this.vectors; }
  private get attractorSystem(): VectorAttractor { return this.attractors; }

  // ── Vector-Emissions-Naht (Phase 5) ───────────────────────────
  // Produzenten (Pflanze/Projektil, später Käfer-Aura) und die Gate-Tests brauchen denselben
  // Weg in den EINEN Vector-Writer — der Live-State verlässt den Root nie. Deposit mutiert
  // nur Flags (kein RNG, kein Event) und wird ZWISCHEN Ticks gerufen; die Tick-Reihenfolge
  // in stepOnce bleibt der einzige Motor.
  private vectorDeposit(gx: number, gy: number, vectorId: string, intensity: number): void {
    this.vectors.deposit(this.state, gx, gy, vectorId, intensity);
  }

  private attractorSpawn(x: number, y: number, strength: number, radius: number, ttl: number): void {
    this.attractors.spawn(this.state, x, y, strength, radius, ttl);
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

  /** P5: Route aus dem Map-Grid ableiten und an EnemySystem geben. R2: die Route ist das
   * ERGEBNIS des Pathfindings (kein „leeres Feld ⇒ Default-Pfad“-Zweig) und läuft bei Run-Start,
   * jedem Bau und jedem Wellenbeginn; `null` heißt NUR „zugebaut“ — was placeTile/PLACE_PLANT nie
   * zulassen (Integritätsregel). */
  private recomputeRoute(state: SimState): void {
    // B16.1: die Route lebt NUR im State (Ein-Writer) — keine zweite Kopie im System.
    const route = this.map.computeRoute(state);
    state.currentRoute = route;
    // Wellen-Sperre: mid-Welle gibt es keinen Bau mehr ⇒ keinen mid-Wave-Routen-Wechsel;
    // das Juggling-Remap (Gegner an neue Route anknoten) ist bewusst tot und geschnitten.
    // AP2 (M1)/Entscheidung 19.09.2026: der Payload trägt den echten LAUFWEG in Feldern
    // und den kürzesten möglichen Weg (der Abstand = Maze-Gewinn); `blocked` ist ein
    // Diagnose-Wert für Beobachter — die Sim lässt den Zustand nie zu.
    this.publish({
      eventId: `${state.clock.tick}:system:map:ROUTE_CHANGED:${++this.rejectSeq}`,
      tick: state.clock.tick,
      type: 'ROUTE_CHANGED',
      sourceId: 'system:map',
      version: 1,
      payload: {
        waypoints: route?.length ?? 0,
        tiles: routeWalkTiles(route),
        ideal: routeIdealTiles(route),
        blocked: route === null,
      },
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
