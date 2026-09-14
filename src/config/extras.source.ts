// Owner: Source (content truth). LOC ≤ 200.
// 10 Extras (cosmetic attachments). Pure presentation — never read by simulation.

export type ExtraId =
  | 'EXTRA_HAT' | 'EXTRA_LEAF_CROWN' | 'EXTRA_SPIKE' | 'EXTRA_GEM' | 'EXTRA_MUSHROOM'
  | 'EXTRA_VINE' | 'EXTRA_EYE' | 'EXTRA_MOUTH' | 'EXTRA_ANTENNA' | 'EXTRA_SCAR';

export interface ExtraSource {
  id: ExtraId;
  asset: string;              // silhouette primitive key (renderer-owned drawing)
  anchor: 'top' | 'center' | 'bottom' | 'left' | 'right';
  compatibility: string[];    // base ids this extra may attach to ('*' = all)
  scaleRules: { min: number; max: number };
  rotationRules: { min: number; max: number }; // radians offset
  paletteRules: 'inherit' | 'contrast' | 'accent';
}

export const EXTRAS_SOURCE: Record<ExtraId, ExtraSource> = {
  EXTRA_HAT:        { id: 'EXTRA_HAT',        asset: 'hat',        anchor: 'top',    compatibility: ['BASE_FLOWER', 'BASE_BUSH', 'BASE_MUSHROOM', 'BASE_VINE'], scaleRules: { min: 0.8, max: 1.2 }, rotationRules: { min: -0.15, max: 0.15 }, paletteRules: 'contrast' },
  EXTRA_LEAF_CROWN: { id: 'EXTRA_LEAF_CROWN', asset: 'leafcrown',  anchor: 'top',    compatibility: ['BASE_FLOWER', 'BASE_BUSH'], scaleRules: { min: 0.9, max: 1.3 }, rotationRules: { min: -0.1, max: 0.1 }, paletteRules: 'accent' },
  EXTRA_SPIKE:      { id: 'EXTRA_SPIKE',      asset: 'spike',      anchor: 'top',    compatibility: ['BASE_CACTUS', 'BASE_THORN', 'BASE_ROOT'], scaleRules: { min: 0.7, max: 1.4 }, rotationRules: { min: -0.3, max: 0.3 }, paletteRules: 'inherit' },
  EXTRA_GEM:        { id: 'EXTRA_GEM',        asset: 'gem',        anchor: 'center', compatibility: ['BASE_CRYSTAL', 'BASE_FLOWER', 'BASE_MUSHROOM'], scaleRules: { min: 0.5, max: 1.0 }, rotationRules: { min: 0, max: 0 }, paletteRules: 'accent' },
  EXTRA_MUSHROOM:   { id: 'EXTRA_MUSHROOM',   asset: 'shroom',     anchor: 'bottom', compatibility: ['BASE_ROOT', 'BASE_VINE'], scaleRules: { min: 0.6, max: 1.1 }, rotationRules: { min: -0.2, max: 0.2 }, paletteRules: 'accent' },
  EXTRA_VINE:       { id: 'EXTRA_VINE',       asset: 'vine',       anchor: 'bottom', compatibility: ['BASE_VINE', 'BASE_ROOT', 'BASE_BUSH'], scaleRules: { min: 0.8, max: 1.3 }, rotationRules: { min: -0.4, max: 0.4 }, paletteRules: 'inherit' },
  EXTRA_EYE:        { id: 'EXTRA_EYE',        asset: 'eye',        anchor: 'center', compatibility: ['*'], scaleRules: { min: 0.4, max: 0.8 }, rotationRules: { min: 0, max: 0 }, paletteRules: 'contrast' },
  EXTRA_MOUTH:      { id: 'EXTRA_MOUTH',      asset: 'mouth',      anchor: 'center', compatibility: ['BASE_MUSHROOM', 'BASE_VINE', 'BASE_ROOT', 'BASE_BUSH'], scaleRules: { min: 0.4, max: 0.9 }, rotationRules: { min: 0, max: 0 }, paletteRules: 'contrast' },
  EXTRA_ANTENNA:    { id: 'EXTRA_ANTENNA',    asset: 'antenna',    anchor: 'top',    compatibility: ['BASE_MUSHROOM', 'BASE_VINE'], scaleRules: { min: 0.6, max: 1.2 }, rotationRules: { min: -0.25, max: 0.25 }, paletteRules: 'contrast' },
  EXTRA_SCAR:       { id: 'EXTRA_SCAR',       asset: 'scar',       anchor: 'center', compatibility: ['*'], scaleRules: { min: 0.5, max: 1.0 }, rotationRules: { min: -0.5, max: 0.5 }, paletteRules: 'contrast' },
};

export const EXTRA_IDS = Object.keys(EXTRAS_SOURCE) as ExtraId[];

export function isValidExtra(id: string): id is ExtraId {
  return id in EXTRAS_SOURCE;
}
