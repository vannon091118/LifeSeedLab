import type { CommandResult, SpawnOptions } from './runner.ts';

/**
 * GitHub-Teil des Git-Helfers: Authentifizierung und Repository-Verwaltung über `gh`.
 *
 * Der Runner wird von außen hereingereicht, damit dieses Modul nichts über Git wissen muss — die
 * Fassade `ShinonGitHelfer` bleibt trotzdem der einzige Einstieg für Git und `gh` zusammen.
 */

export type GhRunner = (args: string[], options?: SpawnOptions) => CommandResult;

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

  /** `owner/repo` aus einer GitHub-Remote-URL (ssh oder https). */
  static slugFromRemote(url: string | null): string | null {
    if (url === null) return null;
    const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url.trim());
    return match ? (match[1] as string) : null;
  }
}
