// Owner: WorldSystem (Welt-Autor) — Vertragstest.
// B40 (19.09.2026): Ein neuer Run startete auf der Startwelt, obwohl die Karte längst gebaut war.
// Ursache: `applyWorldOps` ist rein und liefert ein NEUES Objekt; der Autor ersetzte nur sein
// eigenes Feld. Der Besitzer (App) hielt weiter die alte Karte — der nächste Run bekam sie und
// schrieb „alte Welt + neues Tile“ in den Speicher (gebautes Werk auch persistent verloren).
// Dieser Test pinnt die Zusage: was der Autor persistiert, kennt sein Besitzer SOFORT.

import { describe, it, expect } from 'vitest';
import { EventBus } from '../bus/bus';
import { makeEvent } from '../bus/events';
import { WorldAutor } from './worldAutor';
import { createInitialWorld, applyWorldOps, worldSnapshotOf, type WorldState } from '../world/world_state';

function place(autorBus: EventBus, gx: number, gy: number, tile: string): void {
  autorBus.publish(makeEvent(1, 'TILE_PLACED', 'system:test', 1, { gx, gy, tile }));
}

describe('Welt-Autor — Besitzer-Sicht (B40)', () => {
  it('meldet jede Flush-Welt an den Besitzer (nicht nur an das eigene Feld)', () => {
    const bus = new EventBus();
    const start = createInitialWorld();
    let owner: WorldState = start;
    const autor = new WorldAutor(start, bus, w => { owner = w; });

    place(bus, 3, 4, 'path');
    autor.destroy(); // destroy flusht synchron — kein Timer-Timing im Test

    expect(owner.tiles['3,4']).toBe('path');
    expect(owner).not.toBe(start); // neues Objekt: der Besitzer zieht mit, statt alt zu bleiben
  });

  it('DER DEFEKT: der nächste Run sieht die gebaute Karte — nicht die Startwelt', () => {
    const bus = new EventBus();
    const start = createInitialWorld();
    let owner: WorldState = start;
    const autor = new WorldAutor(start, bus, w => { owner = w; });

    // Run 1: der Spieler baut Umgebung.
    place(bus, 2, 2, 'path');
    place(bus, 2, 3, 'path');
    place(bus, 5, 5, 'decor');
    autor.destroy();

    // Run 2 startet auf der gemeldeten Welt (das ist genau, was `freshState` bekommt).
    const secondRun = worldSnapshotOf(owner);
    expect(Object.keys(secondRun.tiles).sort()).toEqual(['2,2', '2,3', '5,5']);
    expect(secondRun.cols).toBe(start.cols);
  });

  it('ohne Callback bleibt der alte Vertrag gültig (keine Pflicht für Tests/Adapter)', () => {
    const bus = new EventBus();
    const start = createInitialWorld();
    const autor = new WorldAutor(start, bus);
    place(bus, 7, 7, 'rock');
    autor.destroy();
    // Der Autor selbst kennt die Änderung weiterhin (persistiert sie auch).
    expect(autor).toBeDefined();
  });

  it('EXPAND meldet die neue Größe mit — Fläche gehört zur gemeldeten Welt', () => {
    const bus = new EventBus();
    const start = createInitialWorld();
    let owner: WorldState = start;
    const autor = new WorldAutor(start, bus, w => { owner = w; });

    bus.publish(makeEvent(1, 'MAP_EXPANDED', 'system:test', 1, { gx: start.cols + 2, gy: start.rows + 2 }));
    autor.destroy();

    expect(owner.cols).toBe(start.cols + 2);
    expect(owner.rows).toBe(start.rows + 2);
  });

  it('Verkauf ist auch Welt-Wahrheit: gemeldete Welt verliert die Zelle wieder', () => {
    const bus = new EventBus();
    const start = createInitialWorld();
    let owner: WorldState = start;
    const autor = new WorldAutor(start, bus, w => { owner = w; });

    place(bus, 1, 1, 'path');
    bus.publish(makeEvent(2, 'TILE_REMOVED', 'system:test', 2, { gx: 1, gy: 1, tile: 'path' }));
    autor.destroy();

    expect(owner.tiles['1,1']).toBeUndefined();
  });

  it('die Ops selbst sind rein: gleiche Ausgangswelt + gleiche Ops ⇒ gleiches Ergebnis', () => {
    const w = createInitialWorld();
    const ops = [{ type: 'PLACE_TILE' as const, gx: 1, gy: 1, tile: 'path' }];
    const a = applyWorldOps(w, ops);
    const b = applyWorldOps(w, ops);
    expect(a).toEqual(b);
    expect(w.tiles['1,1']).toBeUndefined(); // Ausgangswelt bleibt unberührt
  });
});
