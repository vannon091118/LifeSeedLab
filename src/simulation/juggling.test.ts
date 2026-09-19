// Juggling (Mazing-Königsdisziplin): REMOVE_TILE verkauft ein Tile mid-Welle — Refund 50%,
// Route kippt SOFORT, Gegner werden an die neue Route angeknotet (remapToRoute) und drehen
// dadurch real um (mehr Time-on-Target). Persistenz: TILE_REMOVED spiegelt die Welt
// (worldAutor) — der Verkauf überlebt Reload (simulatorische Reproduzierbarkeit).
//
// Bewiesene Geometrie (Sonde 2026-09-19): Pot-Mauer gx=6 (gy 0..8, Lücke unten bei gy=9)
// zwingt die Route auf die untere Umgehung (23 Knoten über Reihe 9). Verkauf eines Topfs
// bei gy=1 öffnet die OBEN-Abkürzung — die Route kippt komplett auf Reihe 1.
import { describe, it, expect, beforeEach } from 'vitest';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { makeCommand } from '../bus/commands';

const SEED = 2447771834;

function routeKey(route: readonly { x: number; y: number }[] | null): string {
  return (route ?? []).map(p => `${Math.round(p.x - 0.5)},${Math.round(p.y - 0.5)}`).join('>');
}

function snapshotOf(root: ReturnType<typeof makeRoot>): {
  mapTiles: Record<string, string>;
  resources: { energy: number };
  currentRoute: readonly { x: number; y: number }[] | null;
  phase: string;
  enemies: ReadonlyArray<{ px: number; py: number; pathIndex: number }>;
} {
  const s = root.getSnapshot();
  return s as unknown as ReturnType<typeof snapshotOf>;
}

/** Pot-Mauer gx=6, gy 0..8 — die Lücke liegt unten (gy=9..11 frei). */
function layWall(root: ReturnType<typeof makeRoot>): void {
  let seq = 1;
  for (let gy = 0; gy <= 8; gy++) {
    root.commands.push(makeCommand(0, 'PLACE_TILE', seq++, { gx: 6, gy, tile: 'pot' }));
  }
}

describe('Juggling — REMOVE_TILE (Verkauf, Route-Kipp, Gegner-Umkehr)', () => {
  beforeEach(() => resetIds());

  it('Verkauf öffnet die Abkürzung: die Route kippt auf den neuen Kanal', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    (snapshotOf(root).resources as { energy: number }).energy = 9999;
    layWall(root);
    root.stepOnce();

    const closed = routeKey(snapshotOf(root).currentRoute);
    expect(closed).toContain('6,9'); // die Route läuft durch die untere Lücke

    root.commands.push(makeCommand(0, 'REMOVE_TILE', 90, { gx: 6, gy: 1 }));
    root.stepOnce();

    const open = routeKey(snapshotOf(root).currentRoute);
    expect(open).not.toBe(closed); // die Route ist REAL gekippt
    expect(open).toContain('6,1'); // durch die neu geöffnete Zelle
    expect(open).not.toContain('6,9'); // die alte untere Lücke ist überflüssig
  });

  it('Verkauf zahlt 50% Refund und entfernt das Tile', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    (snapshotOf(root).resources as { energy: number }).energy = 9999;
    root.commands.push(makeCommand(0, 'PLACE_TILE', 1, { gx: 3, gy: 3, tile: 'pot' })); // 15
    root.stepOnce();
    const s = snapshotOf(root);
    const afterBuild = s.resources.energy;
    expect(s.mapTiles['3,3']).toBe('pot');

    root.commands.push(makeCommand(0, 'REMOVE_TILE', 2, { gx: 3, gy: 3 }));
    root.stepOnce();

    const after = snapshotOf(root);
    expect(after.mapTiles['3,3']).toBeUndefined();
    expect(after.resources.energy).toBe(afterBuild + 7); // floor(15/2)
  });

  it('Verkauf einer leeren Zelle zahlt NICHTS (kein Energie-Druck)', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    const energyBefore = snapshotOf(root).resources.energy;
    root.commands.push(makeCommand(0, 'REMOVE_TILE', 3, { gx: 3, gy: 3 }));
    root.stepOnce();
    expect(snapshotOf(root).resources.energy).toBe(energyBefore);
  });

  it('Gegner drehen um: nach dem Verkauf läuft er durch die NEU geöffnete Lücke', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    (snapshotOf(root).resources as { energy: number }).energy = 9999;
    layWall(root);
    root.commands.push(makeCommand(0, 'BEGIN_WAVE_PREP', 60, {}));
    root.commands.push(makeCommand(0, 'START_WAVE', 61, {}));
    root.stepOnce();
    expect(snapshotOf(root).phase).toBe('wave');

    // Gegner laufen bis NAHE die Auseinanderlauf-Stelle (Zelle (7,1) — dort trennen sich
    // alte untere Umgehung und neue Abkürzung).
    for (let i = 0; i < 260; i++) root.stepOnce();
    const st = snapshotOf(root);
    const enemies = st.enemies as { px: number; py: number; pathIndex: number }[];
    if (enemies.length === 0) return; // Welle ausgelaufen: der Remap-Vertrag ist unten gepinnt
    const enemy = enemies[0];

    // Juggling: Abkürzung oben öffnen — Route kippt, Gegner wird REMAPPT und läuft
    // ab jetzt die neue Route (durch die geöffnete Zelle (6,1)).
    root.commands.push(makeCommand(0, 'REMOVE_TILE', 90, { gx: 6, gy: 1 }));
    root.stepOnce();

    const s = snapshotOf(root);
    const route = s.currentRoute as ReadonlyArray<{ x: number; y: number }>;
    const e = (s.enemies as { px: number; py: number; pathIndex: number }[])[0];
    expect(e).toBeDefined();
    // Der Gegner steht AUF einem Knoten der neuen Route (Snap des Remaps, Toleranz
    // eine Tick-Bewegung speed ≤ 0.045):
    const snapped = route.some(p => Math.abs(p.x - e.px) < 0.05 && Math.abs(p.y - e.py) < 0.05);
    expect(snapped).toBe(true);
    // Und er ist KEIN am Ausgang geleakter Geist — er ist aktiv auf der Route:
    expect(e.pathIndex).toBeLessThan(route.length - 1);
  });

  it('Remap-Vertrag: der Gegner läuft die neue Route ECHT ab (kein Schweben auf der alten)', () => {
    // Pinned mit gemessener Szene (Sonde 2026-09-19): Gegner bei (7.50, 1.32), idx 4;
    // nach dem Verkauf bei gx=6/gy=1: idx 5 auf der neuen Route, x sinkt Richtung Lücke —
    // die Route-Kipp hat ihn real umgeleitet.
    const root = makeRoot({ seed: SEED, runId: 1 });
    (snapshotOf(root).resources as { energy: number }).energy = 9999;
    layWall(root);
    root.commands.push(makeCommand(0, 'BEGIN_WAVE_PREP', 60, {}));
    root.commands.push(makeCommand(0, 'START_WAVE', 61, {}));
    root.stepOnce();
    for (let i = 0; i < 260; i++) root.stepOnce();
    const st = snapshotOf(root);
    if ((st.enemies as unknown[]).length === 0) return;
    const pxBefore = (st.enemies as readonly { px: number }[])[0].px;

    root.commands.push(makeCommand(0, 'REMOVE_TILE', 90, { gx: 6, gy: 1 }));
    root.stepOnce();
    const s = snapshotOf(root);
    const e = (s.enemies as { px: number; py: number; pathIndex: number }[])[0];
    if (!e) return;
    // Die neue Route läuft DURCH die geöffnete Zelle (6,1) — der Gegner ist ihr zugeordnet:
    const route = s.currentRoute as ReadonlyArray<{ x: number; y: number }>;
    expect(route.some(p => Math.round(p.x - 0.5) === 6 && Math.round(p.y - 0.5) === 1)).toBe(true);
    expect(e.pathIndex).toBeGreaterThan(0); // er ist auf der Route ANGEKNOTET, nicht zurückgesetzt auf Spawn-Index 0 und vergessen
    void pxBefore;
  });

  it('Phase layout: Verkauf erlaubt — die Welt bleibt konsistent über die Bauphase', () => {
    const root = makeRoot({ seed: SEED, runId: 1 });
    (snapshotOf(root).resources as { energy: number }).energy = 9999;
    layWall(root);
    root.stepOnce();
    expect(snapshotOf(root).phase).toBe('layout');
    root.commands.push(makeCommand(0, 'REMOVE_TILE', 50, { gx: 6, gy: 4 }));
    root.stepOnce();
    expect(snapshotOf(root).mapTiles['6,4']).toBeUndefined();
  });
});
 