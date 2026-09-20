import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regel-4-Gate: Eine-Wahrheit für Ablehnungs-Unions.
 *
 * Contract (B39):
 * - Grund-Unions der Ablehnungen leben AUSSCHLIESSLICH in `bus/events.ts`.
 * - Systeme importieren sie und dürfen höchstens Teilmengen via `Extract` ABLEITEN.
 * - Verboten: Inline-Union-Literale als Reason-Typen in Systemen/Widgets.
 *   Eine Kopie driftet still — genau das hat `PlacementRejectReason` einmal vorgemacht.
 */

const BUS_PATH = join(process.cwd(), 'src', 'bus', 'events.ts');
const SRC_DIR = join(process.cwd(), 'src');

/** Kollisionen mit JS-Syntax, die dieser grobe Scan nicht zuordnen kann (dokumentierte Ausnahmen). */
const PATH_EXCEPTIONS = ['src/bus/events.ts', 'src/bus/commands.ts'];

type Violation = { file: string; line: number; text: string };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const file of walk(SRC_DIR)) {
    const rel = file.slice(process.cwd().length + 1).replace(/\\/g, '/');
    if (PATH_EXCEPTIONS.some((p) => rel === p || rel.startsWith('src/i18n/'))) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // (1) Typ-Positionen: Property-Signatur (`reason?: 'a' | 'b'`) und top-level Alias
      // mit Reason-Namen (`type PlacementRejectReason = 'a' | 'b'`). Domänen-States
      // (`type RunPhase = ...`), Variablen und Return-Literale sind keine Ablehnungs-Unions.
      if (/(?:^type \w*Reason\s*=\s*|\breason\??\s*:\s*)'[^']*'(?:\s*\|\s*'[^']*')*;?\s*$/.test(line)) {
        violations.push({ file: rel, line: i + 1, text: line.trim() });
      }
      // (2) Deklaration einer lokalen Grund-Union außerhalb des Busses.
      if (/export type \w*Reason(?!s) =/.test(line)) {
        violations.push({ file: rel, line: i + 1, text: line.trim() });
      }
    }
  }
  return violations;
}

describe('Regel 4: Ablehnungs-Unions haben eine Wahrheit (bus/events.ts)', () => {
  it('Grund-Union lebt im Bus und trägt den Contract-Kommentar', () => {
    const bus = readFileSync(BUS_PATH, 'utf8');
    for (const union of ['PlacementRejectReason', 'TileRejectReason', 'PlantRejectReason', 'BeetleRejectReason', 'RouteRejectReason', 'FertilizeRejectReason', 'PropagateRejectReason']) {
      expect(bus).toContain(`export type ${union}`);
    }
    expect(bus).toContain('B39');
  });

  it('Kein Inline-Reason-Literal außerhalb des Busses', () => {
    expect(collectViolations()).toEqual([]);
  });

  it('Derived-Subunions sind über Extract abgeleitet, nicht deklariert', () => {
    const bus = readFileSync(BUS_PATH, 'utf8');
    expect(bus).toMatch(/FertilizeRejectReason = Extract<PlantRejectReason/);
    expect(bus).toMatch(/PropagateRejectReason = Extract<PlantRejectReason/);
  });
});
