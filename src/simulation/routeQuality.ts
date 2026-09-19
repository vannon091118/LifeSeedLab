// Owner: MapSystem (route quality — aus mapSystem ausgelagert, R2-Neubau). LOC ≤ 200.
// M1/AP2 — Route-Qualität: Verhältnis der Route-Kosten zur Manhattan-Distanz der
// Route-Endpunkte. 1 = perfekt gerade, kleiner = das Spieler-Maze zwingt Umwege ab.

/**
 * Die Referenz ist die Manhattan-Distanz der ROUTE-Endpunkte — nicht die Feld-Diagonale
 * (COLS+ROWS): eine Diagonal-Referenz cappt jeden realen Umweg auf Qualität 1 und macht
 * den Quality-Chip bedeutungslos. Qualität misst die KOSTEN der Route relativ zur
 * Manhattan-Referenz; das Cap 1 schert gerade Wege.
 */
export function routeQuality(route: readonly { x: number; y: number }[] | null): number | null {
  if (!route || route.length < 2) return null;
  const [fx, fy] = [Math.round(route[0].x - 0.5), Math.round(route[0].y - 0.5)];
  const [lx, ly] = [Math.round(route[route.length - 1].x - 0.5), Math.round(route[route.length - 1].y - 0.5)];
  const straight = Math.abs(lx - fx) + Math.abs(ly - fy);
  if (straight === 0) return null;
  let cost = 0;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = [Math.round(route[i - 1].x - 0.5), Math.round(route[i - 1].y - 0.5)];
    const [bx, by] = [Math.round(route[i].x - 0.5), Math.round(route[i].y - 0.5)];
    cost += Math.abs(bx - ax) + Math.abs(by - ay); // Manhattan-Schritte (ortho4-Route)
  }
  return Math.min(1, straight / cost);
}
