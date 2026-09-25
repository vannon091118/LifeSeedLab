import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeConfigOverride } from '../config.ts';
import { gitIt, initTempRepo, runEntry, seedRemoteRepository, stateFor, tempDir, write } from './helpers.ts';

describe('Shinon Push-Entry', () => {
  it('respektiert push.autoAfterCommit=false im echten Hook-Einstieg', () => {
    const { dir } = initTempRepo('entry-push-disabled');
    writeConfigOverride(dir, { push: { autoAfterCommit: false } });

    const result = runEntry(dir, ['push', '--auto', '--quiet']);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);
  });

  it('macht einen Push-Fehler im Hook sichtbar, ohne den bereits erfolgten Commit als fehlgeschlagen zu melden', () => {
    const { dir, git } = initTempRepo('entry-push-error-visible');
    writeConfigOverride(dir, { push: { autoAfterCommit: true } });

    const result = runEntry(dir, ['push', '--auto', '--quiet']);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Push-Executor');
    expect(stateFor(git).read().lastPush?.ok).toBe(false);
  });

  it('lässt push --dry-run den State unangetastet', () => {
    const { dir } = seedRemoteRepository('entry-push-dry-run');
    write(dir, 'next.txt', 'next\n');
    expect(gitIt(dir, ['add', 'next.txt']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'next', '--no-gpg-sign']).ok).toBe(true);

    const result = runEntry(dir, ['push', '--dry-run', '--quiet']);

    expect(result.status, result.stderr).toBe(0);
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);
  });

  it('pusht beim expliziten Branch-Override gegen den Ziel-Branch', () => {
    const { dir, git } = seedRemoteRepository('entry-push-branch-override');
    expect(gitIt(dir, ['checkout', '-b', 'other']).ok).toBe(true);
    write(dir, 'next.txt', 'next\n');
    expect(gitIt(dir, ['add', 'next.txt']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'next', '--no-gpg-sign']).ok).toBe(true);

    const result = runEntry(dir, ['push', '--branch=other', '--remote=origin', '--quiet']);

    expect(result.status, result.stderr).toBe(0);
    expect(gitIt(dir, ['rev-parse', 'origin/other']).stdout.trim()).toBe(git.headHash());
  });

  it('richtet einen vorhandenen Remote-Branch ohne lokalen Upstream beim Push ein', () => {
    const { dir } = seedRemoteRepository('entry-push-set-upstream');
    expect(gitIt(dir, ['checkout', '-b', 'other']).ok).toBe(true);
    write(dir, 'next.txt', 'next\n');
    expect(gitIt(dir, ['add', 'next.txt']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'next', '--no-gpg-sign']).ok).toBe(true);
    expect(gitIt(dir, ['push', '--no-set-upstream', 'origin', 'other']).ok).toBe(true);
    expect(gitIt(dir, ['rev-parse', '--abbrev-ref', 'other@{upstream}']).ok).toBe(false);

    const result = runEntry(dir, ['push', '--branch=other', '--remote=origin', '--quiet']);

    expect(result.status, result.stderr).toBe(0);
    expect(gitIt(dir, ['rev-parse', '--abbrev-ref', 'other@{upstream}']).stdout.trim()).toBe('origin/other');
  });

  it('erkennt einen zwischenzeitlich fortgeschriebenen Remote trotz veraltetem Tracking-Ref', () => {
    const { dir, remote } = seedRemoteRepository('entry-push-stale-remote-ref');
    const other = tempDir('entry-push-stale-remote-ref-other');
    expect(gitIt(other, ['init', '--initial-branch=main']).ok).toBe(true);
    expect(gitIt(other, ['remote', 'add', 'origin', remote]).ok).toBe(true);
    expect(gitIt(other, ['fetch', 'origin', 'main']).ok).toBe(true);
    expect(gitIt(other, ['checkout', '-B', 'main', 'FETCH_HEAD']).ok).toBe(true);
    expect(gitIt(other, ['config', 'user.name', 'Remote Writer']).ok).toBe(true);
    expect(gitIt(other, ['config', 'user.email', 'remote@test.local']).ok).toBe(true);
    write(other, 'remote-side.txt', 'remote\n');
    expect(gitIt(other, ['add', 'remote-side.txt']).ok).toBe(true);
    expect(gitIt(other, ['commit', '-m', 'remote-side', '--no-gpg-sign']).ok).toBe(true);
    expect(gitIt(other, ['push', 'origin', 'main']).ok).toBe(true);
    expect(gitIt(dir, ['rev-parse', 'main']).stdout.trim()).toBe(gitIt(dir, ['rev-parse', 'origin/main']).stdout.trim());

    const result = runEntry(dir, ['push', '--quiet']);

    expect(result.status, result.stderr).toBe(1);
    expect(result.stdout).toContain('Push-Executor');
    expect(gitIt(dir, ['rev-parse', 'origin/main']).stdout.trim()).toBe(gitIt(dir, ['rev-parse', 'main']).stdout.trim());
  });

  it('meldet einen divergierten Ziel-Branch nicht als erfolgreichen No-op', () => {
    const { dir } = seedRemoteRepository('entry-push-diverged');
    expect(gitIt(dir, ['checkout', '-b', 'other']).ok).toBe(true);
    write(dir, 'remote-side.txt', 'remote\n');
    expect(gitIt(dir, ['add', 'remote-side.txt']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'remote-side', '--no-gpg-sign']).ok).toBe(true);
    expect(gitIt(dir, ['push', 'origin', 'other']).ok).toBe(true);
    expect(gitIt(dir, ['checkout', 'main']).ok).toBe(true);
    expect(gitIt(dir, ['branch', '-f', 'other', 'main']).ok).toBe(true);

    const result = runEntry(dir, ['push', '--branch=other', '--remote=origin']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Push-Executor');
  });
});
