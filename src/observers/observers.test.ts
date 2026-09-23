import { describe, it, expect } from 'vitest';
import { VisualObserver } from './visualObserver';
import { ParticlePool } from './particles';
import { Camera } from '../render/camera';
import { makeEvent } from '../bus/events';
import { makeCommand } from '../simulation/root';
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

  it('P-28: der Mündungspuff startet am ABSCHUSSORT in der Effektfarbe (B5-Vertrag erfüllt)', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(6, 'PROJECTILE_FIRED', 'proj-0001', 1, {
      projectileId: 'proj-0001', plantId: 'plant-0001', targetId: 'enemy-0001', damage: 10,
      effectId: 'EFFECT_POISON', px: 2.5, py: 4.5,
    }));
    const cmds = obs.drain();
    const bursts = cmds.filter(c => c.type === 'SpawnParticleBurst') as Extract<typeof cmds[number], { type: 'SpawnParticleBurst' }>[];
    const puff = bursts.find(b => b.profile === 'muzzle_puff');
    expect(puff, 'der versprochene Puff fehlt weiterhin (P-28)').toBeDefined();
    expect(puff!.x).toBe(2.5);
    expect(puff!.y).toBe(4.5);
    // Dieselbe Farbquelle wie der spätere Einschlag (P-34): EFFECT_POISON → VECTOR_TOX → Source.
    expect(puff!.color).toBe('#a3e635');
  });

  it('P-34: der Einschlag trägt die EFFEKTFARBE (kein Papier mehr auf Papier)', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(7, 'DAMAGE_DEALT', 'enemy-0001', 1, {
      enemyId: 'enemy-0001', amount: 15, critical: false, hp: 30, px: 3.5, py: 3.5, effectId: 'EFFECT_POISON',
    }));
    const bursts = obs.drain().filter(c => c.type === 'SpawnParticleBurst') as Extract<ReturnType<typeof obs.drain>[number], { type: 'SpawnParticleBurst' }>[];
    expect(bursts.some(b => b.color === '#a3e635'), 'Einschlag blieb Papierfarbe').toBe(true);
    // Ohne Effekt (Grunt-Biss, DoT-Tick) bleibt der neutrale Papierstaub.
    obs.observe(makeEvent(8, 'DAMAGE_DEALT', 'enemy-0002', 2, {
      enemyId: 'enemy-0002', amount: 4, critical: false, hp: 36, px: 5.5, py: 5.5, effectId: null,
    }));
    const neutral = obs.drain().filter(c => c.type === 'SpawnParticleBurst') as Extract<ReturnType<typeof obs.drain>[number], { type: 'SpawnParticleBurst' }>[];
    expect(neutral.some(b => b.color === '#d9c9a3')).toBe(true);
  });

  it('P-27: PLANT_WITHERED trägt Ort + Optik im death-Command (der Ghost reist mit)', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(12, 'PLANT_WITHERED', 'plant-0003', 1, { plantId: 'plant-0003', variantId: 'sprout', gx: 4, gy: 4 }));
    const cmds = obs.drain();
    const death = cmds.find(c => c.type === 'PlayAnimation' && (c as { anim?: string }).anim === 'death') as
      Extract<typeof cmds[number], { type: 'PlayAnimation' }>;
    expect(death).toBeDefined();
    expect(death.x).toBe(4.5);
    expect(death.y).toBe(4.5);
    expect(death.variantId).toBe('sprout');
  });

  it('observer emits documented command types only', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(1, 'ENEMY_DIED', 'enemy-0001', 1, {
      enemyId: 'enemy-0001', px: 2, py: 3, reward: 10, killerPlantId: null,
    }));
    const cmds = obs.drain();
    expect(cmds.length).toBeGreaterThan(0);
    for (const c of cmds) {
      expect(['SpawnParticleBurst', 'SpawnFloatingNumber', 'PunchScale', 'CameraShake', 'ScreenFlash', 'ShowMangaText', 'PlayAnimation', 'SpawnRewardFlight', 'SpawnRewardArrival']).toContain(c.type);
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

/**
 * Zeichnet auf ein Aufnahme-Objekt statt auf Canvas: die EINZIGE Art, wie ein Test beweisen kann,
 * dass sich etwas BEWEGT (statt nur zu behaupten, ein Handler sei gelaufen).
 */
function arcRecorder(): { ctx: CanvasRenderingContext2D; arcs: Array<{ x: number; y: number; r: number; alpha: number }>; texts: string[] } {
  const arcs: Array<{ x: number; y: number; r: number; alpha: number }> = [];
  const texts: string[] = [];
  let alpha = 1;
  const ctx = {
    get globalAlpha() { return alpha; },
    set globalAlpha(v: number) { alpha = v; },
    beginPath() { /* noop */ },
    arc(x: number, y: number, r: number) { arcs.push({ x, y, r, alpha }); },
    fill() { /* noop */ },
    stroke() { /* noop */ },
    fillText(t: string) { texts.push(t); },
    strokeText(t: string) { texts.push(t); },
    fillStyle: '', strokeStyle: '', lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, arcs, texts };
}

describe('B5.1: Belohnungsreise — Quelle → Bewegung → Ziel → Ankunft', () => {
  const TO_SCREEN = (x: number, y: number) => ({ x: x * 10, y: y * 10 });

  it('die Reise startet am ECHTEN Kill-Ort — nicht in der Rastermitte', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(30, 'REWARD_GRANTED', 'system:score', 1, { reward: 12, grantedNektar: 2, sourceId: 'enemy-0001', px: 2, py: 8 }));
    const cmds = obs.drain();
    const flights = cmds.filter(c => c.type === 'SpawnRewardFlight') as Extract<typeof cmds[number], { type: 'SpawnRewardFlight' }>[];
    expect(flights).toHaveLength(1);
    expect(flights[0].x).toBe(2);
    expect(flights[0].y).toBe(8);
    // P-31: die ANGEZEIGTE Zahl am Kill-Ort ist die GEBUCHTE Menge, nie die Roh-Belohnung.
    const texts = cmds.filter(c => c.type === 'SpawnFloatingNumber') as Extract<typeof cmds[number], { type: 'SpawnFloatingNumber' }>[];
    expect(texts).toHaveLength(1);
    expect(texts[0].text).toBe('+2');
    // Der alte Burst in der Rastermitte (6/4) ist gestrichen: er war eine Behauptung über die
    // Welt, die niemand verifiziert hat.
    expect(cmds.filter(c => c.type === 'SpawnParticleBurst')).toHaveLength(0);
  });

  it('P-29: ohne Weltort (Wellen-Bonus) pulsiert die gebuchte Ankunft AM Zähler — kein Flug, kein erfundener Startpunkt', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(40, 'REWARD_GRANTED', 'system:wave:10', 1, { reward: 25, grantedNektar: 26, sourceId: 'wave-10', px: null, py: null }));
    const cmds = obs.drain();
    expect(cmds.filter(c => c.type === 'SpawnRewardFlight')).toHaveLength(0);
    const arrivals = cmds.filter(c => c.type === 'SpawnRewardArrival') as Extract<typeof cmds[number], { type: 'SpawnRewardArrival' }>[];
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].amount).toBe(26);
  });

  it('die Dots wandern zum Anker und die Ankunft pulsiert AM Zähler', () => {
    const obs = new VisualObserver(new Camera(), true);
    obs.observe(makeEvent(31, 'REWARD_GRANTED', 'system:score', 1, { reward: 12, grantedNektar: 2, sourceId: 'enemy-0001', px: 2, py: 8 }));
    const fb = new FeedbackLayer();
    for (const c of obs.drain()) fb.exec(c);

    const anchor = { x: 40, y: 20 };
    const head = () => { const rec = arcRecorder(); fb.drawFlights(rec.ctx, TO_SCREEN, anchor); return rec.arcs[0]; };
    const start = head();
    expect(start.x).toBe(20); expect(start.y).toBe(80);   // Quelle: der Kill-Ort

    for (let i = 0; i < 12; i++) fb.update();
    const mid = head();
    const dist = (p: { x: number; y: number }) => Math.sqrt((p.x - anchor.x) ** 2 + (p.y - anchor.y) ** 2);
    expect(dist(mid)).toBeLessThan(dist(start));          // sie kommt näher

    for (let i = 0; i < 10; i++) fb.update();              // Flug abgelaufen (22 Ticks)
    const rec = arcRecorder();
    fb.drawFlights(rec.ctx, TO_SCREEN, anchor);
    expect(rec.arcs).toHaveLength(1);                      // nur noch der Ankunfts-Puls
    expect(rec.arcs[0].x).toBe(anchor.x);
    expect(rec.arcs[0].y).toBe(anchor.y);
    expect(rec.arcs[0].r).toBeGreaterThan(8);              // und er expandiert an Ort und Stelle
  });

  it('der Kopf-Dot LANDET auf dem Anker (letzter Lebens-Tick = Ankunft, kein Abbruch bei 95 %)', () => {
    // Live gemessener Defekt (21.09.2026): mit `p = 1 - life/maxLife` brach der Kopf-Dot bei
    // 95,5 % der Bahn ab — 13 px vor dem Chip-Mittelpunkt, gemessen per Pixelprobe im Browser.
    const fb = new FeedbackLayer();
    fb.exec({ type: 'SpawnRewardFlight', x: 2, y: 8, color: '#d9a441' });
    const anchor = { x: 40, y: 20 };
    for (let i = 0; i < 21; i++) fb.update();   // letzter Lebens-Tick vor der Ankunft (FLIGHT_TICKS 22)
    const rec = arcRecorder();
    fb.drawFlights(rec.ctx, TO_SCREEN, anchor);
    expect(rec.arcs[0].x).toBe(anchor.x);        // exakt, nicht „nahe"
    expect(rec.arcs[0].y).toBe(anchor.y);
  });

  it('P-33: Verwerfen bucht die Ankunft — 10 Flüge in einem Frame, kein Flug endet still', () => {
    // Gemessener Defekt (21.09.2026): `flights.length > 8`warf den ÄLTESTEN Flug per shift() weg,
    // obwohl die Sim-Buchung längst passiert war — die Reise verschwand mitten in der Luft.
    // Die zwei Verworfenen kommen SOFORT an (ihre Reise ist ja auch vorbei), die acht geparkten
    // nach FLIGHT_TICKS — deshalb zählt die kumulierte Anchre-Ankunft über beide Draws.
    const fb = new FeedbackLayer();
    const anchor = { x: 40, y: 20 };
    const anchorRings = (rec: ReturnType<typeof arcRecorder>) => rec.arcs.filter(a => a.x === anchor.x && a.y === anchor.y).length;
    for (let i = 0; i < 10; i++) fb.exec({ type: 'SpawnRewardFlight', x: 1 + i * 0.1, y: 1, color: '#d9a441' });
    expect(fb.flightCount).toBe(8);              // Cap bleibt — nur die DARSTELLUNG kapppt
    fb.update();                                 // Verwerfungs-Ankünfte sind frisch (life 8)
    const early = arcRecorder();
    fb.drawFlights(early.ctx, TO_SCREEN, anchor);
    const earlyPops = anchorRings(early);
    expect(earlyPops).toBeGreaterThanOrEqual(2); // die zwei Verworfenen kamen sofort an
    for (let i = 0; i < 21; i++) fb.update();    // alle 8 Reisen laufen bis zur Ankunft
    const late = arcRecorder();
    fb.drawFlights(late.ctx, TO_SCREEN, anchor);
    // 2 Verwerfungs-Ankünfte + 8 natürliche Ankünfte = 10. Kein Betrag ging verloren.
    expect(earlyPops + anchorRings(late)).toBeGreaterThanOrEqual(10);
  });

  it('P-29: Buchung ohne Weltort erscheint AM Zähler (Puls + Betrag), nie in der Welt', () => {
    const fb = new FeedbackLayer();
    const anchor = { x: 40, y: 20 };
    fb.exec({ type: 'SpawnRewardArrival', amount: 26, color: '#d9a441' });
    const rec = arcRecorder();
    fb.drawFlights(rec.ctx, TO_SCREEN, anchor);
    const atAnchor = rec.arcs.filter(a => a.x === anchor.x && a.y === anchor.y);
    expect(atAnchor).toHaveLength(1);            // der Puls lebt AM Anker
    expect(rec.texts).toContain('+26');          // und trägt den GEBUCHTEN Betrag
  });

  it('ohne gemessenen Anker wird kein Flug gezeichnet (kein geratenes Ziel)', () => {
    const fb = new FeedbackLayer();
    fb.exec({ type: 'SpawnRewardFlight', x: 2, y: 8, color: '#d9a441' });
    const rec = arcRecorder();
    fb.drawFlights(rec.ctx, TO_SCREEN, null);
    expect(rec.arcs).toHaveLength(0);
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
