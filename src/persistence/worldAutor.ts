import type { GameEvent } from '../bus/events';
import { applyWorldOps, type WorldOp, type WorldState } from '../world/world_state';
import { saveWorld } from './worldSave';

// Owner: WorldSystem (Welt-Autor). LOC ≤ 200.
// R2 — der EINZIGE Schreibpfad in die persistente Welt: Der Run mutiert seine KOPIE der
// Welt (SimState.mapTiles, Writer: MapSystem). Dieser Autor beobachtet die akzeptierten
// Bau-Events am Bus und spiegelt dieselben Operationen deterministisch in die Welt —
// Reihenfolge-stabil (Events kommen in Sim-Ordnung), kein Zufall, keine Wanduhr.
// Kein zweiter Map-State: die Welt erfährt nie etwas, das die Sim abgelehnt hat.
//
// SPA-Einwand (Persistenz nur bei Wechsel): gespiegelt wird nur, wenn sich Ops
// angesammelt haben — ein Flush ohne Änderung schreibt nichts.

/** Tile-Typen, die die Welt als Flächenerweiterung kennt (MAP_EXPANDED-Vertrag). */
export class WorldAutor {
  private ops: WorldOp[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly unsub: (() => void)[] = [];
  private destroyed = false;

  constructor(
    private world: WorldState,
    private readonly bus: import('../bus/bus').EventBus,
  ) {
    // TILE_PLACED → die gebaute Umgebung ist Welt-Besitz (dieselbe "gx,gy"-Konvention).
    this.unsub.push(this.bus.subscribe('TILE_PLACED', (e) => {
      const p = (e as Extract<GameEvent, { type: 'TILE_PLACED' }>).payload;
      this.ops.push({ type: 'PLACE_TILE', gx: p.gx, gy: p.gy, tile: p.tile });
      this.scheduleFlush();
    }));
    // TILE_REMOVED (Juggling) → der Verkauf ist auch Welt-Wahrheit: die Zelle wird
    // wieder frei, nach Reload ist die Route dieselbe (simulatorische Reproduzierbarkeit).
    this.unsub.push(this.bus.subscribe('TILE_REMOVED', (e) => {
      const p = (e as Extract<GameEvent, { type: 'TILE_REMOVED' }>).payload;
      this.ops.push({ type: 'REMOVE_TILE', gx: p.gx, gy: p.gy });
      this.scheduleFlush();
    }));
    // MAP_EXPANDED → die Flächenerweiterung ist persistent (gx/gy tragen die NEUE Größe).
    this.unsub.push(this.bus.subscribe('MAP_EXPANDED', (e) => {
      const p = (e as Extract<GameEvent, { type: 'MAP_EXPANDED' }>).payload;
      this.newSize = { cols: p.gx, rows: p.gy };
      this.ops.push({ type: 'EXPAND' });
      this.scheduleFlush();
    }));
  }

  /** Neue Weltgröße nach EXPAND (Zwischenspeicher bis zum Flush). */
  private newSize: { cols: number; rows: number } | null = null;

  /** Flush entkoppelt vom Event-Takt (mehrere Ops pro Tick = ein Write). */
  private scheduleFlush(): void {
    if (this.flushTimer !== null || this.destroyed) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 0);
  }

  private flush(): void {
    if (this.ops.length === 0 && !this.newSize) return;
    let next = applyWorldOps(this.world, this.ops);
    this.ops = [];
    if (this.newSize) {
      next = { ...next, cols: this.newSize.cols, rows: this.newSize.rows };
      this.newSize = null;
    }
    this.world = next;
    saveWorld(this.world);
  }

  /** Aktuelle Welt (z. B. für Tests oder Übergaben) — Kopie, kein Besitz. */
  snapshot(): WorldState {
    return { ...this.world, tiles: { ...this.world.tiles } };
  }

  destroy(): void {
    this.destroyed = true;
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    // Restbestand sichern: ein destroy ohne Flush verliert keine gebaute Umgebung.
    this.flush();
    for (const u of this.unsub) u();
    this.unsub.length = 0;
  }
}
