// Owner: Source (content truth). LOC ≤ 200.
// SHOP-POOLS (#4, 19.09.2026): Tiles, Deko und Samen sind GETRENNTE kaufbare Pools. Sie
// konkurrieren um DENSELBEN Nektar (die einzige Währung, ausgegeben nur außerhalb eines Runs),
// aber nicht um dieselbe Karte: wer Tiles kauft, baut Umgebung; wer Samen kauft, baut Biologie.
//
// Eigene Datei, weil hier zwei Domänen zusammenkommen: der MAP-Inhalt (Tile-Preise, Feld) und die
// ZUCHT-Ökonomie (Samenpreis). Die Pools sind die einzige Stelle, die beide kennt — `map.source`
// bleibt Karten-Inhalt, `economy.source` bleibt Zucht-Ökonomie, hier steht das Angebot.
//
// KEIN Preis und kein Gegenstand entstehen in der UI (Regel 6): Karten UND Kauf-Contract
// (`meta/economy.ts`) lesen dieselben Werte hier.

import { MAP_TILE_IDS, MAP_TILES_SOURCE, PLOT_POOL_KEY, PLOT_PRICE, type MapTileType } from './map.source';
import { SEED_POOL_ITEM, SEED_PRICE } from './economy.source';

export type ShopPoolId = 'seed' | 'tile' | 'decor';

/**
 * `stock` = der Kauf erhöht eine Stückzahl (Tiles/Deko liegen als Besitz in `variantCounts`).
 * `generator` = der Kauf ERZEUGT ein Wesen (Samen ⇒ Keimling, deterministisch aus dem
 * Kaufzähler); Besitz sind die wartenden Keimlinge, keine Stückzahl auf einem Schlüssel.
 */
type ShopPoolKind = 'stock' | 'generator';

interface ShopPoolSource {
  id: ShopPoolId;
  /** i18n-Key des Pool-Reiters UND des Gegenstands (translations.ts). */
  i18nKey: string;
  kind: ShopPoolKind;
  /** Gegenstände des Pools — Map-Tiles, Feld-Pool-Schlüssel oder der Samen-Gegenstand. */
  members: readonly string[];
}

/** Reihenfolge = Anzeige-Reihenfolge der Reiter (Biologie zuerst, dann die Karte). */
export const SHOP_POOLS_SOURCE: Record<ShopPoolId, ShopPoolSource> = {
  seed:  { id: 'seed',  i18nKey: 'shop.pool.seeds', kind: 'generator', members: [SEED_POOL_ITEM] },
  tile:  { id: 'tile',  i18nKey: 'shop.pool.tiles', kind: 'stock',     members: [...MAP_TILE_IDS.filter(t => t !== 'decor'), PLOT_POOL_KEY] },
  decor: { id: 'decor', i18nKey: 'shop.pool.decor', kind: 'stock',     members: ['decor'] },
};

export const SHOP_POOL_IDS = Object.keys(SHOP_POOLS_SOURCE) as ShopPoolId[];

/** Nektar-Preis eines Pool-Gegenstands — eine Wahrheit für Shop-Karte UND Kaufvertrag. */
export function poolPriceOf(key: string): number {
  if (key === SEED_POOL_ITEM) return SEED_PRICE;
  const tile = MAP_TILES_SOURCE[key as MapTileType];
  return tile ? tile.price : PLOT_PRICE;
}

/** Anzeigename eines Pool-Gegenstands (i18n-Key) — kein zweiter Namenstopf. */
export function poolLabelKey(key: string): string {
  if (key === SEED_POOL_ITEM) return 'shop.pool.seeds';
  const tile = MAP_TILES_SOURCE[key as MapTileType];
  return tile ? tile.i18nKey : 'map.plot';
}
