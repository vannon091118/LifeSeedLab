// Owner: ParticleDrawLayer. LOC ≤ 250.
// Per-kind shapes (B10) — A9 fix: kein Konfetti-Einheitskreis.

import type { Particle } from '../../observers/particles';

export function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  toPx: (x: number) => number,
  toPy: (y: number) => number,
  cell: number,
): void {
  const k = p.life / p.maxLife;
  const x = toPx(p.x), y = toPy(p.y);
  const s = Math.max(1, p.size * cell);
  ctx.globalAlpha = k;
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  switch (p.kind) {
    case 'SPARK': {
      ctx.lineWidth = Math.max(1, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      ctx.stroke();
      break;
    }
    case 'SMOKE': {
      ctx.beginPath(); ctx.arc(x, y, s * (1.6 - k * 0.6), 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'DUST': {
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.4, s * 0.6, p.rotation, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'GLOW': {
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'RING': {
      ctx.lineWidth = Math.max(1, s * 0.4);
      ctx.beginPath(); ctx.arc(x, y, s * (2.2 - k) * 1.4, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'SHARD': {
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rotation);
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'BUBBLE': {
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'SPORE': {
      ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'LEAF': {
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rotation + Math.sin(p.life * 0.3) * 0.6);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.quadraticCurveTo(s, 0, 0, s * 1.2);
      ctx.quadraticCurveTo(-s, 0, 0, -s * 1.2);
      ctx.fill();
      ctx.restore();
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
