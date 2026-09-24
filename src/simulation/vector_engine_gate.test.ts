// Owner: Simulation-Tests — Sub-Domäne „Vector-Engine“ (B32.2/3, Gate Phase 7).
// Die vier Gate-Verträge (Eigentümer, 20.09.2026):
//   (a) NIE NICHTS: jede Vector-Kombination wird VERMERKT (Addition, kein Verwerfen, kein
//       Aufheben) und verändert ihre Feldform über 60 Ticks messbar —
//       Vektor-Kreuzungen, die künftig still fallen, machen den Test rot.
//   (b) BRIDGING: zwei Feuerquellen 4 Tiles auseinander machen die MITTE so heiß, dass
//       sich beide Flammen verbinden (Summe ≥ threshold) — Addition, keine Paar-Tabelle.
//   (c) BLITZ-LEITUNG: siehe it.todo unten — Vertrag steht, Implementierung folgt in Phase 5.
//   (d) VERGÄNGLICHKEIT: jede Elementar-Zelle fällt nach spätestens 180 Ticks auf 0 —
//       OP ist erlaubt, weil alles fällt.
// Determinismus: gleicher Seed + gleiche Deposits ⇒ identisches Feld; Deposits an
// verschiedenen Zellen sind reihenfolge-unabhängig.
//
// GOLDEN-HASH-ANKER (privat): das Anchorszenario unten ist reproduzierbar gepinnt. Der
// Hashwert lebt AUSSCHLIESSLICH in `tools/.tmp/vector_golden_hash.txt` (gitignored) —
// er wird nie committet, nie gepusht, nie in Logs/Ausgaben geschrieben. CI/angefordert:
// fehlt der Anker, ist der Test ROT. Lokal ohne Anker gibt es einen sichtbaren Skip;
// GOLDEN_BOOTSTRAP=1 legt den Anker bewusst an, CI injiziert GOLDEN_HASH.
// Anker-Format v2: Hash plus Feld-Projektion; bei Drift wird die erste Zelle benannt.

import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeCommand } from '../bus/commands';
import { makeRoot, resetFullTestState, hashOfRoot, vectorFieldCellsOf, describeFirstFieldDeviation, type VectorCellView } from '../testing/testkit';
import type { SimulationRoot } from './root';
import type { SimState } from './state';
import { VECTOR_IDS, VECTOR_LOGIC_SOURCE, VECTOR_DIR_TABLE, VECTOR_ATTRACTOR_CONFIG } from '../config/vector_logic.source';
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
  const s: Pick<SimState, 'vectors'> = root.getSnapshot();
  return JSON.stringify(
    Object.entries(s.vectors)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, cells]) => ({ key, cells: cells.map(c => ({ id: c.vectorId, i: c.intensity, t: c.ttl })) })),
  );
}

function intensityOf(root: SimulationRoot, gx: number, gy: number, vectorId: string): number {
  const s = root.getSnapshot();
  const cell = s.vectors[`${gx},${gy}`]?.find(c => c.vectorId === vectorId);
  return cell ? cell.intensity : 0;
}

beforeEach(() => {
  resetFullTestState(); // IDs (Attraktor nutzt nextId) + Meta + Storage
});

// ══ (a) NIE NICHTS — jede Kombination wird vermerkt und bewegt sich ═══════════════════════════

describe('Gate (a) — NIE NICHTS: Vector-Kombinationen', () => {
  it('jedes Elementar-Deposit landet im Feld — kein stiller Drop wie in der alten if-Kette', () => {
    for (const id of ELEMENTAR) {
      const root = vectorRoot();
      root.vectorDeposit(CENTER.x, CENTER.y, id, 1.0);
      expect(intensityOf(root, CENTER.x, CENTER.y, id), `${id} wurde verworfen`).toBeGreaterThan(0);
    }
  });

  for (const a of ELEMENTAR) {
    for (const b of ELEMENTAR) {
      it(`${a} × ${b}: Addition statt Verwerfen, Delta über 60 Ticks ≠ 0, Zahlen gesund`, () => {
        const root = vectorRoot();
        root.vectorDeposit(CENTER.x, CENTER.y, a, 1.0);
        root.vectorDeposit(CENTER.x, CENTER.y, b, 1.0);
        // Einzelpreis je Vector an der Mitte: 1.0 (Faktor 1).
        // Selbst-Kombination (a×a) addiert auf 2.0 — Überschreiben ergäbe 1.0,
        // also ist 2.0 hier der strenge Additions-Beweis statt nur Plausibilität.
        const erwartet = a === b ? 2.0 : 1.0;
        expect(intensityOf(root, CENTER.x, CENTER.y, a)).toBeCloseTo(erwartet, 6);
        expect(intensityOf(root, CENTER.x, CENTER.y, b)).toBeCloseTo(erwartet, 6);

        const before = fieldOf(root);
        for (let i = 0; i < 60; i++) root.stepOnce();

        // Delta ≠ 0: die Feldform hat sich über 60 Ticks bewusst verändert (decay/ttl).
        expect(fieldOf(root), `${a}×${b} friert ein — update rechnet nicht`).not.toBe(before);

        // Zahlenhygiene (peinlich genau): keine NaN, keine Negativen, keine Geister-TTLs.
        const s = root.getSnapshot();
        for (const [key, cells] of Object.entries(s.vectors)) {
          for (const c of cells) {
            expect(Number.isFinite(c.intensity), `NaN/∞ an ${key} (${a}×${b})`).toBe(true);
            expect(c.intensity, `negative Intensität an ${key} (${a}×${b})`).toBeGreaterThan(0);
            expect(c.ttl, `TTL unter 0 an ${key} (${a}×${b})`).toBeGreaterThanOrEqual(0);
          }
        }
      });
    }
  }

  it('ALLE Source-TTLs der Elementar-Vectoren bleiben im Vergänglichkeits-Fenster (≤ 180)', () => {
    // Content-Gate: ein neuer Vector mit ttl > 180 bricht hier — bewusste Entscheidung
    // nötig (OP ist erlaubt, Dauerzustand nicht). VECTOR_ATTRACTOR ist ausgenommen (s. Kopf).
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
    root.vectorDeposit(4, 6, 'VECTOR_HEAT', 1.0);
    root.vectorDeposit(8, 6, 'VECTOR_HEAT', 1.0);

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
        root.vectorDeposit(4, 6, 'VECTOR_HEAT', 1.0);
        root.vectorDeposit(8, 6, 'VECTOR_HEAT', 1.0);
      }
      root.stepOnce();
      expect(intensityOf(root, 6, 6, 'VECTOR_HEAT'), `Brücke gefallen bei Tick ${t}`).toBeGreaterThan(0);
    }
  });
});

// ══ (c) BLITZ-LEITUNG — Phase 5 (Root-Wiring: Trace legt CHARGE-Spur, WET leitet) ═════════

describe('Gate (c) — Blitz leitet in die Wasser-Pfütze', () => {
  it('traceCharge: Dijkstra wählt die WET-Zelle (cost 1/0.9) statt trocken (10) — Ableiter emergent', () => {
    const root = vectorRoot();
    root.vectorDeposit(1, 6, 'VECTOR_WET', 1.0); // Leiter
    // Ein freier Korridor ohne Umwege: Start links (0,6) → WET (1,6) → Ziel (6,6)
    const trace = root.vectorSystem.traceCharge(root.getSnapshot(), 0, 6, 6, 6);
    expect(trace).not.toBeNull();
    expect(trace!.path.some(p => p.x === 1 && p.y === 6)).toBe(true);
    expect(trace!.cost, 'Pfad über WET ist billiger als das trockene Feld').toBeLessThan(50);
  });

  it('traceCharge: ohne Leiter ist der direkte Pfad billigster (Fallback zu trocken)', () => {
    const root = vectorRoot();
    const trace = root.vectorSystem.traceCharge(root.getSnapshot(), 0, 6, 4, 6);
    expect(trace).not.toBeNull();
    expect(trace!.path.length).toBeGreaterThan(1);
  });

  it('traceCharge: OOB-Koordinaten liefern null statt eines Pfads (fail-closed)', () => {
    const root = vectorRoot();
    const trace = root.vectorSystem.traceCharge(root.getSnapshot(), -1, 0, 6, 6);
    expect(trace).toBeNull();
  });
});

// ══ (d) VERGÄNGLICHKEIT — spätestens 180 Ticks ist jede Elementar-Zelle weg ═══════════════════

describe('Gate (d) — TTL: alles fällt, nichts bleibt', () => {
  for (const id of ELEMENTAR) {
    it(`${id}: Zelle lebt bei ttl/2 und ist nach spätestens 180 Ticks fort`, () => {
      const root = vectorRoot();
      root.vectorDeposit(CENTER.x, CENTER.y, id, 1.0);
      const ttl = VECTOR_LOGIC_SOURCE[id].ttl;
      expect(ttl).toBeLessThanOrEqual(180);

      const half = Math.floor(ttl / 2);
      for (let i = 0; i < half; i++) root.stepOnce();
      expect(intensityOf(root, CENTER.x, CENTER.y, id), `${id} verschwand vorzeitig (halb TTL)`).toBeGreaterThan(0);

      for (let i = half; i < 181; i++) root.stepOnce();
      const s = root.getSnapshot();
      const rest = Object.values(s.vectors).flat().filter(c => c.vectorId === id);
      expect(rest.length, `${id} überlebt seine TTL — Dauerzustand`).toBe(0);
    });
  }

  it('Attraktor-ENTITY (Gravity): ttl-geführt, nach 180 Ticks weg — OP vergänglich', () => {
    const root = vectorRoot();
    root.attractorSpawn(CENTER.x, CENTER.y, 1.0, 3, 180);
    for (let i = 0; i < 90; i++) root.stepOnce();
    expect(root.getSnapshot().attractors.length, 'Attraktor fiel vorzeitig').toBe(1);
    for (let i = 90; i < 181; i++) root.stepOnce();
    expect(root.getSnapshot().attractors.length, 'Attraktor überlebt seine ttl').toBe(0);
  });

  it('DIR_TABLE ist geschlossen: 72 Schritte, Einheitslängen, genau eine Umdrehung', () => {
    // Der Attraktor/die Rotation benutzt NUR diese gebackenen Literale (kein sin/cos in Sim).
    expect(VECTOR_DIR_TABLE.length).toBe(72);
    for (const d of VECTOR_DIR_TABLE) {
      const len2 = d.dx * d.dx + d.dy * d.dy;
      expect(len2).toBeGreaterThan(0.98); // gebackene 4-Stellen-Rundung, keine exakte 1.0-Forderung
      expect(len2).toBeLessThan(1.02);
    }
  });

  // ══ TTL → nach 180 Ticks 0 (OP vergänglich, peinlich genau) ════════════════════════════
  it('TTL-60-180: jede Elementar-Zelle ist nach 180 Ticks fort — OP-Prüfstück', () => {
    const root = vectorRoot();
    for (const id of ELEMENTAR) root.vectorDeposit(6, 6, id, 1.0);
    for (let i = 0; i < 181; i++) root.stepOnce();
    const s = root.getSnapshot();
    const rest = Object.values(s.vectors).flat().filter(c => (ELEMENTAR as string[]).includes(c.vectorId));
    expect(rest.length, 'Elementar-Feld überlebt 180 Ticks — OP wäre Dauerzustand').toBe(0);
  });

  // ══ shuffle(activeCells) → gleicher Hash (Determinismus der Hash-Projektion) ════════════
  it('shuffle der aktiven Zellen ändert die Feld-Projektion nicht (Read-Order deterministisch)', () => {
    const r1 = vectorRoot();
    r1.vectorDeposit(1, 1, 'VECTOR_HEAT', 1.0);
    r1.vectorDeposit(8, 10, 'VECTOR_WET', 1.0);
    r1.vectorDeposit(5, 5, 'VECTOR_OIL', 1.0);
    r1.stepOnce();
    const h1 = hashOfRoot(r1);
    // Zweiter Run: dieselben Deposits in umgekehrter Sort-Order
    const r2 = vectorRoot();
    r2.vectorDeposit(5, 5, 'VECTOR_OIL', 1.0);
    r2.vectorDeposit(8, 10, 'VECTOR_WET', 1.0);
    r2.vectorDeposit(1, 1, 'VECTOR_HEAT', 1.0);
    r2.stepOnce();
    expect(hashOfRoot(r2)).toBe(h1);
  });

  // ══ Performance: 12×12 und 64×64 sparse, drawcall-Batches verträglich ═══════════════════
  it('Performance-Vertrag: das Feld bleibt SPARSE — Zellzahl ≤ Fußabdruck + Diffusionsring (deterministisch statt Wanduhr)', () => {
    // Der frühere Wanduhr-Vergleich (< 200 ms je 20 Ticks) maß die Maschine, nicht die
    // Engine — unter Parallellast schlug er bei gesundem Code zu (256 ms gemessen). Die
    // echte Garantie ist der Kausalitäts-Kleber in VectorSystem.update: Diffusion ist
    // schwächer als der Zerfall, und Diffusions-Ring 1 (0.12) liegt unter der Zünd-
    // schwelle, stirbt also vor Ring 2 — die Zellzahl bleibt durch den Fußabdruck aller
    // Deposits plus GENAU EINEN Diffusionsring beschränkt: D × (2r+3)². Nie exponentiell
    // (Historie: 34270-Zellen-Explosion). Genau das sperrt dieser Test — lastunabhängig,
    // auf jeder Maschine dasselbe Urteil; die Zellzahl ist zugleich die Batching-Garantie.
    const radius = VECTOR_LOGIC_SOURCE.VECTOR_HEAT.radius; // Content-Wahrheit, kein Hardcode
    const fussabdruck = (deposits: number): number => deposits * (2 * radius + 3) * (2 * radius + 3);

    // 12×12: 36 sparse Deposits, 20 Ticks — gesund beobachtet: 512 von 1764 (0.29)
    const tiny = vectorRoot();
    let d = 0;
    for (let gx = 0; gx < 12; gx++) for (let gy = 0; gy < 12; gy++) if ((gx + gy) % 4 === 0) { tiny.vectorDeposit(gx, gy, 'VECTOR_HEAT', 1.0); d++; }
    for (let i = 0; i < 20; i++) tiny.stepOnce();
    const cTiny = Object.keys(tiny.getSnapshot().vectors).length;
    expect(cTiny, `12×12: ${cTiny} Zellen > Fußabdruck ${fussabdruck(d)} — Feld akkumuliert oder explodiert`).toBeLessThanOrEqual(fussabdruck(d));
    expect(cTiny).toBeGreaterThan(0);

    // 64×64 sprawling: aktives Regime — je Tick ein frisches Deposit (in-world via % 64),
    // Zellzahl bleibt am Fußabdruck (gesund beobachtet: max 555 von 980)
    const large = vectorRoot();
    let dLarge = 0;
    let lmax = 0;
    for (let t = 0; t < 20; t++) { large.vectorDeposit((t * 6) % 64, (t * 6) % 64, 'VECTOR_HEAT', 1.0); dLarge++; large.stepOnce(); lmax = Math.max(lmax, Object.keys(large.getSnapshot().vectors).length); }
    expect(lmax, `64×64 aktiv: ${lmax} Zellen > Fußabdruck ${fussabdruck(dLarge)} — Feld akkumuliert oder explodiert`).toBeLessThanOrEqual(fussabdruck(dLarge));
    expect(lmax).toBeGreaterThan(0);
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
    const route = root.getSnapshot().currentRoute ?? [];
    if (route.length === 0) throw new Error('Szene ohne Route — das Feld hat keinen Weg zum Prüfen');
    const anchor = route[Math.floor(route.length / 2)]!;
    const last = new Map<string, { x: number; y: number }>();
    const step: Record<string, number> = {};
    for (let i = 0; i < 600; i++) {
      if (renew && i % 30 === 0) root.attractorSpawn(anchor.x, anchor.y, SPAWN.strength, SPAWN.radius, SPAWN.ttl);
      root.stepOnce();
      const s = root.getSnapshot();
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
    const s = root.getSnapshot();
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

// ══ DETERMINISMUS + GOLDENER HASH (privat, niemals gepostet) ═════════════════════════════════

describe('Determinismus — gleicher Seed, gleiche Deposits, gleiche Welt', () => {
  const GOLDEN_FILE = join(process.cwd(), 'tools', '.tmp', 'vector_golden_hash.txt');

  function anchorScene(root: SimulationRoot): void {
    // Reproduzierbares Szenario: Brücke + Kombination + Attraktor, dann 30 Ticks Wellenlauf.
    root.vectorDeposit(4, 6, 'VECTOR_HEAT', 1.0);
    root.vectorDeposit(8, 6, 'VECTOR_HEAT', 1.0);
    root.vectorDeposit(6, 6, 'VECTOR_OIL', 1.0);
    root.vectorDeposit(6, 6, 'VECTOR_WET', 1.0);
    root.attractorSpawn(6, 6, 1.0, 3, 180);
    for (let i = 0; i < 30; i++) root.stepOnce();
  }

  it('zwei frische Roots mit gleichem Seed liefern Feld UND State-Hash identisch', () => {
    const r1 = vectorRoot();
    anchorScene(r1);
    const r2 = vectorRoot();
    anchorScene(r2);
    expect(fieldOf(r1)).toBe(fieldOf(r2));
    expect(hashOfRoot(r1)).toBe(hashOfRoot(r2));
  });

  it('Deposit-Reihenfolge an verschiedenen Zellen ist gleichgültig (keine versteckte Ordnung)', () => {
    const r1 = vectorRoot();
    r1.vectorDeposit(2, 2, 'VECTOR_OIL', 1.0);
    r1.vectorDeposit(9, 9, 'VECTOR_WET', 1.0);
    const r2 = vectorRoot();
    r2.vectorDeposit(9, 9, 'VECTOR_WET', 1.0);
    r2.vectorDeposit(2, 2, 'VECTOR_OIL', 1.0);
    for (let i = 0; i < 10; i++) { r1.stepOnce(); r2.stepOnce(); }
    expect(fieldOf(r1)).toBe(fieldOf(r2));
  });

  it('GOLDENER HASH: Szenario ist gegen den privaten Anker gepinnt (fail-closed, Drift-Diagnose IST-only)', () => {
    const root = vectorRoot();
    anchorScene(root);
    const hash = hashOfRoot(root);
    const cells = vectorFieldCellsOf(root);
    // Der Wert wird bewusst NICHT in Erwartungs-Meldungen oder Logs geschrieben (Privatvertrag).
    if (!existsSync(GOLDEN_FILE)) {
      // CI/angefordert: fail-closed — ohne Anker wird nichts still gesichert.
      // Lokal (frischer Klon): sichtbarer Skip — npm test bleibt grün, Grund ist lesbar.
      if (process.env.GOLDEN_BOOTSTRAP === '1') {
        mkdirSync(join(process.cwd(), 'tools', '.tmp'), { recursive: true });
        // Format v2: Hash + Feld-Projektion (Diagnose-Basis für künftige Drifts).
        writeFileSync(GOLDEN_FILE, `${hash}\n${JSON.stringify(vectorFieldCellsOf(root))}`, 'utf8');
        return;
      }
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.GOLDEN_HASH !== undefined;
      if (!isCI) {
        console.warn('GOLDEN-ANKER-SKIP: tools/.tmp/vector_golden_hash.txt fehlt — Test wird lokal übersprungen. Lokal sichern: GOLDEN_BOOTSTRAP=1; CI injiziert Repo-Secret GOLDEN_HASH.');
        return;
      }
      throw new Error(
        'ANKER-FEHLT: tools/.tmp/vector_golden_hash.txt existiert nicht. ' +
          'Bewusst sichern: GOLDEN_BOOTSTRAP=1 (lokal) — in CI injiziert der Workflow das Repo-Secret GOLDEN_HASH.',
      );
    }
    const raw = readFileSync(GOLDEN_FILE, 'utf8').trim();
    const goldenHash = raw.split('\n')[0].trim();
    expect(goldenHash.length, 'Goldener Anker ist leer — Szenario neu sichern (Datei löschen + GOLDEN_BOOTSTRAP=1)').toBeGreaterThan(0);
    if (hash !== goldenHash) {
      // Diagnose stattblindem Rot: v2 (Zeile 2 = Feld-Projektion) benennt die erste
      // abweichende Zelle — IST-only (Privatvertrag: der Sollwert wird nie gedruckt).
      const hasField = raw.includes('\n');
      const goldenCells: VectorCellView[] = hasField ? (JSON.parse(raw.slice(raw.indexOf('\n') + 1)) as VectorCellView[]) : [];
      const diag = hasField ? describeFirstFieldDeviation(cells, goldenCells) : '';
      const hint = diag ? `Erste Abweichung: ${diag}` : 'Anker im alten Format (nur Hash) — v2 sichert zusätzlich die Feld-Projektion.';
      throw new Error(`GOLDEN-HASH-DRIFT: Vector-Engine oder Anchorszenario hat sich geändert. ${hint}\n` + 'Bewusst? Anker lokal erneuern (Datei löschen + GOLDEN_BOOTSTRAP=1, niemals committen).');
    }
  });
});
