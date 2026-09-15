// Owner: EnemyBodiesLayer. LOC ≤ 300.
// Five distinct CGI bodies (B10 + Kästchenblock-CGI): Verlaufsfill + Specular +
// Ink-Kontur, skaliert mit cellScale (Boss ×2.2 etc.). Caller owns transform/punch/HP.

import type { EnemyEntity } from '../../simulation/state';

const INK = '#2b2b26';

/** CGI-Grundkörper: Verlaufsfill (Licht oben-links), Specular, Ink-Kontur. */
function cgiBody(ctx: CanvasRenderingContext2D, rx: number, ry: number, fill: string, offX = 0): void {
  const g = ctx.createLinearGradient(-rx, -ry, rx, ry);
  g.addColorStop(0, lighten(fill, 0.2));
  g.addColorStop(0.55, fill);
  g.addColorStop(1, darken(fill, 0.24));
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(offX, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const sp = ctx.createRadialGradient(offX - rx * 0.35, -ry * 0.45, rx * 0.05, offX - rx * 0.3, -ry * 0.4, rx * 0.7);
  sp.addColorStop(0, 'rgba(255,255,255,0.55)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(offX - rx * 0.3, -ry * 0.4, rx * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = sp;
  ctx.fill();
  // Ink-Gesichtspunkte
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(offX + rx * 0.35, -ry * 0.2, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(offX + rx * 0.7, -ry * 0.1, 1.2, 0, Math.PI * 2); ctx.fill();
}

function shiftColor(hex: string, f: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  if (f >= 0) return `#${c(r + (255 - r) * f)}${c(g + (255 - g) * f)}${c(b + (255 - b) * f)}`;
  return `#${c(r * (1 + f))}${c(g * (1 + f))}${c(b * (1 + f))}`;
}
function lighten(hex: string, f: number): string { return shiftColor(hex, f); }
function darken(hex: string, f: number): string { return shiftColor(hex, -f); }

export function drawEnemyBody(
  ctx: CanvasRenderingContext2D,
  typeId: EnemyEntity['typeId'],
  cell: number,
  t: number,
): void {
  switch (typeId) {
    case 'grunt': {
      ctx.rotate(Math.sin(t * 2.1) * 0.07);
      inkBody(ctx, cell * 0.20, cell * 0.17, '#b0653f');
      const f = Math.sin(t * 6) > 0 ? 1 : -1;
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-cell * 0.12, cell * 0.12); ctx.lineTo(-cell * 0.16, cell * 0.20 * f + cell * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cell * 0.12, cell * 0.12); ctx.lineTo(cell * 0.16, cell * 0.20 * -f + cell * 0.12); ctx.stroke();
      break;
    }
    case 'fast': {
      inkBody(ctx, cell * 0.24, cell * 0.12, '#c9a83b');
      ctx.globalAlpha = 0.25;
      inkBody(ctx, cell * 0.20, cell * 0.10, '#c9a83b', -cell * 0.10);
      ctx.globalAlpha = 0.12;
      inkBody(ctx, cell * 0.16, cell * 0.08, '#c9a83b', -cell * 0.18);
      ctx.globalAlpha = 1;
      break;
    }
    case 'tank': {
      ctx.rotate(Math.sin(t) * 0.02);
      inkBody(ctx, cell * 0.30, cell * 0.24, '#7d9bc0');
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-cell * 0.10, -cell * 0.20); ctx.quadraticCurveTo(0, -cell * 0.30, cell * 0.10, -cell * 0.20); ctx.stroke();
      break;
    }
    case 'swarm': {
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i * Math.PI * 2) / 3;
        const ox = Math.cos(a) * cell * 0.10;
        const oy = Math.sin(a * 1.3) * cell * 0.07;
        ctx.fillStyle = '#8a6fae';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(ox, oy, cell * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      break;
    }
    case 'boss': {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#c96f8e';
      ctx.beginPath(); ctx.arc(0, 0, cell * 0.48, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      inkBody(ctx, cell * 0.36, cell * 0.30, '#8a4a5e');
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-cell * 0.12, -cell * 0.26); ctx.lineTo(-cell * 0.22, -cell * 0.44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cell * 0.12, -cell * 0.26); ctx.lineTo(cell * 0.22, -cell * 0.44); ctx.stroke();
      break;
    }
  }
}

function inkBody(ctx: CanvasRenderingContext2D, rx: number, ry: number, fill: string, offX = 0): void {
  cgiBody(ctx, rx, ry, fill, offX);
}
