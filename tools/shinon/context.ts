import type { CheckContext, ShinonPhase } from './checks/check.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';

/**
 * Der Prüfkontext ist die einzige Stelle, an der der reale Repository-Zustand in die Prüfungen
 * fließt. Gate, Starter, Komponist und Pipeline teilen sich diesen Aufbau, damit alle Prüfungen
 * dieselbe Sicht auf Index, Arbeitsbaum und Nachricht haben.
 */

export interface ContextOptions {
  phase?: ShinonPhase;
  message?: string;
  quiet?: boolean;
}

export function createCheckContext(
  git: ShinonGitHelfer,
  config: ShinonConfig,
  options: ContextOptions = {},
): CheckContext {
  const status = git.status();
  const changedFiles = [...new Set([...status.staged, ...status.modified, ...status.untracked, ...git.changedFiles()])]
    .filter((file) => file !== '')
    .sort();

  return {
    root: git.root,
    git,
    config,
    phase: options.phase ?? 'preflight',
    stagedFiles: [...status.staged].sort(),
    changedFiles,
    message: options.message,
    quiet: options.quiet ?? false,
  };
}
