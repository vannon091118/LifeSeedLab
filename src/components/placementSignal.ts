// Owner: UI (Placement-Signal). LOC ≤ 200.
// Q16 (3/3, „Hold schluckt Brett-Taps lautlos“): das Onboarding-Signal `placedCount` in GameView
// brauchte eine EINE Wahrheit, ob ein Brett-Tap als Platzierung zählt. Vorher rätselte der
// Vergleicher über Selection-Deltas (`variantId !== vorher`) — der konnte nach einem akzeptierten
// Drop nie mehr springen (Auswahl bleibt gesetzt), das B21-Signal stand still und der Hold schluckte
// weitere Taps. Diese Funktion IST der Vertrag: Nur ein angenommener Pflanz-Drop zählt.
import type { PlacementDecision } from './placementController';

/** true ⇒ der Brett-Tap war eine angenommene PFLANZ-Platzierung (Tutorial-Signal „placed“). */
export function countsAsPlacement(decision: PlacementDecision): boolean {
  return decision.kind === 'plant';
}
