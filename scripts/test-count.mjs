#!/usr/bin/env node
// Owner: Gate (Testzahl). EINE Wahrheit über die Zahl der Tests.
//
// WARUM DIESES SKRIPT EXISTIERT (Befund 20.09.2026, adversarialer Review):
// Die README nannte „570 Tests in 61 Dateien", die offizielle Lane maß 662 in 66 — und die Zahl
// war über 429, 492, 529, 570 stetig weitergewandert, obwohl ein Commit „Zählweise eine
// Wahrheit" hieß. Ein abgeschriebener Messwert driftet lautlos, weil ihm niemand ansieht, dass
// er alt ist. Zwei ehrliche Wege gibt es dafür, und dieses Skript geht beide:
//
//   1. SCHREIBEN (`--summary`): der Messwert wird dort veröffentlicht, wo er gemessen wurde —
//      in der CI-Zusammenfassung (bzw. auf stdout), nicht in einer Datei, die niemand nachzieht.
//   2. SCHEITERN (`--check`): die Doku darf keine abgeschriebene Zahl MEHR tragen. Eine
//      hartkodierte Testzahl in der README ist ab jetzt ein Fehler, kein Zahlenrätsel.
//
// Geltung des Checks: NUR die README. `CHANGELOG.md` und die ROADMAP tragen historische
// Messwerte mit Datum — die sind Chronik und sollen sich NICHT ändern, wenn die Suite wächst
// (dieselbe Begründung wie beim Doku-Referenz-Check, der den Changelog ausnimmt).
//
// Aufruf:
//   node scripts/test-count.mjs                     # prüfen + messen + Zusammenfassung
//   node scripts/test-count.mjs --check             # nur prüfen (schnell, kein Testlauf)
//   node scripts/test-count.mjs --summary           # nur messen + veröffentlichen
//   node scripts/test-count.mjs --file=<pfad>       # anderes Dokument prüfen (für Proben)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VITEST = path.join('node_modules', 'vitest', 'vitest.mjs');
const REPORT = path.join('tools', '.tmp', 'test-count.json');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (name, fallback) => {
  const hit = args.find((entry) => entry.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const file = value('file', 'README.md');
// Abgeschriebene Zahlen: „570/570 Tests", „662 Tests", „66 Testdateien". Bewusst eng gefasst —
// die Zahl muss ausdrücklich als Testzahl auftreten, sonst würde jede Prozentangabe im
// automatisch erzeugten Statusblock als Befund gelesen.
const HARDCODED = [
  /\b\d+\s*\/\s*\d+\s*(?:Tests?|tests?)\b/,
  /\b\d+\s+Tests?\b/,
  /\b\d+\s+Testdateien\b/i,
];

function checkDoc() {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) {
    console.error(`❌ ${file} fehlt — nichts zu prüfen`);
    return 1;
  }
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  const findings = [];
  lines.forEach((line, index) => {
    for (const pattern of HARDCODED) {
      const hit = pattern.exec(line);
      if (hit) findings.push(`${file}:${index + 1}: „${hit[0]}" — ${line.trim()}`);
    }
  });
  if (findings.length === 0) {
    console.log(`✅ ${file} trägt keine abgeschriebene Testzahl (die Zahl kommt aus dem Lauf).`);
    return 0;
  }
  console.error(`❌ ${file} nennt eine Testzahl, die driften wird:`);
  for (const finding of findings) console.error(`   ${finding}`);
  console.error('   Ersatz: `node scripts/test-count.mjs` — Messwert kommt in die CI-Zusammenfassung.');
  return 1;
}

function measureAndPublish() {
  fs.mkdirSync(path.join(ROOT, 'tools', '.tmp'), { recursive: true });
  const run = spawnSync(
    process.execPath,
    [VITEST, 'run', '--reporter=json', `--outputFile=${REPORT}`],
    { cwd: ROOT, encoding: 'utf8' },
  );
  const reportPath = path.join(ROOT, REPORT);
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Kein Testbericht entstanden (${REPORT}) — Lauf fehlgeschlagen:`);
    console.error((run.stderr || run.stdout || '').split('\n').slice(-15).join('\n'));
    return 1;
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const tests = report.numTotalTests ?? 0;
  // Vitest 5 nennt die Dateien NICHT `numTotalTestFiles` — das Feld existiert nicht, der Wert
  // wäre still 0 (eine zweite Wahrheit über dieselbe Sache). Die Dateien stehen als
  // `testResults`-Liste im Bericht; `numTotalTestSuites` zählt etwas anderes (jeder `describe`
  // zählt mit: hier 216). Deshalb wird die Länge der Liste gelesen, kein erfundenes Feld.
  const files = Array.isArray(report.testResults) ? report.testResults.length : 0;
  const failed = report.numFailedTests ?? 0;
  const summary = [
    '### 🧪 Test-Suite (gemessen, nicht abgeschrieben)',
    '',
    `- **Tests:** ${tests}`,
    `- **Testdateien:** ${files}`,
    `- **Fehlgeschlagen:** ${failed}`,
    '',
    'Quelle: dieser Lauf. Die Zahl steht absichtlich in keiner Doku (`scripts/test-count.mjs --check`).',
    '',
  ].join('\n');

  const githubSummary = process.env.GITHUB_STEP_SUMMARY;
  if (githubSummary) {
    fs.appendFileSync(githubSummary, summary, 'utf8');
  }
  process.stdout.write(`✅ gemessen: ${tests} Tests in ${files} Dateien (${failed} fehlgeschlagen)\n`);
  if (!githubSummary) process.stdout.write(`${summary}\n`);
  return run.status === 0 ? 0 : 1;
}

const explicit = has('--check') || has('--summary');
const wantsCheck = has('--check') || !explicit;
const wantsSummary = has('--summary') || !explicit;

let code = 0;
if (wantsCheck) code = Math.max(code, checkDoc());
if (wantsSummary) code = Math.max(code, measureAndPublish());
process.exit(code);
