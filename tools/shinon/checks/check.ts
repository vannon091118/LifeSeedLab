import fs from 'node:fs';
import path from 'node:path';
import type { GateEnforcement, ShinonConfig } from '../config.ts';
import type { ShinonGitHelfer } from '../git-helfer.ts';

/**
 * Vertrag der Prüfklassen. Jede Prüfung bekommt denselben Kontext und liefert ausschließlich
 * Befunde (Findings) zurück — sie entscheidet nichts, sie schreibt nichts, sie bricht nichts ab.
 * Erst ShinonGate wertet die gesammelten Befunde aus.
 */

/**
 * Gate-Phasen. Jede Phase entspricht einem Git-Hook, der das Gate tatsächlich aufruft:
 *
 *   preflight     Starter (prepare) — Arbeitsbaum, ungetrackte Quellen
 *   pre-commit    git commit         — der Index ist das, was committet würde
 *   pre-push      git push           — der Branch verlässt den Rechner
 *   pre-merge     git merge          — der Merge-Commit entsteht
 *   pre-rebase    git rebase         — die Kette wird umgeschrieben
 *
 * Die Phasen sind nicht synonym: `pre-commit` ist die EINZIGE Phase, in der der Index die
 * Aussage „das würde committet" trägt. In allen anderen Phasen ist der Index bereits gefüllt
 * (Merge) oder gar nicht der Gegenstand (Push, Preflight) — indexgebundene Prüfungen wie
 * `commit-size` und `version-files` schalten sich dort ab, statt zu false-positiven.
 *
 * Gemessen an git 2.53: bei `git merge` feuert `pre-commit` NICHT, bei `git rebase` weder
 * `pre-commit` noch `commit-msg` — beide Aktionen liefen damit durch kein Gate.
 */
export type ShinonPhase = 'preflight' | 'pre-commit' | 'pre-push' | 'pre-merge' | 'pre-rebase';

/** Phasen, in denen Git einen Merge- oder Rebase-Vorgang vorbereitet. */
export const MERGE_PHASES: ReadonlySet<ShinonPhase> = new Set<ShinonPhase>(['pre-merge', 'pre-rebase']);

/** true ⇔ in dieser Phase beschreibt der Index genau den beabsichtigten Commit. */
export function isCommitPhase(phase: ShinonPhase): boolean {
  return phase === 'pre-commit';
}

export type Severity = 'error' | 'warn' | 'info';

export interface Finding {
  check: string;
  code: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
}

export interface CheckContext {
  root: string;
  git: ShinonGitHelfer;
  config: ShinonConfig;
  phase: ShinonPhase;
  /** Staged Dateien (Index) — Basis der Commit-Gates. */
  stagedFiles: string[];
  /** Alle Änderungen gegenüber HEAD — Basis der Preflight-Gates. */
  changedFiles: string[];
  /** Zu prüfende Commit-Nachricht (nur im commit-msg-Kontext). */
  message?: string;
  /** true ⇒ keine Live-Ausgabe der Kindprozesse. */
  quiet: boolean;
}

export interface ShinonCheck {
  readonly id: string;
  readonly title: string;
  /** Teure Prüfungen werden bei Fail-Fast nicht mehr gestartet, wenn vorher Fehler auftraten. */
  readonly expensive?: boolean;
  run(ctx: CheckContext): Promise<Finding[]> | Finding[];
}

export function finding(
  check: string,
  code: string,
  message: string,
  extra: Partial<Finding> = {},
): Finding {
  return { check, code, severity: 'error', message, ...extra };
}

export function hasErrors(findings: Finding[]): boolean {
  return findings.some((item) => item.severity === 'error');
}

/**
 * Blockierend ist ein Befund, wenn er ein Fehler ist — oder wenn das Gate im Enforcement-Modus
 * läuft und der Befund eine Warnung ist. **EINE** Regel für Fail-Fast, Einzelurteil und
 * Gesamtentscheidung; sonst driften Entscheidung und Bericht auseinander.
 */
export function isBlocking(finding: Finding, enforcement: GateEnforcement): boolean {
  return finding.severity === 'error' || (enforcement === 'strict' && finding.severity === 'warn');
}

export function hasBlocking(findings: Finding[], enforcement: GateEnforcement): boolean {
  return findings.some((item) => isBlocking(item, enforcement));
}

export function countBySeverity(findings: Finding[], severity: Severity): number {
  return findings.filter((item) => item.severity === severity).length;
}

/** Ziel-Dateien des Gates: im Commit kontext der Index, im Preflight der Stand gegen HEAD. */
export function targetFiles(ctx: CheckContext): string[] {
  const raw = ctx.phase === 'pre-commit' && ctx.stagedFiles.length > 0 ? ctx.stagedFiles : ctx.changedFiles;
  const extensions = ctx.config.gate.fileExtensions;
  const unique = new Set<string>();
  for (const file of raw) {
    if (!extensions.some((extension) => file.endsWith(extension))) continue;
    if (!fs.existsSync(path.resolve(ctx.root, file))) continue;
    unique.add(file);
  }
  return [...unique].sort();
}

/**
 * LOC-Regel (AGENTS.md): gezählt werden CODE-Zeilen — Kommentare und Leerzeilen zählen NICHT.
 * Kommentarzeilen sind Zeilen, die (getrimmt) mit zwei Schrägstrichen, einem Stern oder einem
 * Schrägstrich-Stern beginnen; mehrzeilige Kommentare werden über den Zustand inBlock verfolgt.
 * So belohnt das Gate Dokumentation, während gewachsene Logik weiter am Cap anschlägt.
 */
export function codeLineCount(absolutePath: string): number {
  const content = fs.readFileSync(absolutePath, 'utf8');
  let inBlock = false;
  let code = 0;
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line === '') continue;
    if (line.startsWith('//') || line.startsWith('*')) continue;
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    code++;
  }
  return code;
}

export function lineCount(absolutePath: string): number {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.length;
}

/** Letzte Zeilen einer Prozessausgabe — für knappe Fehlerberichte. */
export function tail(text: string, lines = 25): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line !== '')
    .slice(-lines)
    .join('\n');
}
