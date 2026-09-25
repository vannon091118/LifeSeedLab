import { describe, expect, it } from 'vitest';
import { ChangelogCheck } from '../checks/changelog-check.ts';
import { contextFor, initTempRepo, write } from './helpers.ts';

/**
 * ChangelogCheck — der umgebaute Check (spawnSync über den GitHelfer statt execSync-Shell).
 *
 * Die drei Pfade der neuen Implementierung werden über echte Temp-Repos gefahren:
 * - CHG000 (info):    Exit 1  ⇒ Differenz zum HEAD ⇒ Eintrag vorhanden (Erfolgsfall).
 * - CHG001 (error):   Exit 0  ⇒ keine Differenz ⇒ kein Eintrag.
 * - CHG002 (error):   Status weder 0 noch 1 ⇒ echter Prüffehler mit Git-stderr in der Meldung.
 *
 * Ein unborn Branch wird vor dem HEAD-Diff bewusst separat behandelt: Dort ist ein vorhandenes
 * untracked CHANGELOG ein gültiger Preflight-Eintrag, ein fehlendes File bleibt CHG001.
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

  it('bewertet im Pre-Commit nur den Index und ignoriert einen ungestagten Worktree-Eintrag', () => {
    const { dir, git, config } = initTempRepo('changelog-index-only');
    write(git.root, 'CHANGELOG.md', '# Log\n');
    git.git(['add', 'CHANGELOG.md']);
    git.git(['commit', '-m', 'init', '--no-gpg-sign']);
    write(dir, 'src/thing.ts', 'export const thing = 1;\n');
    git.git(['add', 'src/thing.ts']);
    write(git.root, 'CHANGELOG.md', '# Log\nnur ungestaged\n');

    const findings = new ChangelogCheck().run(contextFor(git, config, { phase: 'pre-commit', quiet: true }));

    expect(findings[0]?.code).toBe('CHG001');
    expect(findings[0]?.severity).toBe('error');
  });

  it('akzeptiert im Pre-Commit einen gestagten Eintrag, auch wenn der Worktree wieder HEAD entspricht', () => {
    const { dir, git, config } = initTempRepo('changelog-staged-reverted');
    write(git.root, 'CHANGELOG.md', '# Log\n');
    git.git(['add', 'CHANGELOG.md']);
    git.git(['commit', '-m', 'init', '--no-gpg-sign']);
    write(git.root, 'CHANGELOG.md', '# Log\n\n- [Gate] Im Index.\n');
    git.git(['add', 'CHANGELOG.md']);
    write(dir, 'CHANGELOG.md', '# Log\n');

    const findings = new ChangelogCheck().run(contextFor(git, config, { phase: 'pre-commit', quiet: true }));

    expect(findings[0]?.code).toBe('CHG000');
    expect(findings[0]?.severity).toBe('info');
  });

  it('behandelt ein Repo ohne Commit und ohne CHANGELOG als normalen fehlenden Eintrag', () => {
    const { git, config } = initTempRepo('changelog-no-head');

    const findings = new ChangelogCheck().run(contextFor(git, config, { quiet: true }));

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('CHG001');
    expect(findings[0].severity).toBe('error');
  });

  it('akzeptiert ein untracked CHANGELOG auf einem unborn Branch', () => {
    const { git, config } = initTempRepo('changelog-unborn-entry');
    write(git.root, 'CHANGELOG.md', '# Log\n\n- [Gate] unborn branch\n');

    const findings = new ChangelogCheck().run(contextFor(git, config, { quiet: true }));

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('CHG000');
    expect(findings[0].severity).toBe('info');
  });
});

