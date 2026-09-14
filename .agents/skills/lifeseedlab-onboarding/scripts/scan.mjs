#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function run(command, args) {
  try {
    execFileSync(command, args, {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
      windowsHide: true,
    });
    return true;
  } catch (error) {
    return false;
  }
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
}

function readPackage() {
  const raw = readFileSync(join(ROOT, 'package.json'), 'utf8');
  return JSON.parse(raw);
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

function scan() {
  if (!baseChecks()) return;

  let head;
  let branch;
  let status;
  try {
    head = git(['rev-parse', 'HEAD']);
    branch = git(['branch', '--show-current']) || 'DETACHED';
    status = git(['status', '--short']);
  } catch {
    fail('Git-Zustand konnte nicht ermittelt werden.');
    return;
  }

  console.log('ONBOARDING SCAN');
  console.log(`HEAD: ${head}`);
  console.log(`BRANCH: ${branch}`);
  console.log(`WORKTREE: ${status ? 'CHANGES_PRESENT' : 'CLEAN'}`);

  console.log('\nPFLICHTLEKTÜRE');
  for (const file of REQUIRED) {
    console.log(`PASS  ${file}  sha256=${sha256(file)}`);
  }

  console.log('\nBASISVERIFIKATION');
  const typecheck = run('npm', ['run', 'typecheck']);
  console.log(` ${typecheck ? 'PASS' : 'FAIL'} npm run typecheck`);
  const tests = run('npm', ['test']);
  console.log(` ${tests ? 'PASS' : 'FAIL'} npm test`);

  const gate = {
    status: typecheck && tests ? 'PASS' : 'FAIL',
    generatedAt: new Date().toISOString(),
    head,
    branch,
    worktree: status ? 'CHANGES_PRESENT' : 'CLEAN',
    documents: Object.fromEntries(REQUIRED.map((file) => [file, sha256(file)])),
    checks: { typecheck, tests },
  };

  writeFileSync(GATE, JSON.stringify(gate, null, 2) + '\n', 'utf8');

  console.log(`\nGATE: ${gate.status}`);
  console.log(`STATE: ${GATE}`);

  if (!typecheck || !tests) process.exitCode = 1;
}

function check() {
  if (!existsSync(GATE)) {
    fail('Kein lokaler Onboarding-Gate-Zustand vorhanden. Scanner zuerst ausführen.');
    return;
  }

  let gate;
  try {
    gate = JSON.parse(readFileSync(GATE, 'utf8'));
  } catch {
    fail('Onboarding-Gate ist unlesbar oder ungültig.');
    return;
  }

  if (gate.status !== 'PASS') {
    fail(`Gate steht auf ${gate.status}, nicht auf PASS.`);
    return;
  }

  let head;
  try {
    head = git(['rev-parse', 'HEAD']);
  } catch {
    fail('Aktueller Git-HEAD konnte nicht ermittelt werden.');
    return;
  }

  if (gate.head !== head) {
    fail('Gate gehört zu einem anderen Git-HEAD. Scanner erneut ausführen.');
    return;
  }

  for (const file of REQUIRED) {
    if (!existsSync(join(ROOT, file))) {
      fail(`Pflichtdatei fehlt: ${file}`);
      return;
    }
    const current = sha256(file);
    if (gate.documents?.[file] !== current) {
      fail(`${file} wurde seit dem PASS verändert. Scanner erneut ausführen.`);
      return;
    }
  }

  if (!gate.checks?.typecheck || !gate.checks?.tests) {
    fail('Basisverifikation war nicht vollständig erfolgreich.');
    return;
  }

  console.log('ONBOARDING=PASS');
  console.log('Schreibarbeit darf beginnen.');
}

if (process.argv.includes('--check')) check();
else scan();
