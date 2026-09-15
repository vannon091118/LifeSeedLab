// Owner: VisualGeneratorSystem. LOC ≤ 400.
// SOURCE + visualSeed = ResolvedVisual. Fully deterministic; uses ONLY 'visual'
// namespace RNG. Never reads or advances gameplay RNG (contract Phase 6.6).

import { makeRng, deriveSeed } from '../core/rng';
import { BASES_SOURCE, type BaseId, type BaseSource } from '../config/bases.source';
import { EXTRAS_SOURCE, type ExtraId, type ExtraSource } from '../config/extras.source';
import { EFFECTS_SOURCE, type EffectId } from '../config/effects.source';

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
  shadow: { scale: number; alpha: number };
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
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function shift(hex: string, dr: number, dg: number, db: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + dr, g + dg, b + db);
}

export function resolvePalette(input: VisualInput, rng: ReturnType<typeof makeRng>): ResolvedVisual['palette'] {
  const base = BASES_SOURCE[input.baseId];
  let p = { ...base.palette };

  // stage 1: mutation (seeded)
  const m = Math.floor((rng.next() - 0.5) * 40);
  p = { base: shift(p.base, m, m, m), accent: shift(p.accent, m, m, m), dark: p.dark };

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
  if (rarity > 0.9) p = { ...p, base: shift(p.base, 30, 30, -10), accent: '#fff7ed' }; // "golden"

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
           : extra.paletteRules === 'accent' ? shift(palette.base, 40, 20, -20)
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

  const shadow = { scale: 0.9, alpha: 0.25 };

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
    shadow,
    outline: palette.dark,
    palette,
    animation: base.animationProfile,
    variantKey,
  };
}

/** Convenience: resolve for a base with deterministic random extras/effects. */
export function generateVisualForBase(baseId: BaseId, visualSeed: number): ResolvedVisual {
  const rng = makeRng('visual', deriveSeed(visualSeed, 'visual', 'compose', baseId, 1));
  const base = BASES_SOURCE[baseId];
  if (!base) throw new Error(`Unknown base ${baseId}`);

  // deterministic candidate selection
  const extraCount = rng.nextInt(0, 2);
  const pool = Object.values(EXTRAS_SOURCE).filter(e =>
    e.compatibility.includes('*') || e.compatibility.includes(baseId)
  );
  const extraIds: ExtraId[] = [];
  for (let i = 0; i < extraCount && pool.length > 0; i++) {
    const picked = rng.pick(pool);
    if (!extraIds.includes(picked.id)) extraIds.push(picked.id);
  }
  const effectId = rng.pick(base.allowedEffects) as EffectId;

  return resolveVisual({ baseId, extraIds, effectIds: [effectId], visualSeed });
}

// re-exports for observer/renderer use
export { BASES_SOURCE, EXTRAS_SOURCE, EFFECTS_SOURCE };

// ── B4: Genome → VisualInput ─────────────────────────────────
// Jede gezüchtete Variante erhält eine DISTINKTE Silhouette + Palette + Tint,
// deterministisch aus Genom + Seed abgeleitet (Test locked).
// Gen→Extra/Effect-Mapping lebt in config/genes.source.ts (SOURCE = CONTENT TRUTH).

import type { PlantVariant } from '../types';
import { GENE_TO_EXTRA, GENE_TO_EFFECT } from '../config/genes.source';

const TYPE_BASES: Record<PlantVariant['type'], BaseId[]> = {
  shooter: ['BASE_THORN', 'BASE_FROND', 'BASE_FLOWER'],
  wall: ['BASE_ROOT', 'BASE_CACTUS'],
  support: ['BASE_MUSHROOM', 'BASE_PUFF'],
};

export function genomeToVisualInput(variant: PlantVariant, rootSeed: number): VisualInput {
  // type → base, deterministic pick among role-appropriate bases via genome hash
  const geneHash = variant.genome.reduce((h, g) => h ^ strHash(`${g.id}:${g.power.toFixed(3)}`), 0) >>> 0;
  const bases = TYPE_BASES[variant.type];
  const baseId = bases[geneHash % bases.length];

  // top-2 genes by power → extras (compatibility filtered by resolveVisual)
  const extras: ExtraId[] = [];
  for (const g of [...variant.genome].sort((a, b) => b.power - a.power)) {
    const e = GENE_TO_EXTRA[g.id];
    if (e && !extras.includes(e)) extras.push(e);
    if (extras.length >= 2) break;
  }

  // strongest gene → effect tint
  const strongest = [...variant.genome].sort((a, b) => b.power - a.power)[0];
  const effectId = strongest ? GENE_TO_EFFECT[strongest.id] : undefined;

  const visualSeed = deriveSeed(rootSeed, 'visual', variant.id, geneHash, 1);
  // Genom-Stärke = Ø Gene-Power (Kästchenblock-CGI: Skala ist Aussage, aus der Quelle)
  const strength = variant.genome.length > 0
    ? variant.genome.reduce((s, g) => s + g.power, 0) / variant.genome.length
    : 0.4;
  return {
    baseId,
    extraIds: extras,
    effectIds: effectId ? [effectId] : [],
    visualSeed,
    strength,
  };
}

export function resolveBredVisuals(variants: readonly PlantVariant[], rootSeed: number): Map<string, ResolvedVisual> {
  const visuals = new Map<string, ResolvedVisual>();
  for (const variant of variants) {
    visuals.set(variant.id, resolveVisual(genomeToVisualInput(variant, rootSeed)));
  }
  return visuals;
}

import { strHash } from '../core/rng';
import type { Genome } from '../types';

/** Top-2 gene → EFFECT ids (used by bredStats + projectile effect riding — B6). */
export function genomeEffectIds(genome: Genome): EffectId[] {
  const out: EffectId[] = [];
  for (const g of [...genome].sort((a, b) => b.power - a.power)) {
    const e = GENE_TO_EFFECT[g.id];
    if (e && !out.includes(e)) out.push(e);
    if (out.length >= 2) break;
  }
  return out;
}
