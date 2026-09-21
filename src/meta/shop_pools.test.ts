// FAIRES STARTMATERIAL + DREI KAUFBARE POOLS (19.09.2026).
//
// Zwei Zusagen, die diese Datei pinnt:
//  1. JEDES Profil besitzt das faire Startmaterial (`STARTING_MATERIAL`) — frisch, migriert oder
//     mitten aus der Einführung des Besitz-Modells. Es ist ein BODEN und wird genau EINMAL
//     gewährt: wer alles verbaut hat, wird nicht bei jedem Load neu ausgestattet (sonst wäre der
//     Shop für Tiles bedeutungslos).
//  2. Tiles, Deko und Samen sind GETRENNTE Pools im Shop. Preis, Gegenstand und Besitz-Zahl
//     kommen aus der Source — der Screen erfindet nichts. Samen zahlen aus derselben Währung,
//     liegen aber nicht in derselben Menge (sie sind kein Material-Schlüssel).
import { describe, it, expect, beforeEach } from 'vitest';
import { resetFullTestState, writeLegacyEnvelope } from '../testing/testkit';
import { META_KEY, META_VERSION, loadMeta, updateMeta, defaultMeta } from './store';
import { buyPoolItem, buySeedling } from './economy';
import { STARTING_MATERIAL, POOL_KEYS } from '../config/map.source';
import { SEED_POOL_ITEM, SEED_PRICE } from '../config/economy.source';
import { SHOP_POOL_IDS, SHOP_POOLS_SOURCE, poolPriceOf } from '../config/shop.source';
import { poolOffers } from '../components/shopPools';

describe('Besitz-Modell — faires Startmaterial für JEDES Profil', () => {
  beforeEach(() => { resetFullTestState(); });

  it('frisches Profil: das Material der Source ist Besitz, nicht Run-Gabe', () => {
    const meta = defaultMeta();
    expect(meta.materialGranted).toBe(true);
    for (const [key, amount] of Object.entries(STARTING_MATERIAL)) {
      expect(meta.variantCounts[key], key).toBe(amount);
    }
  });

  it('Altsave (v8, kein Flag) wird auf den Boden aufgefüllt — höherer Bestand bleibt', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 8, nektar: 120, bestWave: 4, runs: 2, runId: 2,
      variantCounts: { pot: 2, decor: 30 },
    }, 8);

    const meta = loadMeta();
    expect(meta.version).toBe(META_VERSION);
    expect(meta.materialGranted).toBe(true);
    expect(meta.variantCounts.pot).toBe(STARTING_MATERIAL.pot);     // 2 ⇒ Boden
    expect(meta.variantCounts.decor).toBe(30);                      // mehr bleibt mehr
    expect(meta.variantCounts.plot).toBe(STARTING_MATERIAL.plot);
    expect(meta.nektar).toBe(120);                                  // Heilung ist keine Rücksetzung
  });

  it('die Gabe ist EINMALIG: ein leergebautes Profil bekommt nichts zurück', () => {
    updateMeta({ variantCounts: { pot: 0, plot: 0 }, materialGranted: true });
    const meta = loadMeta();
    expect(meta.variantCounts.pot ?? 0).toBe(0);
    expect(meta.variantCounts.plot ?? 0).toBe(0);
    // kein Nachschub, auch nicht nach weiteren Loads (verbautes Material ist in der Karte)
    updateMeta({ nektar: meta.nektar });
    expect(loadMeta().variantCounts.pot ?? 0).toBe(0);
  });

  it('gleiche Envelope-Version ohne Flag (Q6-Fall) heilt beim Load', () => {
    // resolveVersion reicht gleich-versionierte Saves ROH durch: die Migration läuft nie.
    writeLegacyEnvelope(META_KEY, { nektar: 7, variantCounts: {} }, META_VERSION);
    const meta = loadMeta();
    expect(meta.materialGranted).toBe(true);
    expect(meta.variantCounts.pot).toBe(STARTING_MATERIAL.pot);
    expect(meta.nektar).toBe(7);
  });
});

describe('Shop — drei getrennte kaufbare Pools', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Samen, Tiles und Deko sind eigene Pools (Reihenfolge + Gegenstände aus der Source)', () => {
    expect(SHOP_POOL_IDS).toEqual(['seed', 'tile', 'decor']);
    expect(SHOP_POOLS_SOURCE.tile.members).toContain('pot');
    expect(SHOP_POOLS_SOURCE.tile.members).not.toContain('path'); // der Weg ist kein Kaufposten mehr
    expect(SHOP_POOLS_SOURCE.tile.members).not.toContain('decor');  // Deko hat einen eigenen Pool
    expect(SHOP_POOLS_SOURCE.decor.members).toEqual(['decor']);
    expect(SHOP_POOLS_SOURCE.seed.members).toEqual([SEED_POOL_ITEM]);
  });

  it('Samen sind kein Material-Schlüssel — der Material-Kauf lehnt sie ab', () => {
    expect(POOL_KEYS).not.toContain(SEED_POOL_ITEM);
    expect(buyPoolItem(SEED_POOL_ITEM)).toBeNull();
    expect(buyPoolItem('does_not_exist')).toBeNull();
  });

  it('Karten-Besitz kommt aus der Source (Preis und gezählte Stücke)', () => {
    updateMeta({ variantCounts: { pot: 4, decor: 2 }, nektar: 500 });
    const meta = loadMeta();
    const tiles = poolOffers('tile', meta);
    const pot = tiles.find(o => o.key === 'pot')!;
    expect(pot.price).toBe(poolPriceOf('pot'));
    expect(pot.owned).toBe(4);
    expect(poolOffers('decor', meta)[0]).toMatchObject({ key: 'decor', owned: 2 });

    const seed = poolOffers('seed', meta)[0];
    expect(seed).toMatchObject({ key: SEED_POOL_ITEM, price: SEED_PRICE, owned: 0 });
  });
});

describe('Shop — der Kauf erhöht den Besitz (ein Writer, Source-Preise)', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Tile-Kauf: Nektar runter, Besitz hoch — fail-closed ohne Nektar', () => {
    const price = poolPriceOf('pot');
    updateMeta({ nektar: price * 2 });
    const after = buyPoolItem('pot', 2)!;
    expect(after).not.toBeNull();
    expect(after.variantCounts.pot).toBe(STARTING_MATERIAL.pot + 2);
    expect(after.nektar).toBe(0);

    updateMeta({ nektar: price - 1 });            // ein Nektar zu wenig
    expect(buyPoolItem('pot')).toBeNull();        // kein Schuldenkauf
    expect(loadMeta().variantCounts.pot).toBe(after.variantCounts.pot);
  });

  it('Samen-Kauf: Preis aus der Source, Besitz ist der Keimling', () => {
    updateMeta({ nektar: SEED_PRICE, variantCounts: {} });
    const after = buySeedling()!;
    expect(after).not.toBeNull();
    expect(after.nektar).toBe(0);
    expect(after.seedlings).toHaveLength(1);
    expect(poolOffers('seed', after)[0]!.owned).toBe(1);

    expect(buySeedling()).toBeNull();             // Startkapital ist verbraucht
    expect(loadMeta().seedlings).toHaveLength(1);
  });
});
