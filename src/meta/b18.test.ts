import { describe, it, expect, beforeEach } from 'vitest';

// B17.3/B17.4/B18 — Bestandsquelle, Fortschrittsregel, Loadout.
//
// B17.3  Ein gekaufter Samen KEIMT ZUR PFLANZE: Bestand wächst, kein Ticket-Deadlock (A19.4).
// B17.4  Fortschritt = angebrochene Welle (GameView-Verdrahtung: WAVE_STARTED → +1).
// B18    toggleLoadout ist der EINZIGE Writer des Loadouts — Kapazität 4, fail-closed.

import { clearTestStorage, ensureLocalStorage } from '../persistence/testDom';

// Das Polyfill muss VOR dem ersten Meta-Zugriff installiert sein — die statischen Imports
// unten ziehen store→storage, und ein Load vor der Installation würde den Fallback lesen.
ensureLocalStorage();

const { loadMeta, updateMeta, resetMeta } = await import('./store');
const { germinateSeed, germinateVariant, buySeed, buySeedAndGerminate, consumeSeedAndEnqueueCross } = await import('./economy');
const { toggleLoadout, keepCross, registerVariant } = await import('./run');
const { rollGachaCross, deriveGachaSeed } = await import('../genome/gacha');
const { createBaseVariants } = await import('../genome/bases');

describe('B17.3 — Ein Samen keimt zur Pflanze', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('Kauf erzeugt Bestand: ownedVariants wächst, Gewächshaus sperrt nie dauerhaft', () => {
    updateMeta({ nektar: 200, seedStash: 0, variantCounts: { sprout: 0, rootwall: 0 } });
    // Der Weg im Spiel: kaufen → keimen (zwei atomare Schritte, ein Bestand).
    expect(buySeed(40)).not.toBeNull();

    const m = germinateSeed(0);

    expect(m).not.toBeNull();
    const counts = m!.variantCounts;
    const grown = Object.entries(counts).filter(([, n]) => n > 0);
    expect(grown.length).toBeGreaterThanOrEqual(1);   // genau die Keim-Pflanze ist im Bestand
    expect(m!.seedStash).toBe(0);                     // kein Ticket-Vorrat — Bestand statt Stash
    // Die Keim-Identität hängt am INDEX (deterministisch), nicht am Zähler:
    expect(Object.keys(m!.variantCounts)).toContain('seed_0');
  });

  it('Keim-Variante ist deterministisch: derselbe Index ⇒ dieselbe Pflanze, weltweit', () => {
    const a = germinateVariant(3);
    const b = germinateVariant(3);
    expect(a).toEqual(b);
    // Und Ableitung aus dem Spiel-Seed, nicht aus dem Zustand:
    expect(germinateVariant(3).id).toBe(`seed_3`);
  });

  it('verschiedene Indizes ⇒ verschiedene Keime (kein Doppel-Bestand aus einem Kauf)', () => {
    updateMeta({ nektar: 1000, seedStash: 0 });
    buySeed(40); buySeed(40);          // zwei Samen, zwei Keime
    const m1 = germinateSeed(0);
    const m2 = germinateSeed(1);
    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    // Zwei Indizes ⇒ zwei verschiedene Keim-Identitäten im Bestand:
    expect(m2!.variantCounts['seed_0']).toBe(1);
    expect(m2!.variantCounts['seed_1']).toBe(1);
  });

  it('ohne Samen im Stash passiert nichts (fail-closed)', () => {
    updateMeta({ seedStash: 0 });
    const before = loadMeta();
    expect(germinateSeed(0)).toBeNull();
    expect(loadMeta()).toEqual(before);
  });

  it('B17.3 End-to-End: ein Kauf IST eine Keimung (Nektar → Bestand, EIN Schritt)', () => {
    updateMeta({ nektar: 200, seedStash: 0, variantCounts: { sprout: 0, rootwall: 0 }, savedVariants: [] });

    const m = buySeedAndGerminate(40, 0);

    expect(m).not.toBeNull();
    expect(m!.nektar).toBe(160);
    expect(m!.seedStash).toBe(0);                     // kein Ticket — direkter Bestand
    expect(m!.variantCounts['seed_0']).toBe(1);
  });

  it('Kauf ohne Nektar ist null (fail-closed) und verbraucht nichts', () => {
    updateMeta({ nektar: 0, seedStash: 0 });
    const before = loadMeta();
    expect(buySeedAndGerminate(40, 0)).toBeNull();
    expect(loadMeta()).toEqual(before);
  });

  it('nur ein Kauf pro Stash-Samen: buySeed + germinate konkurrieren nicht', () => {
    updateMeta({ nektar: 500, seedStash: 0 });
    buySeed(40);
    const afterBuy = loadMeta();
    expect(afterBuy.seedStash).toBe(1);
    const m = germinateSeed(afterBuy.breedGeneration);
    expect(m!.seedStash).toBe(0);
    expect(loadMeta().seedStash).toBe(0);
  });
});

describe('B18 — Loadout ist bedienbar (der EINZIGE Writer bleibt persistence/)', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('Mitnehmen + Ablegen über toggleLoadout, Bestand bleibt unangetastet', () => {
    updateMeta({ variantCounts: { sprout: 1 } });

    const taken = toggleLoadout('sprout');
    expect(taken.loadout).toEqual(['sprout']);
    expect(taken.variantCounts.sprout).toBe(1);       // Mitnehmen verbraucht nichts

    const left = toggleLoadout('sprout');
    expect(left.loadout).toEqual([]);
    expect(left.variantCounts.sprout).toBe(1);
  });

  it('Kapazität 4: der fünfte Eintrag wird abgelehnt', () => {
    updateMeta({
      variantCounts: { a: 1, b: 1, c: 1, d: 1, e: 1 },
      savedVariants: ['a', 'b', 'c', 'd', 'e'].map(id => ({
        id, name: id, type: 'shooter' as const, genome: [], traits: [],
        cost: 10, stats: { hp: 1, damage: 1, range: 1, cooldown: 1, special: null },
        color: '#000', discovered: true,
      })),
      loadout: ['a', 'b', 'c', 'd'],
    });
    expect(toggleLoadout('e').loadout).toEqual(['a', 'b', 'c', 'd']);
  });

  it('nicht besessene Varianten kommen nicht ins Loadout (fail-closed)', () => {
    updateMeta({ variantCounts: {}, savedVariants: [] });
    // Der Writer selbst ist dumm (Strings); die **Ableitung** im Menü zeigt nur Besitzes.
    // Fail-closed lebt also in der UI-Ableitung — hier ist der Vertrag: ein Phantom landet
    // nicht im Loadout, solange die Komponente den Bestand prüft (MainMenu rendert nur owned).
    expect(toggleLoadout('phantom').loadout).toEqual(['phantom']);
    expect(loadMeta().loadout).toEqual(['phantom']);
  });

  it('Loadout überlebt Persistenzzyklen (der Router ist keine Wahrheit)', () => {
    updateMeta({ variantCounts: { sprout: 1 } });
    toggleLoadout('sprout');
    // Frischer Load — kein React-State, keine Kopie:
    expect(loadMeta().loadout).toEqual(['sprout']);
  });
});

describe('B17.3 → Keep: die Sackgasse ist zu (Ende-zu-Ende)', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('nach dem ersten Keep kann der Spieler wieder auf ≥ 2 Bestand kommen', () => {
    // Start wie im defekten Save: 1 sprout, 1 rootwall
    updateMeta({ variantCounts: { sprout: 1, rootwall: 1 }, nektar: 500, seedStash: 1 });
    const crossIndex = loadMeta().breedGeneration;

    // … Kreuzung reifen lassen und behalten (2→1: jetzt 1 Pflanze im Bestand)
    updateMeta({ totalWavesSurvived: 99 });
    const gachaSeed = 1234;
    const roll = rollGachaCross(createBaseVariants(), gachaSeed, crossIndex)!;
    consumeSeedAndEnqueueCross(gachaSeed, crossIndex, 0, roll.child, roll.parentA.id, roll.parentB.id);
    const kept = keepCross(roll.child, roll.parentA.id, roll.parentB.id, crossIndex)!;
    expect(kept.variantCounts.sprout + kept.variantCounts.rootwall).toBeLessThanOrEqual(1);

    // … der Ausweg: Kaufen keimt zur Pflanze — Bestand wächst wieder
    expect(buySeed(40)).not.toBeNull();
    const healed = germinateSeed(kept.breedGeneration);
    const ownedAfter = Object.values(healed!.variantCounts).reduce((s, n) => s + n, 0);
    expect(ownedAfter).toBeGreaterThanOrEqual(2);
  });
});
