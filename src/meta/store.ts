import type { MetaSave, PlantVariant, PendingBrood, BeetleSpecimen } from '../types';
import { load, save, remove } from '../persistence/storage';
import { APP_VERSION } from '../version';
import { STARTER_PLANT_COUNT, STARTING_NEKTAR, GREENHOUSE_POT_SLOTS, REARING_SLOTS_START, REARING_SLOTS_MAX } from '../config/economy.source';
import { STARTING_MATERIAL } from '../config/map.source';
import { createBaseVariants } from '../genome/bases';
import { genomeEffectIds } from '../genome/visualMap';
import { ballisticsOf } from '../genome/ballistics';

// Owner: PersistenceSystem (meta store — the only persistence owner remains storage.ts).

export const META_KEY = 'lifegamelab_meta';
export const META_VERSION = 9;

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
    version: 9,
    appVersion: APP_VERSION,
    nektar: STARTING_NEKTAR,
    bestWave: 0,
    runs: 0,
    runId: 0,
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

/**
 * FAIRES STARTMATERIAL — JEDEM Profil genau einmal (19.09.2026).
 *
 * Die Gabe ist ein BODEN, kein Geschenk pro Load: `max(Bestand, STARTING_MATERIAL[key])` für
 * jedes Profil, das das Flag noch nicht trägt. Damit bekommt ein Altsave oder ein Stand mitten
 * aus der Einführung des Besitz-Modells die Bauphase zurück, OHNE dass jemand reicher wird
 * (wer schon mehr besitzt, behält seine Zahl) — und ein Profil, das sein Material verbaut hat,
 * wird NICHT bei jedem Load neu ausgestattet: verbautes Material ist in der Karte, nicht weg.
 */
function grantStartingMaterial(
  counts: Record<string, number>,
  granted: unknown,
): { counts: Record<string, number>; granted: boolean } {
  if (granted === true) return { counts, granted: true };
  const out: Record<string, number> = { ...counts };
  for (const [key, amount] of Object.entries(STARTING_MATERIAL)) {
    out[key] = Math.max(out[key] ?? 0, amount);
  }
  return { counts: out, granted: true };
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
  const option1 = (raw.runs ?? 0) * (raw.runId ?? 0) + (raw.breedGeneration ?? 0);
  const option2 = (raw.totalWavesSurvived ?? 0) * 2 + (raw.breedGeneration ?? 0);
  const used = [
    ...broods.map(b => b.broodIndex),
    ...beetles.map(b => b.generation).filter((g): g is number => typeof g === 'number' && Number.isFinite(g)),
  ];
  const maxUsed = used.length > 0 ? Math.max(...used) : 0;
  return Math.max(option1, option2, maxUsed) + 1;
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
    pots: sanitizePots(raw.pots),
    seedlings: Array.isArray(raw.seedlings) ? raw.seedlings.filter((s): s is string => typeof s === 'string') : [],
  };
}

/** Topf-Feld normalisieren: genau GREENHOUSE_POT_SLOTS Slots, `null` oder bekannte ID. */
function sanitizePots(raw: unknown): (string | null)[] {
  const arr = Array.isArray(raw) ? raw : [];
  const pots: (string | null)[] = [];
  for (let i = 0; i < GREENHOUSE_POT_SLOTS; i++) {
    const v = arr[i];
    pots.push(typeof v === 'string' && v.length > 0 ? v : null);
  }
  return pots;
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
  return {
    ...meta,
    variantCounts: material.counts,
    materialGranted: material.granted,
    rearingSlots: slots,
    pots: sanitizePots(meta.pots),
    seedlings: Array.isArray(meta.seedlings) ? meta.seedlings.filter((s): s is string => typeof s === 'string') : [],
  };
}

export function loadMeta(): MetaSave {
  // B17: Invarianten werden bei JEDEM Load hergestellt, nicht nur bei der Migration. Die
  // Storage-Schicht reicht Saves der aktuellen Version unverändert durch — eine Heilung nur im
  // Migrationspfad liefe für genau die Saves nie, die sie brauchen.
  return healEntryLoop(normalizeRipeness(load<MetaSave>(META_KEY, {
    version: META_VERSION,
    migrate,
    fallback: defaultMeta,
  })));
}

export function persistMeta(meta: MetaSave): void {
  // Produktversion beim JEDEN Schreiben aktualisieren — sie zeigt, mit welcher App-Fassung
  // dieser Stand zuletzt geschrieben wurde (Altsave-Diagnose, Support-Fälle).
  save(META_KEY, { ...meta, appVersion: APP_VERSION }, META_VERSION);
}

export function updateMeta(patch: Partial<MetaSave>): MetaSave {
  const next = { ...loadMeta(), ...patch };
  persistMeta(next);
  return next;
}

export function resetMeta(): void {
  remove(META_KEY);
}
