import { CommitMessageCheck } from './commit-message-check.ts';
import { ForbiddenPatternCheck } from './forbidden-pattern-check.ts';
import { UntrackedInputCheck } from './untracked-input-check.ts';
import { LocCapCheck } from './loc-cap-check.ts';
import { TypecheckCheck } from './typecheck-check.ts';
import { TestCheck } from './test-check.ts';
import { E2eCheck } from './e2e-check.ts';
import { BuildCheck } from './build-check.ts';
import { ChangelogCheck } from './changelog-check.ts';
import { DocLinkCheck } from './doc-link-check.ts';
import { CommitSizeCheck } from './commit-size-check.ts';
import { VersionFilesCheck } from './version-files-check.ts';
import type { ShinonCheck } from './check.ts';
import type { ShinonConfig } from '../config.ts';

export type { CheckContext, Finding, Severity, ShinonCheck, ShinonPhase } from './check.ts';
export { finding, hasErrors, countBySeverity, targetFiles, lineCount, codeLineCount, tail } from './check.ts';
export { CommitSizeCheck } from './commit-size-check.ts';
export { VersionFilesCheck } from './version-files-check.ts';

/**
 * Registry: die Reihenfolge ist die Gate-Reihenfolge (billig vor teuer). Neue Prüfklassen
 * werden hier eingetragen — ShinonGate kennt keine konkrete Prüfung.
 */
function enabledCheckIds(config: ShinonConfig): Record<string, boolean> {
  return {
    'commit-message': config.gate.checks.commitMessage,
    'loc-caps': config.gate.checks.locCaps,
    'forbidden-patterns': config.gate.checks.forbiddenPatterns,
    'untracked-inputs': config.gate.checks.untrackedInputs,
    typecheck: config.gate.checks.typecheck,
    tests: config.gate.checks.tests,
    e2e: config.gate.checks.e2e,
    build: config.gate.checks.build,
    changelog: config.gate.checks.changelog,
    'doc-links': config.gate.checks.docLinks,
    'commit-size': config.gate.checks.commitSize,
    'version-files': config.gate.checks.versionFiles,
  };
}

export function validateCheckSelection(config: ShinonConfig, only: string[]): string[] {
  const enabled = enabledCheckIds(config);
  const requested = [...new Set(only)].sort();
  const known = new Set(knownCheckIds());
  const unknown = requested.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(`Unbekannte Check-ID(s): ${unknown.join(', ')}`);
  }
  const disabled = requested.filter((id) => enabled[id] !== true);
  if (disabled.length > 0) {
    throw new Error(`Check-ID(s) sind in dieser Konfiguration deaktiviert: ${disabled.join(', ')}`);
  }
  return requested;
}

export function buildChecks(config: ShinonConfig, only: string[] = []): ShinonCheck[] {
  const candidates: ShinonCheck[] = [
    new CommitMessageCheck(),
    new LocCapCheck(),
    new ForbiddenPatternCheck(),
    new UntrackedInputCheck(),
    new TypecheckCheck(),
    new TestCheck(),
    new E2eCheck(),
    new BuildCheck(),
    new ChangelogCheck(),
    new DocLinkCheck(),
    new CommitSizeCheck(),
    new VersionFilesCheck(),
  ];

  const enabled = enabledCheckIds(config);
  const requested = validateCheckSelection(config, only);
  return candidates.filter((check) => enabled[check.id] === true && (requested.length === 0 || requested.includes(check.id)));
}

export function knownCheckIds(): string[] {
  return [
    'commit-message',
    'loc-caps',
    'forbidden-patterns',
    'untracked-inputs',
    'typecheck',
    'tests',
    'e2e',
    'build',
    'changelog',
    'doc-links',
    'commit-size',
    'version-files',
  ];
}