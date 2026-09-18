// Owner: VisualGeneratorSystem. LOC ≤ 400.
// SOURCE + visualSeed = ResolvedVisual. Fully deterministic; uses ONLY 'visual'
// namespace RNG. Never reads or advances gameplay RNG (contract Phase 6.6).
// Genom→Visual-Mapping (genomeToVisualInput/genomeEffectIds) lebt in genome/visualMap.ts —
// diese Datei resolved nur: Compatibility → Palette → Geometry → Layers.

import { makeRng, deriveSeed } from '../core/rng';
import { hexToRgb, rgbToHex, shiftChannels } from '../core/color';
import { BASES_SOURCE, type BaseId, type BaseSource } from '../config/bases.source';
import { EXTRAS_SOURCE, type ExtraId, type ExtraSource } from '../config/extras.source';
import { EFFECTS_SOURCE, type EffectId } from '../config/effects.source';
import type { PlantVariant } from '../types';
import { genomeToVisualInput } from '../genome/visualMap';

export interface ResolvedLayer {
  key: string;            // silhouette layer key from base.layers
  anchor: { x: number; y: number };
  scale: number;
  rotation: number;
  color: string;
  outline: string;
}

export interface ResolvedVisual {
  version: 1;
  visualSeed: number;
  visualVersion: 1;
  baseId: BaseId;
  extraIds: ExtraId[];
  effectIds: EffectId[];
  layers: ResolvedLayer[];      // resolved bottom-first render order
  /** Gesamt-Skala des Wesens (Kästchenblock-CGI: Identität wächst aus dem Genom,
   *  0.85–1.25 — deterministisch aus strength + visualSeed, test-locked). */
  scale: number;
  outline: string;
  palette: { base: string; accent: string; dark: string };
  animation: BaseSource['animationProfile'];
  variantKey: string;           // stable key for persistence/discovery
}

export interface VisualInput {
  baseId: BaseId;
  extraIds: ExtraId[];
  effectIds: EffectId[];
  visualSeed: number;
  /** Genom-Stärke 0..1 (Ø Gene-Power) — steuert die Gesamt-Skala (0.85–1.25).
   *  Fehlt sie, fällt die Skala auf den seeded-Mittelwert zurück. */
  strength?: number;
}

// ── Compatibility Resolution (Phase 6.2) ────────────────────
export function resolveCompatibility(input: VisualInput): VisualInput {
  const base = BASES_SOURCE[input.baseId];
  if (!base) return input;

  // only extras compatible with the base survive
  const extras = input.extraIds.filter(id => {
    const e = EXTRAS_SOURCE[id];
    return e && (e.compatibility.includes('*') || e.compatibility.includes(base.id));
  });

  // only effects the base allows survive
  const effects = input.effectIds.filter(id => base.allowedEffects.includes(id));

  return { ...input, extraIds: extras, effectIds: effects };
}

// ── Palette Resolver (Phase 6.3) ────────────────────────────
export function resolvePalette(input: VisualInput, rng: ReturnType<typeof makeRng>): ResolvedVisual['palette'] {
  const base = BASES_SOURCE[input.baseId];
  let p = { ...base.palette };

  // stage 1: mutation (seeded)
  const m = Math.floor((rng.next() - 0.5) * 40);
  p = { base: shiftChannels(p.base, m, m, m), accent: shiftChannels(p.accent, m, m, m), dark: p.dark };

  // stage 2: effect modifiers (deterministic stacking)
  for (const id of input.effectIds) {
    const eff = EFFECTS_SOURCE[id];
    if (!eff) continue;
    const [er, eg, eb] = hexToRgb(eff.paletteModifier);
    const [br, bg, bb] = hexToRgb(p.base);
    p.base = rgbToHex((br + er) / 2, (bg + eg) / 2, (bb + eb) / 2);
  }

  // stage 3: rarity modifier — v1 rarity from seed (later from breeding stats)
  const rarity = rng.next();
  if (rarity > 0.9) p = { ...p, base: shiftChannels(p.base, 30, 30, -10), accent: '#fff7ed' }; // "golden"

  return p;
}

// ── Geometry Resolver (Phase 6.4) ───────────────────────────
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function resolveGeometry(extra: ExtraSource, rng: ReturnType<typeof makeRng>): { scale: number; rotation: number } {
  const scale = clamp(
    extra.scaleRules.min + rng.next() * (extra.scaleRules.max - extra.scaleRules.min),
    extra.scaleRules.min, extra.scaleRules.max
  );
  const rotation = extra.rotationRules.min + rng.next() * (extra.rotationRules.max - extra.rotationRules.min);
  return { scale, rotation };
}

// ── Layer Resolver (Phase 6.5) ──────────────────────────────
export function resolveVisual(inputRaw: VisualInput): ResolvedVisual {
  const input = resolveCompatibility(inputRaw);
  const base = BASES_SOURCE[input.baseId];

  // every stage uses its own derived child seed — deterministic, replayable
  const rngStage = (salt: number) => makeRng('visual', deriveSeed(input.visualSeed, 'visual', 'stage', salt, 1));

  const palette = resolvePalette(input, rngStage(1));

  const layers: ResolvedLayer[] = [];
  const rngGeom = rngStage(2);

  // base layers bottom-first
  for (const key of base.layers) {
    const layerRng = makeRng('visual', deriveSeed(input.visualSeed, 'visual', key, 3, 1));
    layers.push({
      key,
      anchor: { x: 0, y: 0 },
      scale: 0.95 + layerRng.next() * 0.1,
      rotation: (layerRng.next() - 0.5) * 0.06,
      color: palette.base,
      outline: palette.dark,
    });
  }

  // extras on their anchors
  for (const id of input.extraIds) {
    const extra = EXTRAS_SOURCE[id];
    if (!extra) continue;
    const { scale, rotation } = resolveGeometry(extra, rngGeom);
    const anchorKey = (extra.anchor === 'left' || extra.anchor === 'right') ? 'center' : extra.anchor;
    const anchor = base.anchors[anchorKey];
    layers.push({
      key: extra.asset,
      anchor,
      scale,
      rotation,
      color: extra.paletteRules === 'contrast' ? palette.accent
           : extra.paletteRules === 'accent' ? shiftChannels(palette.base, 40, 20, -20)
           : palette.base,
      outline: palette.dark,
    });
  }

  // effect tint layer on top
  if (input.effectIds.length > 0) {
    const eff = EFFECTS_SOURCE[input.effectIds[0]];
    layers.push({
      key: 'effect_tint',
      anchor: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      color: eff.paletteModifier,
      outline: 'transparent',
    });
  }

  // Gesamt-Skala: Genom-Stärke → 0.85–1.15, seeded Jitter ±0.05, geklemmt 0.85–1.25
  // (Kästchenblock-CGI §4: Skala ist Aussage — aus der Quelle, nie Renderer-Zufall).
  const rngScale = rngStage(4);
  const strength = clamp01(input.strength ?? 0.4 + rngScale.next() * 0.2);
  const scale = clamp(0.85 + strength * 0.3 + (rngScale.next() - 0.5) * 0.1, 0.85, 1.25);

  // variantKey: stable identity for persistence/discovery
  const variantKey = [
    input.baseId,
    ...input.extraIds,
    ...input.effectIds,
    input.visualSeed.toString(36),
  ].join('|');

  return {
    version: 1,
    visualSeed: input.visualSeed,
    visualVersion: 1,
    baseId: input.baseId,
    extraIds: input.extraIds,
    effectIds: input.effectIds,
    layers,
    scale,
    outline: palette.dark,
    palette,
    animation: base.animationProfile,
    variantKey,
  };
}

// re-exports for observer/renderer use
export { BASES_SOURCE, EXTRAS_SOURCE, EFFECTS_SOURCE };

// ── B4: Genome → ResolvedVisual (Brücke über genome/visualMap) ──────────────
// Jede gezüchtete Variante erhält eine DISTINKTE Silhouette + Palette + Tint,
// deterministisch aus Genom + Seed abgeleitet (Test locked). Das Gen→Extra/Effect-
// Mapping lebt in config/genes.source.ts, die Ableitung in genome/visualMap.ts.

export function resolveBredVisuals(variants: readonly PlantVariant[], rootSeed: number): Map<string, ResolvedVisual> {
  const visuals = new Map<string, ResolvedVisual>();
  for (const variant of variants) {
    visuals.set(variant.id, resolveVisual(genomeToVisualInput(variant, rootSeed)));
  }
  return visuals;
}

/**
 * Vorschau-Farbe für Zucht-/Hub-Screens (B27/B26). EINE Quelle für beide Screens: dieselbe
 * Ableitung wie das Feld (`genomeToVisualInput → resolveVisual → palette.base`), damit die
 * Karte im Gewächshaus nicht mehr über einen flachen `variant.color`-String lügt.
 *
 * `rootSeed` bleibt Parameter, weil der Run-Seed erst beim Run-Start entsteht: die Vorschau
 * bindet an `GAME_SEED`, der Run resolves über seinen Run-Seed — beide Wege nutzen aber exakt
 * diese Pipeline, und beide lesen dasselbe Paar aus `GENE_PAIRS`.
 */
export function previewColor(variant: PlantVariant, rootSeed: number): string {
  return resolveVisual(genomeToVisualInput(variant, rootSeed)).palette.base;
}
