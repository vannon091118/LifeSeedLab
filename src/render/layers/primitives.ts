// Owner: RenderPrimitivesLayer. LOC ≤ 300.
// Source-driven ink/paper primitives — single place for all silhouette keys (B10).

export function drawLayerPrimitive(
  ctx: CanvasRenderingContext2D,
  key: string,
  color: string,
  outline: string,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.09;

  const circle = (r: number) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  switch (key) {
    case 'round': case 'canopy': case 'body': case 'bulb': case 'core':
      circle(1); break;
    case 'stem': case 'stalk': case 'trunk':
      ctx.beginPath();
      ctx.moveTo(-0.13, 1.1);
      ctx.quadraticCurveTo(-0.09, 0, -0.10, -1.15);
      ctx.lineTo(0.10, -1.15);
      ctx.quadraticCurveTo(0.09, 0, 0.13, 1.1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'petals': case 'thorns': case 'shards': case 'spines':
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.ellipse(0.72, 0, 0.46, 0.24, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      break;
    case 'spots': case 'berry': case 'seeds': case 'fluff':
      ctx.beginPath(); ctx.arc(-0.3, -0.3, 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.35, 0.1, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-0.1, 0.4, 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cap':
      ctx.beginPath();
      ctx.moveTo(-1.05, -0.1);
      ctx.quadraticCurveTo(0, -1.05, 1.05, -0.1);
      ctx.quadraticCurveTo(0, 0.25, -1.05, -0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'arm_l': ctx.beginPath(); ctx.ellipse(-0.72, -0.15, 0.42, 0.2, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case 'arm_r': ctx.beginPath(); ctx.ellipse(0.72, -0.15, 0.42, 0.2, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case 'rootlets': case 'tendrils':
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.8, 0.6, -1.1, 0.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.8, 0.6, 1.1, 0.95); ctx.stroke();
      break;
    case 'leaves': case 'fronds':
      ctx.beginPath(); ctx.ellipse(-0.5, -0.6, 0.52, 0.22, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.5, -0.6, 0.52, 0.22, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 'sprout': case 'bud': case 'tip': case 'flower':
      circle(0.36); break;
    case 'glow':
      ctx.globalAlpha = 0.25;
      circle(1.25);
      ctx.globalAlpha = 1;
      break;
    case 'hat':
      ctx.beginPath(); ctx.ellipse(0, -0.8, 0.72, 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -0.95, 0.4, Math.PI, 0); ctx.fill(); ctx.stroke();
      break;
    case 'leafcrown':
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.ellipse(i * 0.36, -0.75, 0.2, 0.36, i * 0.4, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      break;
    case 'spike':
      ctx.beginPath(); ctx.moveTo(0, -1.05); ctx.lineTo(0.16, -0.4); ctx.lineTo(-0.16, -0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'gem':
      ctx.beginPath(); ctx.moveTo(0, -0.55); ctx.lineTo(0.32, 0); ctx.lineTo(0, 0.55); ctx.lineTo(-0.32, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'shroom':
      ctx.beginPath(); ctx.arc(0, 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    case 'vine':
      ctx.beginPath(); ctx.moveTo(0, 0.85); ctx.quadraticCurveTo(0.45, 0.3, 0.22, -0.45); ctx.stroke();
      break;
    case 'eye':
      ctx.fillStyle = '#f5efdc';
      circle(0.22);
      ctx.fillStyle = '#2b2b26';
      ctx.beginPath(); ctx.arc(0, 0, 0.10, 0, Math.PI * 2); ctx.fill();
      break;
    case 'mouth':
      ctx.beginPath(); ctx.arc(0, 0.08, 0.3, 0, Math.PI); ctx.stroke();
      break;
    case 'antenna':
      ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.quadraticCurveTo(0.14, -0.8, 0.22, -1.02); ctx.stroke();
      ctx.beginPath(); ctx.arc(0.22, -1.02, 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    case 'scar':
      ctx.beginPath(); ctx.moveTo(-0.3, -0.2); ctx.lineTo(0.3, 0.2); ctx.stroke();
      break;
    case 'effect_tint':
      ctx.globalAlpha = 0.14;
      circle(1.3);
      ctx.globalAlpha = 1;
      break;
    default:
      circle(0.5);
  }
}
