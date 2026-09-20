import fs from 'node:fs';
import path from 'node:path';
import { finding } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';
import type { ShinonConfig } from '../config.ts';

/**
 * Commit-Nachricht: prüft die Sprache der Agenten (Conventional Commits oder Projekt-Präfix).
 * Die Regel ist konfigurationsgetrieben; Komponist und Gate rufen dieselbe Funktion auf, und die
 * Nachrichtendatei wird an genau einer Stelle gelesen — Hook-Gate und Commit-Pfad können damit
 * nicht auseinanderlaufen. Bei `commit.freeForm` wird nur auf Leerheit und Kommentarreste geprüft.
 */

export const CONVENTIONAL_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'build'];
/** Verpflichtende Mindestlänge für jede Commit-Nachricht; kurze Commit-Poesie ist kein Vertrag. */
export const MIN_COMMIT_WORDS = 200;

export function countMessageWords(message: string): number {
  return message.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

/** Agenten-Signaturen, die nie in die Historie dürfen (severity: 'error' — Gate schließt). */
const FORBIDDEN_FOOTERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^[\u{1F916}]?\s*Generated with\b/iu, label: '„Generated with …“-Signatur' },
  { pattern: /^Co-Authored-By:\s*Codebuff\b/i, label: '„Co-Authored-By: Codebuff“-Footer' },
  { pattern: /^Co-Authored-By:\s*.*\bnoreply@codebuff\.com\b/i, label: '„Co-Authored-By“ mit Codebuff-Adresse' },
];

export function allowedForms(config: ShinonConfig): string {
  const parts: string[] = [];
  if (config.commit.conventional) parts.push(`type(scope): Beschreibung (${CONVENTIONAL_TYPES.join('|')})`);
  if (config.commit.prefixes.length > 0) parts.push(`[${config.commit.prefixes.join('|')}] …`);
  return parts.join(' oder ');
}

export function validateMessage(message: string, config: ShinonConfig): Finding[] {
  const check = 'commit-message';
  const findings: Finding[] = [];
  const lines = message.replace(/\r\n/g, '\n').split('\n');
  const subject = (lines[0] ?? '').trim();
  const wordCount = countMessageWords(message);

  if (subject === '') {
    findings.push(finding(check, 'MSG001', 'Commit-Nachricht ist leer — Betreffzeile fehlt'));
    return findings;
  }

  if (!config.commit.freeForm) {
    const conventional = new RegExp(`^(${CONVENTIONAL_TYPES.join('|')})(\\([^)]+\\))?: .+`);
    const prefixPattern =
      config.commit.prefixes.length > 0 ? new RegExp(`^\\[(${config.commit.prefixes.join('|')})\\]`) : null;
    const valid =
      (config.commit.conventional && conventional.test(subject)) || (prefixPattern?.test(subject) ?? false);
    if (!valid) {
      findings.push(
        finding(check, 'MSG002', `Betreffzeile entspricht nicht der vereinbarten Form: ${allowedForms(config)}`, {
          line: 1,
        }),
      );
    }
  }

  if (wordCount < MIN_COMMIT_WORDS) {
    findings.push(
      finding(
        check,
        'MSG007',
        `Commit-Nachricht enthält ${wordCount} Wörter; mindestens ${MIN_COMMIT_WORDS} Wörter sind verpflichtend`,
        { line: 1 },
      ),
    );
  }

  if (subject.length > 72) {
    findings.push(
      finding(check, 'MSG003', `Betreffzeile ist ${subject.length} Zeichen lang (Empfehlung: ≤ 72)`, {
        severity: 'warn',
        line: 1,
      }),
    );
  }

  lines.forEach((line, index) => {
    if (line.startsWith('#')) {
      findings.push(
        finding(check, 'MSG004', 'Zeile beginnt mit „#“ — der Komponist committet verbatim, Kommentare bleiben stehen', {
          severity: 'warn',
          line: index + 1,
        }),
      );
    }
  });

  lines.forEach((line, index) => {
    const hit = FORBIDDEN_FOOTERS.find((footer) => footer.pattern.test(line.trim()));
    if (hit) {
      findings.push(
        finding(
          check,
          'MSG006',
          `Verbotener Agenten-Footer: ${hit.label} — maschinelle Signaturen bleiben aus der Historie raus`,
          { line: index + 1 },
        ),
      );
    }
  });

  if (lines.length > 1 && (lines[1] ?? '') !== '' && !lines.some((line, index) => index > 0 && line.trim() === '')) {
    findings.push(
      finding(check, 'MSG005', 'Zwischen Betreff und Body fehlt die Leerzeile (git-Konvention)', {
        severity: 'warn',
        line: 1,
      }),
    );
  }

  return findings;
}

/** Auflösung des Nachrichtenpfads — einzige Quelle für die Position der Datei. */
export function messageFileFor(root: string, config: ShinonConfig): string {
  return path.resolve(root, config.commit.messageFile);
}

/** Einzige Lesestelle der Nachrichtendatei (Gate, Komponist, CLI). */
export function readMessage(file: string): { file: string; content: string | null } {
  return { file, content: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null };
}

export class CommitMessageCheck implements ShinonCheck {
  readonly id = 'commit-message';
  readonly title = 'Commit-Nachricht';

  run(ctx: CheckContext): Finding[] {
    if (ctx.message !== undefined) return validateMessage(ctx.message, ctx.config);
    const { file, content } = readMessage(messageFileFor(ctx.root, ctx.config));
    if (content === null) {
      return [
        finding(this.id, 'MSG000', `Keine Nachricht vorbereitet (${path.basename(file)}) — für den Commit erforderlich`, {
          severity: 'info',
        }),
      ];
    }
    return validateMessage(content, ctx.config);
  }
}

/** Nur der interne Selbsttest erzeugt den langen Body; echte Commits liefern ihren Inhalt selbst. */
function longMessage(subject: string): string {
  const body = Array.from({ length: MIN_COMMIT_WORDS }, (_, index) => `Beleg${index + 1}`).join(' ');
  return `${subject}\n\n${body}`;
}

/** Selbsttest der Regel — genutzt von `shinon message --self-test`. */
export function runMessageSelfTest(config: ShinonConfig): { failed: string[]; total: number } {
  const cases: Array<{ message: string; valid: boolean }> = [
    { message: longMessage('feat(paper): neue Textur'), valid: true },
    { message: longMessage('fix(canvas): Rendering-Fehler behoben'), valid: true },
    { message: longMessage('docs(architecture): Vertrag aktualisiert'), valid: true },
    { message: longMessage('chore(deps): TypeScript aktualisiert'), valid: true },
    { message: longMessage('[FOLD] Konsolidierung der Struktur'), valid: true },
    { message: longMessage('[CUT] obsoleten Code entfernt'), valid: true },
    { message: 'fehlt der Doppelpunkt', valid: false },
    { message: 'feat(): leere Beschreibung', valid: false },
    { message: '[UNKNOWN] nicht erlaubt', valid: false },
    { message: '', valid: false },
    { message: 'feat(x): ok\n\n🤖 Generated with Codebuff\nCo-Authored-By: Codebuff <noreply@codebuff.com>', valid: false },
    { message: 'feat(x): ok\n\nCo-Authored-By: Codebuff <noreply@codebuff.com>', valid: false },
    { message: 'feat(x): ok\n\nGenerated with SomeOtherAgent', valid: false },
    { message: longMessage('feat(x): ok\n\nCo-Authored-By: Mensch <mensch@example.org>'), valid: true },
  ];

  const failed: string[] = [];
  for (const testCase of cases) {
    const findings = validateMessage(testCase.message, config);
    const rejected = findings.some((item) => item.severity === 'error');
    if (rejected === testCase.valid) {
      failed.push(`"${testCase.message}" — erwartet ${testCase.valid ? 'gültig' : 'ungültig'}`);
    }
  }
  return { failed, total: cases.length };
}
