// Owner: Meta-Tests — Sub-Domäne „Identität ist unverletzlich (Kappungs-Politik)" (B16.8).
// Aus `cross_lifecycle.test.ts` herausgetrennt, weil die Datei den Meta-Cap riss (233/200
// Code-Zeilen) — die Projektregel bei Cap-Überschreitung heißt splitten, nie erhöhen.
// Der Inhalt ist unverändert; getrennt ist nur, was fachlich eine eigene Gruppe ist.
//
// Entscheidung (2026-09-15): `savedVariants` und `beetles` werden NICHT gekappt.
// Begründung, jede Stufe im Code belegt:
// 1. Die Bibliothek wächst ausschließlich durch keepCross, und keepCross verbraucht
//    je 1× beider Eltern (2→1-Regel) — der Bestand ist ökonomisch begrenzt, eine
//    Kappung wäre eine zweite Bremse hinter einer bestehenden.
// 2. Identität zu kappen bricht das Discovery-Chain-Versprechen („erste Entdeckung
//    ist für immer"): die Chain erinnert sich, das Inventar nicht — totes Gewicht.
// 3. Ein Brut-Cap hätte `beetleDeployed` (Meta-Referenz auf eine Specimen-ID)
//    verwaisen können — dieselbe Fehlerklasse wie A18.3.
//
// Dieses Gate lockt die INVARIANTEN, nicht die Kappung: Kein Pfad darf je eine
// ID aus counts/bredStats/loadout/beetleDeployed verwaisen, solange ihr Bestand > 0
// ist. Bringt jemand je ein Cap zurück, schlagen diese Tests — und erzwingen die
// Miträum-Pflicht aus A18.3. Kein stillschweigendes Wegwerfen von Identität.

import { describe, it, expect, beforeEach } from 'vitest';
import { clearTestStorage } from '../persistence/testDom';
import { createBaseVariants } from '../genome/bases';
import { rollBrood } from '../genome/beetle';
import { loadMeta, updateMeta } from './store';
import { keepCross, registerVariant, claimBrood, enqueueBrood } from './run';

const BASES = createBaseVariants();
const LEGACY_VARIANT_CAP = 60;
const LEGACY_BROOD_CAP = 40;

describe('B16.8 — Identität ist unverletzlich (keine Kappung)', () => {
  beforeEach(() => { clearTestStorage(); });

  it(`${LEGACY_VARIANT_CAP + 1} Register-Operationen: Library, Besitz, bredStats und Loadout bleiben konsistent`, { timeout: 30000 }, () => {
    const loadoutId = 'cross_cap_loadout';
    updateMeta({ loadout: [loadoutId] });
    for (let i = 0; i <= LEGACY_VARIANT_CAP; i++) {
      registerVariant({ ...BASES[0], id: i === LEGACY_VARIANT_CAP ? loadoutId : `cross_cap_${i}`, name: `P${i}` });
    }

    const meta = loadMeta();
    expect(meta.savedVariants).toHaveLength(LEGACY_VARIANT_CAP + 1);
    expect(meta.savedVariants.every(v => (meta.variantCounts[v.id] ?? 0) > 0)).toBe(true);
    expect(meta.savedVariants.every(v => meta.bredStats?.[v.id] !== undefined)).toBe(true);
    expect(meta.loadout.every(id => meta.savedVariants.some(v => v.id === id))).toBe(true);
    for (const id of Object.keys(meta.bredStats ?? {})) {
      expect(meta.savedVariants.some(v => v.id === id) || (meta.variantCounts[id] ?? 0) > 0).toBe(true);
    }
  });

  it(`${LEGACY_BROOD_CAP + 1} Käfer: die deployed-Referenz überlebt das historische Cap`, () => {
    const existing = Array.from({ length: LEGACY_BROOD_CAP }, (_, index) =>
      rollBrood('leafhopper', 'shellbeetle', index)[0]!);
    const deployedId = existing[0]!.id;
    updateMeta({
      beetles: existing,
      beetleDeployed: deployedId,
      broodGeneration: LEGACY_BROOD_CAP,
      totalWavesSurvived: 1000,
      nektar: 5000,
    });

    enqueueBrood('leafhopper', 'shellbeetle', 1);
    updateMeta({ totalWavesSurvived: 1001 });
    const broods = loadMeta().pendingBroods;
    const pending = broods[broods.length - 1];
    expect(pending).toBeDefined();
    claimBrood(pending!.broodIndex, 0);

    const meta = loadMeta();
    expect(meta.beetles).toHaveLength(LEGACY_BROOD_CAP + 1);
    expect(meta.beetleDeployed).toBe(deployedId);
    expect(meta.beetles.some(beetle => beetle.id === meta.beetleDeployed)).toBe(true);
  });

  it(`${LEGACY_VARIANT_CAP + 1} Keeps: keine Identität und kein Queue-Eintrag verschwindet`, { timeout: 30000 }, () => {
    const batch = LEGACY_VARIANT_CAP + 1;
    updateMeta({
      variantCounts: { sprout: batch, rootwall: batch }, savedVariants: [], bredStats: {},
      pendingCrosses: Array.from({ length: batch }, (_, index) => ({
        crossIndex: index, seed: 1000 + index, neededWaves: 1, startedWave: 0,
      })),
      totalWavesSurvived: 1000,
    });

    for (let index = 0; index < batch; index++) {
      const child = { ...BASES[0], id: `cross_keep_${index}`, name: `K${index}` };
      expect(keepCross(child, 'sprout', 'rootwall', index)).not.toBeNull();
    }

    const meta = loadMeta();
    expect(meta.savedVariants).toHaveLength(batch);
    expect(meta.savedVariants.map(variant => variant.id)).toContain('cross_keep_60');
    expect(meta.variantCounts.sprout).toBe(0);
    expect(meta.variantCounts.rootwall).toBe(0);
    expect(meta.pendingCrosses).toEqual([]);
  });
});
