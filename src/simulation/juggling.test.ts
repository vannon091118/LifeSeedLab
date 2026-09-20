// Wellen-Sperre (Spieler-Entscheid 20.09.2026): gebaut wird NUR zwischen Wellen —
// in 'wave' ist das Brett committet. Das Juggling (mid-Wave-Verkauf, Route-Kipp,
// Gegner-Umkehr) ist mit der Sperre bewusst GESCHNITTEN: die Route kippt mid-Welle nie,
// damit jede Welle aus Wellen-Seed + Brettzustand reproduzierbar bleibt (Bühne für
// reihen-überspringende Käfer). Der Verkauf bleibt Werkzeug der Bauphasen (layout/prep).
import { describe, it, expect, beforeEach } from 'vitest';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';

const SEED = 2447771834;

/** Zusatz-Vorrat für die Mauer-Szenen: 12 Töpfe für Wand + Proben. */
const POT_POOL = { pot: 12 };

type Root = ReturnType<typeof makeRoot>;

function routeKey(route: readonly { x: number; y: number }[] | null): string {
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

/** Pot-Mauer gx=6, gy 0..8 — die Lücke liegt unten (gy=9..11 frei). */
function layWall(root: Root): void {
  let seq = 1;
  for (let gy = 0; gy <= 8; gy++) {
    root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 6, gy, tile: 'pot' }));
  }
}

function wallRoot(): Root {
  return makeRoot({ seed: SEED, runId: 1, materialStock: POT_POOL });
}

/** In die Welle laufen (Brett vorher committet). */
function enterWave(root: Root): void {
  root.commands.push(makeCommand(0, 'BEGIN_WAVE_PREP', 60, {}));
  root.commands.push(makeCommand(0, 'START_WAVE', 61, {}));
  root.stepOnce();
  expect(root.getSnapshot().phase).toBe('wave');
}

/** Bus-Collector (Repo-Muster): das Event-Log wird pro Tick geleert (root.ts, Kills-Vertrag),
 *  Ablehnungen liest man live am Bus — subscribe VOR dem Schritt. */
function collector(root: Root, type: 'PLACEMENT_REJECTED' | 'TILE_REJECTED'): () => ReadonlyArray<{ reason?: string; gx?: number; gy?: number }> {
  const seen: Array<{ reason?: string; gx?: number; gy?: number }> = [];
  root.bus.subscribe(type, (e) => {
    seen.push((e as unknown as { payload: { reason?: string; gx?: number; gy?: number } }).payload);
  });
  return () => seen;
}

describe('Wellen-Sperre — mid-Welle wird nicht gebaut (Juggling geschnitten)', () => {
  beforeEach(() => resetIds());

  it('PLACE_PLANT mid-Welle: abgelehnt (wave_active), kein Plant im State', () => {
    const root = wallRoot();
    enterWave(root);
    const rej = collector(root, 'PLACEMENT_REJECTED');

    root.commands.push(makeCommand(0, 'PLACE_PLANT', 70, { variantId: 'sprout', gx: 2, gy: 2 }));
    root.stepOnce();

    const s = root.getSnapshot();
    expect(s.plants.some(p => p.gx === 2 && p.gy === 2)).toBe(false); // NICHTS verändert
    expect(rej()).toHaveLength(1);
    expect(rej()[0].reason).toBe('wave_active');
    expect(rej()[0].gx).toBe(2);
    expect(rej()[0].gy).toBe(2);
  });

  it('REMOVE_PLANT mid-Welle: abgelehnt, die Pflanze steht danach noch — Event nennt ihre Zelle', () => {
    const root = wallRoot();
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 40, { variantId: 'sprout', gx: 2, gy: 2 }));
    root.stepOnce();
    enterWave(root);
    const rej = collector(root, 'PLACEMENT_REJECTED');

    root.commands.push(makeCommand(0, 'REMOVE_PLANT', 70, { plantId: 'plant-0001' }));
    root.stepOnce();

    const s = root.getSnapshot();
    expect(s.plants.some(p => p.id === 'plant-0001' && p.gx === 2 && p.gy === 2)).toBe(true);
    expect(rej()).toHaveLength(1);
    expect(rej()[0].reason).toBe('wave_active');
    expect(rej()[0].gx).toBe(2); // echte Zelle, kein 0/0-Platzhalter
    expect(rej()[0].gy).toBe(2);
  });

  it('PLACE_TILE mid-Welle: abgelehnt (TILE_REJECTED wave_active), Zelle bleibt leer', () => {
    const root = wallRoot();
    enterWave(root);
    const rej = collector(root, 'TILE_REJECTED');

    root.commands.push(makeCommand(0, 'PLACE_TILE', 70, { gx: 3, gy: 3, tile: 'pot' }));
    root.stepOnce();

    expect(root.getSnapshot().mapTiles['3,3']).toBeUndefined();
    expect(rej()).toHaveLength(1);
    expect(rej()[0].reason).toBe('wave_active');
  });

  it('REMOVE_TILE mid-Welle: abgelehnt, die Route bleibt STEHEND (kein mid-Wave-Kipp mehr)', () => {
    const root = wallRoot();
    layWall(root);
    root.stepOnce();
    const closed = routeKey(root.getSnapshot().currentRoute);
    enterWave(root);
    for (let i = 0; i < 260; i++) root.stepOnce(); // Gegner laufen, Brett ist gefroren
    const rej = collector(root, 'TILE_REJECTED');

    root.commands.push(makeCommand(0, 'REMOVE_TILE', 90, { gx: 6, gy: 1 }));
    root.stepOnce();

    const s = root.getSnapshot();
    expect(s.mapTiles['6,1']).toBe('pot'); // Wand steht
    expect(routeKey(s.currentRoute)).toBe(closed); // Route unangetastet
    expect(rej()).toHaveLength(1);
    expect(rej()[0].reason).toBe('wave_active');
  });

  it('Gegenprobe: in prep bleibt der Bau frei — PLACE_TILE baut real', () => {
    const root = wallRoot();
    root.commands.push(makeCommand(0, 'BEGIN_WAVE_PREP', 60, {}));
    root.stepOnce();
    expect(root.getSnapshot().phase).toBe('prep');
    const rej = collector(root, 'TILE_REJECTED');

    root.commands.push(makeCommand(0, 'PLACE_TILE', 70, { gx: 3, gy: 3, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['3,3']).toBe('pot');
    expect(rej()).toHaveLength(0);
  });

  it('Verkauf öffnet die Abkürzung — zwischen den Wellen (prep) weiterhin erlaubt', () => {
    const root = wallRoot();
    layWall(root);
    root.commands.push(makeCommand(0, 'BEGIN_WAVE_PREP', 60, {}));
    root.stepOnce();

    const closed = routeKey(root.getSnapshot().currentRoute);
    expect(closed).toContain('6,9'); // die Route läuft durch die untere Lücke

    root.commands.push(makeCommand(0, 'REMOVE_TILE', 90, { gx: 6, gy: 1 }));
    root.stepOnce();

    const open = routeKey(root.getSnapshot().currentRoute);
    expect(open).not.toBe(closed); // die Route ist REAL gekippt
    expect(open).toContain('6,1'); // durch die neu geöffnete Zelle
    expect(open).not.toContain('6,9'); // die alte untere Lücke ist überflüssig
  });

  it('Verkauf legt das Material in den POOL zurück und entfernt das Tile (#4)', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    const before = root.getSnapshot().inventory.pot;
    expect(before).toBeGreaterThan(0); // Source-Startbestand (#4)
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 3, gy: 3, tile: 'pot' }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['3,3']).toBe('pot');
    expect(root.getSnapshot().inventory.pot).toBe(before - 1); // Bau kostet genau 1 Material

    root.commands.push(makeCommand(0, 'REMOVE_TILE', 2, { gx: 3, gy: 3 }));
    root.stepOnce();

    const after = root.getSnapshot();
    expect(after.mapTiles['3,3']).toBeUndefined();
    expect(after.inventory.pot).toBe(before); // vollständig zurück im Pool
  });

  it('Verkauf einer leeren Zelle ändert den Pool NICHT', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    const before = root.getSnapshot().inventory.pot;
    root.commands.push(makeCommand(0, 'REMOVE_TILE', 3, { gx: 3, gy: 3 }));
    root.stepOnce();
    expect(root.getSnapshot().inventory.pot).toBe(before);
  });

  it('Phase layout: Verkauf erlaubt — die Welt bleibt konsistent über die Bauphase', () => {
    const root = wallRoot();
    layWall(root);
    root.stepOnce();
    expect(root.getSnapshot().phase).toBe('layout');
    root.commands.push(makeCommand(0, 'REMOVE_TILE', 50, { gx: 6, gy: 4 }));
    root.stepOnce();
    expect(root.getSnapshot().mapTiles['6,4']).toBeUndefined();
  });
});
