import { CommitMessageCheck } from './commit-message-check.ts';
import { ForbiddenPatternCheck } from './forbidden-pattern-check.ts';
import { LocCapCheck } from './loc-cap-check.ts';
import { TypecheckCheck } from './typecheck-check.ts';
import { TestCheck } from './test-check.ts';
import { E2eCheck } from './e2e-check.ts';
import { BuildCheck } from './build-check.ts';
import { ChangelogCheck } from './changelog-check.ts';
import { DocLinkCheck } from './doc-link-check.ts';
import { CommitSizeCheck } from './commit-size-check.ts';
import type { ShinonCheck } from './check.ts';
import type { ShinonConfig } from '../config.ts';

export type { CheckContext, Finding, Severity, ShinonCheck, ShinonPhase } from './check.ts';
export { finding, hasErrors, countBySeverity, targetFiles, lineCount, codeLineCount, tail } from './check.ts';
export { CommitSizeCheck } from './commit-size-check.ts';

/**
 * Registry: die Reihenfolge ist die Gate-Reihenfolge (billig vor teuer). Neue Prüfklassen
 * werden hier eingetragen — ShinonGate kennt keine konkrete Prüfung.
 */
export function buildChecks(config: ShinonConfig, only: string[] = []): ShinonCheck[] {
  const candidates: ShinonCheck[] = [
    new CommitMessageCheck(),
    new LocCapCheck(),
    new ForbiddenPatternCheck(),
    new TypecheckCheck(),
    new TestCheck(),
    new E2eCheck(),
    new BuildCheck(),
    new ChangelogCheck(),
    new DocLinkCheck(),
    new CommitSizeCheck(),
  ];

  const enabled: Record<string, boolean> = {
    'commit-message': config.gate.checks.commitMessage,
    'loc-caps': config.gate.checks.locCaps,
    'forbidden-patterns': config.gate.checks.forbiddenPatterns,
    typecheck: config.gate.checks.typecheck,
    tests: config.gate.checks.tests,
    e2e: config.gate.checks.e2e,
    build: config.gate.checks.build,
    changelog: config.gate.checks.changelog,
    'doc-links': config.gate.checks.docLinks,
    'commit-size': config.gate.checks.commitSize,
  };

  return candidates.filter((check) => enabled[check.id] === true && (only.length === 0 || only.includes(check.id)));
}

export function knownCheckIds(): string[] {
  return [
    'commit-message',
    'loc-caps',
    'forbidden-patterns',
    'typecheck',
    'tests',
    'e2e',
    'build',
    'changelog',
    'doc-links',
    'commit-size',
  ];
}