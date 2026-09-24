import type { SimulationRoot } from '../simulation/root';
import type { SimState } from '../simulation/state';

/** Test-only bridge to the root's private vector seams. Production code never imports this module. */
type VectorRoot = {
  vectorDeposit(gx: number, gy: number, vectorId: string, intensity: number): void;
  attractorSpawn(x: number, y: number, strength: number, radius: number, ttl: number): void;
  vectorSystem: { traceCharge(state: SimState, fromGx: number, fromGy: number, toGx: number, toGy: number): { path: { x: number; y: number }[]; cost: number } | null };
};

export function testVectorDeposit(root: SimulationRoot, gx: number, gy: number, vectorId: string, intensity: number): void {
  (root as unknown as VectorRoot).vectorDeposit(gx, gy, vectorId, intensity);
}

export function testAttractorSpawn(root: SimulationRoot, x: number, y: number, strength: number, radius: number, ttl: number): void {
  (root as unknown as VectorRoot).attractorSpawn(x, y, strength, radius, ttl);
}

export function testTraceCharge(root: SimulationRoot, state: SimState, fromGx: number, fromGy: number, toGx: number, toGy: number): { path: { x: number; y: number }[]; cost: number } | null {
  return (root as unknown as VectorRoot).vectorSystem.traceCharge(state, fromGx, fromGy, toGx, toGy);
}
