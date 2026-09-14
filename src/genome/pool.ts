// Owner: Source (breeding gene pool). LOC ≤ 200.
// GENE_POOL — dominante/rezessive + Gacha-Gewichte. Source of Truth für crossGenomes/gacha generation.
export const GENE_POOL: Record<string, { dominant: boolean; weight: number }> = {
  fire: { dominant: true, weight: 0.3 },
  ice: { dominant: false, weight: 0.25 },
  rapid: { dominant: true, weight: 0.35 },
  heavy: { dominant: false, weight: 0.3 },
  heal: { dominant: false, weight: 0.2 },
  shield: { dominant: true, weight: 0.25 },
  venom: { dominant: true, weight: 0.15 },
  splash: { dominant: false, weight: 0.2 },
  pierce: { dominant: true, weight: 0.2 },
  regen: { dominant: false, weight: 0.15 },
  lure: { dominant: false, weight: 0.1 },
  thorns: { dominant: true, weight: 0.2 },
  swift: { dominant: true, weight: 0.3 },
  crit: { dominant: false, weight: 0.15 },
  aura: { dominant: false, weight: 0.1 },
};
