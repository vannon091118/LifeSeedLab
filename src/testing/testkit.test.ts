// Owner: TestKit-Vertrag (B32.2/2). Stellt sicher, dass das Testkit die
// Determinismus-Garantien liefert, die die Konsolidierung (Plan Phase 1) darauf baut.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadMeta } from '../meta/store';
import { snapshotHash } from '../simulation/snapshot';
import { resetIds } from '../core/ids';
import {
  resetTestState,
  resetFullTestState,
  makeRun,
  makeRunSeed,
  drainTicks,
  pushCommand,
  vectorFieldCellsOf,
  describeFirstFieldDeviation,
} from './testkit';
import { testVectorDeposit } from './vectorHooks';

describe('TestKit — Kontrakt (B32.2)', () => {
  beforeEach(() => {
    resetFullTestState();
  });

  it('makeRun() ohne Meta reserviert runId 1 und leitet den dokumentierten Run-Seed ab', () => {
    const root = makeRun();
    const state = root.getSnapshot();
    expect(state.runId).toBe(1);
    expect(state.seed).toBe(makeRunSeed(1));
    expect(state.phase).toBe('layout'); // R1: der Run beginnt mit der Build-Sequenz
  });

  it('zwei makeRun(1)-Instanzen produzieren hash-identische SimStates (Determinismus)', () => {
    // RISK-001 (Plan): die ID-Zähler sind prozess-global — zwei Instanzen im selben
    // Prozess brauchen einen resetIds() dazwischen, sonst laufen die nextId-Sequenzen
    // weiter (plant-0002 statt plant-0001) und die Pflanzen-ID geht in den Hash ein.
    // Genau deshalb existiert resetFullTestState().
    const runStream = (root: ReturnType<typeof makeRun>) => {
      drainTicks(root, 4);
      pushCommand(root, 'PLACE_PLANT', { variantId: 'sprout', gx: 4, gy: 3 });
      drainTicks(root, 120);
    };

    const a = makeRun({ runId: 1 });
    runStream(a);
    const hashA = snapshotHash(a.getSnapshot());

    resetIds();
    const b = makeRun({ runId: 1 });
    runStream(b);
    const hashB = snapshotHash(b.getSnapshot());

    expect(hashA).toBe(hashB);
    expect(hashA.length).toBeGreaterThan(0);
  });

  it('resetTestState() entfernt alle Meta-Spuren (frischer Zustand je Test)', () => {
    loadMeta(); // erzeugt/initialisiert den Meta-Speicher
    resetTestState();
    const meta = loadMeta();
    expect(meta.runId).toBe(0);
    expect(meta.runs).toBe(0);
    expect(meta.savedVariants).toHaveLength(0);
  });

  it('drainTicks() läuft exakt n Ticks und liefert den Uhr-Stand', () => {
    const root = makeRun({ runId: 1 });
    const after = drainTicks(root, 10);
    expect(after).toBe(10);
    expect(root.getSnapshot().clock.tick).toBe(10);
  });

  it('makeRunSeed() ist eine reine Funktion — gleicher runId ⇒ gleicher Seed', () => {
    expect(makeRunSeed(1)).toBe(makeRunSeed(1));
    expect(makeRunSeed(2)).not.toBe(makeRunSeed(1));
  });

  it('resetFullTestState() setzt zusätzlich die ID-Zähler zurück (Sequenz-Identität)', () => {
    const a = makeRun({ runId: 1 });
    drainTicks(a, 5);
    resetFullTestState();
    const b = makeRun({ runId: 1 });
    drainTicks(b, 5);
    // Nach vollem Reset laufen dieselben n Ticks wieder auf denselben Hash.
    expect(snapshotHash(a.getSnapshot())).toBe(snapshotHash(b.getSnapshot()));
  });

  it('pushCommand() hält die makeCommand-Signatur an einer Stelle (Tick 0, Seq, Payload)', () => {
    const root = makeRun({ runId: 1 });
    pushCommand(root, 'PLACE_PLANT', { variantId: 'sprout', gx: 1, gy: 2 });
    const drained = root.commands.drain();
    expect(drained).toHaveLength(1);
    expect(drained[0].type).toBe('PLACE_PLANT');
    expect(drained[0].tick).toBe(0);
    // seq ist keine eigene Property — sie lebt in der commandId (cmd:{tick}:{type}:{seq}).
    expect(drained[0].commandId).toBe('cmd:0:PLACE_PLANT:1');
  });

  it('vectorFieldCellsOf + describeFirstFieldDeviation: erste Abweichung benannt, Meldung IST-only (Privatvertrag)', () => {
    const root = makeRun({ runId: 1 });
    pushCommand(root, 'START_WAVE', {});
    root.stepOnce(); // → phase 'wave' (Muster der Vector-Gate-Suite)
    testVectorDeposit(root, 4, 6, 'VECTOR_HEAT', 1.0);
    drainTicks(root, 1); // Deposit verarbeiten
    const cells = vectorFieldCellsOf(root);
    expect(cells.length).toBeGreaterThan(0);

    // Identische Felder ⇒ keine Diagnose.
    expect(describeFirstFieldDeviation(cells, [...cells])).toBe('');

    // Drift: der IST-Ableger trägt 0.42 — die Meldung zeigt den IST-Wert und die
    // Soll-Metrik (Zellanzahl), nie den Sollwert der abweichenden Zelle selbst.
    const driftedIst = cells.map((c, i) => (i === 0 ? { ...c, intensity: 0.42 } : { ...c }));
    const msg = describeFirstFieldDeviation(driftedIst, cells);
    expect(msg).toContain('@Index 0');
    expect(msg).toContain('0.42');
    expect(msg).toContain('VECTOR_HEAT');
    expect(msg).toContain(`Soll-Feld trägt ${cells.length} Zellen`);

    // Fehlende Seite: beide Richtungen werden benannt, ohne Soll-Inhalt zu drucken.
    expect(describeFirstFieldDeviation(cells, [])).toContain('Soll-Feld trägt 0 Zellen');
    const fehlt = describeFirstFieldDeviation([], cells);
    expect(fehlt).toContain('(fehlt im IST-Feld)');
    expect(fehlt).toContain(`Soll-Feld trägt ${cells.length} Zellen`);
  });
});
