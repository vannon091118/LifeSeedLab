import fs from 'node:fs';
import path from 'node:path';
import { runProcess } from './runner.ts';
import { GitHubHelfer } from './github-helfer.ts';
import type { CommandResult, SpawnOptions } from './runner.ts';
import type { AuthStatus, CreateRepoOptions, RepoView } from './github-helfer.ts';

export type { CommandResult, SpawnOptions } from './runner.ts';

/**
 * ShinonGitHelfer — kapselt Git und die GitHub-CLI hinter einer einzigen Schnittstelle.
 *
 * Kein anderes Modul ruft `git`, `gh` oder einen Prozess direkt auf. Damit existiert genau ein Ort,
 * an dem Repository-Zustand festgestellt, initialisiert, Remote/Authentifizierung geprüft, lokal
 * gelesen, committet und gepusht wird. Prozessausführung liegt in `runner.ts`, der GitHub-Teil in
 * `github-helfer.ts` — die Fassade bleibt trotzdem diese Klasse.
 */

interface RemoteRef {
  name: string;
  url: string;
}

interface GitStatus {
  staged: string[];
  modified: string[];
  untracked: string[];
  clean: boolean;
}

interface AheadBehind {
  ahead: number;
  behind: number;
  upstream: string | null;
}

interface PushOptions {
  remote?: string;
  branch?: string;
  dryRun?: boolean;
  setUpstream?: boolean;
}

interface PushResult {
  ok: boolean;
  pushed: boolean;
  label: string;
  detail: string;
  stdout: string;
  stderr: string;
}

export class ShinonGitHelfer {
  readonly root: string;
  private readonly github: GitHubHelfer;

  constructor(root: string) {
    this.root = path.resolve(root);
    this.github = new GitHubHelfer((args, options) => this.gh(args, options));
  }

  /** Ermittelt das Repository-Root ab einem Startverzeichnis. */
  static detectRoot(startDir: string): string | null {
    const result = runProcess('git', ['rev-parse', '--show-toplevel'], { cwd: startDir });
    const value = result.stdout.trim();
    return result.ok && value !== '' ? value : null;
  }

  spawn(command: string, args: string[], options: SpawnOptions = {}): CommandResult {
    return runProcess(command, args, { ...options, cwd: options.cwd ?? this.root });
  }

  git(args: string[], options: SpawnOptions = {}): CommandResult {
    return this.spawn('git', args, options);
  }

  gh(args: string[], options: SpawnOptions = {}): CommandResult {
    return this.spawn('gh', args, options);
  }

  // --- Lokaler Zustand (read-only) -------------------------------------------------------

  isRepository(): boolean {
    return this.git(['rev-parse', '--git-dir']).ok;
  }

  hasCommits(): boolean {
    return this.git(['rev-parse', '--verify', 'HEAD']).ok;
  }

  currentBranch(): string | null {
    const result = this.git(['branch', '--show-current']);
    const value = result.stdout.trim();
    return result.ok && value !== '' ? value : null;
  }

  headHash(short = false): string | null {
    const result = this.git(short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']);
    const value = result.stdout.trim();
    return result.ok && value !== '' ? value : null;
  }

  headSubject(): string {
    return this.git(['log', '-1', '--pretty=%s']).stdout.trim();
  }

  log(limit = 5): string[] {
    return this.git(['log', `-${limit}`, '--pretty=%h %s'])
      .stdout.split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
  }

  status(): GitStatus {
    const tokens = this.git(['status', '--porcelain=v1', '-z']).stdout.split('\0');
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (let index = 0; index < tokens.length; index += 1) {
      const entry = tokens[index];
      if (entry === undefined || entry.length < 4) continue;
      const indexState = entry[0] ?? ' ';
      const workTreeState = entry[1] ?? ' ';
      const file = entry.slice(3);
      if (indexState === '?' && workTreeState === '?') {
        untracked.push(file);
        continue;
      }
      if (indexState !== ' ') staged.push(file);
      if (workTreeState !== ' ') modified.push(file);
      if (indexState === 'R' || indexState === 'C') index += 1; // Originalpfad überspringen
    }

    return { staged, modified, untracked, clean: staged.length + modified.length + untracked.length === 0 };
  }

  hasStagedChanges(): boolean {
    return !this.git(['diff', '--cached', '--quiet']).ok;
  }

  changedFiles(): string[] {
    if (!this.hasCommits()) return this.status().staged;
    return this.git(['diff', '--name-only', 'HEAD'])
      .stdout.split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');
  }

  upstreamRef(): string | null {
    const result = this.git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
    const value = result.stdout.trim();
    return result.ok && value !== '' ? value : null;
  }

  aheadBehind(remote: string, branch: string): AheadBehind {
    const upstream = this.upstreamRef();
    if (upstream === null) return { ahead: 0, behind: 0, upstream: null };
    const result = this.git(['rev-list', '--left-right', '--count', `${upstream}...HEAD`]);
    const [behindText, aheadText] = result.stdout.trim().split(/\s+/);
    const remoteRef = this.git(['rev-parse', '--verify', `${remote}/${branch}`]);
    return {
      ahead: result.ok ? Number(aheadText ?? 0) || 0 : 0,
      behind: result.ok ? Number(behindText ?? 0) || 0 : 0,
      upstream: remoteRef.ok ? upstream : null,
    };
  }

  remotes(): RemoteRef[] {
    const seen = new Map<string, string>();
    for (const line of this.git(['remote', '-v']).stdout.split('\n')) {
      const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim());
      if (match && !seen.has(match[1] as string)) seen.set(match[1] as string, match[2] as string);
    }
    return [...seen.entries()].map(([name, url]) => ({ name, url }));
  }

  remoteUrl(name: string): string | null {
    const result = this.git(['remote', 'get-url', name]);
    const value = result.stdout.trim();
    return result.ok && value !== '' ? value : null;
  }

  hooksPath(): string | null {
    const result = this.git(['config', '--get', 'core.hooksPath']);
    const value = result.stdout.trim();
    return result.ok && value !== '' ? value : null;
  }

  configSet(key: string, value: string): CommandResult {
    return this.git(['config', key, value]);
  }

  diffStats(): { files: number; insertions: number; deletions: number } {
    const args = this.hasStagedChanges() ? ['diff', '--cached', '--numstat'] : ['diff', '--numstat'];
    let insertions = 0;
    let deletions = 0;
    let files = 0;
    for (const line of this.git(args).stdout.split('\n')) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      files += 1;
      insertions += Number(parts[0]) || 0;
      deletions += Number(parts[1]) || 0;
    }
    return { files, insertions, deletions };
  }

  // --- Schreibende Operationen -----------------------------------------------------------

  initRepository(defaultBranch: string): CommandResult {
    const result = this.git(['init', `--initial-branch=${defaultBranch}`]);
    if (!result.ok) {
      this.git(['init']);
      this.git(['symbolic-ref', 'HEAD', `refs/heads/${defaultBranch}`]);
    }
    return result;
  }

  ensureRemote(name: string, url: string): { action: 'created' | 'updated' | 'unchanged'; url: string } {
    const current = this.remoteUrl(name);
    if (current === null) {
      this.git(['remote', 'add', name, url]);
      return { action: 'created', url };
    }
    if (current !== url) {
      this.git(['remote', 'set-url', name, url]);
      return { action: 'updated', url };
    }
    return { action: 'unchanged', url };
  }

  /** Der einzige Commit-Pfad: exakt dieser Inhalt, unverändert, via `git commit -F -`. */
  commitWithMessage(message: string): CommandResult {
    return this.git(['commit', '-F', '-', '--cleanup=verbatim'], { input: message });
  }

  push(options: PushOptions = {}): PushResult {
    const remote = options.remote ?? 'origin';
    const branch = options.branch ?? this.currentBranch() ?? 'main';
    const args = ['push'];
    if (options.dryRun) args.push('--dry-run');
    if (options.setUpstream) args.push('--set-upstream');
    args.push(remote, branch);
    const result = this.git(args);
    return {
      ok: result.ok,
      pushed: result.ok && !options.dryRun,
      label: result.label,
      detail: result.ok
        ? `Push nach ${remote}/${branch}${options.dryRun ? ' (Probelauf)' : ''} erfolgreich`
        : result.stderr.trim() || result.stdout.trim() || 'Push fehlgeschlagen',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  // --- GitHub (delegiert) ----------------------------------------------------------------

  ghAvailable(): boolean {
    return this.github.available();
  }

  ghAuthStatus(): AuthStatus {
    return this.github.authStatus();
  }

  ghRepoView(slug: string): RepoView {
    return this.github.repoView(slug);
  }

  ghCreateRepo(options: CreateRepoOptions): CommandResult {
    return this.github.createRepo(options);
  }

  static slugFromRemote(url: string | null): string | null {
    return GitHubHelfer.slugFromRemote(url);
  }

  readFile(relativePath: string): string | null {
    const file = path.resolve(this.root, relativePath);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  }

  writeFile(relativePath: string, content: string, mode?: number): string {
    const file = path.resolve(this.root, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
    if (mode !== undefined) fs.chmodSync(file, mode);
    return file;
  }
}
