// Owner: Simulation (Ballistik-Verdrahtung). Test.
// Der Adapter-Test prüft die ABLEITUNG (`genome/ballistics`), dieser Test prüft die NAHT:
// kommt das Profil wirklich aus dem Genom bis in den Schuss — und wirkt der ZWEITE Effekt
// eines Schusses, der vorher toter Content war (`root` reichte nur `effects[0]` durch).

import { describe, it, expect, beforeEach } from 'vitest';
import { makeRoot } from '../testing/testkit';
import { resetIds } from '../core/ids';
import { deriveBredEntry } from '../meta/store';
import { getPlantStats } from './plantSystem';
import { ballisticsOf } from '../genome/ballistics';
import type { PlantEntity, EnemyEntity, SimState } from './state';
import type { PlantVariant } from '../types';

const SEED = 424242;

function variant(genome: Array<{ id: string; power: number; dominant: boolean }>): PlantVariant {
  return {
    id: 'cross_test', name: 'Testling', type: 'shooter', genome,
    traits: [], cost: 30,
    stats: { hp: 100, damage: 10, range: 5, cooldown: 10, special: null },
    color: '#fff', discovered: true, sourceId: 'sprout',
  } as PlantVariant;
}

function plantAt(s: SimState, gx: number, gy: number, variantId: string): PlantEntity {
  const p: PlantEntity = {
    id: 'plant-9999', variantId, gx, gy, hp: 100, maxHp: 100, lastShot: -999,
    growthState: 'mature', growthTicksLeft: 0, growthTicksTotal: 90, lifeTicksLeft: 900, lifeTicksTotal: 900,
    fertilizeCount: 0, extraDamage: 0, extraCooldown: 0, isWeakened: false, isSeedling: false,
  };
  s.plants.push(p);
  return p;
}

function enemyAt(s: SimState, px: number, py: number): EnemyEntity {
  const e: EnemyEntity = {
    id: 'enemy-9999', typeId: 'grunt', hp: 100, maxHp: 100, px, py, pathIndex: 0, pathProgress: 0,
    damage: 1, reward: 5, scoreValue: 10, slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: null,
  };
  s.enemies.push(e);
  return e;
}

interface FiredProjectile {
  speed: number; remainingPierce: number; critChance: number; critMult: number; effectIds: string[];
}

const PROJ = (root: ReturnType<typeof makeRoot>) =>
  (root as unknown as {
    projectiles: {
      fire: (s: SimState, p: PlantEntity, t: EnemyEntity, dmg: number, profile: ReturnType<typeof ballisticsOf>, effects: string[]) => FiredProjectile;
      update: (s: SimState) => void;
    };
  }).projectiles;

/** Bis zu `ticks` Simulationsschritte, bis der Schuss trifft (Projektil fliegt 0.15/Tick). */
function flyUntilHit(root: ReturnType<typeof makeRoot>, s: SimState, ticks = 8): void {
  for (let i = 0; i < ticks; i++) PROJ(root).update(s);
}

describe('Ballistik-Verdrahtung — Genom bis Treffer', () => {
  beforeEach(() => resetIds());

  it('`deriveBredEntry` legt das Profil aus dem Genom an — der Zucht-Eintrag trägt es', () => {
    const entry = deriveBredEntry(variant([
      { id: 'swift', power: 1, dominant: true },
      { id: 'pierce', power: 0.7, dominant: true },
    ]));
    expect(entry.ballistics?.speed).toBeCloseTo(0.27, 6);
    expect(entry.ballistics?.pierce).toBe(4);
    expect(entry.effects).toContain('EFFECT_PIERCE');
  });

  it('`getPlantStats` liest das gespeicherte Profil (keine zweite Ableitung im Run)', () => {
    const entry = deriveBredEntry(variant([{ id: 'swift', power: 0.5, dominant: true }]));
    const stats = getPlantStats('cross_test', { cross_test: entry });
    expect(stats?.ballistics.speed).toBeCloseTo(0.21, 6);
  });

  it('der Schuss übernimmt Geschwindigkeit, Durchschlag und Krit aus dem Profil', () => {
    const root = makeRoot({ seed: SEED });
    const s = root.getSnapshot();
    const stats = getPlantStats('sprout', undefined)!;
    const p = PROJ(root).fire(s, plantAt(s, 2, 2, 'sprout'), enemyAt(s, 3, 2), 10, stats.ballistics, stats.effects);

    expect(p.speed).toBe(stats.ballistics.speed);
    expect(p.remainingPierce).toBe(stats.ballistics.pierce);
    expect(p.critMult).toBe(2);
    expect(p.effectIds).toEqual(stats.effects.slice(0, 2));
  });

  it('Krit-Vielfaches ist verdrahtet: Chance 1 ⇒ Treffer verdoppelt', () => {
    const root = makeRoot({ seed: SEED });
    const s = root.getSnapshot();
    const e = enemyAt(s, 3, 2);
    PROJ(root).fire(
      s, plantAt(s, 2, 2, 'sprout'), e, 10,
      { speed: 0.15, pierce: 0, critChance: 1, critMult: 2 }, [],
    );
    flyUntilHit(root, s);
    expect(e.hp).toBe(80); // 10 × 2 — das Vielfache kommt aus dem Profil, nicht aus 0.2/2 im Code
  });

  it('der ZWEITE Effekt eines Schusses wirkt (vorher toter Content)', () => {
    const root = makeRoot({ seed: SEED });
    const s = root.getSnapshot();
    s.clock.tick = 50;
    const e = enemyAt(s, 3, 2);
    PROJ(root).fire(
      s, plantAt(s, 2, 2, 'sprout'), e, 10,
      { speed: 0.15, pierce: 0, critChance: 0, critMult: 2 },
      ['EFFECT_PIERCE', 'EFFECT_BURN'],
    );
    flyUntilHit(root, s);

    expect(e.hp).toBe(90);                       // Schaden genau EINMAL, nicht je Effekt
    expect(e.burnTicks).toBe(3);                 // Wirkdauer aus `effects.source` (Content)
    expect(e.poisonTicks).toBe(0);               // kein erfundener Zweiteffekt
  });

  it('auch mit drei Effekten im State reisen nur `EFFECT_SLOTS` mit', () => {
    const root = makeRoot({ seed: SEED });
    const s = root.getSnapshot();
    const p = PROJ(root).fire(
      s, plantAt(s, 2, 2, 'sprout'), enemyAt(s, 3, 2), 10,
      { speed: 0.15, pierce: 0, critChance: 0, critMult: 2 },
      ['EFFECT_PIERCE', 'EFFECT_BURN', 'EFFECT_SLOW'],
    );
    expect(p.effectIds).toHaveLength(2);
  });
});
