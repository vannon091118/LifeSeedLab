import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { makeRoot } from '../testing/testkit';
import { hashState } from '../core/hash';
import { toHashable } from './snapshot';
import { resetIds } from '../core/ids';
import { VisualObserver } from '../observers/visualObserver';
import { Camera } from '../render/camera';
import { resolvePlantStats } from './plantSystem';
import { ScoreSystem } from './scoreSystem';
import { ComboSystem } from './comboSystem';
import { makeRng } from '../core/rng';
import type { GameEvent } from '../bus/events';

const SEED = 771123;

// KEINE eigene Hash-Projektion mehr: hier stand die vierte Kopie derselben Projektion
// (snapshot, testkit, gateB, DevOverlay). Eine Kopie, die neue Felder NICHT kennt, wäre der
// leiseste Determinismus-Defekt von allen — der Vergleich hätte weiter bestanden, nur über
// weniger Zustand. Owner ist `snapshot.ts#toHashable`.
function hashOf(root: SimulationRoot): string {
  return hashState(toHashable(root.getSnapshot()));
}

describe('Gate B — deterministische Wiederholung', () => {
  beforeEach(() => resetIds());

  // Replay-Kanon (gleicher Seed + Stream ⇒ identischer Hash) liegt zentral in
  // simulation/determinism.test.ts (B32.2/4) — hier nur der FX-Isolations-Nachbar.

  it('FX an/aus verändert den Gameplay-State nicht', () => {
    // Sequential runs — shared global ID counters must not interleave
    resetIds();
    const a = makeRoot({ seed: SEED });
    const camA = new Camera();
    const obsA = new VisualObserver(camA, true);
    for (const t of ['DAMAGE_DEALT', 'ENEMY_DIED', 'PROJECTILE_FIRED', 'CRITICAL_HIT'] as const) a.bus.subscribe(t, e => obsA.observe(e));
    a.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    a.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    for (let i = 0; i < 500; i++) { a.stepOnce(); obsA.drain(); }
    const hashA = hashOf(a);
    const scoreA = a.getSnapshot().score;

    resetIds();
    const b = makeRoot({ seed: SEED });
    const camB = new Camera();
    const obsB = new VisualObserver(camB, false);
    for (const t of ['DAMAGE_DEALT', 'ENEMY_DIED', 'PROJECTILE_FIRED', 'CRITICAL_HIT'] as const) b.bus.subscribe(t, e => obsB.observe(e));
    b.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    b.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    for (let i = 0; i < 500; i++) { b.stepOnce(); obsB.drain(); }
    expect(hashOf(b)).toBe(hashA);
    expect(b.getSnapshot().score).toBe(scoreA);
  });
});

describe('Gate B — Effektkette, Combo×Score, Reward, Day/Night, GameOver', () => {
  beforeEach(() => resetIds());

  it('Combo-Multiplikator skaliert Score (unit-nah, deterministisch)', () => {
    // Direkt Score+Combo ohne flaky Spawn-Loop: zwei Kills im Combo-Fenster
    const score = new ScoreSystem(() => {});
    const combo = new ComboSystem(() => {});
    // Simuliere minimalen State
    const state: unknown = {
      clock: { tick: 10 },
      seed: SEED,
      score: 0,
      nektarEarned: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
    };
    const s = state as import('./state').SimState;
    // erster Kill: multiplier 1 → delta = reward*1
    combo.registerKill(s);
    const reward = 10;
    const mult1 = s.combo.multiplier;
    score.onEnemyDied(s, 'enemy-0001', reward, reward * mult1, 0, 0);
    const afterFirst = s.score;
    const delta1 = afterFirst;

    // zweiter Kill noch im Fenster (timer=120) → multiplier steigt
    combo.registerKill(s);
    const mult2 = s.combo.multiplier;
    expect(mult2).toBeGreaterThan(mult1);
    score.onEnemyDied(s, 'enemy-0002', reward, reward * mult2, 0, 0);
    const delta2 = s.score - afterFirst;
    expect(delta2).toBeGreaterThan(delta1);
    expect(delta2).toBe(Math.round(reward * mult2));
  });

  it('WaveReward ist nur noch Anzeige: weder Score noch Pool ändern sich (#4)', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    const s = root.getSnapshot();
    s.enemies.length = 0;
    s.wave.spawnQueue = [];
    const beforeScore = s.score;
    const beforePool = { ...s.inventory };
    const reward = (root as unknown as { waves: { checkCompletion: (s: unknown) => number | null } }).waves.checkCompletion(s);
    if (reward !== null) (root as unknown as { score: { grantWaveReward: (s: unknown, w: number, r: number) => void } }).score.grantWaveReward(s, s.wave.number, reward);
    expect(s.score).toBe(beforeScore);
    expect(s.inventory).toEqual(beforePool);
  });

  it('Tag/Nacht-Wechsel emittiert NIGHT_STARTED / DAY_STARTED (Producer in Root)', () => {
    // Resume-Fixture: hohe Lives sind Teil des Resume-Vertrags (snapshotOf-Pfad),
    // kein Live-State-Zugriff. Run bleibt am Leben über beide 2400-Tick-Zyklen.
    const resume = {
      waveNumber: 1, lives: 1_000_000_000, score: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      plants: [], inventory: {}, discoveredVariants: [], nektarEarned: 0,
    };
    const root = makeRoot({ seed: SEED, resume });
    let sawNight = false;
    let sawDay = false;
    root.bus.subscribe('NIGHT_STARTED', () => { sawNight = true; });
    root.bus.subscribe('DAY_STARTED', () => { sawDay = true; });
    // 2 × 2400 Ticks — garantiert je einen Tag- und einen Nacht-Übergang (CYCLE_TICKS)
    for (let i = 0; i < 12000; i++) root.stepOnce();
    expect(sawNight).toBe(true);
    expect(sawDay).toBe(true);
  });

  it('Lives auf 0 ⇒ phase gameover + GAME_OVER Event (echter Leak-Pfad, kein Live-State-Zugriff)', () => {
    // Q1-Balance-fest (grunt damage 4): Welle 1 ohne Abwehr endet nicht mehr — die Prep
    // friert by-design ein (B23.1 wartet auf die erste Pflanze). High-Wave-Resume mit
    // 1 Leben: Welle 21 spawnt ~60 Gegner, der Durchbruch ist garantiert.
    const resume: import('./resume').ResumeSnapshot = {
      waveNumber: 20, lives: 1, score: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
      plants: [], inventory: {}, discoveredVariants: [], nektarEarned: 0,
    };
    const root = makeRoot({ seed: SEED, resume });
    let sawGameOver = false;
    root.bus.subscribe('GAME_OVER', () => { sawGameOver = true; });
    root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
    root.stepOnce();
    // Keine Pflanzen platziert => jeder Gegner leakt am Pfadende.
    // Snapshot-Härtung: Game Over entsteht ausschliesslich über die Sim-Pipeline.
    for (let i = 0; i < 60000 && !sawGameOver; i++) root.stepOnce();
    expect(sawGameOver).toBe(true);
    expect(root.getSnapshot().phase).toBe('gameover');
  });

  it('Pierce-Pflanze erzeugt Projektil mit remainingPierce=2', () => {
    const root = makeRoot({
      seed: SEED,
      loadout: ['cross_pierce'],
      bredStats: { cross_pierce: { hp: 100, damage: 10, range: 5, cooldown: 10, cost: 30, effects: ['EFFECT_PIERCE'] } },
    });
    const st = root.getSnapshot();
    const plant: import('./state').PlantEntity = {
      id: 'plant-9999', variantId: 'cross_pierce', gx: 4, gy: 4, hp: 100, maxHp: 100, lastShot: -999,
      growthState: 'mature', growthTicksLeft: 0, growthTicksTotal: 90, lifeTicksLeft: 900, lifeTicksTotal: 900,
      fertilizeCount: 0, extraDamage: 0, extraCooldown: 0, isWeakened: false, isSeedling: false,
    } as import('./state').PlantEntity;
    st.plants.push(plant);
    const target: import('./state').EnemyEntity = {
      id: 'enemy-9999', typeId: 'grunt', hp: 100, maxHp: 100, px: 4.6, py: 4.6, pathIndex: 0, pathProgress: 0,
      damage: 1, reward: 5, scoreValue: 10, slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: null,
    } as import('./state').EnemyEntity;
    st.enemies.push(target);
    // Der Schuss zieht sein Verhalten aus dem PROFIL (`stats.ballistics`), nicht mehr aus
    // Argumenten. Dieser Eintrag hat kein Profil-Feld — genau der Altsave-Fall, den
    // `getPlantStats` über die Effekt-Tags heilt (Durchschlag 2 wie vorher, kein stilles Nichts).
    const stats = resolvePlantStats(st, 'cross_pierce');
    expect(stats?.ballistics.pierce).toBe(2);
    const proj = (root as unknown as {
      projectiles: { fire: (s: unknown, p: unknown, t: unknown, dmg: number, profile: { speed: number; pierce: number; critChance: number; critMult: number }, effects: string[]) => { remainingPierce: number; speed: number; effectIds: string[] } }
    }).projectiles.fire(st, plant, target, 10, stats!.ballistics, stats!.effects);
    expect(proj.remainingPierce).toBe(2);
    expect(proj.speed).toBeGreaterThan(0);
    expect(proj.effectIds).toEqual(['EFFECT_PIERCE']);
  });

  it('EFFECT_BURN / SLOW / POISON setzen Statusfelder deterministisch', () => {
    const root = makeRoot({ seed: SEED });
    const s = root.getSnapshot();
    const e: import('./state').EnemyEntity = {
      id: 'enemy-0001', typeId: 'grunt', hp: 100, maxHp: 100, px: 2, py: 3, pathIndex: 0, pathProgress: 0,
      damage: 1, reward: 5, scoreValue: 10, slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: null,
    } as import('./state').EnemyEntity;
    s.enemies.push(e);
    s.clock.tick = 100;
    (root as unknown as { enemies: { applyDamage: (s: unknown, id: string, amt: number, crit: boolean, eff: string | null) => unknown } }).enemies.applyDamage(s, e.id, 1, false, 'EFFECT_SLOW');
    expect(e.slowUntil).toBe(190);
    (root as unknown as { enemies: { applyDamage: (s: unknown, id: string, amt: number, crit: boolean, eff: string | null) => unknown } }).enemies.applyDamage(s, e.id, 1, false, 'EFFECT_BURN');
    expect(e.burnTicks).toBe(3);
    (root as unknown as { enemies: { applyDamage: (s: unknown, id: string, amt: number, crit: boolean, eff: string | null) => unknown } }).enemies.applyDamage(s, e.id, 1, false, 'EFFECT_POISON');
    expect(e.poisonTicks).toBe(5);
  });

  it('Ein Kill erzeugt KEINEN zweiten Kontostand (Entscheidung 19.09.2026: Feld gestrichen)', () => {
    // Vorher schrieb jeder Kill 1–5 „Erfahrung" (loot-RNG) in `state.resources` — gelesen hat
    // sie niemand. Der Test pinnt die Entscheidung: Wertung (Score/Nektar-Ertrag) wächst, ein
    // Geld-/Erfahrungstopf existiert nicht. Ein zweiter Kontostand neben Nektar wäre eine zweite
    // Wahrheit über Belohnung — und `resources` würde in `hashState` still ignoriert.
    const score = new ScoreSystem(() => {});
    const s = {
      clock: { tick: 7 }, seed: SEED, score: 0, nektarEarned: 0,
      combo: { count: 0, timer: 0, multiplier: 1, highest: 0 },
    } as unknown as import('./state').SimState;
    score.onEnemyDied(s, 'enemy-0001', 10, 10, 0, 0);
    expect(s.score).toBe(10);
    expect(s.nektarEarned).toBe(2); // floor(10/5)
    expect((s as unknown as Record<string, unknown>).resources).toBeUndefined();
  });

  it('EFFECT_CHAIN: Kill springt zu nächstem Gegner', () => {
    const root = makeRoot({
      seed: SEED,
      loadout: ['cross_chain'],
      bredStats: { cross_chain: { hp: 100, damage: 80, range: 5, cooldown: 10, cost: 30, effects: ['EFFECT_CHAIN'] } },
    });
    const s = root.getSnapshot();
    // zwei Gegner nah beieinander
    const killer: import('./state').PlantEntity = {
      id: 'plant-0001', variantId: 'cross_chain', gx: 2, gy: 2, hp: 100, maxHp: 100, lastShot: 0,
      growthState: 'mature', growthTicksLeft: 0, growthTicksTotal: 90, lifeTicksLeft: 900, lifeTicksTotal: 900,
      fertilizeCount: 0, extraDamage: 0, extraCooldown: 0, isWeakened: false, isSeedling: false,
    } as import('./state').PlantEntity;
    s.plants.push(killer);
    const e1: import('./state').EnemyEntity = {
      id: 'enemy-0001', typeId: 'grunt', hp: 10, maxHp: 10, px: 3, py: 3, pathIndex: 0, pathProgress: 0, damage: 1, reward: 5, scoreValue: 10, slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: 'plant-0001',
    } as import('./state').EnemyEntity;
    const e2: import('./state').EnemyEntity = {
      id: 'enemy-0002', typeId: 'grunt', hp: 100, maxHp: 100, px: 3.5, py: 3.2, pathIndex: 0, pathProgress: 0, damage: 1, reward: 5, scoreValue: 10, slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: null,
    } as import('./state').EnemyEntity;
    s.enemies.push(e1, e2);
    // töte e1 via EnemySystem → ENEMY_DIED, dann chainFrom in Root sollte e2 schädigen
    (root as unknown as { enemies: { applyDamage: (s: unknown, id: string, amt: number, crit: boolean, eff: string | null, src: string | null) => void } }).enemies.applyDamage(s, e1.id, 20, false, null, 'plant-0001');
    const hpBefore = e2.hp;
    (root as unknown as { enemies: { chainFrom: (s: unknown, x: number, y: number, amt: number, range: number) => void } }).enemies.chainFrom(s, e1.px, e1.py, 50, 2);
    expect(e2.hp).toBeLessThan(hpBefore);
  });
});

describe('Gate B — Snapshot-Härtung (Audit Fix 1: kein Live-State-Leak)', () => {
  beforeEach(() => resetIds());

  it('getSnapshot() ist eine defensive Kopie — Mutationen sickern nicht in die Sim', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.stepOnce();
    const snap = root.getSnapshot();
    expect(snap.plants.length).toBe(1);
    snap.lives = 0;
    snap.phase = 'gameover';
    snap.plants.push({ ...snap.plants[0], id: 'plant-FAKE' });
    snap.inventory['sprout'] = 999;
    root.stepOnce(); // Sim läuft unbeeindruckt weiter
    const after = root.getSnapshot();
    expect(after.phase).toBe('layout'); // R1: die Build-Sequenz bleibt unbeeindruckt bestehen
    expect(after.plants.some(p => p.id === 'plant-FAKE')).toBe(false);
    expect(after.inventory['sprout']).not.toBe(999);
  });

  it('Zwei Snapshots sind unabhängige Objekte', () => {
    const root = makeRoot({ seed: SEED });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.stepOnce();
    const a = root.getSnapshot();
    const b = root.getSnapshot();
    expect(a.plants.length).toBe(b.plants.length);
    a.plants.pop();
    expect(b.plants.length).toBe(a.plants.length + 1);
  });

  it('getEventLog() ist eine Tiefkopie — Event-Objekte teilen keine Referenz mit der Sim', () => {
    // Der Log lebt nur WÄHREND eines Ticks (stepOnce leert ihn am Tick-Ende).
    // Beweis in EINEM Tick: Wir mutieren das getEventLog()-Ergebnis im Handler
    // und prüfen, dass ein zweiter Aufruf davon unberührt bleibt.
    const root = makeRoot({ seed: SEED });
    let leakedThroughCopy = false;
    root.bus.subscribe('PLANT_PLACED', () => {
      const log = root.getEventLog();
      expect(log.length).toBeGreaterThan(0);
      (log[0].payload as Record<string, unknown>).hacked = true; // Mutation auf der Kopie
      (log as GameEvent[]).push({ ...log[0], eventId: 'FAKE' });
      const again = root.getEventLog();       // zweiter, unabhängiger Aufruf
      leakedThroughCopy =
        again.some(e => e.eventId === 'FAKE') ||
        JSON.stringify(again).includes('hacked');
    });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.stepOnce();
    expect(leakedThroughCopy).toBe(false);
    // Tick-Ende: Log geleert — keine Referenz aus dem Handler lebt in der Sim weiter.
    expect(root.getEventLog().length).toBe(0);
  });
});
