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
import { gaitFrameOf } from '../beetleGait';
import { enemyDrawScale } from '../../visual/enemyVisuals';

/**
 * Ein Gegner an (0, 0) des aktuellen Transform. `gait` (0..1) speist Schritte UND Bob — beide
 * hängen an derselben zurückgelegten Strecke (beetleGait.GaitTracker), nie an der Uhr. Deshalb
 * kriechen sie, wenn sie verlangsamt sind, und bleiben stehen, wenn sie stehen — statt zu fliegen.
 * Der Aufrufer besitzt Position und Treffer-Punch.
 */
export function drawEnemyBody(
  ctx: CanvasRenderingContext2D,
  visual: ResolvedBeetleVisual,
  typeId: EnemyTypeId,
  cell: number,
  dpr: number,
  gait: number,
): void {
  const phase = gait - Math.floor(gait);
  const bob = beetleBob(visual.phenotype, phase) * cell;
  // Sprite-Bild und Bein-Stellung kommen aus DERSELBEN Phase (gaitFrameOf → gait = frame/8).
  drawBeetleSprite(ctx, visual, cell, dpr, 0, -bob, enemyDrawScale(typeId) * visual.scale, gaitFrameOf(phase));
}
