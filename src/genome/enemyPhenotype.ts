// Owner: Source (enemy phenotype adapter). LOC ≤ 300.
// GEGNER-SEITE DER BIOLOGISCHEN SPRACHE (#2): Archetyp + Individuum ⇒ Genome ⇒ BeetlePhenotype.
// Dieselbe Zuchtmaschine und dieselbe Anatomie wie Brut und Pflanzenkäfer — es gibt KEIN zweites
// Kreaturen-Modell mehr. Genau das war der Befund „warum nutzen Gegner immer noch das alte Modell“.
//
// Determinismus: reine Funktion aus (typeId, individualKey). Kein Zustand, kein `Math.random`,
// kein Gameplay-Namespace — die Ableitung liegt im `visual`-Namespace und kann die Gegner-Domäne
// (Spawn/Crit) nicht einmal berühren.

import type { BeetleAncestor, Genome } from '../types';
import { EPOCH_ROOT } from '../config';
import { deriveSeed, makeRng } from '../core/rng';
import { BEETLE_GENE_POOL } from '../config/beetles.source';
import { beetlePhenotypeOf, type BeetlePhenotype } from './beetlePhenotype';
import {
  ENEMY_GENE_POWER, ENEMY_GENOMES_SOURCE, ENEMY_INDIVIDUAL_SPREAD, ENEMY_POWER_RANGE,
  type EnemyTypeId,
} from '../config/enemyGenome.source';

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Gene ⇒ Genom. Dominanz kommt aus der einen Gen-Pool-Wahrheit (config/beetles.source.ts). */
function genomeOf(genes: readonly string[], powers: readonly number[]): Genome {
  return genes.map((id, i) => ({
    id,
    power: powers[i] ?? ENEMY_GENE_POWER,
    dominant: BEETLE_GENE_POOL[id]?.dominant ?? false,
  }));
}

/**
 * Das Erbgut eines Archetyps. `individualKey` (z. B. die Entity-ID eines Bosses) individualisiert
 * NUR, wenn die Source das für den Typ vorsieht: dann streuen die Genstärken deterministisch und
 * das Wesen zieht genau ein Zusatz-Gen aus dem Pool. Jeder Boss ist damit ein Einzelstück — und
 * derselbe Boss-Spawn ergibt bei jedem Aufruf wieder exakt dieses Einzelstück.
 */
export function enemyGenomeFor(typeId: EnemyTypeId, individualKey?: string): Genome {
  const src = ENEMY_GENOMES_SOURCE[typeId];
  const genes = [...src.genes];
  const powers: number[] = genes.map(() => ENEMY_GENE_POWER);
  if (!src.individual || !individualKey) return genomeOf(genes, powers);

  const rng = makeRng('visual', deriveSeed(EPOCH_ROOT, 'visual', `enemy:${typeId}`, individualKey, 1));
  for (let i = 0; i < powers.length; i++) {
    const jitter = (rng.next() - 0.5) * 2 * ENEMY_INDIVIDUAL_SPREAD;
    powers[i] = clamp(ENEMY_GENE_POWER + jitter, ENEMY_POWER_RANGE[0], ENEMY_POWER_RANGE[1]);
  }
  const pool = src.individualPool ?? [];
  if (pool.length > 0) {
    genes.push(pool[Math.min(pool.length - 1, Math.floor(rng.next() * pool.length))]!);
    powers.push(clamp(ENEMY_GENE_POWER + (rng.next() - 0.5) * ENEMY_INDIVIDUAL_SPREAD, ENEMY_POWER_RANGE[0], ENEMY_POWER_RANGE[1]));
  }
  return genomeOf(genes, powers);
}

/** Der Gegner als VORFAHRE — dieselbe Form, die die Brut als Elternteil akzeptiert (PvP-Anker). */
export function enemyAncestorFor(typeId: EnemyTypeId, individualKey?: string): BeetleAncestor {
  return {
    id: individualKey ? `enemy:${typeId}:${individualKey}` : `enemy:${typeId}`,
    specimenId: typeId,
    generation: ENEMY_GENOMES_SOURCE[typeId].generation,
    genome: enemyGenomeFor(typeId, individualKey),
  };
}

/** Archetyp (und optional Individuum) ⇒ fertige Anatomie. */
export function enemyPhenotypeFor(typeId: EnemyTypeId, individualKey?: string): BeetlePhenotype {
  const ancestor = enemyAncestorFor(typeId, individualKey);
  return beetlePhenotypeOf({
    genome: ancestor.genome,
    generation: ancestor.generation,
    jitterNamespace: 'visual',
  });
}
