// Owner: Source (façade — keeps old imports green, caps each file ≤ 300).
// Real logic lives in src/genome/{pool,cross,gacha,bases}.ts.
// This barrel is the only public surface for `import ... from './genome'`.

export { GENE_POOL } from './genome/pool';
export { crossGenomes, deriveStats, deriveTraits, generateName } from './genome/cross';
export type { GachaRoll } from './genome/gacha';
export {
  variantPower,
  rollGachaCross,
  deriveGachaSeed,
  deriveBreedSeed,
  crossPair,
} from './genome/gacha';
export { createBaseVariants } from './genome/bases';
