// Owner: Source (breeding gene pool). LOC ≤ 200.
// GENE_POOL — dominante/rezessive + Gacha-Gewichte. Source of Truth für crossGenomes/gacha generation.
/** Dominanz-Rang: 5/4 = starke dominante Allele, 3 = dominante, 2 = rezessive,
 *  1 = schwach rezessive. Die Rangfolge ist Source-Wahrheit; `dominant` bleibt der
 *  serialisierte Vererbungszustand für Altsaves und muss zum Pool passen. */
export const GENE_POOL: Record<string, { dominant: boolean; weight: number; dominance: number }> = {
  fire: { dominant: true, weight: 0.3, dominance: 4 },
  ice: { dominant: false, weight: 0.25, dominance: 2 },
  rapid: { dominant: true, weight: 0.35, dominance: 4 },
  heavy: { dominant: false, weight: 0.3, dominance: 2 },
  heal: { dominant: false, weight: 0.2, dominance: 2 },
  shield: { dominant: true, weight: 0.25, dominance: 4 },
  venom: { dominant: true, weight: 0.15, dominance: 3 },
  splash: { dominant: false, weight: 0.2, dominance: 2 },
  pierce: { dominant: true, weight: 0.2, dominance: 4 },
  regen: { dominant: false, weight: 0.15, dominance: 2 },
  lure: { dominant: false, weight: 0.1, dominance: 1 },
  thorns: { dominant: true, weight: 0.2, dominance: 4 },
  swift: { dominant: true, weight: 0.3, dominance: 3 },
  crit: { dominant: false, weight: 0.15, dominance: 2 },
  aura: { dominant: false, weight: 0.1, dominance: 2 },
  gravity: { dominant: false, weight: 0.12, dominance: 2 },
  acid: { dominant: true, weight: 0.18, dominance: 3 },
  prismatic: { dominant: false, weight: 0.1, dominance: 1 },
  echo: { dominant: true, weight: 0.15, dominance: 3 },
  spore: { dominant: false, weight: 0.16, dominance: 2 },
  titan: { dominant: false, weight: 0.12, dominance: 2 },
  bloom: { dominant: true, weight: 0.14, dominance: 3 },
  vortex: { dominant: true, weight: 0.11, dominance: 3 },
};
