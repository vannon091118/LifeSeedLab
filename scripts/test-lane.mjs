#!/usr/bin/env node
// Owner: Gate (Test-Lane). Regel (AGENTS.md): Im Commit-Pfad laufen nur die vom Diff
// BERÜHRTEN Tests; die Voll-Suite läuft am Sprintende (`--full`) und im E2E-Schritt.
// Budget-Bewertung deterministisch (scripts/test-lane-verdict.mjs): die gemessene Zeit
// ist Information (ms/Test gegen Norm), Schwellen liegen auf Norm + Wiederholung +
// Suite-Größe — Last-Spitzen auf geteilten Maschinen erzeugen keinen Fehlalarm.
// Gemeldet wird immer, blockiert wird nie (Kalt-Cache darf den Commit nicht aufhalten).
//
// Sicherheitsnetz: Hängt an einer Änderung KEIN Test (z. B. neues Modul ohne Test,
// reine Daten/Source-Datei), eskaliert die Lane automatisch auf die Voll-Suite. Damit
// fällt nie eine Änderung ohne Testlauf durch — „nicht immer alles" heißt nicht „nichts".

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fullBudgetVerdict, ladePrevState, currentLoadBand, MS_PER_TEST_BUDGET, STATE_VERSION, TEST_BUDGET } from './test-lane-verdict.mjs';

// (Die alte Wanduhr-Konstante BUDGET_MS ist gestrichen — die Schwelle liegt deterministisch
// in test-lane-verdict.mjs: ms/Test-Norm, Wiederholungs-Marker, Struktur-Budget.)
const full = process.argv.includes('--full');
const VITEST = 'node_modules/vitest/vitest.mjs';

function gitRevision() {
  return gitLines(['rev-parse', 'HEAD'])[0] ?? null;
}

function gitLines(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function runVitest(args, config) {
  const started = Date.now();
  const commandArgs = config === undefined ? args : ['--config', config, ...args];
  const r = spawnSync(process.execPath, [VITEST, ...commandArgs], { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  process.stdout.write(out);
  return { code: r.status ?? 1, ms: Date.now() - started, out };
}

/** Exit ohne stdout-Verlust: auf Pipes sind process.stdout-Schreibvorgänge asynchron —
 *  process.exit() direkt nach dem Write schneidet ungeflushete Reste ab (Befund des
 *  Mutations-Drills 2026-09-21: die Tests-Zusammenfassung verschwand je nach Pipe-Timing
 *  spurlos). process.exitCode lässt Node selbst drainen und dann beenden. */
function finish(code) {
  process.exitCode = code;
}

function filesRun(out) {
  // Farbcodes strippen: die Ausgabe kann ANSI-Sequenzen tragen (FORCE_COLOR), sonst
  // scheitert die Zahlenerkennung und die Lane würde fälschlich eskalieren.
  const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
  const m = /Test Files\s+(\d+)\s+passed/.exec(plain);
  if (m) return Number(m[1]);
  return /No test files found/.test(plain) ? 0 : -1; // -1 = unklar ⇒ nicht eskalieren
}

/** Gesamtzahl der gelaufenen Tests (für die ms/Test-Norm); Misch-Bilanz eingeschlossen. */
function testsRun(out) {
  const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
  const m = /Tests\s+\d+\s+failed\s*\|\s*\d+\s+passed\s*\((\d+)\)|Tests\s+\d+\s+passed\s*\((\d+)\)/.exec(plain);
  return m ? Number(m[1] ?? m[2]) : -1;
}

function splitChangedFiles(files) {
  return {
    project: files.filter((file) => !file.startsWith('tools/')),
    tooling: files.filter((file) => file.startsWith('tools/')).map((file) => file.slice('tools/'.length)),
  };
}

function runRelatedLane(label, files, config) {
  const related = runVitest(['related', ...files, '--run', '--coverage=false'], config);
  const ran = filesRun(related.out);
  // Vitest liefert bei "keine related Tests" Exit 1. Das ist eine Eskalation, kein roter
  // Testlauf; ein echter Testfehler bleibt dagegen bei ran !== 0 rot.
  if (related.code !== 0 && ran !== 0) {
    return { code: related.code, ms: related.ms, tests: testsRun(related.out), escalated: false };
  }
  if (ran === 0) {
    process.stdout.write(`[test-lane] kein Test hängt an ${label} — Eskalation auf die Voll-Suite\n`);
    const full = runVitest(['run'], config);
    return { code: full.code, ms: full.ms, tests: testsRun(full.out), escalated: true };
  }
  return { code: 0, ms: related.ms, tests: testsRun(related.out), escalated: false };
}

function combineLaneResults(results) {
  const failure = results.find((result) => result.code !== 0);
  const tests = results.every((result) => result.tests >= 0)
    ? results.reduce((sum, result) => sum + result.tests, 0)
    : -1;
  return {
    code: failure?.code ?? 0,
    ms: results.reduce((sum, result) => sum + result.ms, 0),
    tests,
    escalated: results.some((result) => result.escalated),
  };
}

const STATE_PATH = 'tools/.tmp/test-lane-state.json';

function verdict(label, ms, tests = -1) {
  // Deterministische Bewertung (Vertrag: scripts/test-lane-verdict.mjs): die Zeit ist
  // Information, die Schwelle liegt auf ms/Test-Norm + Wiederholung + Suite-Größe.
  // Genau wie beim Alten gilt: Melden, nicht blockieren (Kalt-Cache blockiert nicht).
  const prevState = ladePrevState(STATE_PATH);
  const revision = gitRevision();
  const load = currentLoadBand();
  const v = fullBudgetVerdict({ ms, tests, prevState, revision, load });
  const zeit = `${(ms / 1000).toFixed(1)} s`;
  const norm = v.perTest > 0 ? `, ${v.perTest.toFixed(1)} ms/Test (Norm ${MS_PER_TEST_BUDGET})` : '';
  const lastInfo = v.load === 'quiet' ? '' : `, Lastband ${v.load}`;
  if (v.repeatOver) {
    process.stdout.write(`\n[test-lane] ${label} — ANHALTEND LANGSAM: ${zeit}${norm} — erneut über der ms/Test-Norm bei gleicher Suite (${tests}). Beleg sammeln, nicht ignorieren.\n`);
  } else if (v.timeOver) {
    process.stdout.write(`\n[test-lane] ${label} — ${zeit}${norm}${lastInfo} (über Norm — Information; unter Last ist das kein Befund)\n`);
  } else {
    process.stdout.write(`\n[test-lane] ${label} — ${zeit}${norm}${lastInfo}\n`);
  }
  if (v.sizeOver) {
    process.stdout.write(`[test-lane] STRUKTUR-BEFUND: ${tests} Tests > Budget ${TEST_BUDGET} — Suite wächst statt reift (maschinenunabhängig).\n`);
  }
  // Vorher-Befund persistieren (tools/.tmp ist gitignored) für den Wiederholungs-Marker.
  try {
    mkdirSync('tools/.tmp', { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify({ version: STATE_VERSION, over: v.timeOver, tests, revision, load }));
  } catch { /* Best-Effort: ohne State fällt der Marker auf null zurück */ }
}

// Berührte Quelldateien: Arbeit gegen HEAD (Index + Worktree) plus neue (untracked) Dateien.
const changed = [
  ...gitLines(['diff', '--name-only', 'HEAD']),
  ...gitLines(['ls-files', '--others', '--exclude-standard']),
].filter((file) => /\.(ts|tsx|mts|cts|mjs)$/.test(file) || file.startsWith('tools/hooks/'));

if (full) {
  const result = combineLaneResults([
    { ...runVitest(['run']), escalated: false },
    { ...runVitest(['run'], 'tools/vitest.config.ts'), escalated: false },
  ]);
  verdict('VOLL (Sprintende)', result.ms, result.tests);
  finish(result.code);
} else if (changed.length === 0) {
  process.stdout.write('[test-lane] keine TS/TSX/MJS-Änderung gegenüber HEAD — kein Testlauf nötig\n');
  finish(0);
} else {
  const lanes = splitChangedFiles(changed);
  const results = [];
  if (lanes.project.length > 0) results.push(runRelatedLane('Projekt', lanes.project));
  if (lanes.tooling.length > 0) results.push(runRelatedLane('Tooling', lanes.tooling, 'tools/vitest.config.ts'));
  const result = combineLaneResults(results);
  const label = result.escalated
    ? 'VOLL (Eskalation: kein zugeordneter Test)'
    : `IMPACTED (${changed.length} berührte Dateien)`;
  verdict(label, result.ms, result.tests);
  finish(result.code);
}
