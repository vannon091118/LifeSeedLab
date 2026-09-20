// Owner: Source (ElementarVector visuals). LOC ≤ 200.
// Einzige Wahrheit für Vector-Optik. Trennt Logik (vector_logic) von Darstellung.
// Beobachter lesen nur hier — nie Sim.

import type { VectorId } from './vector_logic.source';

export interface VectorVisualSource {
  id: VectorId;
  paletteModifier: string;
  particleProfile: string;
  projectileProfile: string;
  impactProfile: string;
  statusVisual: string | null;
  soundProfile: string;
}

export const VECTOR_VISUAL_SOURCE: Record<VectorId, VectorVisualSource> = {
  VECTOR_HEAT:      { id: 'VECTOR_HEAT',      paletteModifier: '#fb923c', particleProfile: 'ember_burst', projectileProfile: 'flame', impactProfile: 'flare',   statusVisual: 'flame', soundProfile: 'fire' },
  VECTOR_WET:       { id: 'VECTOR_WET',       paletteModifier: '#7dd3fc', particleProfile: 'bubble_pop',  projectileProfile: 'orb',   impactProfile: 'splash',  statusVisual: 'drop',  soundProfile: 'blub' },
  VECTOR_OIL:       { id: 'VECTOR_OIL',       paletteModifier: '#57534e', particleProfile: 'bubble_pop',  projectileProfile: 'blob',  impactProfile: 'splash',  statusVisual: 'drop',  soundProfile: 'blub' },
  VECTOR_COLD:      { id: 'VECTOR_COLD',      paletteModifier: '#93c5fd', particleProfile: 'frost_mist',  projectileProfile: 'orb',   impactProfile: 'shatter', statusVisual: 'snow',  soundProfile: 'frost' },
  VECTOR_CHARGE:    { id: 'VECTOR_CHARGE',    paletteModifier: '#fde047', particleProfile: 'arc_jump',    projectileProfile: 'zig',   impactProfile: 'crackle', statusVisual: 'bolt',  soundProfile: 'zap' },
  VECTOR_ATTRACTOR: { id: 'VECTOR_ATTRACTOR', paletteModifier: '#8b8fb3', particleProfile: 'ring_soft',   projectileProfile: 'orb',   impactProfile: 'thud',    statusVisual: 'wind',  soundProfile: 'hum' },
  VECTOR_TOX:       { id: 'VECTOR_TOX',       paletteModifier: '#a3e635', particleProfile: 'spawn_spore', projectileProfile: 'blob',  impactProfile: 'splash',  statusVisual: 'drop',  soundProfile: 'blub' },
};

export const VECTOR_VISUAL_IDS = Object.keys(VECTOR_VISUAL_SOURCE) as VectorId[];

export function isValidVectorVisual(id: string): id is VectorId {
  return id in VECTOR_VISUAL_SOURCE;
}
