// Owner: TestKit (Vector-System-Fixture). LOC ≤ 200.
// Test-only: erzeugt VectorSystem + SimState ohne SimulationRoot, EventBus oder Commands.
// Die Fixture ist ein Isolationswerkzeug, keine zweite autoritative State-Quelle.

import { GameClock } from '../core/clock';
import { compareCodeUnits } from '../core/order';
import { VECTOR_IDS, type VectorId } from '../config/vector_logic.source';
import { VectorSystem } from '../simulation/vectorSystem';
import type { SimState, VectorCell } from '../simulation/state';
import { createInitialWorld } from '../world/world_state';

/** Elementar-Vektoren ohne den reservierten Attraktor-Entity-Slice. */
export const ELEMENTAR_VECTOR_IDS: readonly VectorId[] = VECTOR_IDS.filter(id => id !== 'VECTOR_ATTRACTOR');

/** Source-getriebene 6×6-Matrix: 36 geordnete Kombinationen inklusive Selbstkombinationen. */
export const VECTOR_COMBINATION_CASES: ReadonlyArray<readonly [VectorId, VectorId]> =
  ELEMENTAR_VECTOR_IDS.flatMap(a => ELEMENTAR_VECTOR_IDS.map(b => [a, b] as const));

export interface VectorCombinationFixture {
  readonly center: Readonly<{ x: number; y: number }>;
  deposit(vectorId: VectorId, intensity: number, extraRadius?: number): void;
  depositAt(gx: number, gy: number, vectorId: VectorId, intensity: number, extraRadius?: number): void;
  step(ticks?: number): void;
  traceCharge(fromGx: number, fromGy: number, toGx: number, toGy: number): { path: { x: number; y: number }[]; cost: number } | null;
  intensityAt(vectorId: VectorId): number;
  ttlAt(vectorId: VectorId): number | undefined;
  field(): string;
  cells(): ReadonlyArray<Readonly<VectorCell>>;
}

/** Minimaler VectorSystem-Fixture-Kontext: gleiche Tick-Reihenfolge wie SimulationRoot. */
export function makeVectorCombinationFixture(seed: number): VectorCombinationFixture {
  const clock = new GameClock();
  const world = createInitialWorld();
  // Nur die vom VectorSystem gelesenen Felder — bewusst kein freshState()- oder Root-Aufbau.
  const state = {
    seed,
    clock: clock.snapshot(),
    cols: world.cols,
    rows: world.rows,
    vectors: {},
    attractors: [],
  } as unknown as SimState;
  const system = new VectorSystem();
  const center = { x: Math.floor(state.cols / 2), y: Math.floor(state.rows / 2) };
  const depositAt = (gx: number, gy: number, vectorId: VectorId, intensity: number, extraRadius?: number): void => {
    system.deposit(state, gx, gy, vectorId, intensity, extraRadius);
  };

  return {
    center,
    depositAt,
    deposit: (vectorId, intensity, extraRadius) => depositAt(center.x, center.y, vectorId, intensity, extraRadius),
    step: (ticks = 1) => {
      for (let i = 0; i < ticks; i++) {
        clock.step();
        state.clock = clock.snapshot();
        system.update(state);
      }
    },
    traceCharge: (fromGx, fromGy, toGx, toGy) => system.traceCharge(state, fromGx, fromGy, toGx, toGy),
    intensityAt: vectorId => state.vectors[`${center.x},${center.y}`]?.find(c => c.vectorId === vectorId)?.intensity ?? 0,
    ttlAt: vectorId => state.vectors[`${center.x},${center.y}`]?.find(c => c.vectorId === vectorId)?.ttl,
    field: () => JSON.stringify(
      Object.entries(state.vectors)
        .sort(([a], [b]) => compareCodeUnits(a, b))
        .map(([key, cells]) => ({
          key,
          cells: [...cells]
            .sort((a, b) => compareCodeUnits(a.vectorId, b.vectorId))
            .map(c => ({ id: c.vectorId, i: c.intensity, t: c.ttl })),
        })),
    ),
    cells: () => Object.entries(state.vectors)
      .sort(([a], [b]) => compareCodeUnits(a, b))
      .flatMap(([, cells]) => [...cells]
        .sort((a, b) => compareCodeUnits(a.vectorId, b.vectorId))
        .map(cell => ({ ...cell }))),
  };
}
