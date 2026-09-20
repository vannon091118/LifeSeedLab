import { nowIso } from './state.ts';
import { ShinonGitHelfer } from './git-helfer.ts';
import type { Finding } from './checks/check.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonStateStore } from './state.ts';

/**
 * ShinonPushExecutor — die Push-Stufe des Executors.
 *
 * Er läuft nur nach einem grünen Gate (der Aufrufer erzwingt die Reihenfolge) und prüft vorher die
 * Vorbedingungen: Remote vorhanden, Branch bekannt, gh-Authentifizierung gültig, tatsächlich
 * Commits voraus. Ohne offene Commits wird der Push übersprungen, nicht erzwungen — ein leerer
 * Push ist kein Erfolg.
 */

export interface PushOutcome {
  ok: boolean;
  pushed: boolean;
  skipped: boolean;
  remote: string;
  branch: string;
  ahead: number;
  behind: number;
  detail: string;
  findings: Finding[];
}

interface PushOptions {
  remote?: string;
  branch?: string;
  dryRun?: boolean;
  /** true ⇒ Upstream beim Push einrichten, wenn keiner existiert. */
  setUpstream?: boolean;
  /** true ⇒ Vorbedingungen nur melden, nicht blockieren (Hook-Kontext). */
  lenient?: boolean;
}

const finding = (code: string, message: string, severity: Finding['severity'] = 'error'): Finding => ({
  check: 'push',
  code,
  severity,
  message,
});

export class ShinonPushExecutor {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;
  private readonly state: ShinonStateStore;

  constructor(git: ShinonGitHelfer, config: ShinonConfig, state: ShinonStateStore) {
    this.git = git;
    this.config = config;
    this.state = state;
  }

  /** Vorbedingungen des Push — reine Prüfung, kein Schreiben. */
  preconditions(options: PushOptions = {}): {
    findings: Finding[];
    ahead: number;
    behind: number;
    upstream: string | null;
  } {
    const remote = options.remote ?? this.config.push.remote;
    const branch = options.branch ?? this.git.currentBranch() ?? this.config.push.branch;
    const findings: Finding[] = [];

    if (this.git.remoteUrl(remote) === null) {
      findings.push(finding('PSH001', `Remote „${remote}" ist nicht konfiguriert — Push nicht möglich`));
    }

    const aheadBehind = this.git.aheadBehind(remote, branch);
    if (aheadBehind.upstream === null) {
      findings.push(
        finding(
          'PSH010',
          `Kein Upstream für „${branch}" — wird beim Push eingerichtet`,
          this.config.push.setUpstream ? 'warn' : 'error',
        ),
      );
    }

    const url = this.git.remoteUrl(remote) ?? '';
    const isGitHubHttps = url.startsWith('https://') && url.includes('github.com');
    if (this.config.push.requireAuth && isGitHubHttps && this.git.ghAvailable()) {
      const auth = this.git.ghAuthStatus();
      if (!auth.ok) {
        findings.push(
          finding('PSH020', `GitHub-Authentifizierung fehlt (${auth.message}) — vorher \`gh auth login\` ausführen`),
        );
      }
    }

    if (this.git.currentBranch() === null) {
      findings.push(finding('PSH030', 'Detached HEAD — kein Branch zum Pushen', 'warn'));
    }

    return { findings, ahead: aheadBehind.ahead, behind: aheadBehind.behind, upstream: aheadBehind.upstream };
  }

  run(options: PushOptions = {}): PushOutcome {
    const remote = options.remote ?? this.config.push.remote;
    const branch = options.branch ?? this.git.currentBranch() ?? this.config.push.branch;
    const { findings, ahead, behind, upstream } = this.preconditions(options);
    const blockers = findings.filter((item) => item.severity === 'error');

    const base = { remote, branch, ahead, behind, findings };
    if (blockers.length > 0 && !options.lenient) {
      return {
        ...base,
        ok: false,
        pushed: false,
        skipped: false,
        detail: blockers.map((item) => item.message).join('; '),
      };
    }

    if (ahead === 0 && upstream !== null) {
      return {
        ...base,
        ok: true,
        pushed: false,
        skipped: true,
        detail: `nichts zu pushen — ${branch} ist auf ${upstream} (keine Commits voraus)`,
      };
    }

    const result = this.git.push({
      remote,
      branch,
      dryRun: options.dryRun,
      setUpstream: options.setUpstream ?? (this.config.push.setUpstream && upstream === null),
    });

    this.state.patch({
      lastPush: { ok: result.ok, remote, branch, detail: result.detail, at: nowIso() },
    });

    return { ...base, ok: result.ok, pushed: result.pushed, skipped: false, detail: result.detail };
  }
}

export function formatPushOutcome(outcome: PushOutcome): string {
  const icon = outcome.skipped ? '⏭️' : outcome.ok ? '🚀' : '🛑';
  const lines = [`${icon} Push-Executor — ${outcome.remote}/${outcome.branch}: ${outcome.detail}`];
  for (const item of outcome.findings) {
    if (item.severity === 'info') continue;
    lines.push(`   ${item.severity === 'error' ? '❌' : '⚠️'} ${item.code}: ${item.message}`);
  }
  return lines.join('\n');
}

export function defaultRemoteOf(git: ShinonGitHelfer): string | null {
  const remotes = git.remotes();
  return remotes.length > 0 ? (remotes[0]?.name ?? null) : null;
}
