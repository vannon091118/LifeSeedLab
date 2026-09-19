import fs from 'node:fs';
import path from 'node:path';
import { targetFiles } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * Verbotene Patterns (Architektur-Constraints): jedes Pattern aus der Konfiguration wird gegen
 * die Ziel-Dateien geprüft. Ausschlüsse gelten pfadbasiert — dadurch bleibt die Ausnahme dort
 * sichtbar, wo sie gilt.
 *
 * Geprüft wird **Code, nicht Prosa**: ganze Kommentarzeilen fallen weg, und von Code-Zeilen wird
 * ein trailing `//`-Kommentar abgetrennt. Vorher traf das Muster auch Kommentare, die ein Verbot
 * nur ERWÄHNEN — der Satz „kein `Date.now()` mehr" wurde damit selbst zum Fehler und blockierte
 * genau die Datei, die ihn gerade behoben hatte. Der Abtrenner respektiert Anführungszeichen
 * (Strings, die `//` enthalten, wie URLs), sonst würde er Code verschlucken und das Verbot
 * unterlaufen. Was nach dem Abtrennen als Code übrig bleibt, wird geprüft — kein Schlupfloch.
 */
export class ForbiddenPatternCheck implements ShinonCheck {
  readonly id = 'forbidden-patterns';
  readonly title = 'Architektur-Constraints';

  /**
   * Schneidet einen trailing `//`-Kommentar ab, ohne Strings zu beschädigen. Zustandslos pro Zeile
   * (kein Regex-Literal-Handling): was der Abtrenner nicht erkennt, bleibt Code und wird geprüft.
   */
  private static stripTrailingComment(line: string): string {
    let quote: string | null = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        if (ch === '\\') {
          i += 1;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        continue;
      }
      if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
    }
    return line;
  }

  /** Code-Zeilen samt echter Zeilennummer — Kommentarzeilen (auch Block, auch `*`) entfallen. */
  private codeLines(content: string): { line: string; number: number }[] {
    const out: { line: string; number: number }[] = [];
    let inBlock = false;
    content.split('\n').forEach((raw, index) => {
      const trimmed = raw.trim();
      if (inBlock) {
        if (trimmed.includes('*/')) inBlock = false;
        return;
      }
      if (trimmed === '') return;
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inBlock = true;
        return;
      }
      const code = ForbiddenPatternCheck.stripTrailingComment(raw).trim();
      if (code === '') return;
      out.push({ line: code, number: index + 1 });
    });
    return out;
  }

  run(ctx: CheckContext): Finding[] {
    const findings: Finding[] = [];
    for (const rule of ctx.config.gate.forbiddenPatterns) {
      let regex: RegExp;
      try {
        regex = new RegExp(rule.pattern);
      } catch (error) {
        findings.push({
          check: this.id,
          code: 'PAT000',
          severity: 'warn',
          message: `Ungültiges Pattern in der Konfiguration: ${rule.pattern} (${String(error)})`,
        });
        continue;
      }

      for (const file of targetFiles(ctx)) {
        if (rule.exclude?.some((entry) => file.startsWith(entry))) continue;
        const content = fs.readFileSync(path.resolve(ctx.root, file), 'utf8');
        for (const { line, number } of this.codeLines(content)) {
          if (!regex.test(line)) continue;
          findings.push({
            check: this.id,
            code: 'PAT001',
            severity: 'error',
            file,
            line: number,
            message: rule.message,
          });
        }
      }
    }
    return findings;
  }
}
