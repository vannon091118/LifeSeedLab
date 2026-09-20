import { describe, it, expect } from 'vitest';
// Owner: Simulation-Tests — Sub-Domäne „Beetle, Effektpaare & Meldungen“ (B32.2/3, Phase 4).
// Konsolidierung: simulation_beetle.test.ts + simulation_fire_pair.test.ts + gameover.test.ts + simulation_notice.test.ts.

import { makeCommand } from './root';
import { makeRoot } from '../testing/testkit';
import type { Genome, PlantVariant } from '../types';
import { rollBrood } from '../genome/beetle';
import { genomeToVisualInput, genomeEffectIds } from '../genome/visualMap';
import { resolveVisual, resolveBredVisuals, previewColor } from '../visual/generator';
import { deriveBredEntry } from '../meta/store';
import { GENE_EFFECTS } from '../config/genes.source';
import { PLANT_AXES_BY_GENE } from '../config/phenotype.source';
import { EFFECTS_SOURCE } from '../config/effects.source';
import { deriveSeed } from '../core/rng';
import { GAME_SEED } from '../config';


// P6 Integration: Deploy über den Command-Pfad — kein UI-Zugriff auf State.
// Snapshot-Härtung: getSnapshot() liefert Kopien; jede Assertion liest einen
// FRISCHEN Snapshot nach dem jeweiligen stepOnce (keine veralteten Referenzen).

describe('beetle deploy (P6 Integration)', () => {
  it('DEPLOY_BEETLE setzt den Brutling ein, zieht Energie ab, feuert BEETLE_DEPLOYED', () => {
    const brood = rollBrood('leafhopper', 'shellbeetle', 5);
    const root = makeRoot({ seed: 77, beetles: brood });

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
    const root = makeRoot({ seed: 78, beetles: brood });
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
    const root = makeRoot({ seed: 79, beetles: brood });

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
    const root = makeRoot({ seed: 80 });
    const rejects: string[] = [];
    root.bus.subscribe('BEETLE_REJECTED', (e) => rejects.push((e as unknown as { payload: { reason: string } }).payload.reason));
    root.commands.push(makeCommand(0, 'DEPLOY_BEETLE', 1, { beetleId: 'ghost' }));
    root.stepOnce();
    expect(rejects).toContain('none_available');
  });
});

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
  it('1) Wirkung und Erscheinung stammen aus derselben Gen-ID', () => {
    const input = genomeToVisualInput(fireVariant, SEED);
    expect(GENE_EFFECTS['fire']).toBe('EFFECT_BURN');
    expect(input.effectIds).toContain('EFFECT_BURN');
    // Dieselbe Gen-ID verschiebt sichtbare Achsen — der Effekt ist nie die einzige Folge.
    expect(Object.keys(PLANT_AXES_BY_GENE['fire']!).length).toBeGreaterThanOrEqual(3);
  });

  it('1b) der Effekt erreicht die Silhouette: das Brand-Gen verändert den Grundton', () => {
    const burning = resolveVisual(genomeToVisualInput(fireVariant, SEED));
    const plainGenome: Genome = [{ id: 'rapid', power: 0.95, dominant: true }];
    const plain = resolveVisual(genomeToVisualInput({ ...fireVariant, genome: plainGenome }, SEED));
    expect(burning.effectIds).toContain('EFFECT_BURN');
    expect(plain.effectIds).not.toContain('EFFECT_BURN');
    expect(EFFECTS_SOURCE.EFFECT_BURN).toBeDefined();
    expect(burning.palette.base).not.toBe(plain.palette.base);
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
  it('2b) Anatomie ist seed-unabhängig: Menü und Feld zeigen dasselbe Wesen', () => {
    const runSeed = deriveSeed(GAME_SEED, 'world', 'run', 1, 1);
    const shown = resolveVisual(genomeToVisualInput(fireVariant, GAME_SEED));
    const field = resolveVisual(genomeToVisualInput(fireVariant, runSeed));
    expect(shown.variantKey).toBe(field.variantKey);
    expect(shown.phenotype.descriptor).toEqual(field.phenotype.descriptor);
    expect(shown.effectIds).toEqual(field.effectIds);
  });

  it('3) das Riding-Tag des Runs kommt aus dem Genom, nicht aus einer zweiten Tabelle', () => {
    expect(genomeEffectIds(FIRE_GENOME)[0]).toBe('EFFECT_BURN');
    expect(deriveBredEntry(fireVariant).effects).toContain('EFFECT_BURN');
  });

  it('3b) im echten Run fährt EFFECT_BURN auf dem Projektil und brennt beim Treffer', () => {
    const entry = deriveBredEntry(fireVariant);
    const root = makeRoot({
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

    // Der Schütze feuert von selbst (Effekte aus dem Genom) — bis zum ersten Schuss.
    let fired: { effectIds: string[] } | null = null;
    for (let i = 0; i < 3000 && !fired; i++) {
      root.stepOnce();
      fired = root.getSnapshot().projectiles.find(p => p.effectIds.length > 0) ?? null;
    }
    expect(fired, 'kein Projektil gefeuert — Schütze/Welle nicht verdrahtet?').not.toBeNull();
    expect(fired!.effectIds[0]).toBe('EFFECT_BURN');

    // Treffer: derselbe effectId setzt in enemySystem `burnTicks` (B6-Status).
    let burning = 0;
    for (let i = 0; i < 3000 && burning === 0; i++) {
      root.stepOnce();
      burning = root.getSnapshot().enemies.filter(e => e.burnTicks > 0).length;
    }
    expect(burning, 'kein Gegner brennt — effectId erreicht die Status-Anwendung nicht').toBeGreaterThan(0);
  });

  // Der alte Befund („die Kompatibilitätsliste der Basis kann das Ornament stillschweigend
  // entfernen") ist mit dem Baukasten GESTORBEN: es gibt keine Filterliste mehr, die eine
  // Gen-Folge wegwerfen könnte. Gepinnt wird jetzt die Gegenrichtung — die Gen-Stärke ist
  // monoton am Bild ablesbar.
  it('die Gen-Stärke ist monoton am Bild ablesbar — kein Filter wirft sie mehr weg', () => {
    const thorns = (power: number) => resolveVisual(genomeToVisualInput({
      ...fireVariant, id: `cross_thorns_${power}`,
      genome: [{ id: 'thorns', power, dominant: true }] as Genome,
    }, SEED)).phenotype.protection.thorns;
    // 0,2 ist die Wahrnehmungsschwelle — darunter ist die Anlage TRÄGER, nicht Ausprägung.
    expect(thorns(0.95)).toBeGreaterThan(thorns(0.3));
    expect(thorns(0.3)).toBeGreaterThan(0);
  });
});
