import { finding } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * ChangelogCheck: stellt sicher, dass CHANGELOG.md im tatsächlich zu commitenden Index geändert
 * wurde. Im Preflight darf der Arbeitsbaum den Einstieg vorbereiten; im Pre-Commit zählt nur der
 * Index, sonst würde ein ungestagter Worktree-Eintrag einen Commit ohne Changelog freigeben.
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
    // Auf einem unborn Branch gibt es kein HEAD, gegen das `git diff HEAD`
    // laufen könnte. Eine vorhandene, untracked CHANGELOG-Datei ist dort
    // genau der gültige Preflight-Eintrag; ein fehlender Dateistand bleibt rot.
    if (ctx.phase === 'preflight' && !ctx.git.hasCommits()) {
      const changed = ctx.changedFiles.includes('CHANGELOG.md') || ctx.stagedFiles.includes('CHANGELOG.md');
      return [
        finding(
          this.id,
          changed ? 'CHG000' : 'CHG001',
          changed
            ? 'CHANGELOG.md wurde geändert – Eintrag vorhanden.'
            : 'CHANGELOG.md wurde nicht geändert. Bitte vor dem Commit einen Eintrag hinzufügen.',
          { severity: changed ? 'info' : 'error', file: 'CHANGELOG.md' },
        ),
      ];
    }

    const diff = ctx.phase === 'pre-commit'
      ? ['diff', '--cached', '--exit-code', '--', 'CHANGELOG.md']
      : ['diff', '--exit-code', 'HEAD', '--', 'CHANGELOG.md'];
    const result = ctx.git.git(diff, { allowFailure: true });

    // Exit 0 ⇒ keine relevante Differenz ⇒ kein Eintrag. Exit 1 ⇒ Differenz ⇒ gut.
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
