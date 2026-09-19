// Owner: RenderSystem (SpriteCache). LOC ≤ 200.
// B28 — Performance-Fundament: Jede Pflanze (Phänotyp) wird EINMAL pro (variantKey, Zellgröße,
// DPR) auf ein Canvas gebacken; pro Frame bleibt nur ein drawImage statt Dutzenden Bézier-Pfaden.
// Der Cache-Schlüssel ist der `variantKey` (stabile Phänotyp-Identität aus dem Generator) —
// nicht die variantId: zwei Individuen teilen sich das Sprite nur bei identischer Anatomie.
//
// Reine Präsentation: liest den Phänotyp, keine Zustandsmutation, kein RNG, keine Uhr.
// Animation (Wiegen/Bob/Punch/Squash) bleibt Transform des Renderers — deshalb lebt sie live,
// nur die FORM wird gebacken.

import type { ResolvedVisual } from '../visual/generator';
import { drawPlantAnatomy } from './plants';

interface CacheEntry {
  canvas: HTMLCanvasElement;
  /** Kantenlänge in CSS-Pixeln, für die gebacken wurde. */
  spanPx: number;
}

/** Sprite-Fenster in Zellen: Platz für Blätter, Blüten und Dornen, die über die Zelle hinausragen. */
const SPRITE_SPAN = 3;

const cache = new Map<string, CacheEntry>();

/** Sprite-Kanvas für eine Pflanze: EIN Mal zeichnen, N-mal drawImage. */
export function spriteFor(
  visual: ResolvedVisual,
  cell: number,
  dpr: number,
): HTMLCanvasElement {
  const spanPx = Math.ceil(cell * SPRITE_SPAN * dpr);
  const key = `${visual.variantKey}|${spanPx}`;
  const hit = cache.get(key);
  if (hit) return hit.canvas;

  const canvas = document.createElement('canvas');
  canvas.width = spanPx;
  canvas.height = spanPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('SpriteCache: 2D context unavailable');

  // Die Anatomie ist normiert (±1) und wird hier auf das Sprite-Fenster gezeichnet; bei
  // Device-Auflösung gebacken bleibt sie auf Retina scharf (drawImage skaliert nur herunter).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawPlantAnatomy(ctx, visual.phenotype, spanPx);

  const entry: CacheEntry = { canvas, spanPx };
  cache.set(key, entry);
  return canvas;
}

/** Cache-Größe (DevGate/Tests) — Anzahl gebackener Sprites. */
export function spriteCacheSize(): number {
  return cache.size;
}

/** Cache leeren — nur für Tests oder einen bewussten „Neu zeichnen"-Fall gedacht. */
export function clearSpriteCache(): void {
  cache.clear();
}

/**
 * drawImage-Helfer: zeichnet das Sprite zentriert auf (x, y) mit der Transform-Skala
 * (Punch/Squash) — die Größe des Wesens steckt bereits in seiner Anatomie.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  visual: ResolvedVisual,
  cell: number,
  dpr: number,
  x: number,
  y: number,
  scale: number,
): void {
  const sprite = spriteFor(visual, cell, dpr);
  const drawSpan = (cell * SPRITE_SPAN) * scale;
  ctx.drawImage(sprite, x - drawSpan / 2, y - drawSpan / 2, drawSpan, drawSpan);
}
