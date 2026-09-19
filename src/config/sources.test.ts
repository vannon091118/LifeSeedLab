import { describe, it, expect } from 'vitest';
import { BASES_SOURCE, BASE_IDS } from './bases.source';
import { EXTRAS_SOURCE, EXTRA_IDS, isValidExtra } from './extras.source';
import { EFFECTS_SOURCE, EFFECT_IDS, isValidEffect } from './effects.source';
import { GENE_PAIRS, TYPE_BASES, type GenePair } from './genes.source';
import { GENE_POOL } from '../genome/pool';

describe('Phase 5 gate: source validation', () => {
  it('exactly 10 effects / extras / bases exist', () => {
    expect(EFFECT_IDS).toHaveLength(10);
    expect(EXTRA_IDS).toHaveLength(10);
    expect(BASE_IDS).toHaveLength(10);
  });

  it('every base.allowedEffects references a valid EFFECT id', () => {
    for (const base of Object.values(BASES_SOURCE)) {
      for (const eff of base.allowedEffects) {
        expect(isValidEffect(eff), `${base.id} → ${eff}`).toBe(true);
      }
    }
  });

  it('every base.allowedExtras references a valid EXTRA id', () => {
    for (const base of Object.values(BASES_SOURCE)) {
      for (const ext of base.allowedExtras) {
        expect(isValidExtra(ext), `${base.id} → ${ext}`).toBe(true);
      }
    }
  });

  it('every extra.compatibility references valid base ids or "*"', () => {
    for (const extra of Object.values(EXTRAS_SOURCE)) {
      for (const c of extra.compatibility) {
        if (c === '*') continue;
        expect(BASES_SOURCE).toHaveProperty(c);
      }
    }
  });

  it('every base has at least one allowed effect and extra', () => {
    for (const base of Object.values(BASES_SOURCE)) {
      expect(base.allowedEffects.length, base.id).toBeGreaterThan(0);
      expect(base.allowedExtras.length, base.id).toBeGreaterThan(0);
    }
  });

  it('compat resolution: every base can pick at least one extra and one effect', () => {
    for (const base of Object.values(BASES_SOURCE)) {
      const extras = EXTRA_IDS.filter(id =>
        EXTRAS_SOURCE[id].compatibility.includes('*') || EXTRAS_SOURCE[id].compatibility.includes(base.id)
      );
      expect(extras.length, base.id).toBeGreaterThan(0);
    }
  });

  describe('B26 gate: Gen-Paare (Extra + Effect aus einer Zeile)', () => {
    it('jedes Pool-Gen hat genau ein Paar, beide Seiten sind gültige IDs', () => {
      for (const geneId of Object.keys(GENE_POOL)) {
        const pair: GenePair | undefined = GENE_PAIRS[geneId];
        expect(pair, `Gen ohne Paar: ${geneId}`).toBeDefined();
        expect(isValidExtra(pair!.extra), `${geneId} → ${pair!.extra}`).toBe(true);
        expect(isValidEffect(pair!.effect), `${geneId} → ${pair!.effect}`).toBe(true);
      }
      expect(Object.keys(GENE_PAIRS)).toHaveLength(Object.keys(GENE_POOL).length);
    });

    it('Referenz-Paar des Prototyps: fire = EXTRA_SPIKE + EFFECT_BURN', () => {
      expect(GENE_PAIRS['fire']).toEqual({ extra: 'EXTRA_SPIKE', effect: 'EFFECT_BURN' });
    });

    it('kein Paar-Ornament ist per Gen unerreichbar (mindestens eine Basis erlaubt es)', () => {
      for (const [geneId, pair] of Object.entries(GENE_PAIRS)) {
        const allowed = Object.values(BASES_SOURCE).some(b => b.allowedExtras.includes(pair.extra));
        expect(allowed, `${geneId} → ${pair.extra} wird von keiner Basis erlaubt`).toBe(true);
      }
    });

    // Befund des Prototyps (B26.2): Das Paar verspricht ein Ornament, das die Basis
    // wegfiltern kann. Feuerschützen ziehen aus THORN/FROND/FLOWER, der Dorn ist aber nur
    // mit CACTUS/THORN/ROOT kompatibel. Der Ist-Zustand wird hier gepinnt (Muster B14.3:
    // Beweis zuerst, dann in den Soll-Zustand drehen), damit die Content-Entscheidung
    // sichtbar wird: Kompatibilität erweitern oder Basis nach dem Paar wählen.
    it('Befund: das Feuer-Ornament erreicht nur 1 von 3 Schützen-Basen', () => {
      const compatible = TYPE_BASES.shooter.filter(b => EXTRAS_SOURCE.EXTRA_SPIKE.compatibility.includes(b));
      expect(compatible).toEqual(['BASE_THORN']);
    });

    it('Befund: Eye/Mouth/Scar erzeugt kein Gen — tote Ornament-Vokabel', () => {
      const used = new Set(Object.values(GENE_PAIRS).map(p => p.extra));
      const orphaned = EXTRA_IDS.filter(id => !used.has(id));
      expect([...orphaned].sort()).toEqual(['EXTRA_EYE', 'EXTRA_MOUTH', 'EXTRA_SCAR']);
    });
  });

  it('R2: die Route ist das Pathfinding-Ergebnis — es gibt keinen Fallback-Pfad mehr', async () => {
    // Alter Vertrag (resolveActiveRoute + ENEMY_PATH) ist GELÖSCHT: die Wahrheit des
    // Laufwegs lebt in der Sim (mapSystem.computeRoute), die Quelle kennt keine Route.
    const world = (await import('./world.source')) as unknown as Record<string, unknown>;
    expect(world.resolveActiveRoute).toBeUndefined();
    expect(world.ENEMY_PATH).toBeUndefined();
    expect(typeof world.isInsideWorld).toBe('function');
  });

  it('M4 (Sprint AP2): Weg-Gewicht ist source-only und bleibt unter der Wiese — 0.6 statt 0.45', async () => {
    const { MAP_TILES_SOURCE } = await import('./map.source');
    // Weg zieht Gegner an (< 1), aber der Vorsprung ist klein genug, dass Pflanzen-Kosten
    // (PLANT_ROUTE_COST = 2) auf Weg-Zellen das Maze-Layout spürbar machen.
    expect(MAP_TILES_SOURCE.path.weight).toBe(0.6);
    expect(MAP_TILES_SOURCE.path.weight).toBeLessThan(1);
    expect(MAP_TILES_SOURCE.decor.weight).toBe(1);
  });

  it('D4: PLANT_ROUTE_COST ist source-driven und Sim-Semantik passend (> DEFAULT_WEIGHT)', async () => {
    // Die Maze-Balance-Schraube lebt NUR hier — mapSystem.ts importiert sie (Regel 6).
    // Semantik-Lock: > MAP_DEFAULT_WEIGHT (sonst beugen Pflanzen den Weg nicht) und
    // < boulder-999 (Pflanzen blockieren nie — Softlock unmöglich).
    const { PLANT_ROUTE_COST, MAP_DEFAULT_WEIGHT } = await import('./map.source');
    const { MAP_TILES_SOURCE } = await import('./map.source');
    expect(PLANT_ROUTE_COST).toBe(2);
    expect(PLANT_ROUTE_COST).toBeGreaterThan(MAP_DEFAULT_WEIGHT);
    expect(PLANT_ROUTE_COST).toBeLessThan(MAP_TILES_SOURCE.boulder.weight);
  });
});
