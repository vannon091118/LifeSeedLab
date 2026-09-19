import { describe, expect, it, beforeEach } from 'vitest';

// Owner: Meta-Tests — Sub-Domäne „MetaSave-Schema & Migrationen“ (B32.2/3).
// Konsolidierung Phase 2 (Plan: plan/refactor-test-suite-consolidation-1.md):
// onboarding.test.ts (B21 — Tour-Fassung MetaSave v7).
// Legacy-Envelope-Helfer kommt aus dem Testkit (eine Quelle statt Datei-Kopien).

import { resetTestState, writeLegacyEnvelope } from '../testing/testkit';
import { ensureLocalStorage } from '../persistence/testDom';
import { loadMeta, updateMeta, META_KEY, META_VERSION } from './store';
import { enqueueBrood } from './run';

const A = 'leafhopper';
const B = 'shellbeetle';

// B21.3: Das Onboarding braucht genau EINE Zahl im Meta-Save — welche Fassung der Tour der
// Spieler gesehen hat. Nicht in einem zweiten Speicher, nicht in `localStorage` außerhalb von
// persistence/. Das Ja/Nein aus v6 wird dabei zur Fassung 1 (die alte Run-only-Tour), damit die
// überarbeitete Tour bei Bestandsspielern genau einmal läuft — sonst hätte der Umbau für genau
// die Spieler nie sichtbar werden können, die die alte Tour schon kannten.

describe('B21 — Tour-Fassung (MetaSave v7)', () => {
  beforeEach(() => { resetTestState(); });

  it('startet mit einer ungesehenen Tour', () => {
    const meta = loadMeta();
    expect(meta.version).toBe(META_VERSION);
    expect(meta.version).toBe(7);
    expect(meta.tutorialVersion).toBe(0);
  });

  it('persistiert die gesehene Fassung über den einen Writer', () => {
    updateMeta({ tutorialVersion: 2 });
    expect(loadMeta().tutorialVersion).toBe(2);

    updateMeta({ tutorialVersion: 0 });
    expect(loadMeta().tutorialVersion).toBe(0);
  });

  it('liest einen v5-Save verlustfrei und zeigt die Tour genau einmal', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 5, nektar: 321, bestWave: 9, runs: 4, runId: 5, breedGeneration: 2,
      variantCounts: { sprout: 2 }, savedVariants: [], loadout: ['sprout'], language: 'de',
      audioOn: false, pvpPayouts: 1, seedStash: 3, pendingCrosses: [], totalWavesSurvived: 12,
      bredStats: {}, beetles: [], beetleDeployed: null,
      pendingBroods: [], broodGeneration: 7,
    }, 5);

    const meta = loadMeta();

    expect(meta.version).toBe(7);
    expect(meta.nektar).toBe(321);
    expect(meta.bestWave).toBe(9);
    expect(meta.runId).toBe(5);
    expect(meta.language).toBe('de');
    expect(meta.audioOn).toBe(false);
    expect(meta.loadout).toEqual(['sprout']);
    expect(meta.totalWavesSurvived).toBe(12);
    expect(meta.broodGeneration).toBe(7);          // monotoner Zähler bleibt unangetastet
    expect(meta.tutorialVersion).toBe(0);          // Altsave ⇒ einmal ansehen

    // Nach dem Abschluss bleibt der Rest des Saves unverändert.
    const after = updateMeta({ tutorialVersion: 2 });
    expect(after.nektar).toBe(321);
    expect(after.broodGeneration).toBe(7);
    expect(loadMeta().tutorialVersion).toBe(2);
  });

  it('hebt das v6-Ja auf Fassung 1 — die neue Tour läuft dadurch einmal', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 6, nektar: 60, bestWave: 3, runs: 2, runId: 2, breedGeneration: 0,
      variantCounts: { sprout: 1 }, savedVariants: [], loadout: [], language: 'de',
      audioOn: true, pvpPayouts: 0, seedStash: 0, pendingCrosses: [], totalWavesSurvived: 3,
      bredStats: {}, beetles: [], beetleDeployed: null, pendingBroods: [],
      broodGeneration: 0, tutorialDone: true,
    }, 6);

    expect(loadMeta().tutorialVersion).toBe(1);    // gesehen war die alte Fassung
    expect(loadMeta().bestWave).toBe(3);           // und sonst geht nichts verloren
  });

  it('lässt ein v6-Nein bei null — nichts wird doppelt gezeigt', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 6, nektar: 60, runs: 0, runId: 0, variantCounts: { sprout: 1 },
      tutorialDone: false,
    }, 6);

    expect(loadMeta().tutorialVersion).toBe(0);
  });

  it('verliert beim Roundtrip keine Brut-Daten (Identität bleibt)', () => {
    const created = enqueueBrood(A, B, 1);
    updateMeta({ tutorialVersion: 2 });

    const meta = loadMeta();
    expect(meta.pendingBroods.map(p => p.broodIndex)).toEqual([0]);
    expect(meta.broodGeneration).toBe(created.broodGeneration);
  });

  it('schreibt die Fassung im selben Save-Format wie alles andere (kanonische Checksumme)', () => {
    updateMeta({ tutorialVersion: 2 });
    const stored = JSON.parse(ensureLocalStorage().getItem(META_KEY) as string) as { v: number; data: { tutorialVersion: number } };
    expect(stored.v).toBe(META_VERSION);
    expect(stored.data.tutorialVersion).toBe(2);
    expect(loadMeta().tutorialVersion).toBe(2);
  });
});
