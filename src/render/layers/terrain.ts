// Owner: TerrainLayerSystem (render layer 1, pre-baked). LOC ≤ 300.
// Kästchenblock-CGI (docs/art/papier-trifft-cgi.md): Schul-Mathe-Collageblock als
// Bühne — warmes Papier, blaue Rasterlinien exakt auf CELL_SIZE, Blockrand + Lochung,
// Bleistift-Kritzeleien, Collage-Fetzen. EINMAL pro Seed gebacken (B10), zero Kosten
// pro Frame. Alle Streuung aus dem 'visual'-Namespace (deterministisch).

import { GRID_COLS, GRID_ROWS, ENEMY_PATH } from '../../config/world.source';
import { makeRng, deriveSeed } from '../../core/rng';

const PAPER = '#f5efdc';
const PAPER_DIM = '#e8dfc8';
const GRID_BLUE = 'rgba(120,150,190,0.38)';
const INK = '#2b2b26';
const DIRT = '#d9c9a3';
const DIRT_EDGE = '#b7a986';
const PENCIL = 'rgba(43,43,38,0.09)';

export function bakeTerrain(seed: number): HTMLCanvasElement {
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = GRID_COLS * cell;
  canvas.height = GRID_ROWS * cell;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng('visual', deriveSeed(seed, 'visual', 'terrain', 0, 1));

  // ── Papierkorn (matt, fein) ──
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(43,43,38,0.045)';
  for (let i = 0; i < 1200; i++) {
    ctx.fillRect(rng.next() * canvas.width, rng.next() * canvas.height, rng.next() < 0.3 ? 1.5 : 1, 1);
  }

  // ── Kästchen-Raster (exakt auf CELL_SIZE — die Welt wohnt im Heft) ──
  ctx.strokeStyle = GRID_BLUE;
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= GRID_COLS; gx++) {
    ctx.beginPath();
    ctx.moveTo(gx * cell + 0.5, 0);
    ctx.lineTo(gx * cell + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let gy = 0; gy <= GRID_ROWS; gy++) {
    ctx.beginPath();
    ctx.moveTo(0, gy * cell + 0.5);
    ctx.lineTo(canvas.width, gy * cell + 0.5);
    ctx.stroke();
  }

  // ── Blockrand + Lochung links (Heft-Echtzeit) ──
  const MARGIN = 22;
  ctx.fillStyle = PAPER_DIM;
  ctx.fillRect(0, 0, MARGIN, canvas.height);
  ctx.strokeStyle = 'rgba(43,43,38,0.30)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(MARGIN + 0.5, 0);
  ctx.lineTo(MARGIN + 0.5, canvas.height);
  ctx.stroke();
  for (let y = 30; y < canvas.height; y += 44) {
    ctx.fillStyle = '#dcd5c0';
    ctx.beginPath();
    ctx.arc(MARGIN / 2, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,43,38,0.32)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // ── Bleistift-Kritzeleien (Archive verlorener Rechenstunden) ──
  drawScribbles(ctx, rng, cell);

  // ── Collage-Fetzen + Klebestreifen (2–4, Rand-nah) ──
  drawCollageScraps(ctx, rng, cell);

  // ── Route: handgezeichneter Tinten-/Erden-Strich ÜBER dem Raster ──
  drawPath(ctx, rng, cell);

  return canvas;
}

// ── Kritzeleien: Sterne, Spiralen, Mini-Formeln, Kringel ──
function drawScribbles(ctx: CanvasRenderingContext2D, rng: ReturnType<typeof makeRng>, cell: number): void {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const gx = 1 + Math.floor(rng.next() * (GRID_COLS - 1));
    const gy = Math.floor(rng.next() * GRID_ROWS);
    const cx = gx * cell + cell * 0.3 + rng.next() * cell * 0.4;
    const cy = gy * cell + cell * 0.3 + rng.next() * cell * 0.4;
    const kind = Math.floor(rng.next() * 4);
    ctx.strokeStyle = PENCIL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (kind === 0) {
      // Stern (5 Zacken, gezeichnet, nicht geometrisch-perfekt)
      const r1 = 4 + rng.next() * 3, r2 = 9 + rng.next() * 4;
      for (let k = 0; k <= 5; k++) {
        const a = -Math.PI / 2 + k * (2 * Math.PI * 2 / 5);
        const px = cx + Math.cos(a) * r2, py = cy + Math.sin(a) * r2;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        const a2 = a + (2 * Math.PI / 5);
        ctx.lineTo(cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1);
      }
    } else if (kind === 1) {
      // Spirale
      for (let t = 0; t < 24; t++) {
        const a = t * 0.36, r = 1.2 * t;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    } else if (kind === 2) {
      // Mini-Formel: x | = | (
      ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx - 7, cy - 6); ctx.lineTo(cx - 7, cy + 6);
      ctx.moveTo(cx + 6, cy - 7); ctx.lineTo(cx + 6, cy + 7);
    } else {
      // Kringel (doppelwellige Schlaufe)
      for (let t = 0; t < 30; t++) {
        const a = t * 0.42;
        const px = cx + Math.cos(a) * (5 + t * 0.55);
        const py = cy + Math.sin(a * 2) * 4;
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }
}

// ── Collage: Papier-Fetzen + Klebestreifen (Collageblock-Identität) ──
function drawCollageScraps(ctx: CanvasRenderingContext2D, rng: ReturnType<typeof makeRng>, cell: number): void {
  // 2–3 Fetzen: leicht gedrehte Rechtecke in Papier-Tönen mit Ink-Kante
  const scraps = 2 + Math.floor(rng.next() * 2);
  for (let i = 0; i < scraps; i++) {
    const x = rng.next() * GRID_COLS * cell;
    const y = rng.next() * GRID_ROWS * cell;
    const w = cell * (0.7 + rng.next() * 0.9);
    const h = cell * (0.5 + rng.next() * 0.6);
    const rot = (rng.next() - 0.5) * 0.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = rng.next() < 0.5 ? PAPER_DIM : '#fdf8ea';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // 1–2 Klebestreifen (halbdurchscheinend, leicht rotiert)
  const tapes = 1 + Math.floor(rng.next() * 2);
  for (let i = 0; i < tapes; i++) {
    const x = rng.next() * GRID_COLS * cell;
    const y = rng.next() * GRID_ROWS * cell;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rng.next() - 0.5) * 0.6);
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(-22, -7, 44, 14);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.strokeRect(-22, -7, 44, 14);
    ctx.restore();
  }
}

// ── Route: geschichteter Erdstreifen mit Wackelkontur (lesbar über dem Raster) ──
function drawPath(ctx: CanvasRenderingContext2D, rng: ReturnType<typeof makeRng>, cell: number): void {
  const HALF = 0.42;
  const wobble = (base: number, salt: number) => base + (rng.next() - 0.5) * 0.05 * (salt || 1);
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
      ctx.beginPath(); ctx.arc(bx, by, width, 0, Math.PI * 2); ctx.fill();
    }
  };
  drawStrip(cell * wobble(HALF + 0.06, 1), DIRT_EDGE); // dunkle Unterkante
  drawStrip(cell * HALF, DIRT);                        // Körper

  // Abnutzungs-Sprenkel + Trittsteine
  for (let i = 0; i < 220; i++) {
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
  // Wackelkontur an den Rändern (handgezeichnet)
  ctx.strokeStyle = 'rgba(43,43,38,0.5)';
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
}
