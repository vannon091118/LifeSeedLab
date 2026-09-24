// Owner: TestKit (testing). LOC ≤ 200.
// EINZIGER Owner der Test-Setup-Kapselung (B32.2/2): Dateien unter src/testing/
// sind reine Test-Infrastruktur — ausschließlich von *.test.ts zu importieren, nie
// aus Spielcode (Adversarial-Review P1: am Import-Graph hängt sonst Playwright).
// Bausteine: persistence/testDom.ts (Storage-Polyfill), meta/store.ts (resetMeta/loadMeta),
// core/ids.ts (resetIds). Kein zweiter localStorage-Zugriff (SEC-001 im Plan).

import { clearTestStorage, ensureLocalStorage } from '../persistence/testDom';
import { loadMeta, resetMeta } from '../meta/store';
import { resetIds } from '../core/ids';
import { fnv1a, hashState, type HashableState } from '../core/hash';
import { toHashable } from '../simulation/snapshot';
import type { SimState } from '../simulation/state';
import { SimulationRoot, type RootInit } from '../simulation/root';
import { makeCommand, type CommandPayloads } from '../bus/commands';
import { deriveSeed } from '../core/rng';
import { EPOCH_ROOT, RUN_SEED_VERSION } from '../config';
import { createInitialWorld, worldSnapshotOf } from '../world/world_state';
export { testAttractorSpawn, testTraceCharge, testVectorDeposit } from './vectorHooks';

/** Leert Meta-Speicher + Test-Storage (Standard-Setup der meisten Tests). */
export function resetTestState(): void {
  resetMeta();
  clearTestStorage();
}

/** Wie resetTestState(), zusätzlich Zurücksetzen der stabilen ID-Zähler —
 *  für Tests, die ID-Sequenzen berühren (nextId-Konsumenten). */
export function resetFullTestState(): void {
  resetIds();
  resetTestState();
}

/** Schreibt einen Altsave-Envelope im LEGACY-Checksummen-Format
 *  (fnv über JSON.stringify — die Vor-kanonische-Serialisierung-Form).
 *  Eine Quelle statt Kopien in je Testdatei (Phase-2-Konsolidierung). */
export function writeLegacyEnvelope(key: string, data: unknown, v: number): void {
  const raw = JSON.stringify(data);
  ensureLocalStorage().setItem(key, JSON.stringify({ v, checksum: fnv1a(0x811c9dc5, raw), data }));
}

/** Projektion eines SimStates in die hashbare Teilmenge — DELEGIERT an den Produktions-Owner
 *  (simulation/snapshot.ts#toHashable). Vorher lagen in diesem Baum VIER Kopien derselben
 *  Projektion (snapshot, testkit, gateB, DevOverlay): wer ein Feld ergänzte, hätte drei vergessen
 *  können. Ein Feld, das der Hash nicht liest (`resources`), liegt dort jetzt nirgends mehr. */
export function stateToHashable(state: SimState): HashableState {
  return toHashable(state);
}

/** Hash über die hashbare Projektion (Bequemlichkeit für Testdateien). */
export function hashOfRoot(root: SimulationRoot): string {
  return hashState(stateToHashable(root.getSnapshot()));
}

/** Zell-Ansicht des Vektor-Felds (kanonisch sortiert) — dieselbe Projektion wie die
 *  Feld-Serialisierung der Vector-Gate-Suite, nur als Objekte statt String: So kann
 *  ein Golden-Hash-Drift die ERSTE abweichende Zelle benennen statt nur rot zu leuchten.
 *  Reine Leseprojektion (kein Schreiben, keine Simulation) — Test-Infrastruktur. */
export interface VectorCellView {
  key: string;
  vectorId: string;
  intensity: number;
  ttl: number;
}

export function vectorFieldCellsOf(root: SimulationRoot): VectorCellView[] {
  const s: Pick<SimState, 'vectors'> = root.getSnapshot();
  return Object.entries(s.vectors)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .flatMap(([key, cells]) => cells.map(c => ({ key, vectorId: c.vectorId, intensity: c.intensity, ttl: c.ttl })));
}

/** Erste Abweichung zwischen IST-Feld und SOLL-Feld (Golden-Anker) als Diagnose-Text.
 *  PRIVATVERTRAG: die Meldung enthält ausschließlich IST-Werte und Soll-Metrik
 *  (Zellanzahl) — der Sollwert selbst wird nie gedruckt, sonst ist die Maske ein Sieb
 *  (CI-Logs wären das Tuning-Futter, gegen das der private Anker existiert). */
export function describeFirstFieldDeviation(actual: VectorCellView[], expected: VectorCellView[]): string {
  const n = Math.max(actual.length, expected.length);
  for (let i = 0; i < n; i++) {
    const a = actual[i];
    const e = expected[i];
    const differs = !a || !e || a.key !== e.key || a.vectorId !== e.vectorId || a.intensity !== e.intensity || a.ttl !== e.ttl;
    if (differs) {
      const aStr = a ? `${a.key} ${a.vectorId} i=${a.intensity} ttl=${a.ttl}` : '— (fehlt im IST-Feld)';
      const local = actual.slice(Math.max(0, i - 2), i + 3).map(c => `${c.key} ${c.vectorId} i=${c.intensity} ttl=${c.ttl}`);
      return `erste abweichende Zelle @Index ${i} (IST): ${aStr} | Ist-Umfeld: [${local.join(' ; ')}] | Soll-Feld trägt ${expected.length} Zellen`;
    }
  }
  return '';
}

/**
 * Reserviert die nächste Run-Identität auf der Meta-Wahrheit (Muster aus
 * meta/run.ts#reserveRunId) und liefert daraus den Run-Seed nach App.tsx-Muster.
 */
export function makeRunSeed(runId: number): number {
  return deriveSeed(EPOCH_ROOT, 'world', 'run', runId, RUN_SEED_VERSION);
}

/**
 * R2: Root-Konstruktion für Tests — der Pflicht-Welt-Snapshot (initiale 12×12-Welt)
 * wird automatisch injiziert; Tests, die eine spezielle Welt brauchen, überschreiben
 * `worldSnapshot` explizit. Der produktive Pfad (gameRuntime) bleibt fail-closed.
 */
export function makeRoot(
  init: Omit<RootInit, 'worldSnapshot'> & Partial<Pick<RootInit, 'worldSnapshot'>>,
): SimulationRoot {
  return new SimulationRoot({
    ...init,
    worldSnapshot: init.worldSnapshot ?? worldSnapshotOf(createInitialWorld()),
  } as RootInit);
}

interface MakeRunOptions {
  runId?: number;
  /** Weitere RootInit-Zusätze (loadout, beetles, resume, …) — wird 1:1 durchgereicht. */
  init?: Partial<RootInit>;
}

/**
 * Deterministische SimulationRoot-Erzeugung im echten Run-Kontext:
 * runId (Default wie reserveRunId: max(meta.runId, meta.runs) + 1) → Seed
 * via deriveSeed(EPOCH_ROOT,'world','run',runId,RUN_SEED_VERSION).
 * Frischer Run ohne Meta (nach resetTestState) ⇒ runId 1 ⇒ Seed 2447771834.
 */
export function makeRun(options: MakeRunOptions = {}): SimulationRoot {
  const meta = loadMeta();
  const runId = options.runId ?? Math.max(meta.runId, meta.runs) + 1;
  const seed = makeRunSeed(runId);
  // R2: ohne Welt kein Run — Tests bekommen die initiale Welt (12×12, leer),
  // sofern `init` nichts anderes vorgibt (worldSpot is Pflichtfeld).
  const init = options.init ?? {};
  return new SimulationRoot({
    seed, runId, ...init,
    worldSnapshot: init.worldSnapshot ?? worldSnapshotOf(createInitialWorld()),
   });
}

/**
 * Führt exakt n deterministische Ticks aus (Kernel von stepOnce, das Muster des
 * Dev-Test-Hooks `__ff(n)`) und liefert den Tick-Stand der Uhr.
 */
export function drainTicks(root: SimulationRoot, n: number): number {
  for (let i = 0; i < n; i++) root.stepOnce();
  return root.clock.get().tick;
}

/**
 * Führt exakt n deterministische Ticks aus, um Befehle zu verarbeiten (nach dem Muster von __ff(1)).
 * entspricht dem Command-Drain nach `__ff(1)`-Muster.
 */

/**
 * Einfacher Command-Push im bewährten Testmuster: Tick 0, Lauf-Seq, Payload.
 * (Adversarial-Review P1: die makeCommand-Signatur ist vierstellig — ein Kit-Helfer
 * verhindert, dass jede konsolidierte Datei die Argumentreihenweise neu errät.)
 */
export function pushCommand<K extends Parameters<typeof makeCommand>[1]>(
  root: SimulationRoot,
  type: K,
  payload: CommandPayloads[K],
  seq: number = 1,
): void {
  root.commands.push(makeCommand(0, type, seq, payload));
}