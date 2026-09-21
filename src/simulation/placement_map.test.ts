import { describe, it, expect, beforeEach } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Platzierung & Map“ (B32.2/3, Phase 4).
// Konsolidierung: map.test.ts + placementRules.test.ts + prep.test.ts (It-Fälle unverändert).

import { SimulationRoot, makeCommand } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { cellRejectReason, placementRejectReason } from './placementRules';

const SEED = 555001;

/** B16.1-Vertrag: die Route wird aus dem STATE gelesen (public contract) —
 *  kein Griff in private System-Felder mehr (der alte getRoute-Umweg ist tot). */
function routeOf(root: SimulationRoot) {
  return root.getSnapshot().currentRoute;
}

describe('Map-System (P5) — Laufweg reagiert REAL auf Platzierungen', () => {
  beforeEach(() => resetIds());

  it('PLACE_TILE nimmt Material aus dem POOL und schreibt das Tile in den State (#4)', () => {
    const root = makeRoot({ seed: SEED });
    const materialBefore = root.getSnapshot().inventory.decor ?? 0;
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'decor' }));
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['6,3']).toBe('decor');
    expect(s.inventory.decor).toBe(materialBefore - 1); // jedes Tile kostet genau 1 Material
  });

  it('der WEG ist kein Tile mehr: PLACE_TILE lehnt ihn als unknown_tile ab (Entscheidung 21.09.2026)', () => {
    // Der Weg ist das Pathfinding-ERGEBNIS — er wird gebaut, nicht gesetzt. Ein alter Save oder
    // ein alter UI-Aufruf darf keinen Zustand schreiben: die Quelle ist der einzige Türhüter
    // (`MAP_TILES_SOURCE[tile]` fehlt ⇒ Ablehnung, kein Material-Abzug, kein Karten-Write).
    const root = makeRoot({ seed: SEED });
    const before = root.getSnapshot();
    const reasons: string[] = [];
    root.bus.subscribe('TILE_REJECTED', (e) => reasons.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'path' }));
    root.stepOnce();

    expect(reasons).toEqual(['unknown_tile']);
    expect(root.getSnapshot().mapTiles['6,3']).toBeUndefined();
    expect(root.getSnapshot().inventory).toEqual(before.inventory); // kein Material-Abzug
  });

  it('R2: ohne Spieler-Tiles ist die Route DAS PATHFINDING-ERGEBNIS (Diagonale Spawn→Ausgang)', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    const route = routeOf(root);
    expect(route).not.toBeNull(); // kein Default-No-op mehr: die leere Welt HAT einen Weg
    // Diagonale (oben rechts → unten links): cols+rows-1 Wegpunkt-Zellen (ortho4-Umweg
    // über die Eck-Treppe — die leere Welt kennt keine Abkürzung, nur Manhattan-Schritte)
    expect(route!.length).toBe(12 + 12 - 1); // 23 Zellen: 11 links + 11 runter + Start
  });

  it('Blocker AUF der Route verlegen sie — kein Wegpunkt steht auf einer Mauer', () => {
    // NEU AUSGERICHTET (21.09.2026, nachgemessen): Der Laufweg kommt aus dem Pathfinding und
    // läuft über die RAND-ECKEN (Reihe 0 nach links, dann Spalte 0 hinunter). Eine Mauer
    // ABSEITS dieser Route — etwa Spalte 4, Zeilen 2–7, wie in der alten Fassung — berührt ihn
    // gar nicht; der Test behauptete damit eine Verlängerung, die es nie gab. Geprüft wird
    // jetzt, was wirklich passiert: die Mauer LIEGT auf der Route und wird UMGANGEN.
    // (Der LÄNGEN-Gewinn steht gemessen in `maze_balance.test.ts` — er braucht zwei versetzte
    // Wände, nicht eine.)
    const root = makeRoot({ seed: SEED, materialStock: { pot: 10 } });
    const wall: [number, number][] = [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0]];
    let seq = 1;
    for (const [gx, gy] of wall) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx, gy, tile: 'pot' }));
    }
    root.stepOnce();
    root.commands.push(makeCommand(1, 'START_WAVE', seq++, {}));
    root.stepOnce();

    const route = routeOf(root);
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(8);
    // Kein Wegpunkt in einer Mauer-Zelle …
    for (const [gx, gy] of wall) {
      expect(route!.some(p => Math.floor(p.x) === gx && Math.floor(p.y) === gy), `Wegpunkt auf Topf ${gx},${gy}`).toBe(false);
    }
    // … und die Route weicht auf die Gasse darunter aus (Reihe 1).
    expect(route!.some(p => Math.round(p.y - 0.5) === 1)).toBe(true);
  });

  it('B16.1-Vertrag: EnemySystem liest dieselbe aktive Route wie Rendering/UI (keine zweite Kopie)', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 3, tile: 'decor' }));
    root.stepOnce();
    root.commands.push(makeCommand(1, 'START_WAVE', 2, {}));
    root.stepOnce();

    const enemies = (root as unknown as { enemies: { activePath(s: unknown): ReadonlyArray<{ x: number; y: number }> } }).enemies;
    const snap = root.getSnapshot();
    const stateRoute = snap.currentRoute;
    expect(stateRoute).not.toBeNull();
    // Parität: die Wegpunkte der Gegner SIND die State-Route (Auflösung: eine Quelle).
    // R2: keine resolveActiveRoute-Schicht mehr — die Sim-Route IST die Wahrheit.
    expect(enemies.activePath(snap)).toBe(stateRoute);
  });

  it('TILE_REJECTED bei max_count (Deko-Deckel 20) — der Vorrat macht das Limit zur Grenze', () => {
    // Seit dem Findling-Schnitt (21.09.2026) hat nur noch die Deko einen kleinen Deckel
    // (maxCount 20) und ist dabei BEGEHBAR — so bleibt `max_count` ohne `route_blocked` prüfbar.
    const root = makeRoot({ seed: SEED, materialStock: { decor: 25 } });
    let rejected = 0;
    let lastReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejected++; lastReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    // 21 unterscheidliche Zellen (Reihen gy 8 und 9 tragen keine Pflanze) — der Vorrat (25)
    // macht MAX_COUNT zur Grenze, nicht das Material.
    const cells: [number, number][] = [];
    for (let gx = 0; gx < 12; gx++) cells.push([gx, 8]);
    for (let gx = 0; gx < 9; gx++) cells.push([gx, 9]);
    let seq = 1;
    for (const [gx, gy] of cells) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx, gy, tile: 'decor' }));
    }
    root.stepOnce();
    expect(rejected).toBe(1);
    expect(lastReason).toBe('max_count');
  });

  it('R2: der Rand ist bebaubar — gx=0 (Spawn-Spalte) ist normale Welt', () => {
    const root = makeRoot({ seed: SEED });
    let rejected = 0;
    root.bus.subscribe('TILE_REJECTED', () => { rejected++; });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 0, gy: 3, tile: 'decor' }));
    root.stepOnce();
    expect(rejected).toBe(0);
    // Kein geschützter Korridor mehr — die Gegner umgehen Tiles, das Verbot existiert nicht
    expect(root.getSnapshot().mapTiles['0,3']).toBe('decor');
  });
});
// B33 → R2: Der alte Pfad-Korridor-Verbot ist GELÖSCHT — die EINZIGE Schranke ist die
// Integritätsregel: der Zug, der den LETZTEN freien Weg schließt, wird abgelehnt
// (`route_blocked`, ohne Material-Abzug). Diese Sektion pinnt die neue Regel.
describe('B33 → R2 — Integritätsregel statt Korridor-Verbot', () => {
  beforeEach(() => resetIds());

  it('lehnt den Zug ab, der den LETZTEN freien Weg schließt — ohne Material-Abzug', () => {
    // Genug Töpfe im Vorrat: die Grenze ist die WEG-Regel, nicht das Material (#4).
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    const poolBefore = root.getSnapshot().inventory.pot ?? 0;
    let rejectedReason = '';
    root.bus.subscribe('TILE_REJECTED', (e) => { rejectedReason = (e as unknown as { payload: { reason: string } }).payload.reason; });
    // Voll-Mauer über alle 12 Reihen in Spalte gx=5 — `pot` (walkable: false, maxCount 24):
    // 12 Töpfe würden die GANZE Spalte blockieren. Die Integritätsregel lässt genau 11 zu;
    // der 12. Zug wird mit `route_blocked` abgelehnt. Der Pool wird über den State-Adapter
    for (let gy = 0; gy < 12; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy + 1, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['5,11']).toBeUndefined(); // der schließende Zug ist NICHT geschrieben
    expect(s.inventory.pot).toBe(poolBefore - 11); // 11 Töpfe gesetzt — der abgelehnte Zug kostete nichts
    expect(rejectedReason).toBe('route_blocked');
  });

  it('erlaubt eine fast vollständige Blockade, solange ein freier Weg übrig bleibt', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    // 11 Töpfe in Spalte 5 — Reihe gy=6 bleibt frei: der Weg läuft dort durch.
    for (let gy = 0; gy < 12; gy++) {
      if (gy === 6) continue;
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy + 1, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
    const s = root.getSnapshot();
    expect(s.mapTiles['5,0']).toBe('pot');
    expect(s.mapTiles['5,6']).toBeUndefined();
    // Die Route existiert weiterhin — durch die freie Lücke
    expect(routeOf(root)).not.toBeNull();
  });

  it('erlaubt einen Topf weit weg vom Weg weiterhin (freie Welt, keine Marge)', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 8, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['6,8']).toBe('pot');
  });

  it('Deko NÄCHST am Spawn bleibt erlaubt — keine Marge mehr (Zelle (6,2))', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 6, gy: 2, tile: 'decor' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['6,2']).toBe('decor');
  });

  /** Spalte 5 als Mauer: nach 11 Töpfen ist genau die letzte Zelle (gy 11) der schließende Zug. */
  function wallColumn(root: SimulationRoot, upto: number): void {
    for (let gy = 0; gy < upto; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy + 1, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
  }

  it('wouldClosePath ist die VORAB-Frage derselben Regel: true ⇔ der Bau wird abgelehnt', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    wallColumn(root, 10);
    // Zwei Lücken (gy 10/11) — der Zug auf gy 10 ist erlaubt, die Probe sagt false.
    expect(root.wouldClosePath(5, 10, 'pot')).toBe(false);
    root.commands.push(makeCommand(1, 'PLACE_TILE', 99, { gx: 5, gy: 10, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['5,10']).toBe('pot');
    // Jetzt ist gy 11 die letzte freie Zelle der Spalte: die Probe sagt true, der Bau lehnt ab.
    expect(root.wouldClosePath(5, 11, 'pot')).toBe(true);
    const rejects: string[] = [];
    root.bus.subscribe('TILE_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(2, 'PLACE_TILE', 100, { gx: 5, gy: 11, tile: 'pot' }));
    root.stepOnce();
    expect(rejects).toEqual(['route_blocked']);
  });

  it('wouldClosePath: begehbares Tile schließt nie (Deko ist keine Wand)', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    wallColumn(root, 11); // die Spalte ist bis auf gy 11 zu
    expect(root.wouldClosePath(5, 11, 'decor')).toBe(false);
  });

  it('wouldClosePath ist idempotent: das schon stehende Tile ändert nichts', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    wallColumn(root, 12); // der zwölfte Zug (gy 11) wird abgelehnt — gy 10 steht
    expect(root.getSnapshot().mapTiles['5,10']).toBe('pot');
    expect(root.wouldClosePath(5, 10, 'pot')).toBe(false);
  });

  // Die Kostenklemme der Probe ist ein Cache auf `mapRev` (s. mapSystem.wouldClosePath): er ist
  // nur so lange harmlos, wie JEDER Karten-Schreibpfad die Revision hebt. Diese zwei Fälle sind
  // die Naht-Locks — ohne sie könnte ein vergessener `mapRev++` eine ALTE Antwort ausliefern und
  // dem Spieler einen legalen Bau als „letzter Weg" verkaufen (oder umgekehrt).
  it('die Probe antwortet nach einem BAU neu (Cache hängt an der Kartenrevision)', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 4 } });
    // Das ZWEITE Wegefeld ist per Konstruktion auf dem Laufweg — nur dort läuft die echte Probe,
    // und nur dort kann überhaupt etwas gecacht worden sein (Vorprüfung antwortet sonst früh).
    const second = routeOf(root)![1];
    const X = { gx: Math.floor(second.x), gy: Math.floor(second.y) };
    // Der ANDERE Nachbar der Spawn-Ecke (11,0) — genau einer der beiden ist X.
    const Y = X.gx === 11 ? { gx: 10, gy: 0 } : { gx: 11, gy: 1 };

    expect(root.wouldClosePath(X.gx, X.gy, 'pot')).toBe(false); // Weg bleibt über Y offen
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { ...Y, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles[`${Y.gx},${Y.gy}`]).toBe('pot');

    // Dieselbe Zelle, neue Welt: X ist jetzt die EINZIGE Ausfahrt der Spawn-Ecke.
    const onRoute = (gx: number, gy: number) =>
      routeOf(root)!.some(p => Math.floor(p.x) === gx && Math.floor(p.y) === gy);
    expect(onRoute(X.gx, X.gy)).toBe(true); // Vorbedingung: die Frage läuft wirklich durch die Regel
    expect(root.wouldClosePath(X.gx, X.gy, 'pot')).toBe(true);
  });

  it('die Probe antwortet nach einem VERKAUF neu (Entfernen öffnet Wege)', () => {
    // AUFBAU NACH DEM WEG-SCHNITT (21.09.2026): Die alte Fassung hielt die Route mit einem
    // WEG-Tile bei (5,0) fest (Gewicht 0,6 < Wiese 1) — diesen Griff gibt es nicht mehr. Statt
    // eines Preises benutzt der Fall jetzt eine PFLANZE: sie kostet `PLANT_ROUTE_COST` (2) und
    // macht die zweite Querung damit STRIKT teurer als die erste. Ohne diesen Griff wären beide
    // Querungen gleich teuer (Tie) — die Route könnte wandern, die Zelle (5,0) wäre nicht mehr
    // Wegefeld, und der Fall hätte nur die VORPRÜFUNG geprüft statt der Revision.
    //
    // Spalte 5 ist bis auf (5,0) zu: EINE Querung ⇒ die Route MUSS dort durch.
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 }, loadout: ['sprout'], loadoutStock: 99 });
    for (let gy = 1; gy < 12; gy++) {
      root.commands.push(makeCommand(0, 'PLACE_TILE', gy, { gx: 5, gy, tile: 'pot' }));
    }
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['5,11']).toBe('pot'); // Spalte 5 ist bis auf (5,0) zu
    const onRoute = (gx: number, gy: number) =>
      routeOf(root)!.some(p => Math.floor(p.x) === gx && Math.floor(p.y) === gy);
    expect(onRoute(5, 0)).toBe(true); // Vorbedingung: die Frage läuft durch die Regel, nicht die Vorprüfung
    expect(root.wouldClosePath(5, 0, 'pot')).toBe(true);

    // VERKAUF (5,11) + Pflanze dort: die zweite Querung ist offen, aber teurer (1 + 2) — die
    // Route bleibt bei (5,0), und der Verkauf darf die gecachte Antwort trotzdem verwerfen.
    root.commands.push(makeCommand(0, 'REMOVE_TILE', 99, { gx: 5, gy: 11 }));
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: 'sprout', gx: 5, gy: 11 }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['5,11']).toBeUndefined();
    expect(onRoute(5, 11)).toBe(false);
    expect(onRoute(5, 0)).toBe(true); // dieselbe Vorbedingung, auch nach dem Verkauf
    expect(root.wouldClosePath(5, 0, 'pot')).toBe(false);
  });

  it('wouldClosePath schreibt NICHTS: Zustand, Route und Event-Log bleiben unberührt', () => {
    const root = makeRoot({ seed: SEED, materialStock: { pot: 12 } });
    const before = root.getSnapshot();
    const logBefore = root.getEventLog().length;
    root.wouldClosePath(5, 10, 'pot');
    root.wouldClosePath(0, 0, 'pot');
    expect(root.getSnapshot()).toEqual(before);
    expect(root.getEventLog().length).toBe(logBefore);
  });
});

// Die Weltgröße ist PFLICHT (`PlacementBoard`): die UI hatte sie früher weggelassen und
// prüfte damit hart gegen 12×12 — in einer gewachsenen Welt war jede Zelle ab gx/gy ≥ 12
// „außerhalb". Die Tests tragen die echten Maße deshalb explizit.
const WORLD = { cols: 12, rows: 12 };
// Freie Zelle: innerhalb des Rasters und weit weg vom Enemy-Pfad (rechts unten).
const FREE = { gx: 11, gy: 10, ...WORLD };
// Zellzentrum (2.5, 3.5) ist exakt ein Pfad-Waypoint.
const ON_PATH = { gx: 2, gy: 3, ...WORLD };

describe('Platzierungsregeln — Geometrie', () => {
  it('akzeptiert eine freie Zelle', () => {
    expect(cellRejectReason({ ...FREE, plants: [] })).toBeNull();
  });

  it('lehnt Zellen außerhalb des Rasters als on_path ab', () => {
    expect(cellRejectReason({ gx: -1, gy: 0, plants: [], ...WORLD })).toBe('on_path');
    expect(cellRejectReason({ gx: 0, gy: 12, plants: [], ...WORLD })).toBe('on_path');
  });

  it('R2: die alte Korridor-Zelle ist eine NORMALE Zelle (kein Verbot mehr)', () => {
    // ON_PATH (2,3) lag am Design-Pfad — im R2-Modell gibt es keinen Pfad mehr, den die
    // Geometrie kennen könnte: nur Bounds und Belegung bleiben.
    expect(cellRejectReason({ ...ON_PATH, plants: [] })).toBeNull();
  });

  it('lehnt belegte Zellen als occupied ab', () => {
    expect(cellRejectReason({ ...FREE, plants: [{ gx: 11, gy: 10 }] })).toBe('occupied');
  });

  it('eine GEWACHSENE Welt bleibt bebaubar (Zelle 13,13 ist innen, nicht „kein Platz“)', () => {
    const grown = { cols: 14, rows: 14 };
    expect(cellRejectReason({ gx: 13, gy: 13, plants: [], ...grown })).toBeNull();
    expect(cellRejectReason({ gx: 13, gy: 13, plants: [], ...WORLD })).toBe('on_path');
  });
});

describe('B37 — Besitz-Wahrheit: Run-Inventar spiegelt genau den Besitz', () => {
  beforeEach(() => resetIds());

  it('Loadout-Eintrag ohne Besitz gibt 0 ⇒ Platzieren lehnt mit no_inventory ab', () => {
    const root = makeRoot({ seed: 42, loadout: ['sprout'], ownedCounts: {} });
    const rejects: string[] = [];
    root.bus.subscribe('PLACEMENT_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 11, gy: 10 }));
    root.stepOnce();
    expect(root.getSnapshot().plants).toHaveLength(0);
    expect(rejects).toEqual(['no_inventory']);
  });

  it('Besitz von 5 ⇒ 5 Platzierungen möglich, die 6. lehnt ab (Pool-Grenze)', () => {
    const root = makeRoot({ seed: 42, loadout: ['sprout'], ownedCounts: { sprout: 5 } });
    // #4: der Test prüft die BESITZ-Grenze — es gibt kein Budget mehr, nur den Pool.
    const state = root.getSnapshot();
    expect(state.inventory.sprout).toBe(5);
    const rejects: string[] = [];
    root.bus.subscribe('PLACEMENT_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    let seq = 1;
    const spots: [number, number][] = [[11,10],[10,10],[9,10],[8,10],[7,10],[6,10]];
    for (const [gx, gy] of spots) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'sprout', gx, gy }));
    }
    for (let i = 0; i < 6; i++) root.stepOnce();
    expect(root.getSnapshot().plants).toHaveLength(5);
    expect(root.getSnapshot().inventory.sprout).toBe(0);
    expect(rejects).toEqual(['no_inventory']);
  });
});

describe('Platzierungsregeln — Pool vor Geometrie (#4)', () => {
  it('meldet no_inventory, bevor Geometrie geprüft wird', () => {
    const reason = placementRejectReason({
      board: { ...ON_PATH, plants: [] },
      inventoryCount: 0,
    });
    expect(reason).toBe('no_inventory');
  });

  it('meldet no_inventory auch bei BELEGTER Zelle zuerst — der Pool entscheidet vor dem Feld', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [{ gx: 11, gy: 10 }] },
      inventoryCount: 0,
    });
    expect(reason).toBe('no_inventory');
  });

  it('meldet occupied, sobald der Pool reicht (Geometrie danach)', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [{ gx: 11, gy: 10 }] },
      inventoryCount: 1,
    });
    expect(reason).toBe('occupied');
  });

  it('gibt null zurück, wenn alles passt', () => {
    const reason = placementRejectReason({
      board: { ...FREE, plants: [] },
      inventoryCount: 1,
    });
    expect(reason).toBeNull();
  });
});

