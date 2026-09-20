import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ShinonCommitKomponist } from '../commit-komponist.ts';
import { gitIt, initTempRepo, stateFor, write } from './helpers.ts';

/** git hängt bei `--pretty=%B` einen Zeilenumbruch an — verglichen wird der Inhalt selbst. */
function committedBody(dir: string): string {
  return gitIt(dir, ['log', '-1', '--pretty=%B']).stdout.trimEnd();
}

function longMessage(subject: string): string {
  return `${subject}\n\n${Array.from({ length: 200 }, (_, index) => `Beleg${index + 1}`).join(' ')}`;
}

describe('ShinonCommitKomponist', () => {
  it('committet exakt den Inhalt von commit_msg.txt über `git commit -F -`', () => {
    const { dir, git, config } = initTempRepo('komponist-verbatim');
    const message = longMessage('feat(shinon): Komponist committet exakt diese Nachricht');
    write(dir, config.commit.messageFile, `${message}\n`);
    write(dir, 'src/thing.ts', 'export const thing = 1;\n');
    gitIt(dir, ['add', '-A']);

    const result = new ShinonCommitKomponist(git, config, stateFor(git)).commit();

    expect(result.ok).toBe(true);
    expect(result.hash).not.toBeNull();
    expect(committedBody(dir)).toBe(message);
    // Konsum-Vertrag: die Nachrichtendatei ist gelöscht — sie bleibt als einzige
    // Working-Copy-Änderung zurück (kein stiller Zustand, der den nächsten Lauf fälscht).
    expect(gitIt(dir, ['status', '--porcelain', '--untracked-files=no']).stdout.trim()).toBe('D commit_msg.txt');
    expect(gitIt(dir, ['log', '--oneline']).stdout.trim().split('\n')).toHaveLength(1);
    expect(stateFor(git).read().lastCommit?.hash).toBe(result.hash);
    expect(fs.existsSync(result.messageFile)).toBe(false); // Konsum: Datei ist weg
  });

  it('bricht bei ungültiger Nachricht ab, ohne etwas umzuformulieren', () => {
    const { dir, git, config } = initTempRepo('komponist-invalid');
    write(dir, config.commit.messageFile, 'einfach so ohne Typ\n');
    write(dir, 'src/thing.ts', 'export const thing = 1;\n');
    gitIt(dir, ['add', '-A']);

    const result = new ShinonCommitKomponist(git, config, stateFor(git)).commit();

    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.code === 'MSG002')).toBe(true);
    expect(result.verbatim).toBe('einfach so ohne Typ\n');
    expect(gitIt(dir, ['log', '--oneline']).stdout.trim()).toBe('');
  });

  it('bricht bei leerem Index ab', () => {
    const { git, config } = initTempRepo('komponist-empty-index');
    const result = new ShinonCommitKomponist(git, config, stateFor(git)).commit({ message: longMessage('feat(x): ok') });
    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.code === 'KOM001')).toBe(true);
  });

  it('bricht ab, wenn die Nachrichtendatei fehlt', () => {
    const { dir, git, config } = initTempRepo('komponist-no-file');
    write(dir, 'src/thing.ts', 'export const thing = 1;\n');
    gitIt(dir, ['add', '-A']);

    const result = new ShinonCommitKomponist(git, config, stateFor(git)).commit();

    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.code === 'KOM002')).toBe(true);
  });

  it('akzeptiert eine explizit übergebene Nachricht', () => {
    const { dir, git, config } = initTempRepo('komponist-explicit');
    write(dir, 'src/thing.ts', 'export const thing = 1;\n');
    gitIt(dir, ['add', '-A']);

    const result = new ShinonCommitKomponist(git, config, stateFor(git)).commit({ message: longMessage('fix(shinon): direkt') });
    expect(result.ok).toBe(true);
    expect(gitIt(dir, ['log', '-1', '--pretty=%s']).stdout.trim()).toBe('fix(shinon): direkt');
  });

  it('konsumiert die Nachrichtendatei nach dem Commit (keine alte Nachricht beim nächsten Lauf)', () => {
    const { dir, git, config } = initTempRepo('komponist-consume');
    write(dir, config.commit.messageFile, `${longMessage('feat(shinon): erste Nachricht')}\n`);
    write(dir, 'src/thing.ts', 'export const thing = 1;\n');
    gitIt(dir, ['add', '-A']);

    const first = new ShinonCommitKomponist(git, config, stateFor(git)).commit();
    expect(first.ok).toBe(true);
    expect(fs.existsSync(first.messageFile)).toBe(false);

    // Zweiter Lauf ohne vorbereitete Datei MUSS abbrechen (KOM002) — die alte Nachricht
    // ist nicht mehr da und wird nicht still wiederverwendet.
    write(dir, 'src/other.ts', 'export const other = 2;\n');
    gitIt(dir, ['add', '-A']);
    const second = new ShinonCommitKomponist(git, config, stateFor(git)).commit();
    expect(second.ok).toBe(false);
    expect(second.findings.some((item) => item.code === 'KOM002')).toBe(true);
  });
});
