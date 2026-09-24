import type { Page } from '@playwright/test';

/**
 * Canvas-Sonde — EIN Instrument für visuelle Behauptungen (B24: eine Quelle, keine Kopien).
 *
 * Warum es das gibt: „Silence is not feedback" war bisher eine Review-Meinung. In 668 Unit-Tests
 * und 30 E2E-Specs stand KEINE einzige Pixelaussage — jede Sichtprüfung musste ad hoc im Browser
 * nachgebaut werden (Frame einfrieren, Goldpixel zählen, Ergebnis wieder wegwerfen). Genau dabei
 * ist zuletzt ein echter Defekt aufgefallen (der Kopf-Dot der Belohnungsreise brach 13 px vor dem
 * Zähler ab), und zwar nur, weil jemand zufällig nachgemessen hat.
 *
 * Was sie kann (die drei Primitiven):
 *   1. Frame einfrieren: die Anwendung hält an, das zuletzt gezeichnete Bild bleibt stehen —
 *      fortsetzbar, weil die Frame-Fortsetzung GESICHERT statt verworfen wird (`stepFrame`).
 *   2. Farb-Centroid: wo liegt eine Farbe im Fenster (CSS-Pixel RELATIV ZUR LEINWAND — dasselbe
 *      Koordinatensystem, in dem der Renderer Screen-Raum zeichnet und die UI den Chip misst).
 *   3. Regionen-Vergleich: was hat sich in einem Fenster geändert (Anzahl + Schwerpunkt der
 *      Änderung) — gegen eine gemerkte Baseline.
 *
 * Regeln dieses Instruments (wie `harness.ts`):
 * - SCHWARZBOX: liest nur DOM, Leinwandummerung und die DevGate-Brücke (`?dev=1`). Kein
 *   App-Import, keine Owner-Funktion, kein Schreiben in Sim-Zustand.
 * - KEINE Behauptungen: die Sonde misst, die Spec behauptet.
 * - Zeitbasis ist der Sim-Takt. `stepFrame` setzt eine PAUSIERTE Sim voraus und meldet den Tick
 *   mit — bewegt der sich von selbst, ist die Messung wertlos und die Spec fliegt auf, statt
 *   still eine andere Lage zu messen.
 * - Die Zellgeometrie ist aus `Renderer.metrics()` gespiegelt (20 px Rand, zentriert, +8 px
 *   Versatz) — dieselbe Spiegelung wie `freeCells` im Harness. Driftet der Renderer, finden die
 *   Messungen ihr Ziel nicht und melden das laut (kein stilles Danebenmessen).
 */

/** Rechteck in CSS-Pixeln RELATIV zur Leinwand (dasselbe System wie der Screen-Raum des Renderers). */
export interface ProbeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProbeCentroid {
  /** Schwerpunkt in CSS-Pixeln relativ zur Leinwand. */
  x: number;
  y: number;
  /** Anzahl getroffener Pixel (in Gerätepixeln gezählt). */
  count: number;
}

export interface ProbeDelta {
  before: number;
  after: number;
  /** Pixel, die sich geändert haben (|Δ| je Kanal > Toleranz). */
  changed: number;
  /** Schwerpunkt der Änderung, wenn es eine gibt. */
  centroid: ProbeCentroid | null;
}

export interface ProbeEvent {
  type: string;
  tick: number;
  payload: unknown;
}

export interface ProbeStep {
  /** Tick vor dem Frame — und danach: unverändert ⇒ die Sim war wirklich stehengeblieben. */
  tickBefore: number;
  tickAfter: number;
}

/**
 * Installiert die Sonde im Browser (`window.__probe`). Selbstenthalten, weil Playwright die
 * Funktionsquelle serialisiert — deshalb liegen alle Helfer INNERHALB dieser Funktion.
 */
export function installProbe(): void {
  interface W extends Window {
    __simRootRef?: { current: { getSnapshot: () => { clock: { tick: number } }; bus: { subscribe: (t: string, h: (e: unknown) => void) => () => void } } | null };
    __probe?: unknown;
  }
  const w = window as W;
  const origRaf = window.requestAnimationFrame.bind(window);

  const canvas = (): HTMLCanvasElement => {
    const c = document.querySelector('canvas');
    if (!c) throw new Error('Canvas-Sonde: keine Leinwand im DOM (Run nicht gemountet?)');
    return c as HTMLCanvasElement;
  };
  const dprOf = (c: HTMLCanvasElement): number => c.width / c.getBoundingClientRect().width || 1;
  const context = (c: HTMLCanvasElement): CanvasRenderingContext2D => {
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas-Sonde: kein 2D-Kontext');
    return ctx as CanvasRenderingContext2D;
  };
  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  /** Farbton in Grad (0–360). Grau hat keinen Ton — dann −1 (matcht nie). */
  const hueOf = (r: number, g: number, b: number): number => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return -1;
    let h: number;
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    return (h + 360) % 360;
  };
  /** Sättigung 0–1 (HSL-Form gegen den Kanalbereich). */
  const saturationOf = (r: number, g: number, b: number): number => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;
    const d = (max - min) / 255;
    if (d === 0) return 0;
    return d / (1 - Math.abs(2 * l - 1));
  };

  /** Liest ein Fenster (CSS-Pixel) als Gerätepixel-Block — die EINE Lesestelle der Sonde. */
  const readRegion = (rect: ProbeRect) => {
    const c = canvas();
    const dpr = dprOf(c);
    const x0 = Math.max(0, Math.round(rect.x * dpr));
    const y0 = Math.max(0, Math.round(rect.y * dpr));
    const aw = Math.max(1, Math.min(Math.round(rect.w * dpr), c.width - x0));
    const ah = Math.max(1, Math.min(Math.round(rect.h * dpr), c.height - y0));
    return { data: context(c).getImageData(x0, y0, aw, ah).data, x0, y0, aw, ah, dpr };
  };

  const cell = 12;
  const geometry = () => {
    const b = canvas().getBoundingClientRect();
    const pad = 20;
    const size = Math.min((b.width - pad * 2) / cell, (b.height - pad * 2) / cell);
    return { size, ox: (b.width - size * cell) / 2, oy: (b.height - size * cell) / 2 + 8, w: b.width, h: b.height };
  };

  let probeSeq = 0;

  const probe = {
    frozen: false,
    queued: null as null | ((now: number) => void),
    events: [] as ProbeEvent[],
    watched: false,
    baseline: null as null | Uint8ClampedArray,

    /** Zellrechteck aus der Renderer-Geometrie (gespiegelt, s. Dateikopf). */
    cellRect(gx: number, gy: number): ProbeRect {
      const g = geometry();
      return { x: g.ox + gx * g.size, y: g.oy + gy * g.size, w: g.size, h: g.size };
    },

    /** Rechteck des Belohnungs-Zählers (Datenanker der UI) in Leinwand-Koordinaten. */
    anchorRect(): ProbeRect {
      const c = canvas();
      const chip = document.querySelector('[data-reward-anchor]');
      if (!chip) throw new Error('Canvas-Sonde: kein Belohnungs-Anker ([data-reward-anchor]) im DOM');
      const cb = c.getBoundingClientRect();
      const b = chip.getBoundingClientRect();
      return { x: b.left + b.width / 2 - cb.left, y: b.top + b.height / 2 - cb.top, w: 0, h: 0 };
    },

    /**
     * Farb-Centroid in einem Fenster (CSS-Pixel relativ zur Leinwand).
     *
     * Zwei Modi, weil ein Effekt zwei verschiedene Dinge sein kann:
     * - `exact` (Standard): |Δ| je Kanal ≤ tolerance. Richtig für DECKENDE Zeichen — die goldenen
     *   Belohnungs-Dots (`#d9a441`), der rote Ablehnungs-Puls (`#a94438`).
     * - `hue`: gleicher Farbton (Δhue ≤ tolerance, Sättigung ≥ minSaturation). Richtig für
     *   HALBTRANSPARENTE Effekte über Papier: deren Pixel mischen sich mit dem Untergrund, ein
     *   RGB-Vergleich misst dann die Einblendkurve statt den Effekt.
     *
     * Beleg für den zweiten Modus (Messung 21.09.2026, Treffer-Fenster am gemeldeten
     * Einschlagpunkt, 28 Frames über zwei Läufe): exakt ±24 ⇒ **0** Pixel in JEDEM Frame,
     * Farbton-Familie ⇒ 78–144 Pixel, Schwerpunkt 4–8 px vom gemeldeten Punkt. Das Einschlags-
     * profil `spawn_spore` trägt `alphaCurve: 'fadeInOut'` (`observers/particles.ts`), deshalb
     * erzeugt es über `#d9c9a3`-Papier Aufhellungen wie `#e2ecb5` statt des reinen `#a3e635`.
     * Eine `exact`-Behauptung auf so einen Effekt ist nicht streng, sondern falsch.
     */
    centroid(
      rect: ProbeRect,
      color: string,
      opts: { mode?: 'exact' | 'hue'; tolerance?: number; minSaturation?: number } = {},
    ): ProbeCentroid {
      const mode = opts.mode ?? 'exact';
      const tolerance = opts.tolerance ?? (mode === 'exact' ? 24 : 20);
      const minSaturation = opts.minSaturation ?? 0.25;
      const [r, g, b] = hexToRgb(color);
      const zielHue = hueOf(r, g, b);
      const { data, x0, y0, aw, ah, dpr } = readRegion(rect);
      let count = 0, sx = 0, sy = 0;
      for (let y = 0; y < ah; y++) {
        for (let x = 0; x < aw; x++) {
          const i = (y * aw + x) * 4;
          const treffer = mode === 'exact'
            ? Math.abs(data[i] - r) <= tolerance && Math.abs(data[i + 1] - g) <= tolerance && Math.abs(data[i + 2] - b) <= tolerance
            : (() => {
                // Papier und Papier-Schatten haben Sättigung, aber einen anderen Ton — die
                // Sättigungs-Untergrenze trennt Effekt von Untergrund, der Tonabstand die Effekte voneinander.
                const s = saturationOf(data[i], data[i + 1], data[i + 2]);
                if (s < minSaturation) return false;
                const d = Math.abs(hueOf(data[i], data[i + 1], data[i + 2]) - zielHue);
                return Math.min(d, 360 - d) <= tolerance;
              })();
          if (treffer) {
            count++; sx += x; sy += y;
          }
        }
      }
      if (count === 0) return { x: 0, y: 0, count: 0 };
      return { x: (x0 + sx / count) / dpr, y: (y0 + sy / count) / dpr, count };
    },

    /** Merkt das Fenster als Baseline für den Regionen-Vergleich. */
    capture(rect: ProbeRect): void {
      const { data } = readRegion(rect);
      probe.baseline = new Uint8ClampedArray(data);
    },

    /**
     * Regionen-Vergleich gegen die gemerkte Baseline.
     *
     * `onlyColor` grenzt die Zählung auf Pixel ein, die im AKTUELLEN Bild diese Farbe tragen. Nötig,
     * weil Bewegung allein schon Änderung erzeugt und ein bewegter Umriss die Zahl überdeckt: beim
     * Treffer lieferte ein ungefiltertes Delta im Fenster ~900 geänderte Pixel (Projektil, Gegner,
     * Anti-Aliasing), von denen nur ein Bruchteil die Antwort IST. Mit Tintenfilter (Messung
     * 21.09.2026, zwei Läufe): 50–60 neue Tinten-Pixel im Einschlags-Frame, danach 1 (der Gegner).
     */
    delta(
      rect: ProbeRect,
      opts: { tolerance?: number; onlyColor?: string; colorTolerance?: number } = {},
    ): ProbeDelta {
      const before = probe.baseline;
      if (!before) throw new Error('Canvas-Sonde: erst capture(), dann delta()');
      const tolerance = opts.tolerance ?? 12;
      const onlyColor = opts.onlyColor ? hexToRgb(opts.onlyColor) : null;
      const colorTolerance = opts.colorTolerance ?? 30;
      const { data, x0, y0, aw, ah, dpr } = readRegion(rect);
      let changed = 0, sx = 0, sy = 0;
      for (let y = 0; y < ah; y++) {
        for (let x = 0; x < aw; x++) {
          const i = (y * aw + x) * 4;
          if (
            Math.abs(data[i] - before[i]) > tolerance ||
            Math.abs(data[i + 1] - before[i + 1]) > tolerance ||
            Math.abs(data[i + 2] - before[i + 2]) > tolerance
          ) {
            if (onlyColor) {
              const farbe = Math.abs(data[i] - onlyColor[0]) <= colorTolerance
                && Math.abs(data[i + 1] - onlyColor[1]) <= colorTolerance
                && Math.abs(data[i + 2] - onlyColor[2]) <= colorTolerance;
              if (!farbe) continue;
            }
            changed++; sx += x; sy += y;
          }
        }
      }
      return {
        before: before.length / 4,
        after: aw * ah,
        changed,
        centroid: changed === 0 ? null : { x: (x0 + sx / changed) / dpr, y: (y0 + sy / changed) / dpr, count: changed },
      };
    },

    /**
     * Hält die Darstellung an: der AST des Anwendungs-Loops wird gefangen, statt verworfen —
     * deshalb ist `resume()` möglich (der frühere Ad-hoc-Freeze im Browser ließ die Seite tot
     * zurück, weil `requestAnimationFrame` einfach gelöscht wurde).
     */
    freeze(): void {
      if (probe.frozen) return;
      probe.queued = null;
      window.requestAnimationFrame = ((cb: (now: number) => void) => {
        probe.queued = cb;
        return 0;
      }) as typeof window.requestAnimationFrame;
      probe.frozen = true;
    },

    /** Genau EIN Anwendungs-Frame (Drain + Zeichnen), solange eingefroren. */
    stepFrame(): ProbeStep {
      const tick = (): number => w.__simRootRef?.current?.getSnapshot().clock.tick ?? -1;
      const tickBefore = tick();
      const cb = probe.queued;
      probe.queued = null;
      if (cb) cb(performance.now());
      return { tickBefore, tickAfter: tick() };
    },

    /** Gibt den Anwendungs-Loop zurück an den echten Taktgeber. */
    resume(): void {
      if (!probe.frozen) return;
      window.requestAnimationFrame = origRaf as typeof window.requestAnimationFrame;
      probe.frozen = false;
      const cb = probe.queued;
      probe.queued = null;
      if (cb) origRaf(cb);
    },

    /** Sammelt Bus-Events der genannten Typen (Produktions-Bus, nur lesend abonniert). */
    watch(types: string[]): void {
      const root = w.__simRootRef?.current;
      if (!root) throw new Error('Canvas-Sonde: Sim-Brücke nicht gebunden (Run-Screen gemountet?)');
      if (!probe.watched) {
        probe.watched = true;
        for (const t of types) {
          root.bus.subscribe(t, (e: unknown) => {
            const ev = e as { type: string; tick: number; payload: unknown };
            probe.events.push({ type: ev.type, tick: ev.tick, payload: ev.payload });
          });
        }
      }
    },

    /** Gesammelte Events (optional auf einen Typ gefiltert). */
    collected(type?: string): ProbeEvent[] {
      return type ? probe.events.filter(e => e.type === type) : probe.events.slice();
    },

    /** Veröffentlicht ein Event über den ECHTEN Bus (Payload-Form wie die Sim sie erzeugt). */
    publish(type: string, payload: unknown): void {
      const root = w.__simRootRef?.current;
      if (!root) throw new Error('Canvas-Sonde: Sim-Brücke nicht gebunden');
      const tick = root.getSnapshot().clock.tick;
      (root.bus as unknown as { publish: (e: unknown) => void }).publish({
        eventId: `${tick}:probe:${type}:${probeSeq++}`, tick, type, sourceId: 'probe', version: 1, payload,
      });
    },
  };

  w.__probe = probe;
}

/** Dünne Hülle für die Specs — jede Methode ist ein Aufruf in der Seite. */
export class CanvasProbe {
  constructor(private readonly page: Page) {}

  static async attach(page: Page): Promise<CanvasProbe> {
    await page.evaluate(installProbe);
    return new CanvasProbe(page);
  }

  cellRect(gx: number, gy: number): Promise<ProbeRect> {
    return this.page.evaluate(([x, y]) => (window as never as { __probe: { cellRect: (a: number, b: number) => ProbeRect } }).__probe.cellRect(x, y), [gx, gy] as const);
  }

  anchor(): Promise<ProbeRect> {
    return this.page.evaluate(() => (window as never as { __probe: { anchorRect: () => ProbeRect } }).__probe.anchorRect());
  }

  centroid(rect: ProbeRect, color: string, tolerance?: number): Promise<ProbeCentroid> {
    return this.page.evaluate(
      ([r, c, t]) => (window as never as { __probe: { centroid: (a: ProbeRect, b: string, c: number) => ProbeCentroid } }).__probe.centroid(r as ProbeRect, c as string, t as number),
      [rect, color, tolerance ?? 24] as const,
    );
  }

  capture(rect: ProbeRect): Promise<void> {
    return this.page.evaluate((r) => (window as never as { __probe: { capture: (a: ProbeRect) => void } }).__probe.capture(r), rect);
  }

  delta(rect: ProbeRect, tolerance?: number): Promise<ProbeDelta> {
    return this.page.evaluate(
      ([r, t]) => (window as never as { __probe: { delta: (a: ProbeRect, b: number) => ProbeDelta } }).__probe.delta(r as ProbeRect, t as number),
      [rect, tolerance ?? 12] as const,
    );
  }

  freeze(): Promise<void> {
    return this.page.evaluate(() => (window as never as { __probe: { freeze: () => void } }).__probe.freeze());
  }

  stepFrame(): Promise<ProbeStep> {
    return this.page.evaluate(() => (window as never as { __probe: { stepFrame: () => ProbeStep } }).__probe.stepFrame());
  }

  resume(): Promise<void> {
    return this.page.evaluate(() => (window as never as { __probe: { resume: () => void } }).__probe.resume());
  }

  watch(types: string[]): Promise<void> {
    return this.page.evaluate((t) => (window as never as { __probe: { watch: (a: string[]) => void } }).__probe.watch(t), types);
  }

  events(type?: string): Promise<ProbeEvent[]> {
    return this.page.evaluate((t) => (window as never as { __probe: { collected: (a?: string) => ProbeEvent[] } }).__probe.collected(t), type);
  }

  publish(type: string, payload: unknown): Promise<void> {
    return this.page.evaluate(([t, p]) => (window as never as { __probe: { publish: (a: string, b: unknown) => void } }).__probe.publish(t as string, p), [type, payload] as const);
  }
}

/** Zellenfenster um eine Zelle (für Regionen-Vergleiche „was passiert an DIESER Stelle"). */
export function cellWindow(rect: ProbeRect, pad = 0): ProbeRect {
  return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

/** Abstand zweier Punkte in CSS-Pixeln (Leinwand-System). */
export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
