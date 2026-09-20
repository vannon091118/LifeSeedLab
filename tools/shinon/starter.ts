import fs from 'node:fs';
import path from 'node:path';
import { createCheckContext } from './context.ts';
import { buildChecks, codeLineCount } from './checks/index.ts';
import { ShinonGate, formatGateReport, snapshotOf } from './gate.ts';
import type { ShinonConfig } from './config.ts';
import type { ShinonGitHelfer } from './git-helfer.ts';
import type { GateReport } from './gate.ts';
import type { ShinonState, ShinonStateStore } from './state.ts';

/**
 * ShinonStarter — bereitet den Zustand vor dem Commit auf.
 *
 * Er liest den realen Projektstatus (Repository, Arbeitsbaum, Modulgrößen, letzte Gate-/Commit-/
 * Push-Lage) und schreibt daraus einen Statusblock in die README — niemals Prosa, immer Messwerte.
 * Danach läuft das Gate im Preflight. Der Starter entscheidet nichts: er bereitet vor und reicht
 * das Ergebnis an das Gate weiter.
 */

interface LocHotspot {
  file: string;
  lines: number;
  cap: number;
  label: string;
  ratio: number;
}

interface ProjectStatus {
  branch: string | null;
  headHash: string | null;
  headSubject: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
  clean: boolean;
  diff: { files: number; insertions: number; deletions: number };
  hotspots: LocHotspot[];
  state: ShinonState;
}

interface ReadmeUpdate {
  file: string;
  updated: boolean;
  mode: 'in-place' | 'appended' | 'skipped';
  block: string;
}

interface PrepareResult {
  status: ProjectStatus;
  readme: ReadmeUpdate;
  report: GateReport | null;
}

const MAX_HOTSPOT_SCAN = 4000;

export class ShinonStarter {
  private readonly git: ShinonGitHelfer;
  private readonly config: ShinonConfig;
  private readonly state: ShinonStateStore;

  constructor(git: ShinonGitHelfer, config: ShinonConfig, state: ShinonStateStore) {
    this.git = git;
    this.config = config;
    this.state = state;
  }

  collect(): ProjectStatus {
    const status = this.git.status();
    const branch = this.git.currentBranch() ?? this.config.push.branch;
    const aheadBehind = this.git.aheadBehind(this.config.push.remote, branch);
    return {
      branch: this.git.currentBranch(),
      headHash: this.git.headHash(true),
      headSubject: this.git.headSubject(),
      upstream: aheadBehind.upstream,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      staged: status.staged.length,
      modified: status.modified.length,
      untracked: status.untracked.length,
      clean: status.clean,
      diff: this.git.diffStats(),
      hotspots: this.hotspots(),
      state: this.state.read(),
    };
  }

  /** Größte Module relativ zu ihrem Cap — die ehrlichste Antwort auf „wo wird es eng?". */
  hotspots(): LocHotspot[] {
    const found: LocHotspot[] = [];
    for (const rule of this.config.gate.locCaps) {
      const directory = path.resolve(this.git.root, rule.path);
      if (!fs.existsSync(directory)) continue;
      const entries = fs.readdirSync(directory, { recursive: true, encoding: 'utf8' });
      let scanned = 0;
      for (const entry of entries) {
        if (scanned >= MAX_HOTSPOT_SCAN) break;
        const relative = `${rule.path}${entry.split(path.sep).join('/')}`;
        if (!this.config.gate.fileExtensions.some((extension) => relative.endsWith(extension))) continue;
        if (/\.test\.[tj]sx?$/.test(relative)) continue;
        const absolute = path.resolve(this.git.root, relative);
        const lines = codeLineCount(absolute);
        scanned += 1;
        found.push({ file: relative, lines, cap: rule.cap, label: rule.label, ratio: lines / rule.cap });
      }
    }
    return found.sort((a, b) => b.ratio - a.ratio).slice(0, this.config.starter.hotspots);
  }

  renderBlock(status: ProjectStatus): string {
    const { beginMarker, endMarker } = this.config.starter;
    const branch = status.branch ?? '(detached HEAD)';
    const upstream = status.upstream ? `\`${status.upstream}\` (+${status.ahead}/-${status.behind})` : 'kein Upstream';
    const tree = status.clean
      ? 'sauber'
      : `${status.staged} gestaged, ${status.modified} geändert, ${status.untracked} neu`;
    const gate = status.state.lastGate
      ? `${status.state.lastGate.passed ? '✅ offen' : '🛑 geschlossen'} (${status.state.lastGate.phase}, ` +
        `${status.state.lastGate.errors} Fehler, ${status.state.lastGate.warnings} Warnungen)`
      : 'noch kein Lauf';
    const commit = status.state.lastCommit
      ? `\`${status.state.lastCommit.hash.slice(0, 7)}\` ${status.state.lastCommit.subject}`
      : 'noch keiner';
    const push = status.state.lastPush
      ? `${status.state.lastPush.ok ? '✅' : '🛑'} ${status.state.lastPush.remote}/${status.state.lastPush.branch}`
      : 'noch keiner';
    const hotspots =
      status.hotspots.length === 0
        ? '—'
        : status.hotspots
            .map((spot) => `\`${spot.file}\` ${spot.lines}/${spot.cap} (${Math.round(spot.ratio * 100)} %)`)
            .join('<br>');

    return [
      beginMarker,
      '_Automatisch von Shinon aus dem realen Repository-Status erzeugt — nicht manuell pflegen._',
      '',
      '| Kennzahl | Stand |',
      '|---|---|',
      `| Branch | \`${branch}\` · Upstream: ${upstream} |`,
      `| HEAD | \`${status.headHash ?? '—'}\` — ${status.headSubject || 'kein Commit'} |`,
      `| Arbeitsbaum | ${tree} |`,
      `| Letztes Gate | ${gate} |`,
      // Der Modus kommt aus der **live geladenen** Konfiguration, nicht aus dem State — der Block
      // soll zeigen, unter welchem Vertrag als Nächstes geprüft wird, nicht was irgendwann galt.
      `| Gate-Modus | ${
        this.config.gate.enforcement === 'strict'
          ? '🔒 Enforcement — Warnungen blockieren wie Fehler'
          : '🔓 advisory — nur Fehler blockieren'
      } |`,
      `| Letzter Shinon-Commit | ${commit} |`,
      `| Letzter Push | ${push} |`,
      `| LOC-Hotspots | ${hotspots} |`,
      endMarker,
    ].join('\n');
  }

  updateReadme(block: string): ReadmeUpdate {
    const file = path.resolve(this.git.root, this.config.starter.readme);
    if (!fs.existsSync(file)) return { file, updated: false, mode: 'skipped', block };

    const content = fs.readFileSync(file, 'utf8');
    const { beginMarker, endMarker } = this.config.starter;
    const start = content.indexOf(beginMarker);
    const end = content.indexOf(endMarker);

    if (start !== -1 && end > start) {
      const next = `${content.slice(0, start)}${block}${content.slice(end + endMarker.length)}`;
      if (next === content) return { file, updated: false, mode: 'in-place', block };
      fs.writeFileSync(file, next, 'utf8');
      return { file, updated: true, mode: 'in-place', block };
    }

    const appended = `${content.trimEnd()}\n\n${this.config.starter.sectionTitle}\n\n${block}\n`;
    fs.writeFileSync(file, appended, 'utf8');
    return { file, updated: true, mode: 'appended', block };
  }

  /** Aktualisiert die README und lässt anschließend das Gate im Preflight laufen. */
  async prepare(options: { quiet?: boolean; runGate?: boolean; only?: string[] } = {}): Promise<PrepareResult> {
    const status = this.collect();
    const readme = this.updateReadme(this.renderBlock(status));

    if (options.runGate === false) {
      return { status, readme, report: null };
    }

    const ctx = createCheckContext(this.git, this.config, { phase: 'preflight', quiet: options.quiet ?? false });
    const gate = new ShinonGate(buildChecks(this.config, options.only ?? []));
    const report = await gate.run(ctx);
    this.state.patch({ lastGate: snapshotOf(report) });
    return { status, readme, report };
  }
}

export function formatPrepareResult(result: PrepareResult, quiet: boolean): string {
  const lines: string[] = [];
  lines.push(
    `🧭 Shinon Starter — Branch ${result.status.branch ?? '(detached)'}, HEAD ${result.status.headHash ?? '—'}`,
  );
  lines.push(
    `   Arbeitsbaum: ${result.status.clean ? 'sauber' : 'verändert'} · README: ${
      result.readme.updated ? `aktualisiert (${result.readme.mode})` : 'unverändert'
    }`,
  );
  if (result.report) {
    lines.push('');
    lines.push(formatGateReport(result.report, { quiet }));
  }
  return lines.join('\n');
}
