// Baum-Tests der Determinismus-Regeln.
//
//   (1) Float-Exaktheit (architecture-contract.md §6): verboten sind Math.pow, Math.hypot und
//       alle Transzendenten; erlaubt bleiben exakte Operationen und Math.sqrt.
//   (2) Deterministische Reihenfolge (Befund 20.09.2026, adversarialer Review): verboten ist
//       `String.prototype.localeCompare` im Spielcode — es kollationiert sprachabhängig.
//
// WARUM DIESE TESTS ZUSÄTZLICH ZU DEN GATE-REGELN EXISTIEREN:
// Die Gate-Regeln laufen über `targetFiles()`, im Commit über den Index — sie sehen also nur
// GEÄNDERTE Dateien. Ein Verstoß in einer Datei, die niemand anfasst, bliebe unsichtbar. Diese
// Tests fahren dieselben Checks mit ALLEN Dateien des Geltungsbereichs als Zielmenge: der ganze
// Baum, jede Zeile. Die Regellisten werden dabei NICHT nachgebaut, sondern aus der
// Gate-Konfiguration gelesen — eine Wahrheit, zwei Reichweiten (Diff schnell im Gate, Baum
// vollständig hier).
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

/** Das, was an einer Regel zählt: Pattern, Meldung und Geltungsbereich. */
interface Rule {
  pattern: string;
  message: string;
  include?: string[];
  exclude?: string[];
}

/** Regel über ihr Geltungsmerkmal finden — nicht über den Index in der Liste. */
function ruleByInclude(entry: string): Rule {
  const found = CONFIG.gate.forbiddenPatterns.find((rule) => rule.include?.includes(entry));
  if (!found) throw new Error(`Regel mit include "${entry}" fehlt in der Gate-Konfiguration`);
  return found;
}

/** Regel über ihren Pattern-Inhalt finden (für Regeln ohne include, mit Ausschluss-Liste). */
function ruleByPattern(needle: string): Rule {
  const found = CONFIG.gate.forbiddenPatterns.find((rule) => rule.pattern.includes(needle));
  if (!found) throw new Error(`Regel mit Pattern "${needle}" fehlt in der Gate-Konfiguration`);
  return found;
}

/** Alle `.ts`-Dateien unter den Präfixen, relativ zur Wurzel — immer mit `/` als Trenner. */
function filesUnder(root: string, prefixes: string[], keep: (entry: string) => boolean): string[] {
  return prefixes
    .flatMap((relative) =>
      fs
        .readdirSync(path.join(root, relative), { recursive: true, encoding: 'utf8' })
        // Windows liefert `bus\\bus.ts`: erst normalisieren, dann filtern und bauen — sonst
        // passen weder die `/`-Vergleiche unten noch die Befund-Pfade des Checks dazu.
        .map((entry) => entry.split(path.sep).join('/'))
        .filter((entry) => entry.endsWith('.ts') && keep(entry))
        .map((entry) => `${relative}${entry}`),
    )
    .sort();
}

/** Der gesamte Spielcode — Grundmenge für Regeln, die per Ausschluss gelten. */
function allGameFiles(root: string): string[] {
  return filesUnder(root, ['src/'], () => true);
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

/** Nur die Befunde EINER Regel, als `datei:zeile` — direkt auffindbar statt „irgendwo". */
function violationsFor(ctx: CheckContext, rule: Rule): string[] {
  return new ForbiddenPatternCheck()
    .run(ctx)
    .filter((item) => item.code === 'PAT001' && item.message === rule.message)
    .map((item) => `${item.file}:${item.line}`);
}

describe('Float-Exaktheit: Simulation und Content-Truth ohne Potenz und Transzendente', () => {
  const RULE = ruleByInclude('src/simulation/');
  const files = [
    ...filesUnder(ROOT, ['src/simulation/'], () => true),
    ...filesUnder(ROOT, ['src/config/'], (entry) => entry.endsWith('.source.ts') && !entry.includes('/')),
  ].sort();

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
    expect(violationsFor(contextAt(ROOT, files), RULE)).toEqual([]);
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

    const found = violationsFor(
      contextAt(TMP, ['src/simulation/probe.ts', 'src/config/probe.test.ts']),
      RULE,
    );
    expect(found).toEqual([
      'src/simulation/probe.ts:1',
      'src/simulation/probe.ts:2',
      'src/simulation/probe.ts:3',
    ]);
    fs.rmSync(TMP, { recursive: true, force: true });
  });
});

describe('Deterministische Reihenfolge: kein localeCompare im Spielcode', () => {
  const RULE = ruleByPattern('localeCompare');
  const excluded = (file: string): boolean => (RULE.exclude ?? []).some((entry) => matchesPath(entry, file));
  const files = allGameFiles(ROOT).filter((file) => !excluded(file));

  it('Geltungsbereich ist der Spielcode ohne Präsentationsschicht', () => {
    expect(files.length).toBeGreaterThan(50);
    // Die drei Stellen, an denen die Sortierung Gültigkeit trägt, sind ausdrücklich drin.
    expect(files).toContain('src/core/hash.ts');
    expect(files).toContain('src/core/order.ts');
    expect(files).toContain('src/discovery/chain.ts');
    expect(files).toContain('src/simulation/vectorSystem.ts');
    // … und die Anzeige-Schicht ausdrücklich draußen: dort ist sprachrichtige Sortierung legitim.
    expect(files.some((file) => file.startsWith('src/components/'))).toBe(false);
    expect(files.some((file) => file.startsWith('src/render/'))).toBe(false);
    // Die Ausschluss-Liste steht sichtbar — sie zu erweitern ist eine bewusste Entscheidung.
    expect(RULE.exclude).toEqual(['tools/', 'src/components/', 'src/render/', 'src/observers/', 'src/i18n.tsx', 'src/i18n/']);
    // Fail-closed: die Regel hat KEIN include, gilt also auch für künftige Ordner.
    expect(RULE.include).toBeUndefined();
  });

  it('kein Verstoß im gesamten Spielcode — geprüft mit dem echten Check', () => {
    expect(violationsFor(contextAt(ROOT, files), RULE)).toEqual([]);
  });

  it('die Regel beißt: localeCompare in Sim/Source geflaggt, in der Anzeige-Schicht nicht', () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(path.join(TMP, 'src', 'simulation'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(TMP, 'tools', 'probe'), { recursive: true });
    const violation = 'export const order = (a: string, b: string) => a.localeCompare(b);';
    fs.writeFileSync(path.join(TMP, 'src', 'simulation', 'probe.ts'), violation, 'utf8');
    fs.writeFileSync(path.join(TMP, 'src', 'components', 'probe.ts'), violation, 'utf8');
    fs.writeFileSync(path.join(TMP, 'tools', 'probe', 'probe.ts'), violation, 'utf8');

    const found = violationsFor(
      contextAt(TMP, ['src/simulation/probe.ts', 'src/components/probe.ts', 'tools/probe/probe.ts']),
      RULE,
    );
    expect(found).toEqual(['src/simulation/probe.ts:1']);
    fs.rmSync(TMP, { recursive: true, force: true });
  });
});
