// Owner: Source (content truth). LOC ≤ 200.
// B26: Gen → (Extra, Effect) als EIN Paar. Das sichtbare Ornament und die Fähigkeit stammen
// aus derselben Zeile — Style trägt Fähigkeits-Semantik, und die beiden Kanäle können nicht
// mehr auseinanderlaufen (vorher zwei lose Tabellen, die nur zufällig dieselben 15 Gene nannten).
// Konsumenten: genome/visualMap.ts (einzige Ableitung) → visual/generator.ts (Extras + Tint)
// und meta/store.ts (bredStats-Effekte → Projektil-Riding, B6).
// Kein Code außerhalb config/ darf diese Zuordnungen definieren.

import type { ExtraId } from './extras.source';
import type { EffectId } from './effects.source';
import type { BaseId } from './bases.source';

/** Das Paar: Ornament (sichtbar) + Effekt (spielbar) — eine Aussage pro Gen. */
export interface GenePair {
  extra: ExtraId;
  effect: EffectId;
}

/**
 * B26-Prototyp — Referenz-Paar `fire`: Dorn + Brand.
 *
 * Wer die Pflanze sieht, liest den Dorn; was der Dorn tut, sagt der Effekt derselben Zeile:
 * sie spuckt brennende Stacheln. Beide Kanäle speisen sich aus diesem Eintrag —
 * `EXTRA_SPIKE` geht in die Silhouette (`genomeToVisualInput → resolveVisual`), `EFFECT_BURN`
 * geht über `genomeEffectIds → deriveBredEntry → stats.effects[0]` aufs Projektil und setzt
 * beim Treffer `burnTicks` (B6).
 *
 * Review der 15 Paare (B26.2) — Werte sind 1:1 aus den beiden Alt-Tabellen übernommen
 * (Gameplay/Visuals unverändert; nur die Verwaltung ist verdichtet). Was das Verdichten
 * sichtbar macht:
 *  · `EXTRA_SPIKE` steht für VIER Bedeutungen (fire, thorns, venom, pierce), `EXTRA_GEM` für
 *    drei (ice, splash, aura), Krone/Hut/Antenne für je zwei — das Ornament ist mehrdeutig,
 *    also ist das Gen am Bild nicht eindeutig ablesbar.
 *  · `EXTRA_EYE`, `EXTRA_MOUTH`, `EXTRA_SCAR` werden von KEINEM Gen erzeugt — sie stehen in
 *    Basis-Listen (`allowedExtras`), erreichen aber nie eine Pflanze. Tote Vokabel.
 *  · `heavy → EXTRA_HAT`/`EFFECT_CRIT` trägt keine Masse-Semantik (der schwere Treffer sieht
 *    aus wie ein Hut).
 * Die eineindeutige Ornament-Vokabel (oder ein Zwei-Gang-System: Basis-Ornament + Fähigkeits-
 * Aufsatz) ist die nächste Design-Entscheidung — nicht Teil dieses Prototyps.
 */
export const GENE_PAIRS: Record<string, GenePair> = {
  fire:   { extra: 'EXTRA_SPIKE',      effect: 'EFFECT_BURN' },
  ice:    { extra: 'EXTRA_GEM',        effect: 'EFFECT_SLOW' },
  rapid:  { extra: 'EXTRA_LEAF_CROWN', effect: 'EFFECT_HASTE' },
  heavy:  { extra: 'EXTRA_HAT',        effect: 'EFFECT_CRIT' },
  heal:   { extra: 'EXTRA_LEAF_CROWN', effect: 'EFFECT_HEAL' },
  shield: { extra: 'EXTRA_HAT',        effect: 'EFFECT_SHIELD' },
  venom:  { extra: 'EXTRA_SPIKE',      effect: 'EFFECT_POISON' },
  splash: { extra: 'EXTRA_GEM',        effect: 'EFFECT_CHAIN' },
  pierce: { extra: 'EXTRA_SPIKE',      effect: 'EFFECT_PIERCE' },
  regen:  { extra: 'EXTRA_MUSHROOM',   effect: 'EFFECT_HEAL' },
  lure:   { extra: 'EXTRA_VINE',       effect: 'EFFECT_CHAIN' },
  thorns: { extra: 'EXTRA_SPIKE',      effect: 'EFFECT_REFLECT' },
  swift:  { extra: 'EXTRA_ANTENNA',    effect: 'EFFECT_HASTE' },
  crit:   { extra: 'EXTRA_ANTENNA',    effect: 'EFFECT_CRIT' },
  aura:   { extra: 'EXTRA_GEM',        effect: 'EFFECT_HEAL' },
};

/** Rollen-Basis-Pools: PlantVariant-Typ → kompabile BASE-Kandidaten (Regel 6:
 *  Content-Werte nur hier — vorher hardcoded im VisualGenerator). */
export const TYPE_BASES: Record<'shooter' | 'wall' | 'support', readonly BaseId[]> = {
  shooter: ['BASE_THORN', 'BASE_FROND', 'BASE_FLOWER'],
  wall: ['BASE_ROOT', 'BASE_CACTUS'],
  support: ['BASE_MUSHROOM', 'BASE_PUFF'],
} as const;
