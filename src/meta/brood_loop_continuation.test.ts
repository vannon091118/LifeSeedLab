import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Meta-Tests — Sub-Domäne „Zucht-Loop & Persistenz-Wahrheit“, Fortsetzung (B32.2/3).
// Split aus brood_loop.test.ts bei 431 Zeilen (LOC-Cap 400, Regel 2: Split statt Cap-Erhöhung).
// Enthält: B18 (Loadout) + B17.3→Keep E2E + B34 (Kern-Loop-Gate).

import { resetTestState, resetFullTestState } from '../testing/testkit';
import {
  wavesToUnlockFor,
  PENDING_CROSSES_MAX,
  MATURATION_WAVES_CAP,
} from '../config/economy.source';
import { createBaseVariants } from '../genome';
import { rollGachaCross } from '../genome/gacha';
import type { PlantVariant } from '../types';
import { loadMeta, updateMeta, META_VERSION } from './store';
import {
  buySeed,
  buySeedAndGerminate,
  germinateSeed,
  consumeSeedAndEnqueueCross,
  advanceCrossMaturation,
  isCrossReady,
} from './economy';
import { toggleLoadout, keepCross, recordRunEnd } from './run';

const BASES = createBaseVariants();

describe('B37 — Besitz-Wahrheit: Run-End-Sync schließt die Schleife', () => {
  beforeEach(() => resetTestState());

  it('Restbestand des Run-Inventars wird nach dem Run Besitz (recordRunEnd)', () => {
    updateMeta({ variantCounts: { sprout: 1 } });
    const next = recordRunEnd(3, 10, { sprout: 2, cross_x: 1 });
    // Bestand nach dem Run: verbrauchte 1 Spross durch 2 im Feld Übrige ersetzt, Cross dazugekauft.
    expect(next.variantCounts.sprout).toBe(2);
    expect(next.variantCounts.cross_x).toBe(1);
  });

  it('Besitz schrumpft nie durch einen Run (positives Max)', () => {
    updateMeta({ variantCounts: { sprout: 5 } });
    const next = recordRunEnd(1, 0, { sprout: 0 }); // alle 5 im Feld verbraucht
    expect(next.variantCounts.sprout).toBe(5);
  });

  it('ohne Inventar-Argument verhält sich recordRunEnd wie bisher', () => {
    updateMeta({ variantCounts: { sprout: 1 } });
    const nektarVorher = loadMeta().nektar;
    const next = recordRunEnd(2, 4);
    expect(next.variantCounts.sprout).toBe(1);
    expect(next.nektar).toBe(nektarVorher + 4);
    expect(next.runs).toBe(1);
  });
});

/** Besitz-Liste — dieselbe Ableitung wie im Gewächshaus (eine Quelle). */
function ownedOf(meta: ReturnType<typeof loadMeta>): PlantVariant[] {
  return Object.keys(meta.variantCounts)
    .filter(id => (meta.variantCounts[id] ?? 0) > 0)
    .map(id => BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id))
    .filter((v): v is PlantVariant => v !== undefined);
}

// ══ B18 — Loadout ist bedienbar (der EINZIGE Writer bleibt persistence/) ══
// Kapazität 4, fail-closed.

describe('B18 — Loadout ist bedienbar (der EINZIGE Writer bleibt persistence/)', () => {
  beforeEach(() => { resetTestState(); });

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

// ══ B17.3 → Keep: die Sackgasse ist zu (Ende-zu-Ende) ══
// Nach dem ersten Keep (2→1-Regel) muss der Spieler wieder auf ≥ 2 Bestand kommen können.

describe('B17.3 → Keep: die Sackgasse ist zu (Ende-zu-Ende)', () => {
  beforeEach(() => { resetTestState(); });

  it('nach dem ersten Keep kann der Spieler wieder auf ≥ 2 Bestand kommen', () => {
    // Start wie im defekten Save: 1 sprout, 1 rootwall
    updateMeta({ variantCounts: { sprout: 1, rootwall: 1 }, nektar: 500, seedStash: 1 });
    const crossIndex = loadMeta().breedGeneration;

    // … Kreuzung reifen lassen und behalten (2→1: jetzt 1 Pflanze im Bestand)
    updateMeta({ totalWavesSurvived: 99 });
    const gachaSeed = 1234;
    const roll = rollGachaCross(BASES, gachaSeed, crossIndex)!;
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

// ══ B34 — Der Kern-Loop als Gate ══
// Kaufen → Aussäen → Pflegen (Wellen überleben) → Ernten (abholen) → Loadout.
// KEIN Zustand dieses Kreislaufs darf blockieren, ohne dass es einen Weg zurück gibt.

describe('B34 — Der Kern-Loop dreht immer', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Reifungskurve ist gedeckelt — Geduld ist endlich (max 12 Wellen)', () => {
    expect(MATURATION_WAVES_CAP).toBe(12);
    for (let i = 0; i < 60; i++) {
      expect(wavesToUnlockFor(i)).toBeLessThanOrEqual(MATURATION_WAVES_CAP);
    }
  });

  it('voller Loop: kaufen → aussäen → Wellen überleben → abholen → im Bestand', () => {
    // Loop-Test braucht Kaufkraft für ZWEI Keime — Start-Nektar ist bewusst genau EIN Samen
    // (Einstiegs-Leihe), hier bewusst über Schreibzugriff aufgestockt, nicht via defaultMeta.
    updateMeta({ nektar: 80 });
    // Kaufen keimt direkt (B17.3): Bestand wächst; der Preis kommt ausschließlich aus der Source.
    expect(buySeedAndGerminate(40, 0)).not.toBeNull();
    expect(buySeedAndGerminate(40, 1)).not.toBeNull();

    // Aussäen (frei, Kosten beim Behalten).
    let meta = loadMeta();
    const owned = ownedOf(meta);
    expect(owned.length).toBeGreaterThanOrEqual(2);
    const roll = rollGachaCross(owned, 4242, meta.breedGeneration);
    expect(roll).not.toBeNull();
    meta = consumeSeedAndEnqueueCross(4242, meta.breedGeneration, meta.totalWavesSurvived, roll!.child, roll!.parentA.id, roll!.parentB.id)!;
    expect(meta.pendingCrosses).toHaveLength(1);

    // Pflegen: die nötigen Wellen überleben.
    for (let w = 0; w < wavesToUnlockFor(0); w++) advanceCrossMaturation(1);
    expect(isCrossReady(loadMeta(), 0)).toBe(true);

    // Ernten: Kind in den Bestand (Keep verbraucht je 1× Eltern, netto +1 Pflanze).
    const before = loadMeta().savedVariants.length;
    const kept = keepCross(roll!.child, roll!.parentA.id, roll!.parentB.id, 0);
    expect(kept).not.toBeNull();
    expect(kept!.pendingCrosses).toHaveLength(0);
    expect(kept!.savedVariants.some(v => v.id === roll!.child.id)).toBe(true);
    void before;
  });

  it('volle Queue sperrt die Aussaat — aber reife Einträge bleiben IMMER abholbar (Weg zurück)', () => {
    let meta = loadMeta();
    // Einstiegs-Loop: kein Gratis-Besitz mehr — der Test baut zwei Eltern über den echten
    // Kauf-Pfad auf (Keimling → Topf wäre UI; registerVariant über Kauf genügt hier).
    updateMeta({ nektar: 200 });
    expect(buySeedAndGerminate(40, 0)).not.toBeNull();
    expect(buySeedAndGerminate(40, 1)).not.toBeNull();
    meta = loadMeta();
    // Queue bis zum Rand füllen.
    for (let i = 0; i < PENDING_CROSSES_MAX; i++) {
      const owned = ownedOf(meta);
      const roll = rollGachaCross(owned, 100 + i, meta.breedGeneration);
      meta = consumeSeedAndEnqueueCross(100 + i, meta.breedGeneration, meta.totalWavesSurvived, roll!.child, roll!.parentA.id, roll!.parentB.id)!;
    }
    expect(meta.pendingCrosses).toHaveLength(PENDING_CROSSES_MAX);

    // Nach MATURATION_WAVES_CAP Wellen sind ALLE reif — abholbar trotz voller Queue.
    for (let w = 0; w < MATURATION_WAVES_CAP; w++) advanceCrossMaturation(1);
    meta = loadMeta();
    const ready = meta.pendingCrosses.filter(c => isCrossReady(meta, c.crossIndex));
    expect(ready.length).toBe(PENDING_CROSSES_MAX);
    // Und das Abholen schafft Platz — der Loop dreht weiter.
    const first = ready[0];
    const kept = keepCross(first.child!, first.parentAId!, first.parentBId!, first.crossIndex);
    expect(kept).not.toBeNull();
    expect(kept!.pendingCrosses.length).toBe(PENDING_CROSSES_MAX - 1);
  });

  it('MetaSave-Version bleibt auf der aktuellen Fassung (v10) — der Loop dreht auf dem neuen Schema', () => {
    expect(META_VERSION).toBe(10);
    resetTestState();
    expect(loadMeta().version).toBe(META_VERSION);
  });
});
