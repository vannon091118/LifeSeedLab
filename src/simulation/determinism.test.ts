import { describe, it, expect } from 'vitest';

// Owner: Determinismus-Gate (B32.2/4, Plan Phase 3). Eine kanonische Suite mit drei
// beweiskräftigen Kernen — die Regression-Wahrheit für „deterministisch“:
//   Kern 1  REPLAY:       gleicher Seed + gleicher Command-Stream ⇒ identischer State-Hash
//   Kern 2  ISOLATION:    FX ON/OFF ⇒ bit-identisches Gameplay (AGENTS: „FX ON/OFF muss
//                         bit-identisches Gameplay liefern“)
//   Kern 3  RUN-KONTEXT:  Run-Seed-Herleitung im echten Kontext ist gepinnt — der
//                         frische Run (runId 1 ⇒ Seed 2447771834) und die B30-Brut-Domäne.
// Migriert aus gateB.test.ts (Replay + FX) bzw. brood_identity.test.ts (Run-Kontext-Pins);
// die Originale bleiben als Sub-Domänen-Tests bestehen, wo sie fachliche Nachbar-Assertions
// tragen — hier liegt die kanonische Fassung.

import { SimulationRoot } from '../simulation/root';
import { resetIds } from '../core/ids';
import { VisualObserver } from '../observers/visualObserver';
import { Camera } from '../render/camera';
import { deriveSeed } from '../core/rng';
import { GAME_SEED, RUN_SEED_VERSION } from '../config';
import { deriveBroodSeed } from '../genome/beetle';
import { makeRunSeed, pushCommand, hashOfRoot } from '../testing/testkit';

const SEED = 771123;

/** Identischer Command-Stream je Wurzel (eine Quelle statt zweier Kopien, über das Testkit). */
function replayStream(root: SimulationRoot): void {
  pushCommand(root, 'PLACE_PLANT', { variantId: 'sprout', gx: 1, gy: 2 }, 1);
  pushCommand(root, 'START_WAVE', {}, 2);
}

// ══ Kern 1 — REPLAY ══════════════════════════════════════════════════════════

describe('Determinismus — Kern 1: Replay', () => {
  it('gleicher Seed + gleiche Commands ⇒ identischer State-Hash (600 Ticks, Welle läuft)', () => {
    resetIds();
    const a = new SimulationRoot({ seed: SEED });
    replayStream(a);
    for (let i = 0; i < 600; i++) a.stepOnce();

    resetIds();
    const b = new SimulationRoot({ seed: SEED });
    replayStream(b);
    for (let i = 0; i < 600; i++) b.stepOnce();

    expect(hashOfRoot(a)).toBe(hashOfRoot(b));
    // Beweis, dass der Stream überhaupt simuliert hat (Welle aktiv, Gegner gesehen):
    expect(a.getSnapshot().clock.tick).toBe(600);
  });

  it('abweichender Command-Reihenfolge ≠ gleiches Ergebnis (der Test kann nicht blind grün sein)', () => {
    // Selbst-Kontrolle: ein veränderter Stream MUSS einen anderen Hash erzeugen —
    // sonst wäre der Replay-Test unempfindlich (False Truth, REQ-003).
    resetIds();
    const a = new SimulationRoot({ seed: SEED });
    replayStream(a);
    for (let i = 0; i < 300; i++) a.stepOnce();

    resetIds();
    const b = new SimulationRoot({ seed: SEED });
    pushCommand(b, 'PLACE_PLANT', { variantId: 'sprout', gx: 1, gy: 2 }, 1); // kein Wellen-Start
    for (let i = 0; i < 300; i++) b.stepOnce();

    expect(hashOfRoot(a)).not.toBe(hashOfRoot(b));
  });
});

// ══ Kern 2 — NAMESPACE-ISOLATION (FX ON/OFF) ═════════════════════════════════

describe('Determinismus — Kern 2: FX-Isolation', () => {
  it('FX an/aus verändert den Gameplay-State nicht (bit-identisch, 500 Ticks)', () => {
    // Sequential runs — shared global ID counters must not interleave
    resetIds();
    const a = new SimulationRoot({ seed: SEED });
    const camA = new Camera();
    const obsA = new VisualObserver(camA, true);
    for (const t of ['DAMAGE_DEALT', 'ENEMY_DIED', 'PROJECTILE_FIRED', 'CRITICAL_HIT'] as const) a.bus.subscribe(t, e => obsA.observe(e));
    replayStream(a);
    for (let i = 0; i < 500; i++) { a.stepOnce(); obsA.drain(); }
    const hashA = hashOfRoot(a);
    const scoreA = a.getSnapshot().score;

    resetIds();
    const b = new SimulationRoot({ seed: SEED });
    const camB = new Camera();
    const obsB = new VisualObserver(camB, false);
    for (const t of ['DAMAGE_DEALT', 'ENEMY_DIED', 'PROJECTILE_FIRED', 'CRITICAL_HIT'] as const) b.bus.subscribe(t, e => obsB.observe(e));
    replayStream(b);
    for (let i = 0; i < 500; i++) { b.stepOnce(); obsB.drain(); }
    expect(hashOfRoot(b)).toBe(hashA);
    expect(b.getSnapshot().score).toBe(scoreA);
  });
});

// ══ Kern 3 — RUN-KONTEXT gepinnt (App.tsx-Muster + B30-Brut-Domäne) ═════════

describe('Determinismus — Kern 3: Run-Kontext ist gepinnt', () => {
  it('frischer Run ⇒ runId 1 ⇒ Seed 2447771834 (App.tsx-Ableitung, RUN_SEED_VERSION 1)', () => {
    expect(RUN_SEED_VERSION).toBe(1);
    expect(GAME_SEED).toBe(1337);
    expect(deriveSeed(GAME_SEED, 'world', 'run', 1, RUN_SEED_VERSION)).toBe(2447771834);
    expect(makeRunSeed(1)).toBe(2447771834);
  });

  it('B30-Brut-Domäne bleibt gepinnt (Seed-Kandidaten-IDs, Gegner-Domäne unberührt)', () => {
    // Pins aus quality-spec B30 / brood_identity.test.ts — kanonische Fassung hier.
    expect(deriveBroodSeed('leafhopper', 'shellbeetle', 1)).toBe(905729497);
    expect(deriveBroodSeed('bumble', 'shellbeetle', 3)).toBe(1523112797);
  });

  it('Seeds sind ableitbar, nie Zustand: gleiches Run-Paar ⇒ gleiche Ableitung, anderes Paar ⇒ anders', () => {
    expect(makeRunSeed(7)).toBe(makeRunSeed(7));
    expect(makeRunSeed(8)).not.toBe(makeRunSeed(7));
  });

  it('zweites Replay-Skript (3 Pflanzen, Welle) => identischer Hash - migriert aus sim.test.ts', () => {
    resetIds();
    const a = new SimulationRoot({ seed: 583921 });
    for (const [v, gx, gy, seq] of [['sprout', 1, 2, 1], ['sprout', 4, 0, 2], ['rootwall', 3, 4, 3]] as const) {
      pushCommand(a, 'PLACE_PLANT', { variantId: v, gx, gy }, seq);
    }
    pushCommand(a, 'START_WAVE', {}, 4);
    for (let i = 0; i < 600; i++) a.stepOnce();

    resetIds();
    const b = new SimulationRoot({ seed: 583921 });
    for (const [v, gx, gy, seq] of [['sprout', 1, 2, 1], ['sprout', 4, 0, 2], ['rootwall', 3, 4, 3]] as const) {
      pushCommand(b, 'PLACE_PLANT', { variantId: v, gx, gy }, seq);
    }
    pushCommand(b, 'START_WAVE', {}, 4);
    for (let i = 0; i < 600; i++) b.stepOnce();

    expect(hashOfRoot(a)).toBe(hashOfRoot(b));
  });

  it('Entity-ID-Sequenzen sind ueber identische Laeufe identisch (Phase 2.4)', () => {
    // Vor JEDER der beiden Aufnahmen zurücksetzen (vorher: beforeEach im Original).
    resetIds();
    const a = new SimulationRoot({ seed: 583921 });
    pushCommand(a, 'PLACE_PLANT', { variantId: 'sprout', gx: 1, gy: 2 }, 1);
    pushCommand(a, 'START_WAVE', {}, 2);
    for (let i = 0; i < 400; i++) a.stepOnce();
    const idsA = a.getSnapshot().enemies.map(e => e.id).concat(a.getSnapshot().plants.map(p => p.id));

    resetIds();
    const b = new SimulationRoot({ seed: 583921 });
    pushCommand(b, 'PLACE_PLANT', { variantId: 'sprout', gx: 1, gy: 2 }, 1);
    pushCommand(b, 'START_WAVE', {}, 2);
    for (let i = 0; i < 400; i++) b.stepOnce();
    const idsB = b.getSnapshot().enemies.map(e => e.id).concat(b.getSnapshot().plants.map(p => p.id));

    expect(idsA).toEqual(idsB);
  });
});
