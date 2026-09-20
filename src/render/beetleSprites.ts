// Owner: RenderSystem (BeetleSpriteCache). LOC ≤ 200.
// Gleiche Idee wie render/spriteCache.ts für Pflanzen: jede Käfer-Anatomie wird EINMAL pro
// (variantKey, Zellgröße, DPR) auf ein Canvas gebacken; pro Frame bleibt ein drawImage statt
// Dutzender Bézier-Pfade. Das Tier bewegt sich (Bob/Biss) — gebacken wird nur die FORM.
//
// Reine Präsentation: liest den Phänotyp, keine Zustandsmutation, kein RNG, keine Uhr.

import type { ResolvedBeetleVisual } from '../visual/beetleGenerator';
import { drawBeetleAnatomy } from './beetles';
import { GAIT_FRAMES } from './beetleGait';

interface CacheEntry {
  canvas: HTMLCanvasElement;
  spanPx: number;
}

/** Sprite-Fenster in Zellen: Beine, Fühler und Dornen ragen über die Zelle hinaus. */
const SPRITE_SPAN = 2;

const cache = new Map<string, CacheEntry>();

export function beetleFrameFor(visual: ResolvedBeetleVisual, cell: number, dpr: number, frame: number): HTMLCanvasElement {
  const spanPx = Math.ceil(cell * SPRITE_SPAN * dpr);
  const f = ((frame % GAIT_FRAMES) + GAIT_FRAMES) % GAIT_FRAMES;
  const gait = f / GAIT_FRAMES; // Bild → Phase 0..1 (eine Quelle: beetleGait.GAIT_FRAMES)
  const key = `${visual.variantKey}|${spanPx}|${f}`;
  const hit = cache.get(key);
  if (hit) return hit.canvas;

  const canvas = document.createElement('canvas');
  canvas.width = spanPx;
  canvas.height = spanPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('BeetleSpriteCache: 2D context unavailable');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBeetleAnatomy(ctx, visual.phenotype, spanPx, gait);

  const entry: CacheEntry = { canvas, spanPx };
  cache.set(key, entry);
  return canvas;
}

/** Ein-Rahmen-Sprite (Vorschau, Idle) — Phase 0, das ist der Ruhe-Stand. */



/** Zeichnet das Käfer-Sprite zentriert auf (x, y) — Größe steckt in der Anatomie. */
export function drawBeetleSprite(
  ctx: CanvasRenderingContext2D,
  visual: ResolvedBeetleVisual,
  cell: number,
  dpr: number,
  x: number,
  y: number,
  scale: number,
  frame = 0,
): void {
  const sprite = beetleFrameFor(visual, cell, dpr, frame);
  const drawSpan = cell * SPRITE_SPAN * scale;
  ctx.drawImage(sprite, x - drawSpan / 2, y - drawSpan / 2, drawSpan, drawSpan);
}
