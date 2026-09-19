import path from 'node:path';
import { finding, codeLineCount, targetFiles } from './check.ts';
import type { CheckContext, Finding, ShinonCheck } from './check.ts';

/**
 * LOC-Caps: erzwingt die Modulgrenzen aus der Konfiguration. Zu lange Dateien sind ein Befund
 * am Owner der Datei — das Gate entscheidet, nicht diese Prüfung.
 */
export class LocCapCheck implements ShinonCheck {
  readonly id = 'loc-caps';
  readonly title = 'LOC-Caps (Modulgrenzen)';

  run(ctx: CheckContext): Finding[] {
    const findings: Finding[] = [];
    for (const file of targetFiles(ctx)) {
      const rule = ctx.config.gate.locCaps.find((entry) => file.startsWith(entry.path));
      if (!rule) continue;
      const lines = codeLineCount(path.resolve(ctx.root, file));
      if (lines > rule.cap) {
        findings.push({
          check: this.id,
          code: 'LOC001',
          severity: 'error',
          file,
          message: `LOC-Cap überschritten (Code-Zeilen, ohne Kommentare): ${lines}/${rule.cap} [${rule.label}] — Modul splitten, Cap nicht erhöhen`,
        });
      } else {
        findings.push({
          check: this.id,
          code: 'LOC000',
          severity: 'info',
          file,
          message: `${lines}/${rule.cap} Code-Zeilen [${rule.label}]`,
        });
      }
    }
    return findings;
  }
}

/** Hilfsfunktion für den Starter: alle Caps auf einen Blick. */
export function locSummary(ctx: CheckContext): Array<{ file: string; lines: number; cap: number; label: string }> {
  const summary: Array<{ file: string; lines: number; cap: number; label: string }> = [];
  for (const file of targetFiles(ctx)) {
    const rule = ctx.config.gate.locCaps.find((entry) => file.startsWith(entry.path));
    if (!rule) continue;
    summary.push({ file, lines: codeLineCount(path.resolve(ctx.root, file)), cap: rule.cap, label: rule.label });
  }
  return summary;
}

export function assertLocCapsAreUsable(ctx: CheckContext): Finding[] {
  if (ctx.config.gate.locCaps.length === 0) {
    return [finding('loc-caps', 'LOC002', 'Keine LOC-Caps konfiguriert — Modulgrenzen ungeschützt', { severity: 'warn' })];
  }
  return [];
}
