import type { Allele, Gene, Genome, PlantType, PlantVariant } from '../types';
import { GENE_POOL } from './pool';
import type { Rng } from '../core/rng';
import { compareCodeUnits } from '../core/order';
import { GENOME_SLOT_COUNT, BREEDING } from '../config/phenotype.source';
import { NAME_CORE_BY_GENE, NAME_PREFIXES, NAME_SUFFIXES, NAME_FALLBACK_CORE } from '../config/names.source';
import { rangeCxOf, cooldownCxOf } from './ballistics';

// Owner: Source (cross engine). LOC ≤ 300.
// crossGenomes + deriveStats/Traits/Color + generateName — deterministisch, nur rng.next().

function genePower(genome: Gene[], geneId: string): number {
  const g = genome.find(x => x.id === geneId);
  return g ? g.power : 0;
}

function genePresent(genome: Gene[], geneId: string): boolean {
  return genome.some(x => x.id === geneId && x.power > 0.2);
}

export function deriveStats(type: PlantType, genome: Genome): PlantVariant['stats'] {
  const fp = genePower(genome, 'fire');
  const rp = genePower(genome, 'rapid');
  const hvy = genePower(genome, 'heavy');
  const heal = genePower(genome, 'heal');
  const sp = genePower(genome, 'shield');
  const pp = genePower(genome, 'pierce');
  const regen = genePower(genome, 'regen');
  const crit = genePower(genome, 'crit');
  const swift = genePower(genome, 'swift');
  const splash = genePower(genome, 'splash');

  const baseDmg = type === 'wall' ? 5 : type === 'support' ? 0 : 15;
  const baseHp = type === 'wall' ? 300 : type === 'support' ? 80 : 100;
  const baseRange = type === 'wall' ? 0.5 : type === 'support' ? 2 : 3;
  const baseCd = type === 'wall' ? 60 : type === 'support' ? 45 : 30;

  let special: string | null = null;
  if (type === 'wall' && genePresent(genome, 'thorns')) special = 'reflect';
  if (type === 'support' && heal > 0.2) special = 'heal_aura';

  // Wuchs ⇒ Schuss (Eigentümer-Entscheid 20.09.2026): Reichweite UND Nachladezeit hängen an
  // den WUCHS-Genen (Höhe = weit, Dicke = schnell) — dieselbe bp-Ableitung wie die Ballistik
  // (`ballistics.source`), eine Wahrheit. Die alten Inline-Hebel (rapid −15, swift −10,
  // heavy +10 Ticks) sind gestorben: dieselbe Größe an zwei Orten wäre eine zweite Wahrheit.
  // Die Basis-Differenz der Rollen bleibt als Rollen-Versatz (Wand −2.5, Unterstützung −1.0).
  const roleRangeBonus = type === 'wall' ? -250 : type === 'support' ? -100 : 0; // Zellen ×100
  const roleCdBonus = type === 'wall' ? 1500 : type === 'support' ? 500 : 0;      // Ticks ×100
  const range = Math.max(5, rangeCxOf(genome) + roleRangeBonus) / 100;
  const cooldown = Math.max(5, Math.round((cooldownCxOf(genome) + roleCdBonus) / 100));

  return {
    hp: Math.round(baseHp + hvy * 200 + sp * 100 + regen * 50),
    damage: Math.round(baseDmg + fp * 25 + rp * 10 + crit * 20),
    range: +range.toFixed(2),
    cooldown,
    special,
  };
}

/**
 * Trait-Tags einer Pflanze: SPRACHNEUTRALE Gen-IDs (nur Gene über der Wahrnehmungsschwelle).
 * Die Übersetzung passiert in der Anzeige (`t('trait.<id>')`) — vorher standen hier feste
 * englische Labels („rapid fire“), die in der deutschen Oberfläche durchschlugen.
 */
export function deriveTraits(genome: Genome): string[] {
  return genome
    .filter(g => g.power > 0.2)
    .sort((a, b) => b.power - a.power)
    .map(g => String(g.id));
}

export function deriveColor(type: PlantType, genome: Genome): string {
  const r = (genePower(genome, 'fire') * 200 + 60) | 0;
  const g = (type === 'shooter' ? 180 : type === 'wall' ? 120 : 140) | 0;
  const b = (genePower(genome, 'ice') * 200 + 80) | 0;
  return `rgb(${r},${g},${b})`;
}

export function generateName(genome: Genome, rng: Rng): string {
  const strongest = [...genome].sort((a, b) => b.power - a.power)[0];
  const core = (strongest && NAME_CORE_BY_GENE[strongest.id]) || NAME_FALLBACK_CORE;
  const prefix = NAME_PREFIXES[rng.nextInt(0, NAME_PREFIXES.length - 1)];
  const suffix = NAME_SUFFIXES[rng.nextInt(0, NAME_SUFFIXES.length - 1)];
  return `${prefix}${core}${suffix}`;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Dominanz ist eine geordnete Source-Eigenschaft, kein boolean-Roulette. */
function dominanceOf(gene: Gene): number {
  return GENE_POOL[gene.id]?.dominance ?? (gene.dominant ? 3 : 1);
}

function effectiveDominant(gene: Pick<Allele, 'id' | 'dominant'>): boolean {
  return GENE_POOL[gene.id]?.dominant ?? gene.dominant;
}

function alleleOf(gene: Gene): Allele {
  return { id: gene.id, power: gene.power, dominant: effectiveDominant(gene) };
}

function allelesOf(gene: Gene): [Allele, Allele] {
  if (gene.alleles) {
    return [
      { ...gene.alleles[0], dominant: effectiveDominant(gene.alleles[0]) },
      { ...gene.alleles[1], dominant: effectiveDominant(gene.alleles[1]) },
    ];
  }
  const expressed = alleleOf(gene);
  return [{ ...expressed }, { ...expressed }];
}

function expressedAllele(alleles: readonly Allele[]): Allele {
  return [...alleles].sort((left, right) => {
    const rank = dominanceOf(right as Gene) - dominanceOf(left as Gene);
    return rank !== 0 ? rank : right.power - left.power;
  })[0]!;
}

/** Stabile Reihenfolge für Auswahl und Tie-Breaks; niemals eine Locale-Sortierung. */
function compareGeneOrder(a: Gene, b: Gene): number {
  const byId = compareCodeUnits(a.id, b.id);
  if (byId !== 0) return byId;
  if (a.power !== b.power) return b.power - a.power;
  return Number(a.dominant) - Number(b.dominant);
}

function geneScore(gene: Gene): number {
  return gene.power + dominanceOf(gene) * BREEDING.inheritance.dominanceWeight;
}

function compareSelection(a: Gene, b: Gene): number {
  const score = geneScore(b) - geneScore(a);
  return score !== 0 ? score : compareGeneOrder(a, b);
}

/**
 * Ein gemeinsamer Genotyp wird nicht neu ausgeschürfelt: der Dominanz-Sieger bestimmt die
 * Ausprägung, die stärkere Anlage den Kraftwert. Zwei rezessive Anlagen dürfen sich als
 * homozygoter Träger aufbauen; genau hier entsteht der über mehrere Generationen sichtbare
 * Selektionsgewinn statt Regression zur Mitte.
 */
function inheritShared(a: Gene, b: Gene): Gene {
  const left = allelesOf(a);
  const right = allelesOf(b);
  const expressed = expressedAllele([left[0], right[0]]);
  const recessive = !effectiveDominant(left[0]) && !effectiveDominant(right[0]);
  const power = recessive
    ? clamp01(Math.max(left[0].power, right[0].power) + BREEDING.inheritance.homozygousGain)
    : Math.max(left[0].power, right[0].power);
  return {
    ...expressed,
    id: a.id,
    power,
    dominant: effectiveDominant(expressed),
    alleles: [left[0], right[0]],
  };
}

function poolGene(id: string, power: number): Gene {
  const expressed: Allele = { id, power: clamp01(power), dominant: GENE_POOL[id]?.dominant ?? false };
  return { ...expressed, alleles: [{ ...expressed }, { ...expressed }] };
}

/**
 * Mendel-Kreuzung für Pflanzen: bis zu zehn eindeutige Gen-Slots, vererbt statt gewürfelt.
 *
 * 1. Gleiche Gen-ID: Dominanz zuerst, dann Stärke; kein Mittelwert und kein Power-Jitter.
 * 2. Nur ein Elternteil: die Anlage wird unverändert in den Kind-Slot übernommen.
 * 3. Mehr als zehn Kandidaten: die stärksten/dominantesten zehn bleiben erhalten.
 * 4. Nur ein echtes neues Gen darf mutieren; es ersetzt den schwächsten Slot.
 *
 * Alte, absichtlich kurze Test-Fixtures bleiben kürzer; sobald eine Basis zehn Slots trägt,
 * erzeugt jede Kreuzung daraus wieder zehn Slots.
 */
export function crossGenomes(a: Genome, b: Genome, rng: Rng): Genome {
  const slotLimit = Math.min(GENOME_SLOT_COUNT, Math.max(a.length, b.length));
  const ids = Array.from(new Set([...a.map(g => g.id), ...b.map(g => g.id)]))
    .sort(compareCodeUnits);
  const inherited: Genome = [];

  for (const id of ids) {
    const left = a.find(g => g.id === id);
    const right = b.find(g => g.id === id);
    if (left && right) inherited.push(inheritShared(left, right));
    else if (left) inherited.push({ ...left, dominant: effectiveDominant(left), alleles: allelesOf(left) });
    else if (right) inherited.push({ ...right, dominant: effectiveDominant(right), alleles: allelesOf(right) });
  }

  const selected = inherited.sort(compareSelection).slice(0, slotLimit);
  const selectedIds = new Set(selected.map(g => g.id));
  const fresh = Object.keys(GENE_POOL)
    .filter(id => !selectedIds.has(id))
    .sort(compareCodeUnits);

  // Ein Kind behält die elterliche Herkunft; fehlende Slots werden nur für einen
  // zehn-Slot-Vertrag aus dem Pool ergänzt, nicht durch erneutes Würfeln bestehender Allele.
  while (selected.length < slotLimit && fresh.length > 0) {
    const id = fresh.shift()!;
    selected.push(poolGene(id, 0.05));
  }

  if (fresh.length > 0 && rng.next() < BREEDING.mutationChance) {
    const id = rng.pickWeighted(fresh, key => GENE_POOL[key]!.weight);
    const [low, high] = BREEDING.mutationPower;
    const replacement = poolGene(id, low + rng.next() * (high - low));
    const weakest = selected.reduce((lowest, gene) =>
      geneScore(gene) < geneScore(lowest) ? gene : lowest,
    selected[0]!);
    const index = selected.findIndex(gene => gene.id === weakest.id);
    if (index >= 0) selected[index] = replacement;
  }

  return selected.sort(compareGeneOrder);
}
