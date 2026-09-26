import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { buildChecks } from '../checks/index.ts';
import { ShinonGate } from '../gate.ts';
import { defaultConfig } from '../config.ts';
import { ShinonGitHelfer } from '../git-helfer.ts';
import { HOOKS_RELATIVE_DIR, HOOK_ENTRY_RELATIVE_PATH, hookScripts, installHooks } from '../hooks.ts';
import { PROJECT_ROOT as ROOT, commitFixture, contextFor, gitIt, initTempRepo, runEntry, shimRealEntry, tempDir, write } from './helpers.ts';
import type { ShinonCheck } from '../checks/check.ts';

/**
 * Die sechs Hooks. Die Reihenfolge ist die Generator-Reihenfolge und wird als Vertrag festgehalten —
 * ein Hook, der hier fehlt, ist ein Gate, das niemals läuft.
 *
 * Die drei neuen Namen sind nicht Kosmetik, sondern die geschlossene Lücke. Gemessen an git
 * 2.53.0.windows.4 (Wegwerf-Probe mit echten Hook-Dateien, nicht aus der Doku abgeleitet):
 *   · `git merge`  feuert `pre-merge-commit` + `commit-msg`, NIE `pre-commit`
 *   · `git rebase` feuert `pre-rebase`, weder `pre-commit` noch `commit-msg` — VORAUSSETZUNG:
 *     `tools/hooks/pre-rebase` liegt in der aktuellen Worktree. Der Hook feuert VOR dem Rebase-Start,
 *     also im alten Baum: ist der Hooks-Pfad dort nicht committet (nur im Zielbaum), springt Git
 *     ihn still — gemessen, kein Git-Handbuch.
 *   · `git push`   feuert `pre-push` (argc 2) — die Phase existierte, hatte aber keinen Erzeuger
 */
const HOOK_NAMES = [
  'pre-commit',
  'commit-msg',
  'post-commit',
  'pre-push',
  'pre-merge-commit',
  'pre-rebase',
] as const;

/**
 * Body über der 200-Wort-Grenze (MSG007). Hook-Verträge brauchen echte Commits, also echte
 * Nachrichten — und die Nachrichtenregel greift für normale Commits, nicht für Merges. Wer in
 * einem Wegwerf-Repo einen Branch erzeugt, braucht also diesen Body, sonst entsteht der Branch
 * nicht und der Test prüft ins Leere.
 */
function wideBody(): string {
  return Array.from({ length: 220 }, (_, i) => `Beleg${i}`).join(' ');
}

describe('Shinon-Hook-Vertrag', () => {
  it('hält die Generator-Reihenfolge und tracked Inhalte synchron', () => {
    const scripts = hookScripts();

    expect(Object.keys(scripts)).toEqual(HOOK_NAMES);
    const entry = HOOK_ENTRY_RELATIVE_PATH.split(path.sep).join('/');
    expect(scripts['pre-commit']).toContain(
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-commit --quiet`,
    );
    expect(scripts['commit-msg']).toContain(
      `exec node "$SHINON_ROOT/${entry}" message --file="$1" --quiet`,
    );
    expect(scripts['post-commit']).toContain(
      `exec node "$SHINON_ROOT/${entry}" push --auto --quiet`,
    );
    expect(scripts['pre-push']).toContain(
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-push --quiet`,
    );
    // $1 ist die Datei, aus der Git den Merge-Titel liest — ohne sie gäbe es nichts zu prüfen.
    expect(scripts['pre-merge-commit']).toContain(
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-merge --message-file="$1" --quiet`,
    );
    expect(scripts['pre-rebase']).toContain(
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-rebase --quiet`,
    );
    // commit-msg muss an der Nachrichtendatei ($1) unterscheiden: MSG007 (200 Wörter) gilt für
    // Commits, MSG010 (60 Wörter Pflicht-Body) für Merges. Der Unterscheidungsweg ist gemessen,
    // nicht dokumentiert: $2 kommt bei git 2.53 NICHT an (siehe der Fire-Test weiter unten).
    expect(scripts['commit-msg']).toContain('case "$1" in');
    expect(scripts['commit-msg']).toContain('*/MERGE_MSG)');
    expect(scripts['commit-msg']).toContain('merge-message --file="$1" --quiet');
    expect(scripts['commit-msg']).toContain('message --file="$1" --quiet');
    for (const name of HOOK_NAMES) {
      expect(scripts[name]).not.toContain('scripts/precommit.js');
      expect(gitIt(ROOT, ['ls-files', '--error-unmatch', path.posix.join('tools', 'hooks', name)]).ok).toBe(true);
      expect(fs.readFileSync(path.join(ROOT, 'tools', 'hooks', name), 'utf8')).toBe(scripts[name]);
    }
    expect(fs.existsSync(path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH))).toBe(true);
  });

  it('installiert alle sechs Hooks lokal, setzt core.hooksPath und lässt globale Config unverändert', () => {
    const { dir, git } = initTempRepo('hooks-install');
    // Der Windows-Realfall explizit: bei `core.fileMode=false` liest Git das Bit aus dem
    // Dateisystem NICHT — der 100755-Assert unten beweist dann wirklich, dass `installHooks`
    // den Index schreibt, und nicht dass die Platte zufällig kooperiert.
    git.configSet('core.fileMode', 'false');
    const globalBefore = gitIt(dir, ['config', '--global', '--get', 'core.hooksPath']);

    const result = installHooks(git);

    expect(result.changed).toBe(true);
    expect(result.written).toEqual(HOOK_NAMES.map((name) => `tools/hooks/${name}`));
    expect(result.hooksPath).toBe('tools/hooks');
    expect(gitIt(dir, ['config', '--local', '--get', 'core.hooksPath']).stdout.trim()).toBe('tools/hooks');
    expect(gitIt(dir, ['config', '--global', '--get', 'core.hooksPath'])).toEqual(globalBefore);
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    for (const name of HOOK_NAMES) {
      const mode = gitIt(dir, ['ls-files', '--stage', `tools/hooks/${name}`]).stdout;
      expect(mode).toMatch(/^100755 /);
      expect(fs.readFileSync(path.join(dir, HOOKS_RELATIVE_DIR, name), 'utf8')).toBe(hookScripts()[name]);
    }
  });

  it('schlägt fail-closed fehl, wenn das Ausführ-Bit nicht in den Index wandert', () => {
    // Der 100755-Test oben beweist nur den Erfolgsfall. Dieser Test nimmt den Fehlerfall: wenn
    // `update-index` scheitert, meldet `installHooks` trotzdem „Hooks installiert" — der Aufrufer
    // glaubt, der Hook sei im Commit ausführbar, und der Hook ist es nicht. `markExecutable`
    // liefert genau dafür das `boolean`, das `installHooks` bis heute wegwirft.
    const { dir, git } = initTempRepo('hooks-exec-bit-fails');
    git.configSet('core.fileMode', 'false');
    const helfer = new ShinonGitHelfer(dir);
    helfer.markExecutable = () => false; // der Aufruf scheitert (EPERM, read-only Index, Lock)

    expect(() => installHooks(helfer)).toThrow(/Ausführ-Bit/);
  });

  it('verweigert Hook-Installation außerhalb eines Git-Repositories vor jedem Schreibpfad', () => {
    const dir = tempDir('entry-install-hooks-nonrepo');

    const result = runEntry(dir, ['install-hooks'], {
      GIT_CEILING_DIRECTORIES: path.join(ROOT, 'tools', '.tmp'),
    });

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('Kein Git-Repository');
    expect(fs.existsSync(path.join(dir, 'tools', 'hooks'))).toBe(false);
  });

  it('führt bei einem normalen Git-Commit exakt pre-commit, commit-msg und post-commit aus', () => {
    const { dir, git } = initTempRepo('hooks-run');
    const log = path.join(dir, 'hook-calls.log');
    write(
      dir,
      'tools/shinon/hook-entry.mjs',
      [
        "import fs from 'node:fs';",
        `fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');`,
      ].join('\n'),
    );
    installHooks(git);
    write(dir, 'probe.txt', 'probe\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);

    const commit = gitIt(dir, ['commit', '-m', 'test commit']);

    expect(commit.ok).toBe(true);
    const calls = fs
      .readFileSync(log, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[]);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual(['gate', '--phase=pre-commit', '--quiet']);
    expect(calls[1]?.[0]).toBe('message');
    expect(calls[1]?.[1]).toMatch(/^--file=/);
    expect(calls[1]?.[2]).toBe('--quiet');
    expect(calls[2]).toEqual(['push', '--auto', '--quiet']);
  });

  it('führt den dokumentierten JavaScript-Einstieg unter plain Node aus', () => {
    const entry = path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH);
    const result = spawnSync(process.argv[0], [entry, 'help'], { cwd: ROOT, encoding: 'utf8' });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Shinon — Commit + Push Executor');
  });

  /**
   * Merge-Hooks im echten Lauf, mit gemessener Argumentlage.
   *
   * Die Messung, die diesen Test erzwungen hat: ich hatte den `commit-msg`-Hook ursprünglich auf
   * `$2` aufgesetzt (das ist, was die Git-Doku als Quelltyp nennt). Eine Wegwerf-Probe mit
   * argumentzählendem Hook zeigte: bei Merge, Squash und normalem Commit ist `$#` **1** — `$2`
   * kommt nicht an. Der Entwurf hätte jeden Merge still an die 200-Wort-Commitregel geschickt
   * und damit jeden Merge blockiert. Der Hook unterscheidet jetzt über `$1` (`MERGE_MSG`).
   *
   * Erwartet wird beides zugleich: der Merge wird ABGELEHNT (MSG010, Pflicht-Body) und derselbe
   * Nachrichtenmechanismus lässt einen Commit mit Body durch. Nur die erste Hälfte zu prüfen
   * hieße „blockiert", nicht „unterscheidet".
   */
  it('lehnt beim echten Merge den Einzeiler ohne Body ab und committet sonst weiter', () => {
    const { dir, git } = initTempRepo('hooks-merge-commit');
    // Reihenfolge, jetzt belegt statt geraten — drei Fehler in Folge, alle hier entstanden:
    //   1. `shimRealEntry` ZUERST: sonst stirbt jeder Hook mit `Cannot find module`.
    //   2. Fixture-Commits laufen OHNE Hooks (`commitFixture`): die volle pre-commit-Stufe
    //      (Typecheck ohne tsconfig, Changelog-Pflicht) kann in einem Wegwerf-Repo nicht
    //      bestehen — der Test scheiterte daran und meldete es als Nachrichtenfehler.
    //   3. `installHooks` erst danach: der zu prüfende MERGE läuft mit den echten Hooks, und der
    //      Baum ist davor sauber. `installHooks` STAGED die Skripte (Ausführ-Bit via update-index)
    //      — mit stagedem Index verweigert der Merge („local changes ... would be overwritten").
    //      Also die Hooks danach als Fixture committen: Index == HEAD, Merge kann starten.
    shimRealEntry(dir);
    write(dir, 'base.txt', 'base\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);

    gitIt(dir, ['checkout', '-b', 'feature']);
    write(dir, 'feature.txt', 'feature\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'feature arbeit', '-m', wideBody()]).ok).toBe(true);

    gitIt(dir, ['checkout', 'main']);
    write(dir, 'main.txt', 'main\n');
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'main arbeit']).ok).toBe(true);

    installHooks(git);
    // Die gestagten Hook-Skripte committen: mit Index != HEAD verweigert Git den Merge komplett
    // („local changes would be overwritten"), und der Test scheitert, bevor eine Stufe greift.
    gitIt(dir, ['add', '-A']);
    expect(commitFixture(dir, ['commit', '-m', 'hooks im baum']).ok).toBe(true);

    const merge = gitIt(dir, ['merge', '--no-ff', '--no-edit', 'feature', '--no-gpg-sign']);

    expect(merge.ok, `Merge sollte am Pflicht-Body scheitern:\n${merge.stdout}\n${merge.stderr}`).toBe(
      false,
    );
    expect(merge.stderr + merge.stdout).toMatch(/MSG010|Pflicht-Body|merge-message/);
    expect(gitIt(dir, ['log', '--merges', '--oneline']).stdout.trim()).toBe('');

    // Zweite Hälfte: der Nachweis, dass die Regel unterscheidet statt zu blockieren, läuft auf
    // CLI-Ebene. Ein komplettes `git commit` mit aktiven Hooks kann in einem Wegwerf-Repo
    // strukturell nicht bestehen (Typecheck ohne tsconfig, Changelog-Pflicht) — rot wäre dort
    // Aussagekraftlos. Geprüft wird die Stufeneingabe selbst: MSG010 lässt Titel+Body durch,
    // und derselbe Mechanismus blockiert den Einzeiler.
    const msgFile = path.join(dir, 'merge-msg.txt');
    fs.writeFileSync(msgFile, `Merge branch 'feature'\n\n${wideBody()}\n`);
    const ok = runEntry(dir, ['merge-message', `--file=${msgFile}`]);
    expect(ok.status, `merge-message mit Body:\n${ok.stdout}\n${ok.stderr}`).toBe(0);

    fs.writeFileSync(msgFile, `Merge branch 'feature'\n`);
    const bad = runEntry(dir, ['merge-message', `--file=${msgFile}`]);
    expect(bad.status, `Merge-Einzeiler sollte abgelehnt werden:\n${bad.stdout}\n${bad.stderr}`).toBe(1);
    expect(bad.stdout + bad.stderr).toMatch(/MSG010/);
    // Echte Hook-Spawns sind lastabhängig langsam — die 30s-Default-Grenze war auf geladener
    // Maschine rot, obwohl die Regel selbst grün war.
  }, 120_000);

  /**
   * Der eigentliche Beweis — nicht „die Datei existiert", sondern „Git ruft sie auf".
   *
   * Die Messung, die diesen Test motiviert hat (git 2.53.0.windows.4, Wegwerf-Probe): `git merge`
   * feuert `pre-merge-commit` und `commit-msg`, aber NIE `pre-commit`; `git rebase` feuert
   * `pre-rebase`, weder `pre-commit` noch `commit-msg` — mit der gemessenen Voraussetzung, dass
   * die Hook-Datei im QUELL-Baum liegt (siehe Rebase-Zweig unten). `git push` feuert `pre-push`
   * mit argc 2.
   * Der Generator-Test oben beweist nur, dass die Skripte richtig geschrieben sind — dieser hier
   * beweist, dass Git sie für die jeweilige Aktion tatsächlich aufruft. Ohne ihn wäre ein Hook,
   * den Git nie feuert, unauffindbar grün.
   */
  it('feuert bei push, merge und rebase diejeweilige Phase — nicht nur beim Commit', () => {
    for (const action of ['push', 'merge', 'rebase'] as const) {
      const { dir, git } = initTempRepo(`hooks-fire-${action}`);
      // Das Log liegt AUSSERHALB des Repos. Im Repo würde es (a) den Baum schmutzig machen und
      // den Merge an den lokalen Änderungen scheitern lassen und (b) bei `git add -A` mit
      // committet werden. Genau das hat diesen Test einmal scheitern lassen.
      const log = path.join(tempDir(`hooks-fire-${action}-log`), 'hook-calls.log');
      write(
        dir,
        'tools/shinon/hook-entry.mjs',
        [
          "import fs from 'node:fs';",
          `fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');`,
        ].join('\n'),
      );
      // Wie im Merge-Test: Fixture-Commits laufen ohne Hooks (ein Wegwerf-Repo besteht die volle
      // pre-commit-Stufe strukturell nicht), der zu prüfende Vorgang mit den installierten echten
      // Hooks. `installHooks` erst nach dem Aufbau, damit der Baum beim Merge sauber ist.
      write(dir, 'base.txt', 'base\n');
      gitIt(dir, ['add', '-A']);
      expect(commitFixture(dir, ['commit', '-m', 'basis']).ok).toBe(true);
      // Für merge/rebase braucht es zwei divergierende Branches, sonst fast-forwardt Git und
      // feuert pre-merge-commit/pre-rebase nicht — der Test wäre grün und hätte nichts bewiesen.
      gitIt(dir, ['checkout', '-b', 'feature']);
      write(dir, 'feature.txt', 'feature\n');
      gitIt(dir, ['add', '-A']);
      expect(commitFixture(dir, ['commit', '-m', 'feature arbeit', '-m', wideBody()]).ok).toBe(true);
      gitIt(dir, ['checkout', 'main']);
      write(dir, 'main.txt', 'main\n');
      gitIt(dir, ['add', '-A']);
      expect(commitFixture(dir, ['commit', '-m', 'main arbeit']).ok).toBe(true);
      installHooks(git);
      // `installHooks` STAGED die sechs Skripte (Ausführ-Bit via update-index). Mit Index != HEAD
      // verweigern Merge UND Rebase vor dem ersten Hook — und der Test scheiterte genau so.
      // Die Hooks als Fixture committen: Index == HEAD, die Vorgänge können starten.
      gitIt(dir, ['add', '-A']);
      expect(commitFixture(dir, ['commit', '-m', 'hooks im baum']).ok).toBe(true);
      fs.rmSync(log, { force: true });

      if (action === 'push') {
        const remote = tempDir(`hooks-fire-push-remote`);
        expect(gitIt(remote, ['init', '--bare']).ok).toBe(true);
        gitIt(dir, ['remote', 'add', 'origin', remote]);
        gitIt(dir, ['push', '-u', 'origin', 'main']);
      } else if (action === 'merge') {
        // Kompletter Merge (nicht `--no-commit`): nur der abgeschlossene Merge feuert
        // pre-merge-commit und commit-msg — gemessen, nicht aus der Doku. `--no-commit` würde
        // keinen einzigen der Merge-Hooks auslösen, und der Test wäre grün ohne Beweis.
        const m1 = gitIt(dir, ['merge', '--no-ff', '--no-edit', 'feature', '--no-gpg-sign']);
        expect(m1.ok, `Merge:\n${m1.stdout}\n${m1.stderr}`).toBe(true);
      } else {
        // GEMESSENE VORAUSSETZUNG: `pre-rebase` feuert VOR dem Rebase-Start, also aus der
        // aktuellen Worktree heraus. Die Hooks (tools/hooks) sind hier erst im MAIN-Baum
        // committet ('hooks im baum') — im feature-Baum existiert `tools/hooks/pre-rebase`
        // nicht auf Platte, und Git springt den Hook still über. Das hat diesen Test scheitern
        // lassen, obwohl jede frische Probe mit Hooks im feature-Baum zuverlässig feuerte.
        // Main (mit den Hooks) daher erst in feature mergen, dann neue Divergenz schaffen.
        // Alle Schritte sind Fixture-Arbeit und laufen ohne Hooks.
        gitIt(dir, ['checkout', 'feature']);
        const m2 = commitFixture(dir, ['merge', '--no-ff', '--no-edit', 'main']);
        expect(m2.ok, `Hooks-Merge:\n${m2.stdout}\n${m2.stderr}`).toBe(true);
        write(dir, 'feature2.txt', 'feature2\n');
        gitIt(dir, ['add', '-A']);
        expect(commitFixture(dir, ['commit', '-m', 'feature weiter']).ok).toBe(true);
        gitIt(dir, ['checkout', 'main']);
        write(dir, 'main2.txt', 'main2\n');
        gitIt(dir, ['add', '-A']);
        expect(commitFixture(dir, ['commit', '-m', 'main weiter']).ok).toBe(true);
        gitIt(dir, ['checkout', 'feature']);
        // Der Rebase muss real Arbeit tun (feature-weiter wird auf main-weiter aufgespielt) —
        // ein up-to-date-Rebase feuert pre-rebase ebenfalls nicht.
        const rb = gitIt(dir, ['rebase', 'main']);
        expect(rb.ok, `Rebase:\n${rb.stdout}\n${rb.stderr}`).toBe(true);
      }

      const calls = fs.existsSync(log)
        ? fs.readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as string[])
        : [];
      const phases = calls.map((call) => call.find((token) => token.startsWith('--phase=')) ?? '');

      if (action === 'push') {
        expect(phases, `push muss pre-push auslösen, sah ${JSON.stringify(calls)}`).toContain('--phase=pre-push');
      } else {
        expect(calls.length, `${action} hat überhaupt keinen Hook ausgelöst: ${JSON.stringify(calls)}`).toBeGreaterThan(0);
        if (action === 'merge') {
          // Kompletter Merge: commit-msg liest `.git/MERGE_MSG` und dispatcht auf `merge-message`.
          // Die Unterscheidung entscheidet der Dateiname — nicht `$2`, der gemessen nie ankommt
          // (siehe der Merge-Rejection-Test darüber, der dieselbe Stufe mit den echten Hooks fährt).
          expect(calls.map((call) => call[0])).toContain('merge-message');
        } else {
          expect(phases, `rebase muss pre-rebase auslösen, sah ${JSON.stringify(calls)}`).toContain('--phase=pre-rebase');
        }
      }
    }
    // Drei wegwerfende Repos mit echten Git-Vorgängen — lastabhängig langsam, Default (30s) reicht
    // nicht (gemessen: 36–60s auf geladener Maschine).
  }, 120_000);

  it('weist ungültige Check- und Phaseneingaben fail-closed ab', () => {
    const { dir, git } = initTempRepo('entry-invalid-gate-input');
    const entry = path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH);
    const result = spawnSync(process.argv[0], [entry, 'gate', '--only=', `--root=${dir}`], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('mindestens eine Check-ID');
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);
    expect(git.status().clean).toBe(true);
  });

  it('weist unbekannte Optionen ab, bevor der Starter den README-Block verändert', () => {
    const { dir } = initTempRepo('entry-unknown-option');
    const readme = write(dir, 'README.md', '# unverändert\n');
    const before = fs.readFileSync(readme, 'utf8');
    const entry = path.join(ROOT, HOOK_ENTRY_RELATIVE_PATH);
    const result = spawnSync(
      process.argv[0],
      [entry, 'prepare', '--dry-runn', `--root=${dir}`],
      { cwd: dir, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('Unbekannte Option: --dry-runn');
    expect(fs.readFileSync(readme, 'utf8')).toBe(before);
  });

  it('führt prepare --dry-run ohne README- oder State-Schreibvorgang aus', () => {
    const { dir } = initTempRepo('entry-prepare-dry-run');
    write(dir, 'README.md', '# unverändert\n');
    const before = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');

    const result = runEntry(dir, ['prepare', '--dry-run', '--only=untracked-inputs']);

    expect(result.status, result.stderr).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')).toBe(before);
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);
  });

  it('lehnt eine --only-Auswahl ab, die der Commit-Befehl gar nicht ausführen würde', () => {
    const { dir, git } = initTempRepo('entry-only-not-applicable');
    write(dir, 'src/pending.ts', 'export const pending = true;\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    const headBefore = git.headHash();
    const message = `feat(probe): keine stille Auswahl\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;

    const result = runEntry(dir, ['commit', '--only=does-not-exist', `--message=${message}`]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--only ist für den Befehl „commit“ nicht wirksam');
    expect(git.headHash()).toBe(headBefore);
  });

  it('hält gate --dry-run und commit --dry-run read-only', () => {
    const { dir, git } = initTempRepo('entry-gate-commit-dry-run');
    write(dir, 'src/pending.ts', 'export const pending = true;\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    const headBefore = git.headHash();

    const gate = runEntry(dir, ['gate', '--phase=pre-commit', '--dry-run', '--only=commit-size']);
    expect(gate.status, gate.stderr).toBe(0);
    expect(fs.existsSync(path.join(dir, 'tools', '.shinon-state.json'))).toBe(false);

    const message = `feat(probe): trocken\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;
    const commit = runEntry(dir, ['commit', '--dry-run', `--message=${message}`]);
    expect(commit.status, commit.stderr).toBe(0);
    expect(commit.stdout).toContain('Commit-Probelauf');
    expect(git.headHash()).toBe(headBefore);
  });

  it('lehnt einen nicht read-onlyfähigen Dry-run vor jedem Schreibpfad ab', () => {
    const { dir } = initTempRepo('entry-unsupported-dry-run');

    const result = runEntry(dir, ['install-hooks', '--dry-run']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('nicht unterstützt');
    expect(fs.existsSync(path.join(dir, 'tools', 'hooks'))).toBe(false);
    expect(gitIt(dir, ['config', '--local', '--get', 'core.hooksPath']).ok).toBe(false);
  });

  it('erkennt untracked Quellverzeichnisse als konkrete Dateien', () => {
    const { dir } = initTempRepo('entry-untracked-directory');
    write(dir, 'README.md', '# Test\n');
    expect(gitIt(dir, ['add', '-A']).ok).toBe(true);
    expect(gitIt(dir, ['commit', '-m', 'initial', '--no-gpg-sign']).ok).toBe(true);
    write(dir, 'src/new/pending.ts', 'export const pending = true;\n');

    const result = runEntry(dir, ['gate', '--phase=preflight', '--only=untracked-inputs']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('src/new/pending.ts');
  });

  it('akzeptiert einen Changelog auf einem unborn Branch', () => {
    const { dir } = initTempRepo('entry-changelog-unborn');
    write(dir, 'CHANGELOG.md', '# Changelog\n\n- [Gate] unborn branch\n');

    const result = runEntry(dir, ['gate', '--phase=preflight', '--only=changelog']);

    expect(result.status, result.stderr).toBe(0);
  });

  it('verwirft einen unbrauchbaren State-Snapshot statt den Starter zu crashen', () => {
    const { dir } = initTempRepo('entry-state-shape');
    write(dir, '.gitignore', 'tools/.shinon-state.json\n');
    write(dir, 'README.md', '# Test\n');
    write(dir, 'tools/.shinon-state.json', JSON.stringify({ lastCommit: {} }));

    const result = runEntry(dir, ['prepare', '--only=untracked-inputs']);

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'tools', '.shinon-state.json'), 'utf8')).lastCommit)
      .toBeUndefined();
  });

  it('weist überzählige Positionsargumente und Boolean-Werte fail-closed ab', () => {
    const { dir } = initTempRepo('entry-cli-boundaries');

    const extra = runEntry(dir, ['gate', 'status', '--only=commit-size']);
    expect(extra.status).toBe(1);
    expect(extra.stderr).toContain('Unerwartetes Argument');

    const booleanValue = runEntry(dir, ['gate', '--dry-run=false', '--only=commit-size']);
    expect(booleanValue.status).toBe(1);
    expect(booleanValue.stderr).toContain('akzeptiert keinen Wert');
  });

  it('bewahrt Registry-Reihenfolge und Fail-fast ohne neue Hook-Prüfung', async () => {
    const config = defaultConfig(ROOT);
    config.gate.checks.e2e = false;
    config.gate.checks.build = false;
    expect(buildChecks(config).map((check) => check.id)).toEqual([
      'commit-message',
      'loc-caps',
      'forbidden-patterns',
      'untracked-inputs',
      'typecheck',
      'tests',
      'changelog',
      'doc-links',
      'commit-size',
      'version-files',
      'merge-message',
    ]);

    const { git } = initTempRepo('hooks-fail-fast');
    let expensiveRan = false;
    const failing: ShinonCheck = {
      id: 'fail-fast-contract',
      title: 'Fail-fast contract',
      run: () => [{ check: 'fail-fast-contract', code: 'TEST001', severity: 'error', message: 'stop' }],
    };
    const expensive: ShinonCheck = {
      id: 'expensive-contract',
      title: 'Expensive contract',
      expensive: true,
      run: () => {
        expensiveRan = true;
        return [];
      },
    };
    const report = await new ShinonGate([failing, expensive]).run(contextFor(git, config, { quiet: true }));

    expect(report.passed).toBe(false);
    expect(report.outcomes.map((outcome) => [outcome.id, outcome.skipped])).toEqual([
      ['fail-fast-contract', false],
      ['expensive-contract', true],
    ]);
    expect(expensiveRan).toBe(false);
  });
});
