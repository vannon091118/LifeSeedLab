import { finding } from './check.ts';
import { countMessageWords, validateMessage } from './commit-message-check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';
import type { ShinonConfig } from '../config.ts';

/**
 * MergeMessageCheck — die Nachricht eines Merge- oder Squash-Commits ist selbst ein Commit.
 *
 * Anlass (gemessen, nicht vermutet): `git merge --no-ff` erzeugt per Default die Einzeiler-
 * Nachricht `Merge branch 'feature'`. Das ist an der Nachrichtenregel gemessen **ein Wort**
 * lang, und die 200-Wort-Pflicht (MSG007) würde jeden Merge blockieren, bis die Nachricht
 * niemand verfasst. Also zwei Regeln statt einer, und beide sind begründet:
 *
 *   · freie Betreffform — der Merge-Titel ist `Merge branch 'x'`, kein Conventional Commit.
 *     Diese Form wird hier ausdrücklich zugelassen, weil Git sie schreibt und wir sie nicht
 *     verhindern können, ohne den Merge zu verbieten.
 *   · `MSG010` — und genau deshalb wird der Body **Pflicht**: der Titel darf Git schreiben,
 *     die Begründung nicht. Wer merged, sagt warum: welche Commits, was kollidiert, welchen
 *     Gate-Stand der Ziel-Branch hatte.
 *
 * Die Pflicht gilt für Merge, Squash und Rebase-Zusammenfassung. Ein Merge mit 0 Wörtern Body
 * ist genau der Zustand, den diese Prüfung verhindert — nicht die Länge des Titels.
 */

/** Mindestlänge des Pflicht-Bodies. Bewusst niedriger als MSG007: der Merge-Titel zählt nicht mit. */
export const MIN_MERGE_BODY_WORDS = 60;

/** Wortzahl des Bodys: alles nach der ersten Leerzeile. */
export function mergeBodyWords(message: string): number {
  const lines = message.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line, index) => index > 0 && line.trim() === '');
  if (start === -1) return 0;
  return countMessageWords(lines.slice(start + 1).join('\n'));
}

export function validateMergeMessage(message: string, config: ShinonConfig): Finding[] {
  const check = 'merge-message';
  const findings: Finding[] = [];
  const normalized = message.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const subject = (lines[0] ?? '').trim();

  if (subject === '') {
    findings.push(finding(check, 'MSG009', 'Merge-Nachricht ist leer — Git hat keinen Titel geschrieben'));
    return findings;
  }

  // Fuer die Struktur gilt dieselbe Regel wie beim Commit — Betrefflaenge (MSG003), Kommentarreste
  // (MSG004), fehlende Leerzeile (MSG005), verbotene Footer (MSG006) und Kommentarzeilen im Body.
  //
  // Zwei Codes werden bewusst NICHT übernommen:
  //   · MSG002 — setzt `commit.freeForm`, weil Git den Merge-Titel schreibt und wir ihn nicht
  //     verhindern können, ohne den Merge zu verbieten. `validateMessage` prüft die Conventional-
  //     Form ausschließlich im Zweig `if (!config.commit.freeForm)` — die Regel ist damit wirklich
  //     abgeschaltet, nicht nur ausgeblendet.
  //   · MSG007 — die 200-Wort-Pflicht gilt für Commits mit eigenen Aussagen; der Merge-Body hat
  //     mit MIN_MERGE_BODY_WORDS seine eigene, passende Grenze.
  const structural = validateMessage(normalized, {
    ...config,
    commit: { ...config.commit, freeForm: true },
  })
    .filter((item) => item.code !== 'MSG007' && item.code !== 'MSG002')
    .map((item) => ({ ...item, check }));
  findings.push(...structural);

  const words = mergeBodyWords(normalized);
  if (words < MIN_MERGE_BODY_WORDS) {
    findings.push(
      finding(
        check,
        'MSG010',
        `Merge-Nachricht enthaelt ${words} Woerter im Body; mindestens ${MIN_MERGE_BODY_WORDS} sind ` +
          'verpflichtend. Der Titel darf Git schreiben, die Begruendung nicht: welche Commits kommen ' +
          'herein, was kollidiert haette und welchen Gate-Stand der Ziel-Branch hatte.',
        { line: 1 },
      ),
    );
  }

  return findings;
}

export class MergeMessageCheck implements ShinonCheck {
  readonly id = 'merge-message';
  readonly title = 'Merge-Nachricht (Pflicht-Body)';

  run(ctx: CheckContext): Finding[] {
    // Nur die Merge-Phase hat eine Merge-Nachricht. In Preflight, Commit, Push und Rebase gibt
    // es nichts zu prüfen — die Prüfung schweigt dort, statt eine Regel anzuwenden, für die es
    // keinen Gegenstand gibt. Die Registrierung bleibt trotzdem global: eine Prüfung, die je
    // nach Phase entscheidet, braucht keinen zweiten Registry-Eintrag.
    if (ctx.phase !== 'pre-merge') return [];

    // `pre-merge-commit` übergibt die Datei, aus der Git den Titel schreibt. Fehlt sie (etwa bei
    // `git merge --squash --no-commit` ohne Editor), ist der Pflicht-Body nicht prüfbar — und ein
    // leerer Merge-Commit ist genau der Fall, den MSG010 verhindern soll. Fail-closed.
    if (ctx.message === undefined) {
      return [
        finding(this.id, 'MSG008', 'Keine Merge-Nachricht uebergeben — der Pflicht-Body kann nicht geprueft werden'),
      ];
    }
    return validateMergeMessage(ctx.message, ctx.config);
  }
}

/** Nur der interne Selbsttest erzeugt den Body; echte Merges bringen ihren eigenen mit. */
function mergeMessage(subject: string, bodyWords = MIN_MERGE_BODY_WORDS + 20): string {
  const body = Array.from({ length: bodyWords }, (_, index) => `Beleg${index + 1}`).join(' ');
  return `${subject}\n\n${body}`;
}

/** Selbsttest der Merge-Regel — genutzt von `shinon message --self-test` und den Gate-Tests. */
export function runMergeMessageSelfTest(config: ShinonConfig): { failed: string[]; total: number } {
  const cases: Array<{ message: string; valid: boolean }> = [
    // Der Grundfall, der ohne diese Regel durchging: Gits Einzeiler, 0 Woerter Body.
    { message: "Merge branch 'feature'", valid: false },
    { message: "Squash and merge into main\n\nkurz", valid: false },
    { message: mergeMessage("Merge branch 'feature'"), valid: true },
    { message: mergeMessage("Merge remote-tracking branch 'origin/main'"), valid: true },
    { message: mergeMessage('Merge pull request #12 from vannon091118/feature'), valid: true },
    { message: mergeMessage("Rebase branch 'x' onto 'y'"), valid: true },
    // Ein eigener, nicht von Git geschriebener Titel bleibt an die Formpflicht gebunden (MSG003
    // Betrefflaenge, verbotene Footer) — aber nicht an die Conventional-Commit-Form.
    { message: mergeMessage('Merge von feature in main'), valid: true },
    { message: mergeMessage("Merge branch 'feature'\n\nCo-Authored-By: Codebuff <noreply@codebuff.com>"), valid: false },
    { message: mergeMessage("Merge branch 'feature'\n\n🤖 Generated with Codebuff"), valid: false },
    { message: '', valid: false },
  ];

  const failed: string[] = [];
  for (const testCase of cases) {
    const findings = validateMergeMessage(testCase.message, config);
    const rejected = findings.some((item) => item.severity === 'error');
    if (rejected === testCase.valid) {
      const title = testCase.message.split('\n')[0] ?? '';
      failed.push(`"${title}" — erwartet ${testCase.valid ? 'gültig' : 'ungültig'}`);
    }
  }
  return { failed, total: cases.length };
}