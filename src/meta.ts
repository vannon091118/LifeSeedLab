import type { MetaSave, PlantVariant } from './types';

const META_KEY = 'lifegamelab_meta';

export function defaultMeta(): MetaSave {
  return {
    version: 1,
    nektar: 100,
    bestWave: 0,
    runs: 0,
    // base variants owned so the greenhouse is usable from the start
    variantCounts: { base_shooter: 2, base_wall: 2, base_support: 2 },
    savedVariants: [],
    language: 'en',
    pvpPayouts: 0,
  };
}

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    return { ...defaultMeta(), ...parsed, version: 1 as const };
  } catch {
    return defaultMeta();
  }
}

export function persistMeta(meta: MetaSave): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // storage full / private mode — meta just won't persist
  }
}

export function updateMeta(patch: Partial<MetaSave>): MetaSave {
  const next = { ...loadMeta(), ...patch };
  persistMeta(next);
  return next;
}

export function addNektar(amount: number): MetaSave {
  const meta = loadMeta();
  const next = { ...meta, nektar: Math.max(0, meta.nektar + amount) };
  persistMeta(next);
  return next;
}

export function recordRunEnd(waveReached: number, nektarEarned: number): MetaSave {
  const meta = loadMeta();
  const next: MetaSave = {
    ...meta,
    nektar: meta.nektar + nektarEarned,
    bestWave: Math.max(meta.bestWave, waveReached),
    runs: meta.runs + 1,
  };
  persistMeta(next);
  return next;
}

export function registerVariant(variant: PlantVariant): MetaSave {
  const meta = loadMeta();
  const counts = { ...meta.variantCounts };
  counts[variant.id] = (counts[variant.id] || 0) + 1;
  // keep library bounded: max 60 variants, drop oldest if exceeded
  let library = meta.savedVariants;
  if (!library.some(v => v.id === variant.id)) {
    library = [...library, variant];
    if (library.length > 60) {
      const dropped = library.slice(0, library.length - 60);
      for (const d of dropped) delete counts[d.id];
      library = library.slice(library.length - 60);
    }
  }
  const next: MetaSave = { ...meta, variantCounts: counts, savedVariants: library };
  persistMeta(next);
  return next;
}

export function resetMeta(): void {
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    // ignore
  }
}
