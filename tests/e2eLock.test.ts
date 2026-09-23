// Owner: Process-Test (E2E-Lauf-Garde, P-35). LOC ≤ 200.
// Vertragstest der Last-Vorbedingung: bei fremdem lebendem Lock bricht acquireLock() mit klarer
// Meldung ab, ein verwaistes Lock (kaputtes JSON, tote PID) wird ersetzt, die Freigabe löscht
// nur das EIGENE Lock. Das Lock-Verzeichnis wird über E2E_LOCK_DIR in einen tmp-Ordner gelenkt,
// damit der Test nie das echte Laufzeit-Lock berührt. Der „lebende Fremd-Prozess“ ist ein
// echter Kindprozess (10 s Timeout), kein gemockter pidAlive.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import acquireLock, { pidAlive } from './e2eLock';

describe('E2E-Lauf-Garde (P-35 Last-Vorbedingung)', () => {
  let dir: string;
  let prev: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'e2e-lock-'));
    mkdirSync(join(dir, 'node_modules'));
    prev = process.env.E2E_LOCK_DIR;
    process.env.E2E_LOCK_DIR = dir;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.E2E_LOCK_DIR;
    else process.env.E2E_LOCK_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  });

  it('bricht ab, wenn eine fremde, LEBENDE pid im Lock steht', () => {
    const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 10000)'], { stdio: 'ignore' });
    try {
      writeFileSync(join(dir, 'node_modules', '.e2e-lock.json'), JSON.stringify({ pid: child.pid }));
      expect(pidAlive(child.pid!)).toBe(true);
      expect(() => acquireLock()).toThrow(/zweite Playwright-Instanz/);
      // Das fremde Lock bleibt unangetastet (kein Überschreiben durch den Abbrecher).
      expect(JSON.parse(readFileSync(join(dir, 'node_modules', '.e2e-lock.json'), 'utf8')).pid).toBe(child.pid);
    } finally {
      child.kill();
    }
  });

  it('ersetzt ein verwaistes Lock (kaputtes JSON) und nimmt es selbst', () => {
    writeFileSync(join(dir, 'node_modules', '.e2e-lock.json'), '{broken');
    const teardown = acquireLock();
    const lock = JSON.parse(readFileSync(join(dir, 'node_modules', '.e2e-lock.json'), 'utf8'));
    expect(lock.pid).toBe(process.pid);
    teardown();
    expect(existsSync(join(dir, 'node_modules', '.e2e-lock.json'))).toBe(false);
  });

  it('ersetzt ein Lock mit TOTER pid (abgestürzter Lauf) ohne Abbruch', () => {
    writeFileSync(join(dir, 'node_modules', '.e2e-lock.json'), JSON.stringify({ pid: 999_999_999 }));
    const teardown = acquireLock();
    expect(JSON.parse(readFileSync(join(dir, 'node_modules', '.e2e-lock.json'), 'utf8')).pid).toBe(process.pid);
    teardown();
  });

  it('gibt nur das EIGENE Lock frei — ein fremdes bleibt stehen', () => {
    const teardown = acquireLock();
    writeFileSync(join(dir, 'node_modules', '.e2e-lock.json'), JSON.stringify({ pid: 1 }));
    teardown();
    expect(existsSync(join(dir, 'node_modules', '.e2e-lock.json'))).toBe(true);
    rmSync(join(dir, 'node_modules', '.e2e-lock.json')); // Aufräumen für den afterEach
  });
});
