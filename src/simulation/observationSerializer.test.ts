// AP4-Test: Observation-Serializer (Phase 2). Determinismus-Test gegen einen frischen Run
// (testkit: frischer Run ⇒ runId 1 ⇒ Seed 2447771834) plus Schema-Invarianten
// (DoD: jede Eigenschaft hat einen Writer).
import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestState, makeRun, makeRunSeed } from '../testing/testkit';
import { SimulationRoot } from './root';
import { serializeObservation, eventsForAgent, OBSERVATION_VERSION } from './observationSerializer';
import { makeEvent } from '../bus/events';
import { GRID_COLS, GRID_ROWS } from '../config/world.source';
import { snapshotHash } from './snapshot';
import { makeRoot } from '../testing/testkit';

/** Frischer Run mit dem echten Run-Seed (AGENTS: deriveSeed(GAME_SEED,'world','run',runId)). */
function freshRoot(): SimulationRoot {
  return makeRoot({ seed: makeRunSeed(1), runId: 1 });
}

beforeEach(() => resetTestState());

describe('AP4 — Observation-Serializer (Phase 2)', () => {
  it('Version ist gepinnt und das Schema trägt die verifizierten Fakten', () => {
    expect(OBSERVATION_VERSION).toBe(1);
    const root = makeRun();
    root.advance(0);
    const obs = serializeObservation(root.getSnapshot(), []);
    expect(obs.version).toBe(1);
    // Ledger: Grid 12×12 = 144 Zellen (nicht 96 — der erste Entwurf hatte eine falsche Kante)
    expect(obs.grid.w).toBe(GRID_COLS);
    expect(obs.grid.h).toBe(GRID_ROWS);
    expect(obs.grid.tiles).toHaveLength(GRID_COLS * GRID_ROWS);
    // Keine Phantom-Felder: agent.pos / perceptionRadius existieren bewusst NICHT.
    expect(obs).not.toHaveProperty('agent');
    expect(obs).not.toHaveProperty('perceptionRadius');
  });

  it('Deterministisch: frischer Run liefert immer dieselbe Observation', () => {
    const a = freshRoot();
    const b = freshRoot();
    a.advance(0);
    b.advance(0);
    // Determinismus-Anker: gleicher Seed ⇒ gleicher State-Hash ⇒ gleiche Observation.
    expect(snapshotHash(a.getSnapshot())).toBe(snapshotHash(b.getSnapshot()));
    const obsA = serializeObservation(a.getSnapshot(), []);
    const obsB = serializeObservation(b.getSnapshot(), []);
    expect(obsA).toEqual(obsB);
    expect(obsA.tick).toBe(0);
    expect(obsA.phase).toBe('layout'); // R1: der Run beginnt mit der Build-Sequenz
    expect(obsA.wave.number).toBe(0);
    expect(obsA.route.waypointCount).toBe(23); // R2: leere Welt ⇒ Diagonal-Treppe (23 Wegpunkte)
    // Laufweg in Feldern (Entscheidung 19.09.2026): auf offener 12×12-Fläche ist der echte Weg
    // genau der kürzestmögliche — der Agent sieht dieselben Zahlen wie der HUD-Chip.
    expect(obsA.route.tiles).toBe(obsA.route.ideal);
    expect(obsA.route.tiles).toBeGreaterThan(0);
    expect(obsA.combat.enemies).toEqual([]);
  });

  it('Jede Observation-Eigenschaft hat einen benannten Writer (DoD-Inventar)', () => {
    // Beweis per Herleitung: alle Felder stammen aus State-Slices der Ownership-Karte.
    const root = makeRun();
    root.advance(0);
    const state = root.getSnapshot();
    const obs = serializeObservation(state, []);
    // tick ← clock (GameClock) · phase ← root · wave ← waveSystem-Slice
    expect(obs.tick).toBe(state.clock.tick);
    expect(obs.phase).toBe(state.phase);
    // inventory ← root/pipeline (Besitz-Wahrheit) · score ← scoreSystem/root
    // #4: Energie ist kein Wahrnehmungsfeld mehr — der Pool steht in `availableVariants`.
    expect(obs.inventory.score).toBe(state.score);
    expect(obs.inventory.availableVariants.every(v => v.count > 0)).toBe(true);
  });

  it('eventsForAgent filtert auf den Agent-Kanal (Ablehnungen + Meilensteine)', () => {
    // Synthetisches Log: der Root leert sein Debug-Log pro Tick (Bewusst-Entscheidung,
    // root.ts stepOnce §4) — der Agent-Strom kommt daher aus dem Bus (AP5-Bridge) und
    // eventsForAgent ist die reine Filter-Funktion darüber.
    const log = [
      makeEvent(7, 'PLACEMENT_REJECTED', 'system:inventory', 1, { reason: 'on_path', gx: 3, gy: 3 }),
      makeEvent(7, 'PROJECTILE_FIRED', 'plant-0001', 2, { projectileId: 'pr1', plantId: 'p1', targetId: 'e1', damage: 15, effectId: null, px: 2.5, py: 4.5 }),
      makeEvent(9, 'WAVE_STARTED', 'system:wave', 3, { wave: 2, enemyCount: 8 }),
      makeEvent(10, 'DAMAGE_DEALT', 'system:combat', 4, { enemyId: 'e1', amount: 12, critical: false, hp: 40, px: 3.5, py: 3.5, effectId: null }),
      makeEvent(12, 'ROUTE_CHANGED', 'system:map', 5, { waypoints: 0, tiles: null, ideal: null, blocked: true }),
    ];
    const events = eventsForAgent(log);
    expect(events.map(e => e.type)).toEqual(['PLACEMENT_REJECTED', 'WAVE_STARTED', 'ROUTE_CHANGED']);
    // Der Lern-Kanal trägt die Gründe mit — genau die Rückmeldung, aus der der Agent lernt.
    expect(events[0].payload.reason).toBe('on_path');
    expect(events[2].payload.blocked).toBe(true);
  });
});
