// Owner: RenderLayer (map tiles). LOC ≤ 400.
// Kästchenblock-Vertrag: EINE Kachel = EIN Kasten des Blocks (rastersynchron,
// Umrisse auf den Kästchenlinien). Inhalt als CGI-Kontrast (Verlauf + Specular +
// Ink-Kontur) — Reine Präsentation, liest nur den Tile-Typ.
//
// KEIN Weg-Sprite (21.09.2026): Der Weg ist das PATHFINDING-ERGEBNIS und wird von `terrain.ts`
// als Strecke gezeichnet — ein zweites, kachelweises Weg-Bild wäre die zweite Wahrheit über
// denselben Weg. Hier stehen nur noch die DINGE, die der Spieler setzt (Topf, Deko).

import type { PotColor } from '../../config/pot.source';
import { potColorAt } from '../../simulation/potBoost';

const INK = '#2b2b26';

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

// ── Pflanztopf: CGI-Terrakotta (Verlauf + Specular + Ink) ──
//
// TOPF-FARBE (19.09.2026): Der Topf ist ein Booster, und die Farbe ist seine Aussage — sie wird
// deshalb GEZEICHNET, nicht nur berechnet. Die Palette ist Präsentation (sie erklärt nur, was die
// Sim aus derselben Zell-Ableitung tut); die Wahrheit „welche Farbe hat diese Zelle" liefert
// `simulation/potBoost.ts`. Beide zusammen: gleiche Farbe in Bild und Wirkung.
const POT_PALETTE: Record<PotColor, { light: string; dark: string; rim: string }> = {
  amber:  { light: '#f0b775', dark: '#b3712f', rim: '#d59a52' },
  violet: { light: '#c8a4e0', dark: '#7d55a0', rim: '#a884c4' },
  moss:   { light: '#a8cd86', dark: '#5f8a41', rim: '#8bb469' },
  rust:   { light: '#d99b84', dark: '#8f4a34', rim: '#bb7259' },
};

function drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, color: PotColor): void {
  const pad = cell * 0.16;
  const cx = x + cell / 2;
  const tone = POT_PALETTE[color];
  const g = ctx.createLinearGradient(x + pad, y + pad, x + cell - pad, y + cell - pad);
  g.addColorStop(0, tone.light);
  g.addColorStop(1, tone.dark);
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
  ctx.fillStyle = tone.rim;
  ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell * 0.15);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell * 0.15);
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
): void {
  const x = gx * cell;
  const y = gy * cell;
  // Zell-Farbe des Topfes: dieselbe Ableitung, die die Sim für die Wirkung nutzt.
  const color = potColorAt(gx, gy);
  ctx.save();
  switch (tile) {
    case 'pot':
      drawBox(ctx, x, y, cell, 'rgba(233,223,200,0.5)');
      drawPot(ctx, x, y, cell, color);
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
