// Helper functions extracted from Greenhouse.tsx
import type { MetaSave, PlantVariant, PendingCross } from '../../types';
import type { GachaRoll } from '../../genome';
import { crossPair, createBaseVariants } from '../../genome';

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
  return crossPair(a, b, c.crossIndex, c.rootSeed);
}

/** Anzeigename einer Variant-ID — Besitz-Bibliothek zuerst, Fallback die ID. */
export function variantName(id: string, meta: MetaSave): string {
  return meta.savedVariants.find(v => v.id === id)?.name ?? id;
}

/** Variant-ID → Wesen: Grundpflanzen zuerst, dann die eigene Bibliothek (eine Suche, zwei Nutzer). */
export function findVariant(id: string, meta: MetaSave): PlantVariant | undefined {
  return BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id);
}