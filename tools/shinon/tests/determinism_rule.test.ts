// Baum-Test der Regel „Float-Exaktheit in Simulation und Content-Truth"
// (architecture-contract.md §6: verboten sind Math.pow, Math.hypot und alle Transzendenten;
// erlaubt bleiben die exakten Operationen und Math.sqrt).
//
// WARUM DIESER TEST ZUSÄTZLICH ZUR GATE-REGEL EXISTIERT:
// Die Gate-Regel läuft über `targetFiles()`, im Commit über den Index — sie sieht also nur
// GEÄNDERTE Dateien. Ein Verstoß in einer Datei, die niemand anfasst, bliebe unsichtbar. Dieser
// Test fährt denselben Check mit ALLEN Dateien des Geltungsbereichs als Zielmenge: der ganze
// Baum, jede Zeile. Die Regelliste wird dabei NICHT nachgebaut, sondern aus der Gate-Konfiguration
// gelesen — eine Wahrheit, zwei Reichweiten (Diff schnell im Gate, Baum vollständig hier).
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { defaultConfig } from '../config.ts';
import { ShinonGitHelfer } from '../git-helfer.ts';
import { ForbiddenPatternCheck, matchesPath } from '../checks/forbidden-pattern-check.ts';
import type { CheckContext } from '../checks/check.ts';

const ROOT = ShinonGitHelfer.detectRoot(process.cwd()) ?? process.cwd();
const CONFIG = defaultConfig(ROOT);
const TMP = path.join(ROOT, 'tools', '.tmp', 'determinism-scope');

/** Die eine Regel, um die es hier geht — gefunden über ihr Geltungsmerkmal. */
const RULE = ((): { pattern: string; message: string; include?: string[] } => {
  const found = CONFIG.gate.forbiddenPatterns.find((rule) => rule.include?.includes('src/simulation/'));
  if (!found) throw new Error('Regel „Float-Exaktheit" fehlt in der Gate-Konfiguration');
  return found;
})();

/** Alle Dateien im Geltungsbereich, relativ zur jeweiligen Wurzel. */
function scopeFiles(root: string): string[] {
  const listed = (relative: string, filter: (entry: string) => boolean): string[] =>
    fs
      .readdirSync(path.join(root, relative), { recursive: true, encoding: 'utf8' })
      .filter((entry) => entry.endsWith('.ts') && filter(entry))
      .map((entry) => `${relative}${entry}`)
      .sort();
  return [
    ...listed('src/simulation/', () => true),
    ...listed('src/config/', (entry) => entry.endsWith('.source.ts') && !entry.includes('/')),
  ].sort();
}

/** Kontext mit ALLEN Dateien als Zielmenge (kein Index, kein Diff — reines Durchsehen). */
function contextAt(root: string, files: string[]): CheckContext {
  return {
    root,
    git: new ShinonGitHelfer(root),
    config: CONFIG,
    phase: 'preflight',
    stagedFiles: [],
    changedFiles: files,
    quiet: true,
  };
}

/** Nur die Befunde der Float-Regel, als `datei:zeile` — direkt auffindbar statt „irgendwo". */
function violations(ctx: CheckContext): string[] {
  return new ForbiddenPatternCheck()
    .run(ctx)
    .filter((item) => item.code === 'PAT001' && item.message === RULE.message)
    .map((item) => `${item.file}:${item.line}`);
}

describe('Float-Exaktheit: Simulation und Content-Truth ohne Potenz und Transzendente', () => {
  const files = scopeFiles(ROOT);

  it('Geltungsbereich ist nicht leer und deckt genau die vorgesehenen Pfade', () => {
    // Ohne diese Zusicherung könnte ein Tippfehler im Scope den Baum-Test lautlos leeren.
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('src/simulation/root.ts');
    expect(files).toContain('src/config/phenotype.source.ts');
    for (const file of files) {
      expect(matchesPath('src/simulation/', file) || matchesPath('src/config/*.source.ts', file)).toBe(true);
    }
    // Zwei verschiedene Schnitte, mit Absicht: `src/simulation/` ist der ganze Ordner (ein
    // Sim-Test braucht keine Transzendente, er gehört zur Domäne), `src/config/` ist auf die
    // Source-Dateien geschnitten — ihre Tests liegen ausdrücklich außerhalb.
    expect(files.filter((file) => file.startsWith('src/config/')).every((file) => file.endsWith('.source.ts'))).toBe(true);
    expect(files).toContain('src/simulation/maze_plants.test.ts');
    // Der Scope steht sichtbar auf zwei Einträgen — ihn zu erweitern ist eine bewusste Änderung.
    expect(RULE.include).toEqual(['src/simulation/', 'src/config/*.source.ts']);
  });

  it('kein Verstoß im gesamten Baum — geprüft mit dem echten Check', () => {
    expect(violations(contextAt(ROOT, files))).toEqual([]);
  });

  it('die Regel beißt: pow, hypot und sin im Scope, sqrt nicht — außerhalb des Scopes gar nicht', () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(path.join(TMP, 'src', 'simulation'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'src', 'config'), { recursive: true });
    fs.writeFileSync(path.join(TMP, 'src', 'simulation', 'probe.ts'), [
      'export const a = Math.pow(2, 3);',                     // 1 — Verstoß
      'export const b = Math.hypot(3, 4);',                   // 2 — Verstoß
      'export const c = Math.sin(1);',                        // 3 — Verstoß
      'export const ok = Math.sqrt(2);',                      // 4 — erlaubt
      'export const okToo = Math.abs(-1) + Math.max(1, 2);',  // 5 — erlaubt
    ].join('\n'), 'utf8');
    // Gleicher Verstoß, aber ein Test der Source-Dateien — nicht im Scope (nur *.source.ts).
    fs.writeFileSync(path.join(TMP, 'src', 'config', 'probe.test.ts'), 'export const c = Math.sin(1);', 'utf8');

    const found = violations(contextAt(TMP, ['src/simulation/probe.ts', 'src/config/probe.test.ts']));
    expect(found).toEqual([
      'src/simulation/probe.ts:1',
      'src/simulation/probe.ts:2',
      'src/simulation/probe.ts:3',
    ]);
    fs.rmSync(TMP, { recursive: true, force: true });
  });
});
