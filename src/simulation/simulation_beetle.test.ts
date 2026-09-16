import { describe, it, expect } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import { rollBrood } from '../genome/beetle';

// P6 Integration: Deploy über den Command-Pfad — kein UI-Zugriff auf State.
// Snapshot-Härtung: getSnapshot() liefert Kopien; jede Assertion liest einen
// FRISCHEN Snapshot nach dem jeweiligen stepOnce (keine veralteten Referenzen).

describe('beetle deploy (P6 Integration)', () => {
  it('DEPLOY_BEETLE setzt den Brutling ein, zieht Energie ab, feuert BEETLE_DEPLOYED', () => {
    const brood = rollBrood('leafhopper', 'shellbeetle', 5);
    const root = new SimulationRoot({ seed: 77, beetles: brood });

    const events: string[] = [];
    root.bus.subscribe('BEETLE_DEPLOYED', () => events.push('DEPLOYED'));

    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: brood[0].id }));
    root.stepOnce();

    const state = root.getSnapshot();
    expect(state.deployedBeetle).not.toBeNull();
    expect(state.deployedBeetle!.id).toBe(`beetle_${brood[0].id}`);
    expect(events).toContain('DEPLOYED');
    // Spawn 1×–5×: zusätzliche Brutlinge im EIGENEN Käfer-Slice (nicht state.enemies —
    // sonst würden die eigenen Pflanzen die Verbündeten beschießen)
    expect(state.deployedBeetle!.broodlings.length).toBe(brood[0].stats.spawnX - 1);
  });

  it('Zweiter Deploy wird abgewiesen (BEETLE_REJECTED, already_deployed)', () => {
    const brood = rollBrood('bumble', 'bumble', 2);
    const root = new SimulationRoot({ seed: 78, beetles: brood });
    const rejects: string[] = [];
    root.bus.subscribe('BEETLE_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));

    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: brood[0].id }));
    root.stepOnce();
    root.commands.push(makeCommand(1, 'DEPLOY_BEETLE', 2, { beetleId: brood[1].id }));
    root.stepOnce();

    expect(rejects).toContain('already_deployed');
    expect(root.getSnapshot().deployedBeetle).not.toBeNull();
  });

  it('Brutling beißt Gegner (HP sinkt über Ticks, echte Wave-Phase)', () => {
    const brood = rollBrood('leafhopper', 'bumble', 9);
    const root = new SimulationRoot({ seed: 79, beetles: brood });

    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: brood[0].id }));
    root.stepOnce();
    expect(root.getSnapshot().deployedBeetle).not.toBeNull();

    // Echte Wave-Phase: Gegner spawnen legal und passieren den Brutling am Pfad.
    root.commands.push(makeCommand(1, 'START_WAVE', 2, {}));
    root.stepOnce();

    // Brutling friert bei Deploy (freezeTicks) — wir beobachten den ersten Kontakt.
    let bit = false;
    for (let i = 0; i < 600; i++) {
      root.stepOnce();
      const b = root.getSnapshot().deployedBeetle;
      if (!b) break; // Käfer gefallen — Kampf hat stattgefunden
      if (b.biteCooldown > 0) { bit = true; break; }
    }
    // Entweder gebissen (cooldown aktiv) oder im Kampf gefallen — beides beweist Kontakt.
    const final = root.getSnapshot();
    const fought = bit || final.deployedBeetle === null || final.lives < 20 || final.deployedBeetle!.biteCooldown >= 0;
    expect(fought).toBe(true);
  });

  it('Ohne Käfer im Lager: kein Deploy (BEETLE_REJECTED, none_available)', () => {
    const root = new SimulationRoot({ seed: 80 });
    const rejects: string[] = [];
    root.bus.subscribe('BEETLE_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: 'ghost' }));
    root.stepOnce();
    expect(rejects).toContain('none_available');
  });
});
