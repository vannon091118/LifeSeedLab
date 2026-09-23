// Owner: FeedbackLayerSystem (render layer 7+8 executor). LOC ≤ 300.
// Executes ALL seven visual commands (Defect A5: none may be dropped):
// FloatingNumbers, MangaTexts, ScreenFlashes, Punches, Animations decay here.
// Presentation only — never reads/writes gameplay.

import type { VisualCommand } from '../../observers/visualObserver';

const INK = '#2b2b26';

interface FloatNum { text: string; x: number; y: number; color: string; life: number; maxLife: number; crit: boolean; }
interface MangaTxt { text: string; x: number; y: number; life: number; maxLife: number; intensity: number; }
interface Flash { color: string; alpha: number; life: number; maxLife: number; }
interface Punch { entityId: string; t: number; strength: number; }
interface AnimState { anim: string; t: number; total: number; }
/** P-27: die death-Animation überlebt den State-Exit der Pflanze — Ort + Optik reisen mit. */
interface DeathGhost { x: number; y: number; visualKey: string; t: number; total: number; }
/** B5.1: Belohnungsreise — Quelle in der WELT, Ziel im HUD (Screen-Raum). Reine Darstellung. */
interface RewardFlight { x: number; y: number; color: string; life: number; maxLife: number; }
/** Ankunft am Zähler: kurzer Papier-Puls. Lebt AM Anker, nicht an der Quelle. */
interface ArrivalPop { color: string; life: number; maxLife: number; }
/** P-29: Ankunft EINER Buchung ohne Weltort (Wellen-Bonus) — Puls + Betrag am Zähler. */
interface RewardArrival { amount: number; color: string; life: number; maxLife: number; }

const FLIGHT_TICKS = 22;
const ARRIVAL_TICKS = 9;

/**
 * Fortschritt der Reise (0 = Quelle, 1 = Ankunft am Zähler). Der LETZTE Lebens-Tick IST die
 * Ankunft: die naive Form `1 - life/maxLife` endet bei `1 - 1/22 = 95,5 %` — der Kopf-Dot brach
 * also sichtbar vor dem Zähler ab (gemessen 13 px Abstand zum Chip-Mittelpunkt), obwohl der
 * Vertrag „Ankunft am Zähler" sagt. Reine Präsentations-Mathematik, per Test gepinnt.
 */
export function flightProgress(life: number, maxLife: number): number {
  if (life <= 1) return 1;
  return 1 - life / maxLife;
}

export class FeedbackLayer {
  private numbers: FloatNum[] = [];
  private mangas: MangaTxt[] = [];
  private flashes: Flash[] = [];
  private punches = new Map<string, Punch>();
  private anims = new Map<string, AnimState>();
  private flights: RewardFlight[] = [];
  private arrivals: ArrivalPop[] = [];
  private rewardArrivals: RewardArrival[] = [];

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
      case 'SpawnRewardFlight':
        // P-33: Verwerfen bucht die Ankunft — die Sim-Buchung ist längst passiert, der Pop ist
        // ihre ehrliche Darstellung. Still verschwinden wäre eine Lüge mitten im Luftverkehr.
        if (this.flights.length >= 8) {
          const dropped = this.flights.shift()!;
          this.arrivals.push({ color: dropped.color, life: ARRIVAL_TICKS, maxLife: ARRIVAL_TICKS });
          this.fadeOutOldest(this.arrivals, 4, 2);
        }
        this.flights.push({ x: c.x, y: c.y, color: c.color, life: FLIGHT_TICKS, maxLife: FLIGHT_TICKS });
        break;
      case 'SpawnRewardArrival':
        this.rewardArrivals.push({ amount: c.amount, color: c.color, life: ARRIVAL_TICKS + 6, maxLife: ARRIVAL_TICKS + 6 });
        if (this.rewardArrivals.length > 4) this.rewardArrivals.shift();
        break;
      case 'PunchScale':
        this.punches.set(c.entityId, { entityId: c.entityId, t: 8, strength: c.strength });
        break;
      case 'PlayAnimation':
        this.anims.set(c.entityId, { anim: c.anim, t: c.ticks, total: c.ticks });
        // P-27: der Tod überlebt den State-Exit — Ort + Optik reisen im Command mit.
        if (c.anim === 'death' && c.x !== undefined && c.y !== undefined) {
          this.deaths.set(c.entityId, { x: c.x, y: c.y, visualKey: c.variantId ?? '', t: c.ticks, total: c.ticks });
        }
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
    this.rewardArrivals = this.rewardArrivals.filter(a => --a.life > 0);
    // Angekommen ⇒ der Zähler pulst (das Ziel, nicht die Quelle: die Reise ist beendet).
    this.flights = this.flights.filter(f => {
      if (--f.life > 0) return true;
      this.arrivals.push({ color: f.color, life: ARRIVAL_TICKS, maxLife: ARRIVAL_TICKS });
      this.fadeOutOldest(this.arrivals, 4, 2);
      return false;
    });
    this.arrivals = this.arrivals.filter(a => --a.life > 0);
    for (const [id, p] of this.punches) {
      if (--p.t <= 0) this.punches.delete(id); else this.punches.set(id, p);
    }
    for (const [id, a] of this.anims) {
      if (--a.t <= 0) this.anims.delete(id); else this.anims.set(id, a);
    }
    for (const [id, g] of this.deaths) {
      if (--g.t <= 0) this.deaths.delete(id); else this.deaths.set(id, g);
    }
  }

  /** Read-only Sicht für Tests/Diagnose: wie viele Reisen gerade leben (P-33-Cap). */
  get flightCount(): number { return this.flights.length; }

  /** P-27: die death-Animation überlebt den State-Exit der Pflanze — Ort + Optik reisen mit. */
  private deaths = new Map<string, DeathGhost>();

  /**
   * P-33: Überlauf wird NICHT hart gelöscht — der älteste Eintrag bekommt eine Rest-Lebenszeit
   * und blendet weich aus. Verwerfen ohne Rest ist der stille Verlust, den der Befund meint.
   */
  private fadeOutOldest(list: { life: number }[], cap: number, floor: number): void {
    if (list.length <= cap) return;
    const oldest = list[0];
    if (oldest.life > floor) oldest.life = floor;
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

  /** P-27: lebende Verwelk-Ghosts mit Fortschritt (0 = gerade gestorben, 1 = verweht). */
  forEachDeathGhost(fn: (ghost: { x: number; y: number; visualKey: string }, phase: number) => void): void {
    for (const g of this.deaths.values()) fn({ x: g.x, y: g.y, visualKey: g.visualKey }, 1 - g.t / g.total);
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

  /**
   * B5.1 — die Reise: Quelle (Welt) → Anker (HUD-Zähler, Canvas-Pixel). Quadratische Kurve, drei
   * Dots mit Versatz (Zug hinter dem Kopf), Ankunft als Papier-Puls am Zähler. Alles billige
   * Primitiven (Kreis + Linie), keine Cascade, kein Blur, kein Pfad-Cache nötig.
   * Ohne Anker wird nichts gezeichnet: einen Flug ohne Ziel zu zeichnen hieße, das Ziel zu raten.
   */
  drawFlights(
    ctx: CanvasRenderingContext2D,
    toScreen: (x: number, y: number) => { x: number; y: number },
    anchor: { x: number; y: number } | null,
  ): void {
    if (!anchor) return;
    for (const f of this.flights) {
      const p = flightProgress(f.life, f.maxLife);   // 0 → 1 (letzter Tick = Ankunft)
      const src = toScreen(f.x, f.y);
      // Kontrollpunkt: über der Mitte der Strecke, damit der Bogen sichtbar über dem Feld liegt.
      const cx = (src.x + anchor.x) / 2;
      const cy = (src.y + anchor.y) / 2 - 40 - Math.abs(anchor.x - src.x) * 0.12;
      for (let i = 0; i < 3; i++) {
        const t = Math.max(0, Math.min(1, p - i * 0.09));
        const u = 1 - t;
        const x = u * u * src.x + 2 * u * t * cx + t * t * anchor.x;
        const y = u * u * src.y + 2 * u * t * cy + t * t * anchor.y;
        ctx.globalAlpha = i === 0 ? 1 : 0.5 - i * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, i === 0 ? 5 : 4 - i, 0, Math.PI * 2);
        ctx.fillStyle = f.color; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
      }
    }
    for (const a of this.arrivals) {
      const k = a.life / a.maxLife;               // 1 → 0
      const r = 8 + (1 - k) * 18;
      ctx.globalAlpha = k * 0.9;
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, r, 0, Math.PI * 2);
      ctx.lineWidth = 2.5; ctx.strokeStyle = a.color; ctx.stroke();
    }
    // P-29: Buchung ohne Weltort — der Betrag erscheint AM ZÄHLER (Puls + Zahl), nie an einem
    // erfundenen Punkt in der Welt. Gleiche Tinten-Sprache wie die Flug-Zahlen.
    for (const a of this.rewardArrivals) {
      const k = a.life / a.maxLife;
      const r = 10 + (1 - k) * 20;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, r, 0, Math.PI * 2);
      ctx.lineWidth = 2.5; ctx.strokeStyle = a.color; ctx.stroke();
      ctx.font = '700 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = '#f5efdc';
      const rise = (1 - k) * 10;
      ctx.strokeText(`+${a.amount}`, anchor.x, anchor.y - 14 - rise);
      ctx.fillStyle = a.color;
      ctx.fillText(`+${a.amount}`, anchor.x, anchor.y - 14 - rise);
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
    this.punches.clear(); this.anims.clear(); this.deaths.clear();
    this.flights = []; this.arrivals = []; this.rewardArrivals = [];
  }
}
