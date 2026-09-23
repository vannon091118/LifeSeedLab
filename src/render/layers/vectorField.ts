// Owner: VectorFieldLayer (render layer, read-only). LOC ≤ 250.
// Decals 30% Alpha je Vector; wiederverwendete Profile via Palette/Impact —
// KEINE Sim-Logik, liest nur SimState.vectors/vectors.attractors.
import type { SimState } from '../../simulation/state';
import { VECTOR_VISUAL_SOURCE } from '../../config/vector_visual.source';
import { VECTOR_LOGIC_SOURCE } from '../../config/vector_logic.source';

const ALPHA = 0.30;

// Dominante Farbe je Zelle: am intensivsten, gebackene Palette aus vector_visual.source
function paletteFor(cell: { vectorId: string }[]): string | null {
  let best: string | null = null;
  if (cell.length === 0) return null;
  best = VECTOR_VISUAL_SOURCE[cell[0].vectorId as keyof typeof VECTOR_VISUAL_SOURCE]?.paletteModifier ?? null;
  return best;
}

// Decal-Form je particleProfile: ember_burst → warmes Flackern,
// bubble_pop → rund/weich, frost_mist → scharf/kalt, arc_jump → gezackt,
// ring_soft → kreisrig, spawn_spore → rund klein
function drawDecal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  color: string,
  profileKey: string | null,
  intensity: number,
  ttl: number,
  maxTtl: number,
): void {
  const normalized = maxTtl > 0 ? Math.max(0, Math.min(1, ttl / maxTtl)) : 1;
  const fade = normalized < 0.25 ? normalized * 4 : 1;
  const a = ALPHA * fade * Math.min(1, 0.6 + intensity * 0.4);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const cx = x + cellSize * 0.5;
  const cy = y + cellSize * 0.5;
  const r = cellSize * 0.42;
  if (profileKey === 'ember_burst') {
    // HEAT: schräges, leicht rautenartiges Glühen
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy);
    ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.9, cx, cy - r * 0.5);
    ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 0.2, cx + r * 0.5, cy + r * 0.3);
    ctx.quadraticCurveTo(cx, cy + r * 0.9, cx - r * 0.6, cy + r * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (profileKey === 'frost_mist') {
    // COLD: gezackter Eisstern
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const ang = i * (Math.PI * 2 / 3);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (profileKey === 'arc_jump') {
    // CHARGE: gezackter Blitz-Strich
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.25);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.2);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.15);
    ctx.lineTo(cx + r * 0.65, cy + r * 0.2);
    ctx.stroke();
  } else if (profileKey === 'spawn_spore' || profileKey === 'bubble_pop') {
    // TOX/OIL/WET: runde Blobs
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a * 0.35;
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.22, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (profileKey === 'ring_soft') {
    // ATTRACTOR: Ring
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
  }
  ctx.restore();
}

export function drawVectorField(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  cell: number,
  ox: number,
  oy: number,
): void {
  // Doppel-Offset-Befund (21.09.2026): der Renderer translated den Kontext bereits um (ox, oy),
  // diese Schicht hatte es NOCHMAL addiert — jedes Decal saß diagonal versetzt („Toxin rechts
  // auf der falschen Feldseite, jede Runde exakt gleich“). Parameter bleiben (Call-Sites),
  // werden aber ignoriert: Welt-Koordinaten × cell ist die Wahrheit.
  void ox;
  void oy;
  // Vergängliche Feld-Decals: pro Zelle ein Decal
  for (const [key, cells] of Object.entries(state.vectors)) {
    if (!cells || cells.length === 0) continue;
    const [gxStr, gyStr] = key.split(',');
    const gx = Number(gxStr);
    const gy = Number(gyStr);
    if (Number.isNaN(gx) || Number.isNaN(gy)) continue;
    const color = paletteFor(cells);
    if (!color) continue;
    const vs = VECTOR_VISUAL_SOURCE[cells[0].vectorId as keyof typeof VECTOR_VISUAL_SOURCE];
    const ls = VECTOR_LOGIC_SOURCE[cells[0].vectorId as keyof typeof VECTOR_LOGIC_SOURCE];
    const maxTtl = ls?.ttl ?? cells[0].ttl;
    const maxIntensity = cells.reduce((m, c) => (c.intensity > m ? c.intensity : m), 0);
    const px = gx * cell;
    const py = gy * cell;
    drawDecal(ctx, px, py, cell, color, vs?.particleProfile ?? null, maxIntensity, cells[0].ttl, maxTtl);
  }
  // Attraktoren: pulsierender Ring_soft + trail_fast-Schleier (read-only)
  for (const a of state.attractors) {
    const cx = a.x * cell;
    const cy = a.y * cell;
    const r = a.radius * cell;
    const vs = VECTOR_VISUAL_SOURCE.VECTOR_ATTRACTOR;
    ctx.save();
    ctx.globalAlpha = ALPHA;
    ctx.strokeStyle = vs.paletteModifier;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = ALPHA * 0.18;
    ctx.fillStyle = vs.paletteModifier;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
