import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { buildChecks } from '../checks/index.ts';
import { ShinonGate } from '../gate.ts';
import { defaultConfig } from '../config.ts';
import { HOOKS_RELATIVE_DIR, HOOK_ENTRY_RELATIVE_PATH, hookScripts, installHooks } from '../hooks.ts';
import { PROJECT_ROOT as ROOT, contextFor, gitIt, initTempRepo, runEntry, tempDir, write } from './helpers.ts';
import type { ShinonCheck } from '../checks/check.ts';

const HOOK_NAMES = ['pre-commit', 'commit-msg', 'post-commit'] as const;

describe('Shinon-Hook-Vertrag', () => {
  it('hält die Generator-Reihenfolge und tracked Inhalte synchron', () => {
    const scripts = hookScripts();

    expect(Object.keys(scripts)).toEqual(HOOK_NAMES);
    const entry = HOOK_ENTRY_RELATIVE_PATH.split(path.sep).join('/');
    expect(scripts['pre-commit']).toContain(
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-commit --quiet`,
    );
    expect(scripts['commit-msg']).toContain(
      `exec node "$SHINON_ROOT/${entry}" message --file="$1" --quiet`,
    );
    expect(scripts['post-commit']).toContain(
      `exec node "$SHINON_ROOT/${entry}" push --auto --quiet`,
    );
    for (const name of HOOK_NAMES) {
      expect(scripts[name]).not.toContain('scripts/precommit.js');
      expect(gitIt(ROOT, ['ls-files', '--error-unmatch', path.posix.join('tools', 'hooks', name)]).ok).toBe(true);
      expect(fs.readFileSync(path.join(ROOT, 'tools', 'hooks', name), 'utf8')).toBe(scripts[name]);
    }
    expect(fs.existsSync(path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH))).toBe(true);
  });

  it('installiert die drei Hooks lokal, setzt core.hooksPath und lässt globale Config unverändert', () => {
    const { dir, git } = initTempRepo('hooks-install');
    const globalBefore = gitIt(dir, ['config', '--global', '--get', 'core.hooksPath']);

    const result = installHooks(git);

    expect(result.changed).toBe(true);
    expect(result.written).toEqual(HOOK_NAMES.map((name) => `tools/hooks/${name}`));
    expect(result.hooksPath).toBe('tools/hooks');
    expect(gitIt(dir, ['config', '--local', '--get', 'core.hooksPath']).stdout.trim()).toBe('tools/hooks');
    expect(gitIt(dir, ['config', '--global', '--get', 'core.hooksPath'])).toEqual(globalBefore);
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    for (const name of HOOK_NAMES) {
      const mode = gitIt(dir, ['ls-files', '--stage', `tools/hooks/${name}`]).stdout;
      expect(mode).toMatch(/^100755 /);
      expect(fs.readFileSync(path.join(dir, HOOKS_RELATIVE_DIR, name), 'utf8')).toBe(hookScripts()[name]);
    }
  });

  it('verweigert Hook-Installation außerhalb eines Git-Repositories vor jedem Schreibpfad', () => {
    const dir = tempDir('entry-install-hooks-nonrepo');

    const result = runEntry(dir, ['install-hooks'], {
      GIT_CEILING_DIRECTORIES: path.join(ROOT, 'tools', '.tmp'),
    });

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('Kein Git-Repository');
    expect(fs.existsSync(path.join(dir, 'tools', 'hooks'))).toBe(false);
  });

  it('führt bei einem normalen Git-Commit exakt pre-commit, commit-msg und post-commit aus', () => {
    const { dir, git } = initTempRepo('hooks-run');
    const log = path.join(dir, 'hook-calls.log');
    write(
      dir,
      'tools/shinon/hook-entry.mjs',
      [
        "import fs from 'node:fs';",
        `fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');`,
      ].join('\n'),
    );
    installHooks(git);
    write(dir, 'probe.txt', 'probe\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);

    const commit = gitIt(dir, ['commit', '-m', 'test commit']);

    expect(commit.ok).toBe(true);
    const calls = fs
      .readFileSync(log, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[]);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual(['gate', '--phase=pre-commit', '--quiet']);
    expect(calls[1]?.[0]).toBe('message');
    expect(calls[1]?.[1]).toMatch(/^--file=/);
    expect(calls[1]?.[2]).toBe('--quiet');
    expect(calls[2]).toEqual(['push', '--auto', '--quiet']);
  });

  it('führt den dokumentierten JavaScript-Einstieg unter plain Node aus', () => {
    const entry = path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH);
    const result = spawnSync(process.argv[0], [entry, 'help'], { cwd: ROOT, encoding: 'utf8' });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Shinon — Commit + Push Executor');
  });

  it('weist ungültige Check- und Phaseneingaben fail-closed ab', () => {
    const { dir, git } = initTempRepo('entry-invalid-gate-input');
    const entry = path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH);
    const result = spawnSync(process.argv[0], [entry, 'gate', '--only=', `--root=${dir}`], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('mindestens eine Check-ID');
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);
    expect(git.status().clean).toBe(true);
  });

  it('weist unbekannte Optionen ab, bevor der Starter den README-Block verändert', () => {
    const { dir } = initTempRepo('entry-unknown-option');
    const readme = write(dir, 'README.md', '# unverändert\n');
    const before = fs.readFileSync(readme, 'utf8');
    const entry = path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH);
    const result = spawnSync(
      process.argv[0],
      [entry, 'prepare', '--dry-runn', `--root=${dir}`],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('Unbekannte Option: --dry-runn');
    expect(fs.readFileSync(readme, 'utf8')).toBe(before);
  });

  it('führt prepare --dry-run ohne README- oder State-Schreibvorgang aus', () => {
    const { dir } = initTempRepo('entry-prepare-dry-run');
    write(dir, 'README.md', '# unverändert\n');
    const before = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');

    const result = runEntry(dir, ['prepare', '--dry-run', '--only=untracked-inputs']);

    expect(result.status, result.stderr).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')).toBe(before);
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);
  });

  it('lehnt eine --only-Auswahl ab, die der Commit-Befehl gar nicht ausführen würde', () => {
    const { dir, git } = initTempRepo('entry-only-not-applicable');
    write(dir, 'src/pending.ts', 'export const pending = true;\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    const headBefore = git.headHash();
    const message = `feat(probe): keine stille Auswahl\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;

    const result = runEntry(dir, ['commit', '--only=does-not-exist', `--message=${message}`]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--only ist für den Befehl „commit“ nicht wirksam');
    expect(git.headHash()).toBe(headBefore);
  });

  it('hält gate --dry-run und commit --dry-run read-only', () => {
    const { dir, git } = initTempRepo('entry-gate-commit-dry-run');
    write(dir, 'src/pending.ts', 'export const pending = true;\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    const headBefore = git.headHash();

    const gate = runEntry(dir, ['gate', '--phase=pre-commit', '--dry-run', '--only=commit-size']);
    expect(gate.status, gate.stderr).toBe(0);
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);

    const message = `feat(probe): trocken\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;
    const commit = runEntry(dir, ['commit', '--dry-run', `--message=${message}`]);
    expect(commit.status, commit.stderr).toBe(0);
    expect(commit.stdout).toContain('Commit-Probelauf');
    expect(git.headHash()).toBe(headBefore);
  });

  it('lehnt einen nicht read-onlyfähigen Dry-run vor jedem Schreibpfad ab', () => {
    const { dir } = initTempRepo('entry-unsupported-dry-run');

    const result = runEntry(dir, ['install-hooks', '--dry-run']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('nicht unterstützt');
    expect(fs.existsSync(path.join(dir, 'tools', 'hooks'))).toBe(false);
    expect(gitIt(dir, ['config', '--local', '--get', 'core.hooksPath']).ok).toBe(false);
  });

  it('erkennt untracked Quellverzeichnisse als konkrete Dateien', () => {
    const { dir } = initTempRepo('entry-untracked-directory');
    write(dir, 'README.md', '# Test\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'initial', '--no-gpg-sign']).ok).toBe(true);
    write(dir, 'src/new/pending.ts', 'export const pending = true;\n');

    const result = runEntry(dir, ['gate', '--phase=preflight', '--only=untracked-inputs']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('src/new/pending.ts');
  });

  it('akzeptiert einen Changelog auf einem unborn Branch', () => {
    const { dir } = initTempRepo('entry-changelog-unborn');
    write(dir, 'CHANGELOG.md', '# Changelog\n\n- [Gate] unborn branch\n');

    const result = runEntry(dir, ['gate', '--phase=preflight', '--only=changelog']);

    expect(result.status, result.stderr).toBe(0);
  });

  it('verwirft einen unbrauchbaren State-Snapshot statt den Starter zu crashen', () => {
    const { dir } = initTempRepo('entry-state-shape');
    write(dir, '.gitignore', 'tools/.shinon-state.json\n');
    write(dir, 'README.md', '# Test\n');
    write(dir, 'tools/.shinon-state.json', JSON.stringify({ lastCommit: {} }));

    const result = runEntry(dir, ['prepare', '--only=untracked-inputs']);

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tools', '.shinon-state.json'), 'utf8')).lastCommit)
      .toBeUndefined();
  });

  it('weist überzählige Positionsargumente und Boolean-Werte fail-closed ab', () => {
    const { dir } = initTempRepo('entry-cli-boundaries');

    const extra = runEntry(dir, ['gate', 'status', '--only=commit-size']);
    expect(extra.status).toBe(1);
    expect(extra.stderr).toContain('Unerwartetes Argument');

    const booleanValue = runEntry(dir, ['gate', '--dry-run=false', '--only=commit-size']);
    expect(booleanValue.status).toBe(1);
    expect(booleanValue.stderr).toContain('akzeptiert keinen Wert');
  });

  it('bewahrt Registry-Reihenfolge und Fail-fast ohne neue Hook-Prüfung', async () => {
    const config = defaultConfig(ROOT);
    config.gate.checks.e2e = false;
    config.gate.checks.build = false;
    expect(buildChecks(config).map((check) => check.id)).toEqual([
      'commit-message',
      'loc-caps',
      'forbidden-patterns',
      'untracked-inputs',
      'typecheck',
      'tests',
      'changelog',
      'doc-links',
      'commit-size',
      'version-files',
    ]);

    const { git } = initTempRepo('hooks-fail-fast');
    let expensiveRan = false;
    const failing: ShinonCheck = {
      id: 'fail-fast-contract',
      title: 'Fail-fast contract',
      run: () => [{ check: 'fail-fast-contract', code: 'TEST001', severity: 'error', message: 'stop' }],
    };
    const expensive: ShinonCheck = {
      id: 'expensive-contract',
      title: 'Expensive contract',
      expensive: true,
      run: () => {
        expensiveRan = true;
        return [];
      },
    };
    const report = await new ShinonGate([failing, expensive]).run(contextFor(git, config, { quiet: true }));

    expect(report.passed).toBe(false);
    expect(report.outcomes.map((outcome) => [outcome.id, outcome.skipped])).toEqual([
      ['fail-fast-contract', false],
      ['expensive-contract', true],
    ]);
    expect(expensiveRan).toBe(false);
  });
});
