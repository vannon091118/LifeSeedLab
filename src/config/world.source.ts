// Owner: Source (content truth). LOC ≤ 200.
// World geometry. No code outside config/ may define these values.
//
// R2 (Eigentümer-Entscheid, 2026-09-18): Das alte Weg-Modell ist GELÖSCHT — es gibt keine
// Wegpunkt-Liste, keinen geschützten Korridor und keine Pfad-Marge mehr. Es gibt genau EINE
// Regel: Gegner laufen den SCHNELLSTEN nicht blockierten Weg Spawn-Spalte → Ausgangs-Spalte;
// Blockades werden umlaufen. Der Spieler darf alles bebaubar — auch den Rand (Käfer laufen
// außen herum) — die EINZIGE Schranke ist die Integritätsregel: mindestens ein freier Weg
// muss nach jedem Bau existieren (route_blocked), sonst wird der Zug abgelehnt.

export const GRID_COLS = 12;
export const GRID_ROWS = 12;

/** Wegpunkt in Zell-Koordinaten (ein Typ für Sim-, Renderer- und Terrain-Sicht). */
export type RoutePoint = { x: number; y: number };

/** R2: Bounds prüfen gegen die DYNAMISCHE Weltfläche (Run-Kopie der Weltgröße). */
export function isInsideWorld(cols: number, rows: number, gx: number, gy: number): boolean {
  return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gx < cols && gy >= 0 && gy < rows;
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}
