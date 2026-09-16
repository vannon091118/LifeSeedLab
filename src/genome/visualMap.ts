// Owner: Genome (Genom→Visual-Brücke). LOC ≤ 200.
// Mapping Genom → VisualInput/EffectIds. Reine Ableitung, KEINE Visual-Resolution
// selbst (die bleibt im VisualGenerator) und KEINE Content-Werte (die liegen in
// config/genes.source.ts — Regel 6). Konsumenten: meta/store.ts, visual/generator,
// components (ghostVisual).

import type { PlantVariant, Genome } from '../types';
import { deriveSeed, strHash } from '../core/rng';
import { GENE_PAIRS, TYPE_BASES } from '../config/genes.source';
import type { ExtraId } from '../config/extras.source';
import type { EffectId } from '../config/effects.source';
import type { BaseId } from '../config/bases.source';
import type { VisualInput } from '../visual/generator';

/** PlantVariant-Typ → kompabile BASE-Kandidaten — Content-Truth aus der Source. */
const basesFor = (type: PlantVariant['type']): readonly BaseId[] => TYPE_BASES[type] ?? [];

export function genomeToVisualInput(variant: PlantVariant, rootSeed: number): VisualInput {
  // B26: beide Kanäle kommen aus derselben Paar-Zeile (config/genes.source.ts).
  // `fire` ist das Referenz-Paar: EXTRA_SPIKE geht hier in die Silhouette, EFFECT_BURN
  // in den Effect-Tint — und dieselbe Zeile versorgt den Run (stats.effects[0], B6).

  // type → base, deterministischer Pick unter rollenkompatiblen Basen via Genom-Hash
  const geneHash = variant.genome.reduce((h, g) => h ^ strHash(`${g.id}:${g.power.toFixed(3)}`), 0) >>> 0;
  const bases = basesFor(variant.type);
  const baseId = bases[geneHash % bases.length]!;

  // Top-2 Gene nach Power → Extras (Kompatibilitätsfilter macht resolveVisual —
  // eine nicht kompatible Basis kann das Paar-Ornament also stillschweigend verlieren).
  const extras: ExtraId[] = [];
  for (const g of [...variant.genome].sort((a, b) => b.power - a.power)) {
    const extra = GENE_PAIRS[g.id]?.extra;
    if (extra && !extras.includes(extra)) extras.push(extra);
    if (extras.length >= 2) break;
  }

  // Stärkstes Gen → Effect-Tint
  const strongest = [...variant.genome].sort((a, b) => b.power - a.power)[0];
  const effectId = strongest ? GENE_PAIRS[strongest.id]?.effect : undefined;

  const visualSeed = deriveSeed(rootSeed, 'visual', variant.id, geneHash, 1);
  // Genom-Stärke = Ø Gene-Power (Kästchenblock-CGI: Skala ist Aussage, aus der Quelle)
  const strength = variant.genome.length > 0
    ? variant.genome.reduce((s, g) => s + g.power, 0) / variant.genome.length
    : 0.4;
  return {
    baseId,
    extraIds: extras,
    effectIds: effectId ? [effectId] : [],
    visualSeed,
    strength,
  };
}

/** Top-2 Gene → EFFECT-Ids (bredStats + Projektil-Effekt-Riding — B6).
 *  Dieselbe Paar-Zeile wie der visuelle Kanal: ein Gen, eine Aussage, zwei Ausgänge. */
export function genomeEffectIds(genome: Genome): EffectId[] {
  const out: EffectId[] = [];
  for (const g of [...genome].sort((a, b) => b.power - a.power)) {
    const effect = GENE_PAIRS[g.id]?.effect;
    if (effect && !out.includes(effect)) out.push(effect);
    if (out.length >= 2) break;
  }
  return out;
}
