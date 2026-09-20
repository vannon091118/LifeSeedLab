// Owner: Simulation (QA-Abgleich). P-14 „Leere Route direkt nach dem Fortsetzen".
// Bisheriger Stand (Devlog 10/13, ROADMAP §3 P-14): applyResume setzte currentRoute = null,
// abgeleitet wurde erst im ersten Tick — für einen Moment zeigte das Brett keinen Laufweg.
// Am heutigen HEAD leitet der Root-Konstruktor die erste Route SELBST ab
// (this.recomputeRoute im Konstruktor, nach applyResume) — dieser Test pinnt die Invariante,
// damit sie nicht still zurückfällt (dann wäre P-14 wieder offen, mit Beleg).
import { describe, expect, it, beforeEach } from 'vitest';
import { makeRun, resetTestState } from '../testing/testkit';

describe('P-14 — Resume: die Route existiert ab dem ersten Bild', () => {
  beforeEach(() => resetTestState());

  it('direkt nach Konstruktion mit resume ist currentRoute keine leere Route', () => {
    const first = makeRun();
    const snap = first.getSnapshot();
    // Eine echte Route aus dem Standard-Layout als Resume-Basis nehmen
    expect(snap.currentRoute, 'frischer Run: Route ist ab Konstruktion da').not.toBeNull();

    const resume = {
      waveNumber: 3,
      lives: 12,
      score: 500,
      combo: snap.combo,
      plants: snap.plants,
      inventory: snap.inventory,
      discoveredVariants: snap.discoveredVariants,
      nektarEarned: 120,
    };
    const resumed = makeRun({ init: { resume } });
    const after = resumed.getSnapshot();
    expect(after.phase).toBe('prep');
    expect(after.currentRoute, 'Resume: Route ist SOFORT da — kein leeres Brett bis zum ersten Tick').not.toBeNull();
    expect(after.currentRoute!.length).toBeGreaterThan(0);
  });
});
