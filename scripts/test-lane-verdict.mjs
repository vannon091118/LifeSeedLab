// Deterministische Budget-Bewertung für den Voll-Lauf (ausgelagert aus test-lane.mjs,
// damit der Vertrag testbar ist — tools/shinon/tests/test-lane-verdict.test.ts).
//
// Befund (2026-09-21): die alte Wanduhr-Schwelle (10 s fest) maß die Maschine, nicht die
// Suite — derselbe Lauf: 8,4 s ungelastet, 34,6 s unter Parallellast. Die Zeit ist jetzt
// nur noch INFORMATION; die Schwelle liegt auf deterministischen Größen:
//   1. ms/Test-Norm (MS_PER_TEST_BUDGET): Kalibrierpunkt 8,4 s / 682 Tests ≈ 12,3 ms/Test
//      gesund; die Norm gibt doppelt Kopfluft. Ein Überschreiten ist Information, kein Fehler.
//   2. Wiederholungs-Marker: nur bei gleicher Suite, gleicher Git-Revision und ruhigem
//      Lastband. Busy/overloaded/unknown bleibt eine Messung, aber kein Wiederholungsalarm.
//   3. Struktur-Schwelle (TEST_BUDGET): die Suite-Größe selbst ist maschinenunabhängig;
//      über dem Budget wachsen Verträge anstatt zu reifen — Befund, kein Zeitproblem.
// Ohne ermittelbare Testzahl wird NICHT über Zeit geurteilt (keine Fehlalarme aus
// fehlenden Daten).

import { readFileSync } from 'node:fs';
import { availableParallelism, cpus, loadavg } from 'node:os';

export const FULL_BUDGET_MS = 10_000;
export const MS_PER_TEST_BUDGET = 25;
export const TEST_BUDGET = 1000;
export const STATE_VERSION = 2;

/** Grobband des Load-Averages relativ zur verfügbaren CPU-Zahl. */
export function loadBand(loadAverage, cpuCount) {
  if (!Number.isFinite(loadAverage) || !Number.isFinite(cpuCount) || cpuCount <= 0) return 'unknown';
  const ratio = loadAverage / cpuCount;
  if (ratio < 0.75) return 'quiet';
  if (ratio < 1.5) return 'busy';
  return 'overloaded';
}

/** Aktuelles Lastband; Windows liefert keine belastbare Load Average. */
export function currentLoadBand(platform = process.platform) {
  if (platform === 'win32') return 'unknown';
  const cpuCount = typeof availableParallelism === 'function' ? availableParallelism() : cpus().length;
  return loadBand(loadavg()[0] ?? Number.NaN, cpuCount);
}

/**
 * Urteil über einen Voll-Lauf. `revision` und `load` sind Kontext, keine Schwellenwerte.
 * Der alte State ohne diese Felder bleibt absichtlich nicht vergleichbar.
 */
/**
 * @param {{ ms: number, tests: number, prevState: { over?: boolean, tests?: number, revision?: string | null, load?: string } | null, revision?: string | null, load?: string }} args
 */
export function fullBudgetVerdict({ ms, tests, prevState, revision = null, load = 'unknown' }) {
  const known = tests > 0;
  const normalizedBudget = known ? Math.max(FULL_BUDGET_MS, tests * MS_PER_TEST_BUDGET) : FULL_BUDGET_MS;
  const perTest = known ? ms / tests : -1;
  const timeOver = known && ms > normalizedBudget;
  const sizeOver = tests > TEST_BUDGET;
  const revisionKey = typeof revision === 'string' && revision !== '' ? revision : null;
  const loadKey = typeof load === 'string' ? load : 'unknown';
  const sameSuite = prevState?.tests === tests;
  const sameRevision = revisionKey !== null && prevState?.revision === revisionKey;
  const sameLoad = loadKey !== 'unknown' && prevState?.load === loadKey;
  const repeatComparable = sameSuite && sameRevision && sameLoad;
  // Nur ein wiederholter Überschreitungsbefund auf gleicher Revision und ruhiger
  // Last ist ein belastbarer Persistentitäts-Hinweis. Last/Unknown bleibt Info.
  const repeatOver = timeOver && repeatComparable && prevState?.over === true && loadKey === 'quiet';
  return { timeOver, repeatOver, repeatComparable, sizeOver, perTest, normalizedBudget, revision: revisionKey, load: loadKey };
}

/** Liest den Vorher-Befund (tools/.tmp ist gitignored; ohne Datei = null). */
export function ladePrevState(statePath) {
  try {
    const s = JSON.parse(readFileSync(statePath, 'utf8'));
    if (s?.version !== STATE_VERSION) return null;
    return {
      over: !!s.over,
      tests: Number(s.tests) || -1,
      revision: typeof s.revision === 'string' ? s.revision : null,
      load: typeof s.load === 'string' ? s.load : 'unknown',
    };
  } catch {
    return null;
  }
}
