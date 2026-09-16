// Owner: Source (content truth). LOC ≤ 200.
// Käferzucht-Quelle (P6): Basen-Tiere, Brut-Ökonomie, Gen-Multiplikatoren.
// Prinzip „echte Vielfalt statt Seed-Massenproduktion" (P7): JEDES Gen bewegt einen
// eigenen Mechanik-Hebel — zwei differente Genome spielen sich messbar anders.
// Alle Werte leben HIER; kein Hardcoding außerhalb config/.

import { makeRng } from '../core/rng';

/** Käfer-Gene: jedes mit eigener Mechanik-Wirkung (P7 — keine Deko-Gene). */
export interface BeetleGeneSource {
  id: string;
  /** Multiplikator-Basis; Stärke = power * mult (power 0..1). */
  hpMult: number;
  speedAdd: number;     // additive Zellen/Tick-Bonus
  attackAdd: number;    // additiver Schaden pro Biss
  /** Eigenheime der Specimen-Gene: */
  taunt?: true;         // zieht Pflanzenziel-Beforeuerung (Taunt Y/N)
  spawnX?: number;      // spawnt X zusätzliche Brutlinge beim Einsatz (Spawn 1×–5×)
  deathSpawnX?: number; // spawnt X halbwertige Brutlinge beim Tod
  costMult: number;     // Preis-Hebel (Balance: stärker = teurer)
}

export const BEETLE_GENES_SOURCE: Record<string, BeetleGeneSource> = {
  // ── Specimen-Gene (Bestandteil jedes Brut-Ergebnisses) ──
  swarmborn: { id: 'swarmborn', hpMult: 0.2, speedAdd: 0.004, attackAdd: 0, spawnX: 2, costMult: 0.35 },
  taunt:     { id: 'taunt',     hpMult: 0.9, speedAdd: -0.002, attackAdd: 0, taunt: true, costMult: 0.45 },
  phoenix:   { id: 'phoenix',   hpMult: 0.3, speedAdd: 0, attackAdd: 0, deathSpawnX: 2, costMult: 0.6 },
  broodhost: { id: 'broodhost', hpMult: 0.5, speedAdd: -0.001, attackAdd: 0, deathSpawnX: 1, spawnX: 1, costMult: 0.7 },
  // ── Eigenschafts-Gene (Stärken aus der Kreuzung) ──
  carapace:  { id: 'carapace',  hpMult: 0.8, speedAdd: -0.001, attackAdd: 0, costMult: 0.4 },
  sprinter:  { id: 'sprinter',  hpMult: 0.1, speedAdd: 0.008, attackAdd: 0, costMult: 0.35 },
  mandible:  { id: 'mandible',  hpMult: 0.2, speedAdd: 0, attackAdd: 3, costMult: 0.45 },
  venomous:  { id: 'venomous',  hpMult: 0.2, speedAdd: 0, attackAdd: 1, costMult: 0.4 },
};

/** Dominanz + Gacha-Gewicht der Käfer-Gene (Kreuzungslogik liest das, P7). */
export const BEETLE_GENE_POOL: Record<string, { dominant: boolean; weight: number }> = {
  swarmborn: { dominant: true,  weight: 0.20 },
  taunt:     { dominant: true,  weight: 0.18 },
  phoenix:   { dominant: false, weight: 0.12 },
  broodhost: { dominant: false, weight: 0.14 },
  carapace:  { dominant: true,  weight: 0.22 },
  sprinter:  { dominant: true,  weight: 0.20 },
  mandible:  { dominant: false, weight: 0.18 },
  venomous:  { dominant: false, weight: 0.15 },
};

/** Basen-Tiere: der Ausgangsbestand (wie PlantVariant-Basen). */
export interface BeetleSpecimenSource {
  id: string;
  /** Anzeigename (UI/Brut) — die Spielwelt benennt deutsch (vgl. names.source). */
  label: string;
  hp: number;
  speed: number;   // Zellen/Tick (Gegner-Kaliber)
  attack: number;  // Schaden pro Biss gegen Gegner
  genes: string[]; // Startgenome (BEETLE_GENES_SOURCE-Ids)
  color: string;
}

export const BEETLES_SOURCE: Record<string, BeetleSpecimenSource> = {
  leafhopper: {
    id: 'leafhopper', label: 'Blatthüpfer',
    hp: 60, speed: 0.030, attack: 4,
    genes: ['sprinter'], color: '#86b34a',
  },
  shellbeetle: {
    id: 'shellbeetle', label: 'Schildkäfer',
    hp: 180, speed: 0.016, attack: 2,
    genes: ['carapace'], color: '#8a7f5e',
  },
  bumble: {
    id: 'bumble', label: 'Hummel',
    hp: 90, speed: 0.024, attack: 3,
    genes: ['swarmborn'], color: '#d9a441',
  },
};

export const BEETLE_IDS = Object.keys(BEETLES_SOURCE);

/** Brut-Ökonomie (Quelle — kein Hardcode in Sim/UI). */
export const BEETLE_BREED = {
  /** Brutlinge pro Brutvorgang: 3 Kandidaten, einer wird behalten (Pflanzen-Gacha-Parallele). */
  broodSize: 3,
  /** Max. gezüchtete Specimen im Meta-Lager (Library-Kappung wie savedVariants). */
  maxLibrary: 40,
  /** Gleichzeitige eingesetzte Käfer pro Run. */
  deploySlots: 1,
  /** Nektar-Kosten je Einsatz im Run (Energie). */
  deployEnergyCost: 20,
  /** Freeze nach Einsatz, bevor der Brutling losläuft (Ticks). */
  deployFreezeTicks: 600,
  /** Brutlinge: Werte-Faktor gegen den Specimen (halbe Werte — P6-Spec). */
  broodlingFactor: 0.5,
  /** Nektar-Kosten je Brutvorgang in der Brutstätte (B27: eine Quelle — vorher hardcoded in BeetleLab). */
  nektarCost: 35,
} as const;

/** Brut-Familie: deterministischer Brutlingstyp (ENEMIES_SOURCE-Eintrag, B10). */
export const BROODLING_TYPE = 'broodling' as const;

/** Wellen-Discovery-Verknüpfung: Reifung nach Kinderstärke (P7-Balance).
 *  Stärkere Brut braucht mehr überlebte Wellen — skaliert BEETLE_GENE_POOL-unabhängig. */
export function beetleWavesToUnlock(childPower: number): number {
  // power ≈ Summe der Gen-Powers (0..~2): 1 Welle Basis, +1 je 0.5 Stärke, Deckel 6.
  return Math.min(6, 1 + Math.floor(childPower / 0.5));
}

/** Deterministischer Brut-Seed: Ableitung macht genome/beetle.ts über core/rng
 *  (deriveSeed, 'enemy'-Namespace — Gegner-Domain). Hier nur Domänen-Konstante. */
export const BROOD_SEED_NAMESPACE = 'enemy' as const;
