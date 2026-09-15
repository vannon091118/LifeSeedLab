#!/usr/bin/env node

import { exec } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const GATE = join(ROOT, '.git', 'lifeseedlab-onboarding.json');

const REQUIRED = [
  'AGENTS.md',
  'ARCHITECTURE_CONTRACT.md',
  'ARCHITECTURE.md',
  'docs/QUALITY_SPEC.md',
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex');
}

/** Extrahiert für KI-Agenten sofort korrigierbare Fehlerzeilen (TS-Codes, Vitest-Failures) */
function extractActionableErrors(rawOutput) {
  if (!rawOutput) return '';
  const lines = rawOutput.split('\n');
  const relevant = lines.filter(line => 
    /error TS\d+|FAIL|Error:|AssertionError|✓|✕/i.test(line) ||
    line.includes(':/') || line.includes(':\\')
  );
  return (relevant.length > 0 ? relevant : lines.slice(-12)).join('\n');
}

async function runTask(command) {
  try {
    await execAsync(command, { cwd: ROOT, windowsHide: true });
    return { ok: true, tail: '' };
  } catch (error) {
    const raw = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim();
    return { ok: false, tail: extractActionableErrors(raw) };
  }
}

function git(args) {
  const { execFileSync } = awaitImportGit();
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
}

function awaitImportGit() {
  // Synchronous git call wrapper
  const { execFileSync } = import('node:child_process');
  return { execFileSync };
}

function readPackage() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
}

function baseChecks() {
  if (!existsSync(join(ROOT, '.git'))) {
    fail('Repository ist kein Git-Repository oder .git fehlt.');
    return false;
  }

  for (const file of REQUIRED) {
    if (!existsSync(join(ROOT, file))) {
      fail(`Pflichtdatei fehlt: ${file}`);
      return false;
    }
  }

  const pkg = readPackage();
  for (const script of ['typecheck', 'test']) {
    if (!pkg.scripts || typeof pkg.scripts[script] !== 'string') {
      fail(`package.json benötigt npm-Script: ${script}`);
      return false;
    }
  }

  return true;
}

async function scan() {
  if (!baseChecks()) return;

  let head, branch, status;
  try {
    const { execFileSync } = await import('node:child_process');
    head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
    branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim() || 'DETACHED';
    status = execFileSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
  } catch {
    fail('Git-Zustand konnte nicht ermittelt werden.');
    return;
  }

  console.log('ONBOARDING SCAN (PARALLEL EXECUTION)');
  console.log(`HEAD: ${head} | BRANCH: ${branch} | WORKTREE: ${status ? 'CHANGES' : 'CLEAN'}`);

  console.log('\nPFLICHTLEKTÜRE');
  for (const file of REQUIRED) {
    console.log(`PASS  ${file}  sha256=${sha256(file)}`);
  }

  console.log('\nBASISVERIFIKATION (Typecheck & Tests laufen parallel)...');
  
  // PARALLELE AUSFÜHRUNG: Halbiert Onboarding-Wartezeit für Agenten
  const [typecheck, tests] = await Promise.all([
    runTask('npm run typecheck'),
    runTask('npm test')
  ]);

  console.log(` ${typecheck.ok ? 'PASS' : 'FAIL'} npm run typecheck`);
  if (!typecheck.ok) console.log(typecheck.tail.replace(/^/gm, '      '));

  console.log(` ${tests.ok ? 'PASS' : 'FAIL'} npm test`);
  if (!tests.ok) console.log(tests.tail.replace(/^/gm, '      '));

  const gate = {
    status: typecheck.ok && tests.ok ? 'PASS' : 'FAIL',
    generatedAt: new Date().toISOString(),
    head,
    branch,
    worktree: status ? 'CHANGES_PRESENT' : 'CLEAN',
    documents: Object.fromEntries(REQUIRED.map((file) => [file, sha256(file)])),
    checks: { typecheck: typecheck.ok, tests: tests.ok },
  };

  writeFileSync(GATE, JSON.stringify(gate, null, 2) + '\n', 'utf8');

  console.log(`\nGATE: ${gate.status}`);
  if (!typecheck.ok || !tests.ok) process.exitCode = 1;
}

function check() {
  if (!existsSync(GATE)) {
    fail('Kein lokaler Gate-Zustand. Führe erst `node .../scan.mjs` aus.');
    return;
  }

  let gate;
  try {
    gate = JSON.parse(readFileSync(GATE, 'utf8'));
  } catch {
    fail('Gate-Datei ungültig.');
    return;
  }

  if (gate.status !== 'PASS') {
    fail(`Gate steht auf ${gate.status}. Fehler vor dem Schreiben beheben.`);
    return;
  }

  try {
    const { execFileSync } = import('node:child_process');
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
    if (gate.head !== head) {
      fail('Git-HEAD hat sich verändert. Scanner erneut ausführen.');
      return;
    }
  } catch {
    fail('Git-HEAD konnte nicht verifiziert werden.');
    return;
  }

  for (const file of REQUIRED) {
    if (!existsSync(join(ROOT, file)) || gate.documents?.[file] !== sha256(file)) {
      fail(`${file} fehlt oder wurde verändert. Scanner erneut ausführen.`);
      return;
    }
  }

  console.log('ONBOARDING=PASS');
}

if (process.argv.includes('--check')) check();
else scan();