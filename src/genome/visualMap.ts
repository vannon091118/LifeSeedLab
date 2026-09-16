// Owner: Genome (Genom→Visual-Brücke). LOC ≤ 200.
// Mapping Genom → VisualInput/EffectIds. Reine Ableitung, KEINE Visual-Resolution
// selbst (die bleibt im VisualGenerator) und KEINE Content-Werte (die liegen in
// config/genes.source.ts — Regel 6). Konsumenten: meta/store.ts, visual/generator,
// components (ghostVisual).

import type { PlantVariant, Genome } from '../types';
import { deriveSeed, strHash } from '../core/rng';
import { GENE_TO_EXTRA, GENE_TO_EFFECT, TYPE_BASES } from '../config/genes.source';
import type { ExtraId } from '../config/extras.source';
import type { EffectId } from '../config/effects.source';
import type { BaseId } from '../config/bases.source';
import type { VisualInput } from '../visual/generator';

/** PlantVariant-Typ → kompabile BASE-Kandidaten — Content-Truth aus der Source. */
const basesFor = (type: PlantVariant['type']): readonly BaseId[] => TYPE_BASES[type] ?? [];

export function genomeToVisualInput(variant: PlantVariant, rootSeed: number): VisualInput {
  // type → base, deterministischer Pick unter rollenkompatiblen Basen via Genom-Hash
  const geneHash = variant.genome.reduce((h, g) => h ^ strHash(`${g.id}:${g.power.toFixed(3)}`), 0) >>> 0;
  const bases = basesFor(variant.type);
  const baseId = bases[geneHash % bases.length]!;

  // Top-2 Gene nach Power → Extras (Kompatibilitätsfilter macht resolveVisual)
  const extras: ExtraId[] = [];
  for (const g of [...variant.genome].sort((a, b) => b.power - a.power)) {
    const e = GENE_TO_EXTRA[g.id];
    if (e && !extras.includes(e)) extras.push(e);
    if (extras.length >= 2) break;
  }

  // Stärkstes Gen → Effect-Tint
  const strongest = [...variant.genome].sort((a, b) => b.power - a.power)[0];
  const effectId = strongest ? GENE_TO_EFFECT[strongest.id] : undefined;

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

/** Top-2 Gene → EFFECT-Ids (bredStats + Projektil-Effekt-Riding — B6). */
export function genomeEffectIds(genome: Genome): EffectId[] {
  const out: EffectId[] = [];
  for (const g of [...genome].sort((a, b) => b.power - a.power)) {
    const e = GENE_TO_EFFECT[g.id];
    if (e && !out.includes(e)) out.push(e);
    if (out.length >= 2) break;
  }
  return out;
}
