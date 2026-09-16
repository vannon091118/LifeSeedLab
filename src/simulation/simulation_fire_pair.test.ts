import { describe, it, expect } from 'vitest';
import { SimulationRoot, makeCommand } from './root';
import type { Genome, PlantVariant } from '../types';
import { genomeToVisualInput, genomeEffectIds } from '../genome/visualMap';
import { resolveVisual, resolveBredVisuals, previewColor } from '../visual/generator';
import { deriveBredEntry } from '../meta/store';
import { GENE_PAIRS } from '../config/genes.source';
import { EXTRAS_SOURCE } from '../config/extras.source';
import { EFFECTS_SOURCE } from '../config/effects.source';
import { deriveSeed } from '../core/rng';
import { GAME_SEED } from '../config';

// ── B26-Prototyp: EIN Gen, drei Auswirkungen ────────────────────────────────
// `fire` ist das Referenz-Paar (EXTRA_SPIKE + EFFECT_BURN). Der Test läuft genau die drei
// Konsumenten ab, die vorher zwei unabhängige Tabellen lasen — und prüft, dass eine Zeile
// die Aussage an allen drei Stellen gleichzeitig trägt:
//
//   1. visualMap  → Ornament in der Silhouette + Effect-Tint (genomeToVisualInput/resolveVisual)
//   2. Vorschau   → Zucht/Hub zeigt dieselbe Palette wie das Feld (previewColor)
//   3. Run        → stats.effects[0] fährt auf dem Projektil mit und setzt beim Treffer Burn
//
// Gemessen wird gegen die echten Pfade (SimulationRoot, deriveBredEntry, resolveVisual) —
// keine Nachbildung der Kette im Test.

const SEED = 4242;

/** Feuerschütze: `fire` ist stärkstes Gen (→ Effekt-Riding) und liegt in den Top-2 (→ Ornament). */
const FIRE_GENOME: Genome = [
  { id: 'fire', power: 0.95, dominant: true },
  { id: 'rapid', power: 0.4, dominant: true },
];

const fireVariant: PlantVariant = {
  id: 'cross_fire',
  name: 'Branddorn',
  type: 'shooter',
  genome: FIRE_GENOME,
  traits: ['fire'],
  cost: 40,
  stats: { hp: 100, damage: 10, range: 4, cooldown: 10, special: null },
  color: '#fb923c',
  discovered: true,
};

describe('B26 — fire als Paar: eine Zeile, drei Kanäle', () => {
  it('1) Ornament und Effekt-Ziel stammen aus derselben Paar-Zeile', () => {
    const input = genomeToVisualInput(fireVariant, SEED);
    expect(GENE_PAIRS['fire']).toEqual({ extra: 'EXTRA_SPIKE', effect: 'EFFECT_BURN' });
    expect(input.extraIds).toContain('EXTRA_SPIKE');
    expect(input.effectIds).toEqual(['EFFECT_BURN']);
  });

  it('1b) der Effect-Tint der Pflanze ist die Brand-Palette der Source', () => {
    const resolved = resolveVisual(genomeToVisualInput(fireVariant, SEED));
    const tint = resolved.layers.find(l => l.key === 'effect_tint');
    expect(tint, 'kein effect_tint-Layer — der Effekt erreicht die Silhouette nicht').toBeDefined();
    expect(tint!.color).toBe(EFFECTS_SOURCE.EFFECT_BURN.paletteModifier);
  });

  it('2) Vorschau (Zucht/Hub) und Feld rufen dieselbe Pipeline auf', () => {
    const inRun = resolveBredVisuals([fireVariant], GAME_SEED).get(fireVariant.id)!;
    expect(previewColor(fireVariant, GAME_SEED)).toBe(inRun.palette.base);
  });

  // Die Vorschau bindet an GAME_SEED, das Feld an den Run-Seed (`deriveSeed(GAME_SEED,'world','run',
  // runId,1)`) — deshalb ist die belastbare Zusage die **Komposition**, nicht der Hex-Wert:
  // Basis, Ornament und Effect stehen allein aus dem Genom. Der Farb-/Scale-Jitter kommt aus dem
  // Seeded-RNG (`resolvePalette`-Mutation ±20/Kanal, Rarity-Zweig, Scale ±0.05) und darf sich
  // zwischen Menü und Feld unterscheiden. Bei Bedarf bindet die Vorschau an den künftigen Run-Seed.
  it('2b) Komposition ist seed-unabhängig: Menü-Seed und Run-Seed zeigen dieselbe Pflanze', () => {
    const runSeed = deriveSeed(GAME_SEED, 'world', 'run', 1, 1);
    const shown = resolveVisual(genomeToVisualInput(fireVariant, GAME_SEED));
    const field = resolveVisual(genomeToVisualInput(fireVariant, runSeed));
    expect(shown.baseId).toBe(field.baseId);
    expect(shown.extraIds).toEqual(field.extraIds);
    expect(shown.effectIds).toEqual(field.effectIds);
    expect(shown.layers.map(l => l.key)).toEqual(field.layers.map(l => l.key));
  });

  it('3) das Riding-Tag des Runs kommt aus dem Genom, nicht aus einer zweiten Tabelle', () => {
    expect(genomeEffectIds(FIRE_GENOME)[0]).toBe('EFFECT_BURN');
    expect(deriveBredEntry(fireVariant).effects).toContain('EFFECT_BURN');
  });

  it('3b) im echten Run fährt EFFECT_BURN auf dem Projektil und brennt beim Treffer', () => {
    const entry = deriveBredEntry(fireVariant);
    const root = new SimulationRoot({
      seed: SEED,
      runId: 1,
      loadout: [fireVariant.id],
      bredStats: { [fireVariant.id]: entry },
    });

    // Platzieren: 1,2 Zellen Abstand zum Wegpunkt (2.5,3.5) — legal und in Reichweite des Wegs.
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: fireVariant.id, gx: 4, gy: 3 }));
    root.stepOnce();
    expect(root.getSnapshot().plants).toHaveLength(1);

    root.commands.push(makeCommand(1, 'START_WAVE', 2, {}));
    root.stepOnce();

    // Der Schütze feuert von selbst (stats.effects[0] aus dem Genom) — bis zum ersten Schuss.
    let fired: { effectId: string | null } | null = null;
    for (let i = 0; i < 3000 && !fired; i++) {
      root.stepOnce();
      fired = root.getSnapshot().projectiles.find(p => p.effectId !== null) ?? null;
    }
    expect(fired, 'kein Projektil gefeuert — Schütze/Welle nicht verdrahtet?').not.toBeNull();
    expect(fired!.effectId).toBe('EFFECT_BURN');

    // Treffer: derselbe effectId setzt in enemySystem `burnTicks` (B6-Status).
    let burning = 0;
    for (let i = 0; i < 3000 && burning === 0; i++) {
      root.stepOnce();
      burning = root.getSnapshot().enemies.filter(e => e.burnTicks > 0).length;
    }
    expect(burning, 'kein Gegner brennt — effectId erreicht die Status-Anwendung nicht').toBeGreaterThan(0);
  });

  // Ist-Zustands-Pin des Prototyp-Befunds: die Kompatibilitätsliste der Basis kann das
  // Paar-Ornament stillschweigend entfernen. Gemessen über 12 Feuerschützen (nur die
  // Gen-Power variiert → der Genom-Hash wählt unterschiedliche Basen).
  it('Befund: je nach gezogener Basis verschwindet der Dorn — gemessen, nicht behauptet', () => {
    let withSpike = 0;
    const total = 12;
    for (let i = 0; i < total; i++) {
      const genome: Genome = [
        { id: 'fire', power: 0.5 + i * 0.03, dominant: true },
        { id: 'rapid', power: 0.3, dominant: true },
      ];
      const variant: PlantVariant = { ...fireVariant, id: `cross_fire_${i}`, genome };
      const resolved = resolveVisual(genomeToVisualInput(variant, SEED));
      if (resolved.layers.some(l => l.key === EXTRAS_SOURCE.EXTRA_SPIKE.asset)) withSpike++;
    }
    // EXTRA_SPIKE verträgt nur BASE_CACTUS/THORN/ROOT; Schützen ziehen THORN/FROND/FLOWER.
    expect(withSpike).toBeGreaterThan(0);
    expect(withSpike).toBeLessThan(total);
  });
});
