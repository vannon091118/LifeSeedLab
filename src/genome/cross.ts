import type { Gene, Genome, PlantType, PlantVariant } from '../types';
import { GENE_POOL } from './pool';
import type { Rng } from '../core/rng';
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

export function crossGenomes(a: Genome, b: Genome, rng: Rng): Genome {
  const maxLen = Math.max(a.length, b.length);
  const child: Genome = [];

  for (let i = 0; i < maxLen; i++) {
    const geneA = a[i % a.length];
    const geneB = b[i % b.length];

    let parent = rng.next() < 0.5 ? geneA : geneB;
    if (geneA.dominant !== geneB.dominant) {
      parent = (rng.next() < 0.6) ? (geneA.dominant ? geneA : geneB) : parent;
    }

    if (rng.next() < 0.15) {
      const keys = Object.keys(GENE_POOL);
      const picked = rng.pickWeighted(keys, k => GENE_POOL[k].weight);
      child.push({
        id: picked,
        power: 0.1 + rng.next() * 0.6,
        dominant: GENE_POOL[picked].dominant,
      });
      continue;
    }

    const blend = 0.5 + (rng.next() - 0.5) * 0.3;
    let power = geneA.power * blend + geneB.power * (1 - blend);
    power = Math.max(0, Math.min(1, power + (rng.next() - 0.5) * 0.1));

    child.push({
      id: parent.id,
      power,
      dominant: parent.dominant ? rng.next() > 0.2 : rng.next() < 0.3,
    });
  }

  const seen = new Map<string, Gene>();
  for (const g of child) {
    const existing = seen.get(g.id);
    if (!existing || g.power > existing.power) seen.set(g.id, g);
  }
  return Array.from(seen.values());
}
