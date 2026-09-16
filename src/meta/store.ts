import type { MetaSave, PlantVariant, PendingBrood, BeetleSpecimen } from '../types';
import { load, save, remove } from '../persistence/storage';
import { STARTER_PLANT_COUNT } from '../config/economy.source';
import { createBaseVariants } from '../genome/bases';
import { genomeEffectIds } from '../visual/generator';

// Owner: PersistenceSystem (meta store — the only persistence owner remains storage.ts).

export const META_KEY = 'lifegamelab_meta';
export const META_VERSION = 7;

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
    version: 7,
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
    broodGeneration: 0,
    // B21.3: 0 = nie gesehen. Altsaves bekommen die aktuelle Tour genau einmal.
    tutorialVersion: 0,
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

/**
 * Ableitung des monotonen Brut-Zählers für Altsaves (A13.1/B14.2).
 * Untere Schranke = höchste je vergebene Brut-Generation + 1, damit eine nach der Migration
 * erzeugte Brut keine bestehende Kennung wiederverwenden kann (kein Identitätsverlust).
 */
function deriveBroodGeneration(raw: Partial<MetaSave>, broods: PendingBrood[], beetles: BeetleSpecimen[]): number {
  const persisted = raw.broodGeneration;
  if (typeof persisted === 'number' && Number.isFinite(persisted)) {
    return Math.max(0, Math.floor(persisted));
  }
  const used = [
    ...broods.map(b => b.broodIndex),
    ...beetles.map(b => b.generation),
  ].filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  return (used.length > 0 ? Math.max(...used) : -1) + 1;
}

/**
 * B17: `startedWave` kann konstruktionsbedingt NIE in der Zukunft liegen — die Reifung zählt
 * `totalWavesSurvived - startedWave`, und der Zähler wächst nur. Altsaves können es trotzdem
 * (als der Reifungsschritt nur am `GAME_OVER` hing, während die UI ohne Zählerfortschritt
 * aussäen konnte): solche Einträge reifen NIE — genau das Bild „Samen keimen nicht".
 *
 * Der Load hebt sie auf die Wahrheit. Das ist eine Invarianten-Reparatur, keine Design-Entscheidung:
 * was nie in der Zukunft begonnen haben kann, wird auch nicht so geführt.
 */
function healRipeness<T extends { startedWave: number }>(entries: T[], totalWavesSurvived: number): T[] {
  return entries.map((entry) =>
    entry.startedWave > totalWavesSurvived ? { ...entry, startedWave: totalWavesSurvived } : entry,
  );
}

/** B17: Reifungs-Invarianten für einen geladenen Save (idempotent, reine Ableitung).
 *
 * Bewusst NICHT enthalten: ein Nachschub für Pflanzen. Dass Basis-Pflanzen beim Kreuzen auf 0
 * gehen können, ist als Vertrag test-gelockt (`keep.test.ts`) und damit eine Design-Frage
 * (Bestandsquelle: keimender Samen oder unerschöpfliches Saatgut) — siehe A19/B17 im quality-spec. */
function normalizeRipeness(meta: MetaSave): MetaSave {
  return {
    ...meta,
    pendingCrosses: healRipeness(meta.pendingCrosses ?? [], meta.totalWavesSurvived),
    pendingBroods: healRipeness(meta.pendingBroods ?? [], meta.totalWavesSurvived),
  };
}

function toCurrent(base: MetaSave, raw: Partial<MetaSave>): MetaSave {
  const broods = Array.isArray(raw.pendingBroods) ? raw.pendingBroods : [];
  const beetles = Array.isArray(raw.beetles) ? raw.beetles : [];
  // v6 kannte nur „gesehen: ja/nein". Das Ja wird zur Fassung 1 (die alte Run-Tour) —
  // damit sieht auch ein Bestandsspieler die überarbeitete Tour genau einmal.
  const legacySeen = (raw as { tutorialDone?: boolean }).tutorialDone === true;
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
    beetles,
    beetleDeployed: raw.beetleDeployed ?? null,
    pendingBroods: broods,
    // v5 (A13.1): monotoner Zähler, aus Altdaten einmalig abgeleitet.
    broodGeneration: deriveBroodGeneration(raw, broods, beetles),
    // v6/v7 (B21.3): Altsaves kennen kein Onboarding ⇒ es läuft einmal (Datenverlust ist hier keiner).
    tutorialVersion: typeof raw.tutorialVersion === 'number'
      ? Math.max(0, Math.floor(raw.tutorialVersion))
      : (legacySeen ? 1 : 0),
  };
}

function migrate(raw: unknown, fromVersion: number): MetaSave | null {
  if (fromVersion < 1 || fromVersion > 6) return null;
  const old = raw as Partial<MetaSave> & { version?: number };
  if (typeof old.nektar !== 'number') return null;
  return toCurrent(defaultMeta(), old);
}

export function loadMeta(): MetaSave {
  // B17: Invarianten werden bei JEDEM Load hergestellt, nicht nur bei der Migration. Die
  // Storage-Schicht reicht Saves der aktuellen Version unverändert durch — eine Heilung nur im
  // Migrationspfad liefe für genau die Saves nie, die sie brauchen.
  return normalizeRipeness(load<MetaSave>(META_KEY, {
    version: META_VERSION,
    migrate,
    fallback: defaultMeta,
  }));
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
