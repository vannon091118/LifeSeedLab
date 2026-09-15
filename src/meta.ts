// Owner: PersistenceSystem (façade — keeps `import ... from './meta'` green).
// Real logic: src/meta/{store,economy,run}.ts. storage.ts remains the sole storage owner.

export { META_KEY, META_VERSION, starterVariants, defaultMeta, loadMeta, persistMeta, updateMeta, resetMeta, deriveBredEntry } from './meta/store';
export { buySeed, enqueueCross, advanceCrossMaturation, consumeSeed, addNektar } from './meta/economy';
export { reserveRunId, applyRunEnd, recordRunEnd, registerVariant, keepCross, toggleLoadout, canonicalVariantId, saveMapLayout, loadMapLayout, listMapLayouts } from './meta/run';
export { enqueueBrood, claimBrood, readyBroods } from './meta/run';
