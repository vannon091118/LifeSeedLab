// Owner: RenderLayer (map tiles). LOC ≤ 400.
// Kästchenblock-Vertrag: EINE Kachel = EIN Kasten des Blocks (rastersynchron,
// Umrisse auf den Kästchenlinien). Inhalt als CGI-Kontrast (Verlauf + Specular +
// Ink-Kontur) — Reine Präsentation, liest nur Tile-Typ + Verbindungstyp.

import { resolvePathConnection, type PathConnection } from '../../config/map.source';

const INK = '#2b2b26';
const PENCIL = 'rgba(43,43,38,0.35)';
const PATH_COLOR = '#d9c9a3';
const PATH_DARK = '#b7a986';

/** Der Kasten: rastersynchroner Zellrahmen — jede Kachel wohnt exakt im Kästchen. */
function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, tint?: string): void {
  if (tint) {
    ctx.fillStyle = tint;
    ctx.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
  }
  ctx.strokeStyle = 'rgba(43,43,38,0.55)';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
}

/** CGI-Shading: weicher Specular oben links (Belohnung der Form, nie Klima). */
function drawSpecular(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha = 0.8): void {
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, 1, cx - r * 0.4, cy - r * 0.5, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.4, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

// ── Path-Segmente: verbundene Bleistift-Erdstreifen im Kasten ──
function drawPathSegment(ctx: CanvasRenderingContext2D, conn: PathConnection, x: number, y: number, cell: number): void {
  const w = cell * 0.5;
  const half = w / 2;
  const cx = x + cell / 2;
  const cy = y + cell / 2;

  const seg = (rx: number, ry: number, rw: number, rh: number) => {
    ctx.fillStyle = PATH_COLOR;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = PENCIL;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(rx, ry, rw, rh);
  };

  switch (conn) {
    case 'straight_h': seg(x, cy - half, cell, w); break;
    case 'straight_v': seg(cx - half, y, w, cell); break;
    case 'corner_tl': seg(x, cy - half, half + 1, w); seg(cx - half, y, w, half + 1); break;
    case 'corner_tr': seg(cx - 1, cy - half, half + 1, w); seg(cx - half, y, w, half + 1); break;
    case 'corner_bl': seg(x, cy - half, half + 1, w); seg(cx - half, cy - 1, w, half + 1); break;
    case 'corner_br': seg(cx - 1, cy - half, half + 1, w); seg(cx - half, cy - 1, w, half + 1); break;
    case 't_top': seg(x, cy - half, cell, w); seg(cx - half, y, w, half + 1); break;
    case 't_bottom': seg(x, cy - half, cell, w); seg(cx - half, cy - 1, w, half + 1); break;
    case 't_left': seg(cx - half, y, w, cell); seg(x, cy - half, half + 1, w); break;
    case 't_right': seg(cx - half, y, w, cell); seg(cx - 1, cy - half, half + 1, w); break;
    case 'cross': seg(x, cy - half, cell, w); seg(cx - half, y, w, cell); break;
    case 'end_top': seg(cx - half, y, w, half + 1); break;
    case 'end_right': seg(cx - 1, cy - half, half + 1, w); break;
    case 'end_bottom': seg(cx - half, cy - 1, w, half + 1); break;
    case 'end_left': seg(x, cy - half, half + 1, w); break;
    case 'isolated': seg(cx - half, cy - half, w, w); break;
  }

  // dunkle Kante + Körnung (Abnutzung, deterministisch aus Koordinaten)
  ctx.fillStyle = 'rgba(43,43,38,0.10)';
  const seed = (x * 7 + y * 13) >>> 0;
  for (let i = 0; i < 4; i++) {
    const px = cx + ((seed + i * 37) % Math.max(2, w - 4)) - half + 2;
    const py = cy + ((seed + i * 53) % Math.max(2, w - 4)) - half + 2;
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.strokeStyle = PATH_DARK;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 2, cy - half + 1.5);
  ctx.lineTo(x + cell - 2, cy - half + 1.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ── Pflanztopf: CGI-Terrakotta (Verlauf + Specular + Ink) ──
function drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number): void {
  const pad = cell * 0.16;
  const cx = x + cell / 2;
  const g = ctx.createLinearGradient(x + pad, y + pad, x + cell - pad, y + cell - pad);
  g.addColorStop(0, '#e2955f');
  g.addColorStop(1, '#a3552b');
  ctx.beginPath();
  ctx.moveTo(x + pad, y + pad);
  ctx.lineTo(x + cell - pad, y + pad);
  ctx.lineTo(x + cell - pad * 1.7, y + cell - pad);
  ctx.quadraticCurveTo(cx, y + cell - pad * 0.35, x + pad * 1.7, y + cell - pad);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  drawSpecular(ctx, cx - cell * 0.06, y + pad + cell * 0.14, cell * 0.16, 0.7);
  // Gefäßrand
  ctx.fillStyle = '#c96f3b';
  ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell * 0.15);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell * 0.15);
}

// ── Findling: CGI-Stein mit Facetten ──
function drawBoulder(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number): void {
  const g = ctx.createLinearGradient(x + cell * 0.2, y + cell * 0.2, x + cell * 0.8, y + cell * 0.8);
  g.addColorStop(0, '#c4beb2');
  g.addColorStop(1, '#8a8478');
  ctx.beginPath();
  ctx.moveTo(x + cell * 0.18, y + cell * 0.78);
  ctx.lineTo(x + cell * 0.12, y + cell * 0.42);
  ctx.lineTo(x + cell * 0.38, y + cell * 0.18);
  ctx.lineTo(x + cell * 0.68, y + cell * 0.22);
  ctx.lineTo(x + cell * 0.88, y + cell * 0.5);
  ctx.lineTo(x + cell * 0.8, y + cell * 0.78);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  drawSpecular(ctx, x + cell * 0.4, y + cell * 0.35, cell * 0.16, 0.85);
  ctx.strokeStyle = 'rgba(43,43,38,0.45)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x + cell * 0.32, y + cell * 0.44);
  ctx.lineTo(x + cell * 0.5, y + cell * 0.62);
  ctx.stroke();
}

// ── Deko: Kritzel-Blume (Bleistift-Stiel, CGI-Blüte) ──
function drawDecor(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number): void {
  const cx = x + cell * 0.5;
  const cy = y + cell * 0.64;
  ctx.strokeStyle = '#5a8f4e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy + cell * 0.18);
  ctx.quadraticCurveTo(cx + 2, cy, cx, cy - cell * 0.1);
  ctx.stroke();
  const g = ctx.createRadialGradient(cx - 2, cy - cell * 0.14, 1, cx, cy - cell * 0.12, 6);
  g.addColorStop(0, '#e3a1b8');
  g.addColorStop(1, '#c96f8e');
  ctx.fillStyle = g;
  for (const [dx, dy] of [[-3, -4], [3, -4], [0, -7], [-2, -1], [2, -1]] as const) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy - 4.4, 3.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fbf6e9';
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

/** Eine Kachel = ein Kasten + Inhalt. Public API unverändert (Renderer). */
export function drawMapTile(
  ctx: CanvasRenderingContext2D,
  tile: string,
  gx: number,
  gy: number,
  cell: number,
  allTiles?: Record<string, string>,
): void {
  const x = gx * cell;
  const y = gy * cell;
  ctx.save();
  switch (tile) {
    case 'pot':
      drawBox(ctx, x, y, cell, 'rgba(233,223,200,0.5)');
      drawPot(ctx, x, y, cell);
      break;
    case 'path':
      drawPathSegment(ctx, allTiles ? resolvePathConnection(allTiles, gx, gy, () => true) : 'isolated', x, y, cell);
      drawBox(ctx, x, y, cell);
      break;
    case 'boulder':
      drawBox(ctx, x, y, cell, 'rgba(233,223,200,0.5)');
      drawBoulder(ctx, x, y, cell);
      break;
    case 'decor':
      drawBox(ctx, x, y, cell);
      drawDecor(ctx, x, y, cell);
      break;
    default:
      break; // unbekannter Typ: nichts zeichnen (Validierung fängt das ab)
  }
  ctx.restore();
}
