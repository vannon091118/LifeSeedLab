// Owner: Source (content truth). LOC ≤ 200. Ein Gen trägt ZWEI Kanäle, und beide sind
// vollständig benannt:
//   • WIRKUNG  — `GENE_EFFECTS` (unten) ⇒ Projektil-Riding/Status (B6).
//   • ERSCHEINUNG — `PLANT_AXES_BY_GENE` in phenotype.source.ts: dasselbe Gen verschiebt
//     mehrere anatomische Achsen (Pigment, Oberfläche, Blattwerk, Bewegung).
//
// Beide Kanäle sind Eigentum DIESER Gen-ID. Vorher stand im Gen nur ein Effekt plus ein
// Ornament-Schlüssel aus einem BASE/EXTRA-Baukasten; das Ornament war mehrdeutig (EXTRA_SPIKE
// bedeutete gleichzeitig fire, thorns, venom und pierce) und damit am Bild nicht ablesbar.
// Der Baukasten ist GESTORBEN (R3): die sichtbare Identität kommt aus dem Phänotyp, nicht aus
// einem Aufsatz. Konsumenten: genome/effects.ts (Wirkung) und genome/plantPhenotype.ts (Bild).

import type { EffectId } from './effects.source';

/**
 * Gameplay-Wirkung je Gen — der EINE Effekt, den ein Gen dem Projektil mitgibt.
 * Die zwei stärksten Gene eines Genoms fahren auf dem Projektil (genome/effects.ts).
 */
export const GENE_EFFECTS: Record<string, EffectId> = {
  fire: 'EFFECT_BURN',
  ice: 'EFFECT_SLOW',
  rapid: 'EFFECT_HASTE',
  heavy: 'EFFECT_CRIT',
  heal: 'EFFECT_HEAL',
  shield: 'EFFECT_SHIELD',
  venom: 'EFFECT_POISON',
  splash: 'EFFECT_CHAIN',
  pierce: 'EFFECT_PIERCE',
  regen: 'EFFECT_HEAL',
  lure: 'EFFECT_CHAIN',
  thorns: 'EFFECT_REFLECT',
  swift: 'EFFECT_HASTE',
  crit: 'EFFECT_CRIT',
  aura: 'EFFECT_HEAL',
};
