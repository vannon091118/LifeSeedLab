import { describe, it, expect, beforeEach } from 'vitest';
import { PlacementController, type PlacementEnvironment } from './placementController';
import type { ResolvedVisual } from '../visual/generator';

const FREE = { gx: 11, gy: 10 };
const ON_PATH = { gx: 2, gy: 3 };

const VISUAL = { layers: [], scale: 1, animation: 'none' } as unknown as ResolvedVisual;

interface Board {
  plants: { gx: number; gy: number }[];
  inventory: Record<string, number>;
  mapTiles: Record<string, string>;
  cols: number;
  rows: number;
}

let board: Board;
let controller: PlacementController;
/** Stellvertreter der Sim-Probe: welche (Zelle, Tile)-Paare schließen hier den letzten Weg? */
let closesPath: Set<string>;

function makeEnv(): PlacementEnvironment {
  return {
    visualFor: () => VISUAL,
    statsFor: id => (id === 'sprout' ? { cost: 10, range: 4 } : { cost: 10, range: 0 }),
    board: () => board,
    wouldClosePath: (cell, tile) => closesPath.has(`${cell.gx},${cell.gy}:${tile}`),
    tick: () => 42,
  };
}

describe('PlacementController (B3)', () => {
  beforeEach(() => {
    // #4: EIN Pool für Pflanzen UND Feld-Material (`inventory`) — Energie existiert nicht mehr.
    board = { plants: [], inventory: { sprout: 2, decor: 3, pot: 2 }, mapTiles: {}, cols: 12, rows: 12 };
    closesPath = new Set();
    controller = new PlacementController(makeEnv());
  });

  it('startet idle: keine Auswahl, kein Geist', () => {
    const state = controller.getState();
    expect(state.mode).toBe('plant');
    expect(state.variantId).toBeNull();
    expect(state.ghost).toBeNull();
    expect(controller.active).toBe(false);
  });

  it('idle → selected → ghost: Geist folgt der Zelle mit gültigem Footprint', () => {
    controller.selectFromTray('sprout', 2);
    expect(controller.getState().variantId).toBe('sprout');

    const state = controller.hover(FREE);
    expect(state.ghost).not.toBeNull();
    expect(state.ghost?.valid).toBe(true);
    expect(state.ghost?.reason).toBeNull();
    expect(state.ghost?.range).toBe(4); // Schütze ⇒ Reichweitenring
  });

  it('zweiter Tap auf dieselbe Karte bricht ab (B3)', () => {
    controller.selectFromTray('sprout', 2);
    const state = controller.selectFromTray('sprout', 2);
    expect(state.variantId).toBeNull();
    expect(state.ghost).toBeNull();
  });

  it('bewegt den Geist ohne Auswahl nicht', () => {
    expect(controller.hover(FREE).ghost).toBeNull();
  });

  it('valide Zelle: drop gibt einen PLACE_PLANT-Auftrag zurück', () => {
    controller.selectFromTray('sprout', 2);
    controller.hover(FREE);
    const decision = controller.drop(FREE);
    expect(decision).toEqual({ kind: 'plant', variantId: 'sprout', gx: 11, gy: 10 });
  });

  it('belegte Zelle: drop lehnt ab, markiert den Geist rot und stempelt den Sim-Tick', () => {
    board.plants = [{ gx: 11, gy: 10 }];
    controller.selectFromTray('sprout', 2);
    const decision = controller.drop(FREE);
    expect(decision).toEqual({ kind: 'reject', reason: 'occupied', gx: 11, gy: 10 });

    const state = controller.getState();
    expect(state.rejection).toEqual({ gx: 11, gy: 10, reason: 'occupied', tick: 42 });
    expect(state.ghost?.valid).toBe(false);
    expect(state.ghost?.reason).toBe('occupied');
  });

  it('R2: die alte Korridor-Zelle ist in der Vorschau VALID (kein Pfad-Konzept mehr)', () => {
    controller.selectFromTray('sprout', 2);
    const state = controller.hover(ON_PATH);
    expect(state.ghost?.valid).toBe(true);
    expect(state.ghost?.reason).toBeNull();
  });

  // Regression (Befund „kein Platz, obwohl oben herum Platz ist“): die Vorschau baute das
  // Brett OHNE cols/rows und fiel damit hart auf 12×12 zurück — in einer per FELD gewachsenen
  // Welt war jede Zelle ab gx/gy ≥ 12 „außerhalb“. Der Vertrag prüft jetzt mit der ECHTEN
  // Brettgröße, die der Aufrufer liefern MUSS.
  it('gewachsene Welt: Zelle 13,13 ist gültig und wird angenommen (kein falsches on_path)', () => {
    board.cols = 14;
    board.rows = 14;
    controller.selectFromTray('sprout', 2);
    const state = controller.hover({ gx: 13, gy: 13 });
    expect(state.ghost?.valid).toBe(true);
    expect(state.ghost?.reason).toBeNull();
    expect(controller.drop({ gx: 13, gy: 13 })).toEqual({ kind: 'plant', variantId: 'sprout', gx: 13, gy: 13 });
  });

  it('ohne Bestand lehnt die Vorschau mit no_inventory ab', () => {
    board.inventory = {};
    controller.selectFromTray('sprout', 2); // Kartentap zählt die Karte, der Bestand entscheidet die Regel
    const state = controller.hover(FREE);
    expect(state.ghost?.reason).toBe('no_inventory');
  });

  it('leerer Feld-Pool: der Tile-Modus lehnt lokal mit no_inventory ab (#4)', () => {
    board.inventory = { sprout: 2 }; // kein Material für dieses Feld
    controller.selectTile('decor');
    expect(controller.hover(FREE).ghost?.reason).toBe('no_inventory');
    expect(controller.drop(FREE)).toEqual({ kind: 'reject', reason: 'no_inventory', gx: 11, gy: 10 });
  });

  it('Tile-Modus: Auswahl, Pool-Vorprüfung und PLACE_TILE-Auftrag', () => {
    const state = controller.selectTile('decor');
    expect(state.mode).toBe('decor');
    expect(state.variantId).toBeNull();
    expect(controller.hover(FREE).ghost?.valid).toBe(true);
    expect(controller.drop(FREE)).toEqual({ kind: 'tile', tile: 'decor', gx: 11, gy: 10 });
  });

  // Spieltest v0.0.71 („Stilles Bauversagen"): vorher stand der Geist auf der letzten Wegzelle
  // GRÜN, weil die UI die Weg-Integrität bewusst nicht fragte — der Loslass-Tap wurde dann von
  // der Sim abgelehnt. Jetzt fragt die Vorschau dieselbe Regel (`wouldClosePath`) vorab.
  describe('Weg-Integrität in der Vorschau (Spieltest v0.0.71)', () => {
    it('schließende Bau-Zelle: der Geist ist ROT und nennt route_blocked', () => {
      closesPath.add('11,10:pot');
      controller.selectTile('pot');
      const state = controller.hover(FREE);
      expect(state.ghost?.valid).toBe(false);
      expect(state.ghost?.reason).toBe('route_blocked');
    });

    it('schließende Bau-Zelle: der Tap lehnt lokal ab (kein Command, kein stiller Bau)', () => {
      closesPath.add('11,10:pot');
      controller.selectTile('pot');
      expect(controller.drop(FREE)).toEqual({ kind: 'reject', reason: 'route_blocked', gx: 11, gy: 10 });
      expect(controller.getState().rejection).toEqual({ gx: 11, gy: 10, reason: 'route_blocked', tick: 42 });
    });

    it('freie Zelle bleibt gültig: die Probe entscheidet, nicht der Tile-Typ', () => {
      closesPath.add('11,10:pot');
      controller.selectTile('pot');
      expect(controller.hover({ gx: 3, gy: 3 }).ghost?.reason).toBeNull();
      expect(controller.drop({ gx: 3, gy: 3 })).toEqual({ kind: 'tile', tile: 'pot', gx: 3, gy: 3 });
    });

    it('leerer Pool gewinnt gegen die Weg-Probe (Reihenfolge wie in der Sim: Pool → Geometrie)', () => {
      closesPath.add('11,10:pot');
      board.inventory = { sprout: 2 }; // kein Topf im Vorrat
      controller.selectTile('pot');
      expect(controller.hover(FREE).ghost?.reason).toBe('no_inventory');
      expect(controller.drop(FREE)).toEqual({ kind: 'reject', reason: 'no_inventory', gx: 11, gy: 10 });
    });

    it('Pflanzen fragen die Weg-Probe nicht (sie blockieren nie — sie verteuern nur)', () => {
      closesPath.add('11,10:sprout');
      controller.selectFromTray('sprout', 2);
      expect(controller.hover(FREE).ghost?.valid).toBe(true);
      expect(controller.drop(FREE)).toEqual({ kind: 'plant', variantId: 'sprout', gx: 11, gy: 10 });
    });
  });

  it('gleiches Tile an gleicher Stelle: kein zweiter Bau (Map-System ist idempotent)', () => {
    closesPath.add('11,10:pot'); // die Idempotenz gewinnt: der Bau ändert nichts, also prüft nichts mehr
    controller.selectTile('pot');
    board.mapTiles['11,10'] = 'pot';
    expect(controller.hover(FREE).ghost?.reason).toBeNull();
    expect(controller.drop(FREE)).toEqual({ kind: 'tile', tile: 'pot', gx: 11, gy: 10 });
  });

  it('cancel setzt alles auf idle zurück', () => {
    controller.selectTile('pot');
    controller.hover(FREE);
    const state = controller.cancel();
    expect(state).toEqual({ mode: 'plant', variantId: null, ghost: null, rejection: null });
    expect(controller.drop(FREE)).toEqual({ kind: 'none' });
  });
});
