import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { writeConfigOverride } from '../config.ts';
import { ShinonPipeline } from '../pipeline.ts';
import { gitIt, initTempRepo, stateFor, tempDir, write } from './helpers.ts';

const REAL_HOOK_ENTRY = fileURLToPath(new URL('../hook-entry.mjs', import.meta.url));

function longMessage(subject: string): string {
  return `${subject}\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;
}

function seedRepository(name: string): ReturnType<typeof initTempRepo> {
  const fixture = initTempRepo(name);
  write(fixture.dir, '.gitignore', 'tools/.shinon-state.json\ncommit_msg.txt\n');
  write(fixture.dir, 'README.md', '# Test\n\n<!-- SHINON:STATUS:BEGIN -->\nveraltet\n<!-- SHINON:STATUS:END -->\n');
  write(fixture.dir, 'CHANGELOG.md', '# Changelog\n');
  expect(gitIt(fixture.dir, ['add', '-A']).ok).toBe(true);
  expect(gitIt(fixture.dir, ['commit', '-m', 'init', '--no-gpg-sign']).ok).toBe(true);
  return fixture;
}

describe('ShinonPipeline — echte Commit-Reihenfolge', () => {
  it('stagt mit --all vor dem Preflight, sodass untracked Quellen und Changelog im Index geprüft werden', async () => {
    const { dir, git, config } = seedRepository('pipeline-stage-all');
    write(dir, 'src/new.ts', 'export const value = 1;\n');
    write(dir, 'CHANGELOG.md', '# Changelog\n\n- [Gate] Reihenfolge geprüft.\n');
    const before = git.headHash();
    const state = stateFor(git);
    expect(gitIt(dir, ['status', '--porcelain', '--untracked-files=all']).stdout).toContain('?? src/new.ts');

    const result = await new ShinonPipeline(git, config, state).run({
      prepare: false,
      stage: 'all',
      push: false,
      only: ['untracked-inputs', 'changelog', 'commit-size'],
      message: longMessage('fix(shinon): Staging vor dem Gate erzwingen'),
    });

    expect(result.ok).toBe(true);
    expect(result.commit?.ok).toBe(true);
    expect(git.headHash()).not.toBe(before);
    expect(gitIt(dir, ['status', '--porcelain']).stdout).toBe('');
    expect(gitIt(dir, ['show', '--pretty=', '--name-only', 'HEAD']).stdout).toContain('src/new.ts');
    expect(gitIt(dir, ['show', '--pretty=', '--name-only', 'HEAD']).stdout).toContain('CHANGELOG.md');
  });

  it('weist eine ungültige Check-Auswahl ab, bevor --all den Index verändert', async () => {
    const { dir, git, config } = seedRepository('pipeline-invalid-selection');
    write(dir, 'src/pending.ts', 'export const pending = true;\n');
    const before = gitIt(dir, ['status', '--porcelain', '--untracked-files=all']).stdout;

    await expect(new ShinonPipeline(git, config, stateFor(git)).run({
      prepare: false,
      stage: 'all',
      only: ['does-not-exist'],
    })).rejects.toThrow('Unbekannte Check-ID');

    expect(gitIt(dir, ['status', '--porcelain', '--untracked-files=all']).stdout).toBe(before);
    expect(before).toContain('?? src/pending.ts');
  });

  it('blockiert --all bei 26 Dateien auch dann, wenn der anfängliche Index leer war', async () => {
    const { dir, git, config } = seedRepository('pipeline-too-large');
    for (let index = 0; index < 26; index += 1) {
      write(dir, `src/file-${index}.ts`, `export const value${index} = ${index};\n`);
    }
    const before = git.headHash();

    const result = await new ShinonPipeline(git, config, stateFor(git)).run({
      prepare: false,
      stage: 'all',
      push: false,
      only: ['commit-size'],
      message: longMessage('fix(shinon): Slice-Grenze am echten Index erzwingen'),
    });

    expect(result.ok).toBe(false);
    expect(result.report?.findings.some((item) => item.code === 'CSZ001')).toBe(true);
    expect(git.headHash()).toBe(before);
    expect(gitIt(dir, ['log', '--oneline']).stdout.trim().split('\n')).toHaveLength(1);
  });

  it('unterdrückt den echten post-commit Push bei --no-push', async () => {
    const { dir, git, config } = seedRepository('pipeline-no-push');
    const hook = write(
      dir,
      'tools/hooks/post-commit',
      `#!/bin/sh\nexec node ${JSON.stringify(REAL_HOOK_ENTRY)} push --auto --quiet\n`,
    );
    fs.chmodSync(hook, 0o755);
    expect(gitIt(dir, ['add', 'tools/hooks/post-commit']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'hook fixture', '--no-gpg-sign']).ok).toBe(true);
    expect(gitIt(dir, ['config', '--local', 'core.hooksPath', 'tools/hooks']).ok).toBe(true);
    write(dir, 'src/no-push.ts', 'export const noPush = true;\n');
    write(dir, 'CHANGELOG.md', '# Changelog\n\n- [Gate] No-Push geprüft.\n');
    const state = stateFor(git);

    const result = await new ShinonPipeline(git, config, state).run({
      prepare: false,
      stage: 'all',
      push: false,
      only: ['commit-size'],
      message: longMessage('fix(shinon): No-Push-Hook synchronisieren'),
    });

    expect(result.ok).toBe(true);
    expect(result.commit?.ok).toBe(true);
    expect(state.read().lastPush).toBeUndefined();
  });

  it('lässt den Pipeline-Push als einzigen Push-Versuch gelten', async () => {
    const { dir, git, config } = seedRepository('pipeline-single-push');
    const remote = tempDir('pipeline-single-push-remote');
    expect(gitIt(remote, ['init', '--bare']).ok).toBe(true);
    const pushCount = path.join(remote, 'push-count');
    const postHook = write(
      dir,
      'tools/hooks/post-commit',
      `#!/bin/sh\nexec node ${JSON.stringify(REAL_HOOK_ENTRY)} push --auto --quiet\n`,
    );
    const prePushHook = write(
      dir,
      'tools/hooks/pre-push',
      `#!/bin/sh\nprintf 'push\\n' >> ${JSON.stringify(pushCount)}\n`,
    );
    fs.chmodSync(postHook, 0o755);
    fs.chmodSync(prePushHook, 0o755);
    expect(gitIt(dir, ['add', 'tools/hooks']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'hook fixture', '--no-gpg-sign']).ok).toBe(true);
    expect(gitIt(dir, ['config', '--local', 'core.hooksPath', 'tools/hooks']).ok).toBe(true);
    expect(gitIt(dir, ['remote', 'add', 'origin', remote]).ok).toBe(true);
    write(dir, 'src/single-push.ts', 'export const singlePush = true;\n');
    write(dir, 'CHANGELOG.md', '# Changelog\n\n- [Gate] Single-Push geprüft.\n');
    const state = stateFor(git);

    const result = await new ShinonPipeline(git, config, state).run({
      prepare: false,
      stage: 'all',
      only: ['commit-size'],
      message: longMessage('fix(shinon): Einen Push-Versuch eindeutig halten'),
    });

    expect(result.ok).toBe(true);
    expect(result.push?.pushed).toBe(true);
    expect(fs.readFileSync(pushCount, 'utf8').trim().split('\\n')).toHaveLength(1);
    expect(gitIt(dir, ['rev-parse', 'origin/main']).stdout.trim()).toBe(git.headHash());
  });

  it('behandelt --quiet nicht als Lockdown der Push-Vorbedingungen', () => {
    const { dir } = seedRepository('pipeline-quiet-strict-push');
    const remote = tempDir('pipeline-quiet-strict-push-remote');
    expect(gitIt(remote, ['init', '--bare']).ok).toBe(true);
    expect(gitIt(dir, ['remote', 'add', 'origin', remote]).ok).toBe(true);
    expect(gitIt(dir, ['push', 'origin', 'main']).ok).toBe(true);
    expect(gitIt(dir, ['rev-parse', '--abbrev-ref', 'main@{upstream}']).ok).toBe(false);
    writeConfigOverride(dir, { push: { setUpstream: false } });
    write(dir, 'src/quiet.ts', 'export const quiet = true;\n');
    write(dir, 'CHANGELOG.md', '# Changelog\n\n- [Gate] Quiet bleibt strikt.\n');
    const remoteBefore = gitIt(dir, ['rev-parse', 'origin/main']).stdout.trim();

    const result = spawnSync(
      process.argv[0],
      [
        REAL_HOOK_ENTRY,
        'finish',
        '--all',
        '--quiet',
        '--only=commit-size',
        `--message=${longMessage('fix(shinon): Quiet darf Preconditions nicht umgehen')}`,
        `--root=${dir}`,
      ],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(1);
    expect(result.stdout).toContain('Kein Upstream');
    expect(gitIt(dir, ['rev-parse', 'origin/main']).stdout.trim()).toBe(remoteBefore);
  });

  it('lässt --dry-run README und State unangetastet', async () => {
    const { dir, git, config } = seedRepository('pipeline-dry-run-readonly');
    const readme = path.join(dir, 'README.md');
    const before = fs.readFileSync(readme, 'utf8');
    const state = stateFor(git);

    const result = await new ShinonPipeline(git, config, state).run({
      dryRun: true,
      push: false,
      only: ['commit-size'],
    });

    expect(result.ok).toBe(true);
    expect(fs.readFileSync(readme, 'utf8')).toBe(before);
    expect(fs.existsSync(state.file)).toBe(false);
  });
});
