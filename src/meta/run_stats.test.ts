// Befund 20.09.2026 („Ich kann keine Pflanze auf freie Plätze platzieren"): die Tray zeigt einen
// Samen als ×1, jede Zelle wird aber abgelehnt. Ursache: die Sim löst Stats über
// `getPlantStats(variantId, bredStats)` auf — Altsaves tragen für ihren Bestand keinen Eintrag,
// also ist die Variante im Run unbekannt (`plantStatsAt` → null → UI `unknown`, Sim `no_inventory`).
//
// Dieser Test pinnt den Vertrag: `deriveRunStats` heilt die Map aus dem Genom (DIESELBE Ableitung
// wie bei der Registrierung) und lässt vorhandene Einträge unangetastet.
import { describe, it, expect, beforeEach } from 'vitest';
import type { PlantVariant } from '../types';
import { deriveBredEntry } from './store';
import { deriveRunStats } from './run';
import { getPlantStats, plantStatsAt } from '../simulation/plantSystem';
import type { SimState } from '../simulation/state';
import { makeRoot } from '../testing/testkit';
import { makeCommand } from '../bus/commands';
import { resetIds } from '../core/ids';

/** Ein Samen aus einem Bestandssave (vor B1): Variante existiert, bredStats-Eintrag fehlt. */
const collection: PlantVariant[] = [
  {
    id: 'seed_5', name: 'Spross (Keim 6)', type: 'shooter',
    genome: [{ id: 'rapid', power: 0.5, dominant: true }, { id: 'pierce', power: 0.3, dominant: true }],
    traits: ['rapid', 'pierce'], cost: 50,
    stats: { hp: 100, damage: 15, range: 3, cooldown: 30, special: null },
    color: '#4ade80', discovered: true, sourceId: 'sprout',
  },
  {
    id: 'seed_7', name: 'Wurzelmauer (Keim 8)', type: 'wall',
    genome: [{ id: 'shield', power: 0.7, dominant: true }, { id: 'thorns', power: 0.4, dominant: true }],
    traits: ['shield', 'thorns'], cost: 40,
    stats: { hp: 300, damage: 5, range: 0.5, cooldown: 60, special: 'reflect' },
    color: '#a3734a', discovered: true, sourceId: 'rootwall',
  },
];

/** Minimalzustand: nur die Felder, die die Stats-Auflösung liest. */
const stateWith = (bredStats: SimState['bredStats']): SimState =>
  ({ bredStats, mapTiles: {} } as unknown as SimState);

describe('Run-Stats heilen die Sammlung (Bestandssave ohne bredStats-Eintrag)', () => {
  it('die LÜCKE: Bestandssave-Samen ohne Eintrag ist im Run nicht auflösbar', () => {
    expect(getPlantStats('seed_5', {})).toBeNull();
    expect(plantStatsAt(stateWith({}), 'seed_5', 2, 2)).toBeNull();
  });

  it('deriveRunStats macht JEDE Loadout-Variante auflösbar (nicht nur die erste)', () => {
    const stats = deriveRunStats(collection, {});
    for (const variant of collection) {
      const resolved = getPlantStats(variant.id, stats);
      expect(resolved, `Variante ${variant.id} ist nicht auflösbar`).not.toBeNull();
      expect(resolved!.hp, variant.id).toBe(variant.stats.hp);
      expect(resolved!.damage, variant.id).toBe(variant.stats.damage);
      expect(resolved!.range, variant.id).toBe(variant.stats.range);
      expect(resolved!.cooldown, variant.id).toBe(variant.stats.cooldown);
      expect(resolved!.cost, variant.id).toBe(variant.cost);
      expect(plantStatsAt(stateWith(stats), variant.id, 2, 2), variant.id).not.toBeNull();
    }
  });

  it('vorhandene Einträge bleiben bitgleich (kein Balance-Drift für Bestandssaves)', () => {
    const existing = { seed_5: { ...deriveBredEntry(collection[0]!), hp: 123 } };
    const stats = deriveRunStats(collection, existing);
    expect(stats.seed_5!.hp).toBe(123);
    expect(stats.seed_7!.hp).toBe(300);
  });

  it('deterministisch: zweimal abgeleitet ergibt denselben Eintrag', () => {
    expect(deriveRunStats(collection, {})).toEqual(deriveRunStats(collection, {}));
  });

  it('die Ableitung stammt aus dem Genom (dieselbe Quelle wie die Registrierung)', () => {
    expect(deriveRunStats(collection, {}).seed_5).toEqual(deriveBredEntry(collection[0]!));
  });
});

/** Der Nutzerfall als Sim-Vertrag: PLACE_PLANT auf eine freie Zelle. */
describe('Platzierung eines Bestandssave-Samens im Run (der gemeldete Fall)', () => {
  beforeEach(() => resetIds());

  const rootWith = (bredStats: SimState['bredStats']) => makeRoot({
    seed: 2447771834, runId: 1,
    loadout: ['seed_5'], loadoutStock: 1,
    bredStats,
  });

  const place = (root: ReturnType<typeof rootWith>) => {
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'seed_5', gx: 2, gy: 2 }));
    root.stepOnce();
    return root.getSnapshot();
  };

  it('ohne Eintrag lehnt die Sim ab — und der Bestand bleibt liegen (die Lücke)', () => {
    const snap = place(rootWith({}));
    expect(snap.plants).toHaveLength(0);
    expect(snap.inventory.seed_5).toBe(1);
  });

  it('mit geheilter Map steht die Pflanze auf der freien Zelle und der Bestand sinkt', () => {
    const snap = place(rootWith(deriveRunStats(collection, {})));
    expect(snap.plants.filter(p => p.gx === 2 && p.gy === 2)).toHaveLength(1);
    expect(snap.inventory.seed_5).toBe(0);
  });
});
