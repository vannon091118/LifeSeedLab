import { describe, expect, it } from 'vitest';
import { buildChecks, knownCheckIds } from '../checks/index.ts';
import { CommitSizeCheck } from '../checks/commit-size-check.ts';
import { VersionFilesCheck } from '../checks/version-files-check.ts';
import { UntrackedInputCheck } from '../checks/untracked-input-check.ts';
import { ShinonGate } from '../gate.ts';
import { runMessageSelfTest, validateMessage } from '../checks/commit-message-check.ts';
import {
  MergeMessageCheck,
  runMergeMessageSelfTest,
  validateMergeMessage,
} from '../checks/merge-message-check.ts';
import { ForbiddenPatternCheck } from '../checks/forbidden-pattern-check.ts';
import { LocCapCheck } from '../checks/loc-cap-check.ts';
import { defaultConfig } from '../config.ts';
import { ShinonGitHelfer } from '../git-helfer.ts';
import { contextFor, gitIt, initTempRepo, makeLines, tempDir, write } from './helpers.ts';
import type { CheckContext, ShinonPhase } from '../checks/check.ts';

/**
 * Kontext ohne echten Index. Die Phase ist ein Parameter, weil sie inzwischen entscheidet:
 * `commit-size` und `version-files` prüfen ausschließlich in `pre-commit` (dort trägt der Index
 * die Aussage „das würde committet"), in allen anderen Phasen schweigen sie. Ein Test, der den
 * Index prüfen will, MUSS deshalb `pre-commit` setzen — sonst prüft er nichts und sieht grün aus.
 */
function contextIn(dir: string, changedFiles: string[], options: { phase?: ShinonPhase } = {}): CheckContext {
  const config = defaultConfig(dir);
  return {
    root: dir,
    git: new ShinonGitHelfer(dir),
    config,
    phase: options.phase ?? 'preflight',
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

  it('Untracked-Indexquellen sind ein Default-Check', () => {
    const config = defaultConfig('/tmp/shinon');
    expect(config.gate.checks.untrackedInputs).toBe(true);
    expect(buildChecks(config).map((check) => check.id)).toContain('untracked-inputs');
    expect(knownCheckIds()).toContain('untracked-inputs');
  });

  it('weist unbekannte und deaktivierte --only-IDs fail-closed ab', () => {
    const config = defaultConfig('/tmp/shinon');
    expect(() => buildChecks(config, ['does-not-exist'])).toThrow('Unbekannte Check-ID');
    config.gate.checks.commitMessage = false;
    expect(() => buildChecks(config, ['commit-message'])).toThrow('deaktiviert');
  });

  it('lehnt eine ungültige Phase ab, bevor Repository-Zustand gelesen wird', () => {
    const { git, config } = initTempRepo('gate-invalid-phase');
    expect(() => contextFor(git, config, { phase: 'not-a-phase' as never })).toThrow('Ungültige Gate-Phase');
  });
});

describe('Commit-Größe (Slice-Regel)', () => {
  // Kontext mit echtem Index: die Prüfung urteilt über `stagedFiles`, nicht über den Arbeitsbaum.
  // `phase: 'pre-commit'` ist hier keine Dekoration, sondern die Bedingung: die Slice-Regel gilt
  // ausschließlich, wenn der Index genau das ausdrückt, was committet würde. Siehe die
  // Phase-Tests weiter unten — dort steht, was in den anderen Phasen passiert.
  function indexContext(dir: string, staged: string[]): CheckContext {
    const ctx = contextIn(dir, [], { phase: 'pre-commit' });
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

describe('Versions-Wahrheit bleibt uncommittet (VRF)', () => {
  // Der Regel-0-Hook hebt package.json + src/version.ts als uncommitteten Vorsprung +1 an.
  // Commit d924a17 trug beide im Index — das Gate hatte für diesen Vertrag keine Prüfung.
  // `pre-commit` aus demselben Grund wie oben: VRF001 beschreibt einen Index, der committet
  // würde. In einer Merge-Phase ist `package.json` zwangsläufig im Index, sobald die Gegenseite
  // sie angefasst hat — dort zu schweigen ist die Regel, nicht ihre Abschaltung.
  function indexContext(dir: string, staged: string[]): CheckContext {
    const ctx = contextIn(dir, [], { phase: 'pre-commit' });
    ctx.stagedFiles = staged;
    return ctx;
  }

  it('blockiert beide Versionsdateien im Index, einzeln je Befund', () => {
    const dir = tempDir('version-files');
    const findings = new VersionFilesCheck().run(indexContext(dir, ['src/simulation/a.ts', 'package.json', 'src/version.ts']));
    expect(findings.filter((item) => item.code === 'VRF001')).toHaveLength(2);
    expect(findings.every((item) => item.severity === 'error')).toBe(true);
    expect(findings.map((item) => item.file).sort()).toEqual(['package.json', 'src/version.ts']);
  });

  it('lässt saubere Indizes durch und meldet den intakten Vorsprung', () => {
    const dir = tempDir('version-files-clean');
    const ctx = indexContext(dir, ['src/simulation/a.ts', 'CHANGELOG.md']);
    const findings = new VersionFilesCheck().run(ctx);
    expect(findings.some((item) => item.severity === 'error')).toBe(false);
    expect(findings[0]?.code).toBe('VRF000');
  });

  it('urteilt nur über den Index — Versionsdateien im Arbeitsbaum blockieren nicht', () => {
    const dir = tempDir('version-files-worktree');
    const ctx = contextIn(dir, ['package.json', 'src/version.ts']);
    ctx.stagedFiles = [];
    const findings = new VersionFilesCheck().run(ctx);
    expect(findings.some((item) => item.severity === 'error')).toBe(false);
  });

  it('ist als Default-Check registriert', () => {
    const config = defaultConfig('/tmp/shinon');
    expect(config.gate.checks.versionFiles).toBe(true);
    expect(buildChecks(config).map((check) => check.id)).toContain('version-files');
    expect(knownCheckIds()).toContain('version-files');
  });
});

/**
 * Phasenbindung der indexgebundenen Prüfungen.
 *
 * Anlass ist eine Messung, keine Vermutung (git 2.53.0.windows.4, Wegwerf-Probe): `git merge` feuert
 * `pre-merge-commit` und `commit-msg`, aber NIE `pre-commit`; `git rebase` feuert weder
 * `pre-commit` noch `commit-msg`. Mit der Erweiterung des Gates auf fünf Phasen laufen CSZ001 und
 * VRF001 also in Zuständen, für die sie nicht geschrieben sind — ein Merge über 25 Dateien sähe
 * wie ein verbotener Mega-Commit aus, und `package.json` im Merge-Index wie eine Regelverletzung.
 * Deshalb prüfen beide ausschließlich in der Commit-Phase.
 *
 * Der Wichtigheitsgrad: Das sind genau die Prüfungen, die den Megacommit `eccfede` und den
 * Versionsverlust in `d924a17` verhindert haben. Sie dürfen nirgends schwächer werden — nur dort
 * ansprechen, wo der Index die Aussage nicht trägt.
 */
describe('Indexgebundene Prüfungen sind an die Commit-Phase gebunden', () => {
  const foreignPhases = ['preflight', 'pre-push', 'pre-merge', 'pre-rebase'] as const;

  it('commit-size schweigt außerhalb von pre-commit — auch bei 200 Dateien im Index', () => {
    const dir = tempDir('phase-commit-size');
    for (const phase of foreignPhases) {
      const ctx = contextIn(dir, [], { phase });
      ctx.stagedFiles = Array.from({ length: 200 }, (_, i) => `src/f${i}.ts`);
      const findings = new CommitSizeCheck().run(ctx);
      expect(findings.some((item) => item.severity === 'error')).toBe(false);
      expect(findings.map((item) => item.code)).toEqual(['CSZ000']);
    }
  });

  it('version-files schweigt außerhalb von pre-commit — auch mit package.json im Index', () => {
    const dir = tempDir('phase-version-files');
    for (const phase of foreignPhases) {
      const ctx = contextIn(dir, [], { phase });
      ctx.stagedFiles = ['package.json', 'src/version.ts'];
      const findings = new VersionFilesCheck().run(ctx);
      expect(findings.filter((item) => item.code === 'VRF001')).toEqual([]);
      expect(findings.every((item) => item.severity === 'info')).toBe(true);
    }
  });

  it('beide bleiben in pre-commit scharf — die Abschaltung gilt nicht global', () => {
    const dir = tempDir('phase-still-sharp');
    const ctx = contextIn(dir, [], { phase: 'pre-commit' });
    ctx.stagedFiles = ['package.json', 'src/version.ts'];
    expect(new VersionFilesCheck().run(ctx).filter((item) => item.code === 'VRF001')).toHaveLength(2);
    const big = contextIn(dir, [], { phase: 'pre-commit' });
    big.stagedFiles = Array.from({ length: 26 }, (_, i) => `src/x${i}.ts`);
    expect(new CommitSizeCheck().run(big).some((item) => item.code === 'CSZ001')).toBe(true);
  });

  it('beide Phasen sind im Kontext gültige Gate-Phasen', () => {
    const { git, config } = initTempRepo('phase-valid');
    for (const phase of foreignPhases) {
      expect(contextFor(git, config, { phase }).phase).toBe(phase);
    }
    expect(() => contextFor(git, config, { phase: 'post-rewrite' as never })).toThrow('Ungültige Gate-Phase');
  });
});

/**
 * Merge-Nachricht: der Pflicht-Body (MSG010).
 *
 * Ausgangslage ist eine Messung: `git merge --no-ff` schreibt `Merge branch 'x'` — an der
 * 200-Wort-Regel gemessen **ein** Wort. Ohne die Ausnahme für den Titel würde jeder Merge an
 * MSG007 scheitern; ohne die Pflicht für den Body würde jeder Merge mit leerer Begründung in die
 * Historie gehen. Diese beiden Tests halten beide Hälften fest.
 */
describe('Merge-Nachricht (MSG010 — Pflicht-Body)', () => {
  const config = defaultConfig('/tmp/shinon-merge-msg');

  it('weist Gits Einzeiler-Merge ab — der Grundfall, der vorher durchging', () => {
    const findings = validateMergeMessage("Merge branch 'feature'", config);
    const codes = findings.map((item) => item.code);
    expect(codes).toContain('MSG010');
    // Und ausdrücklich NICHT MSG007: Git schreibt den Titel, wir verhindern das nicht.
    expect(codes).not.toContain('MSG007');
  });

  it('akzeptiert Git-Titel mit ausreichendem Body, ohne Conventional-Commit-Form', () => {
    const body = Array.from({ length: 80 }, (_, i) => `Beleg${i}`).join(' ');
    for (const subject of [
      "Merge branch 'feature'",
      "Merge remote-tracking branch 'origin/main'",
      'Merge pull request #12 from vannon091118/feature',
      "Rebase branch 'x' onto 'y'",
    ]) {
      const findings = validateMergeMessage(`${subject}\n\n${body}`, config);
      expect(findings.filter((item) => item.severity === 'error')).toEqual([]);
    }
  });

  it('schweigt in allen Phasen außer pre-merge', () => {
    const dir = tempDir('merge-message-phases');
    for (const phase of ['preflight', 'pre-commit', 'pre-push', 'pre-rebase'] as const) {
      const ctx = contextIn(dir, [], { phase });
      ctx.message = "Merge branch 'feature'";
      expect(new MergeMessageCheck().run(ctx)).toEqual([]);
    }
    const merge = contextIn(dir, [], { phase: 'pre-merge' });
    merge.message = "Merge branch 'feature'";
    expect(new MergeMessageCheck().run(merge).some((item) => item.code === 'MSG010')).toBe(true);
  });

  it('fail-closed: eine Merge-Phase ohne Nachricht ist ein Fehler, kein stilles OK', () => {
    const dir = tempDir('merge-message-missing');
    const ctx = contextIn(dir, [], { phase: 'pre-merge' });
    const findings = new MergeMessageCheck().run(ctx);
    expect(findings.map((item) => item.code)).toEqual(['MSG008']);
    expect(findings[0]?.severity).toBe('error');
  });

  it('besteht den eingebauten Selbsttest', () => {
    const result = runMergeMessageSelfTest(config);
    expect(result.failed).toEqual([]);
    expect(result.total).toBeGreaterThanOrEqual(8);
  });

  it('ist als Default-Check registriert — ein ausgeschalteter Check schafft genau die Lücke', () => {
    expect(config.gate.checks.mergeMessage).toBe(true);
    expect(buildChecks(config).map((check) => check.id)).toContain('merge-message');
    expect(knownCheckIds()).toContain('merge-message');
  });
});

describe('Untracked-Indexquellen', () => {
  it('blockiert Source-/Asset-Dateien, lässt tracked und gewöhnliche Notizen durch', async () => {
    const { dir, git, config } = initTempRepo('untracked-inputs');
    write(dir, 'src/tracked.ts', 'export const tracked = true;\n');
    gitIt(dir, ['add', 'src/tracked.ts']);
    write(dir, 'src/pending.test.ts', 'export const pending = true;\n');
    write(dir, 'src/pending.source.txt', 'source truth\n');
    write(dir, 'notes.txt', 'not an index input\n');

    const ctx = contextFor(git, config);
    const findings = new UntrackedInputCheck().run(ctx);
    expect(findings.map((item) => item.file)).toEqual(['src/pending.source.txt', 'src/pending.test.ts']);
    expect(findings.every((item) => item.code === 'UNP001' && item.severity === 'error')).toBe(true);
    expect(findings.some((item) => item.file === 'notes.txt')).toBe(false);
    expect((await new ShinonGate([new UntrackedInputCheck()]).run(ctx)).passed).toBe(false);

    const precommit = contextFor(git, config, { phase: 'pre-commit' });
    expect(new UntrackedInputCheck().run(precommit)).toEqual([]);
    expect((await new ShinonGate([new UntrackedInputCheck()]).run(precommit)).passed).toBe(true);
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
