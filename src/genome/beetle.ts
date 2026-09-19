import type { BeetleAncestor, Genome, BeetleSpecimen } from '../types';
import { EPOCH_ROOT } from '../config';
import { deriveSeed } from '../core/rng';
import { breedGenome, expressed, genomePower, rollCandidates } from './breeding';
import {
  BEETLES_SOURCE, BEETLE_GENES_SOURCE, BEETLE_GENE_POOL, BEETLE_BREED, BROOD_SEED_NAMESPACE,
} from '../config/beetles.source';
import { beetleMeasure, beetlePhenotypeOf } from './beetlePhenotype';
import { hashGenome } from '../discovery/chain';
import type { BeetleDeploySpec } from '../simulation/enemySystem';

// Owner: Source (beetle breeding engine). LOC ≤ 300.
// Die Käferzucht läuft über DENSELBEN Kern wie die Pflanzenzucht (genome/breeding.ts) — nur mit
// eigener biologischer Sprache (genome/beetlePhenotype.ts) und eigenem Gen-Pool/Namespace.
//
// R3-Neubaul: Vorher war jeder Brutling eine Neukombination der GEN-SÄTZE DER DREI FOUNDER
// (`BEETLES_SOURCE[a].genes`), egal was als Eltern übergeben wurde — ein gezüchtetes Tier konnte
// deshalb NIE Elternteil sein, und seine Nachkommen fielen genetisch auf die Gründer zurück.
// Jetzt ist jedes Specimen ein vollwertiger Vorfahre: sein eigenes Genom, seine Generation und
// seine Elternhistorie bestimmen die nächste Brut.

/** Ein Vorfahre: Identität + Genom + Generation. Basis-Tiere ebenso wie gezüchtete Tiere. */
export type { BeetleAncestor };

/** Ein Elternteil ist entweder eine Basis-ID oder ein vollwertiges (gezüchtetes) Tier. */
export type BeetleParentRef = string | BeetleAncestor;

/** Käfer-Genom-Stärke (Gene × Dominanz) — Balance-Hebel für Reifung + Ökonomie. */
export function beetlePower(genome: Genome): number {
  return genomePower(genome);
}

/** Basis-Tier als Vorfahre (Gründer-Pool der Kette). */
function founderAncestor(baseId: string): BeetleAncestor | null {
  const src = BEETLES_SOURCE[baseId];
  if (!src) return null;
  return {
    id: baseId,
    specimenId: baseId,
    generation: 1,
    genome: src.genes.map(geneFromSource),
  };
}

/** Gezüchtetes Tier als Vorfahre — sein EIGENES Genom, nicht das seiner Gründer. */
export function ancestorOf(spec: BeetleSpecimen): BeetleAncestor {
  return {
    id: spec.id,
    specimenId: spec.specimenId,
    genome: spec.genome.map(g => ({ ...g })),
    generation: spec.generation ?? 1,
  };
}

/** Elternteil auflösen: Basis-ID ⇒ Gründer-Vorfahre, Tier ⇒ sein eigener Vorfahre. */
export function resolveAncestor(ref: BeetleParentRef): BeetleAncestor | null {
  return typeof ref === 'string' ? founderAncestor(ref) : ref;
}

/** Die Brut-Stats eines Specimen: Basen-Werte × Gen-Multiplikatoren (Source-driven). */
export function deriveBeetleStats(specimenId: string, genome: Genome): BeetleSpecimen['stats'] {
  const src = BEETLES_SOURCE[specimenId] ?? Object.values(BEETLES_SOURCE)[0]!;
  let hpMult = 1, speed = src.speed, attack = src.attack, cost = 0;
  let taunt = false, spawnX = 1, deathSpawnX = 0;

  for (const g of expressed(genome)) {
    const gs = BEETLE_GENES_SOURCE[g.id];
    if (!gs) continue;
    hpMult += gs.hpMult * g.power;
    speed += gs.speedAdd * g.power;
    attack += gs.attackAdd * g.power;
    cost += gs.costMult * g.power;
    if (gs.taunt) taunt = true;
    if (gs.spawnX) spawnX += Math.round(gs.spawnX * g.power);
    if (gs.deathSpawnX) deathSpawnX += Math.round(gs.deathSpawnX * g.power);
  }

  return {
    hp: Math.round(src.hp * hpMult),
    speed: +Math.max(0.008, speed).toFixed(4),
    attack: Math.max(1, Math.round(attack)),
    taunt,
    spawnX: Math.min(BEETLE_BREED.deploySlots * 5, spawnX), // Spawn 1×–5× (P6-Spec)
    deathSpawnX: Math.min(3, deathSpawnX),                   // Beim Tod X halbe Brutlinge
    cost: Math.round(10 + cost * 40),
  };
}

/** Deterministischer Brut-Seed — eigene Domäne 'brood' (B30), getrennt von 'plant' (Pflanzenzucht)
 *  und 'enemy' (Gegner-Spawn/Crit). Siehe Migrationsnotiz an BROOD_SEED_NAMESPACE. */
export function deriveBroodSeed(ancestorAId: string, ancestorBId: string, broodIndex: number): number {
  return deriveSeed(EPOCH_ROOT, BROOD_SEED_NAMESPACE, ancestorAId, `${ancestorBId}:${broodIndex}`, 1);
}

/**
 * Das spielbare Profil eines Kandidaten als Schlüssel: gleiche Werte ⇒ gleiche Wahl für den
 * Spieler, egal wie das Tier gezeichnet ist. Genau die Signatur, die der P7-Test prüft.
 */
function balanceKey(stats: BeetleSpecimen['stats']): string {
  return `${stats.hp}/${stats.attack}/${stats.speed}/${stats.spawnX}/${stats.taunt}/${stats.deathSpawnX}/${stats.cost}`;
}

/**
 * Drei Brutkandidaten (BEETLE_BREED.broodSize) — deterministisch pro Elternpaar und Brut-Index.
 *
 * Die Kandidaten laufen durch dieselbe Neuheitsprüfung wie Pflanzenkandidaten: zu ähnliche
 * Entwürfe werden mit wachsendem Neuheitsdruck neu abgeleitet; der Deskriptor gewichtet die FORM
 * (ein Farbwechsel ist kein neues Tier). Zusätzlich muss das KAMPFPROFIL neu sein — siehe
 * `distinct` unten; Begründung und Messung stehen in `config/beetles.source.ts`.
 */
export function rollBrood(parentA: BeetleParentRef, parentB: BeetleParentRef, broodIndex: number): BeetleSpecimen[] {
  const a = resolveAncestor(parentA);
  const b = resolveAncestor(parentB);
  if (!a || !b) return [];

  const seed = deriveBroodSeed(a.id, b.id, broodIndex);
  // Generation = eine Stufe tiefer als der jüngste Elternteil: die Kette zählt wirklich weiter.
  const generation = Math.max(a.generation, b.generation) + 1;

  const rolled = rollCandidates<{ genome: Genome; specimenId: string; stats: BeetleSpecimen['stats'] }>({
    pairSeed: seed, namespace: BROOD_SEED_NAMESPACE, count: BEETLE_BREED.broodSize, measure: beetleMeasure,
    maxAttempts: BEETLE_BREED.noveltyAttempts,
    // Kein Zwillings-Wurf: die Brut verspricht drei WAHLEN. Die Form-Distanz allein genügt dafür
    // nicht — bei genetisch gleichen Eltern erhält die Rekombination die Kräfte exakt, und ein
    // Dominanz-Kippen bewegt die Werte gar nicht. Ein Entwurf mit bereits vergebenem Profil
    // verliert deshalb JEDEN Vergleich; das Suchbudget oben findet dann einen dritten Entwurf.
    // Die Form-Schwelle bleibt unangetastet: das Profil ist eine ZUSATZ-Bedingung, keine
    // Verdünnung des bestehenden Maßes (gemessen: eine gemeinsame Gewichtung senkte die
    // mittlere Form-Distanz der Kandidaten von 0,075 auf 0,069).
    distinct: (cand, accepted) => !accepted.some(prev => balanceKey(prev.stats) === balanceKey(cand.stats)),
    make: (rng, index, attempt) => {
      const genome = breedGenome(a.genome, b.genome, rng, generation, BEETLE_GENE_POOL, attempt);
      // Balance-Anker: das Junge erbt den Basis-Typ EINES Elternteils (Münzwurf, seed-bestimmt) —
      // die ERSCHEINUNG kommt nicht von hier, sondern aus dem Genom (beetlePhenotype).
      const specimenId = rng.next() < 0.5 ? a.specimenId : b.specimenId;
      // EINMAL abgeleitet: der Deskriptor misst genau die Werte, die das Specimen später trägt
      // (keine zweite Ableitung, kein Auseinanderlaufen von Maß und Anzeige).
      const stats = deriveBeetleStats(specimenId, genome);
      // Deskriptor aus dem EIGENEN Phänotyp des Kandidaten — dieselbe Sprache, die gezeichnet wird.
      const descriptor = beetlePhenotypeOf({ genome, generation }).descriptor;
      return { candidate: { genome, specimenId, stats }, descriptor };
    },
  });

  return rolled.map((entry, i) => {
    const { genome, specimenId, stats } = entry.candidate;
    return {
      id: `brood_${seed.toString(36)}_${i}`,
      name: broodName(a, b, i),
      specimenId,
      genome,
      stats,
      // Altfeld der Anzeige (Ketten-Migration): die Brutstätte zeichnet den Phänotyp; der Wert
      // bleibt als Fallback für Stellen ohne Visual-Auflösung erhalten.
      color: BEETLES_SOURCE[specimenId]?.color ?? '#8a6b3a',
      generation,
      parentA: a.id,
      parentB: b.id,
      discovered: false,
    };
  });
}

function broodName(a: BeetleAncestor, b: BeetleAncestor, index: number): string {
  const label = (anc: BeetleAncestor) => (BEETLES_SOURCE[anc.specimenId]?.label ?? anc.specimenId).slice(0, 4);
  return `${label(a)}${label(b)}-Brut ${index + 1}`;
}

function geneFromSource(id: string): { id: string; power: number; dominant: boolean } {
  const gs = BEETLE_GENES_SOURCE[id];
  const dominant = !!gs && (BEETLE_GENE_POOL[id]?.dominant ?? false);
  return { id, power: 0.6, dominant }; // Basis-Power; Schwankung kommt aus dem Merge
}

/** Chain-Verankerung: Brutling → stabiler Genome-Hash (Öffentliche Kette, P6-Spec). */
export function broodGenomeHash(brood: BeetleSpecimen): string {
  return hashGenome(brood.genome.map(g => ({ id: `b:${g.id}`, power: g.power, dominant: g.dominant })));
}

/** Specimen → Deploy-Spec (Root ruft das beim DEPLOY_BEETLE-Command — reines Mapping). */
export function toDeploySpec(spec: BeetleSpecimen): BeetleDeploySpec {
  return {
    id: spec.id, specimenId: spec.specimenId, name: spec.name,
    hp: spec.stats.hp, attack: spec.stats.attack, speed: spec.stats.speed,
    taunt: spec.stats.taunt, deathSpawnX: spec.stats.deathSpawnX,
    color: spec.color, spawnX: spec.stats.spawnX, cost: spec.stats.cost,
  };
}
