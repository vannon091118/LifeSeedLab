// Owner: Simulation (VectorSystem). Test.
// Reiner Systemvertrag: 36 source-getriebene Kombinationen werden ohne SimulationRoot geprüft.
// Die Root-Integration bleibt bewusst in vector_engine_gate.test.ts als Boundary bestehen.

import { describe, it, expect } from 'vitest';
import { VECTOR_COMBINATION_CASES, ELEMENTAR_VECTOR_IDS, makeVectorCombinationFixture } from '../testing/vectorFixture';
import { VECTOR_LOGIC_SOURCE } from '../config/vector_logic.source';

const SEED = 2447771834;

describe('VectorSystem — reine Kombinations-Fixture', () => {
  it('erzeugt genau 6 × 6 = 36 Elementar-Kombinationen', () => {
    expect(VECTOR_COMBINATION_CASES).toHaveLength(36);
  });

  for (const [a, b] of VECTOR_COMBINATION_CASES) {
    it(`${a} × ${b}: beide Beiträge bleiben erhalten und der Tick verändert das Feld`, () => {
      const fixture = makeVectorCombinationFixture(SEED);
      fixture.deposit(a, 1);
      fixture.deposit(b, 1);

      const expected = a === b ? 2 : 1;
      expect(fixture.intensityAt(a)).toBeCloseTo(expected, 6);
      expect(fixture.intensityAt(b)).toBeCloseTo(expected, 6);

      const before = fixture.field();
      fixture.step(60);
      expect(fixture.field(), `${a} × ${b} friert im VectorSystem ein`).not.toBe(before);

      for (const cell of fixture.cells()) {
        expect(Number.isFinite(cell.intensity)).toBe(true);
        expect(cell.intensity).toBeGreaterThan(0);
        expect(cell.ttl).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

describe('VectorSystem — Grenzen und kanonische Ordnung', () => {
  it('verwirft nicht-finite und leere Intensitäten ohne Geisterzellen', () => {
    const fixture = makeVectorCombinationFixture(SEED);
    fixture.deposit('VECTOR_HEAT', Number.NaN);
    fixture.deposit('VECTOR_HEAT', Number.POSITIVE_INFINITY);
    fixture.deposit('VECTOR_HEAT', 0);
    fixture.deposit('VECTOR_HEAT', -1);
    fixture.deposit('VECTOR_HEAT', 1, Number.POSITIVE_INFINITY);
    expect(fixture.cells()).toHaveLength(0);
  });

  it('begrenzt einen extrem großen Zusatzradius auf die Weltfläche', () => {
    const fixture = makeVectorCombinationFixture(SEED);
    fixture.deposit('VECTOR_HEAT', 1, Number.MAX_SAFE_INTEGER);
    expect(fixture.cells().length).toBeGreaterThan(0);
    expect(fixture.cells().every(cell => Number.isFinite(cell.intensity))).toBe(true);
  });

  it('macht die Zellreihenfolge unabhängig vom Deposit-Revers', () => {
    const forward = makeVectorCombinationFixture(SEED);
    const reverse = makeVectorCombinationFixture(SEED);
    forward.deposit('VECTOR_HEAT', 1);
    forward.deposit('VECTOR_WET', 1);
    reverse.deposit('VECTOR_WET', 1);
    reverse.deposit('VECTOR_HEAT', 1);

    expect(forward.field()).toBe(reverse.field());
    expect(forward.cells()).toEqual(reverse.cells());
  });
});

describe('VectorSystem — Trace an der reinen Fixture', () => {
  it('WET führt den kürzeren Dijkstra-Pfad und OOB bleibt fail-closed', () => {
    const fixture = makeVectorCombinationFixture(SEED);
    fixture.depositAt(1, 6, 'VECTOR_WET', 1);
    const trace = fixture.traceCharge(0, 6, 6, 6);
    expect(trace).not.toBeNull();
    expect(trace!.path.some(point => point.x === 1 && point.y === 6)).toBe(true);
    expect(trace!.cost).toBeLessThan(50);
    expect(fixture.traceCharge(-1, 0, 6, 6)).toBeNull();
  });

  it('ohne Leiter bleibt der direkte Fallback-Pfad', () => {
    const fixture = makeVectorCombinationFixture(SEED);
    const trace = fixture.traceCharge(0, 6, 6, 6);
    expect(trace).not.toBeNull();
    expect(trace!.path.length).toBeGreaterThan(1);
  });
});

describe('VectorSystem — TTL an der reinen Fixture', () => {
  for (const id of ELEMENTAR_VECTOR_IDS) {
    it(`${id}: lebt bis zur Hälfte und ist im 180-Tick-Fenster vollständig weg`, () => {
      const fixture = makeVectorCombinationFixture(SEED);
      const ttl = VECTOR_LOGIC_SOURCE[id].ttl;
      fixture.deposit(id, 1);
      expect(fixture.ttlAt(id)).toBe(ttl);
      const half = Math.floor(ttl / 2);
      fixture.step(half);
      expect(fixture.intensityAt(id)).toBeGreaterThan(0);
      fixture.step(180 - half);
      expect(fixture.cells().filter(cell => cell.vectorId === id)).toHaveLength(0);
    });
  }
});

describe('VectorSystem — Determinismus an der reinen Fixture', () => {
  it('gleicher Seed und gleiche Tick-Folge ergeben dasselbe Feld', () => {
    const a = makeVectorCombinationFixture(SEED);
    const b = makeVectorCombinationFixture(SEED);
    a.depositAt(1, 1, 'VECTOR_HEAT', 1);
    a.depositAt(8, 10, 'VECTOR_WET', 1);
    b.depositAt(1, 1, 'VECTOR_HEAT', 1);
    b.depositAt(8, 10, 'VECTOR_WET', 1);
    a.step(37);
    b.step(37);
    expect(a.field()).toBe(b.field());
    expect(a.cells()).toEqual(b.cells());
  });

  it('Deposit-Reihenfolge an verschiedenen Zellen bleibt nach Updates gleich', () => {
    const forward = makeVectorCombinationFixture(SEED);
    const reverse = makeVectorCombinationFixture(SEED);
    forward.depositAt(1, 1, 'VECTOR_HEAT', 1);
    forward.depositAt(8, 10, 'VECTOR_WET', 1);
    forward.depositAt(5, 5, 'VECTOR_OIL', 1);
    reverse.depositAt(5, 5, 'VECTOR_OIL', 1);
    reverse.depositAt(8, 10, 'VECTOR_WET', 1);
    reverse.depositAt(1, 1, 'VECTOR_HEAT', 1);
    forward.step(17);
    reverse.step(17);
    expect(forward.field()).toBe(reverse.field());
    expect(forward.cells()).toEqual(reverse.cells());
  });

  it('Trace-Pfad ist für gleiche Seed-/Deposit-Eingabe deterministisch', () => {
    const a = makeVectorCombinationFixture(SEED);
    const b = makeVectorCombinationFixture(SEED);
    a.depositAt(1, 6, 'VECTOR_WET', 1);
    b.depositAt(1, 6, 'VECTOR_WET', 1);
    expect(a.traceCharge(0, 6, 6, 6)).toEqual(b.traceCharge(0, 6, 6, 6));
  });
});
