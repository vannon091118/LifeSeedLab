import fs from 'node:fs';
import path from 'node:path';
import type { ShinonGitHelfer } from './git-helfer.ts';

/**
 * Shinon-Hooks — der Ort, an dem das Gate tatsächlich erzwungen wird.
 *
 * Alle Hooks liegen in `tools/hooks` und rufen ausschließlich den Shinon-CLI-Einstieg auf.
 * Sie entscheiden nichts selbst: pre-commit lässt das Gate laufen, commit-msg prüft dieselbe
 * Nachrichtenregel wie der Komponist, post-commit stößt die Push-Stufe für normale Git-Commits an
 * (abschaltbar über `push.autoAfterCommit`). Die Pipeline unterdrückt diesen Hook-Push und besitzt
 * den einzigen Push-Aufruf selbst. Der JS-Einstieg registriert nur den lokalen TypeScript-Loader;
 * es gibt keinen Download und keinen zweiten CLI-Weg.
 */

export const HOOKS_RELATIVE_DIR = path.join('tools', 'hooks');
export const HOOK_ENTRY_RELATIVE_PATH = path.join('tools', 'shinon', 'hook-entry.mjs');

export function hookScripts(): Record<string, string> {
  const header = '#!/bin/sh\n# Shinon — erzeugt von `shinon install-hooks`. Nicht manuell pflegen.\n';
  const root = 'SHINON_ROOT="$(git rev-parse --show-toplevel)"\n';
  const entry = HOOK_ENTRY_RELATIVE_PATH.split(path.sep).join('/');
  return {
    'pre-commit':
      `${header}${root}` +
      `# Gate-Stufe: Modulgrenzen, Constraints, Typecheck, Tests\nexec node "$SHINON_ROOT/${entry}" gate --phase=pre-commit --quiet\n`,
    'commit-msg':
      `${header}${root}` +
      `# Nachrichtenregel: genau diese Nachricht wird der Komponist commiten\nexec node "$SHINON_ROOT/${entry}" message --file="$1" --quiet\n`,
    'post-commit':
      `${header}${root}` +
      `# Push-Stufe: automatisch nach grünem Gate (push.autoAfterCommit)\nexec node "$SHINON_ROOT/${entry}" push --auto --quiet\n`,
  };
}

export interface HookInstallResult {
  dir: string;
  written: string[];
  hooksPath: string | null;
  changed: boolean;
}

export function installHooks(git: ShinonGitHelfer, options: { setHooksPath?: boolean } = {}): HookInstallResult {
  if (!git.isRepository()) throw new Error('Kein Git-Repository — Hooks können nicht installiert werden');
  const dir = path.join(git.root, HOOKS_RELATIVE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  let changed = false;

  for (const [name, content] of Object.entries(hookScripts())) {
    const file = path.join(dir, name);
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (previous !== content) {
      fs.writeFileSync(file, content, 'utf8');
      changed = true;
    }
    fs.chmodSync(file, 0o755);
    written.push(path.relative(git.root, file).split(path.sep).join('/'));
  }

  const desired = HOOKS_RELATIVE_DIR.split(path.sep).join('/');
  if (options.setHooksPath !== false && git.hooksPath() !== desired) {
    git.configSet('core.hooksPath', desired);
  }

  return { dir, written, hooksPath: git.hooksPath(), changed };
}

export function describeHookInstall(result: HookInstallResult): string {
  return [
    `🪝 Hooks installiert in ${result.dir}`,
    `   Dateien: ${result.written.join(', ')}`,
    `   core.hooksPath: ${result.hooksPath ?? '(nicht gesetzt)'}`,
  ].join('\n');
}
