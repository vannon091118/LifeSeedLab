// Owner: EnemyBodiesLayer. LOC ≤ 300.
// Five distinct ink bodies (B10) — caller owns world transform / punch / HP bar.

import type { EnemyEntity } from '../../simulation/state';

const INK = '#2b2b26';

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
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(offX, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(offX + rx * 0.35, -ry * 0.2, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(offX + rx * 0.7, -ry * 0.1, 1.2, 0, Math.PI * 2); ctx.fill();
}
