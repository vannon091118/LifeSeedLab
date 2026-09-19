import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { defaultConfig } from '../config.ts';
import { createCheckContext } from '../context.ts';
import { ShinonGitHelfer } from '../git-helfer.ts';
import { ShinonStateStore } from '../state.ts';
import type { CheckContext, ShinonPhase } from '../checks/check.ts';
import type { ShinonConfig } from '../config.ts';

/**
 * Testhelfer. Alle Fixtures entstehen unter `tools/.tmp/` und werden vor jedem Lauf geleert —
 * kein Test schreibt in den echten Arbeitsbaum und keiner hinterlässt Ballast im Repository.
 */

export const TMP_ROOT = path.resolve(process.cwd(), 'tools', '.tmp');

export function tempDir(name: string): string {
  const dir = path.join(TMP_ROOT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function gitIt(dir: string, args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  return { ok: result.status === 0, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
}

/** Frisches Repository mit gesetzter Identität (kein Bezug zur echten Umgebung des Nutzers). */
export function initTempRepo(name: string): { dir: string; git: ShinonGitHelfer; config: ShinonConfig } {
  const dir = tempDir(name);
  gitIt(dir, ['init', '--initial-branch=main']);
  gitIt(dir, ['config', 'user.name', 'Shinon Test']);
  gitIt(dir, ['config', 'user.email', 'shinon@test.local']);
  const config = defaultConfig(dir);
  return { dir, git: new ShinonGitHelfer(dir), config };
}

export function contextFor(
  git: ShinonGitHelfer,
  config: ShinonConfig,
  options: { phase?: ShinonPhase; message?: string; quiet?: boolean } = {},
): CheckContext {
  return createCheckContext(git, config, options);
}

export function stateFor(git: ShinonGitHelfer): ShinonStateStore {
  return new ShinonStateStore(git.root);
}

export function write(dir: string, relative: string, content: string): string {
  const file = path.join(dir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

export function makeLines(count: number): string {
  return Array.from({ length: count }, (_, index) => `const line${index} = ${index};`).join('\n');
}
