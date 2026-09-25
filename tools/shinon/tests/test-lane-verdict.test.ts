// Vertrag: Das Voll-Lauf-Budget bewertet die Norm deterministisch. Die gemessene Zeit
// bleibt Information; der Wiederholungs-Marker gilt nur bei gleicher Suite, gleicher
// Git-Revision und ruhigem Lastband. Last/Unknown liefert keinen Persistentitäts-Befund.
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  FULL_BUDGET_MS,
  MS_PER_TEST_BUDGET,
  STATE_VERSION,
  TEST_BUDGET,
  fullBudgetVerdict,
  ladePrevState,
  loadBand,
} from '../../../scripts/test-lane-verdict.mjs';
import { gitIt, tempDir, write } from './helpers.ts';

const LANE = fileURLToPath(new URL('../../../scripts/test-lane.mjs', import.meta.url));

describe('test-lane VOLL — deterministische Budget-Schwelle', () => {
  it('hält die Schwellen unverändert und bewertet eine gesunde Suite', () => {
    expect(FULL_BUDGET_MS).toBe(10_000);
    expect(MS_PER_TEST_BUDGET).toBe(25);
    // Kalibrierpunkt: 8.4 s / 682 Tests = 12.3 ms/Test (ungelastet gemessen).
    const v = fullBudgetVerdict({ ms: 8_400, tests: 682, prevState: null, revision: 'rev-a', load: 'quiet' });
    expect(v.timeOver).toBe(false);
    expect(v.perTest).toBeCloseTo(12.3, 1);
    expect(v.normalizedBudget).toBe(682 * MS_PER_TEST_BUDGET);
  });

  it('Last-Spitze (Erstbefund): überschritten, aber KEIN Alarm', () => {
    // Echter Messwert unter Parallellast: 34.6 s / 682.
    const v = fullBudgetVerdict({ ms: 34_600, tests: 682, prevState: null, revision: 'rev-a', load: 'busy' });
    expect(v.timeOver).toBe(true);
    expect(v.repeatOver).toBe(false);
  });

  it('anhaltende Langsamkeit: gleiche Revision und ruhige Last = Alarm', () => {
    const prev = { over: true, tests: 682, revision: 'rev-a', load: 'quiet' };
    const v = fullBudgetVerdict({ ms: 34_600, tests: 682, prevState: prev, revision: 'rev-a', load: 'quiet' });
    expect(v.timeOver).toBe(true);
    expect(v.repeatComparable).toBe(true);
    expect(v.repeatOver).toBe(true);
  });

  it('andere Revision oder Suite: Vorher-Befund ist nicht vergleichbar', () => {
    const previous = { over: true, tests: 682, revision: 'rev-a', load: 'quiet' };
    const changedRevision = fullBudgetVerdict({
      ms: 34_600, tests: 682, prevState: previous, revision: 'rev-b', load: 'quiet',
    });
    const changedSuite = fullBudgetVerdict({
      ms: 34_600, tests: 683, prevState: previous, revision: 'rev-a', load: 'quiet',
    });
    expect(changedRevision.repeatComparable).toBe(false);
    expect(changedRevision.repeatOver).toBe(false);
    expect(changedSuite.repeatComparable).toBe(false);
    expect(changedSuite.repeatOver).toBe(false);
  });

  it('Lastband-Wechsel verhindert den Alarm; busy bleibt selbst bei Wiederholung nur Info', () => {
    const previous = { over: true, tests: 682, revision: 'rev-a', load: 'quiet' };
    const changedLoad = fullBudgetVerdict({
      ms: 34_600, tests: 682, prevState: previous, revision: 'rev-a', load: 'busy',
    });
    const repeatedBusy = fullBudgetVerdict({
      ms: 34_600, tests: 682, prevState: { ...previous, load: 'busy' }, revision: 'rev-a', load: 'busy',
    });
    expect(changedLoad.repeatComparable).toBe(false);
    expect(changedLoad.repeatOver).toBe(false);
    expect(repeatedBusy.repeatComparable).toBe(true);
    expect(repeatedBusy.repeatOver).toBe(false);
  });

  it('unbekannte Last und alter State sind fail-closed nicht wiederholbar', () => {
    const oldState = { over: true, tests: 682 };
    const unknownLoad = fullBudgetVerdict({
      ms: 34_600, tests: 682, prevState: oldState, revision: 'rev-a', load: 'unknown',
    });
    expect(unknownLoad.repeatOver).toBe(false);
    expect(fullBudgetVerdict({ ms: 34_600, tests: 682, prevState: oldState }).repeatOver).toBe(false);
  });

  it('klassifiziert Lastbänder und ignoriert ungültige Messwerte', () => {
    expect(loadBand(0.4, 4)).toBe('quiet');
    expect(loadBand(3, 4)).toBe('busy');
    expect(loadBand(8, 4)).toBe('overloaded');
    expect(loadBand(Number.NaN, 4)).toBe('unknown');
  });

  it('liest nur das versionierte State-Format mit Revision und Lastband', () => {
    const dir = tempDir('test-lane-state-contract');
    const statePath = path.join(dir, 'state.json');
    write(dir, 'state.json', JSON.stringify({
      version: STATE_VERSION, over: true, tests: 718, revision: 'rev-a', load: 'quiet',
    }));
    expect(ladePrevState(statePath)).toEqual({ over: true, tests: 718, revision: 'rev-a', load: 'quiet' });

    write(dir, 'state.json', JSON.stringify({ over: true, tests: 718 }));
    expect(ladePrevState(statePath)).toBeNull();
  });

  it('eskaliert fehlende Related-Tests auch bei Vitest-Exit 1', () => {
    const dir = tempDir('test-lane-no-related');
    expect(gitIt(dir, ['init', '--initial-branch=main']).ok).toBe(true);
    expect(gitIt(dir, ['config', 'user.name', 'Lane Test']).ok).toBe(true);
    expect(gitIt(dir, ['config', 'user.email', 'lane@test.local']).ok).toBe(true);
    write(dir, 'README.md', '# Lane fixture\n');
    expect(gitIt(dir, ['add', 'README.md']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'init', '--no-gpg-sign']).ok).toBe(true);
    write(dir, 'tools/hooks/pre-commit', '#!/bin/sh\nexit 0\n');
    write(
      dir,
      'node_modules/vitest/vitest.mjs',
      [
        "if (process.argv.includes('related')) {",
        "  console.log('No test files found');",
        '  process.exit(1);',
        '}',
        "console.log(' Test Files  1 passed (1)');",
        "console.log('      Tests  1 passed (1)');",
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [LANE], { cwd: dir, encoding: 'utf8' });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Eskalation auf die Voll-Suite');
    expect(result.stdout).toContain('Test Files  1 passed');
  });

  it('kleine Suite: die Gnadenfrist FULL_BUDGET_MS gilt als Untergrenze', () => {
    const v = fullBudgetVerdict({ ms: 400, tests: 10, prevState: null, revision: 'rev-a', load: 'quiet' });
    expect(v.normalizedBudget).toBe(FULL_BUDGET_MS);
    expect(v.timeOver).toBe(false);
  });

  it('Struktur-Schwelle: Suite über TEST_BUDGET ist maschinenunabhängig ein Befund', () => {
    const v = fullBudgetVerdict({ ms: 5_000, tests: TEST_BUDGET + 1, prevState: null, revision: 'rev-a', load: 'quiet' });
    expect(v.sizeOver).toBe(true);
    expect(v.timeOver).toBe(false); // Zeit war in Ordnung — der Befund ist rein strukturell
  });

  it('keine Testzahl ermittelbar → KEIN Urteil über Zeit (keine Last-Fehlalarme aus fehlenden Daten)', () => {
    const v = fullBudgetVerdict({ ms: 60_000, tests: -1, prevState: null, revision: 'rev-a', load: 'quiet' });
    expect(v.timeOver).toBe(false);
    expect(v.perTest).toBe(-1);
  });
});
