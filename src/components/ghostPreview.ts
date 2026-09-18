// Owner: UI (Geist-Vorschau des Run-Screens). LOC ≤ 200.
// Der Render-Geist ist reine Präsentation: PlacementState (UI-Wahrheit) + Sim-Tick werden zu dem
// zusammengesetzt, was der Renderer zeichnet. Der Ablehnungs-Shake ist tick-basiert und damit
// deterministisch (Math.sin über die Tick-Differenz, keine Wanduhr) — dieselbe Zelle zittert bei
// gleichem Tick immer gleich. Aus GameView ausgelagert (LOC-Cap 400), inhaltlich unverändert.

import type { RenderGhost } from '../render/renderer';
import type { PlacementState } from './placementController';

/** Ablehnungs-Shake: tick-basiert (deterministisch), Präsentation-only. */
export const SHAKE_TICKS = 16;

export function ghostForRender(placement: PlacementState, tick: number): RenderGhost | null {
  const ghost = placement.ghost;
  if (!ghost) return null;
  const rejection = placement.rejection;
  let shake: { x: number; y: number } | null = null;
  if (rejection && rejection.gx === ghost.gx && rejection.gy === ghost.gy) {
    const age = tick - rejection.tick;
    if (age >= 0 && age < SHAKE_TICKS) {
      shake = { x: Math.sin(age * 1.7) * 4 * (1 - age / SHAKE_TICKS), y: 0 };
    }
  }
  return { visual: ghost.visual, gx: ghost.gx, gy: ghost.gy, valid: ghost.valid, range: ghost.range, shake };
}
