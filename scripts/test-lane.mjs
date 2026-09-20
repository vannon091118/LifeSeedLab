#!/usr/bin/env node
// Owner: Gate (Test-Lane). Regel (AGENTS.md): Im Commit-Pfad laufen nur die vom Diff
// BERÜHRTEN Tests; die Voll-Suite läuft am Sprintende (`--full`) und im E2E-Schritt.
// Budget 10 s für die Lane — Überschreitung wird gemeldet, nicht als Fehler gewertet
// (Kalt-Cache darf den Commit nicht blockieren).
//
// Sicherheitsnetz: Hängt an einer Änderung KEIN Test (z. B. neues Modul ohne Test,
// reine Daten/Source-Datei), eskaliert die Lane automatisch auf die Voll-Suite. Damit
// fällt nie eine Änderung ohne Testlauf durch — „nicht immer alles" heißt nicht „nichts".

import { execFileSync, spawnSync } from 'node:child_process';

const BUDGET_MS = 10_000;
const full = process.argv.includes('--full');
const VITEST = 'node_modules/vitest/vitest.mjs';

function gitLines(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function runVitest(args) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [VITEST, ...args], { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  process.stdout.write(out);
  return { code: r.status ?? 1, ms: Date.now() - started, out };
}

function filesRun(out) {
  // Farbcodes strippen: die Ausgabe kann ANSI-Sequenzen tragen (FORCE_COLOR), sonst
  // scheitert die Zahlenerkennung und die Lane würde fälschlich eskalieren.
  const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
  const m = /Test Files\s+(\d+)\s+passed/.exec(plain);
  if (m) return Number(m[1]);
  return /No test files found/.test(plain) ? 0 : -1; // -1 = unklar ⇒ nicht eskalieren
}

function verdict(label, ms) {
  const over = ms > BUDGET_MS;
  process.stdout.write(
    `\n[test-lane] ${label} — ${(ms / 1000).toFixed(1)} s (Budget ${(BUDGET_MS / 1000).toFixed(0)} s${over ? ', ÜBERSCHRITTEN' : ''})\n`,
  );
}

// Berührte Quelldateien: Arbeit gegen HEAD (Index + Worktree) plus neue (untracked) Dateien.
const changed = [
  ...gitLines(['diff', '--name-only', 'HEAD']),
  ...gitLines(['ls-files', '--others', '--exclude-standard']),
].filter((f) => /\.(ts|tsx|mts|cts)$/.test(f));

if (full) {
  const r = runVitest(['run']);
  verdict('VOLL (Sprintende)', r.ms);
  process.exit(r.code);
}

if (changed.length === 0) {
  process.stdout.write('[test-lane] keine TS/TSX-Änderung gegenüber HEAD — kein Testlauf nötig\n');
  process.exit(0);
}

const related = runVitest(['related', ...changed, '--run', '--coverage=false']);
if (related.code !== 0) {
  verdict(`IMPACTED (${changed.length} berührte Dateien)`, related.ms);
  process.exit(related.code);
}  const ran = filesRun(related.out);
  if (ran === 0) {
  process.stdout.write('[test-lane] kein Test hängt an der Änderung — Eskalation auf die Voll-Suite\n');
  const r = runVitest(['run']);
  verdict('VOLL (Eskalation: kein zugeordneter Test)', r.ms);
  process.exit(r.code);
}
verdict(`IMPACTED (${changed.length} berührte Dateien)`, related.ms);
