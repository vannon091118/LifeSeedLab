import { describe, it, expect } from 'vitest';
import { VisualObserver } from './visualObserver';
import { ParticlePool } from './particles';
import { Camera } from '../render/camera';
import { makeEvent } from '../bus/events';
import { SimulationRoot, makeCommand } from '../simulation/root';
import { makeRoot } from '../testing/testkit';
import { executeVisualCommand } from './visualExecutor';
import { FeedbackLayer } from '../render/layers/feedback';

describe('Phase 8: Visual Observer purity', () => {
  it('observer never mutates gameplay state (Test G light)', () => {
    const root = makeRoot({ seed: 583921 });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 1, gy: 2 }));
    root.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    for (let i = 0; i < 300; i++) root.stepOnce();

    const before = JSON.stringify(root.getSnapshot());
    // observing the same events must not touch the state
    const camera = new Camera();
    const obs = new VisualObserver(camera, true);
    for (const e of root.getEventLog()) obs.observe(e);
    obs.drain();
    const after = JSON.stringify(root.getSnapshot());
    expect(after).toBe(before);
  });

  it('FX on/off produces identical visual command structure except queue emptiness', () => {
    const camera = new Camera();
    const on = new VisualObserver(camera, true);
    const off = new VisualObserver(camera, false);
    const e = makeEvent(5, 'PLANT_PLACED', 'plant-0001', 1, {
      plantId: 'plant-0001', variantId: 'sprout', gx: 2, gy: 2,
    });
    on.observe(e);
    off.observe(e);
    expect(on.drain().length).toBeGreaterThan(0);
    expect(off.drain().length).toBe(0);
  });

  it('observer emits documented command types only', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(1, 'ENEMY_DIED', 'enemy-0001', 1, {
      enemyId: 'enemy-0001', px: 2, py: 3, reward: 10, killerPlantId: null,
    }));
    const cmds = obs.drain();
    expect(cmds.length).toBeGreaterThan(0);
    for (const c of cmds) {
      expect(['SpawnParticleBurst', 'SpawnFloatingNumber', 'PunchScale', 'CameraShake', 'ScreenFlash', 'ShowMangaText', 'PlayAnimation']).toContain(c.type);
    }
  });

  it('B4 lifecycle events produce FX (GROWN/PROPAGATED/WITHERED burst, WEAKENED/FERTILIZED punch)', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(10, 'PLANT_GROWN', 'plant-0001', 1, { plantId: 'plant-0001', variantId: 'sprout', gx: 2, gy: 3 }));
    obs.observe(makeEvent(11, 'PLANT_PROPAGATED', 'plant-0002', 1, { sourcePlantId: 'plant-0001', plantId: 'plant-0002', variantId: 'sprout', gx: 3, gy: 3 }));
    obs.observe(makeEvent(12, 'PLANT_WITHERED', 'plant-0003', 1, { plantId: 'plant-0003', variantId: 'sprout', gx: 4, gy: 4 }));
    obs.observe(makeEvent(13, 'PLANT_WEAKENED', 'plant-0004', 1, { plantId: 'plant-0004', variantId: 'sprout' }));
    obs.observe(makeEvent(14, 'PLANT_FERTILIZED', 'plant-0005', 1, { plantId: 'plant-0005', variantId: 'sprout', count: 1 }));
    const cmds = obs.drain();
    const bursts = cmds.filter(c => c.type === 'SpawnParticleBurst') as Extract<typeof cmds[number], { type: 'SpawnParticleBurst' }>[];
    const punches = cmds.filter(c => c.type === 'PunchScale') as Extract<typeof cmds[number], { type: 'PunchScale' }>[];
    const profiles = bursts.map(c => c.profile);
    expect(profiles).toContain('glow_rise');      // GROWN
    expect(profiles).toContain('ring_soft');      // PROPAGATED
    expect(profiles).toContain('wither_dust');    // WITHERED
    expect(punches.some(c => c.entityId === 'plant-0004' && c.strength < 0)).toBe(true);  // WEAKENED: sackt ein
    expect(punches.some(c => c.entityId === 'plant-0005' && c.strength > 0)).toBe(true);  // FERTILIZED: pulst
    // alle verwendeten Profile müssen existieren (A7-Grammatik)
    const pool = new ParticlePool();
    for (const p of profiles) {
      pool.burst(p, 0, 0, '#fff', 1);
      expect(pool.activeCount).toBeGreaterThan(0);
      pool.clear();
    }
  });
});

describe('Phase 11: Particle pool', () => {
  it('Executor reicht die Observer-Farbe unverändert an den ParticlePool weiter', () => {
    const pool = new ParticlePool();
    const command = {
      type: 'SpawnParticleBurst' as const,
      profile: 'dust_puff',
      x: 2,
      y: 3,
      seed: 123,
      intensity: 1,
      color: '#custom-effect',
    };
    executeVisualCommand(command, pool, new Camera(), new FeedbackLayer());

    const colors: string[] = [];
    pool.forEachActive(p => colors.push(p.color));
    expect(colors.length).toBeGreaterThan(0);
    expect(new Set(colors)).toEqual(new Set(['#custom-effect']));
  });

  it('same event seed = identical burst (Phase 11.3)', () => {
    const a = new ParticlePool();
    const b = new ParticlePool();
    a.burst('impact_ring', 3, 4, '#fff', 12345);
    b.burst('impact_ring', 3, 4, '#fff', 12345);
    const snap: unknown[] = [];
    a.forEachActive(p => snap.push(JSON.stringify(p)));
    const snap2: unknown[] = [];
    b.forEachActive(p => snap2.push(JSON.stringify(p)));
    expect(snap).toEqual(snap2);
  });

  it('budget cap is respected', () => {
    const pool = new ParticlePool();
    pool.setBudget('NORMAL');
    for (let i = 0; i < 20; i++) {
      pool.burst('death_pop', 0, 0, '#fff', i * 7919);
    }
    expect(pool.activeCount).toBeLessThanOrEqual(pool.cap);
  });

  it('particles update and expire', () => {
    const pool = new ParticlePool();
    pool.burst('dust_puff', 0, 0, '#fff', 42);
    const initial = pool.activeCount;
    expect(initial).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) pool.update();
    expect(pool.activeCount).toBe(0);
  });
});
