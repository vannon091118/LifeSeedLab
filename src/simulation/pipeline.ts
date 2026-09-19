// Owner: SimulationRoot (State-Fabrik). LOC ≤ 200. E3-Split (Audit 1.6): root.ts war am
// 300er-Cap — die frisch-Zustand-Erzeugung ist reine Konstruktion ohne System-Wiring und
// lebt jetzt hier. Root bleibt State-Owner; diese Datei schreibt nur auf Anruf.
//
// R2-Neubau: der Run beginnt NIEMALS mit einer frisch erzeugten leeren Map — er erhält
// die persistente Welt des Spielers als Pflicht-Snapshot (RootInit.worldSnapshot) und
// kopiert sie in seinen Run-State. Welt ≠ Run: der Run mutiert die Kopie, die Welt bleibt.
import type { SimState } from './state';
import { ownedInventory } from './state';
import { STARTING_INVENTORY, PLANT_IDS } from '../config/plants.source';
import { STARTING_MATERIAL, POOL_KEYS } from '../config/map.source';
import { AUTO_WAVES_DEFAULT } from '../config/economy.source';
import { applyResume, type ResumeSnapshot } from './resume';
import type { GameClock } from '../core/clock';
import type { WorldSnapshot } from '../world/world_state';

/** RootInit-Duplikat wäre ein zweiter Vertrag — der Typ bleibt in root.ts und wird hier importiert. */
export function freshState(
  seed: number,
  init: import('./root').RootInit,
  clock: GameClock,
): SimState {
  // R2: OHNE Welt kein Run — ein stiller Default wäre der alte Fehler (leere Welt bei
  // jedem Start). Der Snapshot ist Pflichtfeld; Altsave/Tests ohne Welt werden fail-closed.
  if (!init.worldSnapshot) {
    throw new Error('R2-Vertrag: SimulationRoot braucht worldSnapshot (persistente Welt) — kein stiller Default.');
  }
  const world = init.worldSnapshot;
  const loadout = init.loadout ?? [];
  // #4 + BESITZ-MODELL (19.09.2026): Bau-Material kommt aus dem BESITZ (Meta.variantCounts) —
  // genau wie Pflanzen, denn der Shop verkauft es und Bauen verbraucht es. Vorher schenkte
  // JEDER Run den vollen Source-Pool; damit waren die Shop-Preise wirkungslos.
  // Ohne `ownedCounts` (Altsave/Tests) gilt das faire Startmaterial der Source als Fallback.
  const material: Record<string, number> = {};
  if (init.ownedCounts) {
    for (const key of POOL_KEYS) {
      const owned = init.ownedCounts[key] ?? 0;
      if (owned > 0) material[key] = owned;
    }
  } else {
    Object.assign(material, STARTING_MATERIAL);
  }
  for (const [key, extra] of Object.entries(init.materialStock ?? {})) {
    material[key] = (material[key] ?? 0) + extra;
  }
  const inventory: Record<string, number> = { ...material };
  // B37: PFLANZEN bleiben Besitz-Wahrheit — mit ownedCounts spiegelt das Inventar GENAU den
  // Besitz (Loadout ohne Besitz ⇒ 0 ⇒ no_inventory); ohne: B1-Fallback loadoutStock.
  if (init.ownedCounts) {
    Object.assign(inventory, ownedInventory(STARTING_INVENTORY, init.ownedCounts, loadout));
  } else {
    Object.assign(inventory, STARTING_INVENTORY);
    for (const id of loadout) { inventory[id] = init.loadoutStock ?? 2; } // B1-Fallback (Altsave/Tests)
  }
  const discovered = [...PLANT_IDS, ...loadout];
  const base: SimState = { seed, runId: init.runId ?? 0, loadout,
    clock: clock.get() as SimState["clock"],
    // R1: jeder Endless-Run beginnt mit der BUILD-SEQUENZ — der Spieler baut sein Maze,
    // bevor die erste Vorbereitung tickt. Resume bleibt 'prep' (applyResume setzt es).
    phase: "layout",
    wave: { number: 0, schedule: null, spawnQueue: [], lastSpawnTick: 0, prepStartTick: clock.get().tick, autoWaves: AUTO_WAVES_DEFAULT },
    resources: { experience: 0 },
    // R2: Run-Kopie der Welt — Größe UND Tiles aus dem Welt-Snapshot (keine neue Map).
    cols: world.cols, rows: world.rows,
    mapTiles: { ...world.tiles },
    currentRoute: null, deployedBeetle: null, lives: 20,
    inventory,
    bredStats: init.bredStats ? { ...init.bredStats } : undefined,
    beetles: init.beetles ? init.beetles.map(b => ({ ...b })) : [],
    discoveredVariants: discovered,
    plants: [],
    enemies: [],
    projectiles: [],
    score: 0,
    combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
    nektarEarned: 0,
    counters: { enemy: 0, plant: 0, projectile: 0 },
  };
  // B2: Resume injiziert ausschließlich den vertraglich erlaubten Teil; die Sim bleibt
  // der einzige Writer des Zustands (kein zweiter Speicherpfad).
  if (init.resume) applyResume(base, init.resume);
  return base;
}
