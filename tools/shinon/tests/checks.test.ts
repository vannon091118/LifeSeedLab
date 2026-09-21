import { describe, expect, it } from 'vitest';
import { buildChecks, knownCheckIds } from '../checks/index.ts';
import { CommitSizeCheck } from '../checks/commit-size-check.ts';
import { ShinonGate } from '../gate.ts';
import { runMessageSelfTest, validateMessage } from '../checks/commit-message-check.ts';
import { ForbiddenPatternCheck } from '../checks/forbidden-pattern-check.ts';
import { LocCapCheck } from '../checks/loc-cap-check.ts';
import { defaultConfig } from '../config.ts';
import { ShinonGitHelfer } from '../git-helfer.ts';
import { makeLines, tempDir, write } from './helpers.ts';
import type { CheckContext } from '../checks/check.ts';

function contextIn(dir: string, changedFiles: string[]): CheckContext {
  const config = defaultConfig(dir);
  return {
    root: dir,
    git: new ShinonGitHelfer(dir),
    config,
    phase: 'preflight',
    stagedFiles: [],
    changedFiles,
    quiet: true,
  };
}

describe('Gate-Registry', () => {
  // Die Changelog-Pflicht (Regel 0) hing allein an `shinon.config.json`: `GateChecks` deklarierte
  // das Feld nicht, der Laufzeitwert kam aus der JSON. Ein Klon ohne die Datei hätte den Check
  // STILL abgeschaltet und der Fehler wäre nur als fehlende Zeile im Bericht sichtbar gewesen.
  // Jetzt ist der Default die Wahrheit, die JSON nur noch Übersteuerung — dieser Test hält das.
  it('Changelog-Pflicht ist ein Default-Check, nicht JSON-Zufall', () => {
    const config = defaultConfig('/tmp/shinon');
    expect(config.gate.checks.changelog).toBe(true);
    expect(buildChecks(config).map((check) => check.id)).toContain('changelog');
  });

  // Dieselbe Klasse Fehler, zweiter Fall: die Slice-Grenze steht hier als Default UND im
  // Registry-Eintrag — ohne beides wäre der 152-Dateien-Commit (`eccfede`) weiter möglich.
  it('Slice-Grenze ist ein Default-Check mit Default-Wert 25', () => {
    const config = defaultConfig('/tmp/shinon');
    expect(config.commit.maxFiles).toBe(25);
    expect(config.gate.checks.commitSize).toBe(true);
    expect(buildChecks(config).map((check) => check.id)).toContain('commit-size');
    expect(knownCheckIds()).toContain('commit-size');
  });
});

describe('Commit-Größe (Slice-Regel)', () => {
  // Kontext mit echtem Index: die Prüfung urteilt über `stagedFiles`, nicht über den Arbeitsbaum.
  function indexContext(dir: string, staged: string[]): CheckContext {
    const ctx = contextIn(dir, []);
    ctx.stagedFiles = staged;
    return ctx;
  }

  it('blockiert oberhalb der Grenze und lässt die Grenze selbst durch', () => {
    const dir = tempDir('commit-size');
    const at = Array.from({ length: 25 }, (_, i) => `src/at_${i}.ts`);
    const over = [...at, 'src/one_too_many.ts'];

    expect(new CommitSizeCheck().run(indexContext(dir, at)).some((item) => item.severity === 'error')).toBe(false);
    expect(new CommitSizeCheck().run(indexContext(dir, at)).some((item) => item.code === 'CSZ000')).toBe(true);

    const findings = new CommitSizeCheck().run(indexContext(dir, over));
    const error = findings.find((item) => item.severity === 'error');
    expect(error?.code).toBe('CSZ001');
    expect(error?.message).toContain('26 Dateien');
  });

  it('urteilt nicht über einen leeren Index (voller Arbeitsbaum ist kein Befund)', () => {
    const dir = tempDir('commit-size-empty');
    const ctx = contextIn(dir, Array.from({ length: 80 }, (_, i) => `src/loose_${i}.ts`));
    const findings = new CommitSizeCheck().run(ctx);
    expect(findings.some((item) => item.severity === 'error')).toBe(false);
    expect(findings[0]?.code).toBe('CSZ000');
  });

  it('beißt im echten Gate: 26 gestagte Dateien schließen es, 25 nicht', async () => {
    const dir = tempDir('commit-size-gate');
    const staged = Array.from({ length: 26 }, (_, i) => `src/file_${i}.ts`);
    const ctx = indexContext(dir, staged);
    const report = await new ShinonGate([new CommitSizeCheck()]).run(ctx);
    expect(report.passed).toBe(false);
    const ok = await new ShinonGate([new CommitSizeCheck()]).run(indexContext(dir, staged.slice(0, 25)));
    expect(ok.passed).toBe(true);
  });
});

describe('Commit-Nachrichtenregel', () => {
  const config = defaultConfig('/tmp/shinon');
  const longMessage = (subject: string): string => `${subject}\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;

  it('akzeptiert Conventional Commits und Projekt-Präfixe mit mindestens 200 Wörtern', () => {
    expect(validateMessage(longMessage('feat(paper): neue Textur'), config)).toHaveLength(0);
    expect(validateMessage(longMessage('[FOLD] Struktur konsolidiert'), config)).toHaveLength(0);
  });

  it('erzwingt die Mindestlänge auch bei formal gültigem Betreff', () => {
    expect(validateMessage('feat(paper): zu kurze technische Pointe', config).some((item) => item.code === 'MSG007')).toBe(true);
  });

  it('lehnt fremde Formen und leere Nachrichten ab', () => {
    expect(validateMessage('irgendwas ohne Typ', config).some((item) => item.code === 'MSG002')).toBe(true);
    expect(validateMessage('', config).some((item) => item.code === 'MSG001')).toBe(true);
    expect(validateMessage('[UNKNOWN] nope', config).some((item) => item.severity === 'error')).toBe(true);
  });

  it('besteht den eingebauten Selbsttest', () => {
    expect(runMessageSelfTest(config).failed).toEqual([]);
  });

  it('erlaubt bei freeForm freie Betreffzeilen, warnt aber vor Kommentarresten', () => {
    const loose = defaultConfig('/tmp/shinon');
    loose.commit.freeForm = true;
    expect(validateMessage(longMessage('einfach nur ein Satz'), loose)).toHaveLength(0);
    expect(validateMessage('feat(x): ok\n# Template-Rest', loose).some((item) => item.code === 'MSG004')).toBe(true);
  });
});

describe('LOC-Cap-Prüfung', () => {
  it('meldet Überschreitungen als Fehler und Einhaltung als Info', () => {
    const dir = tempDir('loc-caps');
    write(dir, 'src/simulation/gross.ts', makeLines(5));
    write(dir, 'src/config/small.ts', makeLines(2));

    const oversized = contextIn(dir, ['src/simulation/gross.ts']);
    oversized.config.gate.locCaps = [{ path: 'src/simulation/', cap: 3, label: 'Simulationssystem' }];
    const findings = new LocCapCheck().run(oversized);
    expect(findings.some((item) => item.severity === 'error' && item.file === 'src/simulation/gross.ts')).toBe(true);

    const fine = contextIn(dir, ['src/config/small.ts']);
    fine.config.gate.locCaps = [{ path: 'src/config/', cap: 10, label: 'Source/Config' }];
    expect(new LocCapCheck().run(fine).every((item) => item.severity === 'info')).toBe(true);
  });
});

describe('Architektur-Constraints', () => {
  it('findet verbotene Patterns mit Zeilennummer und respektiert Ausschlüsse', () => {
    const dir = tempDir('forbidden');
    write(dir, 'src/simulation/bad.ts', 'const x = Math.random();\n');
    write(dir, 'src/core/rng.ts', 'const x = Math.random();\n');

    const ctx = contextIn(dir, ['src/simulation/bad.ts', 'src/core/rng.ts']);
    const findings = new ForbiddenPatternCheck().run(ctx);
    expect(findings.some((item) => item.file === 'src/simulation/bad.ts' && item.line === 1)).toBe(true);
    expect(findings.some((item) => item.file === 'src/core/rng.ts')).toBe(false);
  });

  it('hält die Persistenz-Regel für Spielcode scharf und nimmt nur E2E-Harness + Werkzeug aus', () => {
    const dir = tempDir('forbidden-scope');
    const read = 'const raw = localStorage.getItem("lifegamelab_meta");';
    write(dir, 'src/simulation/touch.ts', read);
    write(dir, 'tests/run.spec.ts', read);

    // Die Ausnahmen sind genau eine Zeile weit — kein Muster, das später still wächst.
    // `tools/` ist Werkzeug: seine Tests prüfen VERBOTENES absichtlich (Fixtures), das ist
    // Verifikation der Regel, nicht ihre Verletzung.
    const rule = defaultConfig(dir).gate.forbiddenPatterns.find((entry) => entry.pattern.includes('localStorage'));
    expect(rule?.exclude).toEqual(['src/persistence/', 'tests/', 'tools/']);

    const findings = new ForbiddenPatternCheck().run(contextIn(dir, ['src/simulation/touch.ts', 'tests/run.spec.ts']));
    expect(findings.some((item) => item.file === 'src/simulation/touch.ts')).toBe(true);
    expect(findings.some((item) => item.file === 'tests/run.spec.ts')).toBe(false);
  });

  it('erkennt Slop-Muster wie Boundary Laundering (JSON.parse as Type)', () => {
    const dir = tempDir('slop-patterns');
    const badCode = 'const data = JSON.parse(raw) as SaveGame;\n';
    write(dir, 'src/simulation/bad_slop.ts', badCode);
    const findings = new ForbiddenPatternCheck().run(contextIn(dir, ['src/simulation/bad_slop.ts']));
    expect(findings.some((item) => item.file === 'src/simulation/bad_slop.ts' && item.message.includes('Boundary Laundering'))).toBe(true);
  });
});
