// Owner: IdSystem (core). LOC ≤ 300.
// Stable entity IDs: identical run ⇒ identical ID sequence (contract Phase 2.4).
// Format: `${prefix}-${number}` with zero-padding for stable sort.

const counters: Record<string, number> = {};

type EntityKind = 'plant' | 'enemy' | 'projectile' | 'wave' | 'system';

const PREFIX: Record<EntityKind, string> = {
  plant: 'plant',
  enemy: 'enemy',
  projectile: 'proj',
  wave: 'wave',
  system: 'system',
};

export function nextId(kind: EntityKind): string {
  counters[kind] = (counters[kind] ?? 0) + 1;
  return `${PREFIX[kind]}-${String(counters[kind]).padStart(4, '0')}`;
}

/** Phase E — Run-/Match-Kontext für deterministische IDs ohne UUID/Zufall.
 *  Gleicher (runId|matchId, kind, seq) ⇒ gleiche ID, über Namespace getrennt. */
export function nextScopedId(runOrMatchId: number, kind: EntityKind, seq: number): string {
  // deterministisch via FNV über (matchId, kind, seq) — kein Counter, kein Math.random
  let h = 2166136261 >>> 0;
  const s = `${runOrMatchId}:${kind}:${seq}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const base = (h >>> 0) % 9000 + 1;
  return `${PREFIX[kind]}-${String(base).padStart(4, '0')}`;
}

/** Test/isolation helper: resets all counters so identical runs produce identical sequences. */
export function resetIds(): void {
  for (const k of Object.keys(counters)) delete counters[k];
}

/** Snapshot/restore for deterministic re-runs inside one process. */
export function snapshotIds(): Record<string, number> {
  return { ...counters };
}

export function restoreIds(snap: Record<string, number>): void {
  for (const k of Object.keys(counters)) delete counters[k];
  for (const k of Object.keys(snap)) counters[k] = snap[k];
}
