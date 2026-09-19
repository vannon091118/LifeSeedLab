import { describe, expect, it } from 'vitest';
import { ChangelogCheck } from '../checks/changelog-check.ts';
import { contextFor, initTempRepo, write } from './helpers.ts';

/**
 * ChangelogCheck — der umgebaute Check (spawnSync über den GitHelfer statt execSync-Shell).
 *
 * Die drei Pfade der neuen Implementierung werden über echte Temp-Repos gefahren:
 * - CHG000 (info):    Exit 1  ⇒ Differenz zum HEAD ⇒ Eintrag vorhanden (Erfolgsfall).
 * - CHG001 (error):   Exit 0  ⇒ keine Differenz ⇒ kein Eintrag.
 * - CHG002 (error):   Status weder 0 noch 1 (z. B. Exit 128 in einem Repo ohne Commit —
 *   „bad revision 'HEAD'“) ⇒ echter Prüffehler mit Git-stderr in der Meldung.
 *
 * Genau der CHG002-Pfad ist der Grund für den Umbau: die alte execSync-Variante hätte die
 * Exception mit err.status !== 1 stillschweigend als "Fehler" gemeldet — jetzt ist er
 * explizit getestet, damit kein Refactor ihn wieder einrissen lässt.
 */
describe('Changelog-Prüfung', () => {
  it('meldet eine Änderung an CHANGELOG.md als Erfolgsfall (CHG000, info)', () => {
    const { git, config } = initTempRepo('changelog-changed');
    write(git.root, 'CHANGELOG.md', '# Log\n');
    git.git(['add', 'CHANGELOG.md']);
    git.git(['commit', '-m', 'init', '--no-gpg-sign']);
    // Nach dem Commit geaendert => Differenz zum HEAD.
    write(git.root, 'CHANGELOG.md', '# Log\nneu\n');

    const findings = new ChangelogCheck().run(contextFor(git, config, { quiet: true }));

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('CHG000');
    expect(findings[0].severity).toBe('info');
  });

  it('fordert einen Eintrag, wenn CHANGELOG.md gegenüber dem HEAD unverändert ist (CHG001, error)', () => {
    const { git, config } = initTempRepo('changelog-unchanged');
    write(git.root, 'CHANGELOG.md', '# Log\n');
    git.git(['add', 'CHANGELOG.md']);
    git.git(['commit', '-m', 'init', '--no-gpg-sign']);

    const findings = new ChangelogCheck().run(contextFor(git, config, { quiet: true }));

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('CHG001');
    expect(findings[0].severity).toBe('error');
  });

  it('liefert CHG002 (error) in einem Repo ohne Commit — der Fehlerpfad des Umbaus', () => {
    // Frisches Repo ohne jeden Commit: `git diff HEAD` endet mit Exit 128
    // ("bad revision 'HEAD'") — weder 0 noch 1, also der CHG002-Pfad.
    const { git, config } = initTempRepo('changelog-no-head');

    const findings = new ChangelogCheck().run(contextFor(git, config, { quiet: true }));

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('CHG002');
    expect(findings[0].severity).toBe('error');
    // Der Git-Fehlertext muss in der Meldung ankommen (Diagnose statt stiller 128).
    expect(findings[0].message).toContain('bad revision');
  });
});

