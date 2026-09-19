// Owner: RenderSystem (Lauf-Gang). LOC ≤ 200. REINE PRÄSENTATION — kein Gameplay liest hier.
//
// DAS PROBLEM (B41, 19.09.2026): Die Tiere „flogen durchs Bild“. Ursache war keine
// Geschwindigkeit, sondern die Kopplung: Beine standen still (die Anatomie war EIN Backbild) und
// der Körper-Bob hing an `tick * 16`, also an der WANDUHR. Ein Standbild, das sich zeitgesteuert
// auf und ab schiebt, liest das Auge als Gleiten — nicht als Laufen.
//
// DIE REGEL: Ein Schritt folgt der ZURÜCKGEGLEGTEN STRECKE, nie der Zeit. Die Phase wird aus dem
// Positionsdelta der Sim gespeist (px/py kommen aus `enemySystem`, es wird nichts geschrieben und
// nichts erfunden). Damit gilt automatisch:
//   • schnelleres Tier ⇒ schnellere Schritte, gleiche Bein-Stellung pro Meter,
//   • stehendes Tier (Verlangsamung, Frieren) ⇒ Beine stehen still, kein Tritt ins Leere,
//   • 30 fps und 120 fps zeigen denselben Lauf, weil dieselbe Strecke summiert wird.
// Kein RNG, keine Uhr, kein Bezug auf `performance.now` — die Darstellung bleibt reproduzierbar.
//
// Tripod-Gang (Insekten-Wahrheit): Beine 1+3 links und 2 rechts bilden ein Dreibein, das andere
// Dreibein ist um 0.5 versetzt. Deshalb `legPhase()` in `beetles.ts` und nicht pro Bein gewürfelt.

import type { BeetlePhenotype } from '../genome/beetlePhenotype';
import type { BeetleMotion } from '../config/beetlePhenotype.source';

/** Gebackene Gang-Bilder je Wesen. 8 reichen für eine runde Bewegung, 6 wirkten eckig. */
export const GAIT_FRAMES = 8;

/** Zwei Schritte je Zyklus: das ist die Definition eines Tripod-Gangs. */
export const GAIT_STEPS_PER_CYCLE = 2;

/**
 * Strecke je vollem Gang-Zyklus in Zellen, nach Bewegungsstil (Source der Präsentation).
 * Kleiner Wert = Schritte pro Zelle, größerer Wert = raumgreifender Schritt.
 */
const STRIDE_CELLS: Record<BeetleMotion, number> = {
  scuttle: 1.1, // huschen: viele, kurze Schritte
  march: 1.8,
  hop: 2.6,     // Sprungbeine: ein Hüpfer deckt mehr Strecke
  dash: 1.4,    // schnelle Läufer setzen häufiger auf
};

/** Amplitude des Körper-Bobs je Zelle Strecke (nicht je Sekunde!) — aus dem Stil. */
const BOB_PER_STYLE: Record<BeetleMotion, number> = {
  scuttle: 0.028,
  march: 0.035,
  hop: 0.085,
  dash: 0.050,
};

export function strideCellsOf(p: BeetlePhenotype): number {
  // Längere Beine = weiterer Schritt, aber gedeckelt: die Phase bleibt lesbar.
  const legFactor = 0.75 + p.legs.length * 0.5;
  return STRIDE_CELLS[p.motion.style] * legFactor;
}

/**
 * Wie weit der Körper in einem Viertel-Zyklus nach oben geht. Reine Darstellung.
 * Der Bob hängt an derselben Phase wie die Beine — deshalb passen Auf und Ab und Tritt zusammen.
 */
export function bobAmplitudeOf(p: BeetlePhenotype): number {
  return BOB_PER_STYLE[p.motion.style];
}

export interface GaitSample {
  /** 0..1 innerhalb des aktuellen Zyklus. */
  phase: number;
  /** Gebackenes Bild-Index für den Sprite-Cache. */
  frame: number;
}

/**
 * Summiert die Strecke je Schlüssel und liefert daraus die Gang-Phase.
 * Eigentümer ist der Renderer (ein Objekt pro Frame-Zeichner); die Klasse hält NUR
 * Präsentationszustand (letzte Position je Wesen) — nichts, was die Simulation kennt.
 */
export class GaitTracker {
  private travelled = new Map<string, number>();
  private last = new Map<string, { x: number; y: number }>();
  private seen = new Set<string>();

  /** Neue Frame-Runde anfangen (danach `phaseOf()` je Wesen, dann `endFrame()`). */
  beginFrame(): void {
    this.seen.clear();
  }

  /** Strecke (Zellen), die dieses Wesen bisher gelaufen ist — nur für Tests/Diagnose. */
  travelledOf(key: string): number {
    return this.travelled.get(key) ?? 0;
  }

  /**
   * Phase für ein Wesen an dieser Position. Die Strecke kommt aus dem ECHTEN Positionsdelta:
   * Teleports (Routenwechsel) zählen mit, sind aber selten und ändern nur die Beinphase.
   */
  phaseOf(key: string, x: number, y: number, p: BeetlePhenotype): GaitSample {
    const prev = this.last.get(key);
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      const step = Math.sqrt(dx * dx + dy * dy);
      if (step > 0) this.travelled.set(key, (this.travelled.get(key) ?? 0) + step);
    }
    this.last.set(key, { x, y });
    this.seen.add(key);

    const cycles = (this.travelled.get(key) ?? 0) / strideCellsOf(p);
    const phase = cycles - Math.floor(cycles);
    return { phase, frame: Math.min(GAIT_FRAMES - 1, Math.floor(phase * GAIT_FRAMES)) };
  }

  /** Vergessene Wesen (getötet, despawned) aus dem Zustand werfen — kein Leck über einen Lauf. */
  endFrame(): void {
    if (this.seen.size === this.last.size) return;
    for (const key of this.last.keys()) {
      if (this.seen.has(key)) continue;
      this.last.delete(key);
      this.travelled.delete(key);
    }
  }

  clear(): void {
    this.last.clear();
    this.travelled.clear();
    this.seen.clear();
  }

  size(): number {
    return this.last.size;
  }
}

/** Phase -> Bild-Index (für Tests und für Aufrufer ohne Tracker). */
export function gaitFrameOf(phase: number): number {
  const p = phase - Math.floor(phase);
  return Math.min(GAIT_FRAMES - 1, Math.floor(p * GAIT_FRAMES));
}
