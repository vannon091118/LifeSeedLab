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
  // ── Organ-Gene (Pool-Erweiterung 19.09.2026): sie treiben die neuen Anatomie-Achsen
  //    (Flügel, Pelz, Stachel, Halschild, Sprungbeine). Vorher hatte kein einziges Gen ein
  //    Organ zur Verfügung, das eine Hummel von einem Käfer unterscheiden könnte.
  winged:    { id: 'winged',    hpMult: 0.15, speedAdd: 0.004, attackAdd: 0, costMult: 0.40 },
  furry:     { id: 'furry',     hpMult: 0.25, speedAdd: -0.001, attackAdd: 0, costMult: 0.40 },
  sting:     { id: 'sting',     hpMult: 0.10, speedAdd: 0, attackAdd: 2, costMult: 0.45 },
  jumper:    { id: 'jumper',    hpMult: 0.15, speedAdd: 0.003, attackAdd: 1, costMult: 0.40 },
  hardshell: { id: 'hardshell', hpMult: 0.70, speedAdd: -0.002, attackAdd: 0, costMult: 0.45 },
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
  winged:    { dominant: true,  weight: 0.16 },
  furry:     { dominant: false, weight: 0.14 },
  sting:     { dominant: false, weight: 0.13 },
  jumper:    { dominant: true,  weight: 0.16 },
  hardshell: { dominant: true,  weight: 0.17 },
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

// Gründer-Erbgut (Pool-Erweiterung 19.09.2026): vorher trug JEDER Gründer GENAU EIN Gen — und
// weil die drei Gene nur Panzerdecken-Achsen bewegten, lag `carapaceForm` bei allen auf `flat`
// und `dress` bei allen auf `scaled`. Genau das war der Befund „warum sehen alle Käfer fast
// identisch aus": nicht zu wenig Distanz, sondern ein Eimer für alles. Jetzt trägt jeder Gründer
// ein ERBGUT (3–4 Gene) und jede Art hat einen lesbaren Körperplan.
// IDENTITÄTSBRUCH (bewusst, dokumentiert): Gründer-Genome ändern die Genom-Hashes ihrer Brut —
// der gepinnte Kandidatensatz in `meta/brood_identity.test.ts` wird nachgezogen. Kein Nektar,
// keine Queue und kein bereits gezüchteter Käfer ist betroffen (Specimen sind Daten).
export const BEETLES_SOURCE: Record<string, BeetleSpecimenSource> = {
  leafhopper: {
    id: 'leafhopper', label: 'Blatthüpfer',
    hp: 60, speed: 0.030, attack: 4,
    genes: ['sprinter', 'jumper', 'winged'], color: '#86b34a',
  },
  shellbeetle: {
    id: 'shellbeetle', label: 'Schildkäfer',
    hp: 180, speed: 0.016, attack: 2,
    genes: ['carapace', 'hardshell', 'taunt'], color: '#8a7f5e',
  },
  bumble: {
    id: 'bumble', label: 'Hummel',
    hp: 90, speed: 0.024, attack: 3,
    genes: ['swarmborn', 'furry', 'winged', 'sting'], color: '#d9a441',
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
  /** Freeze nach Einsatz, bevor der Brutling losläuft (Ticks). */
  deployFreezeTicks: 600,
  /** Brutlinge: Werte-Faktor gegen den Specimen (halbe Werte — P6-Spec). */
  broodlingFactor: 0.5,
  /** Nektar-Kosten je Brutvorgang in der Brutstätte (B27: eine Quelle — vorher hardcoded in BeetleLab). */
  nektarCost: 35,
  /**
   * Suchbudget je Kandidat (Versuche). Höher als der Pflanzen-Default, weil der Brut-Suchraum
   * enger ist: bei genetisch gleichen Eltern erhält die Rekombination die Kräfte EXAKT, Vielfalt
   * entsteht nur über Mutation — 6 Versuche lieferten in 11 von 72 Bruten keinen dritten
   * Profil, 12 genügten in allen. Messmenge (nachzählbar): 3 Gründer, alle GEORDNETEN Paarungen
   * × 8 Brut-Indizes = 72 Bruten. Wird nur ausgeschöpft, wenn die Neuheits-Schwelle
   * nicht erreicht wird; der Normalfall bricht unverändert nach dem ersten Treffer ab.
   */
  noveltyAttempts: 12,
} as const;

/**
 * WARUM DIE BRUT EIN ZUSÄTZLICHES KRITERIUM HAT (Genom-Contract, 19.09.2026 — gemessen).
 *
 * Der Neuheits-Vergleich der Brutkandidaten maß nur das AUSSEHEN. Bei genetisch gleichen Eltern
 * (Blatthüpfer×Blatthüpfer, Hummel×Hummel) erhält die Rekombination die Kräfte EXAKT — beide
 * Allele sind identisch, der Misch-Bias kürzt sich heraus — und ein Dominanz-Kippen ändert die
 * Käfer-Werte gar nicht (Dominanz bewegt nur die Form). Ergebnis: 11 von 72 Bruten (15,3 %)
 * trugen zwei Kandidaten mit IDENTISCHEN Stats; die Form-Distanz dieser Paare lag bei
 * 0,026–0,064 (Schwelle 0,055) — der Spieler entschied zwischen zwei Bildern desselben Tiers.
 *
 * Zwei Messungen aus derselben Sonde, die die Lösung bestimmt haben:
 *   · Balance-Achsen in das FORM-Mass mischen: senkt die mittlere Form-Distanz der Kandidaten
 *     von 0,075 auf 0,069 (der Optik-Anteil verdünnt sich) — die Vielfalt wäre also an anderer
 *     Stelle bezahlt worden. Deshalb ist das Profil eine ZUSATZ-Bedingung, kein Achsen-Zusatz.
 *   · Suchbudget 6 → 12 Versuche: mit dem Zusatzkriterium bleiben 0 von 72 Bruten mit Zwillingen
 *     (vorher 11). Das Budget wird nur ausgeschöpft, wenn die Form-Schwelle nicht erreicht wird.
 *
 * Deterministisch bleibt alles: gleicher Seed ⇒ derselbe Wurf (2× identisch nachgemessen).
 * Das Zusatzkriterium selbst steht in `genome/beetle.ts` (`distinct`), das Suchbudget unten.
 */

/** Brut-Familie: deterministischer Brutlingstyp (ENEMIES_SOURCE-Eintrag, B10). */
export const BROODLING_TYPE = 'broodling' as const;

/** Wellen-Discovery-Verknüpfung: Reifung nach Kinderstärke (P7-Balance).
 *  Stärkere Brut braucht mehr überlebte Wellen — skaliert BEETLE_GENE_POOL-unabhängig. */
export function beetleWavesToUnlock(childPower: number): number {
  // power ≈ Summe der Gen-Powers (0..~2): 1 Welle Basis, +1 je 0.5 Stärke, Deckel 6.
  return Math.min(6, 1 + Math.floor(childPower / 0.5));
}

/** Deterministischer Brut-Seed: Ableitung macht genome/beetle.ts über core/rng.
 *  Hier nur die Domänen-Konstante — sie gilt für die SEED-Ableitung UND den Brut-Stream
 *  (`makeRng(BROOD_SEED_NAMESPACE, …)`), damit beide nicht auseinanderlaufen können.
 *
 *  B30-Migration: 'enemy' → 'brood'. Die Zuchtwirtschaft ist keine Gegner-Domäne; unter 'enemy'
 *  lagen Gegner-Spawn, Crit-Roll und Brut-Identität unter einem Namen. Die Folge des Schnitts ist
 *  bewusst gewählt und dokumentiert (quality-spec B30): die Ableitungs-Eingaben (Eltern,
 *  `broodIndex`) bleiben, der Namespace wechselt — ein noch nicht abgeholter Wurf zeigt deshalb
 *  EINMALIG drei andere Kandidaten. Kein Nektar, keine Queue, kein bereits registrierter Käfer ist
 *  betroffen (`meta.beetles` speichert Specimen als Daten); die bezahlte Zusage „drei Kandidaten,
 *  du wählst einen" bleibt unverletzt. Wer diese Konstante künftig ändert, beantwortet die
 *  Migrationsfrage erneut — der Gate-Test pinnt Seed und Kandidatensatz. */
export const BROOD_SEED_NAMESPACE = 'brood' as const;
