// Owner: Simulation-Tests — Sub-Domäne „Vector-Engine“ (B32.2/3, Gate Phase 7).
// Die vier Gate-Verträge (Eigentümer, 20.09.2026):
//   (a) NIE NICHTS: jede Vector-Kombination wird im reinen VectorSystem-Fixture als
//       source-getriebene Matrix geprüft; hier bleibt der Root-Integrationsvertrag für
//       repräsentative Addition, Command-/PlantShot-Wiring und fail-closed Deposits.
//   (b) BRIDGING: zwei Feuerquellen 4 Tiles auseinander machen die MITTE so heiß, dass
//       sich beide Flammen verbinden (Summe ≥ threshold) — Addition, keine Paar-Tabelle.
//   (c) BLITZ-LEITUNG: WET ist ein Leiter; OOB, Fractional- und Nullpfad bleiben fail-closed.
//   (d) VERGÄNGLICHKEIT: jede Elementar-Zelle fällt nach spätestens 180 Ticks auf 0 —
//       OP ist erlaubt, weil alles fällt.
import { describe, it, expect, beforeEach } from 'vitest';
import { makeCommand } from '../bus/commands';
import { makeRoot, resetFullTestState, vectorFieldCellsOf, testAttractorSpawn, testTraceCharge, testVectorDeposit } from '../testing/testkit';
import type { SimulationRoot } from './root';
import { VECTOR_IDS, VECTOR_LOGIC_SOURCE, VECTOR_ATTRACTOR_CONFIG } from '../config/vector_logic.source';
import { ENEMIES_SOURCE, type EnemyTypeId } from '../config/enemies.source';

const SEED = 2447771834; // runId 1 (testkit-Vertrag) — derselbe Anker-Seed wie die Suite-Konvention
const CENTER = { x: 6, y: 6 };

/** Die sechs ELEMENTAR-Vectoren. VECTOR_ATTRACTOR ist als Zell-Flag reserviert (ttl 9999,
 *  "lebt solange die Quelle lebt") — Gravity wird über den Attraktor-ENTITY-Vertrag geprüft. */
const ELEMENTAR = VECTOR_IDS.filter(id => id !== 'VECTOR_ATTRACTOR');

function vectorRoot(): SimulationRoot {
  const root = makeRoot({ seed: SEED });
  root.commands.push(makeCommand(0, 'START_WAVE', 1, {}));
  root.stepOnce(); // → phase 'wave': vectors.update/attractors.update laufen im Wellen-Zweig
  return root;
}

/** Feld-Serialisierung (key, vectorId, intensity, ttl) — die Projektion für Delta-Vergleiche. */
function fieldOf(root: SimulationRoot): string {
  return JSON.stringify(vectorFieldCellsOf(root));
}

function intensityOf(root: SimulationRoot, gx: number, gy: number, vectorId: string): number {
  const s = root.getObservation();
  const cell = s.vectors[`${gx},${gy}`]?.find(c => c.vectorId === vectorId);
  return cell ? cell.intensity : 0;
}

beforeEach(() => {
  resetFullTestState(); // IDs (Attraktor nutzt nextId) + Meta + Storage
});

describe('Vector-Engine — echter Command-/PlantShot-Pfad', () => {
  it('Command → PlantShot → getObservation bleibt synchron und liefert gesunde Zellen', () => {
    const root = makeRoot({ seed: SEED, loadout: ['sprout'], ownedCounts: { sprout: 1 } });
    root.commands.push(makeCommand(0, 'PLACE_PLANT', 1, { variantId: 'sprout', gx: 0, gy: 0 }));
    root.commands.push(makeCommand(0, 'START_WAVE', 2, {}));
    let seen = false;
    for (let i = 0; i < 600 && !seen; i++) {
      root.stepOnce();
      const observation = root.getObservation();
      seen = Object.keys(observation.vectors).length > 0;
      for (const cells of Object.values(observation.vectors)) {
        for (const cell of cells) {
          expect(Number.isFinite(cell.intensity)).toBe(true);
          expect(Number.isFinite(cell.ttl)).toBe(true);
        }
      }
    }
    expect(seen, 'der reale Pflanzenschuss hat keinen Vector-State beobachtbar gemacht').toBe(true);
  });
});

// Die vollständige Kombinations-, Bounds-, Sortier- und TTL-Matrix liegt in
// `vectorSystem.test.ts`; dieser Gate-Test bleibt bewusst auf den echten Root-Wiring-Pfad.

describe('Gate (a) — NIE NICHTS: Vector-Kombinationen', () => {
  it('jedes Elementar-Deposit landet im Feld — kein stiller Drop', () => {
    for (const id of ELEMENTAR) {
      const root = vectorRoot();
      testVectorDeposit(root, CENTER.x, CENTER.y, id, 1);
      expect(intensityOf(root, CENTER.x, CENTER.y, id), `${id} wurde verworfen`).toBeGreaterThan(0);
    }
  });

  it('ungültige Deposits erzeugen weder Geisterzellen noch NaN/∞', () => {
    const root = vectorRoot();
    const invalid = [
      { gx: 1.5, gy: 2.5, vectorId: 'VECTOR_HEAT', intensity: 1 },
      { gx: 2, gy: 2, vectorId: 'VECTOR_HEAT', intensity: Number.NaN },
      { gx: 2, gy: 2, vectorId: 'VECTOR_HEAT', intensity: Number.POSITIVE_INFINITY },
      { gx: 2, gy: 2, vectorId: 'VECTOR_HEAT', intensity: 0 },
      { gx: 2, gy: 2, vectorId: 'VECTOR_HEAT', intensity: -1 },
      { gx: 2, gy: 2, vectorId: 'VECTOR_UNKNOWN', intensity: 1 },
    ] as const;
    for (const { gx, gy, vectorId, intensity } of invalid) {
      testVectorDeposit(root, gx, gy, vectorId, intensity);
    }
    expect(root.getObservation().vectors).toEqual({});
  });

  it('eine repräsentative Kombination bleibt am Root additiv und bewegt sich', () => {
    const root = vectorRoot();
    testVectorDeposit(root, CENTER.x, CENTER.y, 'VECTOR_HEAT', 1);
    testVectorDeposit(root, CENTER.x, CENTER.y, 'VECTOR_WET', 1);
    expect(intensityOf(root, CENTER.x, CENTER.y, 'VECTOR_HEAT')).toBeCloseTo(1, 6);
    expect(intensityOf(root, CENTER.x, CENTER.y, 'VECTOR_WET')).toBeCloseTo(1, 6);

    const before = fieldOf(root);
    for (let i = 0; i < 60; i++) root.stepOnce();
    expect(fieldOf(root), 'Root-Feld friert ein').not.toBe(before);
  });

  it('ALLE Source-TTLs der Elementar-Vectoren bleiben im Vergänglichkeits-Fenster (≤ 180)', () => {
    for (const id of ELEMENTAR) {
      expect(VECTOR_LOGIC_SOURCE[id].ttl, `${id} ttl > 180 — Dauerzustand im Feld`).toBeLessThanOrEqual(180);
    }
  });
});

// ══ (b) BRIDGING — zwei Flammen 4 Tiles auseinander verbinden die Mitte ══════════════════════

describe('Gate (b) — Bridging über 4 Tiles', () => {
  it('zwei HEAT-Quellen (Radius 2) machen die Mittte heiß: Summe ≥ threshold', () => {
    const root = vectorRoot();
    // Quellen bei (4,6) und (8,6) — 4 Tiles Abstand, Lücke genau bei (6,6). Radius 2
    // erreicht die Mitte von beiden Seiten mit Faktor 0.6: 0.6 + 0.6 = 1.2 = threshold.
    testVectorDeposit(root, 4, 6, 'VECTOR_HEAT', 1.0);
    testVectorDeposit(root, 8, 6, 'VECTOR_HEAT', 1.0);

    const bridge = intensityOf(root, 6, 6, 'VECTOR_HEAT');
    const threshold = VECTOR_LOGIC_SOURCE.VECTOR_HEAT.threshold ?? Infinity;
    expect(bridge).toBeCloseTo(1.2, 6);           // Addition beider Beiträge — kein Überschreiben
    expect(bridge, 'Mitte erreicht threshold nicht — Flammen verbinden sich nicht').toBeGreaterThanOrEqual(threshold);
    expect(bridge, 'Mitte ist kälter als ein Einzelpfad — Bridging rechnet nicht').toBeGreaterThan(0.6);
  });

  it('der Brückenpfad trägt durch: die Mitte bleibt über 60 Ticks besetzt (Nachlegen der Quellen)', () => {
    const root = vectorRoot();
    for (let t = 0; t < 60; t++) {
      if (t % 10 === 0) { // Quellen feuern kadenzhaft (später: PlantSystem als Produzent)
        testVectorDeposit(root, 4, 6, 'VECTOR_HEAT', 1.0);
        testVectorDeposit(root, 8, 6, 'VECTOR_HEAT', 1.0);
      }
      root.stepOnce();
      expect(intensityOf(root, 6, 6, 'VECTOR_HEAT'), `Brücke gefallen bei Tick ${t}`).toBeGreaterThan(0);
    }
  });
});

// Blitzpfad, Bounds und leere Felder werden in `vectorSystem.test.ts` direkt am
// VectorSystem geprüft; der Root-Test unten behält nur den echten Integrationspfad.

describe('Gate (c) — Blitz leitet in die Wasser-Pfütze', () => {
  it('traceCharge: WET-Zelle ist billiger als trockener Fallback', () => {
    const root = vectorRoot();
    testVectorDeposit(root, 1, 6, 'VECTOR_WET', 1);
    const trace = testTraceCharge(root, root.getObservation(), 0, 6, 6, 6);
    expect(trace).not.toBeNull();
    expect(trace!.path.some(point => point.x === 1 && point.y === 6)).toBe(true);
    expect(trace!.cost).toBeLessThan(50);
  });

  it('traceCharge: ohne Leiter bleibt der direkte Fallback-Pfad', () => {
    const root = vectorRoot();
    const trace = testTraceCharge(root, root.getObservation(), 0, 6, 4, 6);
    expect(trace).not.toBeNull();
    expect(trace!.path.length).toBeGreaterThan(1);
  });

  it('traceCharge: Grenzkoordinaten bleiben fail-closed', () => {
    const root = vectorRoot();
    const cases = [
      { label: 'out of bounds', from: [-1, 0] as const, to: [6, 6] as const },
      { label: 'fractional x', from: [0.5, 0] as const, to: [6, 6] as const },
      { label: 'fractional y', from: [0, 0.5] as const, to: [6, 6] as const },
    ] as const;
    for (const { label, from, to } of cases) {
      expect(testTraceCharge(root, root.getObservation(), from[0], from[1], to[0], to[1]), label).toBeNull();
    }
  });

  it('traceCharge: gleicher Start und Ziel bleiben ein gültiger Nullpfad', () => {
    const root = vectorRoot();
    expect(testTraceCharge(root, root.getObservation(), 2, 2, 2, 2)).toEqual({ path: [{ x: 2, y: 2 }], cost: 0 });
  });
});

// ══ (d) VERGÄNGLICHKEIT — spätestens 180 Ticks ist jede Elementar-Zelle weg ═══════════════════

describe('Gate (d) — TTL und Diffusion im Root', () => {
  it('Attraktor-ENTITY (Gravity): ttl-geführt, nach 180 Ticks weg — OP vergänglich', () => {
    const root = vectorRoot();
    testAttractorSpawn(root, CENTER.x, CENTER.y, 1.0, 3, 180);
    for (let i = 0; i < 90; i++) root.stepOnce();
    expect(root.getObservation().attractors.length, 'Attraktor fiel vorzeitig').toBe(1);
    for (let i = 90; i < 181; i++) root.stepOnce();
    expect(root.getObservation().attractors.length, 'Attraktor überlebt seine ttl').toBe(0);
  });

  // Die Elementar-TTL, Radius-0 und Source-DIR-Tabelle liegen in der reinen Vector-Fixture.
  // Der Root-Test prüft nur den tatsächlichen Diffusions-/Batching-Vertrag.
  it('Performance-Vertrag: das Feld bleibt SPARSE — Zellzahl ≤ Fußabdruck + Diffusionsring', () => {
    const radius = VECTOR_LOGIC_SOURCE.VECTOR_HEAT.radius;
    const fussabdruck = (deposits: number): number => deposits * (2 * radius + 3) * (2 * radius + 3);
    const tiny = vectorRoot();
    const { cols: tinyCols, rows: tinyRows } = tiny.getObservation();
    let deposits = 0;
    for (let gx = 0; gx < tinyCols; gx++) {
      for (let gy = 0; gy < tinyRows; gy++) {
        if ((gx + gy) % 4 === 0) {
          testVectorDeposit(tiny, gx, gy, 'VECTOR_HEAT', 1.0);
          deposits += 1;
        }
      }
    }
    for (let i = 0; i < 20; i++) tiny.stepOnce();
    const tinyCells = Object.keys(tiny.getObservation().vectors).length;
    expect(tinyCells).toBeGreaterThan(0);
    expect(tinyCells).toBeLessThanOrEqual(fussabdruck(deposits));

    const active = vectorRoot();
    const { cols, rows } = active.getObservation();
    let activeDeposits = 0;
    let maxCells = 0;
    for (let tick = 0; tick < 20; tick++) {
      testVectorDeposit(active, (tick * 6) % cols, (tick * 6) % rows, 'VECTOR_HEAT', 1.0);
      activeDeposits += 1;
      active.stepOnce();
      maxCells = Math.max(maxCells, Object.keys(active.getObservation().vectors).length);
    }
    expect(maxCells).toBeGreaterThan(0);
    expect(maxCells).toBeLessThanOrEqual(fussabdruck(activeDeposits));
  });
});

// ══ (e) ATTRACTOR — ziehen statt fangen (Befund 20.09.2026: „kein Creep folgt mehr dem Weg") ══
// Der frühere Zug `strength*0.1/d` wuchs zur Feldmitte unbeschränkt und hat Gegner vom Brett
// geschleudert (gemessen: x = -519). Zwei Eigenschaften müssen halten, sonst ist die Welle
// unspielbar: kein Gegner verlässt das Brett, und keine Schrittweite übersteigt das eigene
// Tempo plus den erlaubten Feld-Anteil. Der Deckel ist ein ANTEIL (`maxShare`), keine Zellzahl.

describe('Gate (e) — Attraktor: ziehen statt fangen', () => {
  const SPAWN = VECTOR_ATTRACTOR_CONFIG.spawn;

  /** Welle mit dauerhaft erneuertem Feld auf einer WEGZELLE (die reale Pflanzensituation:
   *  die Pflanze steht neben dem Weg und legt je Schuss ein Feld). Liefert die größte
   *  Schrittweite je Gegnertyp, die Endlage und den Schnitt des Weg-Fortschritts. */
  function fieldRun(renew: boolean): { avg: number; step: Record<string, number>; outside: number } {
    const root = vectorRoot();
    const route = root.getObservation().currentRoute ?? [];
    if (route.length === 0) throw new Error('Szene ohne Route — das Feld hat keinen Weg zum Prüfen');
    const anchor = route[Math.floor(route.length / 2)]!;
    const last = new Map<string, { x: number; y: number }>();
    const step: Record<string, number> = {};
    for (let i = 0; i < 600; i++) {
      if (renew && i % 30 === 0) testAttractorSpawn(root, anchor.x, anchor.y, SPAWN.strength, SPAWN.radius, SPAWN.ttl);
      root.stepOnce();
      const s = root.getObservation();
      for (const e of s.enemies) {
        const prev = last.get(e.id);
        if (prev) {
          const dx = e.px - prev.x;
          const dy = e.py - prev.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          step[e.typeId] = Math.max(step[e.typeId] ?? 0, d);
        }
        last.set(e.id, { x: e.px, y: e.py });
      }
    }
    const s = root.getObservation();
    const progress = s.enemies.map(e => e.pathProgress);
    return {
      avg: progress.length > 0 ? progress.reduce((a, b) => a + b, 0) / progress.length : 0,
      step,
      outside: s.enemies.filter(e => e.px < 0 || e.py < 0 || e.px > s.cols || e.py > s.rows).length,
    };
  }

  it('kein Gegner verlässt das Brett und keine Schrittweite übersteigt Tempo·(1+maxShare)', () => {
    const mit = fieldRun(true);
    expect(mit.outside, 'Gegner außerhalb des Bretts — das Feld schleudert statt zu ziehen').toBe(0);
    const gesehen = Object.keys(mit.step);
    expect(gesehen.length, 'keine Gegner im Lauf — der Test misst nichts').toBeGreaterThan(0);
    for (const typeId of gesehen) {
      const speed = ENEMIES_SOURCE[typeId as EnemyTypeId].speed;
      const bound = speed * (1 + VECTOR_ATTRACTOR_CONFIG.maxShare);
      expect(mit.step[typeId], `${typeId}: Schritt über dem eigenen Tempo + Feld-Anteil`)
        .toBeLessThanOrEqual(bound + 1e-9);
    }
  });

  it('das Feld zieht wirklich (Schritt > Lauf-Tempo), ohne den Weg zu kappen', () => {
    const ohne = fieldRun(false);
    const mit = fieldRun(true);
    // Kontrolle: ohne Feld ist die Schrittweite EXAKT das Lauf-Tempo — kein versteckter Zug.
    expect(ohne.step.grunt).toBeCloseTo(ENEMIES_SOURCE.grunt.speed, 6);
    // Der Zug ist messbar (sonst wäre der Fix ein No-op und dieser Test blind).
    expect(mit.step.grunt).toBeGreaterThan(ENEMIES_SOURCE.grunt.speed);
    // Und der Weg bleibt gangbar: gemessen 0,50 MIT vs 0,48 OHNE (das Feld liegt auf der
    // Wegzelle — wer davor läuft, wird sogar VORGEZOGEN; deshalb keine Richtungs-Behauptung,
    // nur die Untergrenze des Fortschritts).
    expect(mit.avg).toBeGreaterThan(ohne.avg * 0.7);
  });
});
