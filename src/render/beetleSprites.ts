// Owner: RenderSystem (BeetleSpriteCache). LOC ≤ 200.
// Gleiche Idee wie render/spriteCache.ts für Pflanzen: jede Käfer-Anatomie wird EINMAL pro
// (variantKey, Zellgröße, DPR) auf ein Canvas gebacken; pro Frame bleibt ein drawImage statt
// Dutzender Bézier-Pfade. Das Tier bewegt sich (Bob/Biss) — gebacken wird nur die FORM.
//
// Reine Präsentation: liest den Phänotyp, keine Zustandsmutation, kein RNG, keine Uhr.

import type { ResolvedBeetleVisual } from '../visual/beetleGenerator';
import { drawBeetleAnatomy } from './beetles';

interface CacheEntry {
  canvas: HTMLCanvasElement;
  spanPx: number;
}

/** Sprite-Fenster in Zellen: Beine, Fühler und Dornen ragen über die Zelle hinaus. */
const SPRITE_SPAN = 2;

const cache = new Map<string, CacheEntry>();

export function beetleSpriteFor(visual: ResolvedBeetleVisual, cell: number, dpr: number): HTMLCanvasElement {
  const spanPx = Math.ceil(cell * SPRITE_SPAN * dpr);
  const key = `${visual.variantKey}|${spanPx}`;
  const hit = cache.get(key);
  if (hit) return hit.canvas;

  const canvas = document.createElement('canvas');
  canvas.width = spanPx;
  canvas.height = spanPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('BeetleSpriteCache: 2D context unavailable');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBeetleAnatomy(ctx, visual.phenotype, spanPx);

  const entry: CacheEntry = { canvas, spanPx };
  cache.set(key, entry);
  return canvas;
}

export function beetleSpriteCacheSize(): number {
  return cache.size;
}

export function clearBeetleSpriteCache(): void {
  cache.clear();
}

/** Zeichnet das Käfer-Sprite zentriert auf (x, y) — Größe steckt in der Anatomie. */
export function drawBeetleSprite(
  ctx: CanvasRenderingContext2D,
  visual: ResolvedBeetleVisual,
  cell: number,
  dpr: number,
  x: number,
  y: number,
  scale: number,
): void {
  const sprite = beetleSpriteFor(visual, cell, dpr);
  const drawSpan = cell * SPRITE_SPAN * scale;
  ctx.drawImage(sprite, x - drawSpan / 2, y - drawSpan / 2, drawSpan, drawSpan);
}
