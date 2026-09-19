// Owner: DiscoveryCodex (Migration). LOC ≤ 100.
// Migration v1 → v2 (P2, plan-discovery-chain.md): Einträge der alten Struktur (ohne
// epoch_id/type/schema_version) sind EPOCHE-0-GRÜNDER — ihre Wurzel war die Konstante
// GAME_SEED, sie sind nach Epoche 0 nachrechenbar.
//
// HASH-SEMANTIK (der entscheidende Vertrag, vom eigenen Test erzwungen): Ein v1-Gründer trägt
// seinen entry_hash OHNE die neuen Felder; sobald die Felder gesetzt sind, rechnet verifyChain
// MIT ihnen nach — der alte Hash bricht. Der additiv-konditionale Payload (chain.ts#entryPayload)
// schützt nur Einträge, die die Felder NIE bekommen. Deshalb ist die Migration eine NEUVERKETTUNG:
// jede Kette mit mindestens einem v1-Glied wird als GANZE im v2-Schema neu gehasht und neu
// verkettet — die Kette bleibt kryptografisch intakt, nur unter dem neuen Schema. Das ist der
// dokumentierte Gründer-Bruch aus dem Plan (D2-Muster), kein stiller.
//
// Eigenes Modul, weil der Vertrag BEIDE Seiten betrifft: das Speicherformat (codex.ts) und
// die Hash-Semantik (chain.ts#entryPayload) — keins von beiden allein ist die Migration.

import { hashEntry, type DiscoveryEntry, type DiscoveryEntryType } from './chain';

/** Hebt eine Kette auf Schema v2 — mit Neuverkettung, falls v1-Glieder darin sind. */
export function migrateV1Entries(chain: DiscoveryEntry[]): DiscoveryEntry[] {
  if (!Array.isArray(chain)) return [];

  // Vollständige v2-Kette: nichts zu tun (idempotent).
  const complete = chain.every(
    (e) => e.epoch_id !== undefined && e.type !== undefined && e.schema_version !== undefined,
  );
  if (complete) return chain;

  // v1-Glieder anreichern …
  const enriched = chain.map((e) => ({
    ...e,
    epoch_id: e.epoch_id ?? 0,
    type: (e.type ?? 'cross') as DiscoveryEntryType,
    schema_version: (e.schema_version ?? 2) as 2,
  }));

  // … und die Kette als GANZE neu hashen und verketten (Gründer-Bruch, dokumentiert).
  let prev: string | null = null;
  return enriched.map((e) => {
    const { entry_hash: _drop, ...rest } = e;
    const next: DiscoveryEntry = { ...rest, prev_hash: prev, entry_hash: '' };
    next.entry_hash = hashEntry(next);
    prev = next.entry_hash;
    return next;
  });
}
