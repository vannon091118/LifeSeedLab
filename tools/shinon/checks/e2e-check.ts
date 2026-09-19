import { CommandCheck } from './command-check.ts';
import { finding } from './check.ts';
import type { CheckContext, Finding } from './check.ts';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * E2E-Stufe (Playwright) — Stufe 2 des verbindlichen Sprint-Abschlusses (AGENTS.md).
 *
 * Anders als `vitest` ist eine E2E-Suite nicht nur rot oder grün: sie kann auch **gar nicht
 * existieren**. Genau dieser Fall lag vor (`tests/` fehlte, `playwright test --list` meldete
 * „Total: 0 tests in 0 files"). Ein leeres Ergebnis würde `playwright test` als Fehler melden,
 * aber die Ursache wäre unklar. Diese Prüfung trennt deshalb drei Zustände:
 *
 *   - kein Spezifikationsverzeichnis  → **Fehler** (der Auftrag „E2E testen" ist nicht erfüllbar)
 *   - vorhanden, aber 0 Tests         → **Fehler** (leere Suite ist kein grünes Gate)
 *   - Tests laufen und scheitern      → Fehler aus der Kommando-Prüfung
 *   - Tests laufen und bestehen       → Befund mit den Zahlen
 */
export class E2eCheck extends CommandCheck {
  constructor() {
    super('e2e', 'E2E-Suite (playwright test)', 'e2e');
  }

  protected onSuccess(ctx: CheckContext, spec: import('../config.ts').CommandSpec): Finding[] {
    const dir = path.join(ctx.config.repository.root, 'tests');
    if (!existsSync(dir)) {
      return [
        finding(this.id, 'E2E001', `E2E-Suite fehlt: kein Verzeichnis "tests" unter ${dir}`, {
          severity: 'error',
        }),
      ];
    }

    const findings = super.onSuccess(ctx, spec);
    const total = /Total:\s*0 tests/.test(this.lastOutput);
    if (total) {
      return [
        finding(this.id, 'E2E002', 'E2E-Suite ist leer (0 Tests) — eine leere Suite ist kein grünes Gate', {
          severity: 'error',
        }),
      ];
    }

    const passed = /(\d+)\s+passed/.exec(this.lastOutput);
    if (passed) {
      findings.push(finding(this.id, 'E2E100', `${passed[1]} E2E-Tests grün`, { severity: 'info' }));
    }
    return findings;
  }
}
