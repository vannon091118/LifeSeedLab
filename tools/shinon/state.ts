import fs from 'node:fs';
import path from 'node:path';
import type { GateEnforcement } from './config.ts';

/**
 * Shinon-Zustand: die letzte Gate-, Commit- und Push-Lage, persistiert unterhalb von tools/.
 * Der Starter liest daraus, damit der README-Status den echten letzten Prüfstand zeigt statt
 * einer Behauptung. Reiner Zustandsspeicher — kein Gameplay, kein zweiter Writer.
 */

export interface GateSnapshot {
  phase: string;
  passed: boolean;
  /** Modus, unter dem das Urteil fiel: `strict` ⇒ Warnungen waren blockierend. */
  enforcement?: GateEnforcement;
  errors: number;
  warnings: number;
  durationMs: number;
  ranAt: string;
}

export interface CommitSnapshot {
  hash: string;
  subject: string;
  at: string;
}

export interface PushSnapshot {
  ok: boolean;
  remote: string;
  branch: string;
  detail: string;
  at: string;
}

export interface ShinonState {
  lastGate?: GateSnapshot;
  lastCommit?: CommitSnapshot;
  lastPush?: PushSnapshot;
}

export const STATE_RELATIVE_PATH = path.join('tools', '.shinon-state.json');

export class ShinonStateStore {
  readonly file: string;

  constructor(root: string) {
    this.file = path.join(path.resolve(root), STATE_RELATIVE_PATH);
  }

  read(): ShinonState {
    if (!fs.existsSync(this.file)) return {};
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8')) as ShinonState;
    } catch {
      return {};
    }
  }

  patch(partial: ShinonState): ShinonState {
    const next: ShinonState = { ...this.read(), ...partial };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
  }
}

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
