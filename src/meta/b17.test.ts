import { describe, it, expect, beforeEach } from 'vitest';

// B17/A19 — Persistenz-Wahrheit statt React-Kopie.
//
// Befund: Der Run-Start reservierte die `runId` auf dem React-State des Routers und schrieb diesen
// State ZURÜCK. Jede Meta-Schreibung, die während des Runs direkt in die Persistenz ging, wurde
// damit von einer älteren Kopie überschrieben. Sichtbar als „keine Runde bringt was".
//
// Gemessen werden drei Zusagen:
// B17.1  Der Start reserviert auf dem persistierten Stand — kein Fortschritt geht verloren.
// B17.2  Gegenprobe: die alte Form verliert ihn (damit die Ursache nicht zurückkehrt).
// B17.3  Ein Eintrag mit `startedWave` in der Zukunft reift nie; der Load hebt ihn auf die Wahrheit.

import { clearTestStorage } from '../persistence/testDom';

const { loadMeta, updateMeta, persistMeta, resetMeta } = await import('./store');
const { beginRun, reserveRunId, readyBroods } = await import('./run');
const { isCrossReady, advanceCrossMaturation } = await import('./economy');

describe('B17 — Run-Start auf der persistierten Wahrheit', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('B17.1 überlebt Schreibungen, die nicht über den Router gingen', () => {
    // Während eines Runs geschrieben — die Sim kennt den Router nicht.
    updateMeta({ totalWavesSurvived: 7, language: 'de' });
    const before = loadMeta();

    const started = beginRun();

    expect(started.runId).toBe(before.runId + 1);
    expect(started.totalWavesSurvived).toBe(7);
    expect(started.language).toBe('de');
    // Und wirklich persistiert, nicht nur zurückgegeben:
    expect(loadMeta().totalWavesSurvived).toBe(7);
    expect(loadMeta().runId).toBe(before.runId + 1);
  });

  it('B17.2 Gegenprobe: die alte Form (Kopie zurückschreiben) verliert genau diesen Fortschritt', () => {
    const routerCopy = loadMeta();              // Stand von VOR dem Run
    updateMeta({ totalWavesSurvived: 7 });      // Fortschritt während des Runs

    persistMeta(reserveRunId(routerCopy));      // alte Form: Kopie + reserve, in einem Schritt

    // Dokumentiert die Ursache: der Zähler ist wieder auf dem alten Stand.
    expect(loadMeta().totalWavesSurvived).toBe(0);
  });

  it('B17.3 hebt eine Kreuzung mit startedWave in der Zukunft auf die Wahrheit', () => {
    updateMeta({
      totalWavesSurvived: 3,
      pendingCrosses: [{ crossIndex: 0, seed: 1, neededWaves: 2, startedWave: 9 }],
    });

    const healed = loadMeta();
    expect(healed.pendingCrosses[0].startedWave).toBe(3);
    // Kein Gratis-Fortschritt: die Kreuzung beginnt ab jetzt zu warten …
    expect(isCrossReady(healed, 0)).toBe(false);
    // … kann aber überhaupt reifen. Genau das ging vorher nie („Samen keimen nicht").
    advanceCrossMaturation(2);
    expect(isCrossReady(loadMeta(), 0)).toBe(true);
  });

  it('B17.3 gilt genauso für Bruten (dasselbe Kriterium, A18.6)', () => {
    updateMeta({
      totalWavesSurvived: 2,
      pendingBroods: [{
        broodIndex: 0, specimenAId: 'leafhopper', specimenBId: 'shellbeetle',
        neededWaves: 1, startedWave: 5, chosenIndex: -1,
      }],
    });

    const healed = loadMeta();
    expect(healed.pendingBroods[0].startedWave).toBe(2);
    expect(readyBroods(healed)).toHaveLength(0); // kein Gratis-Fortschritt
    advanceCrossMaturation(1);
    expect(readyBroods(loadMeta())).toHaveLength(1); // reift jetzt
  });
});
