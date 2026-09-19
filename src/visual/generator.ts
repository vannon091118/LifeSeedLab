// Owner: VisualGeneratorSystem. LOC ≤ 400.
// SOURCE + visualSeed = ResolvedVisual. Fully deterministic; uses ONLY 'visual'
// namespace RNG (und auch das nur für abgeleitete Seeds, nie als geteilter Strom).
// Der Generator RESOLVED — er entscheidet nichts: die Anatomie kommt als Phänotyp herein
// (genome/plantPhenotype.ts), gezeichnet wird sie von render/plants.ts.
//
// R3-Neubaul: Der alte Baukasten (BASE-Silhouette + EXTRA-Ornament + Effekt-Tint) ist GESTORBEN.
// Er war der Flaschenhals des Spiels: „ein Gen ⇒ ein Extra" vernichtete Information, und zwei
// verschiedene Genome sahen gleich aus. Die Identität eines Wesens entsteht jetzt aus dem
// vollständigen Phänotyp.

import type { PlantPhenotype } from '../genome/plantPhenotype';
import { plantPhenotypeKey } from '../genome/plantPhenotype';
import type { EffectId } from '../config/effects.source';
import { EFFECTS_SOURCE } from '../config/effects.source';
import { shiftChannels } from '../core/color';
import type { PlantVariant } from '../types';
import { genomeToVisualInput } from '../genome/visualMap';

export interface ResolvedVisual {
  version: 1;
  visualSeed: number;
  /** Anatomie des Wesens — die EINE sichtbare Identität (kein Layer-Baukasten). */
  phenotype: PlantPhenotype;
  effectIds: EffectId[];
  /** Gesamt-Skala bleibt 1: die Größe steckt im Phänotyp (eine Aussage, ein Ort). */
  scale: number;
  outline: string;
  palette: { base: string; accent: string; dark: string };
  animation: 'sway' | 'bob' | 'pulse' | 'still';
  /** stabile Identität für Persistence/Discovery/Sprite-Cache. */
  variantKey: string;
}

export interface VisualInput {
  phenotype: PlantPhenotype;
  effectIds: EffectId[];
  visualSeed: number;
  /** Genom-Stärke 0..1 (Ø Gene-Power) — Balance-Anker, nicht mehr Zeichen-Input. */
  strength?: number;
}

/** Effekt-Tint über den Grundton (Gameplay-Effekt bleibt am Bild ablesbar). */
function tinted(base: string, effectIds: readonly EffectId[]): string {
  let color = base;
  for (const id of effectIds) {
    const eff = EFFECTS_SOURCE[id];
    if (!eff) continue;
    color = shiftChannels(color, 12, 6, 10);
  }
  return color;
}

export function resolveVisual(input: VisualInput): ResolvedVisual {
  const p = input.phenotype;
  const base = tinted(p.pigment.primary, input.effectIds);
  const animation: ResolvedVisual['animation'] =
    p.motion.style === 'pulse' ? 'pulse'
    : p.motion.style === 'still' ? 'still'
    : p.motion.style === 'whip' ? 'bob'
    : 'sway';

  return {
    version: 1,
    visualSeed: input.visualSeed,
    phenotype: p,
    effectIds: [...input.effectIds],
    scale: 1,
    outline: shiftChannels(base, -70, -66, -58),
    palette: {
      base,
      accent: p.pigment.accent,
      dark: shiftChannels(base, -70, -66, -58),
    },
    animation,
    variantKey: `plant|${plantPhenotypeKey(p)}`,
  };
}

/** Alle gezüchteten Varianten EINES Runs auflösen (EINE Ableitung, kein zweiter Pfad). */
export function resolveBredVisuals(variants: readonly PlantVariant[], rootSeed: number): Map<string, ResolvedVisual> {
  const visuals = new Map<string, ResolvedVisual>();
  for (const variant of variants) {
    visuals.set(variant.id, resolveVisual(genomeToVisualInput(variant, rootSeed)));
  }
  return visuals;
}

/**
 * Vorschau-Farbe für Hub-/Zucht-Screens — EINE Quelle mit dem Feld: dieselbe Ableitung
 * (Phänotyp → Pigment), damit eine Karte nie mehr über einen flachen Farb-String lügt.
 * `rootSeed` bleibt Parameter, weil der Run-Seed erst beim Run-Start entsteht.
 */
export function previewColor(variant: PlantVariant, rootSeed: number): string {
  return resolveVisual(genomeToVisualInput(variant, rootSeed)).palette.base;
}

export { EFFECTS_SOURCE };
