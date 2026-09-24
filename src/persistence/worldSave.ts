// Owner: PersistenceSystem (worldSave — Schema-Adapter). LOC ≤ 200.
// Die Welt ist ein EIGENER Speicher-Besitz (nicht Meta, nicht RunSave): ein versioniertes
// Schema im selben IDB wie die Run-Snapshots — storage.ts bleibt der einzige I/O-Owner.
// Fail-closed: eine defekte Welt wird NICHT still durch eine leere ersetzt — der Aufrufer
// erhält `null` und entscheidet sichtbar (Erst-Erzeugung oder Fehlermeldung).

import { idbGetResult, idbSet, type WriteResult } from './storage';
import { createInitialWorld, isValidWorldState, type WorldState } from '../world/world_state';
import { APP_VERSION } from '../version';

const WORLD_KEY = 'world';
const WORLD_VERSION = 1;

interface WorldSave {
  version: 1;
  appVersion: string;
  world: WorldState;
}

export function saveWorld(world: WorldState): Promise<WriteResult> {
  const s: WorldSave = { version: 1, appVersion: APP_VERSION, world };
  return idbSet(WORLD_KEY, s, WORLD_VERSION);
}

/**
 * Lädt die Welt oder `null` (fehlend ODER korrumpiert). Kein stiller Ersatz:
 * Die Erst-Erzeugung (`createInitialWorld` + sofortiges `saveWorld`) ist eine
 * sichtbare Entscheidung des Aufrufers, kein Default-Pfad dieser Funktion.
 */
export type WorldLoadResult =
  | { status: 'valid'; world: WorldState }
  | { status: 'missing' }
  | { status: 'corrupt' }
  | { status: 'failed'; error?: unknown };

export async function loadWorldResult(): Promise<WorldLoadResult> {
  const result = await idbGetResult<WorldSave>(WORLD_KEY, { version: WORLD_VERSION, fallback: () => null as never });
  if (result.status !== 'valid') return result.status === 'missing' ? { status: 'missing' } : result;
  const world = result.value?.world;
  if (!world || !isValidWorldState(world)) return { status: 'corrupt' };
  return { status: 'valid', world };
}

export async function loadWorld(): Promise<WorldState | null> {
  const result = await loadWorldResult();
  return result.status === 'valid' ? result.world : null;
}

/** Explizite Erst-Erzeugung (einmalig, erster App-Start): erzeugt UND persistiert. */
export async function ensureWorld(): Promise<WorldState> {
  const result = await loadWorldResult();
  if (result.status === 'valid') return result.world;
  if (result.status === 'corrupt' || result.status === 'failed') {
    // Kein stiller Ersatz: der Aufrufer bekommt keine neue Welt als ob der Bestand leer wäre.
    throw new Error(`World load failed: ${result.status}`);
  }
  const fresh = createInitialWorld();
  const write = await saveWorld(fresh);
  if (write.status !== 'written') throw new Error('World save failed during first-run creation');
  return fresh;
}
