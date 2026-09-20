import { ShinonGitHelfer } from './git-helfer.ts';
import { describeHookInstall, installHooks } from './hooks.ts';
import { writeConfigTemplate } from './config.ts';
import type { HookInstallResult } from './hooks.ts';
import type { ShinonConfig } from './config.ts';

/**
 * ShinonInit — richtet die Arbeitsumgebung ein: Repository, Remote, GitHub-Repository,
 * Hook-Verzeichnis und optional die Konfigurationsvorlage.
 *
 * Er pusht ausdrücklich **nicht**. Der Push ist eine eigene Stufe (ShinonPushExecutor) und läuft
 * nur nach einem grünen Gate und einem Commit des Komponisten. Diese Trennung ist Absicht: Ein
 * Einrichtungslauf darf niemals Inhalt in ein Remote schreiben.
 */

interface InitOptions {
  url?: string;
  slug?: string;
  private?: boolean;
  description?: string;
  branch?: string;
  installHooks?: boolean;
  writeConfig?: boolean;
  quiet?: boolean;
}

interface InitStep {
  name: string;
  ok: boolean;
  detail: string;
}

interface InitReport {
  steps: InitStep[];
  hooks: HookInstallResult | null;
  pushPerformed: boolean;
}

export class ShinonInit {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;

  constructor(git: ShinonGitHelfer, config: ShinonConfig) {
    this.git = git;
    this.config = config;
  }

  static githubUrlFor(slug: string): string {
    return `https://github.com/${slug.replace(/^\/+/, '')}.git`;
  }

  run(options: InitOptions = {}): InitReport {
    const steps: InitStep[] = [];
    const branch = options.branch ?? this.config.push.branch;
    const remote = this.config.push.remote;

    if (this.git.isRepository()) {
      steps.push({ name: 'Repository', ok: true, detail: `vorhanden (${this.git.root})` });
    } else {
      const result = this.git.initRepository(branch);
      steps.push({
        name: 'Repository',
        ok: result.ok,
        detail: result.ok ? `initialisiert (Branch ${branch})` : result.stderr.trim(),
      });
      if (!result.ok) return { steps, hooks: null, pushPerformed: false };
    }

    const currentBranch = this.git.currentBranch();
    steps.push({
      name: 'Branch',
      ok: currentBranch !== null,
      detail: currentBranch ?? `kein Branch gesetzt (erwartet: ${branch})`,
    });

    if (options.url !== undefined) {
      const ensured = this.git.ensureRemote(remote, options.url);
      steps.push({ name: 'Remote', ok: true, detail: `${remote}: ${ensured.action} (${ensured.url})` });
    }

    if (options.slug !== undefined) {
      steps.push(...this.ensureGitHubRepo(options.slug, remote, options));
    }

    if (options.writeConfig === true) {
      const file = writeConfigTemplate(this.git.root, this.config);
      steps.push({ name: 'Konfiguration', ok: true, detail: `Vorlage geschrieben: ${file}` });
    }

    let hooks: HookInstallResult | null = null;
    if (options.installHooks !== false) {
      hooks = installHooks(this.git);
      steps.push({ name: 'Hooks', ok: true, detail: describeHookInstall(hooks).split('\n').join(' | ') });
    }

    steps.push({
      name: 'Push',
      ok: true,
      detail: 'ausdrücklich nicht Teil von ShinonInit — Push läuft über ShinonPushExecutor nach grünem Gate',
    });

    return { steps, hooks, pushPerformed: false };
  }

  private ensureGitHubRepo(slug: string, remote: string, options: InitOptions): InitStep[] {
    const steps: InitStep[] = [];
    if (!this.git.ghAvailable()) {
      return [{ name: 'GitHub', ok: false, detail: 'gh ist nicht installiert — Repository-Anlage übersprungen' }];
    }

    const auth = this.git.ghAuthStatus();
    if (!auth.ok) {
      return [{ name: 'GitHub', ok: false, detail: `gh ist nicht authentifiziert: ${auth.message}` }];
    }

    const view = this.git.ghRepoView(slug);
    if (view.exists) {
      steps.push({
        name: 'GitHub',
        ok: true,
        detail: `${slug} existiert bereits (${view.visibility ?? 'Sichtbarkeit unbekannt'})`,
      });
    } else {
      const created = this.git.ghCreateRepo({
        slug,
        private: options.private ?? true,
        description: options.description,
      });
      steps.push({
        name: 'GitHub',
        ok: created.ok,
        detail: created.ok
          ? `${slug} angelegt (${options.private === false ? 'öffentlich' : 'privat'})`
          : created.stderr.trim() || 'Anlage fehlgeschlagen',
      });
      if (!created.ok) return steps;
    }

    if (options.url === undefined) {
      const ensured = this.git.ensureRemote(remote, ShinonInit.githubUrlFor(slug));
      steps.push({ name: 'Remote', ok: true, detail: `${remote}: ${ensured.action} (${ensured.url})` });
    }
    return steps;
  }
}

export function describeInitReport(report: InitReport): string {
  const lines = ['🏗️  Shinon Init'];
  for (const step of report.steps) lines.push(`${step.ok ? '✅' : '🛑'} ${step.name}: ${step.detail}`);
  lines.push(report.pushPerformed ? '⚠️  Es wurde gepusht (sollte nie passieren)' : 'ℹ️  Kein Push ausgeführt.');
  return lines.join('\n');
}
