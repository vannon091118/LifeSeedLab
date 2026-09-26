import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MergeExecutor, formatWorkflowResult } from '../merge-helfer.ts';
import { PrHelfer, formatPrResult } from '../pr-helfer.ts';
import { GitHubHelfer } from '../github-helfer.ts';
import { commitFixture, gitIt, initTempRepo, stateFor, write } from './helpers.ts';
import type { CommandResult } from '../runner.ts';

/**
 * Workflow-Helfer — die zwei Aktions-Module, an denen ein Gate-Fehler nicht im eigenen
 * Branch landet: `MergeExecutor` (merge/rebase) und `PrHelfer` (gh pr create/merge).
 *
 * Gemessen wird, was ohne diese Module gar nicht existiert: die Ablehnungswege (Ziel ist
 * aktuell, Baum schmutzig, Gate schließt, PR-Body ohne Pflichtabschnitt) und die
 * Zurücknahme (`merge --abort` nach fehlgeschlagenem Gate). Erfolgswege mit vollständigem
 * Gate sind hier auf `only=['merge-message']` reduziert — die übrigen Stufen laufen im
 * CLI/CLI-Argumente-Test und im echten Vorgang.
 */

function wideBody(): string {
  return Array.from({ length: 65 }, (_, index) => `Beleg${index + 1}`).join(' ');
}

/** `gh`-Runner aus einem Disposition — der Test ruft GitHub nie real auf. */
function fakeGh(dispatch: (args: string[]) => CommandResult): GitHubHelfer {
  return new GitHubHelfer((args) => dispatch(args));
}

function ghFake(): GitHubHelfer {
  return fakeGh((args) => {
    if (args[0] === '--version') return { ok: true, status: 0, stdout: 'gh 2.x', stderr: '', label: 'gh --version' };
    if (args[0] === 'pr' && args[1] === 'view' && /^\d+$/.test(args[2] ?? '')) {
      return { ok: true, status: 0, stdout: JSON.stringify({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' }), stderr: '', label: 'gh pr view' };
    }
    if (args[0] === 'pr') {
      return { ok: true, status: 0, stdout: 'https://github.com/o/r/pull/42\n', stderr: '', label: 'gh pr' };
    }
    return { ok: false, status: 1, stdout: '', stderr: 'unbekannter Aufruf', label: args.join(' ') };
  });
}

describe('Workflow-Helfer (Merge- und PR-Module)', () => {
  it('Merge: verweigert Ziel=aktueller Branch, schmutzigen Baum und deaktivierten Workflow', async () => {
    const { dir, git, config } = initTempRepo('wf-merge-refuse');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);
    const executor = new MergeExecutor(git, config, stateFor(git));

    const self = await executor.merge({ base: 'main' });
    expect(self.action).toBe('aborted');
    expect(self.ok).toBe(false);
    expect(self.message).toContain('nichts zu mergen');

    const cfgDisabled = { ...config, workflow: { ...config.workflow, merge: { ...config.workflow.merge, enabled: false } } };
    const executorDisabled = new MergeExecutor(git, cfgDisabled, stateFor(git));
    const disabled = await executorDisabled.merge();
    expect(disabled.action).toBe('disabled');
    expect(disabled.message).toContain('deaktiviert');

    write(dir, 'schmutzig.txt', 'x\n');
    const dirty = await executor.merge({ base: 'feature' });
    expect(dirty.action).toBe('aborted');
    expect(dirty.message).toContain('nicht sauber');
  });

  it('Merge: Gate-Scheitern nimmt den Merge zurück (MERGE_HEAD verschwindet)', async () => {
    const { dir, git, config } = initTempRepo('wf-merge-abort');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);
    gitIt(dir, ['checkout', '-b', 'feature']);
    write(dir, 'feature.txt', 'feature\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'feature arbeit']).ok).toBe(true);
    gitIt(dir, ['checkout', 'main']);
    write(dir, 'main.txt', 'main\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'main arbeit']).ok).toBe(true);

    const executor = new MergeExecutor(git, config, stateFor(git));
    // 0-Wort-Body gegen MSG010: der Merge steht im Index, das Gate schließt, und der
    // Executor muss `merge --abort` selbst ausführen — kein liegengebliebener Merge.
    const rejected = await executor.merge({
      branch: 'feature',
      message: "Merge branch 'feature'",
      only: ['merge-message'],
      quiet: true,
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.message).toContain('zurückgenommen');
    expect(rejected.report?.passed).toBe(false);
    expect(gitIt(dir, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).ok).toBe(false);

    const report = rejected.report;
    expect(report, 'Gate-Bericht muss zurückkommen').not.toBeNull();
  });

  it('Merge: grünes Gate lässt den komponierten Merge-Commit durch', async () => {
    const { dir, git, config } = initTempRepo('wf-merge-ok');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);
    gitIt(dir, ['checkout', '-b', 'feature']);
    write(dir, 'feature.txt', 'feature\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'feature arbeit']).ok).toBe(true);
    gitIt(dir, ['checkout', 'main']);
    write(dir, 'main.txt', 'main\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'main arbeit']).ok).toBe(true);

    const executor = new MergeExecutor(git, config, stateFor(git));
    const done = await executor.merge({
      branch: 'feature',
      message: `Merge branch 'feature'\n\n${wideBody()}`,
      only: ['merge-message'],
      quiet: true,
    });
    expect(done.ok, `Merge:\n${formatWorkflowResult(done)}`).toBe(true);
    expect(done.report?.passed).toBe(true);
    expect(gitIt(dir, ['log', '--merges', '--oneline']).stdout.trim()).not.toBe('');
  });

  it('abortMerge meldet, wenn kein Merge läuft, und kein Rebase auf schmutzigem Baum', async () => {
    const { dir, git, config } = initTempRepo('wf-rebase-refuse');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);
    const executor = new MergeExecutor(git, config, stateFor(git));

    const none = executor.abortMerge();
    expect(none.ok).toBe(false);
    expect(none.message).toContain('Kein laufender Merge');

    write(dir, 'schmutzig.txt', 'x\n');
    const rebase = await executor.rebase({ noGate: true });
    expect(rebase.action).toBe('aborted');
    expect(rebase.message).toContain('nicht sauber');
  });

  it('Rebase: Probelauf ohne Gate-Flag stoppt vor dem git-Aufruf', async () => {
    const { dir, git, config } = initTempRepo('wf-rebase-dry');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);
    const executor = new MergeExecutor(git, config, stateFor(git));
    const dry = await executor.rebase({ dryRun: true, noGate: true });
    expect(dry.ok).toBe(true);
    expect(dry.message).toContain('Probelauf');
  });

  it('preparedMergeMessage liest .git/MERGE_MSG und entfernt Kommentarzeilen', () => {
    const { dir, git, config } = initTempRepo('wf-merge-msg');
    const executor = new MergeExecutor(git, config, stateFor(git));
    expect(executor.preparedMergeMessage()).toBeUndefined();
    fs.writeFileSync(
      path.join(dir, '.git', 'MERGE_MSG'),
      "# Conflicts:\n#   x\nMerge branch 'feature'\n# Ende\n",
      'utf8',
    );
    expect(executor.preparedMergeMessage()).toBe("Merge branch 'feature'");
  });

  it('PR-Body: Pflichtüberschriften aus dem Template sind Fehler, keine Hinweise', () => {
    const { git, config } = initTempRepo('wf-pr-body');
    const pr = new PrHelfer(git, config, fakeGh(() => ({ ok: false, status: 1, stdout: '', stderr: '', label: '' })));

    const full = pr.buildBody('## Was\nx\n## Warum\ny\n## Verifikation\nz\n## Grenzen\nw');
    expect(full.ok).toBe(true);

    const missing = pr.buildBody('## Was\nx\n## Warum\ny\n## Verifikation\nz');
    expect(missing.ok).toBe(false);
    expect(missing.missing).toEqual(['Grenzen']);
    expect(missing.message).toContain('Squash-Commit');

    const empty = pr.buildBody(undefined);
    expect(empty.ok).toBe(false);
    expect(empty.missing).toEqual(['Was', 'Warum', 'Verifikation', 'Grenzen']);
  });

  it('PR-Create: deaktivierter Workflow und fehlender Body scheitern vor dem gh-Aufruf', async () => {
    const { dir, git, config } = initTempRepo('wf-pr-create');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'feat(x): Basis mit Körper', '-m', wideBody()]).ok).toBe(true);
    const calls: string[][] = [];
    const gh = fakeGh((args) => {
      calls.push(args);
      return { ok: true, status: 0, stdout: 'https://github.com/o/r/pull/42\n', stderr: '', label: args.join(' ') };
    });
    const pr = new PrHelfer(git, config, gh);

    const prDisabled = new PrHelfer(
      git,
      { ...config, workflow: { ...config.workflow, pr: { ...config.workflow.pr, enabled: false } } },
      gh,
    );
    const disabled = await prDisabled.create();
    expect(disabled.ok).toBe(false);
    expect(disabled.message).toContain('deaktiviert');

    const noBody = await pr.create({ dryRun: true });
    expect(noBody.ok).toBe(false);
    expect(noBody.steps.map((step) => step.label)).toContain('PR-Body');
    expect(calls).toHaveLength(0);

    const ok = await pr.create({ dryRun: true, body: '## Was\nx\n## Warum\ny\n## Verifikation\nz\n## Grenzen\nw' });
    expect(ok.ok, `Create:\n${formatPrResult(ok)}`).toBe(true);
  });

  it('PR-Merge: roter Mergeable-Status blockiert, grüner Status liefert den Aufruf', async () => {
    const { dir, git, config } = initTempRepo('wf-pr-merge');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);

    const dirty = fakeGh((args) => {
      if (args[0] === '--version') return { ok: true, status: 0, stdout: 'gh', stderr: '', label: 'gh --version' };
      if (args[0] === 'pr' && args[1] === 'view' && /^\d+$/.test(args[2] ?? '')) {
        return { ok: true, status: 0, stdout: JSON.stringify({ mergeable: 'MERGEABLE', mergeStateStatus: 'DIRTY' }), stderr: '', label: 'gh pr view' };
      }
      return { ok: false, status: 1, stdout: '', stderr: 'kein Aufruf erwartet', label: args.join(' ') };
    });
    const prDirty = new PrHelfer(git, config, dirty);
    const blocked = await prDirty.merge({ number: '42', dryRun: true });
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain('nicht auf einem sauberen Stand');

    const pr = new PrHelfer(git, config, ghFake());
    const dry = await pr.merge({ number: '42', dryRun: true });
    expect(dry.ok, `Merge:\n${formatPrResult(dry)}`).toBe(true);
    expect(dry.steps.map((step) => step.label)).toContain('gh pr merge');
  });

  it('openPrNumber liefert die Nummer aus der pr-view-Ausgabe, sonst null', () => {
    const { dir, git, config } = initTempRepo('wf-pr-number');
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);

    const pr = new PrHelfer(git, config, fakeGh((args) => {
      if (args[0] === 'pr') return { ok: true, status: 0, stdout: 'https://github.com/o/r/pull/42\n', stderr: '', label: args.join(' ') };
      return { ok: false, status: 1, stdout: '', stderr: '', label: args.join(' ') };
    }));
    expect(pr.openPrNumber()).toBe('42');

    const broken = new PrHelfer(git, config, fakeGh(() => ({ ok: false, status: 1, stdout: '', stderr: '', label: '' })));
    expect(broken.openPrNumber()).toBeNull();
  });
});
