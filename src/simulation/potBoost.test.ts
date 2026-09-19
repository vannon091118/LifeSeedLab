import { describe, it, expect } from 'vitest';
import { potColorAt, potBoostAt, applyPotBoost } from './potBoost';
import { POT_COLORS, POT_BOOSTS } from '../config/pot.source';
import { plantStatsAt, resolvePlantStats } from './plantSystem';
import { makeRoot } from '../testing/testkit';

const SEED = 2447771834; // Run-Seed der Maze-Datensätze (gleiche Bühne wie dort).

// BLUMENTOPF-BOOSTER (Entscheidung 19.09.2026): Farbe ⇒ Wirkung, Farbe hängt an der ZELLE.
// Jeder Test hier ist ein Vertrag, kein Smoke-Test — er muss bei einem Rückbau rot werden.

describe('Blumentopf — Farbe ist Zell-Wahrheit (deterministisch, ohne Zustand)', () => {
  it('dieselbe Zelle ⇒ dieselbe Farbe; die Fläche nutzt ALLE vier Farben', () => {
    const seen = new Set<string>();
    for (let gx = 0; gx < 12; gx++) {
      for (let gy = 0; gy < 12; gy++) {
        const again = potColorAt(gx, gy);
        expect(potColorAt(gx, gy)).toBe(again); // keine Streuung, keine Uhr
        expect(POT_COLORS).toContain(again);
        seen.add(again);
      }
    }
    // Alle vier Wirkungen sind auf der Startfläche erreichbar — eine Farbe, die nie vorkommt,
    // wäre eine tote Wirkung.
    expect(seen.size).toBe(POT_COLORS.length);
  });

  it('die Farbe folgt der Zelle, nicht der Pflanze oder der Reihenfolge des Bauens', () => {
    // Zwei Nachbarzellen dürfen verschieden sein; die Werte hängen an (gx,gy) — und nur daran.
    const colors = [potColorAt(3, 4), potColorAt(3, 5), potColorAt(4, 4)];
    expect(new Set(colors).size).toBeGreaterThanOrEqual(2);
  });

  it('ohne Topf-Tile gibt es KEINE Wirkung (Wiese, Weg, Findling, Deko, leere Zelle)', () => {
    const scenes: Record<string, string>[] = [{}, { '2,3': 'path' }, { '2,3': 'boulder' }, { '2,3': 'decor' }];
    for (const tiles of scenes) {
      expect(potBoostAt(tiles, 2, 3)).toBeNull();
    }
    expect(potBoostAt({ '2,3': 'pot' }, 2, 3)).toBe(POT_BOOSTS[potColorAt(2, 3)]);
  });
});

describe('Blumentopf — Wirkung auf die Pflanze (Sim und Vorschau lesen dieselbe Quelle)', () => {
  it('jede Achse wird um ihren Faktor verschoben (Schaden/Reichweite/Nachladezeit/Leben)', () => {
    const base = { hp: 100, damage: 20, range: 3, cooldown: 30, special: null, effects: [], cost: 10 };
    const dmg = applyPotBoost(base, POT_BOOSTS.amber);
    expect(dmg.damage).toBe(20 * 1.2);
    expect(dmg.range).toBe(base.range); // genau EINE Achse, keine Nebenwirkung
    const fast = applyPotBoost(base, POT_BOOSTS.moss);
    expect(fast.cooldown).toBe(Math.round(30 * 0.8)); // kürzer = schneller feuern
    expect(fast.cooldown).toBeLessThan(base.cooldown);
    const tough = applyPotBoost(base, POT_BOOSTS.rust);
    expect(tough.hp).toBe(Math.round(100 * 1.3));
  });

  it('eine Pflanze auf dem Topf kämpft mit den verstärkten Stats — auf der Wiese mit den Basen', () => {
    const root = makeRoot({ seed: SEED, runId: 1, loadout: ['sprout'], loadoutStock: 1 });
    const state = root.getSnapshot();
    // Topf auf eine Zelle, die Pflanze kommt daneben — verglichen wird DIESELBE Sorte.
    state.mapTiles['4,4'] = 'pot';
    const base = resolvePlantStats(state, 'sprout');
    const potted = plantStatsAt(state, 'sprout', 4, 4);
    const plain = plantStatsAt(state, 'sprout', 5, 5);
    expect(base).not.toBeNull();
    expect(plain).toEqual(base); // ohne Topf: identisch zur Basis (kein stiller Bonus)
    if (!base || !potted) throw new Error('Stats fehlen');

    const boost = POT_BOOSTS[potColorAt(4, 4)];
    const expected = applyPotBoost(base, boost);
    expect(potted).toEqual(expected);
    expect(potted).not.toEqual(base); // die Wirkung ist MESSBAR, nicht kosmetisch
  });
});
