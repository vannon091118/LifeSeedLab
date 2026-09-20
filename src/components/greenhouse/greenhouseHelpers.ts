// Helper functions extracted from Greenhouse.tsx
import type { MetaSave, PlantVariant, PendingCross } from '../../types';
import type { GachaRoll } from '../../genome';
import { rollGachaCross, crossPair, deriveBreedSeed, createBaseVariants } from '../../genome';
import { consumeSeedAndEnqueueCross, keepCross, isCrossReady, plantSeedlingIntoPot, buyRearingSlot } from '../../meta';
import { wavesToUnlockFor, rearingSlotGate, REARING_SLOTS_MAX } from '../../config/economy.source';
import { helpText } from '../../i18n/help';
import { genomeToVisualInput } from '../../genome/visualMap';
import { GAME_SEED } from '../../config';
import type { TranslationKey } from '../../i18n';

const BASES: PlantVariant[] = createBaseVariants();

/** Besitz-Liste (kanonische IDs; Altsaves mit base_*-Counts bleiben sichtbar). */
export function useMemoOwned(meta: MetaSave): PlantVariant[] {
  return Object.keys(meta.variantCounts)
    .filter(id => (meta.variantCounts[id] ?? 0) > 0)
    .map(id => findVariant(id, meta))
    .filter((v): v is PlantVariant => v !== undefined);
}

/**
 * Nachkomme eines gepaarten Reifungs-Eintrags rekonstruieren: dieselben Eltern + dieselbe
 * Generation ⇒ dasselbe Kind (`crossPair` ist deterministisch aus beiden IDs abgeleitet).
 */
export function pairRollFor(c: PendingCross, meta: MetaSave): GachaRoll | null {
  const a = findVariant(c.parentAId ?? '', meta);
  const b = findVariant(c.parentBId ?? '', meta);
  if (!a || !b || a.id === b.id) return null;
  return crossPair(a, b, c.crossIndex);
}

/** Anzeigename einer Variant-ID — Besitz-Bibliothek zuerst, Fallback die ID. */
export function variantName(id: string, meta: MetaSave): string {
  return meta.savedVariants.find(v => v.id === id)?.name ?? id;
}

/** Variant-ID → Wesen: Grundpflanzen zuerst, dann die eigene Bibliothek (eine Suche, zwei Nutzer). */
export function findVariant(id: string, meta: MetaSave): PlantVariant | undefined {
  return BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id);
}