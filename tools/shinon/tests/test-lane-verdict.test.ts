// Vertrag: das Voll-Lauf-Budget bewertet LAST-UNABHÄNGIG. Die gemessene Zeit ist
// Information; die Schwelle liegt auf deterministischen Größen (ms/Test-Norm,
// Suite-Größe) plus Wiederholungs-Marker für anhaltende Langsamkeit. Dieselben
// Eingaben müssen auf jeder Maschine denselben Spruch liefern.
import { describe, it, expect } from 'vitest';
import {
  FULL_BUDGET_MS,
  MS_PER_TEST_BUDGET,
  TEST_BUDGET,
  fullBudgetVerdict,
} from '../../../scripts/test-lane-verdict.mjs';

describe('test-lane VOLL — deterministische Budget-Schwelle', () => {
  it('gesunde Suite: keine Zeit-Verstoß, ms/Test als Information', () => {
    // Kalibrierpunkt: 8.4 s / 682 Tests = 12.3 ms/Test (ungelastet gemessen).
    const v = fullBudgetVerdict({ ms: 8_400, tests: 682, prevState: null });
    expect(v.timeOver).toBe(false);
    expect(v.perTest).toBeCloseTo(12.3, 1);
    expect(v.normalizedBudget).toBe(682 * MS_PER_TEST_BUDGET);
  });

  it('Last-Spitze (Erstbefund): überschritten, aber KEIN Alarm', () => {
    // Echter Messwert unter Parallellast: 34.6 s / 682.
    const v = fullBudgetVerdict({ ms: 34_600, tests: 682, prevState: null });
    expect(v.timeOver).toBe(true);
    expect(v.repeatOver).toBe(false);
  });

  it('anhaltende Langsamkeit: zweiter Überschreitung bei gleicher Suite = Alarm', () => {
    const prev = { over: true, tests: 682 };
    const v = fullBudgetVerdict({ ms: 34_600, tests: 682, prevState: prev });
    expect(v.timeOver).toBe(true);
    expect(v.repeatOver).toBe(true);
  });

  it('Suite gewachsen: Vorher-Befund ist NICHT vergleichbar → kein Fehlalarm', () => {
    const prev = { over: true, tests: 650 };
    const v = fullBudgetVerdict({ ms: 34_600, tests: 682, prevState: prev });
    expect(v.repeatOver).toBe(false);
  });

  it('kleine Suite: die Gnadenfrist FULL_BUDGET_MS gilt als Untergrenze', () => {
    const v = fullBudgetVerdict({ ms: 400, tests: 10, prevState: null });
    expect(v.normalizedBudget).toBe(FULL_BUDGET_MS);
    expect(v.timeOver).toBe(false);
  });

  it('Struktur-Schwelle: Suite über TEST_BUDGET ist maschinenunabhängig ein Befund', () => {
    const v = fullBudgetVerdict({ ms: 5_000, tests: TEST_BUDGET + 1, prevState: null });
    expect(v.sizeOver).toBe(true);
    expect(v.timeOver).toBe(false); // Zeit war in Ordnung — der Befund ist rein strukturell
  });

  it('keine Testzahl ermittelbar → KEIN Urteil über Zeit (keine Last-Fehlalarme aus fehlenden Daten)', () => {
    const v = fullBudgetVerdict({ ms: 60_000, tests: -1, prevState: null });
    expect(v.timeOver).toBe(false);
    expect(v.perTest).toBe(-1);
  });
});
