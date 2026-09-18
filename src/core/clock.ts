// Owner: ClockSystem. Game time authority. LOC ≤ 300.
// performance.now is the ONLY permitted wall-clock read (frame timing, not gameplay logic).
export type ClockPhase = 'day' | 'night';

export interface ClockState {
  tick: number;            // simulation ticks since run start
  elapsed: number;         // simulated game time (ms) = tick * TICK_MS
  phase: ClockPhase;       // day/night presentation cycle
  phaseProgress: number;   // 0..1 within current phase
  waveTime: number;        // ticks since current wave started (0 in day phase)
  paused: boolean;
  /** Sim-Tempo (×1–×4): bestimmt, wie viele Sim-Ms ein reale Ms wert ist. Deterministisch —
   *  Teil des Snapshots, kein Renderer-Wissen. ×1 bleibt der Vertragswert (30 tps). */
  speed: number;
}

export const TICK_MS = 1000 / 30; // 30 sim ticks/sec (contract Phase 2.1)
/** Erlaubte Tempo-Stufen — eine Quelle für Uhr, UI und Tests. */
export const SPEED_STEPS: readonly number[] = [1, 2, 3, 4];
/** Day/night cycle length in ticks (2400 = 80s per phase at 30tps). ONE source. */
export const CYCLE_TICKS = 2400;
const NIGHT_THRESHOLD = 0.5;      // phase flips at half-cycle in v1 (wave-bound later via events)

export class GameClock {
  private s: ClockState = {
    tick: 0,
    elapsed: 0,
    phase: 'day',
    phaseProgress: 0,
    waveTime: 0,
    paused: false,
    speed: 1,
  };
  private accumulator = 0;

  // Pure-ish constructor: state injectable for tests
  constructor(initial?: Partial<ClockState>) {
    if (initial) this.s = { ...this.s, ...initial };
  }

  /** Advance by real ms; returns the number of fixed ticks executed. Der Sim-Tempo-Multiplikator
   *  macht aus realem Input Sim-Ms — die Tick-Schwelle (TICK_MS) bleibt unverändert, also laufen
   *  bei ×4 genau 4× so viele deterministische Ticks pro realem Frame. */
  advance(realMs: number): number {
    if (this.s.paused) return 0;
    this.accumulator += realMs * this.s.speed;
    let executed = 0;
    while (this.accumulator >= TICK_MS) {
      this.accumulator -= TICK_MS;
      this.step();
      executed++;
    }
    return executed;
  }

  /** One deterministic fixed step (the tick). */
  step(): void {
    this.s.tick++;
    this.s.elapsed = this.s.tick * TICK_MS;

    // phase cycle: CYCLE_TICKS per phase (day/night) — see CYCLE_TICKS above
    const t = this.s.tick % (CYCLE_TICKS * 2);
    const inNight = t >= CYCLE_TICKS;
    const newPhase: ClockPhase = inNight ? 'night' : 'day';
    if (newPhase !== this.s.phase) {
      this.s.phase = newPhase;
    }
    this.s.phaseProgress = (t % CYCLE_TICKS) / CYCLE_TICKS;

    if (this.s.phase === 'night') this.s.waveTime++;
  }

  togglePause(): void { this.s.paused = !this.s.paused; }
  setPaused(p: boolean): void { this.s.paused = p; }

  /** Sim-Tempo setzen (nur erlaubte Werte — kein halbes Tempo, kein Überdrehen). */
  setSpeed(multiplier: number): void {
    if (SPEED_STEPS.includes(multiplier)) this.s.speed = multiplier;
  }

  get speed(): number { return this.s.speed; }

  /** Night wave timing starts at tick multiple — used by WaveSystem via events later. */
  beginWave(): void { this.s.waveTime = 0; }

  get(): Readonly<ClockState> { return this.s; }

  /** Deep-copy for snapshots/state hashing. */
  snapshot(): ClockState {
    return { ...this.s };
  }

  restore(s: ClockState): void {
    this.s = { ...s };
    this.accumulator = 0;
  }
}

/** Deterministic two-clock equality for tests: same tick input ⇒ same state. */
export function clocksEqual(a: ClockState, b: ClockState): boolean {
  return a.tick === b.tick
    && a.elapsed === b.elapsed
    && a.phase === b.phase
    && Math.abs(a.phaseProgress - b.phaseProgress) < 1e-9
    && a.waveTime === b.waveTime
    && a.paused === b.paused
    && a.speed === b.speed;
}
