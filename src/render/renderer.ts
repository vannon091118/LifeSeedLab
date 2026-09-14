// Owner: RenderSystem. LOC ≤ 400 (splitting into layers/*.ts at 400+).
// ALL GRAPHICS = OBSERVERS: reads state, never writes gameplay (contract Phase 7).
// Renderer decides NOTHING about extras/colors/patterns — it draws ResolvedVisual only.

import type { SimState, PlantEntity, EnemyEntity, ProjectileEntity } from '../simulation/state';
import type { ParticlePool } from '../observers/particles';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, ENEMY_PATH } from '../config/world.source';
import { resolveVisual, type ResolvedVisual } from '../visual/generator';
import { PLANTS_SOURCE, type PlantSource } from '../config/plants.source';
import { getPlantStats } from '../simulation/plantSystem';
import { strHash } from '../core/rng';

const LAYER = {
  BACKGROUND: 0, TERRAIN: 1, SHADOWS: 2, PLANTS: 3, ENEMIES: 4,
  PROJECTILES: 5, PARTICLES: 6, FEEDBACK: 7, MANGA: 8,
} as const;

// visual cache: variantKey → ResolvedVisual (pure function, safe to memoize)
const visualCache = new Map<string, ResolvedVisual>();

function getPlantVisual(plant: PlantEntity): ResolvedVisual {
  const source = (PLANTS_SOURCE as Record<string, PlantSource>)[plant.variantId];
  const baseId = source?.role === 'wall' ? 'BASE_ROOT'
    : source?.role === 'support' ? 'BASE_MUSHROOM'
    : 'BASE_BUSH';
  // per-plant visual seed: root seed domain-separated by entity id (visual namespace!)
  const visualSeed = strHash(`plant:${plant.id}`);
  const key = `${baseId}|${visualSeed}`;

  let v = visualCache.get(key);
  if (!v) {
    v = resolveVisual({ baseId, extraIds: [], effectIds: [], visualSeed });
    visualCache.set(key, v);
  }
  return v;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas 2D not supported');
    this.ctx = c;
    this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    // device scaling with controlled cap (Phase 7.3)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.w = w;
    this.h = h;
  }

  /** Convert canvas (CSS px) → grid cell (or null). */
  gridFromPixel(x: number, y: number): { gx: number; gy: number } | null {
    const { ox, oy, cell } = this.metrics();
    const gx = Math.floor((x - ox) / cell);
    const gy = Math.floor((y - oy) / cell);
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
    return { gx, gy };
  }

  private metrics(): { ox: number; oy: number; cell: number } {
    const pad = 24;
    const cell = Math.min((this.w - pad * 2) / GRID_COLS, (this.h - pad * 2) / GRID_ROWS);
    const ox = (this.w - cell * GRID_COLS) / 2;
    const oy = (this.h - cell * GRID_ROWS) / 2;
    return { ox, oy, cell };
  }

  render(state: SimState, particles?: ParticlePool): void {
    const ctx = this.ctx;
    const { ox, oy, cell } = this.metrics();
    const toPx = (wx: number) => wx * cell;
    const toPy = (wy: number) => wy * cell;

    // LAYER 0: Background
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, this.w, this.h);

    // camera shake (observer-owned offset)
    const shakeX = 0, shakeY = 0; // camera wiring lands with the visual observer (Phase 8)
    ctx.translate(ox + shakeX, oy + shakeY);

    // LAYER 1: Terrain (grid + path)
    this.drawTerrain(ctx, cell);

    // LAYER 2: Shadows
    for (const plant of state.plants) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(toPx(plant.gx + 0.5), toPy(plant.gy + 0.75), cell * 0.3, cell * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of state.enemies) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(toPx(e.px), toPy(e.py + 0.25), cell * 0.22, cell * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // LAYER 3: Plants (ResolvedVisual only — no gameplay decisions here)
    for (const plant of state.plants) {
      this.drawPlant(ctx, plant, toPx, toPy, cell, state.clock.tick);
    }

    // LAYER 4: Enemies
    for (const e of state.enemies) {
      this.drawEnemy(ctx, e, toPx, toPy, cell);
    }

    // LAYER 5: Projectiles
    for (const p of state.projectiles) {
      ctx.fillStyle = '#fde68a';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(toPx(p.px), toPy(p.py), Math.max(2, cell * 0.06), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // LAYER 6: Particles
    if (particles) {
      particles.forEachActive(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(toPx(p.x), toPy(p.y), Math.max(1, p.size * cell), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // LAYER 7: Feedback (Phase 10 — damage numbers via FloatingText observer later)
    // LAYER 8: Manga FX (Phase 12)

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // HUD overlay drawn by React (Phase 15) — canvas HUD removed
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, cell: number): void {
    // cells
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, GRID_ROWS * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell);
      ctx.lineTo(GRID_COLS * cell, y * cell);
      ctx.stroke();
    }

    // path (polygon strip)
    ctx.fillStyle = '#1a1a2e';
    for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
      const a = ENEMY_PATH[i], b = ENEMY_PATH[i + 1];
      const ax = a.x * cell, ay = a.y * cell;
      const bx = b.x * cell, by = b.y * cell;
      const ang = Math.atan2(by - ay, bx - ax);
      const px = Math.sin(ang) * cell * 0.4;
      const py = -Math.cos(ang) * cell * 0.4;
      ctx.beginPath();
      ctx.moveTo(ax - px, ay - py);
      ctx.lineTo(ax + px, ay + py);
      ctx.lineTo(bx + px, by + py);
      ctx.lineTo(bx - px, by - py);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawPlant(
    ctx: CanvasRenderingContext2D,
    plant: PlantEntity,
    toPx: (wx: number) => number,
    toPy: (wy: number) => number,
    cell: number,
    tick: number
  ): void {
    const v = getPlantVisual(plant);
    const cx = toPx(plant.gx + 0.5);
    const cy = toPy(plant.gy + 0.5);

    // animation profile (Phase 9): driven by tick, independent of gameplay timing
    let animOffsetY = 0;
    let animRotation = 0;
    if (v.animation === 'sway') animRotation = Math.sin(tick * 0.03) * 0.04;
    else if (v.animation === 'bob') animOffsetY = Math.sin(tick * 0.05) * cell * 0.02;
    else if (v.animation === 'pulse') {
      const s = 1 + Math.sin(tick * 0.04) * 0.03;
      ctx.save();
      ctx.translate(cx, cy + animOffsetY);
      ctx.rotate(animRotation);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy - animOffsetY);
    }

    for (const layer of v.layers) {
      ctx.save();
      ctx.translate(cx + layer.anchor.x * cell, cy + layer.anchor.y * cell + animOffsetY);
      ctx.rotate(layer.rotation + animRotation);
      const s = layer.scale * cell * 0.3;
      ctx.scale(s, s);

      this.drawLayerPrimitive(ctx, layer.key, layer.color, layer.outline);

      ctx.restore();
    }

    if (v.animation === 'pulse') ctx.restore();

    // HP bar (feedback layer will replace this in Phase 10)
    const stats = getPlantStats(plant.variantId);
    if (stats && plant.hp < stats.hp) {
      const ratio = plant.hp / stats.hp;
      ctx.fillStyle = '#111827';
      ctx.fillRect(cx - cell * 0.3, cy - cell * 0.42, cell * 0.6, 4);
      ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#f87171';
      ctx.fillRect(cx - cell * 0.3, cy - cell * 0.42, cell * 0.6 * ratio, 4);
    }
  }

  /** Layer primitive silhouettes — renderer-owned drawing, source-driven keys. */
  private drawLayerPrimitive(ctx: CanvasRenderingContext2D, key: string, color: string, outline: string): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.08;

    const circle = (r: number) => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };

    switch (key) {
      case 'round': case 'canopy': case 'body': case 'bulb': case 'core':
        circle(1); break;
      case 'stem': case 'stalk': case 'trunk':
        ctx.beginPath();
        ctx.rect(-0.12, -1.2, 0.24, 2.4);
        ctx.fill(); ctx.stroke();
        break;
      case 'petals': case 'thorns': case 'shards': case 'spines':
        for (let i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.ellipse(0.7, 0, 0.45, 0.25, 0, 0, Math.PI * 2);
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
        ctx.ellipse(0, -0.3, 1, 0.7, 0, Math.PI, 0);
        ctx.fill(); ctx.stroke();
        break;
      case 'arm_l': ctx.beginPath(); ctx.rect(-1.1, -0.5, 0.5, 1.2); ctx.fill(); ctx.stroke(); break;
      case 'arm_r': ctx.beginPath(); ctx.rect(0.6, -0.9, 0.5, 1.2); ctx.fill(); ctx.stroke(); break;
      case 'rootlets': case 'tendrils':
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.8, 0.6, -1.1, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.8, 0.6, 1.1, 0.9); ctx.stroke();
        break;
      case 'leaves': case 'fronds':
        ctx.beginPath(); ctx.ellipse(-0.5, -0.6, 0.5, 0.22, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0.5, -0.6, 0.5, 0.22, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        break;
      case 'sprout': case 'bud': case 'tip': case 'flower':
        circle(0.35); break;
      case 'glow':
        ctx.globalAlpha = 0.3;
        circle(1.2);
        ctx.globalAlpha = 1;
        break;
      // extras
      case 'hat':
        ctx.beginPath(); ctx.ellipse(0, -0.8, 0.7, 0.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -1.0, 0.4, Math.PI, 0); ctx.fill(); ctx.stroke();
        break;
      case 'leafcrown':
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.ellipse(i * 0.35, -0.75, 0.2, 0.35, i * 0.4, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        break;
      case 'spike':
        ctx.beginPath(); ctx.moveTo(0, -1.0); ctx.lineTo(0.15, -0.4); ctx.lineTo(-0.15, -0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'gem':
        ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0.3, 0); ctx.lineTo(0, 0.5); ctx.lineTo(-0.3, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'shroom':
        ctx.beginPath(); ctx.arc(0, 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
        break;
      case 'vine':
        ctx.beginPath(); ctx.moveTo(0, 0.8); ctx.quadraticCurveTo(0.4, 0.3, 0.2, -0.4); ctx.stroke();
        break;
      case 'eye':
        ctx.fillStyle = '#fff';
        circle(0.22);
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, Math.PI * 2); ctx.fill();
        break;
      case 'mouth':
        ctx.beginPath(); ctx.arc(0, 0.1, 0.3, 0, Math.PI); ctx.stroke();
        break;
      case 'antenna':
        ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0.2, -1.0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0.2, -1.0, 0.08, 0, Math.PI * 2); ctx.fill();
        break;
      case 'scar':
        ctx.beginPath(); ctx.moveTo(-0.3, -0.2); ctx.lineTo(0.3, 0.2); ctx.stroke();
        break;
      case 'effect_tint':
        ctx.globalAlpha = 0.15;
        circle(1.3);
        ctx.globalAlpha = 1;
        break;
      default:
        circle(0.5);
    }
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D,
    e: EnemyEntity,
    toPx: (wx: number) => number,
    toPy: (wy: number) => number,
    cell: number
  ): void {
    const cx = toPx(e.px), cy = toPy(e.py);
    const r = e.typeId === 'boss' ? cell * 0.36
      : e.typeId === 'tank' ? cell * 0.3
      : e.typeId === 'swarm' ? cell * 0.15
      : cell * 0.2;

    const colors: Record<string, string> = {
      grunt: '#f87171', fast: '#fbbf24', tank: '#60a5fa', swarm: '#a78bfa', boss: '#f472b6',
    };

    ctx.shadowColor = colors[e.typeId] ?? '#f87171';
    ctx.shadowBlur = 6;
    ctx.fillStyle = colors[e.typeId] ?? '#f87171';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HP bar
    const ratio = e.hp / e.maxHp;
    ctx.fillStyle = '#111827';
    ctx.fillRect(cx - r, cy - r - 7, r * 2, 3);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(cx - r, cy - r - 7, r * 2 * ratio, 3);
  }
}

