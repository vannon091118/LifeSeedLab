// Owner: MapSystem (Laufweg-Messung). LOC ≤ 200.
// WAS DER CHIP MESSEN SOLL (Entscheidung 19.09.2026, „Laufweg in Feldern zeigen"):
//
// Vorher rechnete hier eine „WEG-GÜTE" = Manhattan(Endpunkte) / Routenkosten. Gemessen war das
// keine Maze-Anzeige: eine gerade Route, eine Stufen-Treppe und JEDE monotone Umleitung ergaben
// 1,000 — erst Rücklauf fiel auf 0,5. Die Anzeige behauptete trotzdem „100 % = gerader Weg".
//
// Mazing braucht das GEGENTEIL einer Quote: Zeit unter Feuer. Deshalb zeigt der HUD jetzt zwei
// Felder-Werte, die man direkt lesen kann:
//   · LAUFWEG  — wie viele Felder die Gegner wirklich gehen (Zeit unter Feuer, 1:1).
//   · MIN      — wie kurz es ohne Hindernisse wäre (Manhattan der Endpunkte).
// Der Abstand beider Zahlen IST der Maze-Gewinn; er wächst mit jedem geschickten Bau.
//
// Reine Arithmetik auf der ROUTE (Ergebnis des Pathfindings): exakte Operationen, keine
// Transzendenten, kein Zustand. Beide Funktionen geben `null` zurück, wenn keine Route existiert
// (zugebaut/frischer Run) — der Chip bleibt dann unsichtbar statt eine 0 zu behaupten.

import type { Route } from './state';

/** Zellkoordinate eines Wegpunkts (Wegpunkte liegen auf Zellmitten). */
function cellOf(p: { x: number; y: number }): [number, number] {
  return [Math.round(p.x - 0.5), Math.round(p.y - 0.5)];
}

/** Felder des echten Laufwegs: Summe der Manhattan-Schritte zwischen den Wegpunkten. */
export function routeWalkTiles(route: Route): number | null {
  if (!route || route.length < 2) return null;
  let tiles = 0;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = cellOf(route[i - 1]!);
    const [bx, by] = cellOf(route[i]!);
    tiles += Math.abs(bx - ax) + Math.abs(by - ay);
  }
  return tiles;
}

/** Kürzester MÖGLICHER Weg (ohne Hindernisse): Manhattan zwischen Start und Ziel. */
export function routeIdealTiles(route: Route): number | null {
  if (!route || route.length < 2) return null;
  const [fx, fy] = cellOf(route[0]!);
  const [lx, ly] = cellOf(route[route.length - 1]!);
  const straight = Math.abs(lx - fx) + Math.abs(ly - fy);
  return straight === 0 ? null : straight;
}
