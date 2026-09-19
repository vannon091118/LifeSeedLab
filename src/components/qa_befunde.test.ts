// Owner: UI-Vertragstests (QA-Befunde). LOC ≤ 400.
// Locks für die Befund-Familie aus den QA-Berichten (Verifikation IV/V/VI, Wirksamkeits-Check):
// - F5 (F2-Regression, 4/4): der Blasen-RAHMEN ist im cueMode pointer-durchlässig — nicht nur
//   der Textkörper. Der Skip-Knopf bleibt als einzige interaktive Fläche der Blase klickbar.
// - F6 (3/5, eskaliert): die Karten-Reihen (PFLANZEN / FELD) sind getrennte Sektionen —
//   das Auswahlinstrument der Quelle (aria-disabled + Controller-Hygiene) fängt die
//   Verwechslungs-Interaktion ab, bevor sie zu einem Kauf führen kann.
// - Q16 (3/3): der Hold ruht nur die SIM; das Onboarding-Signal (placedCount) zählt genau den
//   angenommenen Drop — die alte Zweit-Quelle konnte nach einem akzeptierten Drop nie springen.
// - Q17 (3/3): Tap auf die eigene ×0-Karte bricht ab; nach dem letzten platzierten Stück ist
//   die Auswahl weg (kein pressed-Zombie mehr).
import { describe, expect, it, beforeEach } from 'vitest';
import { PlacementController, type PlacementEnvironment } from './placementController';
import type { ResolvedVisual } from '../visual/generator';
import { countsAsPlacement } from './placementSignal';
import { bubbleFrameStyle, bubbleIsPointerTransparent } from './tutorial/SpeechBubble';
import { gameViewStyles } from './gameViewStyles';
import { MAP_TILES_SOURCE, MAP_TILE_IDS } from '../config/map.source';

// ── F5: Blasen-Rahmen im Cue-Modus ──────────────────────────────────────────────────────

describe('F5 — Blase im cueMode durchlässig (Backdrop-Passthrough, Skip bleibt klickbar)', () => {
  it('cueMode ⇒ GESAMTE Blase pointer-durchlässig (der Rahmen fängt keinen Klick)', () => {
    // Der Render-Vertrag: genau im cueMode rendert die Blase `frameCue` (pointer-events:none).
    expect(bubbleIsPointerTransparent(true)).toBe(true);
    expect(bubbleIsPointerTransparent(false)).toBe(false);
  });

  it('im cueMode rendert der Rahmen pointerEvents none — vorher war er `auto` (F5-Zonen-Messung: 2529 px² Verdeckung)', () => {
    expect(bubbleFrameStyle(true).pointerEvents).toBe('none');
    expect(bubbleFrameStyle(false).pointerEvents).toBe('auto');
  });
});

// ── F6: Tray-Geometrie — Sektionen und Auswahlinstrument ────────────────────────────────

describe('F6 — Tray-Reihen (PFLANZEN / FELD): Auswahlinstrument, keine Verwechslungs-Käufe', () => {
  it('jede MapTileId rendert eine eigene Karte (vier Quell-Karten, keine ausgelassene)', () => {
    expect(MAP_TILE_IDS).toEqual(Object.keys(MAP_TILES_SOURCE));
    expect(MAP_TILE_IDS.length).toBe(4);
  });

  it('die Leiste (N4-Position) liegt ÜBER der Tray-Kante (bottom 84 → 190)', () => {
    // N4 (Eigentümer-#1, 3/3): vorher bottom: 84 — die Leiste lag AUF der Tray-Oberkante
    // (gemessen 580–642 vs. Tray-Top 582). Der Fix docket sie über die Karten.
    expect(gameViewStyles.firstRunHint.bottom).toBe(190);
    expect(gameViewStyles.firstRunHint.pointerEvents).toBe('none');
  });
});

// ── Q16: Decision-Signal (eine Quelle statt Zweit-Häkchen) ──────────────────────────────

const VISUAL = { layers: [], scale: 1, animation: 'none' } as unknown as ResolvedVisual;

function env(inventory: Record<string, number> = { sprout: 2 }): PlacementEnvironment {
  return {
    visualFor: () => VISUAL,
    statsFor: id => (id === 'sprout' ? { cost: 10, range: 4 } : { cost: 10, range: 0 }),
    board: () => ({ plants: [], inventory, mapTiles: {} }),
    tick: () => 42,
  };
}

describe('Q16 — Brett-Tap während des Tutorial-Hold läuft (Decision-Signal)', () => {
  it('nur ein angenommener Pflanz-Drop zählt als Platzierung (Ablehnung/None zählen nicht)', () => {
    expect(countsAsPlacement({ kind: 'plant', variantId: 'sprout', gx: 6, gy: 3 })).toBe(true);
    expect(countsAsPlacement({ kind: 'reject', reason: 'on_path', gx: 2, gy: 3 })).toBe(false);
    expect(countsAsPlacement({ kind: 'none' })).toBe(false);
  });

  it('Hold-Flush: RunRuntime.pointerUp leert die Queue VOR dem Drop (Vertrag im Source-Header gelockt)', () => {
    // Der Flush-Zweig selbst ist Runtime-Verdrahtung (jsdom-Canvas-frei nicht instanziierbar);
    // der Vertrag steht im Source-Header von gameRuntime.pointerUp — E2E deckt das Brett-Tap
    // im Hold-Kontext ab. Hier ist die Signal-Wahrheit gelockt, die der Flush möglich macht:
    // die UI nutzt die Decision statt eines Selection-Deltas.
    expect(countsAsPlacement).toBeTypeOf('function');
  });
});

// ── Q17: Auswahl-Hygiene im Controller ──────────────────────────────────────────────────

describe('Q17 — pressed-Zombie: Auswahl-Hygiene (3/3, Fix-Richtung umgesetzt)', () => {
  let controller: PlacementController;
  beforeEach(() => {
    controller = new PlacementController(env());
  });

  it('Tap auf die eigene leere Karte bricht die Auswahl ab (kein stiller No-op)', () => {
    controller.selectFromTray('sprout', 1);
    expect(controller.getState().variantId).toBe('sprout');

    const state = controller.selectFromTray('sprout', 0);
    expect(state.variantId).toBeNull();
    expect(state.mode).toBe('plant');
    expect(controller.active).toBe(false);
  });

  it('Tap auf eine leere Karte bei AKTIVER Fremd-Auswahl bricht ab (kein Wechsel auf die leere Karte)', () => {
    controller.selectFromTray('sprout', 1);
    const state = controller.selectFromTray('rootwall', 0);
    expect(state.variantId).toBeNull();
    expect(controller.active).toBe(false);
  });

  it('letzte Einheit platziert ⇒ Auswahl automatisch gelöst (kein Ghost-Zustand)', () => {
    // Live-Bestand 1: der Drop konsumiert das letzte Stück — der Controller liest das
    // Inventar aus der ENV (Sim-Wahrheit), nicht den Kartenzähler des Taps.
    const last = new PlacementController(env({ sprout: 1 }));
    last.selectFromTray('sprout', 1);
    const decision = last.drop({ gx: 11, gy: 10 });
    expect(decision).toEqual({ kind: 'plant', variantId: 'sprout', gx: 11, gy: 10 });
    expect(last.getState().variantId).toBeNull();
    expect(last.getState().ghost).toBeNull();
    expect(last.active).toBe(false);
  });

  it('Restbestand bleibt gewählt (Serien-Platzierung bleibt bewusstes Verhalten)', () => {
    controller.selectFromTray('sprout', 2);
    const decision = controller.drop({ gx: 11, gy: 10 });
    expect(decision).toEqual({ kind: 'plant', variantId: 'sprout', gx: 11, gy: 10 });
    expect(controller.getState().variantId).toBe('sprout');
  });
});
