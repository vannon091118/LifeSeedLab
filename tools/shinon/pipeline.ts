import { createCheckContext } from './context.ts';
import { buildChecks } from './checks/index.ts';
import { ShinonGate } from './gate.ts';
import { ShinonStarter } from './starter.ts';
import { ShinonCommitKomponist } from './commit-komponist.ts';
import { ShinonPushExecutor } from './push-executor.ts';
import { ShinonStateStore } from './state.ts';
import type { GateReport } from './gate.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';
import type { CommitResult } from './commit-komponist.ts';
import type { PushOutcome } from './push-executor.ts';

/**
 * ShinonPipeline — der vollständige Commit-+-Push-Executor.
 *
 * Reihenfolge ist bindend: Vorbereitung (Starter) → Gate → Staging (optional) → Commit (Komponist)
 * → Push (Push-Executor). Jede Stufe bricht den Ablauf ab, wenn sie rot ist: ohne grünes Gate gibt
 * es keinen Commit, ohne Commit keinen Push. Der Push bleibt abschaltbar (Konfiguration oder
 * --no-push), damit derselbe Executor auch nur lokal arbeiten kann.
 */

interface PipelineOptions {
  /** false ⇒ ohne Starter/README-Aktualisierung direkt ins Gate. */
  prepare?: boolean;
  /** 'all' ⇒ `git add -A` vor dem Commit; 'none' ⇒ ausschließlich bereits Gestagtes committen. */
  stage?: 'all' | 'none';
  push?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
  only?: string[];
  message?: string;
  messageFile?: string;
}

interface PipelineStep {
  name: string;
  ok: boolean;
  detail: string;
}

interface PipelineResult {
  ok: boolean;
  steps: PipelineStep[];
  report: GateReport | null;
  commit: CommitResult | null;
  push: PushOutcome | null;
}

export class ShinonPipeline {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;
  private readonly state: ShinonStateStore;

  constructor(git: ShinonGitHelfer, config: ShinonConfig, state: ShinonStateStore) {
    this.git = git;
    this.config = config;
    this.state = state;
  }

  async run(options: PipelineOptions = {}): Promise<PipelineResult> {
    const steps: PipelineStep[] = [];
    const quiet = options.quiet ?? false;

    let report: GateReport | null = null;
    if (options.prepare !== false) {
      const starter = new ShinonStarter(this.git, this.config, this.state);
      const prepared = await starter.prepare({ quiet, only: options.only });
      report = prepared.report;
      steps.push({
        name: 'Vorbereitung (Starter)',
        ok: true,
        detail: `README ${prepared.readme.updated ? `aktualisiert (${prepared.readme.mode})` : 'unverändert'}`,
      });
    } else {
      const ctx = createCheckContext(this.git, this.config, { phase: 'preflight', quiet });
      const gate = new ShinonGate(buildChecks(this.config, options.only ?? []));
      report = await gate.run(ctx);
    }

    if (report === null || !report.passed) {
      steps.push({ name: 'Gate', ok: false, detail: 'Gate geschlossen — Commit und Push unterbleiben' });
      return { ok: false, steps, report, commit: null, push: null };
    }
    steps.push({ name: 'Gate', ok: true, detail: `offen in ${report.durationMs} ms` });

    if (options.dryRun === true) {
      steps.push({ name: 'Probelauf', ok: true, detail: 'Staging, Commit und Push übersprungen (--dry-run)' });
      return { ok: true, steps, report, commit: null, push: null };
    }

    if (options.stage === 'all') {
      const staged = this.git.git(['add', '-A']);
      steps.push({ name: 'Staging', ok: staged.ok, detail: staged.ok ? 'git add -A' : staged.stderr.trim() });
      if (!staged.ok) return { ok: false, steps, report, commit: null, push: null };
    }

    const komponist = new ShinonCommitKomponist(this.git, this.config, this.state);
    const commit = komponist.commit({ message: options.message, messageFile: options.messageFile });
    steps.push({
      name: 'Commit (Komponist)',
      ok: commit.ok,
      detail: commit.ok ? commit.detail : `${commit.detail} — ${commit.findings[0]?.message ?? ''}`,
    });
    if (!commit.ok) return { ok: false, steps, report, commit, push: null };

    const pushEnabled = options.push ?? this.config.push.autoAfterCommit;
    if (!pushEnabled) {
      steps.push({ name: 'Push', ok: true, detail: 'übersprungen (deaktiviert oder --no-push)' });
      return { ok: true, steps, report, commit, push: null };
    }

    const executor = new ShinonPushExecutor(this.git, this.config, this.state);
    const push = executor.run({ dryRun: false, lenient: quiet });
    steps.push({ name: 'Push', ok: push.ok, detail: push.detail });
    return { ok: push.ok, steps, report, commit, push };
  }
}

export function formatPipelineResult(result: PipelineResult): string {
  const lines: string[] = ['🧩 Shinon Pipeline — Commit + Push'];
  for (const step of result.steps) {
    lines.push(`${step.ok ? '✅' : '🛑'} ${step.name}: ${step.detail}`);
  }
  lines.push(result.ok ? '✨ Pipeline abgeschlossen.' : '🛑 Pipeline abgebrochen.');
  return lines.join('\n');
}
