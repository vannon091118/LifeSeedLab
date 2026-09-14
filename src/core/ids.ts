// Owner: IdSystem (core). LOC ≤ 300.
// Stable entity IDs: identical run ⇒ identical ID sequence (contract Phase 2.4).
// Format: `${prefix}-${number}` with zero-padding for stable sort.

const counters: Record<string, number> = {};

export type EntityKind = 'plant' | 'enemy' | 'projectile' | 'wave' | 'system';

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

export function peekIdCount(kind: EntityKind): number {
  return counters[kind] ?? 0;
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
