import { describe, it, expect, beforeEach } from 'vitest';
import { PlacementController, type PlacementEnvironment } from './placementController';
import type { ResolvedVisual } from '../visual/generator';

const FREE = { gx: 11, gy: 10 };
const ON_PATH = { gx: 2, gy: 3 };

const VISUAL = { layers: [], scale: 1, animation: 'none' } as unknown as ResolvedVisual;

interface Board {
  plants: { gx: number; gy: number }[];
  inventory: Record<string, number>;
  energy: number;
  mapTiles: Record<string, string>;
}

let board: Board;
let controller: PlacementController;

function makeEnv(): PlacementEnvironment {
  return {
    visualFor: () => VISUAL,
    statsFor: id => (id === 'sprout' ? { cost: 10, range: 4 } : { cost: 10, range: 0 }),
    board: () => board,
    tileCost: () => 5,
    tick: () => 42,
  };
}

describe('PlacementController (B3)', () => {
  beforeEach(() => {
    board = { plants: [], inventory: { sprout: 2 }, energy: 100, mapTiles: {} };
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

  it('Pfad-Korridor wird schon in der Vorschau abgelehnt', () => {
    controller.selectFromTray('sprout', 2);
    const state = controller.hover(ON_PATH);
    expect(state.ghost?.valid).toBe(false);
    expect(state.ghost?.reason).toBe('on_path');
  });

  it('ohne Bestand lehnt die Vorschau mit no_inventory ab', () => {
    board.inventory = {};
    controller.selectFromTray('sprout', 2); // Kartentap zählt die Karte, der Bestand entscheidet die Regel
    const state = controller.hover(FREE);
    expect(state.ghost?.reason).toBe('no_inventory');
  });

  it('ohne Energie lehnt die Vorschau mit no_energy ab', () => {
    board.energy = 5;
    controller.selectFromTray('sprout', 2);
    expect(controller.hover(FREE).ghost?.reason).toBe('no_energy');
  });

  it('Tile-Modus: Auswahl, Energie-Vorprüfung und PLACE_TILE-Auftrag', () => {
    const state = controller.selectTile('path');
    expect(state.mode).toBe('path');
    expect(state.variantId).toBeNull();
    expect(controller.drop(FREE)).toEqual({ kind: 'tile', tile: 'path', gx: 11, gy: 10 });
  });

  it('Tile ohne Energie wird lokal abgelehnt', () => {
    board.energy = 1;
    controller.selectTile('pot');
    const decision = controller.drop(FREE);
    // B29: die Vorprüfung spricht die Sim-Sprache (`no_energy`) — der Grund war vorher ein
    // eigener UI-Wert mit eigenem Text, obwohl nur der Modus den Unterschied machte.
    expect(decision).toEqual({ kind: 'reject', reason: 'no_energy', gx: 11, gy: 10 });
  });

  it('cancel setzt alles auf idle zurück', () => {
    controller.selectTile('boulder');
    controller.hover(FREE);
    const state = controller.cancel();
    expect(state).toEqual({ mode: 'plant', variantId: null, ghost: null, rejection: null });
    expect(controller.drop(FREE)).toEqual({ kind: 'none' });
  });
});
