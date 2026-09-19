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
  // Zweite Gen-Gruppe (v9, 19.09.2026): schwerer zu ziehen als der Grundstock (Gewicht < 0.2),
  // damit die Erweiterung ein ZIEL bleibt und kein Startbesitz wird. Jedes Gen hat genau einen
  // Effekt (genes.source) und mindestens drei sichtbare Achsen (phenotype.source).
  gravity: { dominant: false, weight: 0.12 },
  acid: { dominant: true, weight: 0.18 },
  prismatic: { dominant: false, weight: 0.1 },
  echo: { dominant: true, weight: 0.15 },
  spore: { dominant: false, weight: 0.16 },
  titan: { dominant: false, weight: 0.12 },
  bloom: { dominant: true, weight: 0.14 },
  vortex: { dominant: true, weight: 0.11 },
};
