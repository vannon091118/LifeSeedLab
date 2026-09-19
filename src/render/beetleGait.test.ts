// Owner: RenderSystem (Lauf-Gang) — Vertragstest.
// B41: „Die Tiere fliegen durchs Bild.“ Dieser Test pinnt den Fix an seiner Wurzel: die
// Schrittphase hängt an der ZURÜCKGEGLEGTEN STRECKE, nicht an Ticks oder Wanduhr. Daraus folgen
// die drei Zusagen, die das Auge prüft: gleiche Strecke ⇒ gleiche Bein-Stellung, Stillstand ⇒
// Stillstand, mehr Tempo ⇒ mehr Schritte (nicht mehr Gleiten).

import { describe, it, expect } from 'vitest';
import { GaitTracker, GAIT_FRAMES, gaitFrameOf, strideCellsOf, bobAmplitudeOf } from './beetleGait';
import { legPhase } from './beetles';
import { beetlePhenotypeOf, type BeetlePhenotype } from '../genome/beetlePhenotype';
import { createBaseVariants } from '../genome/bases';

function phenotypeOf(index = 0, style?: BeetlePhenotype['motion']['style']): BeetlePhenotype {
  const base = createBaseVariants()[index % createBaseVariants().length]!;
  const p = beetlePhenotypeOf({ genome: base.genome, generation: 0 });
  if (style) p.motion.style = style;
  return p;
}

describe('Lauf-Gang — Phase aus Strecke, nicht aus Zeit', () => {
  it('gleiche Strecke ⇒ gleiche Phase, unabhängig von der Zahl der Aufrufe', () => {
    const p = phenotypeOf();
    const a = new GaitTracker();
    const b = new GaitTracker();

    // A: ein Schritt über 0.5 Zellen. B: zehn Schritte über je 0.05 (dasselbe Ergebnis).
    a.phaseOf('e1', 0, 0, p);
    const stepA = a.phaseOf('e1', 0.5, 0, p);
    b.phaseOf('e1', 0, 0, p);
    let stepB = b.phaseOf('e1', 0.05, 0, p);
    for (let i = 2; i <= 10; i++) stepB = b.phaseOf('e1', i * 0.05, 0, p);

    expect(stepB.phase).toBeCloseTo(stepA.phase, 9);
    expect(b.travelledOf('e1')).toBeCloseTo(0.5, 9);
  });

  it('Stillstand lässt die Beine stehen (kein Tritt ins Leere)', () => {
    const p = phenotypeOf();
    const t = new GaitTracker();
    t.phaseOf('e1', 2, 2, p);
    const first = t.phaseOf('e1', 5, 2, p);
    const again = t.phaseOf('e1', 5, 2, p); // steht
    expect(again.phase).toBe(first.phase);
    expect(again.frame).toBe(first.frame);
  });

  it('doppelte Strecke ⇒ doppelte Zyklen (Tempo wird zu Schritten)', () => {
    const p = phenotypeOf();
    const stride = strideCellsOf(p);
    const t = new GaitTracker();
    t.phaseOf('e1', 0, 0, p);
    const half = t.phaseOf('e1', stride / 2, 0, p);
    expect(half.phase).toBeCloseTo(0.5, 6);
    const full = t.phaseOf('e1', stride, 0, p);
    expect(full.phase).toBeCloseTo(0, 6); // ein voller Zyklus ist wieder Phase 0
  });

  it('Bild-Index deckt alle GAIT_FRAMES ab und bleibt im Bereich', () => {
    expect(gaitFrameOf(0)).toBe(0);
    expect(gaitFrameOf(0.999)).toBe(GAIT_FRAMES - 1);
    expect(gaitFrameOf(1.25)).toBe(gaitFrameOf(0.25));
    expect(gaitFrameOf(-0.25)).toBeGreaterThanOrEqual(0);
    const frames = new Set<number>();
    for (let i = 0; i < GAIT_FRAMES; i++) frames.add(gaitFrameOf(i / GAIT_FRAMES + 0.001));
    expect(frames.size).toBe(GAIT_FRAMES);
  });

  it('Tripod: Vorder-+Hinterbein links laufen mit dem Mittelbein rechts', () => {
    for (let g = 0; g < 1; g += 0.25) {
      const frontLeft = legPhase(0, -1, g);
      const hindLeft = legPhase(2, -1, g);
      const midRight = legPhase(1, 1, g);
      const frontRight = legPhase(0, 1, g);
      const midLeft = legPhase(1, -1, g);
      const hindRight = legPhase(2, 1, g);
      // Dreibein A bewegt sich synchron …
      expect(frontLeft).toBe(midRight);
      expect(frontLeft).toBe(hindLeft);
      // … Dreibein B ist um einen halben Schritt versetzt.
      expect(frontRight).toBe(midLeft);
      expect(frontRight).toBe(hindRight);
      const offset = (frontLeft - frontRight + 1) % 1;
      expect(Math.min(offset, 1 - offset)).toBeCloseTo(0.5, 9);
    }
  });

  it('Phasen sind immer 0..1, auch bei Rückwärts-/Sprung-Bewegung', () => {
    const p = phenotypeOf();
    const t = new GaitTracker();
    t.phaseOf('e1', 0, 0, p);
    for (const x of [0.3, -0.4, 2.9, 0.05]) {
      const s = t.phaseOf('e1', x, 0, p);
      expect(s.phase).toBeGreaterThanOrEqual(0);
      expect(s.phase).toBeLessThan(1);
      expect(s.frame).toBeGreaterThanOrEqual(0);
      expect(s.frame).toBeLessThan(GAIT_FRAMES);
    }
  });

  it('Getötete Wesen werden vergessen — kein Leck über einen Lauf', () => {
    const p = phenotypeOf();
    const t = new GaitTracker();
    t.beginFrame();
    t.phaseOf('e1', 0, 0, p);
    t.phaseOf('e2', 1, 0, p);
    t.endFrame();
    expect(t.size()).toBe(2);

    t.beginFrame();
    t.phaseOf('e1', 1, 0, p); // e2 wurde getötet
    t.endFrame();
    expect(t.size()).toBe(1);
    expect(t.travelledOf('e2')).toBe(0);
  });

  it('Bewegungsstil bestimmt Schrittweite und Bob (Source-Werte, kein Zufall)', () => {
    const scuttle = phenotypeOf(0, 'scuttle');
    const hop = phenotypeOf(0, 'hop');
    expect(strideCellsOf(hop)).toBeGreaterThan(strideCellsOf(scuttle));
    expect(bobAmplitudeOf(hop)).toBeGreaterThan(bobAmplitudeOf(scuttle));
    // Rein: dasselbe Wesen liefert immer denselben Wert (keine Uhr, kein RNG).
    // (Unterschiedliche Genome dürfen sich unterscheiden — sie haben andere Beine.)
    expect(strideCellsOf(hop)).toBe(strideCellsOf(hop));
    expect(bobAmplitudeOf(hop)).toBe(bobAmplitudeOf(hop));
  });
});
