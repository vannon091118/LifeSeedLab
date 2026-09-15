import type { MetaSave, PendingBrood, PlantVariant } from '../types';
import { loadMeta, updateMeta, persistMeta, deriveBredEntry } from './store';
import { isCrossReady, isMatured } from './economy';
import { rollBrood } from '../genome/beetle';

// Owner: PersistenceSystem (meta run/variant ops). LOC ≤ 200.

/** Alte Basis-IDs → kanonische PlantTypeId (Loadout/Variants bleiben kompatibel). */
export function canonicalVariantId(id: string): string {
  switch (id) {
    case 'base_shooter': return 'sprout';
    case 'base_wall': return 'rootwall';
    case 'base_support': return 'mycelia';
    default: return id;
  }
}

export function reserveRunId(meta: MetaSave): MetaSave {
  const runId = Math.max(meta.runId, meta.runs) + 1;
  // Loadout auch auf kanonische IDs heben (Altsaves mit base_*-Loadout).
  const loadout = meta.loadout.map(canonicalVariantId);
  return { ...meta, runId, loadout };
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

/**
 * Rein: nächster Meta-Zustand für ein registriertes Kind (kein Persistenzzugriff).
 * B1-Verkabelung: Zucht-Stats werden beim Besitz-Eintrag abgeleitet (früher nie geschrieben —
 * gezüchtete Pflanzen waren im Run dadurch unplatzierbar).
 */
function applyRegisterVariant(meta: MetaSave, variant: PlantVariant): MetaSave {
  // Kanonische ID (Altsaves mit base_*-Eltern erzeugen sonst Geister-Varianten)
  const canonical: PlantVariant = { ...variant, id: canonicalVariantId(variant.id) };
  const counts = { ...meta.variantCounts };
  counts[canonical.id] = (counts[canonical.id] || 0) + 1;
  let library = meta.savedVariants;
  let loadout = meta.loadout;
  const bred = { ...(meta.bredStats ?? {}) };
  if (!library.some(v => v.id === canonical.id)) {
    library = [...library, canonical];
    if (library.length > 60) {
      // A18.3: Kappung darf keine hängenden Referenzen hinterlassen — verdrängte IDs
      // werden konsequent aus counts, bredStats und loadout mitgeräumt. (Vorher:
      // Loadout referenzierte Phantom-Pflanzen, bredStats wuchs unbegrenzt.)
      const dropped = library.slice(0, library.length - 60);
      const droppedIds = new Set(dropped.map(d => d.id));
      for (const id of droppedIds) { delete counts[id]; delete bred[id]; }
      loadout = loadout.filter(id => !droppedIds.has(id));
      library = library.slice(library.length - 60);
    }
  }
  return {
    ...meta,
    variantCounts: counts,
    savedVariants: library,
    bredStats: { ...bred, [canonical.id]: deriveBredEntry(canonical) },
    loadout,
  };
}

export function registerVariant(variant: PlantVariant): MetaSave {
  const next = applyRegisterVariant(loadMeta(), variant);
  persistMeta(next);
  return next;
}

/**
 * B1 „Keep" einer Kreuzung: verbraucht je 1× beider Eltern und registriert das Kind.
 * Ohne diesen Verbrauch wäre Zucht unbegrenzt wiederholbar (dieselben Eltern, beliebig viele
 * Nachkommen). Rückgabe null ⇒ nicht reif oder Elternbestand reicht nicht — dann passiert nichts.
 *
 * A18.2: `crossIndex` ist VERPFLICHTEND und wird HIER auf Reife geprüft (isCrossReady,
 * fail-closed). Vorher war er optional — jeder Aufrufer konnte die Queue umgehen, und genau
 * das war als Vertrag test-gelockt. Die Ausbuchung ist nicht verhandelbar: das ist der
 * EINZIGE Ort, an dem die Warteschlange schrumpft (A13.12/B14.4) — jetzt wirklich.
 */
export function keepCross(child: PlantVariant, parentAId: string, parentBId: string, crossIndex: number): MetaSave | null {
  const meta = loadMeta();
  if (!isCrossReady(meta, crossIndex)) return null;
  const a = canonicalVariantId(parentAId);
  const b = canonicalVariantId(parentBId);
  const costA = a === b ? 2 : 1;
  if ((meta.variantCounts[a] ?? 0) < costA || (meta.variantCounts[b] ?? 0) < 1) return null;

  const counts = { ...meta.variantCounts };
  counts[a] = (counts[a] ?? 0) - costA;
  if (a !== b) counts[b] = (counts[b] ?? 0) - 1;
  const base: MetaSave = { ...meta, variantCounts: counts };
  const booked: MetaSave = { ...base, pendingCrosses: base.pendingCrosses.filter(c => c.crossIndex !== crossIndex) };
  // B14.5: Elternverbrauch + Queue-Ausbuchung + Kind-Registrierung + bredStats in EINEM
  // Persistenzschritt. Vorher drei Schreiber ⇒ Zwischenzustand „Eltern verbraucht, kein Kind".
  const next = applyRegisterVariant(booked, child);
  persistMeta(next);
  return next;
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

// ── P6: Käferzucht (Brüten) — eigene Meta-Operations, gleiche Persistenz-Owner ──

/** Reift: 3 Brutkandidaten wurden deterministisch gewürfelt, Spieler wählt einen. */
export function enqueueBrood(specimenAId: string, specimenBId: string, neededWaves: number): MetaSave {
  const meta = loadMeta();
  // A13.1/B14.1: Die Brut-Generation kommt aus dem MONOTONEN Zähler — niemals aus
  // max(pendingBroods). Das Fenster schrumpft beim Claim; ein `max`-Wert würde den Index
  // recyceln, `rollBrood` bekäme denselben Seed und es entstünden doppelte Specimen-IDs.
  // Zähler und Eintrag werden im SELBEN Persistenzschritt geschrieben.
  const broodIndex = meta.broodGeneration;
  return updateMeta({
    broodGeneration: broodIndex + 1,
    pendingBroods: [...meta.pendingBroods, {
      broodIndex, specimenAId, specimenBId,
      neededWaves, startedWave: meta.totalWavesSurvived, chosenIndex: -1,
    }],
  });
}

/** Brutling behalten (aus den 3 deterministischen Kandidaten). */
export function claimBrood(broodIndex: number, chosenIndex: number): MetaSave {
  const meta = loadMeta();
  const pending = meta.pendingBroods.find(p => p.broodIndex === broodIndex);
  if (!pending) return meta;
  // A18.1: Reife ist eine Meta-Entscheidung, keine UI-Frage — unreife Bruten werden
  // nicht ausgegeben, auch wenn eine Komponente es versucht (Verbotspunkt 3).
  if (!isMatured(pending.startedWave, pending.neededWaves, meta.totalWavesSurvived)) return meta;
  const rolled = rollBrood(pending.specimenAId, pending.specimenBId, pending.broodIndex);
  // A18.1: fail-closed — ein ungültiger Kandidaten-Index wählt NICHT stillschweigend 0.
  const chosen = rolled[chosenIndex];
  if (!chosen) return meta;
  const beetles = [...meta.beetles, chosen];
  const capped = beetles.length > 40 ? beetles.slice(beetles.length - 40) : beetles;
  return updateMeta({
    beetles: capped,
    pendingBroods: meta.pendingBroods.filter(p => p.broodIndex !== broodIndex),
  });
}

/** Brut, deren Reifung abgelaufen ist — über dasselbe Kriterium wie die Pflanzen (A18.6). */
export function readyBroods(meta: MetaSave): PendingBrood[] {
  return meta.pendingBroods.filter(p => isMatured(p.startedWave, p.neededWaves, meta.totalWavesSurvived));
}

// ── P5: Spieler-Maps (spielbarer Inhalt — Layout speichern/laden) ──

/** Speichert/überschreibt ein benanntes Map-Layout (gleiche Grundraster-Instanz für alle). */
export function saveMapLayout(name: string, tiles: Record<string, string>): MetaSave {
  return updateMeta({ mapLayouts: { ...loadMeta().mapLayouts, [name]: tiles } });
}

/** Liest ein Layout (null = unbekannt). Validierung macht der Caller über die Map-Source. */
export function loadMapLayout(name: string): Record<string, string> | null {
  return loadMeta().mapLayouts[name] ?? null;
}

/** Liste der gespeicherten Map-Namen (Map-Auswahl). */
export function listMapLayouts(): string[] {
  return Object.keys(loadMeta().mapLayouts);
}
