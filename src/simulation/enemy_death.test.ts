// Owner: Sim-Contract-Lock — „wer stirbt, meldet sich": JEDER Weg, der einen Gegner auf
// HP ≤ 0 bringt, emittiert genau EIN `ENEMY_DIED`.
//
// Warum diese Datei existiert (Befund 21.09.2026): der DoT-/Vektor-Pfad
// (`enemySystem.damageDirect`) zog HP ab und emittierte nur `DAMAGE_DEALT`;
// `statusSystem` filterte den toten Gegner danach weg. Gift, Brand, Kettenblitz und
// Vektor-Ticks töteten also LAUTLOS — ohne Score, Nektar, Kill-Zähler, Todes-FX und
// ohne die Belohnungsreise. Gemessen im Balance-Lauf (ein Leih-Spross, eigener Seed):
// 107 gestartete Gegner, 42 `ENEMY_DIED`, 63 stille Abgänge — der ganze DoT-Anteil
// fehlte in der Ökonomie. Ein Balance-Urteil auf diesen Zahlen wäre ein Urteil über
// ein Spiel, das nur die Hälfte seiner Kills bezahlt.
//
// Geprüft wird am Owner (`EnemySystem` + `StatusSystem`), nicht über den Root: der Defekt
// lebte genau in der Naht zwischen beiden, und ein Root-Lauf mit echtem Kill bräuchte
// Welle, Pflanze und Projektil-Treffer (langsam und indirekt).

import { describe, it, expect } from 'vitest';
import { EnemySystem } from './enemySystem';
import { statusDotOf } from './effectSupport';
import type { SimState } from './state';
import type { GameEvent } from '../bus/events';

/** Minimale SimState-Sicht: nur die Felder, die Spawn + Status-Ticks wirklich lesen. */
function minState(): SimState {
  return {
    seed: 12345,
    clock: { tick: 1 },
    wave: { number: 3, spawnQueue: [] },
    enemies: [],
    plants: [],
    vectors: {},
    currentRoute: [{ x: 0.5, y: 0.5 }, { x: 5.5, y: 0.5 }],
  } as unknown as SimState;
}

function setup(hp: number): { es: EnemySystem; state: SimState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const es = new EnemySystem(e => events.push(e));
  const state = minState();
  const e = es.spawn(state, 'grunt', 0)!;
  e.hp = hp;
  return { es, state, events };
}

const tote = (events: GameEvent[]): GameEvent[] => events.filter(x => x.type === 'ENEMY_DIED');
const schaeden = (events: GameEvent[]): GameEvent[] => events.filter(x => x.type === 'DAMAGE_DEALT');

describe('Gegner-Tod ist gemeldet (DoT-, Vektor- und Ketten-Pfad)', () => {
  it('tödlicher Gift-Tick: genau ein ENEMY_DIED, mit Belohnung und Sterbeort', () => {
    const { es, state, events } = setup(statusDotOf('poison'));
    const id = state.enemies[0].id;
    es.status.setStatusOf(state, state.enemies[0], 'EFFECT_POISON');

    es.applyStatusTicks(state);

    expect(state.enemies, 'getroffener Gegner ist weg').toHaveLength(0);
    expect(schaeden(events), 'der Schaden selbst kam an').toHaveLength(1);
    expect(tote(events), 'der Tod darf nicht still sein').toHaveLength(1);
    // Der Event-Typ trägt seine Payload-Union; hier ist die Sicht des Todes gefragt.
    const t = tote(events)[0] as unknown as {
      payload: { enemyId: string; reward: number; px: number; py: number };
    };
    expect(t.payload.enemyId).toBe(id);
    expect(t.payload.reward).toBeGreaterThan(0);
    expect(t.payload.px).toBe(0.5); // Ursprung = Sterbeort, nicht erfunden
    expect(t.payload.py).toBe(0.5);
  });

  it('tödlicher Brand-Tick: derselbe Weg, derselbe Beleg', () => {
    const { es, state, events } = setup(statusDotOf('burn'));
    es.status.setStatusOf(state, state.enemies[0], 'EFFECT_BURN');

    es.applyStatusTicks(state);

    expect(state.enemies).toHaveLength(0);
    expect(tote(events)).toHaveLength(1);
  });

  it('tödlicher Vektor-Tick (Tox unter den Füßen): auch dort gemeldet', () => {
    const { es, state, events } = setup(1);
    state.vectors['0,0'] = [{ vectorId: 'VECTOR_TOX', intensity: 1, ttl: 10 }];

    es.applyStatusTicks(state);

    expect(state.enemies).toHaveLength(0);
    expect(tote(events)).toHaveLength(1);
  });

  it('Brand UND Gift im selben Tick tödlich: der Gegner stirbt EINMAL', () => {
    const { es, state, events } = setup(statusDotOf('burn') + statusDotOf('poison'));
    es.status.setStatusOf(state, state.enemies[0], 'EFFECT_BURN');
    es.status.setStatusOf(state, state.enemies[0], 'EFFECT_POISON');

    es.applyStatusTicks(state);

    expect(state.enemies).toHaveLength(0);
    expect(tote(events), 'doppelter Tod wäre doppelte Belohnung').toHaveLength(1);
  });

  it('negative Kontrolle: nicht tödlicher Tick meldet keinen Tod', () => {
    const { es, state, events } = setup(statusDotOf('poison') + 50);
    es.status.setStatusOf(state, state.enemies[0], 'EFFECT_POISON');

    es.applyStatusTicks(state);

    expect(state.enemies, 'der Gegner lebt noch').toHaveLength(1);
    expect(schaeden(events)).toHaveLength(1);
    expect(tote(events)).toHaveLength(0);
  });
});
