import { formatGateReport } from './gate.ts';
import { validateMergeMessage } from './checks/merge-message-check.ts';
import type { GitHubHelfer } from './github-helfer.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';
import type { ShinonConfig } from './config.ts';

/**
 * PrHelfer — `gh pr create` und `gh pr merge`, beide durch die Gate-Logik.
 *
 * Die Regel, die hier steht und nirgends sonst: **ein PR entsteht aus einem Gate-lauf, ein PR
 * gemergt wird in einen Gate-lauf.** Der `pr create`-Zweig prüft, dass der zu pushende Stand
 * überhaupt eine Nachricht mit Begründung besitzt; der `pr merge`-Zweig verweigert den Merge,
 * solange der Ziel-Branch nicht auf demselben grünen Stand ist wie der PR-Kopf. Genau daran
 * scheitert die übliche Abkürzung „PR ist grün, also passt das schon".
 *
 * Begründung der Body-Pflicht: `workflow.pr.bodyTemplate` ist kein Textbaustein-Feature, sondern
 * die Antwort auf die Beobachtung aus Phase 1 — `gh pr merge --squash` schreibt aus dem
 * PR-Body eine Commit-Nachricht. Ein leerer PR-Body erzeugt also einen leeren Squash-Commit,
 * und genau den fängt MSG010 ab. Die Kette ist: leere Pflichtfelder ⇒ leerer Commit.
 */

export interface PrBodyResult {
  ok: boolean;
  body: string;
  missing: string[];
  message: string;
}

export interface PrCreateResult {
  ok: boolean;
  url: string | null;
  steps: Array<{ label: string; ok: boolean; detail: string }>;
  message: string;
}

export interface PrMergeResult {
  ok: boolean;
  steps: Array<{ label: string; ok: boolean; detail: string }>;
  message: string;
}

interface PrCreateOptions {
  base?: string;
  title?: string;
  body?: string;
  draft?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
}

interface PrMergeOptions {
  number?: string;
  method?: string;
  deleteBranch?: boolean;
  dryRun?: boolean;
  quiet?: boolean;
}

/** Die Pflichtüberschriften aus der Konfiguration — an den Zeilenanfängen, nicht an Fließtext. */
function requiredHeadings(template: string): string[] {
  return template
    .split('\n')
    .map((line) => /^##\s+(.+)$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => (match[1] ?? '').trim())
    .filter((heading) => heading !== '');
}

export class PrHelfer {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;
  private readonly github: GitHubHelfer;

  constructor(git: ShinonGitHelfer, config: ShinonConfig, github: GitHubHelfer) {
    this.git = git;
    this.config = config;
    this.github = github;
  }

  /**
   * Baut den PR-Body und prüft ihn gegen `workflow.pr.bodyTemplate`. Fehlende Überschriften sind
   * ein Fehler, nicht ein Hinweis: der Squash-Commit erbt genau diesen Text.
   */
  buildBody(body: string | undefined): PrBodyResult {
    const template = this.config.workflow.pr.bodyTemplate;
    const text = (body ?? '').trim();
    const missing = requiredHeadings(template).filter(
      (heading) => !new RegExp(`^#{1,3}\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(text),
    );
    if (missing.length > 0) {
      return {
        ok: false,
        body: text,
        missing,
        message:
          `PR-Body ohne Pflichtabschnitt(e): ${missing.join(', ')}. ` +
          'Der Squash-Commit erbt genau diesen Text — eine Lücke hier ist eine Lücke in der Historie.',
      };
    }
    if (text === '') {
      return { ok: false, body: text, missing: requiredHeadings(template), message: 'PR-Body ist leer' };
    }
    return { ok: true, body: text, missing: [], message: 'PR-Body vollständig' };
  }

  async create(options: PrCreateOptions = {}): Promise<PrCreateResult> {
    const steps: Array<{ label: string; ok: boolean; detail: string }> = [];
    if (!this.config.workflow.pr.enabled) {
      return { ok: false, url: null, steps, message: 'PR deaktiviert (workflow.pr.enabled=false)' };
    }

    const branch = this.git.currentBranch();
    if (branch === null) return { ok: false, url: null, steps, message: 'Detached HEAD — kein PR-Quell-Branch' };
    steps.push({ label: 'Quell-Branch', ok: true, detail: branch });

    const base = options.base ?? this.config.workflow.merge.base;
    steps.push({ label: 'Ziel-Branch', ok: true, detail: base });

    const body = this.buildBody(options.body);
    steps.push({ label: 'PR-Body', ok: body.ok, detail: body.ok ? 'vollständig' : body.message });
    if (!body.ok) return { ok: false, url: null, steps, message: body.message };

    // Die Commit-Nachricht des Branch-Kopfes ist die Rohfassung des PR-Bodies. Fehlt der Body
    // dort (Gits Einzeiler), hat der PR keine Begründung, die ein Squash übernehmen könnte.
    const headSubject = this.git.headSubject();
    const headMessage = this.git.git(['log', '-1', '--pretty=%B']).stdout.trim();
    const mergeView = validateMergeMessage(headMessage === '' ? headSubject : headMessage, this.config);
    const blocked = mergeView.filter((item) => item.severity === 'error');
    steps.push({
      label: 'Kopf-Commit',
      ok: blocked.length === 0,
      detail: blocked.length === 0 ? headSubject : blocked.map((item) => item.code).join(', '),
    });

    const title = options.title ?? headSubject;
    const args = ['pr', 'create', '--base', base, '--head', branch, '--title', title, '--body', body.body];
    if (options.draft === true) args.push('--draft');

    if (options.dryRun === true) {
      steps.push({ label: 'gh pr create', ok: true, detail: 'Probelauf' });
      return { ok: true, url: null, steps, message: `Probelauf: PR ${base} ← ${branch}` };
    }

    const result = this.github.prCreate(args);
    if (!result.ok) {
      steps.push({ label: 'gh pr create', ok: false, detail: result.stderr.trim() || 'fehlgeschlagen' });
      return { ok: false, url: null, steps, message: 'PR-Erstellung fehlgeschlagen' };
    }
    const url = extractUrl(result.stdout);
    steps.push({ label: 'gh pr create', ok: true, detail: url ?? 'angelegt' });
    return { ok: true, url, steps, message: url === null ? `PR für ${branch} angelegt` : `PR angelegt: ${url}` };
  }

  /**
   * `gh pr merge` — mit der Bedingung, dass der Ziel-Branch auf dem grünen Stand des PR-Kopfes
   * steht. Sonst merged man nicht den geprüften Code, sondern einen Stand von vor der Prüfung.
   */
  async merge(options: PrMergeOptions = {}): Promise<PrMergeResult> {
    const steps: Array<{ label: string; ok: boolean; detail: string }> = [];
    if (!this.config.workflow.pr.enabled) {
      return { ok: false, steps, message: 'PR-Merge deaktiviert (workflow.pr.enabled=false)' };
    }
    if (!this.github.available()) {
      return { ok: false, steps, message: 'gh nicht verfügbar — PR-Merge nicht möglich' };
    }

    const number = options.number ?? this.openPrNumber();
    if (number === null) {
      return { ok: false, steps, message: 'Kein offener PR für den aktuellen Branch gefunden' };
    }
    steps.push({ label: 'PR', ok: true, detail: `#${number}` });

    if (this.config.workflow.pr.requireGreenBranch) {
      const head = this.git.headHash() ?? '';
      const base = this.config.workflow.merge.base;
      const state = this.github.prStatus(number);
      const stateDetail = state.mergeStateStatus ?? 'unbekannt';
      // Fail-closed, getrennte Wertmengen: `mergeable` sagt Konflikt (CONFLICTING),
      // `mergeStateStatus` sagt Stand (nur CLEAN ist grün — DIRTY/BEHIND/UNSTABLE heißt,
      // der Ziel-Branch ist nicht mehr der geprüfte Stand). Ein nicht beantworteter Status
      // darf keinen Merge freigeben.
      if (state.mergeable === 'CONFLICTING') {
        steps.push({ label: 'Ziel-Branch', ok: false, detail: 'mergeable=CONFLICTING' });
        return { ok: false, steps, message: `PR #${number} hat Konflikte (mergeable=CONFLICTING)` };
      }
      if (state.mergeStateStatus !== 'CLEAN') {
        steps.push({ label: 'Ziel-Branch', ok: false, detail: `mergeStateStatus=${stateDetail}` });
        return { ok: false, steps, message: `PR #${number} ist nicht auf einem sauberen Stand (mergeStateStatus=${stateDetail})` };
      }
      steps.push({ label: 'Ziel-Branch', ok: true, detail: `mergeStateStatus=CLEAN` });
      steps.push({ label: 'Stand', ok: true, detail: `${head.slice(0, 8)} → ${base}` });
    }

    const method = options.method ?? this.config.workflow.pr.defaultMethod;
    const args = ['pr', 'merge', number, '--merge-method', method];
    if (options.deleteBranch === true) args.push('--delete-branch');
    if (options.dryRun === true) {
      steps.push({ label: 'gh pr merge', ok: true, detail: `Probelauf (${method})` });
      return { ok: true, steps, message: `Probelauf: PR #${number} → ${method}` };
    }

    const result = this.github.prMerge(args);
    if (!result.ok) {
      steps.push({ label: 'gh pr merge', ok: false, detail: result.stderr.trim() || 'fehlgeschlagen' });
      return { ok: false, steps, message: `Merge von PR #${number} fehlgeschlagen` };
    }
    steps.push({ label: 'gh pr merge', ok: true, detail: method });
    return { ok: true, steps, message: `PR #${number} gemergt (${method})` };
  }

  /** Nummer des offenen PRs zum aktuellen Branch, oder null. */
  openPrNumber(): string | null {
    const branch = this.git.currentBranch();
    if (branch === null) return null;
    const result = this.github.prView(branch);
    if (!result.ok) return null;
    const match = /\/pull\/(\d+)/.exec(result.stdout);
    const number = match?.[1];
    return number === undefined ? null : number;
  }
}

function extractUrl(output: string): string | null {
  const match = /https?:\/\/\S+/.exec(output);
  return match?.[0] ?? null;
}

export function formatPrResult(result: PrCreateResult | PrMergeResult, options: { quiet?: boolean } = {}): string {
  const lines = result.steps.map((step) => `${step.ok ? '✅' : '❌'} ${step.label} — ${step.detail}`);
  lines.push('', `${result.ok ? '✅' : '🛑'} ${result.message}`);
  void options;
  return lines.join('\n');
}

export { formatGateReport };