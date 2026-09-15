// Owner: RenderPrimitivesLayer. LOC ≤ 300.
// Source-driven Silhouette-Keys mit CGI-Shading (Kästchenblock-CGI): Jede Form
// bekommt 2-Stopp-Verlaufsfill (Licht oben-links → Schatten unten-rechts), weichen
// Specular und eine dichte Ink-Kontur. Koordinatenraum bleibt Einheitsform (±1) —
// Caller skaliert. Reine Präsentation: keine Farben entscheiden, nur zeichnen.

/** Verlaufsfill + Kontur für eine Form (CGI-Grundanstrich). */
function cgiFillStroke(
  ctx: CanvasRenderingContext2D,
  color: string,
  outline: string,
  path: () => void,
  fill = true,
  stroke = true,
): void {
  if (fill) {
    // Form-lokaler Verlauf: (-1,-1) Licht → (1,1) Schatten (Einheitsform ±1)
    const g = ctx.createLinearGradient(-1, -1, 1, 1);
    g.addColorStop(0, lighten(color, 0.18));
    g.addColorStop(0.55, color);
    g.addColorStop(1, darken(color, 0.22));
    ctx.fillStyle = g;
  }
  path();
  if (fill) ctx.fill();
  if (stroke) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.12;
    ctx.stroke();
  }
}

// ── Farb-Utils (lokal, rein) ──
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function shift(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (f >= 0) return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
}
function lighten(hex: string, f: number): string { return shift(hex, f); }
function darken(hex: string, f: number): string { return shift(hex, -f); }

/** Weicher Specular oben links (Punktlicht). Koordinaten in Einheitsform —
 *  der Punktlicht-Glow lebt IM caller-Space (skaliert mit der Form, uniform). */
function specular(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha = 0.55): void {
  const g = ctx.createRadialGradient(x - r * 0.15, y - r * 0.15, r * 0.05, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

export function drawLayerPrimitive(
  ctx: CanvasRenderingContext2D,
  key: string,
  color: string,
  outline: string,
): void {
  const circle = (r: number) => {
    cgiFillStroke(ctx, color, outline, () => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    });
    if (r >= 0.8) specular(ctx, -0.38, -0.42, r * 0.85);
  };

  switch (key) {
    case 'round': case 'canopy': case 'body': case 'bulb': case 'core':
      circle(1); break;
    case 'stem': case 'stalk': case 'trunk':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.moveTo(-0.13, 1.1);
        ctx.quadraticCurveTo(-0.09, 0, -0.10, -1.15);
        ctx.lineTo(0.10, -1.15);
        ctx.quadraticCurveTo(0.09, 0, 0.13, 1.1);
        ctx.closePath();
      });
      break;
    case 'petals': case 'thorns': case 'shards': case 'spines':
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(Math.PI / 3);
        cgiFillStroke(ctx, color, outline, () => {
          ctx.beginPath();
          ctx.ellipse(0.72, 0, 0.46, 0.24, 0, 0, Math.PI * 2);
        });
        ctx.restore();
      }
      break;
    case 'spots': case 'berry': case 'seeds': case 'fluff':
      for (const [sx, sy, sr] of [[-0.3, -0.3, 0.18], [0.35, 0.1, 0.15], [-0.1, 0.4, 0.12]] as const) {
        cgiFillStroke(ctx, lighten(color, 0.12), outline, () => {
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        });
      }
      break;
    case 'cap':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.moveTo(-1.05, -0.1);
        ctx.quadraticCurveTo(0, -1.05, 1.05, -0.1);
        ctx.quadraticCurveTo(0, 0.25, -1.05, -0.1);
        ctx.closePath();
      });
      specular(ctx, -0.3, -0.55, 0.55);
      break;
    case 'arm_l': case 'arm_r': {
      const side = key === 'arm_l' ? -1 : 1;
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.ellipse(side * 0.72, -0.15, 0.42, 0.2, side * 0.5, 0, Math.PI * 2);
      });
      break;
    }
    case 'rootlets': case 'tendrils':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.8, 0.6, -1.1, 0.95);
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.8, 0.6, 1.1, 0.95);
      }, false, true);
      break;
    case 'leaves': case 'fronds':
      for (const side of [-1, 1] as const) {
        cgiFillStroke(ctx, color, outline, () => {
          ctx.beginPath();
          ctx.ellipse(side * 0.5, -0.6, 0.52, 0.22, side * 0.6, 0, Math.PI * 2);
        });
      }
      break;
    case 'sprout': case 'bud': case 'tip': case 'flower':
      circle(0.36); break;
    case 'glow':
      ctx.globalAlpha = 0.25;
      circle(1.25);
      ctx.globalAlpha = 1;
      break;
    case 'hat':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.ellipse(0, -0.8, 0.72, 0.16, 0, 0, Math.PI * 2);
      });
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.arc(0, -0.95, 0.4, Math.PI, 0);
      });
      specular(ctx, -0.2, -1.05, 0.3, 0.6);
      break;
    case 'leafcrown':
      for (let i = -1; i <= 1; i++) {
        cgiFillStroke(ctx, color, outline, () => {
          ctx.beginPath();
          ctx.ellipse(i * 0.36, -0.75, 0.2, 0.36, i * 0.4, 0, Math.PI * 2);
        });
      }
      break;
    case 'spike':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.moveTo(0, -1.05); ctx.lineTo(0.16, -0.4); ctx.lineTo(-0.16, -0.4);
        ctx.closePath();
      });
      break;
    case 'gem':
      cgiFillStroke(ctx, lighten(color, 0.15), outline, () => {
        ctx.beginPath();
        ctx.moveTo(0, -0.55); ctx.lineTo(0.32, 0); ctx.lineTo(0, 0.55); ctx.lineTo(-0.32, 0);
        ctx.closePath();
      });
      specular(ctx, -0.08, -0.2, 0.18, 0.75);
      break;
    case 'shroom':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.arc(0, 0.6, 0.3, 0, Math.PI * 2);
      });
      break;
    case 'vine':
      cgiFillStroke(ctx, color, outline, () => {
        ctx.beginPath();
        ctx.moveTo(0, 0.85); ctx.quadraticCurveTo(0.45, 0.3, 0.22, -0.45);
      }, false, true);
      break;
    case 'eye':
      ctx.fillStyle = '#f5efdc';
      ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 0.1; ctx.stroke();
      ctx.fillStyle = '#2b2b26';
      ctx.beginPath(); ctx.arc(0, 0, 0.10, 0, Math.PI * 2); ctx.fill();
      break;
    case 'mouth':
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.09;
      ctx.beginPath(); ctx.arc(0, 0.08, 0.3, 0, Math.PI); ctx.stroke();
      break;
    case 'antenna':
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -0.5); ctx.quadraticCurveTo(0.14, -0.8, 0.22, -1.02);
      ctx.stroke();
      ctx.fillStyle = outline;
      ctx.beginPath(); ctx.arc(0.22, -1.02, 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    case 'scar':
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.moveTo(-0.3, -0.2); ctx.lineTo(0.3, 0.2); ctx.stroke();
      break;
    case 'effect_tint':
      ctx.globalAlpha = 0.14;
      ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    default:
      circle(0.5);
  }
}
