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
  // ── R1: Layout-Phase (Build-Sequenz) ──────────────────────────────────
  // Im Layout gilt für ALLE Spielzüge dieselbe Wahrheit wie in der Vorbereitung (bauen,
  // pflanzen, kaufen) — der einzige Unterschied: kein Auto-Start (WaveSystem) und kein
  // Countdown (waveTiming). Exit nur über den Spieler: BEGIN_WAVE_PREP (sanft) oder
  // START_WAVE (bewusster Skip — startWave deckt 'layout'). Kein Command-Gate: die Phase
  // ist eine Zeitschleife, kein Verbot.
  switch (cmd.type) {
    case 'BEGIN_WAVE_PREP':
      // R1: der „Fertig"-Knopf der Build-Sequenz — sanft in die erste Vorbereitung.
      if (state.phase === 'layout') {
        state.phase = 'prep';
        state.wave.prepStartTick = state.clock.tick;
        ctx.publish({
          eventId: `${state.clock.tick}:system:wave:LAYOUT_DONE:${ctx.nextSeq()}`, 
          tick: state.clock.tick,
          type: 'LAYOUT_DONE',
          sourceId: 'system:wave',
          version: 1,
          payload: { tiles: Object.keys(state.mapTiles).length },
        });
      }
      break;
    case 'PLACE_PLANT': {
      // R2-Integritätsregel vor dem Platzieren: eine Pflanze verteuert ihre Zelle
      // (PLANT_ROUTE_COST), blockiert sie aber NIE — der Weg kann durch den Umweg-Druck
      // nie ganz verschwinden. Die Regel greift deshalb nur bei BLOCKIERENDEN Zügen
      // (placeTile), hier genügt die Sim-Geometrie + sofortige Route-Nachführung.
      // Wellen-Sperre (Spieler-Entscheid 20.09.2026): gebaut wird NUR zwischen Wellen —
      // in 'wave' ist das Brett committet; Juggling (mid-Wave-Route-Kipp) ist geschnitten.
      if (state.phase === 'wave') {
        ctx.publish(makePlacementRejected(state.clock.tick, ctx.nextSeq(), cmd.payload.gx, cmd.payload.gy, 'wave_active'));
        break;
      }
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
    case 'REMOVE_PLANT': {
      if (state.phase === 'wave') {
        // Die Zelle des Plants liegt im State — das Event nennt sie, statt 0/0 zu behaupten.
        const victim = state.plants.find(p => p.id === cmd.payload.plantId);
        ctx.publish(makePlacementRejected(state.clock.tick, ctx.nextSeq(), victim?.gx ?? 0, victim?.gy ?? 0, 'wave_active'));
        break;
      }
      if (ctx.plants.remove(state, cmd.payload.plantId)) {
        ctx.recomputeRoute(state); // D1: Weg zieht nach — auch beim Entfernen
      }
      break;
    }
    case 'START_WAVE':
      ctx.waves.startWave(state);
      // P5: Route bei JEDEM Wave-Start aus dem Tile-Grid neu ableiten —
      // Platzierungen zwischen den Wellen ändern den Laufweg REAL.
      ctx.recomputeRoute(state);
      break;
    case 'PLACE_TILE': {
      // Wellen-Sperre: mid-Welle wird nicht gebaut (Brett committet).
      if (state.phase === 'wave') {
        ctx.publish({
          eventId: `${state.clock.tick}:system:map:TILE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'TILE_REJECTED',
          sourceId: 'system:map',
          version: 1,
          payload: { gx: cmd.payload.gx, gy: cmd.payload.gy, tile: cmd.payload.tile, reason: 'wave_active' },
        });
        break;
      }
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
    case 'REMOVE_TILE': {
      // Historisch Juggling (mid-Wave-Verkauf, Route-Kipp) — mit der Wellen-Sperre
      // geschnitten: der Verkauf bleibt Werkzeug der Bauphasen (layout/prep).
      //
      // `tile` im TILE_REJECTED-Payload ist ein TRÄGER (Konvention seit dem Weg-Schnitt
      // 21.09.2026): beim Verkauf steht dort die Kachel, die WIRKLICH auf der Zelle liegt —
      // `''` heißt „keine". Vorher stand hier ein fest verdrahteter Kachel-Name, der nach dem
      // Streichen von Weg und Findling eine Kachel behauptet hätte, die es nicht mehr gibt.
      const cellKey = `${cmd.payload.gx},${cmd.payload.gy}`;
      const cellTile = state.mapTiles[cellKey] ?? '';
      if (state.phase === 'wave') {
        ctx.publish({
          eventId: `${state.clock.tick}:system:map:TILE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'TILE_REJECTED',
          sourceId: 'system:map',
          version: 1,
          payload: { gx: cmd.payload.gx, gy: cmd.payload.gy, tile: cellTile, reason: 'wave_active' },
        });
        break;
      }
      const r = ctx.map.removeTile(state, cmd.payload.gx, cmd.payload.gy);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:map:TILE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'TILE_REJECTED',
          sourceId: 'system:map',
          version: 1,
          payload: { gx: cmd.payload.gx, gy: cmd.payload.gy, tile: cellTile, reason: r.reason === 'occupied_plant' ? 'occupied_plant' : 'out_of_world' },
        });
      } else {
        ctx.recomputeRoute(state); // Route kippt SOFORT — das ist der Sinn des Jugglings
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
    case 'EXPAND_MAP': {
      // R2: vergrößert die Run-Kopie der Weltfläche; die Persistenz spiegelt das
      // MAP_EXPANDED-Event in die Welt (worldAutor) — die Erweiterung überlebt den Run.
      const r = ctx.map.expandMap(state);
      if (!r.ok) {
        ctx.publish({
          eventId: `${state.clock.tick}:system:map:TILE_REJECTED:${ctx.nextSeq()}`,
          tick: state.clock.tick,
          type: 'TILE_REJECTED',
          sourceId: 'system:map',
          version: 1,
          // Feld-Kauf: hier ist KEIN Tile beteiligt — der Träger bleibt leer, statt eine
          // erfundene Kachel zu benennen (Konsumenten lesen ausschließlich `reason`).
          payload: { gx: state.cols, gy: state.rows, tile: '', reason: r.reason === 'no_fields' ? 'no_material' : (r.reason ?? 'not_expandable') },
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
