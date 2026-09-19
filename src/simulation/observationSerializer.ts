// Owner: AgentBridge (Observation-Serialisierung). LOC ≤ 200.
// Phase 2 (Sprint AP4): State → Observation-JSON v1 für den LLM-Decision-Agent.
// Bewusst NICHT in snapshot.ts: dessen Rolle ist Integrität (Hash/Envelope, Gate E),
// nicht Wahrnehmung — zwei Rollen wären zwei Verantwortungen in einer Datei.
//
// Verifizierte Fakten (Ledger): die Observation trägt das GANZE Raster der dynamischen
// Weltfläche (R2: state.cols/rows), kein Wahrnehmungsfenster. Enemy-TypeIds kommen 1:1 aus dem State-Literal
// (grunt|fast|tank|swarm|boss — `beetle` ist Spieler-Entität, nie ein Gegner-Typ).
// route.quality ist echt (M1-Writer in mapSystem/root), nicht null-Platzhalter.

import type { SimState } from './state';
import type { GameEvent } from '../bus/events';
import { tileKey, tileBlocked } from './mapSystem';
import { routeQuality } from './routeQuality';

export const OBSERVATION_VERSION = 1 as const;

export interface ObservationTile {
  gx: number;
  gy: number;
  /** Tile-Typ oder null für unbebaut (Papier-Wiese). */
  tile: string | null;
  /** Belegung: Pflanze steht hier (Gegner sind dynamisch, siehe combat.enemies). */
  occupied: boolean;
}

export interface Observation {
  version: typeof OBSERVATION_VERSION;
  tick: number;
  phase: SimState['phase'];
  wave: { number: number; enemiesRemaining: number };
  grid: { w: number; h: number; tiles: ObservationTile[] };
  route: { waypointCount: number; quality: number | null };
  inventory: { availableVariants: { variantId: string; count: number }[]; energy: number; score: number };
  combat: {
    combo: { count: number; multiplier: number };
    enemies: { enemyId: string; typeId: string; gx: number; gy: number }[];
  };
  recentEvents: { tick: number; type: EventTypeForAgent; payload: Record<string, unknown> }[];
}

/** Events, die der Agent als Lern-Kanal bekommt (Ablehnungen + Meilensteine). */
export type EventTypeForAgent =
  | 'PLACEMENT_REJECTED' | 'TILE_REJECTED' | 'FERTILIZE_REJECTED' | 'PROPAGATE_REJECTED'
  | 'BEETLE_REJECTED' | 'BUY_REJECTED' | 'ROUTE_CHANGED' | 'WAVE_STARTED' | 'WAVE_COMPLETED'
  | 'GAME_OVER';

const AGENT_EVENT_TYPES: readonly EventTypeForAgent[] = [
  'PLACEMENT_REJECTED', 'TILE_REJECTED', 'FERTILIZE_REJECTED', 'PROPAGATE_REJECTED',
  'BEETLE_REJECTED', 'BUY_REJECTED', 'ROUTE_CHANGED', 'WAVE_STARTED', 'WAVE_COMPLETED',
  'GAME_OVER',
];

/** Events seit dem letzten Agent-Tick, gefiltert auf den Agent-Kanal. */
export function eventsForAgent(eventLog: readonly GameEvent[]): Observation['recentEvents'] {
  return eventLog
    .filter(e => (AGENT_EVENT_TYPES as readonly string[]).includes(e.type))
    .map(e => ({ tick: e.tick, type: e.type as EventTypeForAgent, payload: e.payload as Record<string, unknown> }));
}

/**
 * State → Observation-JSON v1. Rein lesend — jede Eigenschaft hat einen benannten
 * Writer (state-Slices aus der Ownership-Karte, quality aus mapSystem/root).
 */
export function serializeObservation(state: SimState, recentEvents: Observation['recentEvents']): Observation {
  const tiles: ObservationTile[] = [];
  // R2: Grid-Größe aus dem State (Run-Kopie der Weltfläche), nicht aus Konstanten.
  for (let gy = 0; gy < state.rows; gy++) {
    for (let gx = 0; gx < state.cols; gx++) {
      const key = tileKey(gx, gy);
      const tile = state.mapTiles[key] ?? null;
      tiles.push({
        gx, gy,
        tile,
        // Töpfe sind Platzierfläche, nicht Belegung — blockierende Tiles (pot/boulder
        // im State) zählen als belegt, ebenso eine vorhandene Pflanze.
        occupied: state.plants.some(p => p.gx === gx && p.gy === gy) || tileBlocked(state.mapTiles, gx, gy),
      });
    }
  }

  return {
    version: OBSERVATION_VERSION,
    tick: state.clock.tick,
    phase: state.phase,
    wave: {
      number: state.wave.number,
      enemiesRemaining: state.enemies.length + state.wave.spawnQueue.length,
    },
    grid: { w: state.cols, h: state.rows, tiles },
    route: {
      waypointCount: state.currentRoute?.length ?? 0,
      // M1-Writer: mapSystem.routeQuality über root.recomputeRoute — hier nur gelesen.
      quality: state.currentRoute ? routeQualityOf(state) : null,
    },
    inventory: {
      availableVariants: Object.entries(state.inventory)
        .filter(([, count]) => count > 0)
        .map(([variantId, count]) => ({ variantId, count })),
      energy: state.resources.energy,
      score: state.score,
    },
    combat: {
      combo: { count: state.combo.count, multiplier: state.combo.multiplier },
      enemies: state.enemies.map(e => ({
        enemyId: e.id, typeId: e.typeId,
        gx: Math.floor(e.px), gy: Math.floor(e.py),
      })),
    },
    recentEvents,
  };
}

/** Route-Qualität — EINE Quelle (mapSystem.routeQuality), keine Formel-Kopie. */
function routeQualityOf(state: SimState): number | null {
  return routeQuality(state.currentRoute);
}
