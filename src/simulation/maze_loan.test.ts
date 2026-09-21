// B38-Nachweis: PLANT_ROUTE_COST wirkt identisch auf die Leih-Pflanze (loan_sprout).
// computeRoute taxiert ZELL-basiert über state.plants (mapSystem plantPenalty) — die
// Leih-Pflanze ist nach D2b eine normale PlantEntity, also ohne Sonderbehandlung im
// Cost-Field. Dieser Test pinnt die Naht: D2b-Platzierbarkeit × B38-Maze-Wirkung.
//
// NEU GEMESSEN (Sonde 21.09.2026, nach dem Weg-Schnitt): Die leere Welt läuft über die
// RAND-ECKEN (Reihe 0 nach links, dann Spalte 0 hinunter — 22 Felder, 23 Wegpunkte). Die
// Bezugszelle ist der ZWEITE Wegpunkt (10,0). Die alte Fassung maß eine „Weg-Bahn" auf
// Spalte 6 — die gab es nur mit Weg-Tiles (Gewicht 0,6), und die sind seit der Entscheidung
// „der Weg ist das Pathfinding-Ergebnis" kein Baumaterial mehr.
//
// Der schärfste Teil ist der IDENTITÄTS-Vergleich: dieselbe Zelle, dieselbe Route. Eine
// Leih-Pflanze darf keinen eigenen Weg-Pfad haben (D2b).
import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot } from './root';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';
import { deriveLoanPlant, LOAN_PLANT_ID } from '../meta/loan';
import { deriveSeed } from '../core/rng';
import { GAME_SEED } from '../config';
import { routeWalkTiles } from './mapSystem';

/** Die leere Welt (Rand-Ecken-Route) — Bezugspunkt aller Vergleiche (gemessen). */
const EMPTY_ROUTE = '11,0>10,0>9,0>8,0>7,0>6,0>5,0>4,0>3,0>2,0>1,0>0,0'
  + '>0,1>0,2>0,3>0,4>0,5>0,6>0,7>0,8>0,9>0,10>0,11';

/** Bezugszelle des Datensatzes: der zweite Wegpunkt der Rand-Route (gemessen: 10,0). */
const ANCHOR: readonly [number, number] = [10, 0];

function routeKey(root: SimulationRoot): string {
  const r = root.getSnapshot().currentRoute ?? [];
  return r.map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

function onRoute(root: SimulationRoot, gx: number, gy: number): boolean {
  return (root.getSnapshot().currentRoute ?? []).some(p => Math.floor(p.x) === gx && Math.floor(p.y) === gy);
}

/** Root wie App.tsx (D2/D2b): Run-Loadout trägt die Leih-ID, Run-bredStats die Stats. */
function loanRoot(): SimulationRoot {
  const runId = 1;
  const loan = deriveLoanPlant(runId);
  const runSeed = deriveSeed(GAME_SEED, 'world', 'run', runId, 1);
  // ENTFERNT (19.09.2026): hier stand `state.resources.energy = 9999` — ein Rest des
  // Energiesystems. Das Feld existiert seit dessen Streichung nicht mehr; die Zuweisung lief
  // ins Leere und ist mit dem Erfahrungstopf endgültig gefallen (der Run hat keinen Kontostand).
  return makeRoot({
    seed: runSeed, runId,
    loadout: ['sprout', LOAN_PLANT_ID], loadoutStock: 99,
    bredStats: { [LOAN_PLANT_ID]: { ...loan.stats, cost: loan.cost, effects: [] } },
  });
}

/** Dieselbe Welt, dieselbe Aktion — nur die Variante unterscheidet sich (Identitätsprobe). */
function rootWithPlant(variantId: string, gx: number, gy: number): SimulationRoot {
  const root = loanRoot();
  root.stepOnce(); // die leere Route steht (Run-Start-Vertrag)
  root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId, gx, gy }));
  root.stepOnce();
  return root;
}

describe('Maze × Leih-Pflanze: PLANT_ROUTE_COST greift auf loan_sprout', () => {
  beforeEach(() => resetIds());

  it('Leih-Pflanze ist auf der Route platzierbar und landet im Cost-Field (D2b-Naht)', () => {
    const root = loanRoot();
    root.stepOnce();
    expect(routeKey(root)).toBe(EMPTY_ROUTE); // Vorbedingung: die Bezugsroute steht
    const [gx, gy] = ANCHOR;
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx, gy }));
    root.stepOnce();
    expect(root.getSnapshot().plants.some(p => p.variantId === LOAN_PLANT_ID && p.gx === gx && p.gy === gy)).toBe(true);
  });

  it('Leih-Pflanze verlegt die Route EXAKT wie ein Spross — kein eigener Weg-Pfad (D2b)', () => {
    const loan = rootWithPlant(LOAN_PLANT_ID, ANCHOR[0], ANCHOR[1]);
    const sprout = rootWithPlant('sprout', ANCHOR[0], ANCHOR[1]);

    // Die Kern-Aussage: identische Zelle ⇒ identische Route, egal welche der beiden Pflanzen.
    expect(routeKey(loan)).toBe(routeKey(sprout));
    // … und die Route ist wirklich verlegt worden (nicht der Zufall eines No-ops):
    expect(routeKey(loan)).not.toBe(EMPTY_ROUTE);
    expect(onRoute(loan, ANCHOR[0], ANCHOR[1])).toBe(false); // die Pflanze wird UMGANGEN
    // Länge unverändert: die Pflanze verschiebt den ORT, nicht die Strecke.
    expect(routeWalkTiles(loan.getSnapshot().currentRoute!)).toBe(22);
  });

  it('Leih-Pflanze + normale Pflanze: die Gasse wandert weiter, beide Zellen bleiben frei', () => {
    // Gemessen (Sonde 21.09.2026): Die Leih-Pflanze auf (10,0) schiebt die Route auf die Gasse
    // gy=1. Eine ZWEITE Pflanze wirkt deshalb nur, wenn sie AUF dieser neuen Route steht:
    // (9,1) verlegt sie weiter (Route auf gy=2) — (9,0) täte NICHTS, weil dort niemand mehr läuft.
    // Der Test pinnt genau diese Naht: Wirkung hängt am Ort auf der AKTUELLEN Route.
    const loanOnly = rootWithPlant(LOAN_PLANT_ID, ANCHOR[0], ANCHOR[1]);
    const loanOnlyKey = routeKey(loanOnly);
    const SECOND: readonly [number, number] = [9, 1]; // der nächste Wegpunkt der neuen Gasse

    const both = loanRoot();
    both.stepOnce();
    both.commands.push(makeCommand(0, 'PLACE_PLANT', 100, { variantId: LOAN_PLANT_ID, gx: ANCHOR[0], gy: ANCHOR[1] }));
    both.commands.push(makeCommand(0, 'PLACE_PLANT', 101, { variantId: 'sprout', gx: SECOND[0], gy: SECOND[1] }));
    both.stepOnce();

    expect(routeKey(both)).not.toBe(EMPTY_ROUTE);
    expect(routeKey(both)).not.toBe(loanOnlyKey); // die zweite Pflanze verschiebt weiter
    expect(onRoute(both, ANCHOR[0], ANCHOR[1])).toBe(false);
    expect(onRoute(both, SECOND[0], SECOND[1])).toBe(false);
    expect(onRoute(loanOnly, SECOND[0], SECOND[1])).toBe(true); // Vorbedingung: sie lag WIRKLICH auf der Route
    expect(routeWalkTiles(both.getSnapshot().currentRoute!)).toBe(22);
  });
});
