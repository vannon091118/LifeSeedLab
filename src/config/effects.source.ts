// Owner: Source (content truth). LOC ≤ 200.
// 18 Effects. Gameplay tags are read by simulation; visual profiles by the generator.
// Die acht Wirkungen der zweiten Gen-Gruppe (gravity, acid, prismatic, echo, spore, titan,
// bloom, vortex) sind HIER angesiedelt — kein zweites Effekt-System. Welche davon die
// Simulation wirklich rechnet, steht NICHT hier, sondern in `simulation/effectSupport.ts`
// (ein Owner je Frage: Content hier, Sim-Unterstützung dort). Bis P4 tragen die neuen
// Effekte teils vorhandene Partikel-Profile; eigene Optik ist ein eigener Slice (P6).
// Contract: EFFECT ids are the only coupling point between sim and presentation.

export type EffectId =
  | 'EFFECT_PIERCE' | 'EFFECT_REFLECT' | 'EFFECT_HEAL' | 'EFFECT_SLOW' | 'EFFECT_BURN'
  | 'EFFECT_CHAIN' | 'EFFECT_POISON' | 'EFFECT_SHIELD' | 'EFFECT_HASTE' | 'EFFECT_CRIT'
  | 'EFFECT_GRAVITY' | 'EFFECT_ACID' | 'EFFECT_PRISMATIC' | 'EFFECT_ECHO'
  | 'EFFECT_SPORE' | 'EFFECT_TITAN' | 'EFFECT_BLOOM' | 'EFFECT_VORTEX';

interface EffectSource {
  id: EffectId;
  paletteModifier: string;      // hex tint applied by PaletteResolver
  particleProfile: string;      // particle profile key (Phase 11)
  projectileProfile: string;    // projectile profile key
  impactProfile: string;        // impact profile key
  statusVisual: string | null;  // status icon key
  /** Schaden pro Tick, den der Status anrichtet (DoT). `null` = kein Schaden über Zeit.
   *  Content statt Literale im Sim-Code (Regel 6): `burn` 2/tick und `poison` 1/tick standen
   *  vorher als Konstanten in `enemySystem.applyStatusTicks` — gelesen wird die Zahl über
   *  `simulation/effectSupport.statusDotOf`, gerechnet vom StatusSystem (Regel-1-Split). */
  statusDamage: number | null;  // DoT per tick (null = none)
  soundProfile: string;         // audio key (Phase: audio observer)
  /**
   * Wirkdauer des Status in Ticks — Content, nicht Technik (Regel 6): die Zahlen 90/3/5
   * standen vorher als Literale in `enemySystem.applyDamage`. `null` = kein Status.
   * WELCHER Status daraus folgt, entscheidet `simulation/effectSupport.ts` (Sim-Vertrag).
   */
  statusTicks: number | null;
  /**
   * Ketten-Nachbrand (B6) — Anteil des AUSLÖSENDEN Schadens, den der Arc weiterreicht, und die
   * Reichweite in Zellen. Beides Content: das standen als Literale `50, 2` in `killReactor`.
   *
   * Der ANTEIL, nicht ein flacher Betrag — die Chain soll den Treffer spiegeln, der sie ausgelöst
   * hat. Ein fester Wert von 50 entwertete das: gegen einen Boss (800 HP) war er ein Getropse,
   * gegen Schwarm/Sprinter (15/25 HP) überschritt er den Auslöser. Ein Boss, den man nicht in
   * Sichtweite trifft, bringt jetzt einen Bogen mit, der wirklich zählt.
   */
  chainShare: number | null;
  chainRange: number | null;
}

export const EFFECTS_SOURCE: Record<EffectId, EffectSource> = {
  EFFECT_PIERCE:  { id: 'EFFECT_PIERCE',  paletteModifier: '#7dd3fc', particleProfile: 'spark_line',  projectileProfile: 'bolt',    impactProfile: 'punch',     statusVisual: null,      statusDamage: null, soundProfile: 'shot_sharp', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_REFLECT: { id: 'EFFECT_REFLECT', paletteModifier: '#d6b28a', particleProfile: 'ring_metal',  projectileProfile: 'none',    impactProfile: 'thud',      statusVisual: 'shield',  statusDamage: null, soundProfile: 'thud', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_HEAL:    { id: 'EFFECT_HEAL',    paletteModifier: '#86efac', particleProfile: 'glow_rise',   projectileProfile: 'none',    impactProfile: 'none',      statusVisual: 'plus',    statusDamage: null, soundProfile: 'chime', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_SLOW:    { id: 'EFFECT_SLOW',    paletteModifier: '#93c5fd', particleProfile: 'frost_mist',  projectileProfile: 'orb',     impactProfile: 'shatter',   statusVisual: 'snow',    statusDamage: null, soundProfile: 'frost', statusTicks: 90, chainShare: null, chainRange: null },
  EFFECT_BURN:    { id: 'EFFECT_BURN',    paletteModifier: '#fb923c', particleProfile: 'ember_burst', projectileProfile: 'flame',   impactProfile: 'flare',     statusVisual: 'flame',   statusDamage: 2, soundProfile: 'fire', statusTicks: 3, chainShare: null, chainRange: null },
  EFFECT_CHAIN:   { id: 'EFFECT_CHAIN',   paletteModifier: '#fde047', particleProfile: 'arc_jump',    projectileProfile: 'zig',     impactProfile: 'crackle',   statusVisual: 'bolt',    statusDamage: null, soundProfile: 'zap', statusTicks: null, chainShare: 0.5, chainRange: 2 },
  EFFECT_POISON:  { id: 'EFFECT_POISON',  paletteModifier: '#a3e635', particleProfile: 'bubble_pop',  projectileProfile: 'blob',    impactProfile: 'splash',    statusVisual: 'drop',    statusDamage: 1, soundProfile: 'blub', statusTicks: 5, chainShare: null, chainRange: null },
  EFFECT_SHIELD:  { id: 'EFFECT_SHIELD',  paletteModifier: '#c4b5fd', particleProfile: 'ring_soft',   projectileProfile: 'none',    impactProfile: 'none',      statusVisual: 'shield',  statusDamage: null, soundProfile: 'hum', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_HASTE:   { id: 'EFFECT_HASTE',   paletteModifier: '#f0abfc', particleProfile: 'trail_fast',  projectileProfile: 'none',    impactProfile: 'none',      statusVisual: 'wind',    statusDamage: null, soundProfile: 'whoosh', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_CRIT:    { id: 'EFFECT_CRIT',    paletteModifier: '#fda4af', particleProfile: 'burst_star',  projectileProfile: 'bolt',    impactProfile: 'punch_big', statusVisual: 'star',    statusDamage: null, soundProfile: 'crit', statusTicks: null, chainShare: null, chainRange: null },
  // Zweite Gen-Gruppe (v9, 19.09.2026): je Gen EIN eigener Effekt — das Gen benennt seine
  // Wirkung, statt sich einen fremden Effekt zu leihen.
  EFFECT_GRAVITY:   { id: 'EFFECT_GRAVITY',   paletteModifier: '#8b8fb3', particleProfile: 'ring_soft',   projectileProfile: 'orb',  impactProfile: 'thud',     statusVisual: null,     statusDamage: null, soundProfile: 'hum', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_ACID:      { id: 'EFFECT_ACID',      paletteModifier: '#a3e635', particleProfile: 'bubble_pop',  projectileProfile: 'blob', impactProfile: 'splash',   statusVisual: 'drop',   statusDamage: 1, soundProfile: 'blub', statusTicks: 5, chainShare: null, chainRange: null },
  EFFECT_PRISMATIC: { id: 'EFFECT_PRISMATIC', paletteModifier: '#f0abfc', particleProfile: 'burst_star',  projectileProfile: 'bolt', impactProfile: 'punch_big', statusVisual: 'star',  statusDamage: null, soundProfile: 'crit', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_ECHO:      { id: 'EFFECT_ECHO',      paletteModifier: '#c4b5fd', particleProfile: 'arc_jump',    projectileProfile: 'zig',  impactProfile: 'crackle',  statusVisual: 'bolt',   statusDamage: null, soundProfile: 'zap', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_SPORE:     { id: 'EFFECT_SPORE',     paletteModifier: '#bef264', particleProfile: 'spawn_spore', projectileProfile: 'blob', impactProfile: 'splash',   statusVisual: 'drop',   statusDamage: 1, soundProfile: 'blub', statusTicks: 5, chainShare: null, chainRange: null },
  EFFECT_TITAN:     { id: 'EFFECT_TITAN',     paletteModifier: '#d6b28a', particleProfile: 'ring_metal',  projectileProfile: 'none', impactProfile: 'thud',     statusVisual: 'shield', statusDamage: null, soundProfile: 'thud', statusTicks: null, chainShare: null, chainRange: null },
  EFFECT_BLOOM:     { id: 'EFFECT_BLOOM',     paletteModifier: '#86efac', particleProfile: 'glow_rise',   projectileProfile: 'none', impactProfile: 'none',     statusVisual: 'plus',   statusDamage: null, soundProfile: 'chime', statusTicks: 90, chainShare: null, chainRange: null },
  EFFECT_VORTEX:    { id: 'EFFECT_VORTEX',    paletteModifier: '#93c5fd', particleProfile: 'dust_puff',   projectileProfile: 'orb',  impactProfile: 'shatter',  statusVisual: 'wind',   statusDamage: null, soundProfile: 'whoosh', statusTicks: 90, chainShare: null, chainRange: null },
};

export const EFFECT_IDS = Object.keys(EFFECTS_SOURCE) as EffectId[];

export function isValidEffect(id: string): id is EffectId {
  return id in EFFECTS_SOURCE;
}
