import type { MetaSave, PlantVariant } from '../types';
import { loadMeta, updateMeta, persistMeta } from './store';

// Owner: PersistenceSystem (meta run/variant ops). LOC ≤ 200.

export function reserveRunId(meta: MetaSave): MetaSave {
  const runId = Math.max(meta.runId, meta.runs) + 1;
  return { ...meta, runId };
}

export function applyRunEnd(meta: MetaSave, waveReached: number, nektarEarned: number): MetaSave {
  return {
    ...meta,
    nektar: meta.nektar + nektarEarned,
    bestWave: Math.max(meta.bestWave, waveReached),
    runs: meta.runs + 1,
    runId: meta.runId,
  };
}

export function recordRunEnd(waveReached: number, nektarEarned: number): MetaSave {
  const meta = loadMeta();
  const next = applyRunEnd(meta, waveReached, nektarEarned);
  persistMeta(next);
  return next;
}

export function registerVariant(variant: PlantVariant): MetaSave {
  const meta = loadMeta();
  const counts = { ...meta.variantCounts };
  counts[variant.id] = (counts[variant.id] || 0) + 1;
  let library = meta.savedVariants;
  if (!library.some(v => v.id === variant.id)) {
    library = [...library, variant];
    if (library.length > 60) {
      const dropped = library.slice(0, library.length - 60);
      for (const d of dropped) delete counts[d.id];
      library = library.slice(library.length - 60);
    }
  }
  return updateMeta({ variantCounts: counts, savedVariants: library });
}

export function toggleLoadout(variantId: string): MetaSave {
  const meta = loadMeta();
  const inLoadout = meta.loadout.includes(variantId);
  let next: string[];
  if (inLoadout) next = meta.loadout.filter(id => id !== variantId);
  else {
    if (meta.loadout.length >= 4) return meta;
    next = [...meta.loadout, variantId];
  }
  return updateMeta({ loadout: next });
}
