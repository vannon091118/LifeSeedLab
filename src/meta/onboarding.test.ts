import { describe, expect, it, beforeEach } from 'vitest';

// storage nutzt globalThis.localStorage — Polyfill via Owner-Helfer (persistence/testDom.ts)
import { clearTestStorage, ensureLocalStorage } from '../persistence/testDom';
import { fnv1a } from '../core/hash';

const { loadMeta, resetMeta, updateMeta, META_KEY, META_VERSION } = await import('./store');
const { enqueueBrood } = await import('./run');

const A = 'leafhopper';
const B = 'shellbeetle';

/** Altsave-Envelope im LEGACY-Checksummen-Format (fnv über JSON.stringify). */
function writeLegacyEnvelope(key: string, data: unknown, v: number): void {
  const raw = JSON.stringify(data);
  ensureLocalStorage().setItem(key, JSON.stringify({ v, checksum: fnv1a(0x811c9dc5, raw), data }));
}

// B21: Das Onboarding braucht genau EIN persistiertes Bit. Es liegt im Meta-Save (v6) — nicht in
// einem zweiten Speicher und nicht in `localStorage` außerhalb von persistence/.

describe('B21 — Onboarding-Flag (MetaSave v6)', () => {
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('startet mit einem ungesehenen Onboarding', () => {
    const meta = loadMeta();
    expect(meta.version).toBe(META_VERSION);
    expect(meta.version).toBe(6);
    expect(meta.tutorialDone).toBe(false);
  });

  it('persistiert Abschluss (und Überspringen) über den einen Writer', () => {
    updateMeta({ tutorialDone: true });
    expect(loadMeta().tutorialDone).toBe(true);

    updateMeta({ tutorialDone: false });
    expect(loadMeta().tutorialDone).toBe(false);
  });

  it('liest einen v5-Save verlustfrei und zeigt das Onboarding genau einmal', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 5, nektar: 321, bestWave: 9, runs: 4, runId: 5, breedGeneration: 2,
      variantCounts: { sprout: 2 }, savedVariants: [], loadout: ['sprout'], language: 'de',
      audioOn: false, pvpPayouts: 1, seedStash: 3, pendingCrosses: [], totalWavesSurvived: 12,
      bredStats: {}, mapLayouts: { test: {} }, beetles: [], beetleDeployed: null,
      pendingBroods: [], broodGeneration: 7,
    }, 5);

    const meta = loadMeta();

    expect(meta.version).toBe(6);
    expect(meta.nektar).toBe(321);
    expect(meta.bestWave).toBe(9);
    expect(meta.runId).toBe(5);
    expect(meta.language).toBe('de');
    expect(meta.audioOn).toBe(false);
    expect(meta.loadout).toEqual(['sprout']);
    expect(meta.totalWavesSurvived).toBe(12);
    expect(meta.broodGeneration).toBe(7);          // monotoner Zähler bleibt unangetastet
    expect(meta.tutorialDone).toBe(false);         // Altsave ⇒ einmal ansehen

    // Nach dem Abschluss bleibt der Rest des Saves unverändert.
    const after = updateMeta({ tutorialDone: true });
    expect(after.nektar).toBe(321);
    expect(after.broodGeneration).toBe(7);
    expect(loadMeta().tutorialDone).toBe(true);
  });

  it('verliert beim v6-Roundtrip keine Brut-Daten (Identität bleibt)', () => {
    const created = enqueueBrood(A, B, 1);
    updateMeta({ tutorialDone: true });

    const meta = loadMeta();
    expect(meta.pendingBroods.map(p => p.broodIndex)).toEqual([0]);
    expect(meta.broodGeneration).toBe(created.broodGeneration);
  });

  it('schreibt das Flag im selben Save-Format wie alles andere (kanonische Checksumme)', () => {
    updateMeta({ tutorialDone: true });
    const stored = JSON.parse(ensureLocalStorage().getItem(META_KEY) as string) as { v: number; data: { tutorialDone: boolean } };
    expect(stored.v).toBe(META_VERSION);
    expect(stored.data.tutorialDone).toBe(true);
    expect(loadMeta().tutorialDone).toBe(true);
  });
});
