// Owner: TerrainLayerSystem (render layer 1, pre-baked). LOC ≤ 300.
// Papierwelt wird EINMAL pro Seed in ein Offscreen-Canvas gebacken (B10):
// Papierkorn, Rasen-Tuffs statt Raster, geschichteter Pfad mit Abnutzung, Dekor.
// Zero Kosten pro Frame. Alle Streuung aus dem 'visual'-Namespace (deterministisch).

import { GRID_COLS, GRID_ROWS, ENEMY_PATH, PLACEMENT_PATH_MARGIN, dist } from '../../config/world.source';
import { makeRng, deriveSeed } from '../../core/rng';

const PAPER = '#f5efdc';
const PAPER_DIM = '#e8dfc8';
const DIRT = '#d9c9a3';
const DIRT_EDGE = '#b7a986';
const INK = '#2b2b26';
const TUFT = '#8ba872';

export function bakeTerrain(seed: number): HTMLCanvasElement {
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = GRID_COLS * cell;
  canvas.height = GRID_ROWS * cell;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng('visual', deriveSeed(seed, 'visual', 'terrain', 0, 1));

  // ── paper base + grain ──
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(43,43,38,0.05)';
  for (let i = 0; i < 1400; i++) {
    const x = rng.next() * canvas.width;
    const y = rng.next() * canvas.height;
    ctx.fillRect(x, y, rng.next() < 0.3 ? 1.5 : 1, 1);
  }
  // few faint fiber strokes
  ctx.strokeStyle = 'rgba(43,43,38,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = rng.next() * canvas.width, y = rng.next() * canvas.height;
    const a = rng.next() * Math.PI;
    const l = 20 + rng.next() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }

  // ── lawn tufts on legal placement cells (grid vanishes into ink-dotted corners) ──
  const isLegal = (gx: number, gy: number) => {
    const cx = gx + 0.5, cy = gy + 0.5;
    for (const p of ENEMY_PATH) if (dist(cx, cy, p.x, p.y) < PLACEMENT_PATH_MARGIN) return false;
    return true;
  };
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      if (!isLegal(gx, gy)) continue;
      // corner dots (subtle cell hint)
      ctx.fillStyle = 'rgba(43,43,38,0.10)';
      ctx.beginPath(); ctx.arc(gx * cell + 3, gy * cell + 3, 1.4, 0, Math.PI * 2); ctx.fill();
      // tufts
      const tufts = 2 + Math.floor(rng.next() * 3);
      ctx.strokeStyle = TUFT;
      ctx.lineWidth = 1.6;
      for (let t = 0; t < tufts; t++) {
        const x = gx * cell + 8 + rng.next() * (cell - 16);
        const y = gy * cell + 8 + rng.next() * (cell - 16);
        const h = 4 + rng.next() * 6;
        const lean = (rng.next() - 0.5) * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + lean, y - h * 0.6, x + lean * 1.6, y - h);
        ctx.stroke();
      }
    }
  }

  // ── path: layered dirt ribbon ──
  const HALF = 0.42;
  const wobble = (base: number, salt: number) => base + (rng.next() - 0.5) * 0.06 * (salt || 1);
  const drawStrip = (width: number, color: string) => {
    ctx.fillStyle = color;
    for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
      const a = ENEMY_PATH[i], b = ENEMY_PATH[i + 1];
      const ax = a.x * cell, ay = a.y * cell, bx = b.x * cell, by = b.y * cell;
      const ang = Math.atan2(by - ay, bx - ax);
      const px = Math.sin(ang) * width, py = -Math.cos(ang) * width;
      ctx.beginPath();
      ctx.moveTo(ax - px, ay - py);
      ctx.lineTo(ax + px, ay + py);
      ctx.lineTo(bx + px, by + py);
      ctx.lineTo(bx - px, by - py);
      ctx.closePath();
      ctx.fill();
      // round joint
      ctx.beginPath(); ctx.arc(bx, by, width, 0, Math.PI * 2); ctx.fill();
    }
  };
  drawStrip(cell * wobble(HALF + 0.07, 1), DIRT_EDGE); // dark under-edge
  drawStrip(cell * HALF, DIRT);                        // body

  // wear speckles + stepping stones on the path
  for (let i = 0; i < 260; i++) {
    const seg = Math.floor(rng.next() * (ENEMY_PATH.length - 1));
    const a = ENEMY_PATH[seg], b = ENEMY_PATH[seg + 1];
    const t = rng.next();
    const off = (rng.next() - 0.5) * HALF * 1.7;
    const x = (a.x + (b.x - a.x) * t) * cell - Math.sin(Math.atan2(b.y - a.y, b.x - a.x)) * off * cell;
    const y = (a.y + (b.y - a.y) * t) * cell + Math.cos(Math.atan2(b.y - a.y, b.x - a.x)) * off * cell;
    ctx.fillStyle = rng.next() < 0.5 ? 'rgba(183,169,134,0.5)' : 'rgba(245,239,220,0.55)';
    ctx.beginPath(); ctx.arc(x, y, 1 + rng.next() * 2, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
    const stones = 1 + Math.floor(rng.next() * 2);
    for (let s = 0; s < stones; s++) {
      const a = ENEMY_PATH[i], b = ENEMY_PATH[i + 1];
      const t = 0.25 + rng.next() * 0.5;
      const x = (a.x + (b.x - a.x) * t) * cell;
      const y = (a.y + (b.y - a.y) * t) * cell;
      ctx.fillStyle = PAPER_DIM;
      ctx.strokeStyle = 'rgba(43,43,38,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + rng.next() * 4, 4 + rng.next() * 3, rng.next() * Math.PI, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }
  // ink contour along path edges (wobbling, hand-drawn)
  ctx.strokeStyle = 'rgba(43,43,38,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
    const a = ENEMY_PATH[i], b = ENEMY_PATH[i + 1];
    const ax = a.x * cell, ay = a.y * cell, bx = b.x * cell, by = b.y * cell;
    const ang = Math.atan2(by - ay, bx - ax);
    for (const side of [-1, 1] as const) {
      const px = Math.sin(ang) * cell * HALF * side, py = -Math.cos(ang) * cell * HALF * side;
      ctx.beginPath();
      ctx.moveTo(ax + px + (rng.next() - 0.5) * 2, ay + py + (rng.next() - 0.5) * 2);
      ctx.lineTo(bx + px + (rng.next() - 0.5) * 2, by + py + (rng.next() - 0.5) * 2);
      ctx.stroke();
    }
  }

  // ── decor scatter (off-path, no gameplay meaning) ──
  for (let i = 0; i < 10; i++) {
    const x = rng.next() * canvas.width, y = rng.next() * canvas.height;
    if (!isLegal(Math.floor(x / cell) - 0, Math.floor(y / cell))) { /* allow anyway, decor is passive */ }
    ctx.strokeStyle = 'rgba(90,143,78,0.8)';
    ctx.lineWidth = 1.8;
    for (let b = 0; b < 3; b++) {
      const bx = x + (b - 1) * 3, h = 5 + rng.next() * 7;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.quadraticCurveTo(bx + (b - 1), y - h * 0.6, bx + (b - 1) * 2, y - h);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = rng.next() * canvas.width, y = rng.next() * canvas.height;
    ctx.fillStyle = '#c9bd9e';
    ctx.strokeStyle = 'rgba(43,43,38,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rng.next() * 3, 2.4 + rng.next() * 2, rng.next() * Math.PI, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  return canvas;
}
