import { describe, expect, it } from 'vitest';
import { ShinonGate, formatGateReport, snapshotOf } from '../gate.ts';
import { finding } from '../checks/check.ts';
import type { Finding, ShinonCheck } from '../checks/check.ts';
import { contextFor, initTempRepo } from './helpers.ts';

function check(id: string, findings: Finding[], expensive = false): ShinonCheck {
  return { id, title: `Prüfung ${id}`, expensive, run: () => findings };
}

describe('ShinonGate', () => {
  it('lehnt eine ungültige Phase ab, bevor Repository-Zustand gelesen wird', () => {
    const { git, config } = initTempRepo('gate-invalid-phase');
    expect(() => contextFor(git, config, { phase: 'not-a-phase' as never })).toThrow('Ungültige Gate-Phase');
  });

  it('sammelt Befunde aller Prüfklassen und öffnet das Gate bei grüner Lage', async () => {
    const { git, config } = initTempRepo('gate-open');
    const gate = new ShinonGate([
      check('a', [finding('a', 'A1', 'alles gut', { severity: 'info' })]),
      check('b', [finding('b', 'B1', 'Hinweis', { severity: 'info' })]),
    ]);

    const report = await gate.run(contextFor(git, config, { quiet: true }));

    expect(report.passed).toBe(true);
    expect(report.outcomes).toHaveLength(2);
    expect(report.findings).toHaveLength(2);
    expect(gate.list().map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('schließt das Gate bei Fehlern und überspringt teure Prüfungen (Fail-Fast)', async () => {
    const { git, config } = initTempRepo('gate-fail');
    let expensiveRan = false;
    const expensive: ShinonCheck = {
      id: 'teuer',
      title: 'teure Prüfung',
      expensive: true,
      run: () => {
        expensiveRan = true;
        return [];
      },
    };

    const report = await new ShinonGate([check('billig', [finding('billig', 'C1', 'rot')]), expensive]).run(
      contextFor(git, config, { quiet: true }),
    );

    expect(report.passed).toBe(false);
    expect(expensiveRan).toBe(false);
    expect(report.outcomes[1]?.skipped).toBe(true);
  });

  it('führt teure Prüfungen aus, wenn die billigen grün sind', async () => {
    const { git, config } = initTempRepo('gate-expensive');
    let expensiveRan = false;
    const expensive: ShinonCheck = {
      id: 'teuer',
      title: 'teure Prüfung',
      expensive: true,
      run: () => {
        expensiveRan = true;
        return [finding('teuer', 'D1', 'durchgelaufen', { severity: 'info' })];
      },
    };

    const report = await new ShinonGate([check('billig', []), expensive]).run(
      contextFor(git, config, { quiet: true }),
    );

    expect(expensiveRan).toBe(true);
    expect(report.passed).toBe(true);
  });

  it('liefert Bericht und Snapshot für die Zustandsablage', async () => {
    const { git, config } = initTempRepo('gate-report');
    const report = await new ShinonGate([check('billig', [finding('billig', 'E1', 'rot')])]).run(
      contextFor(git, config, { quiet: true }),
    );

    const text = formatGateReport(report, { quiet: true });
    expect(text).toContain('GATE GESCHLOSSEN');
    expect(snapshotOf(report)).toMatchObject({ phase: 'preflight', passed: false, errors: 1 });
    expect(formatGateReport(report, { json: true })).toContain('"passed": false');
  });
});
