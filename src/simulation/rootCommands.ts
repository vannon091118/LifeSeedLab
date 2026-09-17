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
import { INGAME_RESTOCK_MARKUP } from '../config/economy.source';
import { getPlantStats } from './plantSystem';

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
      } else {
        // D1 (Maze-Drift): Pflanzen verteuern ihre Zelle im Cost-Field — JEDE Platzierung
        // biegt den Laufweg SOFORT, nicht erst beim nächsten Wellen-Start. Sonst ist das
        // Zucht-Maze ein No-op zwischen den Wellen (Befund: das Feld sah 1:1 wie vorher aus).
        ctx.recomputeRoute(state);
      }
      break;
    }
    case 'REMOVE_PLANT':
      if (ctx.plants.remove(state, cmd.payload.plantId)) {
        ctx.recomputeRoute(state); // D1: Weg zieht nach — auch beim Entfernen
      }
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
      } else {
        // D1: Tiles BIEGEN den Weg ebenfalls sofort — vorher sah der Spieler nur beim
        // nächsten Wellenstart (START_WAVE) die Wirkung seines Baus.
        ctx.recomputeRoute(state);
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
    case 'SET_AUTO_WAVES':
      // B32: Run-Einstellung, kein Spielzug — der Wellen-Kontext ist der eine Schreibort.
      state.wave.autoWaves = cmd.payload.enabled;
      break;
    case 'BUY_PLANT': {
      // B36: Nachschub im Lauf — Energie → 1× Pflanze ins Inventar. Preis = Pflanzenkosten ×
      // INGAME_RESTOCK_MARKUP (eine Quelle: economy.source). Unbekannte Variante ⇒ Event,
      // kein stiller Abbruch (B29-Muster).
      const stats = getPlantStats(cmd.payload.variantId, state.bredStats);
      if (!stats) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:plant:BUY_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'BUY_REJECTED',
          sourceId: 'system:plant',
          version: 1,
          payload: { variantId: cmd.payload.variantId, reason: 'unknown_variant' },
        });
        break;
      }
      const price = stats.cost * INGAME_RESTOCK_MARKUP;
      if (state.resources.energy < price) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:plant:BUY_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'BUY_REJECTED',
          sourceId: 'system:plant',
          version: 1,
          payload: { variantId: cmd.payload.variantId, reason: 'no_energy' },
        });
        break;
      }
      state.resources.energy -= price;
      state.inventory[cmd.payload.variantId] = (state.inventory[cmd.payload.variantId] ?? 0) + 1;
      ctx.publish({
        eventId: `${state.clock.tick}:system:plant:PLANT_BOUGHT:${ctx.nextSeq()}`,
        tick: state.clock.tick,
        type: 'PLANT_BOUGHT',
        sourceId: 'system:plant',
        version: 1,
        payload: { variantId: cmd.payload.variantId, price },
      });
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
