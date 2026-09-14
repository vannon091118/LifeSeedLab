// Owner: Source (content truth). LOC ≤ 200.
// Namensgenerator-Pools: effektbezogene Kerne + Präfixe/Suffixe (Pflanzennamen).
// Ergebnis sind lesbare deutsche Komposita: Präfix + Effektkern + Gattungssuffix,
// z. B. „Nacht" + „gift" + „blatt" = „Nachtgiftblatt" (der Name beschreibt die Wirkung).
// Kein Code außerhalb config/ darf Namenswerte definieren (SOURCE = CONTENT TRUTH).

/** Effect gene id → name core (der Kern benennt den stärksten Effekt des Kindes). */
export const NAME_CORE_BY_GENE: Record<string, string> = {
  fire: 'glut',
  ice: 'frost',
  venom: 'gift',
  heal: 'heil',
  shield: 'schild',
  thorns: 'dorn',
  pierce: 'stachel',
  rapid: 'saus',
  heavy: 'koloss',
  crit: 'spieß',
  splash: 'wall',
  regen: 'trieb',
  swift: 'wind',
  lure: 'lockruf',
  aura: 'hauch',
};

/** Adjektivische/präfixartige Herkunfts-Wörter (klein beginnender Komposita-Teil 1). */
export const NAME_PREFIXES = [
  'Blut', 'Nacht', 'Sonn', 'Moos', 'Asche', 'Sturm', 'Nebel', 'Zucker',
  'Kristall', 'Winter', 'Reif', 'Sporen', 'Wolfs', 'Drachen', 'Wachs', 'Tor',
] as const;

/** Gattungssuffixe (Teil 3): macht aus dem Effekt eine Pflanze. */
export const NAME_SUFFIXES = [
  'spross', 'kraut', 'blatt', 'blüte', 'farn', 'distel',
  'halm', 'knospe', 'wurz', 'nelke', 'beere', 'moos',
] as const;

export const NAME_FALLBACK_CORE = 'spross';
