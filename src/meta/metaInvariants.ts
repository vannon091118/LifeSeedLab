// Owner: Meta (Speicher-Invarianten — Altsave-Heilung, abgeleitete Zähler). LOC ≤ 200.
// Extraktion aus store.ts: diese Helfer sind reine Funktionen über Rohdaten (kein I/O,
// kein Meta-State) — store.ts behält Laden/Schreiben/Objekt-Zusammenbau, hier wohnt die
// „was ist ein gültiger Stand"-Wahrheit. Testbare Einheit ohne Storage-Abhängigkeit.

import type { MetaSave, PendingBrood, BeetleSpecimen } from '../types';
import { GREENHOUSE_POT_SLOTS } from '../config/economy.source';
import { STARTING_MATERIAL } from '../config/map.source';

/** Legacy-Basen-IDs (vor der PLANTS_SOURCE-Vereinheitlichung) → kanonische PlantTypeId. */
const LEGACY_BASE_ID: Record<string, 'sprout' | 'rootwall' | 'mycelia'> = {
  base_shooter: 'sprout', base_wall: 'rootwall', base_support: 'mycelia',
};

export function canonicalVariantId(id: string): string {
  return LEGACY_BASE_ID[id] ?? id;
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
export function grantStartingMaterial(
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

export function sanitizeCounts(raw: unknown, fallback: Record<string, number>): Record<string, number> {
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
export function deriveBroodGeneration(raw: Partial<MetaSave>, broods: PendingBrood[], beetles: BeetleSpecimen[]): number {
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
export function healRipeness<T extends { startedWave: number }>(entries: T[], totalWavesSurvived: number): T[] {
  return entries.map((entry) =>
    entry.startedWave > totalWavesSurvived ? { ...entry, startedWave: totalWavesSurvived } : entry,
  );
}

/** Topf-Feld normalisieren: genau GREENHOUSE_POT_SLOTS Slots, `null` oder bekannte ID. */
export function sanitizePots(raw: unknown): (string | null)[] {
  const arr = Array.isArray(raw) ? raw : [];
  const pots: (string | null)[] = [];
  for (let i = 0; i < GREENHOUSE_POT_SLOTS; i++) {
    const v = arr[i];
    pots.push(typeof v === 'string' && v.length > 0 ? v : null);
  }
  return pots;
}
