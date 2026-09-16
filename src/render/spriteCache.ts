// Owner: RenderSystem (SpriteCache). LOC ≤ 200.
// B28 — Performance-Fundament für B26: Jede Pflanze (ResolvedVisual) wird EINMAL pro
// (variantKey, Zellgröße, DPR) auf ein OffscreenCanvas gerendert; pro Frame bleibt nur
// ein drawImage statt 3–6 Pfad-+Gradient-Operationen pro Layer. Der Cache-Schlüssel ist
// der `variantKey` (stabile Identität aus dem Generator, test-locked) — nicht die
// variantId: dieselbe Genome-Form in zwei Runs teilt sich das Sprite nur bei gleichem
// Key, verschiedene Formen kollidieren nie. Reine Präsentation: lesen aus dem
// ResolvedVisual, keine Zustandsmutation, kein RNG.
//
// Determinismus-Konto: Das Sprite wird aus denselben drawLayerPrimitive-Aufrufen
// gebaut wie vorher der Direktpfad — das Bild ist pixel-identisch (gleicher
// Koordinatenraum ±1, gleiche Skalen). Idle-Animation (sway/bob) und Punch/Squash
// bleiben Transform-Eigenschaften des Renderers, NICHT Teil des Sprites — deshalb
// bleibt die Animation live, nur die Form wird gebacken.

import type { ResolvedVisual } from '../visual/generator';
import { drawLayerPrimitive } from './layers/primitives';

interface CacheEntry {
  canvas: HTMLCanvasElement;
  /** Kantenlänge in CSS-Pixeln, für die gebacken wurde (Spritemaß = cell * SPRITE_SPAN). */
  spanPx: number;
}

/** Sprite-Fenster in Zellen: Platz für Layer, die über die Zelle hinausragen
 *  (Petals ±1.18, Glow 1.25, Antennen bis -1.02) plus Rand für die 0.12-Kontur. */
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

  // Same coordinate space as the direct path: layers are drawn at unit scale
  // (±1) times cell*0.3, centered. We bake at device resolution so the sprite
  // stays crisp on retina (drawImage downscales cleanly, upscale never happens
  // — spanPx is derived from the DPR-scaled cell).
  const unit = (cell * dpr) * 0.3;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(spanPx / 2, spanPx / 2);
  for (const layer of visual.layers) {
    ctx.save();
    ctx.translate(layer.anchor.x * cell * dpr, layer.anchor.y * cell * dpr);
    ctx.rotate(layer.rotation);
    const s = layer.scale * unit;
    ctx.scale(s, s);
    drawLayerPrimitive(ctx, layer.key, layer.color, layer.outline);
    ctx.restore();
  }

  const entry: CacheEntry = { canvas, spanPx };
  cache.set(key, entry);
  return canvas;
}

/** Cache-Größe (DevGate/Tests) — Anzahl gebackener Sprites. */
export function spriteCacheSize(): number {
  return cache.size;
}

/** Cache leeren — nur für Tests oder einen bewussten „Neu zeichnen“-Fall gedacht. */
export function clearSpriteCache(): void {
  cache.clear();
}

/**
 * drawImage-Helfer: zeichnet das Sprite zentriert auf (x, y) mit der Gesamt-Skala
 * `scale` (Genom-Skala × Punch × Squash). Kein Speicherverhalten — reine Ausgabe.
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
