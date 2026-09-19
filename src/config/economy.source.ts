// Owner: Source (content truth). LOC ≤ 200.
// Gacha-Ökonomie: Seed-Shop-Preise, Reifungsanforderungen (überlebte Wellen),
// Start-Regeln (genau 2 Pflanzen). Keine Gameplay-Konstanten außerhalb config/.

/** Genau 2 Pflanzen beim ersten Start (Anforderung: „genau 2 Pflanzen zu Beginn"). */
export const STARTER_PLANT_COUNT = 2;

/**
 * SAMEN-POOL (19.09.2026): EIN Gegenstand, EIN Preis. Der Kauf keimt einen Keimling,
 * determiniert aus dem Kaufzähler (`germinateVariant`) — also gibt es keine Preis-Staffel:
 * vorher standen drei Karten mit DREI Preisen und „Seltenheiten" für ein und denselben Keim
 * (Preis und Tier wurden im Screen erfunden — genau der zweite Vertrag, den Regel 6 verbietet).
 * Der Schlüssel ist zugleich der Gegenstand des Pools in `SHOP_POOLS_SOURCE`.
 */
export const SEED_POOL_ITEM = 'seed';
export const SEED_PRICE = 40;

/**
 * Start-Nektar: GENAU EIN günstiger Samen. Der neue Spieler kann sich sofort EINE eigene
 * Pflanze leisten — aber nur eine. Der Loop (Leih-Run → Nektar erwirtschaften → mehr Samen)
 * bleibt der Antrieb; mehr als der erste Kauf ist aus Startkapital nie möglich.
 */
export const STARTING_NEKTAR = SEED_PRICE;

/**
 * Gewächshaus: Töpfe sind PHYSISCHE Platzierungsplätze. Genau drei zu Beginn — eigene
 * Pflanzen sind damit eine knappe Ressource. Eine spätere Erweiterung läuft über PvP
 * (noch nicht implementiert, wird NICHT erfunden); die Slot-Struktur (Array in MetaSave)
 * ist darauf vorbereitet: nur diese Zahl wächst dann.
 */
export const GREENHOUSE_POT_SLOTS = 3;

/** Reifung: Kreuzung i wird nach `wavesToUnlockFor(i)` überlebten Wellen verfügbar.
 *
 * B34 (Loop-Grundsatz: Kaufen → Aussäen → Pflegen → Ernten → Loadout darf NIE blockieren):
 * Die offene Kurve 2+2i erreichte 24 Wellen bei Kreuzung 11 — mit voller Queue (12) wartete
 * der Spieler auf ~156 Wellen, ohne noch aussäen zu können. Jetzt deckelt die Kurve bei
 * MATURATION_WAVES_CAP: stärkere Kreuzungen kosten weiterhin mehr Geduld, aber der Loop
 * dreht immer in absehbarer Zeit. */
const MATURATION_BASE_WAVES = 2;
const MATURATION_STEP_WAVES = 2;
export const MATURATION_WAVES_CAP = 12;
export function wavesToUnlockFor(crossIndex: number): number {
  return Math.min(MATURATION_WAVES_CAP, MATURATION_BASE_WAVES + crossIndex * MATURATION_STEP_WAVES);
}

/** Reifungs-Queue: Obergrenze gleichzeitig wartender Kreuzungen.
 *  Gereifte Kreuzungen werden NICHT mehr stillschweigend verworfen (A13.12); die Kapazität
 *  begrenzt nur den Speicher-Wachstum. Bei Überschreitung fallen die ÄLTESTEN Einträge.
 *  Die Queue wird ausschließlich beim Beanspruchen (`keepCross`) ausgebucht. */
export const PENDING_CROSSES_MAX = 12;

/**
 * REIFUNGSPLÄTZE (Entscheidung des Spielers, 19.09.2026): Start 3 — wie die Töpfe im
 * Gewächshaus — und bis 12 ausbaubar. Jeder zusätzliche Platz verlangt BEIDES: Nektar UND eine
 * überlebte Wellenmarke. Ohne das Wellen-Gate wäre Reifung reine Geldwirtschaft, ohne den Preis
 * reine Ausdauer. Beide Zahlen wachsen steil (Vorgabe: „ab Platz 4 verdoppelt sich der Aufwand
 * grob"), damit Platz 12 ein Ziel später Läufe bleibt und nicht nach Welle 5 fällt.
 */
export const REARING_SLOTS_START = 3;
export const REARING_SLOTS_MAX = 12;
export const REARING_SLOT_GATES: readonly { nektar: number; wave: number }[] = [
  { nektar: 100, wave: 3 },   // Platz 4
  { nektar: 180, wave: 5 },   // Platz 5
  { nektar: 300, wave: 8 },   // Platz 6
  { nektar: 480, wave: 11 },  // Platz 7
  { nektar: 720, wave: 14 },  // Platz 8
  { nektar: 1050, wave: 18 }, // Platz 9
  { nektar: 1500, wave: 22 }, // Platz 10
  { nektar: 2100, wave: 26 }, // Platz 11
  { nektar: 3000, wave: 30 }, // Platz 12
] as const;

/** Gate für den NÄCHSTEN Platz (Preis + Wellenmarke) — `null` ⇒ alle 12 stehen. */
export function rearingSlotGate(owned: number): { nektar: number; wave: number; next: number } | null {
  const index = owned - REARING_SLOTS_START;
  const gate = REARING_SLOT_GATES[index];
  if (!gate) return null;
  return { nektar: gate.nektar, wave: gate.wave, next: owned + 1 };
}

/**
 * FORTSETZEN kostet Nektar (Entscheidung des Spielers, 19.09.2026): Ein Abbruch BEENDET den
 * Lauf — ein kostenloses Wiedereinsteigen gibt es nicht. Wer weiter will, zahlt 25 Nektar je
 * erreichter Welle, ohne Cap (Welle 30 ⇒ 750). Damit ist Abbrechen eine echte Entscheidung und
 * kein Save-Scumming-Werkzeug.
 */
export const RESUME_NEKTAR_PER_WAVE = 25;
export function resumeCostFor(wave: number): number {
  return RESUME_NEKTAR_PER_WAVE * Math.max(1, Math.floor(wave));
}

// ── Kampfökonomie & Pflanzen-Lebenszyklus (Source = Truth) ──────
/**
 * 1–5 ERFAHRUNG pro Kill (deterministisch via loot-RNG).
 *
 * Währungs-Klarstellung (19.09.2026): hier standen „Münzen für den In-Run-Shop". Der In-Run-Shop
 * ist mit dem Energie-System gestorben; danach blieb „Lauf-Erfahrung" (1–5 je Kill) — ein
 * Kontostand ohne Leser und ohne Senke. Auch der ist gestrichen (Entscheidung „Feld streichen"):
 * es gibt genau EINE Währung (Nektar, ausschließlich außerhalb von Runs ausgegeben) und im Run
 * nur Wertung (Score/Combo/Nektar-Ertrag).
 */

/** Auto-Wellen: Ticks in 'prep' bis die nächste Welle automatisch startet. */
export const AUTO_WAVE_DELAY_TICKS = 90; // 3s bei 30tps

/** B32: Startwert der Spieler-Entscheid „automatische Wellen" — der Run-Schalter überschreibt
 *  ihn pro Run (wave.autoWaves), die Source bleibt die Content-Wahrheit für den Default. */
export const AUTO_WAVES_DEFAULT = true;

/**
 * R1 (Screenshot-Befund): Die Aufbauhilfe ist eine Begleitung, kein Dauerzustand — nach dieser
 * Frist (Sim-Ticks) verblasst sie endgültig. Zeitbasis ist der Sim-Tick (B23.2), keine Wanduhr.
 */
export const HINT_FADE_AFTER_TICKS = 600; // 20 s bei 30 tps

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
