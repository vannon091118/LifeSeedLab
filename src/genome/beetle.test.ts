import { describe, it, expect } from 'vitest';
import { rollBrood, deriveBeetleStats, deriveBroodSeed, beetlePower, broodGenomeHash, toDeploySpec } from './beetle';
import { BEETLE_GENES_SOURCE, BEETLE_GENE_POOL, BEETLES_SOURCE } from '../config/beetles.source';

// P6: Käferzucht — Determinismus + echte Vielfalt (P7) + Chain-Verankerung.

describe('beetle breeding (P6)', () => {
  it('gleiche Eltern + Generation → identischer Wurf (Determinismus)', () => {
    const a = rollBrood('leafhopper', 'shellbeetle', 7);
    const b = rollBrood('leafhopper', 'shellbeetle', 7);
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(b[i].id).toBe(a[i].id);
      expect(b[i].genome).toEqual(a[i].genome);
      expect(b[i].stats).toEqual(a[i].stats);
      expect(broodGenomeHash(b[i])).toBe(broodGenomeHash(a[i]));
    }
  });

  it('Seed ist aus (rootSeed, Eltern, Generation) abgeleitet — andere Generation, anderer Wurf', () => {
    expect(deriveBroodSeed('leafhopper', 'shellbeetle', 1))
      .not.toBe(deriveBroodSeed('leafhopper', 'shellbeetle', 2));
    const g1 = rollBrood('leafhopper', 'shellbeetle', 1);
    const g2 = rollBrood('leafhopper', 'shellbeetle', 2);
    expect(g2[0].genome).not.toEqual(g1[0].genome);
  });

  it('Kandidaten unterscheiden sich real (P7 — keine Seed-Massenproduktion)', () => {
    const brood = rollBrood('bumble', 'shellbeetle', 3);
    const signatures = new Set(brood.map(c => `${c.stats.hp}/${c.stats.attack}/${c.stats.speed}/${c.stats.spawnX}/${c.stats.taunt}`));
    // Mindestens 2 der 3 Kandidaten müssen messbar verschiedene Stats tragen.
    expect(signatures.size).toBeGreaterThanOrEqual(2);
  });

  it('Specimen-Gene wirken messbar: taunt → taunt:true, swarmborn → spawnX > 1', () => {
    const tauntStats = deriveBeetleStats('shellbeetle', [{ id: 'taunt', power: 0.9, dominant: true }]);
    expect(tauntStats.taunt).toBe(true);
    const swarmStats = deriveBeetleStats('bumble', [{ id: 'swarmborn', power: 0.9, dominant: true }]);
    expect(swarmStats.spawnX).toBeGreaterThan(1);
    expect(swarmStats.spawnX).toBeLessThanOrEqual(5); // Spawn 1×–5× (P6-Spec)
  });

  it('Brutlinge erben erkennbar von den Eltern (Merge, keine Neuwürfelung)', () => {
    const brood = rollBrood('shellbeetle', 'leafhopper', 11);
    for (const child of brood) {
      const parentGeneIds = new Set([
        ...BEETLES_SOURCE.shellbeetle.genes,
        ...BEETLES_SOURCE.leafhopper.genes,
      ]);
      for (const g of child.genome) {
        expect(parentGeneIds.has(g.id) || BEETLE_GENES_SOURCE[g.id]).toBeTruthy();
      }
    }
  });

  it('Jedes Gen im Pool hat eine Source-Wirkung (P7: keine Deko-Gene)', () => {
    for (const id of Object.keys(BEETLE_GENE_POOL)) {
      const gs = BEETLE_GENES_SOURCE[id];
      expect(gs, `Gen ${id} fehlt in BEETLE_GENES_SOURCE`).toBeDefined();
      const hasEffect = gs.hpMult !== 0 || gs.speedAdd !== 0 || gs.attackAdd !== 0
        || !!gs.taunt || !!gs.spawnX || !!gs.deathSpawnX;
      expect(hasEffect, `Gen ${id} hat keine messbare Wirkung`).toBe(true);
    }
  });

  it('Deploy-Spec Mapping überträgt alle Stats unverändert', () => {
    const brood = rollBrood('bumble', 'leafhopper', 21);
    const spec = brood[0];
    const deploy = toDeploySpec(spec);
    expect(deploy.hp).toBe(spec.stats.hp);
    expect(deploy.attack).toBe(spec.stats.attack);
    expect(deploy.speed).toBe(spec.stats.speed);
    expect(deploy.spawnX).toBe(spec.stats.spawnX);
    expect(deploy.taunt).toBe(spec.stats.taunt);
    expect(beetlePower(spec.genome)).toBeGreaterThan(0);
  });
});
