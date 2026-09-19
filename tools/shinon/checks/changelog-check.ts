import { finding } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * ChangelogCheck: stellt sicher, dass CHANGELOG.md gegenüber dem HEAD geändert wurde.
 * Wird im Gate verwendet, um sicherzustellen, dass vor jedem Commit ein Changelog-Eintrag
 * hinzugefügt wird.
 *
 * Ausführung über den GitHelfer (spawnSync, keine Shell) statt `execSync`: execSync baut pro
 * Lauf eine Shell auf und warf den Exit-Code 1 als Exception — gemessen 16.09.2026 costete das
 * ~120 ms je Lauf (Shell + Throw), der GitHelfer-Lauf liegt bei ~75 ms. `allowFailure: true`
 * lässt den Exit-Code 1 („diff gefunden“) als normales Resultat durch, ohne try/catch.
 */
export class ChangelogCheck implements ShinonCheck {
  readonly id = 'changelog';
  readonly title = 'Changelog‑Eintrag erforderlich';

  run(ctx: CheckContext): Finding[] {
    const result = ctx.git.git(['diff', '--exit-code', 'HEAD', '--', 'CHANGELOG.md'], {
      allowFailure: true,
    });

    // Exit 0 ⇒ keine Differenz zum HEAD ⇒ kein Eintrag. Exit 1 ⇒ Differenz ⇒ gut.
    // status === 1 ist hier der Erfolgsfall, alles andere (null, >1) ist ein echter Fehler.
    if (result.status === 1) {
      return [
        finding(
          this.id,
          'CHG000',
          'CHANGELOG.md wurde geändert – Eintrag vorhanden.',
          { severity: 'info', file: 'CHANGELOG.md' },
        ),
      ];
    }
    if (result.status === 0) {
      return [
        finding(
          this.id,
          'CHG001',
          'CHANGELOG.md wurde nicht geändert. Bitte vor dem Commit einen Eintrag hinzufügen.',
          { severity: 'error', file: 'CHANGELOG.md' },
        ),
      ];
    }
    // status null (Prozess fehlgeschlagen) oder >1 (Git-interner Fehler).
    return [
      finding(
        this.id,
        'CHG002',
        `Fehler beim Prüfen des Changelogs: ${result.stderr || result.label}`,
        { severity: 'error' },
      ),
    ];
  }
}
