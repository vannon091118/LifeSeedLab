import type { MetaSave, PendingBrood, PlantVariant } from '../types';
import { loadMeta, updateMeta, persistMeta, deriveBredEntry } from './store';
import { isCrossReady, isMatured } from './economy';
import { rollBrood, resolveAncestor, type BeetleParentRef } from '../genome/beetle';
import { BEETLE_BREED } from '../config/beetles.source';
import { deriveLoanPlant, LOAN_PLANT_ID } from './loan';
import { resumeCostFor } from '../config/economy.source';

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

/**
 * Fortsetzen bezahlen: 25 Nektar je erreichter Welle, ohne Cap (Entscheidung 19.09.2026).
 * Ein Abbruch BEENDET den Lauf — es gibt kein kostenloses Wiedereinsteigen. Fail-closed: reicht
 * der Nektar nicht, bleibt der Save unverändert und es wird NICHT fortgesetzt.
 */
export function payRunResume(waveNumber: number): MetaSave | null {
  const meta = loadMeta();
  const cost = resumeCostFor(waveNumber);
  if (meta.nektar < cost) return null;
  return updateMeta({ nektar: meta.nektar - cost });
}

export function reserveRunId(meta: MetaSave): MetaSave {
  const runId = Math.max(meta.runId, meta.runs) + 1;
  // Loadout auch auf kanonische IDs heben (Altsaves mit base_*-Loadout).
  const loadout = meta.loadout.map(canonicalVariantId);
  return { ...meta, runId, loadout };
}

/**
 * B17/A19: Run-Start auf der **persistierten Wahrheit**.
 *
 * Vorher reservierte der Router (`App.tsx`) die `runId` auf seinem React-State und schrieb diesen
 * State zurück. Damit überschrieb jeder Run-Start alles, was während des laufenden Runs direkt in
 * die Persistenz geschrieben wurde, ohne über den React-State zu gehen — überstandene Wellen
 * (`advanceCrossMaturation`) und der Sprachwechsel (`i18n`) zum Beispiel. Sichtbar wurde das als
 * „keine Runde bringt was": der Fortschritt verschwand beim Start der nächsten.
 *
 * Regel: persistiert wird **nie eine Kopie** — jeder Meta-Schreibvorgang geht von `loadMeta()` aus.
 */
export function beginRun(): MetaSave {
  const reserved = reserveRunId(loadMeta());
  // Einstiegs-Leihe: Besitzt der Spieler KEINE eigene Pflanze, leiht Krix den Spross —
  // deterministisch aus der Chain (loan.ts), nie echter Besitz.
  const needsLoan = !Object.values(reserved.variantCounts).some(n => n > 0);
  const next = needsLoan
    ? { ...reserved, variantCounts: { ...reserved.variantCounts, [LOAN_PLANT_ID]: 1 } }
    : reserved;
  persistMeta(next);
  return next;
}

/**
 * B37: Run-End-Sync — der Restbestand des Run-Inventars ist der neue Besitz: Die Kette
 * „kaufen → einpflanzen → pflegen → ernten → Loadout" bleibt geschlossen. Positiv-Max:
 * Besitz schrumpft nie, weil ein Run ihn leer gefressen hat.
 */
export function applyRunEnd(meta: MetaSave, waveReached: number, nektarEarned: number, remainingInventory?: Record<string, number>): MetaSave {
  const counts = { ...meta.variantCounts };
  // Leih-Rückgabe ZUERST: der Leih-Spross ist nie Besitz — sein Restbestand aus dem
  // Run wird verworfen, nicht als Besitz gebucht. Nur EIGENE Pflanzen wandern zurück.
  delete counts[LOAN_PLANT_ID];
  if (remainingInventory) {
    for (const [id, n] of Object.entries(remainingInventory)) {
      if (n > 0 && id !== LOAN_PLANT_ID) counts[id] = Math.max(counts[id] ?? 0, n);
    }
  }
  return {
    ...meta,
    variantCounts: counts,
    nektar: meta.nektar + nektarEarned,
    bestWave: Math.max(meta.bestWave, waveReached),
    runs: meta.runs + 1,
    runId: meta.runId,
  };
}

export function recordRunEnd(waveReached: number, nektarEarned: number, remainingInventory?: Record<string, number>): MetaSave {
  const meta = loadMeta();
  const next = applyRunEnd(meta, waveReached, nektarEarned, remainingInventory);
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
  const library = meta.savedVariants.some(v => v.id === canonical.id)
    ? meta.savedVariants
    : [...meta.savedVariants, canonical];
  return {
    ...meta,
    variantCounts: counts,
    savedVariants: library,
    bredStats: { ...(meta.bredStats ?? {}), [canonical.id]: deriveBredEntry(canonical) },
  };
}

export function registerVariant(variant: PlantVariant): MetaSave {
  const next = applyRegisterVariant(loadMeta(), variant);
  persistMeta(next);
  return next;
}

/**
 * B19 „Keep" einer Kreuzung: registriert das Kind aus dem PERSISTIERTEN Queue-Eintrag und
 * bucht die Queue aus. Der Elternverbrauch ist best-effort (was da ist, wird gezogen) —
 * der Claim selbst hängt NUR an der globalen Reife (isMatured), nie am zufälligen
 * Eltern-Bestand: Schwesterkreuzungen konkurrieren sonst um dieselben Eltern und die
 * zweite verfällt, obwohl ihr Kind längst deterministisch feststeht.
 *
 * A18.2: `crossIndex` ist VERPFLICHTEND und wird HIER auf Reife geprüft (isCrossReady,
 * fail-closed). Die Ausbuchung ist nicht verhandelbar: das ist der EINZIGE Ort, an dem
 * die Warteschlange schrumpft (A13.12/B14.4).
 *
 * Alte Saves (vor B19) ohne persistiertes `child`: Fallback — Kind + Eltern aus dem Seed
 * über den aktuellen Bestand rekonstruieren (wie vor B19); schlägt das fehl (Bestand < 2
 * Varianten), gibt es kein Keep (null) — der historische parentsGone-Zustand bleibt.
 */
export function keepCross(child: PlantVariant, parentAId: string, parentBId: string, crossIndex: number): MetaSave | null {
  const meta = loadMeta();
  if (!isCrossReady(meta, crossIndex)) return null;
  const entry = meta.pendingCrosses.find(c => c.crossIndex === crossIndex);

  // B19-Pfad: Kind aus dem persistierten Eintrag (Autorität), Eltern-IDs ebenfalls.
  let resolvedChild = entry?.child ?? null;
  let a: string, b: string;
  if (resolvedChild && entry?.parentAId && entry?.parentBId) {
    a = canonicalVariantId(entry.parentAId);
    b = canonicalVariantId(entry.parentBId);
  } else {
    // Legacy-Fallback (Altsave ohne child): historischer Vertrag wie vor B19 —
    // Elternbestand ist eine Harte Bedingung (kein Kind ohne erreichbaren Wurf).
    a = canonicalVariantId(parentAId);
    b = canonicalVariantId(parentBId);
    const costA = a === b ? 2 : 1;
    if ((meta.variantCounts[a] ?? 0) < costA || (meta.variantCounts[b] ?? 0) < 1) return null;
    resolvedChild = child;
  }

  // B19: Elternverbrauch best-effort — was vorhanden ist, wird gezogen (nie unter 0).
  const counts = { ...meta.variantCounts };
  const costA = a === b ? 2 : 1;
  counts[a] = Math.max(0, (counts[a] ?? 0) - costA);
  if (a !== b) counts[b] = Math.max(0, (counts[b] ?? 0) - 1);

  const base: MetaSave = { ...meta, variantCounts: counts };
  const booked: MetaSave = { ...base, pendingCrosses: base.pendingCrosses.filter(c => c.crossIndex !== crossIndex) };
  // B14.5: Elternverbrauch + Queue-Ausbuchung + Kind-Registrierung + bredStats in EINEM
  // Persistenzschritt. Vorher drei Schreiber ⇒ Zwischenzustand „Eltern verbraucht, kein Kind".
  const next = applyRegisterVariant(booked, resolvedChild);
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
export function enqueueBrood(parentA: BeetleParentRef, parentB: BeetleParentRef, neededWaves: number): MetaSave {
  const meta = loadMeta();
  // QA-Befund v0.0.53 #2 („free beetle breeding", 3/3 reproduziert): die Brutstätte PRÜFTE den
  // Kontostand (`BeetleLab`), aber die Buchung fehlte hier — Brut war gratis, während der
  // Samen-Shop korrekt abbucht. Die Abbuchung gehört in den Meta-Writer, nicht in den Screen:
  // fail-closed wie `buySeed` (zu wenig Nektar ⇒ unveränderter Save, keine Queue, kein Zähler).
  if (meta.nektar < BEETLE_BREED.nektarCost) return meta;
  // R3: die Eltern werden als VORFAHREN (Genom + Generation) festgeschrieben. Ein übergebenes
  // Specimen bringt sein eigenes Genom mit — die Brut ist damit echte Nachzucht und keine
  // Neukombination der drei Gründer.
  const ancestorA = resolveAncestor(parentA);
  const ancestorB = resolveAncestor(parentB);
  if (!ancestorA || !ancestorB) return meta;
  // A13.1/B14.1: Die Brut-Generation kommt aus dem MONOTONEN Zähler — niemals aus
  // max(pendingBroods). Das Fenster schrumpft beim Claim; ein `max`-Wert würde den Index
  // recyceln, `rollBrood` bekäme denselben Seed und es entstünden doppelte Specimen-IDs.
  // Zähler und Eintrag werden im SELBEN Persistenzschritt geschrieben.
  const broodIndex = meta.broodGeneration;
  return updateMeta({
    nektar: meta.nektar - BEETLE_BREED.nektarCost,
    broodGeneration: broodIndex + 1,
    pendingBroods: [...meta.pendingBroods, {
      broodIndex, specimenAId: ancestorA.id, specimenBId: ancestorB.id,
      neededWaves, startedWave: meta.totalWavesSurvived, chosenIndex: -1,
      parentAAncestor: ancestorA, parentBAncestor: ancestorB,
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
  // R3: die festgeschriebenen Vorfahren sind die Wahrheit (Altsave: Auflösung über die IDs).
  const rolled = rollBrood(
    pending.parentAAncestor ?? pending.specimenAId,
    pending.parentBAncestor ?? pending.specimenBId,
    pending.broodIndex,
  );
  // A18.1: fail-closed — ein ungültiger Kandidaten-Index wählt NICHT stillschweigend 0.
  const chosen = rolled[chosenIndex];
  if (!chosen) return meta;
  // B16.8: keine Kappung des Brut-Lagers — Identität ist unverletzlich (dieselbe
  // Entscheidung wie für savedVariants; ein Cap hätte beetleDeployed verwaisen können).
  return updateMeta({
    beetles: [...meta.beetles, chosen],
    pendingBroods: meta.pendingBroods.filter(p => p.broodIndex !== broodIndex),
  });
}

/** Brut, deren Reifung abgelaufen ist — über dasselbe Kriterium wie die Pflanzen (A18.6). */
export function readyBroods(meta: MetaSave): PendingBrood[] {
  return meta.pendingBroods.filter(p => isMatured(p.startedWave, p.neededWaves, meta.totalWavesSurvived));
}

// R2: Das alte P5-Map-Layout-Konzept (saveMapLayout/loadMapLayout/listMapLayouts) ist
// GESTORBEN — es war eine tote Sammlung im Meta-Save ohne einen einzigen UI-Aufrufer.
// Die EINE persistente Spielerwelt lebt im WorldSave (persistence/worldSave.ts); Bau-
// Änderungen spiegelt der WorldAutor deterministisch aus den Bau-Events des Runs.
