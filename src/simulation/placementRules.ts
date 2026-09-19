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
  /** R2: freigeschaltete Weltfläche (Run-Kopie der Weltgröße). */
  cols?: number;
  rows?: number;
}

/** Geometrie: Grid-Grenzen → Belegung (Reihenfolge wie in der Sim). */
export function cellRejectReason(board: PlacementBoard): 'occupied' | 'on_path' | null {
  const { gx, gy, plants } = board;
  const cols = board.cols ?? 12;
  const rows = board.rows ?? 12;
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
