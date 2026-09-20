// Owner: Meta-Tests — Sub-Domäne „Brut-Identität & Brut-Domäne“ (B32.2/3).
// Konsolidierung Phase 2 (Plan: plan/refactor-test-suite-consolidation-1.md):
// identity.test.ts (Brut-Teile) + genome/genome_brood_domain.test.ts (Seed-Pins, B30).
// Setup je describe über das Testkit — keine lokalen Setup-Kopien mehr.

import { describe, it, expect, beforeEach } from 'vitest';
import { resetFullTestState, writeLegacyEnvelope } from '../testing/testkit';
import { ensureLocalStorage } from '../persistence/testDom';
import { fnv1a } from '../core/hash';
import { BEETLE_BREED } from '../config/beetles.source';
import { rollBrood } from '../genome/beetle';
import { loadMeta, updateMeta, META_KEY, META_VERSION } from './store';
import { enqueueBrood, claimBrood } from './run';
import { BeetleSpecimen } from '../types';

const A = 'leafhopper';
const B = 'shellbeetle';

// ══ B14 — Brut-Identität ist monoton, nie aus einem Fenster abgeleitet ════════════════════════════
// Befund A13.1: `enqueueBrood` leitete den broodIndex aus `Math.max(...pendingBroods) + 1` ab.
// `claimBrood` verkleinert das Fenster ⇒ der verbrauchte Index wurde erneut vergeben ⇒
// identischer Brut-Seed ⇒ identische Specimen-ID. Das Fenster-Maximum ist als Aggregation
// reihenfolge-unabhängig, aber nicht STABIL — Identität gehört in einen monotonen Zähler.

describe('B14 — Brut-Identität', () => {
  beforeEach(() => {
    resetFullTestState();
    // B39 (QA v0.0.53 #2): die Brut kostet Nektar — diese Tests prüfen Identität/Monotonie,
    // nicht Wirtschaft, deshalb steht der Kontostand hier bewusst hoch.
    updateMeta({ nektar: 5000 });
  });

  it('vergibt einen verbrauchten broodIndex nicht erneut', () => {
    enqueueBrood(A, B, 1);                 // broodIndex 0
    enqueueBrood(A, B, 1);                 // broodIndex 1
    updateMeta({ totalWavesSurvived: 99 }); // A18.1: claim setzt Reife voraus — hier erzwingen
    claimBrood(1, 0);                      // höchster Index fällt aus dem Fenster

    const third = enqueueBrood(A, B, 1);

    // Vorher: max([0]) + 1 = 1 ⇒ Recycling. Jetzt: monotoner Zähler ⇒ 2.
    expect(third.pendingBroods.map(p => p.broodIndex)).toEqual([0, 2]);
    expect(third.broodGeneration).toBe(3);
  });

  it('UNREIFE Brut wird nicht ausgegeben (fail-closed, A18.1)', () => {
    enqueueBrood(A, B, 3);                 // neededWaves 3, Zähler steht bei 0
    const meta = loadMeta();
    const after = claimBrood(0, 0);        // unreif ⇒ unverändert
    expect(after).toStrictEqual(meta);
    expect(loadMeta().beetles.length).toBe(0);
    expect(loadMeta().pendingBroods).toHaveLength(1);
  });

  it('UNBEKANNTER broodIndex ändert nichts (fail-closed, A18.1)', () => {
    const before = loadMeta();
    const after = claimBrood(999, 0);
    expect(after).toStrictEqual(before);
  });

  it('UNBEKANNTER Kandidaten-Index wählt NICHT stillschweigend 0 (A18.1)', () => {
    enqueueBrood(A, B, 1);
    updateMeta({ totalWavesSurvived: 99 }); // Reife erzwingen

    const before = loadMeta();
    const after = claimBrood(0, 7);        // Kandidat 7 existiert nicht (nur 0–2)

    expect(after).toStrictEqual(before);
    expect(loadMeta().beetles.length).toBe(0);
    expect(loadMeta().pendingBroods).toHaveLength(1);
  });

  it('erzeugt nie zwei Specimen mit identischer ID im Brut-Lager', () => {
    enqueueBrood(A, B, 1);                 // 0
    enqueueBrood(A, B, 1);                 // 1
    updateMeta({ totalWavesSurvived: 99 }); // Reife für die ersten beiden (startedWave 0)
    claimBrood(1, 0);
    enqueueBrood(A, B, 1);                 // 2 (nicht 1 — das war das Recycling; startedWave 99)
    updateMeta({ totalWavesSurvived: 100 }); // und jetzt reift auch die dritte
    claimBrood(2, 0);

    const ids = loadMeta().beetles.map(b => b.id);

    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('schreibt Zähler und Brut-Eintrag im selben Schritt', () => {
    const first = enqueueBrood(A, B, 1);

    expect(first.broodGeneration).toBe(1);
    expect(first.pendingBroods[0].broodIndex).toBe(0);
    claimBrood(0, 0);
    expect(loadMeta().broodGeneration).toBe(1); // Zähler läuft nicht zurück
  });

  it('Vorschau und Enqueue verwenden dieselbe Generation (A13.2)', () => {
    const previewIds = rollBrood(A, B, loadMeta().broodGeneration).map(c => c.id);
    const created = enqueueBrood(A, B, 1);
    const index = created.pendingBroods[created.pendingBroods.length - 1].broodIndex;

    expect(rollBrood(A, B, index).map(c => c.id)).toEqual(previewIds);
  });

  it('derselbe Index ⇒ dieselbe Brut (belegt, warum die Generation stabil bleiben muss)', () => {
    expect(rollBrood(A, B, 1).map((c: BeetleSpecimen) => c.id)).toEqual(rollBrood(A, B, 1).map((c: BeetleSpecimen) => c.id));
    expect(rollBrood(A, B, 1).map((c: BeetleSpecimen) => c.id)).not.toEqual(rollBrood(A, B, 2).map((c: BeetleSpecimen) => c.id));
  });
});

// ══ B14.2 — Migration v4 → v5 ohne Identitätsverlust ═════════════════════════════════════════

describe('B14 — Migration v4 → v5', () => {
  beforeEach(() => {
    resetFullTestState();
    // B39 (QA v0.0.53 #2): die Brut kostet Nektar — diese Tests prüfen Identität/Monotonie,
    // nicht Wirtschaft, deshalb steht der Kontostand hier bewusst hoch.
    updateMeta({ nektar: 5000 });
  });

  it('leitet broodGeneration aus bereits vergebenen Kennungen ab', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 4, nektar: 123, bestWave: 3, runs: 2, runId: 3, breedGeneration: 1,
      variantCounts: {}, savedVariants: [], loadout: [], language: 'de', audioOn: true,
      pvpPayouts: 0, seedStash: 0, pendingCrosses: [], totalWavesSurvived: 4,
      bredStats: {}, beetleDeployed: null,
    }, 4);

    const meta = loadMeta();

    expect(meta.version).toBe(META_VERSION);
    expect(meta.nektar).toBe(123);
    expect(meta.broodGeneration).toBe(10); // max(7, 9) + 1
  });

  it('vergibt nach der Migration keine bestehende Kennung erneut', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 4, nektar: 500, pendingBroods: [{ broodIndex: 4, specimenAId: A, specimenBId: B, neededWaves: 1, startedWave: 0, chosenIndex: -1 }],
      beetles: [],
    }, 4);

    const created = enqueueBrood(A, B, 1);
    const indexes = created.pendingBroods.map(p => p.broodIndex);
    expect(indexes).toEqual([4, 5]);
  });

  it('Altsave mit Legacy-Checksumme wird gelesen und beim Schreiben kanonisiert (B14.6)', () => {
    writeLegacyEnvelope(META_KEY, { version: 4, nektar: 77 }, 4);

    expect(loadMeta().nektar).toBe(77);

    const stored = JSON.parse(ensureLocalStorage().getItem(META_KEY) as string) as { v: number; checksum: number; data: unknown };
    expect(stored.v).toBe(META_VERSION);
    // Nach dem Schreiben greift die kanonische Prüfung.
    expect(fnv1a(0x811c9dc5, JSON.stringify(stored.data))).not.toBe(stored.checksum);
  });
});

/**
 * B39 — DER eigentliche QA-Befund (v0.0.53 #2, „free beetle breeding", 3/3 reproduziert):
 * `BeetleLab` prüfte den Kontostand, aber die Abbuchung existierte nirgends — Brut war gratis.
 * Der Vertrag gehört hierhin (Meta-Writer), nicht in den Screen.
 */
describe('B39 — Brut kostet Nektar', () => {
  beforeEach(() => { resetFullTestState(); });

  it('bucht die Brutkosten ab (Brut ist keine Gratis-Aktion)', () => {
    updateMeta({ nektar: 100 });
    const before = loadMeta().nektar;
    const after = enqueueBrood(A, B, 1);
    expect(after.pendingBroods).toHaveLength(1);
    expect(after.nektar).toBe(before - BEETLE_BREED.nektarCost);
    expect(loadMeta().nektar).toBe(before - BEETLE_BREED.nektarCost);
  });

  it('fail-closed: zu wenig Nektar ⇒ keine Brut, kein Zähler, kein Nektar weg', () => {
    updateMeta({ nektar: BEETLE_BREED.nektarCost - 1 });
    const before = loadMeta();
    const after = enqueueBrood(A, B, 1);
    expect(after.pendingBroods).toHaveLength(0);
    expect(after.broodGeneration).toBe(before.broodGeneration);
    expect(after.nektar).toBe(before.nektar);
  });
});
