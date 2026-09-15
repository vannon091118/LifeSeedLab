import type { MetaSave, PlantVariant } from '../types';
import { load, save, remove } from '../persistence/storage';
import { STARTER_PLANT_COUNT } from '../config/economy.source';
import { createBaseVariants } from '../genome/bases';
import { genomeEffectIds } from '../visual/generator';

// Owner: PersistenceSystem (meta store — the only persistence owner remains storage.ts).

export const META_KEY = 'lifegamelab_meta';
export const META_VERSION = 4;

/** Legacy-Basen-IDs (vor der PLANTS_SOURCE-Vereinheitlichung) → kanonische PlantTypeId. */
const LEGACY_BASE_ID: Record<string, 'sprout' | 'rootwall' | 'mycelia'> = {
  base_shooter: 'sprout', base_wall: 'rootwall', base_support: 'mycelia',
};

function canonicalVariantId(id: string): string {
  return LEGACY_BASE_ID[id] ?? id;
}

export function starterVariants(): PlantVariant[] {
  return createBaseVariants().slice(0, STARTER_PLANT_COUNT);
}

/** Zucht-Stats EINE Quelle: beim Besitz-Eintrag abgeleitet (B1 — früher nie geschrieben,
 *  gezüchtete Pflanzen waren im Run dadurch unplatzierbar). Deterministisch aus dem Genom. */
export function deriveBredEntry(variant: PlantVariant): NonNullable<MetaSave['bredStats']>[string] {
  return {
    hp: variant.stats.hp,
    damage: variant.stats.damage,
    range: variant.stats.range,
    cooldown: variant.stats.cooldown,
    cost: variant.cost,
    effects: genomeEffectIds(variant.genome).map(e => String(e)),
  };
}

export function defaultMeta(): MetaSave {
  const starters = starterVariants();
  const counts: Record<string, number> = {};
  for (const v of starters) counts[v.id] = 1;
  return {
    version: 4,
    nektar: 60,
    bestWave: 0,
    runs: 0,
    runId: 0,
    breedGeneration: 0,
    variantCounts: counts,
    savedVariants: [],
    loadout: [],
    language: 'en',
    audioOn: true,
    pvpPayouts: 0,
    seedStash: 0,
    pendingCrosses: [],
    totalWavesSurvived: 0,
    bredStats: {},
    mapLayouts: {},
    beetles: [],
    beetleDeployed: null,
    pendingBroods: [],
  };
}

function sanitizeCounts(raw: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!raw || typeof raw !== 'object') return fallback;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    // Legacy-Basen-IDs auf kanonische PlantTypeId heben — kein Besitz geht verloren.
    const id = canonicalVariantId(k);
    if (typeof v === 'number' && v > 0) out[id] = (out[id] ?? 0) + Math.floor(v);
  }
  return out;
}

function toV3(base: MetaSave, raw: Partial<MetaSave>): MetaSave {
  return {
    ...base,
    nektar: typeof raw.nektar === 'number' ? raw.nektar : base.nektar,
    bestWave: typeof raw.bestWave === 'number' ? raw.bestWave : 0,
    runs: typeof raw.runs === 'number' ? raw.runs : 0,
    runId: typeof raw.runId === 'number' ? raw.runId : 0,
    breedGeneration: typeof raw.breedGeneration === 'number' ? raw.breedGeneration : 0,
    variantCounts: sanitizeCounts(raw.variantCounts, base.variantCounts),
    savedVariants: Array.isArray(raw.savedVariants) ? raw.savedVariants : [],
    loadout: Array.isArray(raw.loadout) ? raw.loadout : [],
    language: raw.language === 'de' ? 'de' : 'en',
    audioOn: raw.audioOn !== false,
    pvpPayouts: typeof raw.pvpPayouts === 'number' ? raw.pvpPayouts : 0,
    seedStash: typeof raw.seedStash === 'number' ? Math.max(0, raw.seedStash) : 0,
    pendingCrosses: Array.isArray(raw.pendingCrosses) ? raw.pendingCrosses : [],
    totalWavesSurvived: typeof raw.totalWavesSurvived === 'number' ? raw.totalWavesSurvived : 0,
    mapLayouts: raw.mapLayouts && typeof raw.mapLayouts === 'object' ? raw.mapLayouts : {},
    // P6: Käfer-Felder sind v4-neu — Altsaves starten mit leerem Brut-Lager.
    beetles: Array.isArray(raw.beetles) ? raw.beetles : [],
    beetleDeployed: raw.beetleDeployed ?? null,
    pendingBroods: Array.isArray(raw.pendingBroods) ? raw.pendingBroods : [],
  };
}

function migrate(raw: unknown, fromVersion: number): MetaSave | null {
  if (fromVersion !== 1 && fromVersion !== 2 && fromVersion !== 3) return null;
  const old = raw as Partial<MetaSave> & { version?: number };
  if (typeof old.nektar !== 'number') return null;
  return toV3(defaultMeta(), old);
}

export function loadMeta(): MetaSave {
  return load<MetaSave>(META_KEY, {
    version: META_VERSION,
    migrate,
    fallback: defaultMeta,
  });
}

export function persistMeta(meta: MetaSave): void {
  save(META_KEY, meta, META_VERSION);
}

export function updateMeta(patch: Partial<MetaSave>): MetaSave {
  const next = { ...loadMeta(), ...patch };
  persistMeta(next);
  return next;
}

export function resetMeta(): void {
  remove(META_KEY);
}
