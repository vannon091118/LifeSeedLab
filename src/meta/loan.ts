import type { PlantVariant, PlantType } from '../types';
import { GAME_SEED } from '../config';
import { deriveSeed, makeRng } from '../core/rng';
import { PLANTS_SOURCE } from '../config/plants.source';
import { crossGenomes, deriveStats, deriveTraits, deriveColor } from '../genome/cross';

// Owner: PersistenceSystem (Leih-Pflanze / Krix-Spross). LOC ≤ 200.
// EINSTIEGS-LEIHE: Der Start-Run läuft mit EINER geliehenen Pflanze ("Spross" von Krix) —
// kein dauerhafter Gratis-Besitz, kein zweiter Zufallsgenerator.
//
// Determinismus-Vertrag: Die Leihpflanze entsteht AUSSCHLIESSLICH aus der bestehenden
// Chain — `deriveSeed(GAME_SEED, 'plant', 'loan', <runId>)` füttert dieselbe Rng-Maschine
// (`makeRng('plant', …)`), die auch Kreuzungen und Keime treibt. Derselbe runId ergibt
// weltweit dieselbe Leihpflanze; kein `Math.random`, kein separater Namespace.
//
// Diversität-Vertrag: Die Basis-FORM (Rolle: shooter/wall/support) rotiert deterministisch
// über den runId, die Genom-Powers werden über die Chain aus `PLANTS_SOURCE` (Allel-Quelle)
// abgeleitet — der Pool ist damit groß und fair, ohne die Reproduzierbarkeit zu verlieren.
// Fairness entsteht aus Chain + Quellen-Diversität, nicht aus LAUNE.

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
  const seed = deriveSeed(GAME_SEED, 'plant', 'loan', runId);
  const rng = makeRng('plant', seed);

  // Basis-Form: alle Rollen aus PLANTS_SOURCE sind Kandidaten (Source-Diversität),
  // Rotation über die Chain, nicht über Listen-Ordnung des Save-Objekts.
  const roles = Object.values(PLANTS_SOURCE);
  const base = roles[seed % roles.length]!;

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
