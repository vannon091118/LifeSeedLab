// Owner: UI (Shop-Pools). LOC ≤ 200.
// TILES, DEKO UND SAMEN SIND GETRENNTE KAUFBARE POOLS (19.09.2026).
//
// Fachlich: die drei Pools konkurrieren um DENSELBEN Nektar, aber nicht um dieselbe Karte. Wer
// Tiles kauft, baut mehr Umgebung; wer Samen kauft, baut mehr Biologie. Genau dieser Zielkonflikt
// ist der Grund, warum es getrennte Pools gibt statt eines Universalguthabens.
//
// Diese Datei ist REINE ABLEITUNG: welche Gegenstände ein Pool enthält, was sie kosten und wie
// viel man besitzt, sagt die Source (`config/shop.source.ts`) — die UI darf keinen Preis und
// keinen Gegenstand erfinden, sonst gäbe es einen zweiten Shop-Vertrag neben `meta/economy.ts`.
// Beide Pool-Arten liefern dieselbe Kartenform, damit der Shop EINEN Renderer hat:
//   stock     ⇒ Gegenstände aus dem Besitz-Schlüssel (`variantCounts`, Tiles/Deko)
//   generator ⇒ ein Gegenstand, dessen Kauf ein Wesen ERZEUGT (Samen ⇒ Keimling)

import type { MetaSave } from '../types';
import { SHOP_POOLS_SOURCE, poolLabelKey, poolPriceOf, type ShopPoolId } from '../config/shop.source';
import { SEED_POOL_ITEM, SEED_PRICE } from '../config/economy.source';

/** Ein Pool-Platz im Shop: was es ist, was es kostet, wie viel man schon besitzt. */
export interface PoolOffer {
  /** Kauf-Schlüssel (Map-Tile-Id, Feld-Pool-Schlüssel oder Samen-Gegenstand). */
  key: string;
  /** i18n-Key des Namens (`map.pot`, `shop.pool.seeds`, …). */
  labelKey: string;
  price: number;
  /** Besessene Stückzahl — der Shop zeigt den echten Bestand, kein Wunschdenken. */
  owned: number;
}

/** Angebote eines Pools, in Source-Reihenfolge (deterministisch, keine Sortierung nach Zufall). */
export function poolOffers(pool: ShopPoolId, meta: MetaSave): PoolOffer[] {
  if (SHOP_POOLS_SOURCE[pool].kind === 'generator') return [seedOffer(meta)];
  return SHOP_POOLS_SOURCE[pool].members.map(key => ({
    key,
    labelKey: poolLabelKey(key),
    price: poolPriceOf(key),
    owned: meta.variantCounts[key] ?? 0,
  }));
}

/** Besitz eines Samens: die Keimlinge, die im Gewächshaus auf einen Topf warten. */
function seedOffer(meta: MetaSave): PoolOffer {
  return {
    key: SEED_POOL_ITEM,
    labelKey: poolLabelKey(SEED_POOL_ITEM),
    price: SEED_PRICE,
    owned: meta.seedlings.length,
  };
}

/** Kann sich der Spieler diesen Gegenstand leisten? (Die UI fragt nur, sie entscheidet nicht.) */
export function canAfford(meta: MetaSave, offer: PoolOffer): boolean {
  return meta.nektar >= offer.price;
}
