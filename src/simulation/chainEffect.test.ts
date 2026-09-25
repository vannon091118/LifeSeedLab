import { describe, it, expect, beforeEach } from 'vitest';
import { makeRoot } from '../testing/testkit';
import { chainAftermath } from './killReactor';
import { resetIds } from '../core/ids';
import { makeEvent } from '../bus/events';
import type { EnemyEntity, PlantEntity } from './state';

const SEED = 771123;

/** Geklonter Kreuz-Ketten-Treiber: 100 HP, 80 Schaden, EFFECT_CHAIN als Content-Wahrheit. */
const CROSS_CHAIN = {
  hp: 100, damage: 80, range: 5, cooldown: 10, cost: 30, effects: ['EFFECT_CHAIN'],
};

function chainRoot() {
  return makeRoot({ seed: SEED, loadout: ['cross_chain'], bredStats: { cross_chain: CROSS_CHAIN } });
}

function plant(id: string): PlantEntity {
  return {
    id, variantId: 'cross_chain', gx: 2, gy: 2, hp: 100, maxHp: 100, lastShot: 0,
    growthState: 'mature', growthTicksLeft: 0, growthTicksTotal: 90, lifeTicksLeft: 900, lifeTicksTotal: 900,
    fertilizeCount: 0, extraDamage: 0, extraCooldown: 0, isWeakened: false, isSeedling: false,
  } as PlantEntity;
}

function enemy(id: string, typeId: string, hp: number, px: number, py: number, hitBy: string | null): EnemyEntity {
  return {
    id, typeId, hp, maxHp: hp, px, py, pathIndex: 0, pathProgress: 0,
    damage: 1, reward: 5, scoreValue: 10, slowUntil: 0, burnTicks: 0, poisonTicks: 0, lastHitByPlantId: hitBy,
  } as EnemyEntity;
}

/** Die zwei Schreibpfade des EnemySystem, die der Ketten-Reactor braucht. */
function systemsOf(root: ReturnType<typeof chainRoot>) {
  return (root as unknown as {
    enemies: {
      applyDamage: (s: unknown, id: string, amt: number, crit: boolean, eff: string | null, src: string | null) => void;
      chainFrom: (s: unknown, x: number, y: number, amt: number, range: number) => void;
    };
  }).enemies;
}

describe('EFFECT_CHAIN — der Nachbrand spiegelt seinen Auslöser', () => {
  beforeEach(() => resetIds());

  it('Kill springt zum nächsten Gegner in Reichweite', () => {
    const root = chainRoot();
    const s = root.getSnapshot();
    s.plants.push(plant('plant-0001'));
    const e1 = enemy('enemy-0001', 'grunt', 10, 3, 3, 'plant-0001');
    const e2 = enemy('enemy-0002', 'grunt', 100, 3.5, 3.2, null);
    s.enemies.push(e1, e2);

    systemsOf(root).applyDamage(s, e1.id, 20, false, null, 'plant-0001');
    const hpBefore = e2.hp;
    // 20 × 0,5 = 10. Vorher stand hier der feste Betrag 50 — das war der Fünffache des Auslösers.
    systemsOf(root).chainFrom(s, e1.px, e1.py, 10, 2);
    expect(hpBefore - e2.hp).toBe(10);
  });

  it('skaliert mit dem auslösenden Schaden (B6: "50 % damage", nicht "50")', () => {
    // Der Contract (docs/quality/contracts/simulation.md, B6) sagt „50 % damage". Gegen einen Boss
    // (800 HP) war der feste Betrag ein Getropse, gegen Schwarm (15 HP) stärker als der Auslöser.
    const chainArcDamage = (trigger: number): number => {
      const root = chainRoot();
      const s = root.getSnapshot();
      s.plants.push(plant('plant-0001'));
      s.enemies.push(enemy('enemy-0001', 'grunt', 10, 3, 3, 'plant-0001'));
      const target = enemy('enemy-0002', 'boss', 800, 3.5, 3.2, null);
      s.enemies.push(target);
      const systems = systemsOf(root);
      systems.applyDamage(s, 'enemy-0001', trigger, false, null, 'plant-0001');
      // Der Reactor liest den Anteil aus der Content-Wahrheit und rechnet selbst — deshalb der Weg
      // ÜBER `chainAftermath`, nicht ein handgesetzter Betrag.
      chainAftermath(s, [makeEvent(0, 'ENEMY_DIED', 'enemy-0001', 1, {
        enemyId: 'enemy-0001', px: 3, py: 3, reward: 5, killerPlantId: 'plant-0001', damage: trigger,
      })], systems);
      return 800 - target.hp;
    };

    expect(chainArcDamage(400)).toBe(200);
    expect(chainArcDamage(100)).toBe(50);
    expect(chainArcDamage(40)).toBe(20);
    // Der flache Altwert hätte für ALLE drei denselben Betrag geliefert (50).
    expect(chainArcDamage(400)).toBeGreaterThan(chainArcDamage(40) * 2);
  });
});
