// Owner: PersistenceSystem (façade — keeps `import ... from './meta'` green).
// Real logic: src/meta/{store,economy,run}.ts. storage.ts remains the sole storage owner.

export { META_KEY, META_VERSION, defaultMeta, loadMeta, persistMeta, updateMeta, resetMeta, deriveBredEntry } from './meta/store';
export { buySeed, buySeedAndGerminate, buyPoolItem, germinateSeed, germinateVariant, advanceCrossMaturation, consumeSeedAndEnqueueCross, isCrossReady, buySeedling, plantSeedlingIntoPot, buyRearingSlot } from './meta/economy';
export { reserveRunId, beginRun, applyRunEnd, recordRunEnd, registerVariant, keepCross, toggleLoadout, canonicalVariantId, deriveRunStats } from './meta/run';
export { enqueueBrood, claimBrood, readyBroods } from './meta/run';
export { deriveLoanPlant, isLoanVariant, LOAN_PLANT_ID } from './meta/loan';
