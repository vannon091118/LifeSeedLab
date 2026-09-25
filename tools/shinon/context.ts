import type { CheckContext, ShinonPhase } from './checks/check.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';

/**
 * Der Prüfkontext ist die einzige Stelle, an der der reale Repository-Zustand in die Prüfungen
 * fließt. Gate, Starter, Komponist und Pipeline teilen sich diesen Aufbau, damit alle Prüfungen
 * dieselbe Sicht auf Index, Arbeitsbaum und Nachricht haben.
 */

interface ContextOptions {
  phase?: ShinonPhase;
  message?: string;
  quiet?: boolean;
}

const GATE_PHASES = new Set<ShinonPhase>(['preflight', 'pre-commit', 'pre-push']);

export function createCheckContext(
  git: ShinonGitHelfer,
  config: ShinonConfig,
  options: ContextOptions = {},
): CheckContext {
  const phase = options.phase ?? 'preflight';
  if (!GATE_PHASES.has(phase)) {
    throw new Error(`Ungültige Gate-Phase: ${String(phase)} (erlaubt: ${[...GATE_PHASES].join(', ')})`);
  }

  const status = git.status();
  const changedFiles = [...new Set([...status.staged, ...status.modified, ...status.untracked, ...git.changedFiles()])]
    .filter((file) => file !== '')
    .sort();

  return {
    root: git.root,
    git,
    config,
    phase,
    stagedFiles: [...status.staged].sort(),
    changedFiles,
    message: options.message,
    quiet: options.quiet ?? false,
  };
}
