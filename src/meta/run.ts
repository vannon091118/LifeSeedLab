import type { MetaSave, PendingBrood, PlantVariant } from '../types';
import { loadMeta, updateMeta, persistMeta, deriveBredEntry } from './store';
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

export function registerVariant(variant: PlantVariant): MetaSave {
  const meta = loadMeta();
  // Kanonische ID (Altsaves mit base_*-Eltern erzeugen sonst Geister-Varianten)
  const canonical: PlantVariant = { ...variant, id: canonicalVariantId(variant.id) };
  const counts = { ...meta.variantCounts };
  counts[canonical.id] = (counts[canonical.id] || 0) + 1;
  let library = meta.savedVariants;
  if (!library.some(v => v.id === canonical.id)) {
    library = [...library, canonical];
    if (library.length > 60) {
      const dropped = library.slice(0, library.length - 60);
      for (const d of dropped) delete counts[d.id];
      library = library.slice(library.length - 60);
    }
  }
  // B1-Verkabelung: Zucht-Stats beim Besitz-Eintrag ableiten (früher nie geschrieben —
  // gezüchtete Pflanzen waren im Run dadurch unplatzierbar).
  const withCounts = updateMeta({ variantCounts: counts, savedVariants: library });
  const bredStats = { ...withCounts.bredStats, [canonical.id]: deriveBredEntry(canonical) };
  return updateMeta({ bredStats });
}

/**
 * B1 „Keep" einer Kreuzung: verbraucht je 1× beider Eltern und registriert das Kind.
 * Ohne diesen Verbrauch wäre Zucht unbegrenzt wiederholbar (dieselben Eltern, beliebig viele
 * Nachkommen). Rückgabe null ⇒ Elternbestand reicht nicht — dann passiert nichts.
 */
export function keepCross(child: PlantVariant, parentAId: string, parentBId: string): MetaSave | null {
  const meta = loadMeta();
  const a = canonicalVariantId(parentAId);
  const b = canonicalVariantId(parentBId);
  const costA = a === b ? 2 : 1;
  if ((meta.variantCounts[a] ?? 0) < costA || (meta.variantCounts[b] ?? 0) < 1) return null;

  const counts = { ...meta.variantCounts };
  counts[a] = (counts[a] ?? 0) - costA;
  if (a !== b) counts[b] = (counts[b] ?? 0) - 1;
  updateMeta({ variantCounts: counts });
  return registerVariant(child);
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
  const broodIndex = meta.pendingBroods.reduce((m, p) => Math.max(m, p.broodIndex), -1) + 1;
  return updateMeta({
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
  const rolled = rollBrood(pending.specimenAId, pending.specimenBId, pending.broodIndex);
  const chosen = rolled[chosenIndex] ?? rolled[0];
  if (!chosen) return meta;
  const beetles = [...meta.beetles, chosen];
  const capped = beetles.length > 40 ? beetles.slice(beetles.length - 40) : beetles;
  return updateMeta({
    beetles: capped,
    pendingBroods: meta.pendingBroods.filter(p => p.broodIndex !== broodIndex),
  });
}

/** Brut, deren Reifung abgelaufen ist (UI fragt nach totalWavesSurvived). */
export function readyBroods(meta: MetaSave): PendingBrood[] {
  return meta.pendingBroods.filter(p => meta.totalWavesSurvived - p.startedWave >= p.neededWaves);
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
