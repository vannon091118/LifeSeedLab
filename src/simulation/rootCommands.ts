// Owner: SimulationRoot (Command-Interpretation, ausgelagert — LOC-Cap Regel 1).
// Der Switch GEHÖRT zum Root (er ist der einzige Command-Consumer), aber er ist
// eine eigene Verantwortung: Commands interpretieren, Systeme anrufen, Rejections
// als Events publizieren. Kein zweiter State-Owner — alles läuft über die hier
// injizierten System-Referenzen.

import type { SimState } from './state';
import type { Command } from '../bus/commands';
import { makePlacementRejected } from '../bus/commands';
import type { GameEvent } from '../bus/events';
import type { PlantSystem } from './plantSystem';
import type { EnemySystem } from './enemySystem';
import type { MapSystem } from './mapSystem';
import type { WaveSystem } from './waveSystem';
import { toDeploySpec } from '../genome/beetle';
import type { MapTileType } from '../config/map.source';

/** Die System-Facets, die der Root dem Command-Interpreter gibt (kein State-Zugriff). */
export interface CommandContext {
  plants: PlantSystem;
  enemies: EnemySystem;
  map: MapSystem;
  waves: WaveSystem;
  publish: (e: GameEvent) => void;
  /** Route bei Wave-Start neu ableiten (P5). */
  recomputeRoute: (state: SimState) => void;
  nextSeq: () => number;
}

export function executeCommand(ctx: CommandContext, state: SimState, cmd: Command): void {
  switch (cmd.type) {
    case 'PLACE_PLANT': {
      const r = ctx.plants.place(state, cmd.payload.variantId, cmd.payload.gx, cmd.payload.gy);
      if (!r.ok) {
        // Rejections are EVENTS, not silence (Defect: stilles Scheitern — UI/FX hängen am Bus)
        ctx.publish(makePlacementRejected(state.clock.tick, ctx.nextSeq(), cmd.payload.gx, cmd.payload.gy, r.reason));
      }
      break;
    }
    case 'REMOVE_PLANT':
      ctx.plants.remove(state, cmd.payload.plantId);
      break;
    case 'START_WAVE':
      ctx.waves.startWave(state);
      // P5: Route bei JEDEM Wave-Start aus dem Tile-Grid neu ableiten —
      // Platzierungen zwischen den Wellen ändern den Laufweg REAL.
      ctx.recomputeRoute(state);
      break;
    case 'PLACE_TILE': {
      const r = ctx.map.placeTile(state, cmd.payload.gx, cmd.payload.gy, cmd.payload.tile as MapTileType);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:map:TILE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'TILE_REJECTED',
          sourceId: 'system:map',
          version: 1,
          payload: { gx: cmd.payload.gx, gy: cmd.payload.gy, tile: cmd.payload.tile, reason: r.reason },
        });
      }
      break;
    }
    case 'DEPLOY_BEETLE': {
      const spec = state.beetles.find(b => b.id === cmd.payload.beetleId);
      // Unbekannte ID = none_available (kein Tier im Lager), bekannte aber belegt/pleite = deploy-Reason.
      const r = spec
        ? ctx.enemies.deployBeetle(state, toDeploySpec(spec))
        : ({ ok: false as const, reason: 'none_available' as const } as const);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:enemy:BEETLE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'BEETLE_REJECTED',
          sourceId: 'system:enemy',
          version: 1,
          payload: { reason: r.reason ?? 'none_available' },
        });
      }
      break;
    }
    case 'FERTILIZE_PLANT': {
      const r = ctx.plants.fertilize(state, cmd.payload.plantId);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:plant:FERTILIZE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'FERTILIZE_REJECTED',
          sourceId: 'system:plant',
          version: 1,
          payload: { plantId: cmd.payload.plantId, reason: r.reason },
        });
      }
      break;
    }
    case 'PROPAGATE_PLANT': {
      const r = ctx.plants.propagate(state, cmd.payload.plantId);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:plant:PROPAGATE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'PROPAGATE_REJECTED',
          sourceId: 'system:plant',
          version: 1,
          payload: { plantId: cmd.payload.plantId, reason: r.reason },
        });
      }
      break;
    }
    case 'EXPAND_MAP': {
      const r = ctx.map.expandMap(state, cmd.payload.gx, cmd.payload.gy);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:map:TILE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'TILE_REJECTED',
          sourceId: 'system:map',
          version: 1,
          payload: { gx: cmd.payload.gx, gy: cmd.payload.gy, tile: 'boulder', reason: r.reason ?? 'not_expandable' },
        });
      }
      break;
    }
    case 'SELECT_PLANT':
    case 'CANCEL_PLACEMENT':
    case 'INSPECT':
    case 'BREED_PLANTS':
      // UI-level concerns handled outside the deterministic sim
      break;
    default: {
      const _exhaustive: never = cmd as never;
      void _exhaustive;
      break;
    }
  }
}
