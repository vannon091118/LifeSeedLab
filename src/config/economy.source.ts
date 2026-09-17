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

/** Reifung: Kreuzung i wird nach `wavesToUnlockFor(i)` überlebten Wellen verfügbar.
 *
 * B34 (Loop-Grundsatz: Kaufen → Aussäen → Pflegen → Ernten → Loadout darf NIE blockieren):
 * Die offene Kurve 2+2i erreichte 24 Wellen bei Kreuzung 11 — mit voller Queue (12) wartete
 * der Spieler auf ~156 Wellen, ohne noch aussäen zu können. Jetzt deckelt die Kurve bei
 * MATURATION_WAVES_CAP: stärkere Kreuzungen kosten weiterhin mehr Geduld, aber der Loop
 * dreht immer in absehbarer Zeit. */
export const MATURATION_BASE_WAVES = 2;
export const MATURATION_STEP_WAVES = 2;
export const MATURATION_WAVES_CAP = 12;
export function wavesToUnlockFor(crossIndex: number): number {
  return Math.min(MATURATION_WAVES_CAP, MATURATION_BASE_WAVES + crossIndex * MATURATION_STEP_WAVES);
}

/** Reifungs-Queue: Obergrenze gleichzeitig wartender Kreuzungen.
 *  Gereifte Kreuzungen werden NICHT mehr stillschweigend verworfen (A13.12); die Kapazität
 *  begrenzt nur den Speicher-Wachstum. Bei Überschreitung fallen die ÄLTESTEN Einträge.
 *  Die Queue wird ausschließlich beim Beanspruchen (`keepCross`) ausgebucht. */
export const PENDING_CROSSES_MAX = 12;

/** Gacha: die Instanz (z.B. Greenhouse) entscheidet deterministisch aus diesem Seed. */
export const GACHA_NAMESPACES = { plant: 'plant' } as const;

// ── Kampfökonomie & Pflanzen-Lebenszyklus (Source = Truth) ──────
/** 1–5 Münzen pro Kill für den In-Run-Shop (deterministisch via loot-RNG). */
export const COINS_PER_KILL_MIN = 1;
export const COINS_PER_KILL_MAX = 5;

/** Auto-Wellen: Ticks in 'prep' bis die nächste Welle automatisch startet. */
export const AUTO_WAVE_DELAY_TICKS = 90; // 3s bei 30tps

/** B32: Startwert der Spieler-Entscheid „automatische Wellen" — der Run-Schalter überschreibt
 *  ihn pro Run (wave.autoWaves), die Source bleibt die Content-Wahrheit für den Default. */
export const AUTO_WAVES_DEFAULT = true;

/**
 * B23.1 (Befund beider Spielerberichte): Solange KEINE Pflanze steht, startet keine Welle von
 * selbst — das Labor wartet auf die erste Platzierung. Vorher lief Welle 1 drei Sekunden nach
 * Betreten des Feldes los: wer erst las oder ausprobierte, verlor mit Score 0.
 * Der Wellen-Knopf bleibt der Ausweg (kein Softlock), und sobald etwas steht, gilt wieder
 * AUTO_WAVE_DELAY_TICKS. Gilt für jede Vorbereitung mit leerem Feld, nicht nur für Welle 1.
 */
export const PREP_WAITS_FOR_FIRST_PLANT = true;

/** Wachstum:Ticks bis zur Reife je Seltenheit (düngen nur währenddessen). */
export const GROWTH_TICKS_BY_RARITY: Record<'common' | 'rare' | 'exotic', number> = {
  common: 90,  // 3s
  rare: 150,   // 5s
  exotic: 210, // 7s
};

/** Haltbarkeit nach Reife: Ticks bis zum Verwelken (erst geschwächt, dann tot). */
export const LIFESPAN_TICKS_BY_RARITY: Record<'common' | 'rare' | 'exotic', number> = {
  common: 900,  // 30s
  rare: 1500,   // 50s
  exotic: 2100, // 70s
};

/** Schwelle: unter 30% Restlebenszeit → geschwächt (Schaden halbiert). */
export const WEAKENED_THRESHOLD = 0.3;

/** Düngen (nur growing): pro Anwendung — deterministisch, fix. */
export const FERTILIZE_BONUS = {
  hp: 20,
  damage: 3,
  lifespan: 300,      // +10s Haltbarkeit
  cooldownPenalty: 4, // +Ticks Cooldown (Nutzbarkeit verringert)
  maxApplications: 3,
} as const;

/** Setzling: neue Generierung derselben Pflanze mit halber Wachstumszeit. */
export const SEEDLING_GROWTH_FACTOR = 0.5;

/** Rarität aus Kosten ableiten (source-driven, ohne zweite Wahrheit). */
export function rarityForCost(cost: number): 'common' | 'rare' | 'exotic' {
  if (cost >= 60) return 'exotic';
  if (cost >= 45) return 'rare';
  return 'common';
}
