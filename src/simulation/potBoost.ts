// Owner: MapSystem (Topf-Farbe + Wirkung). LOC ≤ 200.
// EINE Wahrheit für „welche Wirkung hat diese Topf-Zelle": Simulation (Feuern, Aura, Setzling),
// Renderer (Topf-Farbe) und Vorschau (Reichweiten-Ring) lesen DIESE Funktionen — nie eine Kopie.
//
// Determinismus: die Farbe entsteht aus `deriveSeed(EPOCH_ROOT, 'world', 'pot', "gx:gy")`, also
// aus derselben Maschine wie die Welt. Kein `Math.random`, keine Uhr, kein Zustand: gleiche Zelle
// ⇒ gleiche Farbe, auf jedem Rechner und in jedem Replay. Deshalb braucht der Topf kein Feld im
// Save (eine zweite Wahrheit über dieselbe Zelle wäre ein Defekt).

import type { MapTiles } from './state';
import { EPOCH_ROOT } from '../config';
import { deriveSeed } from '../core/rng';
import { POT_COLORS, POT_BOOSTS, POT_SEED_VERSION, type PotBoost, type PotColor } from '../config/pot.source';

/** Das Tile, das die Wirkung trägt (Source-Name des Topfs). */
export const POT_TILE = 'pot';

/**
 * Farbe der Topf-Zelle — abgeleitet, nicht gespeichert. `% POT_COLORS.length` verteilt die
 * Farben gleichmäßig über die Fläche (gemessen: 12×12-Feld ⇒ alle vier vertreten).
 */
export function potColorAt(gx: number, gy: number): PotColor {
  const seed = deriveSeed(EPOCH_ROOT, 'world', 'pot', `${gx}:${gy}`, POT_SEED_VERSION);
  return POT_COLORS[seed % POT_COLORS.length]!;
}

/** Wirkung dieser Zelle — `null`, wenn dort kein Topf steht (Wiese, Weg, Findling, Deko). */
export function potBoostAt(tiles: MapTiles, gx: number, gy: number): PotBoost | null {
  if (tiles[`${gx},${gy}`] !== POT_TILE) return null;
  return POT_BOOSTS[potColorAt(gx, gy)];
}

/**
 * Wendet die Wirkung auf einen Stats-Satz an. Reine Multiplikation (exakte Operation, float-regel-
 * konform) — `cooldown` hat einen Faktor < 1 und wird dadurch KÜRZER, nicht negativ. `hp` wird
 * gerundet, weil Leben ganzzahlig ist; alles andere bleibt, wie es gerechnet wurde.
 */
export function applyPotBoost<T extends { damage: number; range: number; cooldown: number; hp: number }>(
  stats: T,
  boost: PotBoost,
): T {
  switch (boost.axis) {
    case 'damage':   return { ...stats, damage: stats.damage * boost.factor };
    case 'range':    return { ...stats, range: stats.range * boost.factor };
    case 'cooldown': return { ...stats, cooldown: Math.max(1, Math.round(stats.cooldown * boost.factor)) };
    case 'hp':       return { ...stats, hp: Math.round(stats.hp * boost.factor) };
  }
}
