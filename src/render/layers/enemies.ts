// Owner: EnemyBodiesLayer. LOC ≤ 300.
// ZEICHNET, ENTSCHEIDET NICHT: der Gegner ist ein WESEN mit Anatomie. Das Bild kommt aus dem
// aufgelösten Phänotyp (visual/enemyVisuals.ts ← genome/enemyPhenotype.ts ← Genom), gezeichnet von
// render/beetles.ts — derselbe Pfad wie der gezüchtete Käfer.
//
// R2-NEUBAU (19.09.2026): hier lag ein `switch` über fünf von Hand gezeichnete Körper
// (Verlaufs-Ellipsen + Ink-Punkte). Das war das „alte Modell“: ein Grunt in Welle 3 und einer in
// Welle 23 waren dasselbe Bild, und kein Gegner konnte Flügel, Pelz oder Stachel besitzen — eine
// „Hummel“ war zwangsläufig ein Käfer. Der switch ist GESTORBEN, nicht erweitert.

import type { EnemyTypeId } from '../../config/enemyGenome.source';
import type { ResolvedBeetleVisual } from '../../visual/beetleGenerator';
import { beetleBob } from '../beetles';
import { drawBeetleSprite } from '../beetleSprites';
import { enemyDrawScale } from '../../visual/enemyVisuals';

/**
 * Ein Gegner an (0, 0) des aktuellen Transform. Der Aufrufer besitzt Position und Treffer-Punch.
 * `tick` speist nur den Lauf-Bob (Präsentation) — dieselbe Bewegungssprache wie der Brutling.
 */
export function drawEnemyBody(
  ctx: CanvasRenderingContext2D,
  visual: ResolvedBeetleVisual,
  typeId: EnemyTypeId,
  cell: number,
  dpr: number,
  tick: number,
): void {
  const bob = beetleBob(visual.phenotype, tick * 16) * cell;
  drawBeetleSprite(ctx, visual, cell, dpr, 0, -bob, enemyDrawScale(typeId) * visual.scale);
}
