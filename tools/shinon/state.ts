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

interface CommitSnapshot {
  hash: string;
  subject: string;
  at: string;
}

interface PushSnapshot {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isGateSnapshot(value: unknown): value is GateSnapshot {
  return isRecord(value)
    && typeof value.phase === 'string'
    && typeof value.passed === 'boolean'
    && isFiniteNumber(value.errors)
    && isFiniteNumber(value.warnings)
    && isFiniteNumber(value.durationMs)
    && typeof value.ranAt === 'string'
    && (value.enforcement === undefined || value.enforcement === 'advisory' || value.enforcement === 'strict');
}

function isCommitSnapshot(value: unknown): value is CommitSnapshot {
  return isRecord(value)
    && typeof value.hash === 'string'
    && typeof value.subject === 'string'
    && typeof value.at === 'string';
}

function isPushSnapshot(value: unknown): value is PushSnapshot {
  return isRecord(value)
    && typeof value.ok === 'boolean'
    && typeof value.remote === 'string'
    && typeof value.branch === 'string'
    && typeof value.detail === 'string'
    && typeof value.at === 'string';
}

function sanitizeState(value: unknown): ShinonState {
  if (!isRecord(value)) return {};
  const state: ShinonState = {};
  if (isGateSnapshot(value.lastGate)) state.lastGate = value.lastGate;
  if (isCommitSnapshot(value.lastCommit)) state.lastCommit = value.lastCommit;
  if (isPushSnapshot(value.lastPush)) state.lastPush = value.lastPush;
  return state;
}

export class ShinonStateStore {
  readonly file: string;

  constructor(root: string) {
    this.file = path.join(path.resolve(root), STATE_RELATIVE_PATH);
  }

  read(): ShinonState {
    if (!fs.existsSync(this.file)) return {};
    try {
      return sanitizeState(JSON.parse(fs.readFileSync(this.file, 'utf8')));
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
