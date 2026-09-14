// Owner: Source (content truth). LOC ≤ 200.
// 10 Bases. The generator composes Base + Extras + Effects into ResolvedVisual.

export type BaseId =
  | 'BASE_FLOWER' | 'BASE_BUSH' | 'BASE_CACTUS' | 'BASE_MUSHROOM' | 'BASE_VINE'
  | 'BASE_ROOT' | 'BASE_THORN' | 'BASE_CRYSTAL' | 'BASE_PUFF' | 'BASE_FROND';

export interface BaseSource {
  id: BaseId;
  silhouette: 'round' | 'tall' | 'wide' | 'star' | 'crystal' | 'shroom';
  layers: string[];           // drawing layer keys, bottom-first
  palette: { base: string; accent: string; dark: string };
  anchors: { top: { x: number; y: number }; center: { x: number; y: number }; bottom: { x: number; y: number } };
  allowedExtras: ExtraIdRef[];  // 'EXTRA_*' ids — validated at gate
  allowedEffects: EffectIdRef[]; // 'EFFECT_*' ids — validated at gate
  animationProfile: 'sway' | 'bob' | 'pulse' | 'still';
}

type ExtraIdRef = string;   // validated by validateSources()
type EffectIdRef = string;  // validated by validateSources()

const FULL_ANCHORS = {
  top: { x: 0, y: -0.45 },
  center: { x: 0, y: 0 },
  bottom: { x: 0, y: 0.45 },
} as const;

export const BASES_SOURCE: Record<BaseId, BaseSource> = {
  BASE_FLOWER: {
    id: 'BASE_FLOWER', silhouette: 'star',
    layers: ['stem', 'petals', 'core'],
    palette: { base: '#f9a8d4', accent: '#fbcfe8', dark: '#9d174d' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_HAT', 'EXTRA_LEAF_CROWN', 'EXTRA_GEM', 'EXTRA_EYE', 'EXTRA_MOUTH', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_BURN', 'EFFECT_POISON', 'EFFECT_CRIT', 'EFFECT_CHAIN', 'EFFECT_SLOW'],
    animationProfile: 'sway',
  },
  BASE_BUSH: {
    id: 'BASE_BUSH', silhouette: 'round',
    layers: ['trunk', 'canopy', 'berry'],
    palette: { base: '#4ade80', accent: '#86efac', dark: '#14532d' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_HAT', 'EXTRA_LEAF_CROWN', 'EXTRA_SPIKE', 'EXTRA_EYE', 'EXTRA_MOUTH', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_PIERCE', 'EFFECT_HEAL', 'EFFECT_SHIELD', 'EFFECT_HASTE', 'EFFECT_CRIT'],
    animationProfile: 'bob',
  },
  BASE_CACTUS: {
    id: 'BASE_CACTUS', silhouette: 'tall',
    layers: ['body', 'arm_l', 'arm_r', 'spines'],
    palette: { base: '#34d399', accent: '#a7f3d0', dark: '#064e3b' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_SPIKE', 'EXTRA_GEM', 'EXTRA_EYE', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_REFLECT', 'EFFECT_SHIELD', 'EFFECT_POISON'],
    animationProfile: 'still',
  },
  BASE_MUSHROOM: {
    id: 'BASE_MUSHROOM', silhouette: 'shroom',
    layers: ['stalk', 'cap', 'spots'],
    palette: { base: '#c084fc', accent: '#e9d5ff', dark: '#581c87' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_HAT', 'EXTRA_GEM', 'EXTRA_EYE', 'EXTRA_MOUTH', 'EXTRA_ANTENNA', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_HEAL', 'EFFECT_SLOW', 'EFFECT_SHIELD', 'EFFECT_CHAIN', 'EFFECT_POISON'],
    animationProfile: 'pulse',
  },
  BASE_VINE: {
    id: 'BASE_VINE', silhouette: 'wide',
    layers: ['tendrils', 'leaves', 'flower'],
    palette: { base: '#22c55e', accent: '#bbf7d0', dark: '#166534' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_VINE', 'EXTRA_MUSHROOM', 'EXTRA_EYE', 'EXTRA_MOUTH', 'EXTRA_ANTENNA'],
    allowedEffects: ['EFFECT_SLOW', 'EFFECT_POISON', 'EFFECT_HASTE'],
    animationProfile: 'sway',
  },
  BASE_ROOT: {
    id: 'BASE_ROOT', silhouette: 'wide',
    layers: ['bulb', 'rootlets', 'sprout'],
    palette: { base: '#a3734a', accent: '#d6b28a', dark: '#78350f' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_SPIKE', 'EXTRA_MUSHROOM', 'EXTRA_EYE', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_REFLECT', 'EFFECT_SHIELD', 'EFFECT_BURN'],
    animationProfile: 'still',
  },
  BASE_THORN: {
    id: 'BASE_THORN', silhouette: 'star',
    layers: ['stalk', 'thorns', 'bud'],
    palette: { base: '#f87171', accent: '#fecaca', dark: '#7f1d1d' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_SPIKE', 'EXTRA_GEM', 'EXTRA_EYE', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_BURN', 'EFFECT_CRIT', 'EFFECT_PIERCE'],
    animationProfile: 'sway',
  },
  BASE_CRYSTAL: {
    id: 'BASE_CRYSTAL', silhouette: 'crystal',
    layers: ['core', 'shards', 'glow'],
    palette: { base: '#67e8f9', accent: '#cffafe', dark: '#155e75' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_GEM', 'EXTRA_EYE', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_CHAIN', 'EFFECT_SLOW', 'EFFECT_SHIELD', 'EFFECT_CRIT'],
    animationProfile: 'pulse',
  },
  BASE_PUFF: {
    id: 'BASE_PUFF', silhouette: 'round',
    layers: ['body', 'fluff', 'seeds'],
    palette: { base: '#fde68a', accent: '#fef9c3', dark: '#92400e' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_EYE', 'EXTRA_MOUTH', 'EXTRA_HAT', 'EXTRA_SCAR'],
    allowedEffects: ['EFFECT_HASTE', 'EFFECT_HEAL'],
    animationProfile: 'bob',
  },
  BASE_FROND: {
    id: 'BASE_FROND', silhouette: 'tall',
    layers: ['stem', 'fronds', 'tip'],
    palette: { base: '#a3e635', accent: '#d9f99d', dark: '#365314' },
    anchors: FULL_ANCHORS,
    allowedExtras: ['EXTRA_LEAF_CROWN', 'EXTRA_VINE', 'EXTRA_EYE', 'EXTRA_MOUTH'],
    allowedEffects: ['EFFECT_PIERCE', 'EFFECT_HASTE', 'EFFECT_POISON'],
    animationProfile: 'sway',
  },
};

export const BASE_IDS = Object.keys(BASES_SOURCE) as BaseId[];

export function isValidBase(id: string): id is BaseId {
  return id in BASES_SOURCE;
}
