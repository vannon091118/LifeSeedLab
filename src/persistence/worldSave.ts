// Owner: PersistenceSystem (worldSave — Schema-Adapter). LOC ≤ 200.
// Die Welt ist ein EIGENER Speicher-Besitz (nicht Meta, nicht RunSave): ein versioniertes
// Schema im selben IDB wie die Run-Snapshots — storage.ts bleibt der einzige I/O-Owner.
// Fail-closed: eine defekte Welt wird NICHT still durch eine leere ersetzt — der Aufrufer
// erhält `null` und entscheidet sichtbar (Erst-Erzeugung oder Fehlermeldung).

import { idbGet, idbSet } from './storage';
import { createInitialWorld, isValidWorldState, type WorldState } from '../world/world_state';
import { APP_VERSION } from '../version';

const WORLD_KEY = 'world';
const WORLD_VERSION = 1;

export interface WorldSave {
  version: 1;
  appVersion: string;
  world: WorldState;
}

export function saveWorld(world: WorldState): void {
  const s: WorldSave = { version: 1, appVersion: APP_VERSION, world };
  void idbSet(WORLD_KEY, s, WORLD_VERSION);
}

/**
 * Lädt die Welt oder `null` (fehlend ODER korrumpiert). Kein stiller Ersatz:
 * Die Erst-Erzeugung (`createInitialWorld` + sofortiges `saveWorld`) ist eine
 * sichtbare Entscheidung des Aufrufers, kein Default-Pfad dieser Funktion.
 */
export async function loadWorld(): Promise<WorldState | null> {
  const opts = { version: WORLD_VERSION, fallback: () => null };
  const result = await idbGet<WorldSave | null>(WORLD_KEY, opts);
  const world = result?.world;
  // Doppelte Sperre: Checksumme (storage) + Struktur (isValidWorldState) —
  // ein semantisch defekter Save ist genauso wenig eine Welt wie ein kaputter.
  return world && isValidWorldState(world) ? world : null;
}

/** Explizite Erst-Erzeugung (einmalig, erster App-Start): erzeugt UND persistiert. */
export async function ensureWorld(): Promise<WorldState> {
  const existing = await loadWorld();
  if (existing) return existing;
  const fresh = createInitialWorld();
  saveWorld(fresh);
  return fresh;
}
