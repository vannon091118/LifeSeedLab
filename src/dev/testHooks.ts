// Owner: DevGate (Test-Brücke, nur hinter ?dev=1). LOC ≤ 200.
// Fast-Forward-Hook für E2E: führt N deterministische Sim-Ticks SYNCHRON aus.
// Genau derselbe öffentliche Pipeline-Einstieg wie der RAF-Loop (`SimulationRoot.stepOnce()`),
// also alle Events über den echten Bus (WAVE_STARTED → Reifung, GAME_OVER → recordRunEnd).
// Kein zweiter State-Writer: nichts wird manipuliert oder injiziert — nur der Takt wird
// beschleunigt. Im Release (ohne ?dev=1) existiert der Hook nicht (Verbot 5).
//
// Vertrag (test-gelockt in tests/progression.spec.ts):
//   window.__ff(n)  → führt n stepOnce() aus, liefert { tick, phase, wave } zurück.
//   window.__sim()  → liefert eine defensively kopierte Momentaufnahme (lese-only).
// Installiert nur, wenn isDevActive() UND eine SimulationRoot-Instanz gesetzt wurde.

import { isDevActive } from './gate';
import type { SimulationRoot } from '../simulation/root';

interface FastForwardResult {
  tick: number;
  phase: string;
  wave: number;
}

declare global {
  interface Window {
    __ff?: (ticks: number) => FastForwardResult | null;
    __sim?: () => ReturnType<SimulationRoot['getSnapshot']> | null;
    __simRootRef?: { current: SimulationRoot | null };
  }
}

/** Von GameView beim Sim-Aufbau gesetzt; im Release bleibt current immer null. */
export function bindSimRoot(root: SimulationRoot | null): void {
  if (typeof window === 'undefined') return;
  if (!window.__simRootRef) window.__simRootRef = { current: null };
  window.__simRootRef.current = root;
}

/** Installiert die Dev-Brücke genau einmal, nur hinter dem DevGate. */
export function installTestHooks(): void {
  if (typeof window === 'undefined') return;
  if (!isDevActive()) return;
  if (window.__ff && window.__sim) return; // bereits installiert

  window.__ff = (ticks: number): FastForwardResult | null => {
    const root = window.__simRootRef?.current;
    if (!root || ticks <= 0) return null;
    const n = Math.min(Math.floor(ticks), 60_000); // Obergrenze gegen Hänger im Test
    for (let i = 0; i < n; i++) root.stepOnce();
    const s = root.getSnapshot();
    return { tick: s.clock.tick, phase: s.phase, wave: s.wave.number };
  };

  window.__sim = () => {
    const root = window.__simRootRef?.current;
    if (!root) return null;
    return root.getSnapshot(); // defensive Kopie (Vertrag SimulationRoot)
  };
}

/** Aufräumen beim Unmount (StrictMode-remount-sicher: die Brücke bleibt installiert). */
export function unbindSimRoot(root: SimulationRoot): void {
  if (typeof window === 'undefined') return;
  if (window.__simRootRef?.current === root) window.__simRootRef.current = null;
}
