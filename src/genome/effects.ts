// Owner: Genome (Gen → Effekt-Kanal). LOC ≤ 200.
// Das Genom trägt GAMEPLAY: die stärksten Gene bestimmen die Effekte einer Pflanze
// (Projektil-Riding, `stats.effects`). Diese Zuordnung lebt in config/genes.source.ts
// (GENE_PAIRS) — hier wird sie nur gelesen, in einer Ableitung für Sim UND Visual.
//
// Warum eigenes Modul: `visualMap` beschreibt die ERSCHEINUNG, `effects` die WIRKUNG.
// Vorher lagen beide Kanäle in einer Datei, obwohl sie verschiedene Konsumenten haben
// (meta/store.ts + simulation vs. visual/generator) — zwei Rollen in einem Owner.

import type { Genome } from '../types';
import type { EffectId } from '../config/effects.source';
import { GENE_EFFECTS } from '../config/genes.source';

/** Effekt-Tragweite: die zwei stärksten Gene (Reihenfolge = Priorität im Projektil). */
export function genomeEffectIds(genome: Genome, limit = 2): EffectId[] {
  const out: EffectId[] = [];
  for (const g of [...genome].sort((a, b) => b.power - a.power)) {
    const effect = GENE_EFFECTS[g.id];
    if (effect && !out.includes(effect)) out.push(effect);
    if (out.length >= limit) break;
  }
  return out;
}
