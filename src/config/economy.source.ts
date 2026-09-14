// Owner: Source (content truth). LOC ≤ 200.
// Gacha-Ökonomie: Seed-Shop-Preise, Reifungsanforderungen (überlebte Wellen),
// Start-Regeln (genau 2 Pflanzen). Keine Gameplay-Konstanten außerhalb config/.

/** Genau 2 Pflanzen beim ersten Start (Anforderung: „genau 2 Pflanzen zu Beginn"). */
export const STARTER_PLANT_COUNT = 2;

/** Nektar-Kosten pro Seed im Shop (Preis skaliert mit Stärkeindex). */
export const SEED_SHOP_BASE_PRICE = 40;
export const SEED_SHOP_PRICE_STEP = 15;

/** Anzahl gleichzeitig angebotener Seeds im Shop (deterministisch rotierend). */
export const SEED_SHOP_OFFERS = 3;

/** Reifung: Kreuzung i wird nach `wavesToUnlockFor(i)` überlebten Wellen verfügbar. */
export function wavesToUnlockFor(crossIndex: number): number {
  // Stärke skaliert: 1. Kreuzung 2 Wellen, dann +2 pro Stufe (2,4,6,8,...)
  return 2 + crossIndex * 2;
}

/** Gacha: die Instanz (z.B. Greenhouse) entscheidet deterministisch aus diesem Seed. */
export const GACHA_NAMESPACES = { plant: 'plant' } as const;
