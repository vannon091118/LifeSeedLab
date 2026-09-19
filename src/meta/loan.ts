import type { PlantVariant, PlantType } from '../types';
import { EPOCH_ROOT } from '../config';
import { deriveSeed, makeRng } from '../core/rng';
import { PLANTS_SOURCE } from '../config/plants.source';
import { crossGenomes, deriveStats, deriveTraits, deriveColor } from '../genome/cross';

// Owner: PersistenceSystem (Leih-Pflanze / Krix-Spross). LOC ≤ 200.
// EINSTIEGS-LEIHE: Der Start-Run läuft mit EINER geliehenen Pflanze ("Spross" von Krix) —
// kein dauerhafter Gratis-Besitz, kein zweiter Zufallsgenerator.
//
// Determinismus-Vertrag: Die Leihpflanze entsteht AUSSCHLIESSLICH aus der bestehenden
// Chain — `deriveSeed(EPOCH_ROOT, 'plant', 'loan', <runId>)` füttert dieselbe Rng-Maschine
// (`makeRng('plant', …)`), die auch Kreuzungen und Keime treibt. Derselbe runId ergibt
// weltweit dieselbe Leihpflanze; kein `Math.random`, kein separater Namespace.
//
// Diversität-Vertrag: Die Genom-Powers werden über die Chain aus `PLANTS_SOURCE` (Allel-Quelle)
// abgeleitet — der Pool ist damit groß und fair, ohne die Reproduzierbarkeit zu verlieren.
// Die ROLLE ist fix (Spross, die schwächste Schuss-Pflanze): die Leihe muss den Run
// spielbar machen, nicht überraschen. Fairness entsteht aus Chain + Quellen-Diversität,
// nicht aus LAUNE.

export const LOAN_PLANT_ID = 'loan_sprout';

/** Ist diese Variant-ID eine Leih-Pflanze? (Kein Meta-Besitz, wandert beim Run-Ende zurück.) */
export function isLoanVariant(variantId: string): boolean {
  return variantId === LOAN_PLANT_ID;
}

/**
 * Die Leih-Pflanze für einen Run — deterministisch aus dem Spiel-Seed + runId.
 * Dasselbe runId ⇒ dieselbe Pflanze (immer, überall, Replay-sicher).
 */
export function deriveLoanPlant(runId: number): PlantVariant {
  const seed = deriveSeed(EPOCH_ROOT, 'plant', 'loan', runId);
  const rng = makeRng('plant', seed);

  // Basis-Form: IMMER der Spross — die einzige fest codierte Pflanze und die schwächste
  // (Entscheidung 19.09.2026, „Leih-Spross macht gar nichts"). Vorher rotierte die Rolle über
  // `PLANTS_SOURCE`: in jedem dritten Run war die Leihgabe eine Wurzelmauer oder ein Myzel.
  // Ein Spieler, der NICHTS besitzt, bekam damit eine Pflanze ohne Angriff gereicht und sah
  // der ersten Welle zu — die Leihe muss die schwächste SCHUSS-Pflanze sein, nicht irgendeine.
  // Die deterministische Variation bleibt: sie variiert die Stärke des Spross, nicht seine Rolle.
  const base = PLANTS_SOURCE.sprout;

  // Genom-Variation über dieselbe Kreuzungsmaschine: die Basis kreuzt sich mit sich
  // selbst (Jitter der Powers/Dominanz) — die Maschine entscheidet, nicht der Zufall.
  const genome = crossGenomes(base.genome, base.genome, rng);
  const childType: PlantType = base.role;

  return {
    id: LOAN_PLANT_ID,
    name: `${base.label} (Leihgabe)`,
    type: childType,
    genome,
    traits: deriveTraits(genome),
    cost: base.cost,
    stats: deriveStats(childType, genome),
    color: deriveColor(childType, genome),
    discovered: true,
    isLoan: true,
  };
}
