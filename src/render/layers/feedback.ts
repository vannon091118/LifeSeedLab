// Owner: FeedbackLayerSystem (render layer 7+8 executor). LOC ≤ 300.
// Executes ALL seven visual commands (Defect A5: none may be dropped):
// FloatingNumbers, MangaTexts, ScreenFlashes, Punches, Animations decay here.
// Presentation only — never reads/writes gameplay.

import type { VisualCommand } from '../../observers/visualObserver';

interface FloatNum { text: string; x: number; y: number; color: string; life: number; maxLife: number; crit: boolean; }
interface MangaTxt { text: string; x: number; y: number; life: number; maxLife: number; intensity: number; }
interface Flash { color: string; alpha: number; life: number; maxLife: number; }
interface Punch { entityId: string; t: number; strength: number; }
interface AnimState { anim: string; t: number; total: number; }

export class FeedbackLayer {
  private numbers: FloatNum[] = [];
  private mangas: MangaTxt[] = [];
  private flashes: Flash[] = [];
  private punches = new Map<string, Punch>();
  private anims = new Map<string, AnimState>();

  /** Execute one drained visual command. */
  exec(c: VisualCommand): void {
    switch (c.type) {
      case 'SpawnFloatingNumber':
        this.numbers.push({ text: c.text, x: c.x, y: c.y, color: c.color, life: c.crit ? 40 : 28, maxLife: c.crit ? 40 : 28, crit: c.crit });
        if (this.numbers.length > 24) this.numbers.shift();
        break;
      case 'ShowMangaText':
        this.mangas.push({ text: c.text, x: c.x, y: c.y, life: 50, maxLife: 50, intensity: c.intensity });
        if (this.mangas.length > 3) this.mangas.shift();
        break;
      case 'ScreenFlash':
        this.flashes.push({ color: c.color, alpha: c.alpha, life: c.ticks, maxLife: c.ticks });
        break;
      case 'PunchScale':
        this.punches.set(c.entityId, { entityId: c.entityId, t: 8, strength: c.strength });
        break;
      case 'PlayAnimation':
        this.anims.set(c.entityId, { anim: c.anim, t: c.ticks, total: c.ticks });
        break;
      case 'SpawnParticleBurst':
      case 'CameraShake':
        break; // executed elsewhere (particle pool / camera)
    }
  }

  update(): void {
    this.numbers = this.numbers.filter(n => --n.life > 0);
    this.mangas = this.mangas.filter(m => --m.life > 0);
    this.flashes = this.flashes.filter(f => --f.life > 0);
    for (const [id, p] of this.punches) {
      if (--p.t <= 0) this.punches.delete(id); else this.punches.set(id, p);
    }
    for (const [id, a] of this.anims) {
      if (--a.t <= 0) this.anims.delete(id); else this.anims.set(id, a);
    }
  }

  /** Punch scale factor for an entity (1 = neutral). */
  punchOf(entityId: string): number {
    const p = this.punches.get(entityId);
    if (!p) return 1;
    const k = p.t / 8; // 1 → 0
    return 1 + Math.sin(k * Math.PI) * p.strength;
  }

  /** Anim phase 0..1 (progress) for an entity, or null if none active. */
  animOf(entityId: string): { anim: string; phase: number } | null {
    const a = this.anims.get(entityId);
    if (!a) return null;
    return { anim: a.anim, phase: 1 - a.t / a.total };
  }

  /** Draw floating numbers + manga texts (screen-space conversions done by caller). */
  drawTexts(ctx: CanvasRenderingContext2D, toPx: (x: number) => number, toPy: (y: number) => number, cell: number): void {
    for (const n of this.numbers) {
      const k = n.life / n.maxLife;
      const rise = (1 - k) * cell * 0.6;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `700 ${n.crit ? 22 : 14}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f5efdc';
      ctx.strokeText(n.text, toPx(n.x), toPy(n.y) - rise);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, toPx(n.x), toPy(n.y) - rise);
    }
    for (const m of this.mangas) {
      const k = m.life / m.maxLife;
      const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2.5);
      ctx.translate(toPx(m.x), toPy(m.y));
      ctx.rotate(-0.06);
      ctx.scale(pop, pop);
      ctx.font = `800 ${16 + m.intensity * 5}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#f5efdc';
      ctx.strokeText(m.text, 0, 0);
      ctx.fillStyle = '#2b2b26';
      ctx.fillText(m.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Full-screen flashes (call in screen space, after world transform is reset). */
  drawFlashes(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    for (const f of this.flashes) {
      ctx.globalAlpha = f.alpha * (f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.numbers = []; this.mangas = []; this.flashes = [];
    this.punches.clear(); this.anims.clear();
  }
}
