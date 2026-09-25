import { createCheckContext } from './context.ts';
import { buildChecks, validateCheckSelection } from './checks/index.ts';
import { ShinonGate, snapshotOf } from './gate.ts';
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
 * Reihenfolge ist bindend: Vorbereitung (Starter) → Staging (optional) → Gate am tatsächlichen
 * Index → Commit (Komponist) → Push (Push-Executor). Jede Stufe bricht den Ablauf ab, wenn sie rot
 * ist: ohne grünes Gate gibt es keinen Commit, ohne Commit keinen Push. Der Push bleibt abschaltbar
 * (Konfiguration oder --no-push), damit derselbe Executor auch nur lokal arbeiten kann.
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
    const selectedChecks = validateCheckSelection(this.config, options.only ?? []);

    const dryRun = options.dryRun === true;
    const pushEnabled = options.push ?? this.config.push.autoAfterCommit;
    const starter = new ShinonStarter(this.git, this.config, this.state);

    if (dryRun) {
      starter.collect();
      steps.push({
        name: 'Vorbereitung (Starter)',
        ok: true,
        detail: 'nur gelesen — README und State bleiben beim --dry-run unverändert',
      });
    } else if (options.prepare !== false) {
      const prepared = await starter.prepare({ quiet, only: selectedChecks, runGate: false });
      steps.push({
        name: 'Vorbereitung (Starter)',
        ok: true,
        detail: `README ${prepared.readme.updated ? `aktualisiert (${prepared.readme.mode})` : 'unverändert'}`,
      });
    }

    if (!dryRun && options.stage === 'all') {
      const staged = this.git.git(['add', '-A']);
      steps.push({ name: 'Staging', ok: staged.ok, detail: staged.ok ? 'git add -A' : staged.stderr.trim() });
      if (!staged.ok) return { ok: false, steps, report: null, commit: null, push: null };
    }

    const phase = dryRun ? 'preflight' : 'pre-commit';
    const ctx = createCheckContext(this.git, this.config, { phase, quiet });
    const report = await new ShinonGate(buildChecks(this.config, selectedChecks)).run(ctx);
    if (!dryRun) this.state.patch({ lastGate: snapshotOf(report) });

    if (!report.passed) {
      steps.push({ name: 'Gate', ok: false, detail: 'Gate geschlossen — Commit und Push unterbleiben' });
      return { ok: false, steps, report, commit: null, push: null };
    }
    steps.push({ name: 'Gate', ok: true, detail: `offen in ${report.durationMs} ms` });

    if (dryRun) {
      steps.push({ name: 'Probelauf', ok: true, detail: 'Staging, Commit und Push übersprungen (--dry-run)' });
      return { ok: true, steps, report, commit: null, push: null };
    }

    const komponist = new ShinonCommitKomponist(this.git, this.config, this.state);
    const commit = komponist.commit({
      message: options.message,
      messageFile: options.messageFile,
      // Die Pipeline besitzt den Push selbst. Der post-commit-Hook darf hier keinen zweiten
      // Push-Versuch starten; --no-push bleibt dadurch auch mit installierten Hooks wirksam.
      pushAfterCommit: false,
    });
    steps.push({
      name: 'Commit (Komponist)',
      ok: commit.ok,
      detail: commit.ok ? commit.detail : `${commit.detail} — ${commit.findings[0]?.message ?? ''}`,
    });
    if (!commit.ok) return { ok: false, steps, report, commit, push: null };

    if (!pushEnabled) {
      steps.push({ name: 'Push', ok: true, detail: 'übersprungen (deaktiviert oder --no-push)' });
      return { ok: true, steps, report, commit, push: null };
    }

    const executor = new ShinonPushExecutor(this.git, this.config, this.state);
    // `--quiet` verändert nur die Ausgabe. Die Pipeline ist kein Hook-Kontext und darf
    // fehlende Precondition daher nicht durch einen lenient Pushlauf umgehen.
    const push = executor.run({ dryRun: false, lenient: false });
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
