import { countBySeverity, hasBlocking } from './checks/check.ts';
import { nowIso } from './state.ts';
import type { CheckContext, Finding, ShinonCheck } from './checks/check.ts';
import type { GateEnforcement } from './config.ts';
import type { GateSnapshot } from './state.ts';

/**
 * ShinonGate — der Prüfer.
 *
 * Das Gate prüft nicht „die Welt", sondern lädt spezialisierte Prüfklassen, führt sie in
 * Registry-Reihenfolge aus und sammelt deren Befunde. Es kennt keine konkrete Prüfung und trifft
 * keine inhaltliche Entscheidung: es entscheidet ausschließlich, ob die gesammelte Befundlage den
 * Schritt freigibt. Fail-Fast: scheitert eine billige Prüfung, werden teure Prüfungen
 * (Typecheck/Tests/Build) übersprungen und im Bericht als übersprungen ausgewiesen.
 */

interface CheckOutcome {
  id: string;
  title: string;
  ok: boolean;
  skipped: boolean;
  durationMs: number;
  findings: Finding[];
}

export interface GateReport {
  phase: string;
  /** Modus, unter dem das Urteil fiel — `strict` ⇒ Warnungen waren blockierend. */
  enforcement: GateEnforcement;
  passed: boolean;
  ranAt: string;
  durationMs: number;
  findings: Finding[];
  outcomes: CheckOutcome[];
}

interface GateOptions {
  /** true ⇒ Ausgabe auf Fehler/Warnungen reduzieren. */
  quiet?: boolean;
  /** true ⇒ Bericht als JSON (maschinenlesbar). */
  json?: boolean;
}

export class ShinonGate {
  private readonly checks: ShinonCheck[];

  constructor(checks: ShinonCheck[]) {
    this.checks = checks;
  }

  list(): Array<{ id: string; title: string }> {
    return this.checks.map((check) => ({ id: check.id, title: check.title }));
  }

  async run(ctx: CheckContext): Promise<GateReport> {
    const startedAt = Date.now();
    const outcomes: CheckOutcome[] = [];
    const findings: Finding[] = [];
    const enforcement = ctx.config.gate.enforcement;
    let blocked = false;

    for (const check of this.checks) {
      if (blocked && ctx.config.gate.failFast && check.expensive === true) {
        outcomes.push({ id: check.id, title: check.title, ok: true, skipped: true, durationMs: 0, findings: [] });
        continue;
      }

      if (!ctx.quiet) process.stdout.write(`⏺ ${check.title} …\n`);
      const checkStart = Date.now();
      const checkFindings = await check.run(ctx);
      blocked = blocked || hasBlocking(checkFindings, enforcement);
      outcomes.push({
        id: check.id,
        title: check.title,
        ok: !hasBlocking(checkFindings, enforcement),
        skipped: false,
        durationMs: Date.now() - checkStart,
        findings: checkFindings,
      });
      findings.push(...checkFindings);
    }

    return {
      phase: ctx.phase,
      enforcement,
      passed: !hasBlocking(findings, enforcement),
      ranAt: nowIso(),
      durationMs: Date.now() - startedAt,
      findings,
      outcomes,
    };
  }
}

export function snapshotOf(report: GateReport): GateSnapshot {
  return {
    phase: report.phase,
    passed: report.passed,
    enforcement: report.enforcement,
    errors: countBySeverity(report.findings, 'error'),
    warnings: countBySeverity(report.findings, 'warn'),
    durationMs: report.durationMs,
    ranAt: report.ranAt,
  };
}

const ICON = { ok: '✅', bad: '❌', skipped: '⏭️' } as const;

export function formatGateReport(report: GateReport, options: GateOptions = {}): string {
  if (options.json === true) return JSON.stringify(report, null, 2);

  const lines: string[] = [];
  const mode = report.enforcement === 'strict' ? 'ENFORCEMENT (Warnungen blockieren)' : 'advisory (nur Fehler)';
  lines.push(`⛩️  Shinon Gate — Phase: ${report.phase} · Modus: ${mode}`);
  lines.push('================================');

  for (const outcome of report.outcomes) {
    const state = outcome.skipped ? ICON.skipped : outcome.ok ? ICON.ok : ICON.bad;
    const detail = outcome.skipped
      ? 'übersprungen (Fail-Fast)'
      : `${outcome.findings.filter((item) => item.severity === 'error').length} Fehler, ` +
        `${outcome.findings.filter((item) => item.severity === 'warn').length} Warnungen, ${outcome.durationMs} ms`;
    lines.push(`${state} ${outcome.title} — ${detail}`);
  }

  const relevant = report.findings.filter(
    (item) => item.severity === 'error' || item.severity === 'warn' || !options.quiet,
  );
  if (relevant.length > 0) {
    lines.push('');
    for (const item of relevant) {
      const mark = item.severity === 'error' ? '❌' : item.severity === 'warn' ? '⚠️' : '·';
      const location = item.file ? ` [${item.file}${item.line ? `:${item.line}` : ''}]` : '';
      lines.push(`${mark} ${item.check}/${item.code}${location}: ${item.message}`);
    }
  }

  const errors = countBySeverity(report.findings, 'error');
  const warnings = countBySeverity(report.findings, 'warn');
  lines.push('');
  if (report.passed) {
    lines.push(`✨ GATE OFFEN (${report.durationMs} ms, ${warnings} Warnungen)`);
  } else if (errors === 0) {
    lines.push(`🛑 GATE GESCHLOSSEN (Enforcement) — ${warnings} Warnungen blockieren, 0 Fehler`);
  } else {
    lines.push(`🛑 GATE GESCHLOSSEN — ${errors} Fehler, ${warnings} Warnungen`);
  }
  return lines.join('\n');
}
