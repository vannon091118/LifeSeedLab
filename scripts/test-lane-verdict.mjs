// Deterministische Budget-Bewertung für den Voll-Lauf (ausgelagert aus test-lane.mjs,
// damit der Vertrag testbar ist — tools/shinon/tests/test-lane-verdict.test.ts).
//
// Befund (2026-09-21): die alte Wanduhr-Schwelle (10 s fest) maß die Maschine, nicht die
// Suite — derselbe Lauf: 8,4 s ungelastet, 34,6 s unter Parallellast. Die Zeit ist jetzt
// nur noch INFORMATION; die Schwelle liegt auf deterministischen Größen:
//   1. ms/Test-Norm (MS_PER_TEST_BUDGET): Kalibrierpunkt 8,4 s / 682 Tests ≈ 12,3 ms/Test
//      gesund; die Norm gibt doppelt Kopfluft. Ein Überschreiten ist Information, kein Fehler.
//   2. Wiederholungs-Marker: erst wenn AUCH der Vorher-Lauf bei GLEICHER Suite-Größe
//      überschritten, ist Langsamkeit anhaltend — einzelne Last-Spitzen melden nicht.
//   3. Struktur-Schwelle (TEST_BUDGET): die Suite-Größe selbst ist maschinenunabhängig;
//      über dem Budget wachsen Verträge anstatt zu reifen — Befund, kein Zeitproblem.
// Ohne ermittelbare Testzahl wird NICHT über Zeit geurteilt (keine Fehlalarme aus
// fehlenden Daten).

import { readFileSync } from 'node:fs';

export const FULL_BUDGET_MS = 10_000;
export const MS_PER_TEST_BUDGET = 25;
export const TEST_BUDGET = 1000;

/** Urteil über einen Voll-Lauf. prevState = { over, tests } des Vorher-Laufs oder null. */
export function fullBudgetVerdict({ ms, tests, prevState }) {
  const known = tests > 0;
  const normalizedBudget = known ? Math.max(FULL_BUDGET_MS, tests * MS_PER_TEST_BUDGET) : FULL_BUDGET_MS;
  const perTest = known ? ms / tests : -1;
  const timeOver = known && ms > normalizedBudget;
  const repeatOver = timeOver && !!prevState?.over && prevState.tests === tests;
  const sizeOver = tests > TEST_BUDGET;
  return { timeOver, repeatOver, sizeOver, perTest, normalizedBudget };
}

/** Liest den Vorher-Befund (tools/.tmp ist gitignored; ohne Datei = null). */
export function ladePrevState(statePath) {
  try {
    const s = JSON.parse(readFileSync(statePath, 'utf8'));
    return { over: !!s.over, tests: Number(s.tests) || -1 };
  } catch {
    return null;
  }
}
