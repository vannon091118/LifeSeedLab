// Owner: DiscoveryCodex (Migration). LOC ≤ 100.
//
// ZWEI MIGRATIONEN, EIN VERTRAG: Jede Struktur-Änderung an einem Eintrag ändert seinen
// `entry_hash`, weil der gehashte Payload die Feldnamen selbst enthält (`chain.ts#entryPayload`).
// Beide Schritte sind deshalb NEUVERKETTUNGEN: die Kette wird als GANZE im neuen Schema neu
// gehasht und neu verkettet — kryptografisch intakt, nur unter dem neuen Schema. Der Bruch ist
// dokumentiert, nicht still.
//
//   v1 → v2 (`migrateV1Entries`): Einträge ohne epoch_id/type/schema_version sind
//     EPOCHE-0-GRÜNDER — ihre Wurzel war die Konstante GAME_SEED, sie sind nach Epoche 0
//     nachrechenbar. Der Schritt REICHERT AN und lässt das damalige Feld `plant_hmac` stehen.
//
//   v2 → v3 (`migrateToPlantRef`, Befund 20.09.2026): Das Feld hieß nach einem HMAC, war aber
//     ein schlüsselloser FNV-Mischwert. Der Name steht im gehashten Payload, also ist die
//     Umbenennung nicht kosmetisch: Feld umbenennen, Wert-Präfix `ph-` → `pr-` und neu
//     verketten. Gründer-Einträge (nur `seed`) bleiben inhaltlich unberührt und wandern nur
//     auf Schema v3.
//
// Eigenes Modul, weil der Vertrag BEIDE Seiten betrifft: das Speicherformat (codex.ts) und
// die Hash-Semantik (chain.ts#entryPayload) — keins von beiden allein ist die Migration.

import { hashEntry, type DiscoveryEntry, type DiscoveryEntryType } from './chain';

/** Zwischenform der v1-Anreicherung: Struktur v2, Identitäts-Feld noch `plant_hmac`. */
interface EnrichedV2 {
  epoch_id: number;
  type: DiscoveryEntryType;
  schema_version: 2;
  plant_hmac?: string;
}

/**
 * Hebt eine Kette auf die v2-Anreicherung (epoch_id/type vorhanden) — mit Neuverkettung,
 * falls v1-Glieder darin sind. Das Feld `plant_hmac` bleibt absichtlich stehen: der nächste
 * Schritt (`migrateToPlantRef`) ist sein Eigentümer.
 */
export function migrateV1Entries(chain: DiscoveryEntry[]): DiscoveryEntry[] {
  if (!Array.isArray(chain)) return [];

  const legacy = chain as unknown as (Record<string, unknown> & Partial<EnrichedV2>)[];
  // Vollständige v2-Kette: nichts zu tun (idempotent). Die drei Felder gemeinsam sind das
  // Merkmal der Anreicherung — fehlt EINES, war der Eintrag v1.
  const complete = legacy.every(
    (e) => e.epoch_id !== undefined && e.type !== undefined && e.schema_version !== undefined,
  );
  if (complete) return chain;

  const enriched: EnrichedV2[] = legacy.map((e) => ({
    ...(e as unknown as EnrichedV2),
    epoch_id: e.epoch_id ?? 0,
    type: (e.type ?? 'cross') as DiscoveryEntryType,
    schema_version: 2,
  }));

  // … und die Kette als GANZE neu hashen und verketten (Gründer-Bruch, dokumentiert).
  return rechain(enriched as unknown as Omit<DiscoveryEntry, 'entry_hash'>[]);
}

/**
 * Hebt eine Kette auf Schema v3 (`plant_ref` statt `plant_hmac`).
 *
 * Zwei Änderungen pro Eintrag: der Feldname wandert (er ist Teil des Hashes, deshalb reicht
 * Umbenennen nicht) und der Wert-Präfix `ph-` wird zu `pr-`. Idempotent — Vollständigkeit heißt
 * hier v3 UND kein Eintrag trägt noch das alte Feld.
 */
export function migrateToPlantRef(chain: DiscoveryEntry[]): DiscoveryEntry[] {
  if (!Array.isArray(chain)) return [];

  const entries = chain as unknown as (Record<string, unknown> & { schema_version?: number })[];
  const complete = entries.every((e) => e.schema_version === 3 && e.plant_hmac === undefined);
  if (complete) return chain;

  const renamed = entries.map((entry) => {
    const oldRef = typeof entry.plant_hmac === 'string' ? entry.plant_hmac : undefined;
    // `ph-` → `pr-`: nur der Präfix ändert sich, der Mischwert bleibt derselbe Beleg.
    const plant_ref = oldRef === undefined ? undefined : `pr-${oldRef.replace(/^ph-/, '')}`;
    const { plant_hmac: _drop, ...rest } = entry;
    const next: Record<string, unknown> = { ...rest, schema_version: 3, plant_ref };
    // Gründer-Einträge (nur `seed`) dürfen kein leeres `plant_ref` tragen: verifyChain verlangt
    // GENAU EINE Identitäts-Form, und ein `undefined`-Feld wäre keine.
    if (plant_ref === undefined) delete next.plant_ref;
    return next;
  });

  return rechain(renamed as unknown as Omit<DiscoveryEntry, 'entry_hash'>[]);
}

/** EINE Neuverkettung für beide Schritte: von vorn nach hinten hashen, prev_hash mitschreiben. */
function rechain(entries: Omit<DiscoveryEntry, 'entry_hash'>[]): DiscoveryEntry[] {
  let prev: string | null = null;
  return entries.map((entry) => {
    const next = { ...entry, prev_hash: prev, entry_hash: '' } as DiscoveryEntry;
    next.entry_hash = hashEntry(next);
    prev = next.entry_hash;
    return next;
  });
}
