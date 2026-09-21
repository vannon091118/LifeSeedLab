// Owner: Drill (Sandkasten). WO der Drill läuft — isolierter Worktree samt Lebenszyklus.
//
// P-26: Der Drill schreibt NIE in geteilte Dateien. Er legt einen eigenen Worktree an,
// spiegelt den Arbeitsstand hinein (nur LESEND gegen den Hauptbaum: `git diff`/`ls-files`)
// und nimmt jede Mutation per `git checkout` zurück. Der Hauptbaum sieht davon nichts.
//
// Zwei Befunde prägen dieses Modul (beide gemessen, nicht vermutet):
//   1. Die `node_modules`-Verknüpfung muss VOR dem Worktree-Abbau NUR ALS LINK gelöst werden.
//      `git worktree remove` scheiterte an der Junction („Directory not empty“) und ließ den
//      Worktree stehen; ein rekursives `rm -rf` wäre schlimmer — es FOLGT der Junction und
//      löscht das echte `node_modules` des Hauptbaums.
//   2. Git-Kommandos können an der kurzlebigen Index-Sperre paralleler Sessions scheitern.
//      Ein einzelner Fehlschlag darf nicht abbrechen, ein endgültiger muss (fail-closed).

import { execSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { normalisiere, type Mutation } from './registry.ts';

/** Ergebnis eines ausgeführten Kommandos — Eingabeformat für die Auswertung (`verdict.ts`). */
export interface Ausgabe {
  text: string;
  code: number | null;
  err: string;
}

/** Synchrones Warten (der Drill läuft seriell; ein Timer wäre hier nur Umweg). */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Wiederholte Ausführung gegen kurzlebige Sperren; endgültig gescheitert trägt stderr mit. */
function mitWiederholung<T>(tun: () => T, versuche = 6, pauseMs = 250): T {
  let letzter: unknown;
  for (let i = 0; i < versuche; i++) {
    try { return tun(); } catch (err) { letzter = err; pause(pauseMs); }
  }
  const detail = letzter instanceof Error
    ? letzter.message + String((letzter as { stderr?: unknown }).stderr ?? '')
    : String(letzter);
  throw new Error(`nach ${versuche} Versuchen gescheitert: ${detail.slice(0, 300)}`);
}

/** Führt ein Kommando im Worktree aus und liefert stdout+stderr samt Exit-Status. */
export function fuehreAus(cwd: string, cmd: string, timeoutMs = 300_000): Ausgabe {
  const r = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8', timeout: timeoutMs });
  return {
    text: `${r.stdout ?? ''}\n${r.stderr ?? ''}`,
    code: r.status,
    err: r.error ? String(r.error) : '',
  };
}

/**
 * Die `node_modules`-Verknüpfung NUR ALS LINK lösen (Windows: `Directory.Delete` ohne Rekursion,
 * POSIX: `rm -f` auf einen Symlink) — nie rekursiv, siehe Kopfkommentar.
 */
function loeseNodeModulesLink(wt: string): void {
  const ziel = join(wt, 'node_modules');
  if (!existsSync(ziel)) return;
  try {
    if (process.platform === 'win32') {
      const w = ziel.replace(/\//g, '\\');
      execSync(`powershell -NoProfile -Command "if ((Get-Item -Force '${w}').LinkType -eq 'Junction') { [System.IO.Directory]::Delete('${w}') }"`, { stdio: 'pipe' });
    } else {
      execSync(`rm -f "${ziel}"`, { stdio: 'pipe' });
    }
  } catch { /* best effort — der Worktree-Abbau entscheidet danach ohnehin */ }
}

/** `node_modules` als Junction/Symlink (kein zweites `npm install`); jeder Weg wird geprüft. */
function verlinkeNodeModules(root: string, wt: string): void {
  const ziel = `${wt}${sep}node_modules`;
  const quelle = join(root, 'node_modules');
  for (const befehl of [
    `cmd /c mklink /J "${ziel.replace(/\//g, '\\')}" "${quelle.replace(/\//g, '\\')}"`,
    `powershell -NoProfile -Command "New-Item -ItemType Junction -Path '${ziel.replace(/\//g, '\\')}' -Value '${quelle.replace(/\//g, '\\')}' | Out-Null"`,
    `ln -s "${quelle}" "${ziel}"`,
  ]) {
    try { execSync(befehl, { encoding: 'utf8', stdio: 'pipe' }); } catch { /* nächster Weg */ }
    if (existsSync(join(ziel, 'vitest'))) return;
  }
  throw new Error('node_modules-Verlinkung fehlgeschlagen — Drill bricht ab statt blind zu laufen');
}

/** Untracked UND ignorierte Tooling-Dateien, die der Drill im Worktree braucht. */
function zuSpiegelndeDateien(root: string): string[] {
  const liste = (args: string): string[] => execSync(args, { cwd: root, encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(Boolean);
  return [
    ...liste('git ls-files --others --exclude-standard'),
    // `.gitignore: /scripts/*` verschweigt die Lane-Helfer — ohne sie läuft `test-lane` im
    // frischen Worktree in einen MODULE_NOT_FOUND. `tools/.tmp/` bleibt draußen: dessen
    // Scratch-Zustand gehört dem Hauptbaum; `node_modules`/`dist` ebenso.
    ...liste('git ls-files --others --ignored --exclude-standard -- scripts tools'),
  ].filter(f => /\.(ts|tsx|mjs)$/.test(f)
    && !f.includes('node_modules/')
    && !f.startsWith('tools/.tmp/') && !f.startsWith('dist/'));
}

/**
 * Isolierten Worktree anlegen und den Arbeitsstand hineinspiegeln.
 *
 * Der Drill prüft den KOMMITTIERTEN ZUSTAND IN SPE, nicht HEAD: uncommittete Diffs wandern per
 * `git apply` hinein, untracked/ignorierte Code-Dateien werden kopiert. Ohne diese Spiegelung
 * würde er Verträge übersehen, die gerade erst im Baum liegen (Befund: der M3-Vertrag war
 * uncommittet und der Drill meldete ihn als blinden Fleck).
 */
export function worktreeAnlegen(root: string): string {
  const head = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  const wt = mkdtempSync(join(tmpdir(), 'lsl-mut-'));
  execSync(`git worktree add "${wt}" ${head}`, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  try {
    // Golden-Hash-Anker: `tools/.tmp` ist gitignored und fehlt im frischen Checkout. Zeile 1
    // genügt (v1-Semantik auf dem HEAD-Stand); liegt ein v2-Anker vor, bringt die Spiegelung
    // der Testdateien die passende Semantik mit.
    const anker = join(root, 'tools', '.tmp', 'vector_golden_hash.txt');
    if (existsSync(anker)) {
      mkdirSync(join(wt, 'tools', '.tmp'), { recursive: true });
      writeFileSync(join(wt, 'tools', '.tmp', 'vector_golden_hash.txt'),
        readFileSync(anker, 'utf8').split('\n')[0]);
    }
    const diff = execSync('git diff HEAD', { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (diff.trim()) {
      writeFileSync(join(wt, '.drill-mirror.patch'), diff, 'utf8');
      execSync('git apply .drill-mirror.patch', { cwd: wt, encoding: 'utf8', stdio: 'pipe' });
    }
    for (const f of zuSpiegelndeDateien(root)) {
      const dst = join(wt, ...f.split('/'));
      mkdirSync(dirname(dst), { recursive: true });
      cpSync(join(root, ...f.split('/')), dst);
    }
    verlinkeNodeModules(root, wt);
    return wt;
  } catch (err) {
    // Teilweise aufgebauter Worktree bleibt sonst samt Junction liegen — hier aufräumen.
    loeseNodeModulesLink(wt);
    try { execSync(`git worktree remove --force "${wt}"`, { cwd: root, encoding: 'utf8', stdio: 'pipe' }); } catch { /* best effort */ }
    throw err;
  }
}

/** Mutationsstand in den Worktree schreiben. `false` = Muster griff nicht (fail-closed). */
export function mutationAnwenden(wt: string, m: Mutation): boolean {
  const p = join(wt, ...m.datei.split('/'));
  const original = normalisiere(readFileSync(p, 'utf8'));
  const mutiert = original.replace(m.find, m.replace);
  if (mutiert === original) return false;
  writeFileSync(p, mutiert, 'utf8');
  return true;
}

/** Original zurückholen — ausschließlich via git, mit Wiederholung gegen Index-Sperren. */
export function mutationZuruecknehmen(wt: string, datei: string): void {
  mitWiederholung(() => execSync(`git checkout -- "${datei}"`, { cwd: wt, encoding: 'utf8', stdio: 'pipe' }));
}

/** Worktree abbauen: erst den Link lösen, dann den Worktree entfernen. */
export function worktreeAbbauen(root: string, wt: string): void {
  loeseNodeModulesLink(wt);
  try {
    mitWiederholung(() => execSync(`git worktree remove --force "${wt}"`, { cwd: root, encoding: 'utf8', stdio: 'pipe' }));
  } catch { /* best effort */ }
}
