// Owner: Source (content truth). LOC ≤ 200.
// Gen→Präsentation/Gameplay-Mapping. EINE Wahrheit für beide Konsumenten:
// visual/generator.ts (Extras + Tint) und genome/cross.ts (bredStats-Effekte, B6).
// Kein Code außerhalb config/ darf diese Zuordnungen definieren.

import type { ExtraId } from './extras.source';
import type { EffectId } from './effects.source';

/** Gen-Id → Extra (Silhouette/Persistierung der Zucht im Bild). */
export const GENE_TO_EXTRA: Record<string, ExtraId> = {
  fire: 'EXTRA_SPIKE', ice: 'EXTRA_GEM', heal: 'EXTRA_LEAF_CROWN',
  shield: 'EXTRA_HAT', thorns: 'EXTRA_SPIKE', crit: 'EXTRA_ANTENNA',
  regen: 'EXTRA_MUSHROOM', lure: 'EXTRA_VINE', venom: 'EXTRA_SPIKE',
  splash: 'EXTRA_GEM', pierce: 'EXTRA_SPIKE', rapid: 'EXTRA_LEAF_CROWN',
  swift: 'EXTRA_ANTENNA', heavy: 'EXTRA_HAT', aura: 'EXTRA_GEM',
};

/** Gen-Id → EFFECT (fährt auf Projektilen mit, bestimmt bredStats-Effekte — B6). */
export const GENE_TO_EFFECT: Record<string, EffectId> = {
  fire: 'EFFECT_BURN', ice: 'EFFECT_SLOW', venom: 'EFFECT_POISON',
  heal: 'EFFECT_HEAL', shield: 'EFFECT_SHIELD', pierce: 'EFFECT_PIERCE',
  crit: 'EFFECT_CRIT', swift: 'EFFECT_HASTE', aura: 'EFFECT_HEAL',
  thorns: 'EFFECT_REFLECT', rapid: 'EFFECT_HASTE', heavy: 'EFFECT_CRIT',
  splash: 'EFFECT_CHAIN', lure: 'EFFECT_CHAIN', regen: 'EFFECT_HEAL',
};
