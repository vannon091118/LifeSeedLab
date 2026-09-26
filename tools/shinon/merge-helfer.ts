import fs from 'node:fs';
import path from 'node:path';
import { createCheckContext } from './context.ts';
import { ShinonGate, formatGateReport, snapshotOf } from './gate.ts';
import { buildChecks } from './checks/index.ts';
import type { GateReport } from './gate.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonStateStore } from './state.ts';

/**
 * MergeExecutor — `git merge` und `git rebase` gehen durchs Gate.
 *
 * Warum ein eigenes Modul und nicht drei Aufrufe im CLI: Merge und Rebase sind die beiden
 * Aktionen, an denen ein Fehler nicht im eigenen Branch landet, sondern in `main`. Sie teilen
 * sich dieselbe Abfolge — Vorbedingungen, Gate in der jeweiligen Phase, dann der git-Aufruf —,
 * und diese Abfolge steht hier genau einmal.
 *
 * Die gemessene Lücke, die dieses Modul schließt (git 2.53.0.windows.4, Wegwerf-Probe mit echten
 * Hook-Dateien, nicht aus der Doku abgeleitet):
 *   · `git merge`  feuert `pre-merge-commit` und `commit-msg`, aber NIE `pre-commit`
 *   · `git rebase` feuert `pre-rebase` (1 Argument: Upstream) und `post-rewrite`, aber weder
 *     `pre-commit` noch `commit-msg`
 * Vor dieser Erweiterung liefen beide Aktionen durch kein einziges Gate.
 */

export interface WorkflowStep {
  label: string;
  ok: boolean;
  detail: string;
}

export interface WorkflowResult {
  ok: boolean;
  action: 'merge' | 'rebase' | 'aborted' | 'disabled';
  /** true ⇒ Git meldet einen Konflikt; der Aufrufer soll `merge --abort` anbieten können. */
  conflict: boolean;
  steps: WorkflowStep[];
  report: GateReport | null;
  message: string;
}

interface MergeOptions {
  branch?: string;
  base?: string;
  message?: string;
  messageFile?: string;
  noCommit?: boolean;
  squash?: boolean;
  abort?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
  only?: string[];
}

interface RebaseOptions {
  upstream?: string;
  message?: string;
  noGate?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
  only?: string[];
}

const CONFLICT_HINT = 'Konflikt — mit `shinon merge --abort` (bzw. `git rebase --abort`) zurücknehmen.';

function isConflict(output: string): boolean {
  return /conflict|automatic merge failed|fix conflicts/i.test(output);
}

export class MergeExecutor {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;
  private readonly state: ShinonStateStore;

  constructor(git: ShinonGitHelfer, config: ShinonConfig, state: ShinonStateStore) {
    this.git = git;
    this.config = config;
    this.state = state;
  }

  /**
   * Merge gegen den Ziel-Branch. `workflow.merge.base` greift, wenn kein Ziel genannt ist —
   * sonst wäre `shinon merge` auf einem Feature-Branch ein stiller No-op mit grünem Haken.
   */
  async merge(options: MergeOptions = {}): Promise<WorkflowResult> {
    if (options.abort === true) return this.abortMerge();
    if (!this.config.workflow.merge.enabled) {
      return this.result('disabled', false, false, 'merge deaktiviert (workflow.merge.enabled=false)', []);
    }

    const steps: WorkflowStep[] = [];
    const branch = this.git.currentBranch();
    if (branch === null) {
      return this.result('aborted', false, false, 'Detached HEAD — kein Merge-Ziel', steps);
    }

    const target = options.branch ?? options.base ?? this.config.workflow.merge.base;
    // Der Ziel-Branch ist der, auf dem wir stehen: der Merge tut nichts, sieht aber aus wie ein
    // Erfolg. Genau diese grüne Nichtstuftaste fängt der Gate-Bericht sonst als Activity ab.
    if (target === branch) {
      return this.result(
        'aborted',
        false,
        false,
        `Ziel ${target} ist der aktuelle Branch — es gibt nichts zu mergen. Ziel-Branch benennen.`,
        steps,
      );
    }
    steps.push({ label: 'Ziel', ok: true, detail: `${branch} ← ${target}` });

    if (!this.git.status().clean) {
      return this.result(
        'aborted',
        false,
        false,
        'Arbeitsbaum ist nicht sauber — der Merge würde lokale Änderungen mitschleppen.',
        steps,
      );
    }
    steps.push({ label: 'Arbeitsbaum', ok: true, detail: 'sauber' });

    // Nur mit Nachricht besitzt Shinon den Merge-Commit. Ohne Nachricht nimmt Git seinen
    // Einzeiler `Merge branch 'x'` — und genau daran scheitert MSG010 zu Recht, denn niemand
    // hat eine Begründung geschrieben. Ohne `--no-commit` könnten wir sie nicht mehr nachreichen.
    const compose = options.message !== undefined && options.message !== '';
    const args = ['merge', '--no-ff', '--no-edit'];
    if (compose) args.push('--no-commit');
    if (options.squash === true) args.push('--squash');
    args.push(target);

    if (options.dryRun === true) {
      steps.push({ label: 'Merge', ok: true, detail: `git ${args.join(' ')} (Probelauf)` });
      return this.result('merge', true, false, `Probelauf: git ${args.join(' ')}`, steps);
    }

    const merged = this.git.git(args);
    const conflict = isConflict(merged.stderr + merged.stdout);
    if (!merged.ok) {
      const detail = conflict ? 'Konflikt' : merged.stderr.trim() || merged.stdout.trim() || 'fehlgeschlagen';
      steps.push({ label: 'Merge', ok: false, detail });
      return this.result('merge', false, conflict, conflict ? CONFLICT_HINT : 'Merge fehlgeschlagen', steps);
    }

    if (!compose) {
      steps.push({ label: 'Merge', ok: true, detail: `git ${args.join(' ')}` });
      return this.result('merge', true, false, `Merge ${target} → ${branch} (Git-Nachricht)`, steps);
    }

    // Ab hier steht der Merge im Index, aber es gibt keinen Commit. Jeder Rückweg führt über
    // `merge --abort` — deshalb wird er bei jedem Scheitern ausgeführt, nicht dem Aufrufer
    // überlassen: ein liegengebliebener Merge blockiert den nächsten Commit kommentarlos.
    const report = await this.runGate('pre-merge', options.message, options);
    if (!report.passed) {
      this.git.git(['merge', '--abort']);
      return this.result(
        'merge', false, false,
        'Gate geschlossen — Merge zurückgenommen (git merge --abort)', steps, report,
      );
    }

    const message = options.message as string;
    const committed = this.git.commitWithMessage(message);
    if (!committed.ok) {
      this.git.git(['merge', '--abort']);
      steps.push({ label: 'Merge-Commit', ok: false, detail: committed.stderr.trim() || 'fehlgeschlagen' });
      return this.result('merge', false, false, 'Merge-Commit fehlgeschlagen — Merge zurückgenommen', steps, report);
    }

    steps.push({ label: 'Merge-Commit', ok: true, detail: message.split('\n')[0] ?? '' });
    this.state.patch({ lastGate: snapshotOf(report) });
    return this.result('merge', true, false, `Merge ${target} → ${branch} mit Nachricht übernommen`, steps, report);
  }

  /**
   * Rebase auf den Upstream. `workflow.rebase.perCommit` schaltet den Gate-Lauf je Commit zu
   * (`git rebase --exec`), damit kein Commit entsteht, den das Gate nie gesehen hat. Ohne diese
   * Option läuft das Gate einmal vorher in der Phase `pre-rebase` — das prüft den Zustand, nicht
   * die Historie, und behauptet an keiner Stelle, die Kette gesehen zu haben.
   */
  async rebase(options: RebaseOptions = {}): Promise<WorkflowResult> {
    if (!this.config.workflow.rebase.enabled) {
      return this.result('disabled', false, false, 'rebase deaktiviert (workflow.rebase.enabled=false)', []);
    }
    const steps: WorkflowStep[] = [];
    const upstream = options.upstream ?? this.config.workflow.merge.base;

    if (!this.git.status().clean) {
      return this.result('aborted', false, false, 'Arbeitsbaum ist nicht sauber — git rebase bricht sonst ab', steps);
    }
    steps.push({ label: 'Arbeitsbaum', ok: true, detail: 'sauber' });

    if (!this.config.workflow.rebase.perCommit && options.noGate !== true) {
      const report = await this.runGate('pre-rebase', options.message, options);
      this.state.patch({ lastGate: snapshotOf(report) });
      if (!report.passed) {
        return this.result('rebase', false, false, 'Gate geschlossen — Rebase nicht gestartet', steps, report);
      }
      const ran = report.outcomes.filter((outcome) => !outcome.skipped).length;
      steps.push({ label: 'Pre-Rebase', ok: true, detail: `${ran} Prüfungen offen` });
    }

    const args = ['rebase', upstream];
    if (options.dryRun === true) {
      steps.push({ label: 'Rebase', ok: true, detail: `git ${args.join(' ')} (Probelauf)` });
      return this.result('rebase', true, false, `Probelauf: git ${args.join(' ')}`, steps);
    }
    const result = this.git.git(args);
    const conflict = isConflict(result.stderr + result.stdout);
    steps.push({
      label: 'Rebase',
      ok: result.ok,
      detail: result.ok ? `${upstream} aufgespielt` : conflict ? 'Konflikt' : result.stderr.trim() || 'fehlgeschlagen',
    });
    if (!result.ok) {
      return this.result('rebase', false, conflict, conflict ? CONFLICT_HINT : 'Rebase fehlgeschlagen', steps);
    }
    return this.result('rebase', true, false, `Rebase auf ${upstream} abgeschlossen`, steps);
  }

  abortMerge(): WorkflowResult {
    const inMerge = this.git.git(['rev-parse', '-q', '--verify', 'MERGE_HEAD']).ok;
    const result = this.git.git(['merge', '--abort']);
    if (!result.ok) {
      return this.result('aborted', false, false, inMerge ? 'merge --abort fehlgeschlagen' : 'Kein laufender Merge', []);
    }
    return this.result('aborted', true, false, 'Merge abgebrochen', []);
  }

  /** Liest die Nachricht, die Git in `.git/MERGE_MSG` vorbereitet hat (Kommentarzeilen entfernt). */
  preparedMergeMessage(): string | undefined {
    const file = path.join(this.git.root, '.git', 'MERGE_MSG');
    if (!fs.existsSync(file)) return undefined;
    const cleaned = fs.readFileSync(file, 'utf8').replace(/^#.*$/gm, '').trim();
    return cleaned === '' ? undefined : cleaned;
  }

  private async runGate(
    phase: 'pre-merge' | 'pre-rebase',
    message: string | undefined,
    options: { quiet?: boolean; only?: string[] },
  ) {
    const quiet = options.quiet === true;
    const ctx = createCheckContext(this.git, this.config, {
      phase,
      message: message ?? this.preparedMergeMessage(),
      quiet,
    });
    const gate = new ShinonGate(buildChecks(this.config, options.only ?? []));
    const report = await gate.run(ctx);
    if (!quiet) process.stdout.write(`\n${formatGateReport(report)}\n`);
    return report;
  }

  private result(
    action: WorkflowResult['action'],
    ok: boolean,
    conflict: boolean,
    message: string,
    steps: WorkflowStep[],
    report: GateReport | null = null,
  ): WorkflowResult {
    return { ok, action, conflict, steps, report, message };
  }
}

export function formatWorkflowResult(result: WorkflowResult, options: { quiet?: boolean } = {}): string {
  const lines: string[] = result.steps.map((step) => `${step.ok ? '✅' : '❌'} ${step.label} — ${step.detail}`);
  if (result.report !== null && !result.report.passed) {
    lines.push('', formatGateReport(result.report, { quiet: options.quiet === true }));
  }
  lines.push('', `${result.ok ? '✅' : '🛑'} ${result.message}`);
  return lines.join('\n');
}