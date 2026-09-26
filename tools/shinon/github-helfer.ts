import type { CommandResult, SpawnOptions } from './runner.ts';

/**
 * GitHub-Teil des Git-Helfers: Authentifizierung und Repository-Verwaltung über `gh`.
 *
 * Der Runner wird von außen hereingereicht, damit dieses Modul nichts über Git wissen muss — die
 * Fassade `ShinonGitHelfer` bleibt trotzdem der einzige Einstieg für Git und `gh` zusammen.
 */

type GhRunner = (args: string[], options?: SpawnOptions) => CommandResult;

export interface AuthStatus {
  ok: boolean;
  user: string | null;
  message: string;
}

export interface RepoView {
  exists: boolean;
  visibility: string | null;
  message: string;
}

export interface CreateRepoOptions {
  slug: string;
  private?: boolean;
  description?: string;
  sourceRoot?: string;
}

export class GitHubHelfer {
  private readonly run: GhRunner;

  constructor(run: GhRunner) {
    this.run = run;
  }

  available(): boolean {
    return this.run(['--version']).ok;
  }

  authStatus(): AuthStatus {
    if (!this.available()) return { ok: false, user: null, message: 'gh ist nicht installiert' };
    const result = this.run(['auth', 'status']);
    if (result.ok) {
      const match = /account\s+(\S+)/.exec(result.stdout) ?? /account\s+(\S+)/.exec(result.stderr);
      return { ok: true, user: match ? (match[1] as string) : null, message: 'gh ist authentifiziert' };
    }
    return { ok: false, user: null, message: result.stderr.trim() || 'gh ist nicht authentifiziert' };
  }

  repoView(slug: string): RepoView {
    const result = this.run(['repo', 'view', slug, '--json', 'visibility,url']);
    if (!result.ok) return { exists: false, visibility: null, message: result.stderr.trim() };
    try {
      const parsed = JSON.parse(result.stdout) as { visibility?: string };
      return { exists: true, visibility: parsed.visibility ?? null, message: 'Repository gefunden' };
    } catch {
      return { exists: true, visibility: null, message: 'Repository gefunden' };
    }
  }

  createRepo(options: CreateRepoOptions): CommandResult {
    const args = ['repo', 'create', options.slug];
    args.push(options.private === false ? '--public' : '--private');
    if (options.description) args.push('--description', options.description);
    if (options.sourceRoot) args.push('--source', options.sourceRoot);
    return this.run(args);
  }

  /**
   * PR-Aktionen. Sie liegen hier, nicht in `pr-helfer.ts`, weil sie denselben `gh`-Runner
   * benutzen und sonst ein zweiter Ort entstünde, von dem aus `gh` aufgerufen wird.
   */
  prCreate(args: string[]): CommandResult {
    return this.run(args);
  }

  prMerge(args: string[]): CommandResult {
    return this.run(args);
  }

  /** Roh-Ausgabe von `gh pr view` für den Branch (z. B. die PR-URL). */
  prView(branch: string): CommandResult {
    return this.run(['pr', 'view', branch, '--json', 'number,mergeable,mergeStateStatus,url']);
  }

  /**
   * Merge-Status eines PRs — die beiden `gh`-Felder sind getrennt, weil sie verschiedene
   * Wertmengen tragen: `mergeable` (MERGEABLE / CONFLICTING / UNKNOWN) sagt, ob der Merge
   * geometrisch möglich ist, `mergeStateStatus` (CLEAN / DIRTY / BEHIND / UNSTABLE / UNKNOWN)
   * sagt, ob der Ziel-Branch auf einem sauberen Stand liegt. Beide sind `null`, wenn `gh`
   * nichts geliefert hat — `null` ist bewusst KEIN grünes Signal.
   *
   * Hier gemessener Bug-Fix: die frühere Variante hat `mergeable ?? mergeStateStatus` in
   * einem Feld vermischt und das Ergebnis dann mit `CLEAN` verglichen — die Werte passen nie
   * zusammen, und jeder PR (auch CLEAN) ist so blockiert worden.
   */
  prStatus(number: string): { mergeable: string | null; mergeStateStatus: string | null } {
    const result = this.run(['pr', 'view', number, '--json', 'mergeable,mergeStateStatus']);
    if (!result.ok) return { mergeable: null, mergeStateStatus: null };
    try {
      const parsed = JSON.parse(result.stdout) as { mergeable?: string; mergeStateStatus?: string };
      return {
        mergeable: parsed.mergeable !== undefined ? String(parsed.mergeable) : null,
        mergeStateStatus: parsed.mergeStateStatus !== undefined ? String(parsed.mergeStateStatus) : null,
      };
    } catch {
      return { mergeable: null, mergeStateStatus: null };
    }
  }

  /** `owner/repo` aus einer GitHub-Remote-URL (ssh oder https). */
  static slugFromRemote(url: string | null): string | null {
    if (url === null) return null;
    const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url.trim());
    return match ? (match[1] as string) : null;
  }
}
