// Owner: Source (content truth). LOC ≤ 200.
// 10 Effects. Gameplay tags are read by simulation; visual profiles by the generator.
// Contract: EFFECT ids are the only coupling point between sim and presentation.

export type EffectId =
  | 'EFFECT_PIERCE' | 'EFFECT_REFLECT' | 'EFFECT_HEAL' | 'EFFECT_SLOW' | 'EFFECT_BURN'
  | 'EFFECT_CHAIN' | 'EFFECT_POISON' | 'EFFECT_SHIELD' | 'EFFECT_HASTE' | 'EFFECT_CRIT';

export interface EffectSource {
  id: EffectId;
  paletteModifier: string;      // hex tint applied by PaletteResolver
  particleProfile: string;      // particle profile key (Phase 11)
  projectileProfile: string;    // projectile profile key
  impactProfile: string;        // impact profile key
  statusVisual: string | null;  // status icon key
  soundProfile: string;         // audio key (Phase: audio observer)
}

export const EFFECTS_SOURCE: Record<EffectId, EffectSource> = {
  EFFECT_PIERCE:  { id: 'EFFECT_PIERCE',  paletteModifier: '#7dd3fc', particleProfile: 'spark_line',  projectileProfile: 'bolt',    impactProfile: 'punch',     statusVisual: null,      soundProfile: 'shot_sharp' },
  EFFECT_REFLECT: { id: 'EFFECT_REFLECT', paletteModifier: '#d6b28a', particleProfile: 'ring_metal',  projectileProfile: 'none',    impactProfile: 'thud',      statusVisual: 'shield',  soundProfile: 'thud' },
  EFFECT_HEAL:    { id: 'EFFECT_HEAL',    paletteModifier: '#86efac', particleProfile: 'glow_rise',   projectileProfile: 'none',    impactProfile: 'none',      statusVisual: 'plus',    soundProfile: 'chime' },
  EFFECT_SLOW:    { id: 'EFFECT_SLOW',    paletteModifier: '#93c5fd', particleProfile: 'frost_mist',  projectileProfile: 'orb',     impactProfile: 'shatter',   statusVisual: 'snow',    soundProfile: 'frost' },
  EFFECT_BURN:    { id: 'EFFECT_BURN',    paletteModifier: '#fb923c', particleProfile: 'ember_burst', projectileProfile: 'flame',   impactProfile: 'flare',     statusVisual: 'flame',   soundProfile: 'fire' },
  EFFECT_CHAIN:   { id: 'EFFECT_CHAIN',   paletteModifier: '#fde047', particleProfile: 'arc_jump',    projectileProfile: 'zig',     impactProfile: 'crackle',   statusVisual: 'bolt',    soundProfile: 'zap' },
  EFFECT_POISON:  { id: 'EFFECT_POISON',  paletteModifier: '#a3e635', particleProfile: 'bubble_pop',  projectileProfile: 'blob',    impactProfile: 'splash',    statusVisual: 'drop',    soundProfile: 'blub' },
  EFFECT_SHIELD:  { id: 'EFFECT_SHIELD',  paletteModifier: '#c4b5fd', particleProfile: 'ring_soft',   projectileProfile: 'none',    impactProfile: 'none',      statusVisual: 'shield',  soundProfile: 'hum' },
  EFFECT_HASTE:   { id: 'EFFECT_HASTE',   paletteModifier: '#f0abfc', particleProfile: 'trail_fast',  projectileProfile: 'none',    impactProfile: 'none',      statusVisual: 'wind',    soundProfile: 'whoosh' },
  EFFECT_CRIT:    { id: 'EFFECT_CRIT',    paletteModifier: '#fda4af', particleProfile: 'burst_star',  projectileProfile: 'bolt',    impactProfile: 'punch_big', statusVisual: 'star',    soundProfile: 'crit' },
};

export const EFFECT_IDS = Object.keys(EFFECTS_SOURCE) as EffectId[];

export function isValidEffect(id: string): id is EffectId {
  return id in EFFECTS_SOURCE;
}
