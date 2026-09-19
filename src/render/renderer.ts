// Owner: RenderSystem. LOC ≤ 400 (Zeichen-Details leben in render/layers/*).
// ALL GRAPHICS = OBSERVERS: reads state, never writes gameplay (contract Phase 7).
// Renderer entscheidet NICHTS über Extras/Farben — er zeichnet nur ResolvedVisual.

import type { SimState, PlantEntity, Route } from '../simulation/state';
import type { ParticlePool } from '../observers/particles';
import type { FeedbackLayer } from './layers/feedback';
import { WEAKENED_THRESHOLD } from '../config/economy.source';
import { resolveVisual, type ResolvedVisual } from '../visual/generator';
import { basePlantVisualInput } from '../genome/visualMap';
import { getPlantStats } from '../simulation/plantSystem';
import { strHash } from '../core/rng';
import { drawSprite } from './spriteCache';
import { drawBeetleSprite } from './beetleSprites';
import { beetleBob } from './beetles';
import type { ResolvedBeetleVisual } from '../visual/beetleGenerator';
import { enemyVisualFor } from '../visual/enemyVisuals';
import { drawMapTile } from './layers/mapTiles';
import { drawEnemyBody } from './layers/enemies';
import { drawParticle } from './layers/particlesDraw';
import { bakeTerrain as bake } from './layers/terrain';

const INK = '#2b2b26';
const PAPER = '#f5efdc';
const NIGHT = '#1c222b';

/** B3-Ghost-Vertrag: Identität kommt aus ResolvedVisual, Zustand (gültig/abgelehnt) aus der UI. */
export interface RenderGhost {
  visual: ResolvedVisual;
  gx: number;
  gy: number;
  valid: boolean;
  /** Wirkungsradius in Zellen (Schützen/Support) — Reichweitenring. */
  range?: number | null;
  /** Tick-basierter Shake bei Ablehnung (Präsentation, kein Gameplay-Einfluss). */
  shake?: { x: number; y: number } | null;
}

const visualCache = new Map<string, ResolvedVisual>();

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private terrain: HTMLCanvasElement | null = null;
  private terrainKey = '';
  private nightAlpha = 0; private nightTarget = 0;
  private bredVisuals = new Map<string, ResolvedVisual>();
  /** P6: eingesetzte Käfer werden als IHR Individuum gezeichnet (nicht als Farbpunkt, nicht gar nicht). */
  private beetleVisuals = new Map<string, ResolvedBeetleVisual>();
  /** R2: dynamische Weltgröße — wird pro Frame aus dem State gespiegelt (Beobachter, kein Besitz). */
  private worldCols = 12;
  private worldRows = 12;

  setBredVisuals(map: Map<string, ResolvedVisual>): void { this.bredVisuals = map; }

  setBeetleVisuals(map: Map<string, ResolvedBeetleVisual>): void { this.beetleVisuals = map; }

  private plantVisual(plant: PlantEntity, runSeed: number): ResolvedVisual {
    const cacheKey = `${runSeed}|${plant.variantId}`;
    let v = visualCache.get(cacheKey);
    if (!v) {
      const bred = this.bredVisuals.get(plant.variantId);
      if (bred) v = bred;
      else {
        // Grundpflanzen laufen durch DIESELBE Ableitung wie gezüchtete (Genom aus PLANTS_SOURCE).
        // Der alte Zweig mit festen BASE-IDs ist gestorben: eine Grundpflanze ist keine andere
        // Sorte Wesen, sie hat nur ein kleineres Genom.
        const input = basePlantVisualInput(plant.variantId, runSeed) ?? basePlantVisualInput('sprout', runSeed)!;
        v = resolveVisual(input);
      }
      visualCache.set(cacheKey, v);
    }
    return v;
  }

  constructor(private canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas 2D not supported');
    this.ctx = c; this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
    this.w = w; this.h = h;
  }

  /**
   * R2: der Terrain-Bake hängt an (Seed, aktive Route, WELTGRÖSSE) — der gezeichnete
   * Weg IST das Pathfinding-Ergebnis. Lazy Re-Bake bei Schlüssel-Wechsel — nie pro
   * Frame (B12). Kein Render-Konsument hält eine Weg-Kopie.
   */
  private terrainFor(state: SimState): HTMLCanvasElement | null {
    const sig = `${state.cols}x${state.rows}|${state.currentRoute?.map(p => `${p.x},${p.y}`).join(';') ?? 'none'}`;
    const key = `${state.seed}|${sig}`;
    if (this.terrain && this.terrainKey === key) return this.terrain;
    this.terrain = bake(state.seed, state.currentRoute, state.cols, state.rows);
    this.terrainKey = key;
    // R2: dynamische Weltgröße spiegeln — der Beobachter besitzt die Größe nicht.
    this.worldCols = state.cols;
    this.worldRows = state.rows;
    return this.terrain;
  }

  setNight(night: boolean): void { this.nightTarget = night ? 0.35 : 0; }

  gridFromPixel(x: number, y: number): { gx: number; gy: number } | null {
    const { ox, oy, cell } = this.metrics();
    const gx = Math.floor((x - ox) / cell); const gy = Math.floor((y - oy) / cell);
    if (gx < 0 || gx >= this.worldCols || gy < 0 || gy >= this.worldRows) return null;
    return { gx, gy };
  }

  cellCenter(gx: number, gy: number): { x: number; y: number } {
    const { ox, oy, cell } = this.metrics();
    return { x: ox + (gx + 0.5) * cell, y: oy + (gy + 0.5) * cell };
  }

  private metrics(): { ox: number; oy: number; cell: number } {
    const pad = 20;
    const cell = Math.min((this.w - pad * 2) / this.worldCols, (this.h - pad * 2) / this.worldRows);
    const ox = (this.w - cell * this.worldCols) / 2;
    const oy = (this.h - cell * this.worldRows) / 2 + 8;
    return { ox, oy, cell };
  }

  render(
    state: SimState,
    particles?: ParticlePool,
    feedback?: FeedbackLayer,
    shakeX = 0, shakeY = 0,
    ghost?: RenderGhost | null,
  ): void {
    const ctx = this.ctx;
    // R2: die Weltgröße kommt ausschließlich aus dem Sim-State (Run-Kopie der Welt).
    this.worldCols = state.cols;
    this.worldRows = state.rows;
    const { ox, oy, cell } = this.metrics();
    const toPx = (wx: number) => wx * cell;
    const toPy = (wy: number) => wy * cell;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, this.w, this.h);
    ctx.translate(ox + shakeX, oy + shakeY);

    const terrain = this.terrainFor(state);
    if (terrain) ctx.drawImage(terrain, 0, 0, this.worldCols * cell, this.worldRows * cell);

    // P5: Spieler-Tiles unter allem Gameplay zeichnen (read-only aus dem State)
    for (const [key, tile] of Object.entries(state.mapTiles)) {
      const [gx, gy] = key.split(',').map(Number);
      drawMapTile(ctx, tile, gx, gy, cell, state.mapTiles);
    }

    if (ghost) this.drawGhost(ctx, ghost, cell);

    // shadows
    ctx.fillStyle = 'rgba(43,43,38,0.18)';
    for (const plant of state.plants) {
      ctx.beginPath(); ctx.ellipse(toPx(plant.gx + 0.5), toPy(plant.gy + 0.82), cell * 0.26, cell * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const e of state.enemies) {
      const big = e.typeId === 'tank' ? 1.4 : 1;
      ctx.beginPath(); ctx.ellipse(toPx(e.px), toPy(e.py + 0.22), cell * 0.16 * big, cell * 0.06 * big, 0, 0, Math.PI * 2); ctx.fill();
    }

    for (const plant of state.plants) this.drawPlant(ctx, plant, state, toPx, toPy, cell, feedback);
    for (const e of state.enemies) this.drawEnemy(ctx, e, toPx, toPy, cell, state.clock.tick, feedback);

    // projectiles — shape by effect (B10)
    ctx.lineWidth = 2;
    for (const p of state.projectiles) {
      const x = toPx(p.px), y = toPy(p.py);
      const color = p.effectId === 'EFFECT_BURN' ? '#c96f3b'
        : p.effectId === 'EFFECT_SLOW' ? '#7d9bc0'
        : p.effectId === 'EFFECT_POISON' ? '#7d9c46'
        : p.effectId === 'EFFECT_CHAIN' ? '#c9a83b' : '#2b2b26';
      ctx.strokeStyle = color; ctx.fillStyle = color;
      if (p.effectId === 'EFFECT_SLOW') { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke(); }
      else {
        const ang = Math.atan2(p.dy, p.dx);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(0, 3.4, -5, 0); ctx.quadraticCurveTo(0, -3.4, 6, 0); ctx.fill();
        ctx.restore();
      }
    }

    // P6/R3: der eingesetzte Käfer ist ein WESEN mit eigener Anatomie — vorher wurde er im Run
    // überhaupt nicht gezeichnet (weder Körper noch Brutlinge). Er liegt über den Gegnern,
    // damit der Verbündete sichtbar bleibt, wenn die Wellen an ihm hängen.
    this.drawDeployedBeetle(ctx, state, toPx, toPy, cell);

    if (particles) particles.forEachActive(p => drawParticle(ctx, p, toPx, toPy, cell));
    feedback?.drawTexts(ctx, toPx, toPy, cell);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.nightAlpha += (this.nightTarget - this.nightAlpha) * 0.04;
    if (this.nightAlpha > 0.005) {
      ctx.globalAlpha = this.nightAlpha; ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, this.w, this.h); ctx.globalAlpha = 1;
    }
    feedback?.drawFlashes(ctx, this.w, this.h);
  }

  /**
   * B3-Geist: ResolvedVisual mit 60 % Alpha, grün/rot getönter Footprint und Reichweitenring.
   * `shake` kommt tick-basiert aus der UI (Ablehnung) — nie aus der Wanduhr.
   */
  private drawGhost(ctx: CanvasRenderingContext2D, ghost: RenderGhost, cell: number): void {
    const { gx, gy, valid, range } = ghost;
    const shakeX = ghost.shake?.x ?? 0;
    const shakeY = ghost.shake?.y ?? 0;
    const cx = (gx + 0.5) * cell + shakeX;
    const cy = (gy + 0.5) * cell + shakeY;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.fillStyle = valid ? 'rgba(90,143,78,0.25)' : 'rgba(169,68,56,0.30)';
    ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
    ctx.strokeStyle = valid ? '#5a8f4e' : '#a94438';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
    ctx.setLineDash([]);
    ctx.restore();

    if (range !== null && range !== undefined && range > 1) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = valid ? '#5a8f4e' : '#a94438';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, range * cell, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.6;
    drawSprite(ctx, ghost.visual, cell, this.dpr, cx, cy, 1);
    ctx.restore();
  }

  /**
   * Der eingesetzte Brutling + seine Mit-Brutlinge. Identität kommt aus dem aufgelösten Visual
   * (beetleVisuals), Position aus der Sim. Fehlt ein Visual (Specimen nicht im Lager), wird
   * NICHTS gezeichnet statt eines Platzhalter-Punkts — ein falsches Wesen wäre schlimmer.
   */
  private drawDeployedBeetle(
    ctx: CanvasRenderingContext2D, state: SimState,
    toPx: (x: number) => number, toPy: (y: number) => number, cell: number,
  ): void {
    const b = state.deployedBeetle;
    if (!b) return;
    const visual = this.beetleVisuals.get(b.specimenId) ?? this.beetleVisuals.get(b.id);
    if (!visual) return;
    const t = state.clock.tick;
    const bob = beetleBob(visual.phenotype, t * 16);
    const cx = toPx(b.px), cy = toPy(b.py) - bob * cell;

    // Mit-Brutlinge: kleinere Ausgaben DESSELBEN Wesens (kein zweiter Zeichenpfad).
    for (const brood of b.broodlings) {
      drawBeetleSprite(ctx, visual, cell, this.dpr, toPx(brood.px), toPy(brood.py), 0.55 * visual.scale);
    }
    drawBeetleSprite(ctx, visual, cell, this.dpr, cx, cy, visual.scale);

    // Lebensbalken des Anführers (nur wenn verletzt) — dieselbe Sprache wie Pflanze/Gegner.
    if (b.hp < b.maxHp) {
      const r = cell * 0.24;
      ctx.fillStyle = INK; ctx.fillRect(cx - r, cy - r - 8, r * 2, 4);
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(cx - r + 1, cy - r - 7, (r * 2 - 2) * Math.max(0, b.hp / b.maxHp), 2);
    }
  }

  private drawPlant(
    ctx: CanvasRenderingContext2D, plant: PlantEntity, state: SimState,
    toPx: (x: number) => number, toPy: (y: number) => number, cell: number,
    feedback?: FeedbackLayer,
  ): void {
    const v = this.plantVisual(plant, state.seed);
    const cx = toPx(plant.gx + 0.5), cy = toPy(plant.gy + 0.5);
    const tick = state.clock.tick;
    const anim = feedback?.animOf(plant.id);
    const punch = feedback?.punchOf(plant.id) ?? 1;
    let ox = 0, oy = 0, rot = 0, sq = 1;
    if (v.animation === 'sway') rot = Math.sin(tick * 0.03 + plant.gx) * 0.04;
    else if (v.animation === 'bob') oy = Math.sin(tick * 0.05 + plant.gy) * cell * 0.02;
    if (anim?.anim === 'attack') { const p = anim.phase; const lunge = Math.sin(p * Math.PI) * cell * 0.12; ox = lunge * 0.3; oy = -lunge * 0.4; sq = 1 + Math.sin(p * Math.PI) * 0.08; }
    else if (anim?.anim === 'placement') { const p = anim.phase; sq = p < 0.3 ? 0.6 + p * 1.5 : p < 0.8 ? 1.05 : 1; }
    // B29: 'recoil' war im VisualCommand-Vertrag deklariert, aber nie gezeichnet — die
    // Ablehnung an einer Pflanze wäre damit trotz FX-Kommando stumm geblieben (drei Schläge
    // seitwärts = „nein“, ohne die Entity zu verschieben).
    else if (anim?.anim === 'recoil') { const p = anim.phase; ox = Math.sin(p * Math.PI * 3) * cell * 0.1; }
    ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.rotate(rot);
    const genomScale = v.scale; // Kästchenblock-CGI: Skala ist Genom-Aussage (0.85–1.25)
    // B28: die Layer sind einmal pro variantKey gebacken — hier bleibt nur drawImage.
    // Animation (sway/bob/punch/squash) lebt in den Transform-Variablen, nicht im Sprite.
    drawSprite(ctx, v, cell, this.dpr, 0, 0, sq * punch * genomScale);
    ctx.restore();
    const stats = getPlantStats(plant.variantId, state.bredStats);
    if (stats && plant.hp < stats.hp) {
      const ratio = Math.max(0, plant.hp / stats.hp);
      ctx.fillStyle = INK; ctx.fillRect(cx - cell * 0.3, cy - cell * 0.46, cell * 0.6, 4);
      ctx.fillStyle = ratio > 0.5 ? '#5a8f4e' : ratio > 0.25 ? '#d9a441' : '#a94438';
      ctx.fillRect(cx - cell * 0.3 + 1, cy - cell * 0.46 + 1, (cell * 0.6 - 2) * ratio, 2);
    }
    // B25: Haltbarkeit sichtbar — die Uhr lief vorher nur in der Sim (PLANT_WEAKENED →
    // PLANT_WITHERED), der Spieler sah eine bezahlte Pflanze lautlos verschwinden. Die
    // Leiste erscheint erst in den letzten 30 % (genau die WEAKENED-Schwelle): vorher ist
    // Vergehen kein Thema, danach ist die Restzeit ehrlich ablesbar. Gelb = geschwächt.
    if (plant.lifeTicksTotal > 0 && plant.lifeTicksLeft <= plant.lifeTicksTotal * WEAKENED_THRESHOLD) {
      const ratio = Math.max(0, plant.lifeTicksLeft / plant.lifeTicksTotal);
      ctx.fillStyle = INK; ctx.fillRect(cx - cell * 0.3, cy - cell * 0.36, cell * 0.6, 4);
      ctx.fillStyle = plant.isWeakened ? '#d9a441' : '#5a8f4e';
      ctx.fillRect(cx - cell * 0.3 + 1, cy - cell * 0.36 + 1, (cell * 0.6 - 2) * ratio, 2);
    }
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D, e: import('../simulation/state').EnemyEntity,
    toPx: (x: number) => number, toPy: (y: number) => number, cell: number, tick: number,
    feedback?: FeedbackLayer,
  ): void {
    const cx = toPx(e.px), cy = toPy(e.py);
    const punch = feedback?.punchOf(e.id) ?? 1;
    // Identität kommt aus dem aufgelösten Phänotyp des Archetyps (Boss: individualisiert per ID).
    const visual = enemyVisualFor(e.typeId, e.id);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(punch, punch);
    drawEnemyBody(ctx, visual, e.typeId, cell, this.dpr, tick);
    ctx.restore();
    if (e.slowUntil > 0) {
      ctx.strokeStyle = 'rgba(125,155,192,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.24, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.hp < e.maxHp) {
      const r = Math.max(cell * 0.16, cell * 0.2); const ratio = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = INK; ctx.fillRect(cx - r, cy - r - 7, r * 2, 3.5);
      ctx.fillStyle = '#a94438'; ctx.fillRect(cx - r + 0.5, cy - r - 6.5, (r * 2 - 1) * ratio, 2.5);
    }
  }
}
