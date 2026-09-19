import { CommandCheck } from './command-check.ts';
import { finding } from './check.ts';
import type { CheckContext, Finding } from './check.ts';
import type { CommandSpec } from '../config.ts';

/**
 * Testsuite: muss grün sein. Aus der Zusammenfassung werden die Zahlen gelesen, damit das Gate
 * die tatsächliche Testlage weiterreichen kann (README-Status, Push-Bericht).
 */
export class TestCheck extends CommandCheck {
  constructor() {
    super('tests', 'Test-Suite (vitest run)', 'tests');
  }

  protected onSuccess(_ctx: CheckContext, spec: CommandSpec): Finding[] {
    const findings = super.onSuccess(_ctx, spec);
    const tests = /Tests\s+(\d+)\s+passed/.exec(this.lastOutput);
    const files = /Test Files\s+(\d+)\s+passed/.exec(this.lastOutput);
    if (tests) {
      findings.push(
        finding(
          this.id,
          'TST100',
          `${tests[1]} Tests grün${files ? ` in ${files[1]} Testdateien` : ''}`,
          { severity: 'info' },
        ),
      );
    }
    return findings;
  }
}
