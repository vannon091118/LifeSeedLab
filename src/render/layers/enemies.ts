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

// Status-Signaturen (B0.7: Zustand ist am Wesen ablesbar). Farben = Effekt-Palette
// (BURN #c96f3b / SLOW #7d9bc0 / POISON #7d9c46) — dieselben Töne wie die Projektile.
export const STATUS_VISUAL = {
  burn: 'rgba(201,111,59,0.75)',
  slow: 'rgba(125,155,192,0.7)',
  poison: 'rgba(125,156,70,0.8)',
} as const;

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

export interface EnemyStatusFlags { slow: boolean; burn: boolean; poison: boolean; }

/**
 * Die Status-Ringe um den Gegner (Welt-Koordinaten, Zellmitte): Slow = Frostkreis,
 * Brand = flackernde Funken, Gift = Doppelbogen. Pure Zeichenbahn — der Renderer liest
 * die Sim-Flags und ruft hier; die Flicker-Phase kommt aus dem Sim-Tick, nie aus der Wanduhr.
 */
export function drawEnemyStatus(
  ctx: CanvasRenderingContext2D,
  flags: EnemyStatusFlags,
  cell: number,
  flicker: number,
): void {
  if (flags.slow) {
    ctx.strokeStyle = STATUS_VISUAL.slow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, cell * 0.24, 0, Math.PI * 2); ctx.stroke();
  }
  if (flags.burn) {
    ctx.fillStyle = STATUS_VISUAL.burn;
    for (let i = 0; i < 3; i++) {
      const a = flicker + i * 2.09;
      ctx.beginPath(); ctx.arc(Math.cos(a) * cell * 0.2, -cell * 0.16 + Math.sin(a * 2) * 3, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (flags.poison) {
    ctx.strokeStyle = STATUS_VISUAL.poison; ctx.lineWidth = 2;
    const r = cell * 0.3 + Math.sin(flicker * 1.3) * 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0.4, 2.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 3.5, 5.8); ctx.stroke();
  }
}
