import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkIndex, writeIndex } from './cli.ts';
import { repositoryFiles, sourceFiles, untrackedFiles, untrackedSourceFiles } from './inventory.ts';
import { INDEX_VERSION, type Index } from './repo.ts';
const temporaryDirectories: string[] = [];
const EMPTY_INDEX: Index = {
  version: INDEX_VERSION,
  modules: [],
  files: [],
  symbols: [],
  relations: [],
  strings: [],
  unresolvedCount: 0,
  hotspots: [],
};

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
  it('nimmt nur versionierte Quellen in den Index auf und meldet untracked Tests separat', () => {
    const directory = temporaryRepo();
    fs.writeFileSync(path.join(directory, 'src/tracked.ts'), 'export const tracked = 1;\n');
    git(directory, ['add', 'src/tracked.ts']);
    fs.writeFileSync(path.join(directory, 'src/new.ts'), 'export const fresh = 1;\n');
    fs.writeFileSync(path.join(directory, 'src/new.test.ts'), 'import { fresh } from "./new";\n');

    expect(untrackedFiles(directory)).toEqual(['src/new.test.ts', 'src/new.ts']);
    expect(sourceFiles(directory).map(file => file.path)).toEqual(['src/tracked.ts']);
    expect(repositoryFiles(directory)).toEqual(['src/new.test.ts', 'src/new.ts', 'src/tracked.ts']);
    expect(untrackedSourceFiles(directory)).toEqual(['src/new.test.ts', 'src/new.ts']);
  });
});

describe('untracked inventory', () => {
  it('meldet Quell- und Asset-Dateien, ignoriert aber gewöhnliche untracked Notizen', () => {
    const directory = temporaryRepo();
    const sourceMarker = 'src/indexer_untracked_probe.ts';
    const sourceAssetMarker = 'src/indexer_untracked_probe.source.txt';
    const jsonMarker = 'src/indexer_untracked_probe.json';
    const noteMarker = 'src/indexer_untracked_probe.txt';
    fs.writeFileSync(path.join(directory, sourceMarker), 'export const probe = true;\n');
    fs.writeFileSync(path.join(directory, sourceAssetMarker), 'source truth\n');
    fs.writeFileSync(path.join(directory, jsonMarker), '{ "probe": true }\n');
    fs.writeFileSync(path.join(directory, noteMarker), 'not an index input\n');

    const all = [sourceMarker, sourceAssetMarker, jsonMarker, noteMarker].sort();
    const indexInputs = [sourceMarker, sourceAssetMarker, jsonMarker].sort();
    expect(untrackedFiles(directory)).toEqual(all);
    expect(untrackedSourceFiles(directory)).toEqual(indexInputs);
  });

  it('meldet untracked Quellen auch über den echten index:check-Entry-Point', () => {
    const directory = temporaryRepo();
    const sourceMarker = 'src/indexer_check_probe.ts';
    fs.writeFileSync(path.join(directory, sourceMarker), 'export const probe = true;\n');
    const emptyIndex = EMPTY_INDEX;
    const errors: string[] = [];
    const error = vi.spyOn(console, 'error').mockImplementation((message?: unknown) => {
      errors.push(String(message));
    });

    try {
      expect(checkIndex(emptyIndex, directory)).toBe(1);
      expect(errors.join('\n')).toContain(`untracked: ${sourceMarker}`);
    } finally {
      error.mockRestore();
    }
  });

  it('schreibt unveränderte Indexausgaben nicht erneut', () => {
    const directory = temporaryRepo();
    expect(writeIndex(EMPTY_INDEX, directory)).toHaveLength(2);
    expect(writeIndex(EMPTY_INDEX, directory)).toEqual([]);
  });
});
