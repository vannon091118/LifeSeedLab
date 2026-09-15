// Owner: Simulation (placement rules). LOC ≤ 200.
// EINE Wahrheit für „darf hier platziert werden": Geometrie (Grid, Pfad-Abstand, Belegung)
// und Ökonomie (Inventar, Energie). Der autoritative Command-Pfad (PlantSystem.place) nutzt
// dieselbe Funktion wie die UI-Vorschau (PlacementController) — der Geist kann damit nie eine
// Zelle grün zeigen, die die Simulation anschließend verwirft.

import { ENEMY_PATH, PLACEMENT_PATH_MARGIN, isInsideGrid, dist } from '../config/world.source';

export type PlacementRejectReason = 'occupied' | 'on_path' | 'no_inventory' | 'no_energy';

/** Read-only Sicht auf das Brett — genügt für die Geometrie (kein SimState-Zugriff nötig). */
export interface PlacementBoard {
  gx: number;
  gy: number;
  /** Zellkoordinaten aller stehenden Pflanzen. */
  plants: ReadonlyArray<{ gx: number; gy: number }>;
}

/** Geometrie: Grid-Grenzen → Pfad-Abstand → Belegung (Reihenfolge wie in der Sim). */
export function cellRejectReason(board: PlacementBoard): 'occupied' | 'on_path' | null {
  const { gx, gy, plants } = board;
  if (!isInsideGrid(gx, gy)) return 'on_path';

  const cx = gx + 0.5;
  const cy = gy + 0.5;
  for (const point of ENEMY_PATH) {
    if (dist(cx, cy, point.x, point.y) < PLACEMENT_PATH_MARGIN) return 'on_path';
  }
  if (plants.some(p => p.gx === gx && p.gy === gy)) return 'occupied';
  return null;
}

/** Gesamtregel in der Prüf-Reihenfolge der Sim: Inventar → Energie → Geometrie. */
export function placementRejectReason(input: {
  board: PlacementBoard;
  inventoryCount: number;
  energy: number;
  cost: number;
}): PlacementRejectReason | null {
  if (input.inventoryCount <= 0) return 'no_inventory';
  if (input.energy < input.cost) return 'no_energy';
  return cellRejectReason(input.board);
}
