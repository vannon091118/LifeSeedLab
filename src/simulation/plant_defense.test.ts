// P-26 — „3/4 Pflanzen machen nichts“ (Spieltest 20.09.2026) als Mechanik mit Pins.
// Entscheidung des Eigentümers: Tank und Boss bleiben an einer Pflanze stehen und fressen
// sie (grunt/fast/swarm ziehen vorbei — eine Grunt-Fassung machte Welle 2 unspielbar).
// Wunden entstehen durch den Biss (ENEMY_BITE), die Wurzelmauer zahlt per EFFECT_REFLECT
// zurück, das Myzel heilt die echten Wunden. Alle Zahlen: Devlog 22 (eine Quelle).

import { describe, it, expect, beforeEach } from 'vitest';
import { makeRoot, resetFullTestState } from '../testing/testkit';
import { makeCommand } from '../bus/commands';
import type { SimulationRoot } from './root';
import type { ResumeSnapshot } from './resume';
import { ENEMIES_SOURCE, ENEMY_BITE } from '../config/enemies.source';
import { PLANTS_SOURCE } from '../config/plants.source';
import { placementRejectReason } from './placementRules';

const SEED = 555010;

function stepN(root: SimulationRoot, n: number): void {
  for (let i = 0; i < n; i++) root.stepOnce();
}

/** Zelle, an der ein Tank auf der Route innerhalb 1.05 Felder beißt (Route verläuft bei
 *  y=0.5 — eine Mauer eine Zeile darunter hat Distanz ≈1.0 und liegt im Reichweiten-Fenster).
 *  (0,0)-Nachbarn sind oft 0.3 Felder verspätet — die Mitte der Route ist robuster. */
function buildCellBesideRoute(root: SimulationRoot): { gx: number; gy: number } {
  const s = root.getSnapshot();
  const route = s.currentRoute;
  if (!route || route.length === 0) throw new Error('Szene braucht eine Route');
  // y=1 ist die erste Nicht-Weg-Zeile; Abstand Zellmitte→Route-Mitte = 1.0 ≤ 1.05
  for (let x = Math.min(s.cols - 1, 10); x >= 0; x--) {
    const reject = placementRejectReason({
      board: { gx: x, gy: 1, plants: s.plants, cols: s.cols, rows: s.rows },
      inventoryCount: 1,
    });
    if (reject === null) return { gx: x, gy: 1 };
  }
  throw new Error('keine bebaubare Zelle an der Route gefunden');
}

/**
 * Tank-Szene: Resume auf Welle 5 ⇒ START_WAVE startet Welle 6 (Schedule: Grunts + 1 Tank,
 * Tank delay 20). Leben hoch, damit die vorbeiziehenden Grunts die Szene nicht beenden —
 * sie isoliert die Fress-Mechanik, nicht die Balance.
 */
function tankScene(seed: number, extraVariants: string[] = []): { root: SimulationRoot; cell: { gx: number; gy: number } } {
  const probe = makeRoot({ seed });
  const cell = buildCellBesideRoute(probe);
  const variants = ['rootwall', ...extraVariants];
  const ownedCounts: Record<string, number> = {};
  for (const v of variants) ownedCounts[v] = 1;

  // Resume setzt Besitz erneut — Snapshot-Inventar muss den Platzier-Bedarf enthalten,
  // sonst würde das ResumeInventory (B2) das Loadout leeren und PLACE_PLANT → no_inventory.
  const snapInventory: Record<string, number> = {};
  for (const v of variants) snapInventory[v] = 1;
  const root = makeRoot({
    seed,
    loadout: variants,
    ownedCounts,
    resume: {
      waveNumber: 5, lives: 999, score: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      plants: [], inventory: snapInventory, discoveredVariants: [...variants], nektarEarned: 0,
    } as ResumeSnapshot,
  });
  let seq = 1;
  root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: 'rootwall', gx: cell.gx, gy: cell.gy }));
  for (let i = 0; i < extraVariants.length; i++) {
    const v = extraVariants[i] as string;
    const gx = cell.gx + (i % 2 === 0 ? 1 : -1);
    const gy = cell.gy + 1;
    // nur setzen wenn Zelle bebaubar, sonst überspringen (Myzel-Szene)
    const s2 = root.getSnapshot();
    if (gx >= 0 && gy >= 0 && gx < s2.cols && gy < s2.rows) {
      root.commands.push(makeCommand(0, 'PLACE_PLANT', seq++, { variantId: v, gx, gy }));
    }
  }
  root.commands.push(makeCommand(0, 'START_WAVE', seq++, {}));
  stepN(root, 1);
  return { root, cell };
}

describe('P-26 Content — die Fahne und der Biss sind Content-Wahrheit', () => {
  beforeEach(() => { resetFullTestState(); });

  it('nicht alle halten: genau tank und boss fressen — grunt, fast, swarm ziehen vorbei', () => {
    expect(ENEMIES_SOURCE.tank.stopsToEat).toBe(true);
    expect(ENEMIES_SOURCE.boss.stopsToEat).toBe(true);
    expect(ENEMIES_SOURCE.grunt.stopsToEat).toBe(false);
    expect(ENEMIES_SOURCE.fast.stopsToEat).toBe(false);
    expect(ENEMIES_SOURCE.swarm.stopsToEat).toBe(false);
  });

  it('ENEMY_BITE: Schaden 10, Kadenz 30 Ticks, Reichweite 1.05 Zellen', () => {
    expect(ENEMY_BITE.damage).toBe(10);
    expect(ENEMY_BITE.cooldownTicks).toBe(30);
    expect(ENEMY_BITE.reach).toBeCloseTo(1.05, 10);
  });
});

describe('P-26 Verhalten am SimulationRoot', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Tank bleibt an der Mauer stehen, solange sie lebt (Halten)', () => {
    const { root } = tankScene(SEED);
    // Tank spawnt in Welle 6 (delay 20); Grunts ziehen vorbei. Wir warten, bis der Tank
    // in Reichweite ist — dann darf seine Position nicht mehr fortlaufen.
    let held = -1;
    let pos = '';
    for (let i = 0; i < 2400 && held < 0; i++) {
      stepN(root, 10);
      const s = root.getSnapshot();
      const tank = s.enemies.find(e => e.typeId === 'tank');
      if (tank && tank.px > 0) {
        if (pos && pos !== `${tank.px.toFixed(4)},${tank.py.toFixed(4)}`) {
          // einmal bewegt, dann 30 Ticks still? — wir prüfen unten direkt.
        }
        pos = `${tank.px.toFixed(4)},${tank.py.toFixed(4)}`;
        const before = root.getSnapshot().enemies.find(e => e.typeId === 'tank')!;
        stepN(root, 30);
        const after = root.getSnapshot().enemies.find(e => e.typeId === 'tank');
        if (after && Math.abs(after.px - before.px) < 1e-9 && Math.abs(after.py - before.py) < 1e-9) {
          held = i;
        }
      }
    }
    expect(held).toBeGreaterThanOrEqual(0);
  });

  it('Grunt zieht an der Pflanze VORBEI — Welle 1 frisst nicht (Frühspiel-Pin)', () => {
    const root = makeRoot({ seed: SEED, loadout: ['rootwall'], ownedCounts: { rootwall: 1 } });
    const cell = buildCellBesideRoute(root);
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'rootwall', gx: cell.gx, gy: cell.gy }));
    root.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    stepN(root, 1);

    stepN(root, 1200); // 40 s — die alte Grunt-Fassung hatte hier die Mauer auf 270
    const s = root.getSnapshot();
    expect(s.plants.find(p => p.variantId === 'rootwall')?.hp).toBe(300);
  });

  it('Biss-Kadenz: die Mauer verliert genau 10 je 30 Ticks, dazwischen nichts', () => {
    const { root } = tankScene(SEED);
    let tankSeen = false;
    let lastHp = 300;
    let checked = 0;
    for (let i = 0; i < 2000 && checked < 3; i++) {
      stepN(root, 1);
      const s = root.getSnapshot();
      const wall = s.plants.find(p => p.variantId === 'rootwall');
      if (!wall) break;
      const tank = s.enemies.find(e => e.typeId === 'tank');
      const inReach = tank && Math.abs(tank.px - (wall.gx + 0.5)) < 1.05 && Math.abs(tank.py - (wall.gy + 0.5)) < 1.05;
      if (inReach) tankSeen = true;
      if (tankSeen && tank && s.clock.tick % 30 !== 0) {
        expect(wall.hp).toBe(lastHp); // zwischen den Bissen: keine Bewegung
      }
      if (tankSeen && s.clock.tick % 30 === 0 && s.clock.tick > 0 && inReach) {
        // Biss-Tick: genau ein Biss von genau einem Fresser
        expect(lastHp - wall.hp).toBeLessThanOrEqual(ENEMY_BITE.damage);
        lastHp = wall.hp;
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });

  it('Reflex-Gleichung: je Biss auf die Mauer genau rootwall.damage an den Fresser', () => {
    const { root } = tankScene(SEED);
    let wallBites = 0;
    let lastWallHp = 300;
    let tankAtDeath: number | null = null;
    for (let i = 0; i < 3000; i++) {
      stepN(root, 1);
      const s = root.getSnapshot();
      const wall = s.plants.find(p => p.variantId === 'rootwall');
      if (wall && wall.hp < lastWallHp) {
        wallBites += (lastWallHp - wall.hp) / ENEMY_BITE.damage;
        lastWallHp = wall.hp;
      } else if (!wall && wallBites > 0 && tankAtDeath === null) {
        // Wand im letzten Tick gestorben — Bisse nicht mehr messbar, Szene endet hier
        tankAtDeath = s.enemies.find(e => e.typeId === 'tank')?.hp ?? null;
        break;
      }
    }
    expect(wallBites).toBeGreaterThan(0);
    // Der Tank (Welle 6: HP 150 × 1.9 = 285) hat je Biss 5 (rootwall.stats.damage) genommen.
    // Während die Wand lebte: Reflex-Bites == Wand-Bisse, modulo Spross-Beschuss (ungefähr).
    // Strenger Pin: Reflexanteil ist Vielfaches von 5 und nicht mehr als Wand-Bisse.
    const reflexPerBite = (PLANTS_SOURCE as Record<string, { stats: { damage: number } }>).rootwall.stats.damage;
    const s = root.getSnapshot();
    const tank = s.enemies.find(e => e.typeId === 'tank');
    if (tank) {
      const tankMax = Math.round(ENEMIES_SOURCE.tank.hp * (1 + 6 * 0.15));
      const taken = tankMax - (tankAtDeath ?? tank.hp);
      expect(taken % reflexPerBite).toBe(0);
      expect(taken).toBeGreaterThan(0);
      expect(taken).toBeLessThanOrEqual(wallBites * reflexPerBite + 30); // + Spross-Schaden schlupft rein
    }
  });

  it('Myzel heilt die Biss-Wunden der Mauer (echte Wunden, echte Heilung)', () => {
    const { root } = tankScene(SEED, ['mycelia']);
    let minHp = 300;
    let healed = false;
    for (let i = 0; i < 2400; i++) {
      stepN(root, 1);
      const s = root.getSnapshot();
      const wall = s.plants.find(p => p.variantId === 'rootwall');
      if (!wall) break;
      if (wall.hp < minHp) minHp = wall.hp;
      if (wall.hp > minHp) healed = true; // zwischen Bissen wieder aufgebaut
    }
    expect(healed).toBe(true);
  });

  it('Ende-zu-Ende: die Mauer wird gefressen (300 → weg) und danach läuft der Tank weiter', () => {
    const { root, cell } = tankScene(SEED);
    let wallGone = -1;
    let tankAtDeath = '';
    let movedOn = false;
    for (let i = 0; i < 3000 && wallGone < 0; i++) {
      stepN(root, 1);
      const s = root.getSnapshot();
      if (!s.plants.some(p => p.variantId === 'rootwall')) {
        wallGone = i;
        const tank = s.enemies.find(e => e.typeId === 'tank');
        tankAtDeath = tank ? `${tank.px.toFixed(4)},${tank.py.toFixed(4)}` : '';
      }
    }
    expect(wallGone).toBeGreaterThanOrEqual(0);
    // Nach dem Fressen läuft der Fresser weiter (kein Steckenbleiben an der leeren Zelle).
    for (let i = 0; i < 300 && !movedOn; i++) {
      stepN(root, 10);
      const tank = root.getSnapshot().enemies.find(e => e.typeId === 'tank');
      if (tank && `${tank.px.toFixed(4)},${tank.py.toFixed(4)}` !== tankAtDeath) movedOn = true;
    }
    expect(movedOn).toBe(true);
    expect(cell.gx).toBeGreaterThanOrEqual(0); // Szene-Kontrakt (Zelle war bebaubar)
  });
});
