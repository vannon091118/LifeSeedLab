import type { MetaSave, PlantVariant, PendingBrood, BeetleSpecimen } from '../types';
import { load, save, remove } from '../persistence/storage';
import { APP_VERSION } from '../version';
import { STARTER_PLANT_COUNT, STARTING_NEKTAR, GREENHOUSE_POT_SLOTS, REARING_SLOTS_START, REARING_SLOTS_MAX } from '../config/economy.source';
import {
  canonicalVariantId, grantStartingMaterial, sanitizeCounts, deriveBroodGeneration,
  healRipeness, sanitizePots,
} from './metaInvariants';
import { STARTING_MATERIAL } from '../config/map.source';
import { EPOCH_ROOT, RUN_SEED_VERSION } from '../config';
import { deriveSeed } from '../core/rng';
import { createBaseVariants } from '../genome/bases';
import { genomeEffectIds } from '../genome/visualMap';
import { ballisticsOf } from '../genome/ballistics';

// Owner: PersistenceSystem (meta store — the only persistence owner remains storage.ts).

export const META_KEY = 'lifegamelab_meta';
export const META_VERSION = 10;


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
    // Ballistik wird HIER abgeleitet, nicht im Run: nur am Eintrag ist das Genom verfügbar
    // (`SimState` trägt bewusst kein Genom), und der Run bleibt deterministisch über Zeit.
    ballistics: ballisticsOf(variant.genome, variant.type),
  };
}

export function defaultMeta(): MetaSave {
  // Einstiegs-Loop: KEINE Gratis-PFLANZEN mehr. Der neue Spieler hat leere Hände — Krix leiht
  // den Spross (meta/loan.ts, deterministisch), das Startkapital reicht für GENAU EINEN
  // eigenen Samen. Der alte Pauschal-Besitz (STARTER_PLANT_COUNT) entwertete Leihe, Kauf
  // und Gewächshaus: Es gab nie einen Grund, den Loop zu betreten.
  //
  // FAIRES STARTMATERIAL (Besitz-Modell, 19.09.2026): Bau-Material ist keine Run-Gabe mehr,
  // sondern BESITZ — deshalb bekommt es jedes Profil genau einmal hier. Ohne diesen Start
  // wäre die Bauphase (der Kern des Spiels) auf einer leeren Karte tot, und die Shop-Preise
  // hätten kein Gegenstück in einem Konto.
  return {
    version: 10,
    appVersion: APP_VERSION,
    nektar: STARTING_NEKTAR,
    bestWave: 0,
    runs: 0,
    runId: 0,
    runSeed: EPOCH_ROOT,
    breedGeneration: 0,
    variantCounts: { ...STARTING_MATERIAL },
    materialGranted: true,
    savedVariants: [],
    loadout: [],
    language: 'en',
    audioOn: true,
    pvpPayouts: 0,
    seedStash: 0,
    pendingCrosses: [],
    rearingSlots: REARING_SLOTS_START,
    totalWavesSurvived: 0,
    bredStats: {},
    // R2: mapLayouts gestorben — die Spielerwelt lebt im WorldSave (eine Quelle).
    beetles: [],
    beetleDeployed: null,
    pendingBroods: [],
    broodGeneration: 0,
    // B21.3: 0 = nie gesehen. Altsaves bekommen die aktuelle Tour genau einmal.
    tutorialVersion: 0,
    // Einstiegs-Loop: drei leere Töpfe, keine unverteilten Keimlinge.
    pots: Array<string | null>(GREENHOUSE_POT_SLOTS).fill(null),
    seedlings: [],
  };
}

/** B17: Reifungs-Invarianten für einen geladenen Save (idempotent, reine Ableitung).
 *
 * Bewusst NICHT enthalten: ein Nachschub für Pflanzen. Dass Basis-Pflanzen beim Kreuzen auf 0  * gehen können, ist als Vertrag test-gelockt (`cross_lifecycle.test.ts`) und damit eine Design-Frage
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
  // v9: das faire Startmaterial ist Besitz — Altsaves bekommen es hier genau einmal.
  const granted = grantStartingMaterial(
    sanitizeCounts(raw.variantCounts, base.variantCounts),
    raw.materialGranted,
  );
  // v6 kannte nur „gesehen: ja/nein". Das Ja wird zur Fassung 1 (die alte Run-Tour) —
  // damit sieht auch ein Bestandsspieler die überarbeitete Tour genau einmal.
  const legacySeen = (raw as { tutorialDone?: boolean }).tutorialDone === true;
  return {
    ...base,
    nektar: typeof raw.nektar === 'number' ? raw.nektar : base.nektar,
    bestWave: typeof raw.bestWave === 'number' ? raw.bestWave : 0,
    runs: typeof raw.runs === 'number' ? raw.runs : 0,
    runId: typeof raw.runId === 'number' ? raw.runId : 0,
    runSeed: typeof raw.runSeed === 'number' && Number.isFinite(raw.runSeed)
      ? raw.runSeed
      : deriveSeed(EPOCH_ROOT, 'world', 'run', typeof raw.runId === 'number' ? raw.runId : 0, RUN_SEED_VERSION),
    breedGeneration: typeof raw.breedGeneration === 'number' ? raw.breedGeneration : 0,
    // Besitz-Modell-Heilung: ein Save aus der Zeit VOR dem Besitz-Modell kennt kein Material
    // (die Map-Pools waren Run-Gaben) — der bekommt das faire Startmaterial genau einmal.
    // Danach entscheidet allein sein Bestand.
    variantCounts: granted.counts,
    materialGranted: granted.granted,
    savedVariants: Array.isArray(raw.savedVariants) ? raw.savedVariants : [],
    loadout: Array.isArray(raw.loadout) ? raw.loadout : [],
    language: raw.language === 'de' ? 'de' : 'en',
    audioOn: raw.audioOn !== false,
    pvpPayouts: typeof raw.pvpPayouts === 'number' ? raw.pvpPayouts : 0,
    seedStash: typeof raw.seedStash === 'number' ? Math.max(0, raw.seedStash) : 0,
    pendingCrosses: Array.isArray(raw.pendingCrosses) ? raw.pendingCrosses : [],
    totalWavesSurvived: typeof raw.totalWavesSurvived === 'number' ? raw.totalWavesSurvived : 0,
    // R2: mapLayouts aus Altsaves wird verworfen — die Welt ist WorldSave-Besitz, nicht Meta.
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
    // Einstiegs-Loop: Altsaves ohne Topf-Feld starten mit drei leeren Töpfen —
    // Kapazitätsgrenze kommt aus der Source, nie aus dem Save selbst.
    pots: sanitizePots(raw.pots), // Topf-Normalisierung lebt in metaInvariants
    seedlings: Array.isArray(raw.seedlings) ? raw.seedlings.filter((s): s is string => typeof s === 'string') : [],
  };
}

function migrate(raw: unknown, fromVersion: number): MetaSave | null {
  // Obergrenze = META_VERSION - 1. Ein Save der AKTUELLEN Version läuft hier nie an
  // (storage.ts reicht ihn roh durch) — jedes ältere muss durch `toCurrent`.
  if (fromVersion < 1 || fromVersion >= META_VERSION) return null;
  const old = raw as Partial<MetaSave> & { version?: number };
  if (typeof old.nektar !== 'number') return null;
  return toCurrent(defaultMeta(), old);
}

/**
 * Q6 (QA 2026-09-17): Einstiegs-Loop-Felder bei JEDEM Load heilen, nicht nur im Migrationspfad.
 * resolveVersion reicht Saves der GLEICHEN Envelope-Version roh durch (storage.ts) — ein
 * v0.0.37-Save ohne pots/seedlings lief sonst als undefined ins Greenhouse (Crash).
 * Idempotent, reine Invarianten-Reparatur (B17-Muster).
 */
function healEntryLoop(meta: MetaSave): MetaSave {
  // Zucht-Sprint 19.09.2026: `rearingSlots` ist eine Invariante (3..12) — Altsaves ohne das Feld
  // bekommen den Startwert, kaputte Werte werden geklemmt (kein `undefined` im Gewächshaus).
  const slots = typeof meta.rearingSlots === 'number' && Number.isFinite(meta.rearingSlots)
    ? Math.min(REARING_SLOTS_MAX, Math.max(REARING_SLOTS_START, Math.floor(meta.rearingSlots)))
    : REARING_SLOTS_START;
  // v9: dasselbe Muster für das Startmaterial — die Heilung deckt Saves ab, die nie durch die
  // Migration liefen (gleiche Envelope-Version, Feld fehlt). Idempotent über das Flag.
  const material = grantStartingMaterial(meta.variantCounts ?? {}, meta.materialGranted);
  const runSeed = typeof meta.runSeed === 'number' && Number.isFinite(meta.runSeed)
    ? meta.runSeed
    : deriveSeed(EPOCH_ROOT, 'world', 'run', meta.runId, RUN_SEED_VERSION);
  return {
    ...meta,
    variantCounts: material.counts,
    materialGranted: material.granted,
    runSeed,
    rearingSlots: slots,
    pots: sanitizePots(meta.pots),
    seedlings: Array.isArray(meta.seedlings) ? meta.seedlings.filter((s): s is string => typeof s === 'string') : [],
  };
}

function hasUniqueCrosses(meta: MetaSave): boolean {
  const crosses = new Set(meta.pendingCrosses.map(c => c.crossIndex));
  const broods = new Set(meta.pendingBroods.map(b => b.broodIndex));
  return crosses.size === meta.pendingCrosses.length && broods.size === meta.pendingBroods.length;
}

export function loadMeta(): MetaSave {
  // B17: Invarianten werden bei JEDEM Load hergestellt, nicht nur bei der Migration. Die
  // Storage-Schicht reicht Saves der aktuellen Version unverändert durch — eine Heilung nur im
  // Migrationspfad liefe für genau die Saves nie, die sie brauchen.
  const loaded = healEntryLoop(normalizeRipeness(load<MetaSave>(META_KEY, {
    version: META_VERSION,
    migrate,
    fallback: defaultMeta,
  })));
  // Ein doppelter Queue-Identifier ist keine reparierbare Mehrdeutigkeit: der erste Treffer
  // würde entscheiden, welche Buchung ein Claim verbraucht. Fail-closed statt first-match.
  return hasUniqueCrosses(loaded) ? loaded : defaultMeta();
}

export function persistMeta(meta: MetaSave): import('../persistence/storage').WriteResult {
  // Produktversion beim JEDEN Schreiben aktualisieren — sie zeigt, mit welcher App-Fassung
  // dieser Stand zuletzt geschrieben wurde (Altsave-Diagnose, Support-Fälle).
  return save(META_KEY, { ...meta, appVersion: APP_VERSION }, META_VERSION);
}

export function updateMetaResult(patch: Partial<MetaSave>): { ok: boolean; meta: MetaSave } {
  const next = { ...loadMeta(), ...patch };
  const write = persistMeta(next);
  return { ok: write.status === 'written', meta: next };
}

export function updateMeta(patch: Partial<MetaSave>): MetaSave {
  return updateMetaResult(patch).meta;
}

export function resetMeta(): void {
  remove(META_KEY);
}
