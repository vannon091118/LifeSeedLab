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
import type { SimState } from '../simulation/state';
import { SimulationRoot, type RootInit } from '../simulation/root';
import { makeCommand, type CommandPayloads } from '../bus/commands';
import { deriveSeed } from '../core/rng';
import { GAME_SEED, RUN_SEED_VERSION } from '../config';

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

/** Projektion eines SimStates in die hashbare Teilmenge (Identität der Snapshot-Contract).
 *  Eine Quelle statt dreier Kopien (snapshot.ts#toHashable, gateB, sim — P3-Review). */
export function stateToHashable(state: SimState): HashableState {
  return {
    seed: state.seed,
    clock: state.clock,
    wave: { number: state.wave.number },
    resources: { energy: state.resources.energy },
    plants: state.plants.map(p => ({ id: p.id, gx: p.gx, gy: p.gy, hp: p.hp, variantId: p.variantId, lastShot: p.lastShot })),
    enemies: state.enemies.map(e => ({ id: e.id, hp: e.hp, px: e.px, py: e.py, pathIndex: e.pathIndex })),
    projectiles: state.projectiles.map(p => ({ id: p.id, px: p.px, py: p.py, dx: p.dx, dy: p.dy })),
    score: state.score,
    combo: state.combo,
  };
}

/** Hash über die hashbare Projektion (Bequemlichkeit für Testdateien). */
export function hashOfRoot(root: SimulationRoot): string {
  return hashState(stateToHashable(root.getSnapshot()));
}

/**
 * Reserviert die nächste Run-Identität auf der Meta-Wahrheit (Muster aus
 * meta/run.ts#reserveRunId) und liefert daraus den Run-Seed nach App.tsx-Muster.
 */
export function makeRunSeed(runId: number): number {
  return deriveSeed(GAME_SEED, 'world', 'run', runId, RUN_SEED_VERSION);
}

export interface MakeRunOptions {
  runId?: number;
  /** Weitere RootInit-Zusätze (loadout, beetles, resume, …) — wird 1:1 durchgereicht. */
  init?: Partial<RootInit>;
}

/**
 * Deterministische SimulationRoot-Erzeugung im echten Run-Kontext:
 * runId (Default wie reserveRunId: max(meta.runId, meta.runs) + 1) → Seed
 * via deriveSeed(GAME_SEED,'world','run',runId,RUN_SEED_VERSION).
 * Frischer Run ohne Meta (nach resetTestState) ⇒ runId 1 ⇒ Seed 2447771834.
 */
export function makeRun(options: MakeRunOptions = {}): SimulationRoot {
  const meta = loadMeta();
  const runId = options.runId ?? Math.max(meta.runId, meta.runs) + 1;
  const seed = makeRunSeed(runId);
  return new SimulationRoot({ seed, runId, ...(options.init ?? {}) });
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
 * Einfacher Command-Push im bewährten Testmuster: Tick 0, Lauf-Seq, Payload.
 * (Adversarial-Review P1: die makeCommand-Signatur ist vierstellig — ein Kit-Helfer
 * verhindert, dass jede konsolidierte Datei die Argumentreihenfolge neu errät.)
 */
export function pushCommand<K extends Parameters<typeof makeCommand>[1]>(
  root: SimulationRoot,
  type: K,
  payload: CommandPayloads[K],
  seq: number = 1,
): void {
  root.commands.push(makeCommand(0, type, seq, payload));
}
