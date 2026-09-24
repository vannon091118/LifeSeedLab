import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { repositoryFiles, sourceFiles, untrackedFiles } from './inventory.ts';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const temporaryDirectories: string[] = [];

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function temporaryRepo(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'indexer-untracked-'));
  temporaryDirectories.push(directory);
  git(directory, ['init', '-q']);
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true });
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Indexer-Inventar', () => {
  it('sieht eine untracked Quelldatei, ohne sie als versioniert auszugeben', () => {
    const directory = temporaryRepo();
    fs.writeFileSync(path.join(directory, 'src/tracked.ts'), 'export const tracked = 1;\n');
    git(directory, ['add', 'src/tracked.ts']);
    fs.writeFileSync(path.join(directory, 'src/new.ts'), 'export const fresh = 1;\n');

    expect(untrackedFiles(directory)).toEqual(['src/new.ts']);
    expect(sourceFiles(directory).map(file => file.path)).toEqual(['src/new.ts', 'src/tracked.ts']);
    expect(repositoryFiles(directory)).toEqual(['src/new.ts', 'src/tracked.ts']);
  });
});

describe('index:check', () => {
  it('meldet untracked Quell- und Asset-Dateien als Abweichung und beendet sich rot', () => {
    const marker = `src/indexer_untracked_probe_${process.pid}.ts`;
    const assetMarker = `src/indexer_untracked_probe_${process.pid}.source.txt`;
    fs.writeFileSync(path.join(ROOT, marker), 'export const probe = true;\n');
    fs.writeFileSync(path.join(ROOT, assetMarker), 'source truth\n');
    try {
      const result = spawnSync(process.execPath, ['tools/indexer/cli.ts', 'check'], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      const output = `${result.stdout}${result.stderr}`;
      expect(result.status).not.toBe(0);
      expect(output).toContain('untracked:');
      expect(output).toContain(marker);
      expect(output).toContain(assetMarker);
    } finally {
      fs.rmSync(path.join(ROOT, marker), { force: true });
      fs.rmSync(path.join(ROOT, assetMarker), { force: true });
    }
  }, 90_000);
});
