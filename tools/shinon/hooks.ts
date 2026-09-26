import fs from 'node:fs';
import path from 'node:path';
import type { ShinonGitHelfer } from './git-helfer.ts';

/**
 * Shinon-Hooks — der Ort, an dem das Gate tatsächlich erzwungen wird.
 *
 * Alle Hooks liegen in `tools/hooks` und rufen ausschließlich den Shinon-CLI-Einstieg auf.
 * Sie entscheiden nichts selbst: pre-commit lässt das Gate laufen, commit-msg prüft dieselbe
 * Nachrichtenregel wie der Komponist, post-commit stößt die Push-Stufe für normale Git-Commits an
 * (abschaltbar über `push.autoAfterCommit`). Die Pipeline unterdrückt diesen Hook-Push und besitzt
 * den einzigen Push-Aufruf selbst. Der JS-Einstieg registriert nur den lokalen TypeScript-Loader;
 * es gibt keinen Download und keinen zweiten CLI-Weg.
 */

export const HOOKS_RELATIVE_DIR = path.join('tools', 'hooks');
export const HOOK_ENTRY_RELATIVE_PATH = path.join('tools', 'shinon', 'hook-entry.mjs');

/**
 * Die sechs installierten Hooks und was jeder davon schützt (sieben Hook-Punkte wurden gemessen,
 * `post-rewrite` taucht unten nur als Ausschlussgrund auf).
 *
 * Gemessen an git 2.53.0.windows.4 mit echten Hook-Dateien (Wegwerf-Probe), nicht aus der
 * Git-Doku abgeleitet — diese Tabelle ist der Grund, warum es sechs sind:
 *
 *   pre-commit         `git commit`           feuert bei merge/rebase NICHT
 *   commit-msg         `git commit`, `merge`  feuert bei rebase NICHT; argc 1 (s. u.)
 *   post-commit        nach `git commit`      —
 *   pre-merge-commit   nur `git merge`        der Merge-Commit, mit Nachricht
 *   pre-rebase         nur `git rebase`       1 Argument: Upstream; feuert VOR Rebase-Start,
 *                                            also aus der aktuellen Worktree heraus — liegt
 *                                            `tools/hooks/pre-rebase` dort nicht auf Platte
 *                                            (nur im Zielbaum committet), springt Git den
 *                                            Hook still über. Gemessen, kein Git-Handbuch.
 *   post-rewrite       `merge`, `rebase`      NICHT installiert: feuert nach dem Rebase,
 *                                            also zu spät für ein Gate (nachgemessen)
 *   pre-push           `git push`             argc 2: <remote> <url>
 *
 * `commit-msg` unterscheidet Merge und Commit über `$1`, die Nachrichtendatei — NICHT über `$2`.
 * Die Git-Doku nennt `$2` als Quelltyp (`message`, `template`, `merge`, …); gemessen an
 * git 2.53.0.windows.4 kommt er aber nicht an: Merge, Squash und normaler Commit rufen den Hook
 * alle mit `argc=1` auf. Ein Aufruf auf `$2` wäre damit still falsch — er schickt jeden Merge an
 * die 200-Wort-Commitregel (MSG007) und blockiert ihn. Gemessen und verwendet ist stattdessen:
 * `$1` ist `.git/MERGE_MSG` bei Merge und Squash, `.git/COMMIT_EDITMSG` sonst.
 */
export function hookScripts(): Record<string, string> {
  const header = '#!/bin/sh\n# Shinon — erzeugt von `shinon install-hooks`. Nicht manuell pflegen.\n';
  const root = 'SHINON_ROOT="$(git rev-parse --show-toplevel)"\n';
  const entry = HOOK_ENTRY_RELATIVE_PATH.split(path.sep).join('/');
  return {
    'pre-commit':
      `${header}${root}` +
      `# Gate-Stufe: Modulgrenzen, Constraints, Typecheck, Tests\nexec node "$SHINON_ROOT/${entry}" gate --phase=pre-commit --quiet\n`,
    'commit-msg':
      `${header}${root}` +
      `# Nachrichtenregel. Die Unterscheidung Merge/Commit erfolgt ueber $1 (die Nachrichten-\n` +
      `# datei), NICHT ueber $2: gemessen an git 2.53.0.windows.4 uebergibt Git dem commit-msg\n` +
      `# bei Merge, Squash und normalem Commit IMMER genau ein Argument — $2 kommt nicht an.\n` +
      `# Ein Aufruf auf $2 waere still falsch und wuerde jeden Merge an die 200-Wort-Commitregel\n` +
      `# schicken, also jeden Merge blockieren. $1 ist .git/MERGE_MSG bei Merge und Squash,\n` +
      `# .git/COMMIT_EDITMSG sonst — beides gemessen, nicht angenommen.\n` +
      `case "$1" in\n` +
      `  */MERGE_MSG) exec node "$SHINON_ROOT/${entry}" merge-message --file="$1" --quiet ;;\n` +
      `  *) exec node "$SHINON_ROOT/${entry}" message --file="$1" --quiet ;;\n` +
      `esac\n`,
    'post-commit':
      `${header}${root}` +
      `# Push-Stufe: automatisch nach grünem Gate (push.autoAfterCommit)\nexec node "$SHINON_ROOT/${entry}" push --auto --quiet\n`,
    'pre-push':
      `${header}${root}` +
      `# Letzte Instanz vor dem Verlassen des Rechners: der Code ist danach öffentlich lesbar.\n` +
      `# $1 = Remote, $2 = URL; die Ref-Liste kommt auf stdin und wird nicht ausgewertet —\n` +
      `# das Gate prüft den Zustand des Branches, nicht die einzelne Ref.\n` +
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-push --quiet\n`,
    'pre-merge-commit':
      `${header}${root}` +
      `# Merge-Stufe. $1 ist die Datei, aus der Git den Merge-Titel liest — der Pflicht-Body\n` +
      `# (MSG010) wird genau hier geprüft, weil dies der letzte Moment vor dem Merge-Commit ist.\n` +
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-merge --message-file="$1" --quiet\n`,
    'pre-rebase':
      `${header}${root}` +
      `# Rebase-Vorbereitung. $1 ist der Upstream. ` +
      `git rebase feuert weder pre-commit noch commit-msg —\n` +
      `# ohne diesen Hook liefe die umgeschriebene Kette durch kein Gate.\n` +
      `exec node "$SHINON_ROOT/${entry}" gate --phase=pre-rebase --quiet\n`,
  };
}

export interface HookInstallResult {
  dir: string;
  written: string[];
  hooksPath: string | null;
  changed: boolean;
}

export function installHooks(git: ShinonGitHelfer, options: { setHooksPath?: boolean } = {}): HookInstallResult {
  if (!git.isRepository()) throw new Error('Kein Git-Repository — Hooks können nicht installiert werden');
  const dir = path.join(git.root, HOOKS_RELATIVE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  let changed = false;

  for (const [name, content] of Object.entries(hookScripts())) {
    const file = path.join(dir, name);
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (previous !== content) {
      fs.writeFileSync(file, content, 'utf8');
      changed = true;
    }
    fs.chmodSync(file, 0o755);
    // Das Ausführ-Bit muss im INDEX stehen, nicht nur im Dateisystem: bei `core.fileMode=false`
    // (Windows-Standard) ignoriert Git das Bit beim `add` und legt 100644 ab — der Hook wäre dann
    // auf dieser Platte ausführbar, aber im Commit nicht, und damit auf jedem anderen Rechner tot.
    // `update-index --add --chmod=+x` umgeht diese Einstellung und ist der einzige Ort, der das
    // Bit wirklich schreibt; die Bedingung hält den Aufruf idempotent.
    //
    // Der Rückgabewert wird NICHT weggeworfen (Fehlerklasse, 4 von 4 Review-Agenten): ein
    // gescheitertes `update-index` (EPERM, read-only Index, .git/index.lock) ließ diese Zeile
    // trotzdem „Hooks installiert" melden — der Aufrufer glaubte, der Hook sei im Commit
    // ausführbar, und er war es nicht. Der Zustand danach wird deshalb VERIFIZIERT statt
    // geglaubt; `isExecutableInIndex` liest den Index und lügt nicht.
    const relative = path.relative(git.root, file).split(path.sep).join('/');
    if (!git.isExecutableInIndex(relative)) {
      const marked = git.markExecutable(relative);
      if (!marked || !git.isExecutableInIndex(relative)) {
        throw new Error(
          `Ausführ-Bit für ${relative} konnte nicht in den Index geschrieben werden. `
          + `Der Hook wäre im Commit nicht ausführbar (100644) und damit auf jedem anderen `
          + `Rechner tot. Bitte Index prüfen: kein .git/index.lock, Schreibrechte, `
          + `core.fileMode.`,
        );
      }
    }
    written.push(relative);
  }

  const desired = HOOKS_RELATIVE_DIR.split(path.sep).join('/');
  if (options.setHooksPath !== false && git.hooksPath() !== desired) {
    git.configSet('core.hooksPath', desired);
  }

  return { dir, written, hooksPath: git.hooksPath(), changed };
}

export function describeHookInstall(result: HookInstallResult): string {
  return [
    `🪝 Hooks installiert in ${result.dir}`,
    `   Dateien: ${result.written.join(', ')}`,
    `   core.hooksPath: ${result.hooksPath ?? '(nicht gesetzt)'}`,
  ].join('\n');
}
