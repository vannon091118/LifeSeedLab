// Owner: RenderSystem. LOC ≤ 400 (drawing details live in render/layers/*).
// ALL GRAPHICS = OBSERVERS: reads state, never writes gameplay (contract Phase 7).
// Renderer decides NOTHING about extras/colors/patterns — it draws ResolvedVisual only.
// B10: Papier-Terrain (pre-baked), 5 distinct enemy bodies, per-kind particles,
// Tag/Nacht-Grade, Kamera-Shake wird WIRKLICH konsumiert (Defect A6-1).

import type { SimState, PlantEntity, EnemyEntity } from '../simulation/state';
import type { ParticlePool, Particle } from '../observers/particles';
import type { FeedbackLayer } from './layers/feedback';
import { GRID_COLS, GRID_ROWS } from '../config/world.source';
import { resolveVisual, type ResolvedVisual } from '../visual/generator';
import { getPlantStats } from '../simulation/plantSystem';
import { strHash } from '../core/rng';

const LAYER = {
  BACKGROUND: 0, TERRAIN: 1, SHADOWS: 2, PLANTS: 3, ENEMIES: 4,
  PROJECTILES: 5, PARTICLES: 6, FEEDBACK: 7, MANGA: 8,
} as const;
void LAYER;

const INK = '#2b2b26';
const PAPER = '#f5efdc';
const NIGHT = '#1c222b';

// visual cache: variantId|runSeed → ResolvedVisual
const visualCache = new Map<string, ResolvedVisual>();

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private terrain: HTMLCanvasElement | null = null;
  private terrainSeed = -1;
  private nightAlpha = 0;         // tweened by DAY/NIGHT events (B11)
  private nightTarget = 0;
  /** Bred-variant visuals (genome-derived, computed by GameView via B4). */
  private bredVisuals = new Map<string, ResolvedVisual>();

  /** Inject genome→visual resolutions for bred variants (call at mount). */
  setBredVisuals(map: Map<string, ResolvedVisual>): void {
    this.bredVisuals = map;
  }

  private plantVisual(plant: PlantEntity, runSeed: number): ResolvedVisual {
    const cacheKey = `${runSeed}|${plant.variantId}`;
    let v = visualCache.get(cacheKey);
    if (!v) {
      // Bred plants first (genome-derived identity — B4 fixes A6-2);
      // source plants: role → base.
      const bred = this.bredVisuals.get(plant.variantId);
      if (bred) {
        v = bred;
      } else {
        const baseId = plant.variantId === 'rootwall' ? 'BASE_ROOT'
          : plant.variantId === 'mycelia' ? 'BASE_MUSHROOM'
          : 'BASE_THORN';
        const visualSeed = strHash(`plant:${runSeed}:${plant.variantId}`);
        v = resolveVisual({ baseId, extraIds: [], effectIds: [], visualSeed });
      }
      visualCache.set(cacheKey, v);
    }
    return v;
  }

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
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.w = w;
    this.h = h;
  }

  /** Terrain re-bakes only when the run seed changes (once per run). */
  prepareTerrain(seed: number): void {
    if (this.terrainSeed === seed) return;
    this.terrain = bake(seed);
    this.terrainSeed = seed;
  }

  setNight(night: boolean): void {
    this.nightTarget = night ? 0.35 : 0;
  }

  gridFromPixel(x: number, y: number): { gx: number; gy: number } | null {
    const { ox, oy, cell } = this.metrics();
    const gx = Math.floor((x - ox) / cell);
    const gy = Math.floor((y - oy) / cell);
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
    return { gx, gy };
  }

  cellCenter(gx: number, gy: number): { x: number; y: number } {
    const { ox, oy, cell } = this.metrics();
    return { x: ox + (gx + 0.5) * cell, y: oy + (gy + 0.5) * cell };
  }

  private metrics(): { ox: number; oy: number; cell: number } {
    const pad = 20;
    const cell = Math.min((this.w - pad * 2) / GRID_COLS, (this.h - pad * 2) / GRID_ROWS);
    const ox = (this.w - cell * GRID_COLS) / 2;
    const oy = (this.h - cell * GRID_ROWS) / 2 + 8;
    return { ox, oy, cell };
  }

  render(
    state: SimState,
    particles?: ParticlePool,
    feedback?: FeedbackLayer,
    shakeX = 0,
    shakeY = 0,
    ghost?: { visual: ResolvedVisual; gx: number; gy: number; valid: boolean } | null
  ): void {
    const ctx = this.ctx;
    const { ox, oy, cell } = this.metrics();
    const toPx = (wx: number) => wx * cell;
    const toPy = (wy: number) => wy * cell;

    // LAYER 0: paper background
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, this.w, this.h);

    // camera shake — consumed from the Camera observer (Defect A6-1 fixed)
    ctx.translate(ox + shakeX, oy + shakeY);

    // LAYER 1: pre-baked terrain
    if (this.terrain) ctx.drawImage(this.terrain, 0, 0, GRID_COLS * cell, GRID_ROWS * cell);

    // placement ghost under everything gameplay (B3 preview)
    if (ghost) this.drawGhost(ctx, ghost, cell);

    // LAYER 2: shadows
    ctx.fillStyle = 'rgba(43,43,38,0.18)';
    for (const plant of state.plants) {
      ctx.beginPath();
      ctx.ellipse(toPx(plant.gx + 0.5), toPy(plant.gy + 0.82), cell * 0.26, cell * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of state.enemies) {
      const big = e.typeId === 'tank' ? 1.4 : 1;
      ctx.beginPath();
      ctx.ellipse(toPx(e.px), toPy(e.py + 0.22), cell * 0.16 * big, cell * 0.06 * big, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // LAYER 3: plants
    for (const plant of state.plants) {
      this.drawPlant(ctx, plant, state, toPx, toPy, cell, feedback);
    }

    // LAYER 4: enemies (five distinct bodies)
    for (const e of state.enemies) {
      this.drawEnemy(ctx, e, toPx, toPy, cell, feedback);
    }

    // LAYER 5: projectiles (shape by effect, B10)
    ctx.lineWidth = 2;
    for (const p of state.projectiles) {
      const x = toPx(p.px), y = toPy(p.py);
      const color = p.effectId === 'EFFECT_BURN' ? '#c96f3b'
        : p.effectId === 'EFFECT_SLOW' ? '#7d9bc0'
        : p.effectId === 'EFFECT_POISON' ? '#7d9c46'
        : p.effectId === 'EFFECT_CHAIN' ? '#c9a83b'
        : '#2b2b26';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (p.effectId === 'EFFECT_SLOW') { // hollow orb
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
      } else { // ink teardrop along velocity
        const ang = Math.atan2(p.dy, p.dx);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.quadraticCurveTo(0, 3.4, -5, 0);
        ctx.quadraticCurveTo(0, -3.4, 6, 0);
        ctx.fill();
        ctx.restore();
      }
    }

    // LAYER 6: particles — per-kind shapes (A9: kein Konfetti-Einheitskreis)
    if (particles) {
      particles.forEachActive(p => this.drawParticle(ctx, p, toPx, toPy, cell));
    }

    // LAYER 7+8: feedback texts (drawn above entities)
    feedback?.drawTexts(ctx, toPx, toPy, cell);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // night grade sits above world, below flashes/manga (B10 lighting)
    this.nightAlpha += (this.nightTarget - this.nightAlpha) * 0.04;
    if (this.nightAlpha > 0.005) {
      ctx.globalAlpha = this.nightAlpha;
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    }
    feedback?.drawFlashes(ctx, this.w, this.h);
  }

  // ── Ghost preview (B3) ──────────────────────────────────────
  private drawGhost(ctx: CanvasRenderingContext2D, ghost: NonNullable<Parameters<Renderer['render']>[5]>, cell: number): void {
    const { gx, gy, valid } = ghost;
    ctx.save();
    ctx.globalAlpha = 0.55;
    // footprint tint
    ctx.fillStyle = valid ? 'rgba(90,143,78,0.25)' : 'rgba(169,68,56,0.30)';
    ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
    // resolved visual at same identity, alpha-only modifier (B3.2)
    const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
    for (const layer of ghost.visual.layers) {
      ctx.save();
      ctx.translate(cx + layer.anchor.x * cell, cy + layer.anchor.y * cell);
      ctx.rotate(layer.rotation);
      const s = layer.scale * cell * 0.3;
      ctx.scale(s, s);
      this.drawLayerPrimitive(ctx, layer.key, layer.color, layer.outline);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Plants ──────────────────────────────────────────────────
  private drawPlant(
    ctx: CanvasRenderingContext2D, plant: PlantEntity, state: SimState,
    toPx: (x: number) => number, toPy: (y: number) => number, cell: number,
    feedback?: FeedbackLayer
  ): void {
    const v = this.plantVisual(plant, state.runId);
    const cx = toPx(plant.gx + 0.5);
    const cy = toPy(plant.gy + 0.5);
    const tick = state.clock.tick;

    const anim = feedback?.animOf(plant.id);
    const punch = feedback?.punchOf(plant.id) ?? 1;

    // idle breathing + attack lunge (B10 animation language)
    let ox = 0, oy = 0, rot = 0, sq = 1;
    if (v.animation === 'sway') rot = Math.sin(tick * 0.03 + plant.gx) * 0.04;
    else if (v.animation === 'bob') oy = Math.sin(tick * 0.05 + plant.gy) * cell * 0.02;
    if (anim?.anim === 'attack') {
      const p = anim.phase;
      const lunge = Math.sin(p * Math.PI) * cell * 0.12;
      ox = lunge * 0.3; oy = -lunge * 0.4;
      sq = 1 + Math.sin(p * Math.PI) * 0.08;
    } else if (anim?.anim === 'placement') {
      const p = anim.phase;
      sq = p < 0.3 ? 0.6 + p * 1.5 : p < 0.8 ? 1.05 : 1;
    }

    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(rot);
    ctx.scale(sq * punch, sq * punch);
    for (const layer of v.layers) {
      ctx.save();
      ctx.translate(layer.anchor.x * cell, layer.anchor.y * cell);
      ctx.rotate(layer.rotation);
      const s = layer.scale * cell * 0.3;
      ctx.scale(s, s);
      this.drawLayerPrimitive(ctx, layer.key, layer.color, layer.outline);
      ctx.restore();
    }
    ctx.restore();

    // HP bar only when damaged
    const stats = getPlantStats(plant.variantId, state.bredStats);
    if (stats && plant.hp < stats.hp) {
      const ratio = Math.max(0, plant.hp / stats.hp);
      ctx.fillStyle = INK;
      ctx.fillRect(cx - cell * 0.3, cy - cell * 0.46, cell * 0.6, 4);
      ctx.fillStyle = ratio > 0.5 ? '#5a8f4e' : ratio > 0.25 ? '#d9a441' : '#a94438';
      ctx.fillRect(cx - cell * 0.3 + 1, cy - cell * 0.46 + 1, (cell * 0.6 - 2) * ratio, 2);
    }
  }

  // ── Enemies: five distinct ink bodies (B10) ─────────────────
  private drawEnemy(
    ctx: CanvasRenderingContext2D, e: EnemyEntity,
    toPx: (x: number) => number, toPy: (y: number) => number, cell: number,
    feedback?: FeedbackLayer
  ): void {
    const cx = toPx(e.px), cy = toPy(e.py);
    const t = e.px * 100 + e.py * 61; // stable wobble phase from position
    const punch = feedback?.punchOf(e.id) ?? 1;
    const slowed = e.slowUntil > 0 && e.hp > 0; // approximate tint source
    void slowed;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(punch, punch);

    switch (e.typeId) {
      case 'grunt': { // round beetle with waddle
        ctx.rotate(Math.sin(t * 2.1) * 0.07);
        this.inkBody(ctx, cell * 0.20, cell * 0.17, '#b0653f');
        // legs (2-frame)
        const f = Math.sin(t * 6) > 0 ? 1 : -1;
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-cell * 0.12, cell * 0.12); ctx.lineTo(-cell * 0.16, cell * 0.20 * f + cell * 0.12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cell * 0.12, cell * 0.12); ctx.lineTo(cell * 0.16, cell * 0.20 * -f + cell * 0.12); ctx.stroke();
        break;
      }
      case 'fast': { // slim dart stretched forward
        ctx.rotate(Math.atan2(0, 1)); // path-right bias; wobble via body
        this.inkBody(ctx, cell * 0.24, cell * 0.12, '#c9a83b');
        ctx.globalAlpha = 0.25; // trail ghosts
        this.inkBody(ctx, cell * 0.20, cell * 0.10, '#c9a83b', -cell * 0.10);
        ctx.globalAlpha = 0.12;
        this.inkBody(ctx, cell * 0.16, cell * 0.08, '#c9a83b', -cell * 0.18);
        ctx.globalAlpha = 1;
        break;
      }
      case 'tank': { // broad scarab
        ctx.rotate(Math.sin(t) * 0.02);
        this.inkBody(ctx, cell * 0.30, cell * 0.24, '#7d9bc0');
        ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-cell * 0.10, -cell * 0.20); ctx.quadraticCurveTo(0, -cell * 0.30, cell * 0.10, -cell * 0.20); ctx.stroke();
        break;
      }
      case 'swarm': { // trio of gnats orbiting common center
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
      case 'boss': { // horned knight-beetle, reward-tier aura
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#c96f8e';
        ctx.beginPath(); ctx.arc(0, 0, cell * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        this.inkBody(ctx, cell * 0.36, cell * 0.30, '#8a4a5e');
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-cell * 0.12, -cell * 0.26); ctx.lineTo(-cell * 0.22, -cell * 0.44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cell * 0.12, -cell * 0.26); ctx.lineTo(cell * 0.22, -cell * 0.44); ctx.stroke();
        break;
      }
    }
    ctx.restore();

    // status tint (slow = frost ring)
    if (e.slowUntil > 0) {
      ctx.strokeStyle = 'rgba(125,155,192,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.24, 0, Math.PI * 2); ctx.stroke();
    }

    // HP bar only when damaged (ink-framed, 3px)
    if (e.hp < e.maxHp) {
      const r = Math.max(cell * 0.16, cell * 0.2);
      const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = INK;
      ctx.fillRect(cx - r, cy - r - 7, r * 2, 3.5);
      ctx.fillStyle = '#a94438';
      ctx.fillRect(cx - r + 0.5, cy - r - 6.5, (r * 2 - 1) * ratio, 2.5);
    }
  }

  private inkBody(ctx: CanvasRenderingContext2D, rx: number, ry: number, fill: string, offX = 0): void {
    ctx.fillStyle = fill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(offX, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // ink dot eyes (character without emoji)
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(offX + rx * 0.35, -ry * 0.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(offX + rx * 0.7, -ry * 0.1, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // ── Particles: per-kind shapes (B10) ────────────────────────
  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle, toPx: (x: number) => number, toPy: (y: number) => number, cell: number): void {
    const k = p.life / p.maxLife;
    const x = toPx(p.x), y = toPy(p.y);
    const s = Math.max(1, p.size * cell);
    ctx.globalAlpha = k;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    switch (p.kind) {
      case 'SPARK': { // 4-point star cross
        ctx.lineWidth = Math.max(1, s * 0.5);
        ctx.beginPath();
        ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
        ctx.stroke();
        break;
      }
      case 'SMOKE': { // soft blob
        ctx.beginPath(); ctx.arc(x, y, s * (1.6 - k * 0.6), 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'DUST': { // flat fading ellipse
        ctx.beginPath(); ctx.ellipse(x, y, s * 1.4, s * 0.6, p.rotation, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'GLOW': { // soft radial dot (reward/crit only — glow is reward, B0)
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'RING': { // expanding stroke circle
        ctx.lineWidth = Math.max(1, s * 0.4);
        ctx.beginPath(); ctx.arc(x, y, s * (2.2 - k) * 1.4, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'SHARD': { // rotated triangle
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rotation);
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'BUBBLE': { // stroked circle + highlight dot
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.25, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'SPORE': { // tiny drifting dot
        ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'LEAF': { // bent almond leaf, flutter rotation
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rotation + Math.sin(p.life * 0.3) * 0.6);
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.quadraticCurveTo(s, 0, 0, s * 1.2);
        ctx.quadraticCurveTo(-s, 0, 0, -s * 1.2);
        ctx.fill();
        ctx.restore();
        break;
      }
      default: { // DOT
        ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Layer primitives (ink/paper drawing, source-driven keys) ─
  private drawLayerPrimitive(ctx: CanvasRenderingContext2D, key: string, color: string, outline: string): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.09;

    const circle = (r: number) => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };

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
        ctx.fillStyle = INK;
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
}

// import indirection to keep the layer import graph one-way
import { bakeTerrain as bake } from './layers/terrain';
