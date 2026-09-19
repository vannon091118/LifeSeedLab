// Owner: UI (PlacementController — B3). LOC ≤ 300.
// Zustandsmaschine der Platzierung: idle → selected → ghost → placed/rejected.
// Sie hält AUSSCHLIESSLICH UI-Zustand (Auswahl, Geist, Ablehnung) und gibt Entscheidungen
// zurück — Commands erzeugt der Aufrufer, Gameplay schreibt sie nie. Die Zell-Regel kommt aus
// simulation/placementRules (eine Wahrheit für Sim UND Vorschau).
//
// Tiles (P5) werden bewusst NICHT lokal abgelehnt: das Map-Regelwerk (Baubereich, Korridor,
// maxCount pro Typ) ist reicher als eine Zellenprüfung, deshalb entscheidet dort die Sim über
// TILE_REJECTED — die UI zeigt nur Bedienbarkeit (Energie) vorab an. B29: die Sim-Antwort ist
// damit KEIN Nebenschauplatz mehr — sie kommt als rote Welle und Grund-Text beim Spieler an
// (`bus/eventAudience` → `components/fieldNotice`). Wer hier eine Vorprüfung ergänzt, nimmt dem
// Spieler den Grund, den nur die Sim kennt.

import type { MapTileType } from '../config/map.source';
import type { ResolvedVisual } from '../visual/generator';
import { placementRejectReason, type PlacementRejectReason } from '../simulation/placementRules';

export type PlaceMode = 'plant' | 'sell' | MapTileType;

/** Ablehnungsgrund in der UI. Die Pool-Vorprüfung spricht dieselbe Sprache wie die Sim
 *  (`no_inventory`): Pflanze UND Feld kommen aus demselben Pool (`inventory`, #4). */
export type UiRejectReason = PlacementRejectReason | 'unknown';

export interface Cell {
  gx: number;
  gy: number;
}

export interface GhostCell extends Cell {
  visual: ResolvedVisual;
  /** false ⇒ Zelle ist ungültig (roter Footprint, Ablehnung beim Loslassen). */
  valid: boolean;
  reason: UiRejectReason | null;
  /** Wirkungsradius in Zellen (nur Schützen/Support) — für den Reichweitenring. */
  range: number | null;
}

export interface Rejection extends Cell {
  reason: UiRejectReason;
  /** Determinismus: Zeitbasis ist der Sim-Tick, nicht die Wanduhr. */
  tick: number;
}

export interface PlacementState {
  mode: PlaceMode;
  variantId: string | null;
  ghost: GhostCell | null;
  rejection: Rejection | null;
}

export type PlacementDecision =
  | { kind: 'plant'; variantId: string; gx: number; gy: number }
  | { kind: 'tile'; tile: MapTileType; gx: number; gy: number }
  | { kind: 'sell'; gx: number; gy: number }
  | { kind: 'reject'; reason: UiRejectReason; gx: number; gy: number }
  | { kind: 'none' };

/** Alles, was der Controller von außen lesen darf (read-only Sicht auf Sim + Präsentation). */
export interface PlacementEnvironment {
  /** Aufgelöstes Visual genau wie bei der späteren Platzierung (Identität ändert sich nie). */
  visualFor(variantId: string): ResolvedVisual;
  statsFor(variantId: string): { cost: number; range: number } | null;
  board(): {
    plants: ReadonlyArray<Cell>;
    inventory: Record<string, number>;
    /** Run-Weltgröße (kann durch FELD wachsen) — die Geometrie-Regel braucht sie. */
    cols: number;
    rows: number;
    mapTiles: Record<string, string>;
  };
  /** Sim-Tick als deterministische Zeitbasis für Shake/FX. */
  tick(): number;
}

export class PlacementController {
  private readonly env: PlacementEnvironment;
  private mode: PlaceMode = 'plant';
  private variantId: string | null = null;
  private ghost: GhostCell | null = null;
  private rejection: Rejection | null = null;

  constructor(env: PlacementEnvironment) {
    this.env = env;
  }

  getState(): PlacementState {
    return { mode: this.mode, variantId: this.variantId, ghost: this.ghost, rejection: this.rejection };
  }

  /** Juggling-Werkzeug: Verkaufsmodus — jeder Tap auf ein Tile verkauft es (50% Refund). */
  selectSell(): PlacementState {
    this.mode = 'sell';
    this.variantId = null;
    this.ghost = null;
    this.rejection = null;
    return this.getState();
  }

  /** true ⇒ ein Objekt ist ausgewählt (Tray-Feedback, Cursor). */
  get active(): boolean {
    return this.variantId !== null || this.mode !== 'plant';
  }

  /**
   * Tap auf eine Tray-Karte: auswählen — oder bei gleicher Karte abbrechen (B3).
   *
   * Q17 (pressed-Zombie, 3/3): bei `count <= 0` bricht der Tap die Auswahl AB (vorher: stiller
   * No-op — der Klick auf die ×0-Karte „tut nichts" und der Zombie-Zustand blieb bestehen).
   * Die Karte bleibt das Auswahlinstrument: Abwählen bei noch vorhandenem Bestand, Abbruch bei
   * leerem — ein einziger Writer, keine zweite State-Quelle.
   */
  selectFromTray(variantId: string, count: number): PlacementState {
    if (count <= 0) return this.cancel();
    if (this.mode === 'plant' && this.variantId === variantId) return this.cancel();
    this.mode = 'plant';
    this.variantId = variantId;
    this.ghost = null;
    this.rejection = null;
    return this.getState();
  }

  /** Tap auf eine Tile-Karte: auswählen — oder bei gleicher Karte abbrechen (B3). */
  selectTile(tile: MapTileType): PlacementState {
    if (this.mode === tile) return this.cancel();
    this.mode = tile;
    this.variantId = null;
    this.ghost = null;
    this.rejection = null;
    return this.getState();
  }

  /** Zeiger bewegt sich: Geist folgt der Rasterzelle (kein Hover-Pfad, B3 Desktop-Parität). */
  hover(cell: Cell | null): PlacementState {
    if (!this.active) return this.getState();
    this.ghost = cell ? this.evaluate(cell) : null;
    return this.getState();
  }

  /** Zeiger losgelassen: platzieren, Tile bauen oder ablehnen (Shake + roter Aufblitz). */
  drop(cell: Cell): PlacementDecision {
    if (!this.active) return { kind: 'none' };
    const reason = this.reasonFor(cell);
    if (reason !== null) {
      this.rejection = { gx: cell.gx, gy: cell.gy, reason, tick: this.env.tick() };
      this.ghost = this.evaluate(cell);
      return { kind: 'reject', reason, gx: cell.gx, gy: cell.gy };
    }
    if (this.mode === 'plant' && this.variantId !== null) {
      // Q17: Konsum die letzte Einheit ⇒ Auswahl automatisch lösen. Vorher blieb die leere Karte
      // als Zombie-Zustand stehen (Cancel + Crosshair + pressed-Gefühl ohne Inventar). Bei Rest-
      // bestand bleibt die Sorte gewählt (Serien-Platzierung, bewusstes Verhalten).
      const variantId = this.variantId;
      const remaining = (this.env.board().inventory[variantId] ?? 0) - 1;
      if (remaining <= 0) this.cancel();
      return { kind: 'plant', variantId, gx: cell.gx, gy: cell.gy };
    }
    if (this.mode !== 'plant') {
      if (this.mode === 'sell') return { kind: 'sell', gx: cell.gx, gy: cell.gy };
      return { kind: 'tile', tile: this.mode, gx: cell.gx, gy: cell.gy };
    }
    return { kind: 'none' };
  }

  /** Abbrechen (✕-Button, gleiche Karte erneut, Escape): Auswahl und Geist fallen weg. */
  cancel(): PlacementState {
    this.mode = 'plant';
    this.variantId = null;
    this.ghost = null;
    this.rejection = null;
    return this.getState();
  }

  private evaluate(cell: Cell): GhostCell {
    const reason = this.reasonFor(cell);
    return {
      gx: cell.gx,
      gy: cell.gy,
      visual: this.visualForCell(),
      valid: reason === null,
      reason,
      range: this.rangeForCell(),
    };
  }

  private visualForCell(): ResolvedVisual {
    return this.variantId !== null ? this.env.visualFor(this.variantId) : this.env.visualFor('sprout');
  }

  private rangeForCell(): number | null {
    if (this.variantId === null) return null;
    const stats = this.env.statsFor(this.variantId);
    return stats && stats.range > 1 ? stats.range : null;
  }

  private reasonFor(cell: Cell): UiRejectReason | null {
    const board = this.env.board();
    if (this.mode === 'sell') return null; // Verkauf: die Sim entscheidet (empty_cell/occupied)
    if (this.mode !== 'plant') {
      if (board.mapTiles[`${cell.gx},${cell.gy}`] === this.mode) return null;
      return (board.inventory[this.mode] ?? 0) <= 0 ? 'no_inventory' : null;
    }
    if (this.variantId === null) return 'unknown';

    const stats = this.env.statsFor(this.variantId);
    if (!stats) return 'unknown';
    return placementRejectReason({
      // Geometrie mit der ECHTEN Weltgröße: fehlten cols/rows, prüfte die Vorschau gegen 12×12
      // und lehnte jede Zelle einer gewachsenen Welt ab (rote Welle + „hier ist kein Platz").
      board: { gx: cell.gx, gy: cell.gy, plants: board.plants, cols: board.cols, rows: board.rows },
      inventoryCount: board.inventory[this.variantId] ?? 0,
    });
  }
}
