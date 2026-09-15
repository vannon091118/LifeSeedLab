import { describe, it, expect, beforeEach } from 'vitest';

// B16.8 — Kappungs-Politik: Identität ist unverletzlich.
//
// Entscheidung (2026-09-15): `savedVariants` und `beetles` werden NICHT gekappt.
// Begründung, jede Stufe im Code belegt:
// 1. Die Bibliothek wächst ausschließlich durch keepCross, und keepCross verbraucht
//    je 1× beider Eltern (2→1-Regel) — der Bestand ist ökonomisch begrenzt, eine
//    Kappung wäre eine zweite Bremse hinter einer bestehenden.
// 2. Identität zu kappen bricht das Discovery-Chain-Versprechen („erste Entdeckung
//    ist für immer"): die Chain erinnert sich, das Inventar nicht — toter Gewicht.
// 3. Ein Brut-Cap hätte `beetleDeployed` (Meta-Referenz auf eine Specimen-ID)
//    verwaisen können — dieselbe Fehlerklasse wie A18.3.
//
// Dieses Gate lockt die INVARIANTEN, nicht die Kappung: Kein Pfad darf je eine
// ID aus counts/bredStats/loadout/beetleDeployed verwaisen, solange ihr Bestand > 0
// ist. Bringt jemand je ein Cap zurück, schlagen diese Tests — und erzwingen die
// Miträum-Pflicht aus A18.3. Kein stillschweigendes Wegwerfen von Identität.

import { clearTestStorage } from '../persistence/testDom';

const { loadMeta, updateMeta } = await import('./store');
const { keepCross, registerVariant, claimBrood, enqueueBrood } = await import('./run');
const { createBaseVariants } = await import('../genome/bases');
const { rollBrood } = await import('../genome/beetle');

const BASES = createBaseVariants();

describe('B16.8 — Identität ist unverletzlich (keine Kappung)', () => {
  beforeEach(() => { clearTestStorage(); });

  it('100 Register-Operationen: kein Eintrag verlässt die Bibliothek', () => {
    for (let i = 0; i < 100; i++) {
      registerVariant({ ...BASES[0], id: `cross_cap_${i}`, name: `P${i}` });
    }
    const meta = loadMeta();
    expect(meta.savedVariants.length).toBe(100);
    expect(meta.savedVariants.every(v => (meta.variantCounts[v.id] ?? 0) > 0)).toBe(true);
    expect(meta.savedVariants.every(v => meta.bredStats?.[v.id] !== undefined)).toBe(true);
  });

  it('Invariante: jede ID im Loadout existiert in der Bibliothek (auch nach 60+)', () => {
    updateMeta({ loadout: ['cross_loadout'] });
    for (let i = 0; i < 70; i++) {
      registerVariant({ ...BASES[1], id: `cross_${i}`, name: `V${i}` });
    }
    registerVariant({ ...BASES[0], id: 'cross_loadout', name: 'L' });

    const meta = loadMeta();
    expect(meta.savedVariants.length).toBe(71);
    for (const id of meta.loadout) {
      expect(meta.savedVariants.some(v => v.id === id), `Loadout verweist auf ${id}, das nicht existiert`).toBe(true);
    }
  });

  it('Invariante: bredStats kennt keine Bibliotheks-Fremd-ID', () => {
    for (let i = 0; i < 65; i++) {
      registerVariant({ ...BASES[2], id: `cross_${i}`, name: `V${i}` });
    }
    const meta = loadMeta();
    for (const id of Object.keys(meta.bredStats ?? {})) {
      expect(meta.savedVariants.some(v => v.id === id) || (meta.variantCounts[id] ?? 0) > 0).toBe(true);
    }
  });

  it('Invariante: beetleDeployed verweist nie auf eine entfernte Specimen-ID', () => {
    // 45 Bruten durchlaufen lassen (mehr als das alte 40er-Cap). Specimen-IDs aus
    // BEETLES_SOURCE (swarmborn/taunt/phoenix/broodhost/carapace) — der erste
    // Versuch dieses Tests nutzte erfundene IDs; fail-closed hat sie korrekt
    // abgewiesen und der Test zeigte 0 statt 45. Das ist das Gate, nicht der Bug.
    updateMeta({ totalWavesSurvived: 1000 });
    for (let i = 0; i < 45; i++) {
      // Eltern rotieren durch die echten Basen (leafhopper/shellbeetle/bumble) —
      // auch Hybride landen im Lager, die Identität bleibt vollständig.
      const parents = [['leafhopper', 'shellbeetle'], ['bumble', 'leafhopper'], ['shellbeetle', 'bumble']][i % 3];
      enqueueBrood(parents[0], parents[1], 1);
      // startedWave = Zählerstand beim Enqueue ⇒ reifen lassen: Zähler +1, dann claim.
      // (Erste Version dieses Tests ließ den Zähler stehen — fail-closed wies korrekt ab.)
      updateMeta({ totalWavesSurvived: 1001 + i });
      const meta = loadMeta();
      const entry = meta.pendingBroods[meta.pendingBroods.length - 1];
      claimBrood(entry.broodIndex, 0);
    }

    const meta = loadMeta();
    expect(meta.beetles.length).toBe(45);
    if (meta.beetleDeployed) {
      expect(meta.beetles.some(b => b.id === meta.beetleDeployed)).toBe(true);
    }
  });

  it('Keep-Kette: 70 Keeps erzeugen 70 Identitäten, Elternverbrauch bleibt korrekt', () => {
    // genug Elternbestand: 140× sprout (2 je Keep für a===b-Fall nicht nötig —
    // wir kreuzen sprout × rootwall, also je 1)
    updateMeta({
      variantCounts: { sprout: 70, rootwall: 70 }, savedVariants: [], bredStats: {},
      pendingCrosses: Array.from({ length: 70 }, (_, i) => ({
        crossIndex: i, seed: 1000 + i, neededWaves: 1, startedWave: 0,
      })),
      totalWavesSurvived: 1000,
    });

    for (let i = 0; i < 70; i++) {
      const child = { ...BASES[0], id: `cross_keep_${i}`, name: `K${i}` };
      const m = keepCross(child, 'sprout', 'rootwall', i);
      expect(m).not.toBeNull();
    }

    const meta = loadMeta();
    expect(meta.savedVariants.length).toBe(70);
    expect(meta.variantCounts['sprout']).toBe(0);
    expect(meta.variantCounts['rootwall']).toBe(0);
    expect(meta.pendingCrosses).toEqual([]);
  });
});
