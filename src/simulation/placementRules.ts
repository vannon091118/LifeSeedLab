// Owner: Simulation (placement rules). LOC ≤ 200.
// EINE Wahrheit für „darf hier platziert werden": Geometrie (Grid, Belegung) und
// Ökonomie (Inventar, Energie). Der autoritative Command-Pfad (PlantSystem.place)
// nutzt dieselbe Funktion wie die UI-Vorschau (PlacementController) — der Geist kann
// damit nie eine Zelle grün zeigen, die die Simulation anschließend verwirft.
//
// R2-Neubau: Die alte Pfad-Marge ist GESTORBEN. Wege dürfen frei bebaut werden —
// die EINZIGE Weg-Schranke ist die Integritätsregel der Sim (route_blocked,
// mapSystem.placeTile): der letzte freie Weg wird nie zugebaut. Die Vorschau zeigt
// sie bewusst nicht vorab (sie braucht eine hypothetische Pathfinding-Probe, die
// allein die Sim fährt) — die Ablehnung kommt als rote Welle + Grund-Text an.

import { isInsideWorld } from '../config/world.source';

export type PlacementRejectReason = 'occupied' | 'on_path' | 'no_inventory';

/** Read-only Sicht auf das Brett — genügt für die Geometrie (kein SimState-Zugriff nötig). */
export interface PlacementBoard {
  gx: number;
  gy: number;
  /** Zellkoordinaten aller stehenden Pflanzen. */
  plants: ReadonlyArray<{ gx: number; gy: number }>;
  /** R2: die ECHTE Weltfläche des Runs (Run-Kopie der Weltgröße) — PFLICHTFELD.
   *  Vorher optional mit Default 12: die UI ließ die Größe weg und lehnte damit jede Zelle
   *  einer per FELD gewachsenen Welt als „on_path" (= außerhalb) ab, während die Sim dieselbe
   *  Zelle mit der echten Größe annahm (Befund: „hier ist kein Platz, obwohl oben Platz ist").
   *  Ohne Default kann der Fehler nicht mehr stillschweigend zurückkommen: er ist ein
   *  Compile-Fehler, kein roter Geist. */
  cols: number;
  rows: number;
}

/** Geometrie: Grid-Grenzen → Belegung (Reihenfolge wie in der Sim). */
export function cellRejectReason(board: PlacementBoard): 'occupied' | 'on_path' | null {
  const { gx, gy, plants, cols, rows } = board;
  // R2: Bounds über die dynamische Weltfläche — außerhalb ist NICHTS (auch kein Rand-Verbot).
  if (!isInsideWorld(cols, rows, gx, gy)) return 'on_path';
  if (plants.some(p => p.gx === gx && p.gy === gy)) return 'occupied';
  return null;
}

/** Gesamtregel in der Prüf-Reihenfolge der Sim: Pool (Inventar) → Geometrie. #4: keine Energie. */
export function placementRejectReason(input: {
  board: PlacementBoard;
  inventoryCount: number;
}): PlacementRejectReason | null {
  if (input.inventoryCount <= 0) return 'no_inventory';
  return cellRejectReason(input.board);
}
