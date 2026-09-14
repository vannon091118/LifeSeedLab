// Owner: Source (content truth). LOC ≤ 200.
// Namensgenerator-Pools: effektbezogene Kerne + Präfixe/Suffixe (Pflanzennamen).
// Ergebnis sind lesbare deutsche Komposita: Präfix + Effektkern + Gattungssuffix,
// z. B. „Sonn" + „gift" + „blatt" = „Sonngiftblatt" (der Name beschreibt die Wirkung).
// P4-Befund: die alten Pools klangen düster-dramatisch („Blutgiftspieß“) — der
// Mix ist jetzt nahbar (Sonn/Honig/Klee dominieren), bleibt aber source-driven
// und deterministisch (gleicher Seed ⇒ gleicher Name).
// Kein Code außerhalb config/ darf Namenswerte definieren (SOURCE = CONTENT TRUTH).

/** Effect gene id → name core (der Kern benennt den stärksten Effekt des Kindes).
 * Zugänglicher runderneuert (P4): harte Kerne (koloss/spieß) durch weichere
 * ersetzt, die dieselbe Wirkung IMMER NOCH benennen (koloss→pracht, spieß→funk). */
export const NAME_CORE_BY_GENE: Record<string, string> = {
  fire: 'glut',
  ice: 'frost',
  venom: 'gift',
  heal: 'heil',
  shield: 'schild',
  thorns: 'dorn',
  pierce: 'stachel',
  rapid: 'saus',
  heavy: 'pracht',
  crit: 'funk',
  splash: 'wall',
  regen: 'trieb',
  swift: 'wind',
  lure: 'lockruf',
  aura: 'hauch',
};

/** Adjektivische/präfixartige Herkunfts-Wörter (Teil 1 der Komposita).
 * Mix aus atmosphärisch (Nacht/Asche) und NAHBAR (Sonn/Moos/Honig/Klee): der
 * Befund war, dass die Kombinationen zu düster-dramatisch klangen („Torfornkraut").
 * Hard Rule: keine harten/ aggressiven Kerne als Präfix — der Kern benennt die Wirkung. */
export const NAME_PREFIXES = [
  'Sonn', 'Moos', 'Zucker', 'Honig', 'Klee', 'Wiese', 'Frühling', 'Morgen',
  'Nacht', 'Nebel', 'Reif', 'Sporen', 'Kristall', 'Wachs', 'Winter', 'Wolke',
] as const;

/** Gattungssuffixe (Teil 3): macht aus dem Effekt eine Pflanze. Weiche Gattungen
 * mit Papierton — zugänglich statt dramatisch (P4). */
export const NAME_SUFFIXES = [
  'spross', 'kraut', 'blatt', 'blüte', 'farn', 'glocke',
  'halm', 'knospe', 'wurz', 'nelke', 'beere', 'moos',
] as const;

export const NAME_FALLBACK_CORE = 'spross';
