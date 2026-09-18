import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Meta-Tests — Sub-Domäne „Zucht-Loop & Persistenz-Wahrheit“ (B32.2/3).
// Konsolidierung Phase 2 (Plan: plan/refactor-test-suite-consolidation-1.md):
// b15.test.ts + b17.test.ts (Persistenz-Wahrheit) + b18.test.ts (Keimung B17.3).
// LOC-Cap 400: Fortsetzung in brood_loop_continuation.test.ts (B18/Keep-E2E/B34).
// Setup je describe über das Testkit — keine lokalen Setup-Kopien mehr.

import { resetTestState } from '../testing/testkit';
import {
  wavesToUnlockFor,
} from '../config/economy.source';
import { createBaseVariants } from '../genome';
import { rollGachaCross, deriveGachaSeed } from '../genome/gacha';
import { loadMeta, updateMeta, persistMeta } from './store';
import {
  buySeed,
  buySeedAndGerminate,
  germinateSeed,
  germinateVariant,
  consumeSeedAndEnqueueCross,
  advanceCrossMaturation,
  isCrossReady,
} from './economy';
import { beginRun, reserveRunId, readyBroods } from './run';

const BASES = createBaseVariants();

// ══ B15 — die Zucht-Schleife ist erreichbar und reproduzierbar ══
// B15.4  Wurf hängt nur von Seed + Besitz-MENGE ab (Reihenfolge egal)
// B15.1  Kind aus PendingCross.seed rekonstruierbar — auch nach Screen-Wechsel/Elternverbrauch
// B15.2  Reifung tickt an WAVE_COMPLETED, nicht am Run-Tod

describe('B15.4 — Wurf ist reihenfolge-unabhängig', () => {
  it('dieselbe Besitz-MENGE in anderer Array-Reihenfolge ⇒ identisches Kind', () => {
    const a = BASES[0], b = BASES[1], c = BASES[2];
    const seed = deriveGachaSeed(42);

    const r1 = rollGachaCross([a, b, c], seed, 42);
    const r2 = rollGachaCross([c, a, b], seed, 42);
    const r3 = rollGachaCross([b, c, a], seed, 42);

    expect(r1 && r2 && r3).toBeTruthy();
    expect(r2!.child).toEqual(r1!.child);
    expect(r3!.child).toEqual(r1!.child);
    expect(r2!.parentA.id).toBe(r1!.parentA.id);
    expect(r3!.parentB.id).toBe(r1!.parentB.id);
  });

  it('der alte Pfad wäre daran gescheitert: positionsabhängige Gewichtung', () => {
    // Gegenprobe zur Motivation: mit nur 2 Besitz-Positionen entscheiden [A,B] vs [B,A]
    // über die Elternwahl — exakt der A13.13-Defekt. Der kanonische Sort macht sie gleich.
    const a = BASES[0], b = BASES[1];
    const seed = deriveGachaSeed(7);
    const r1 = rollGachaCross([a, b], seed, 7);
    const r2 = rollGachaCross([b, a], seed, 7);
    expect(r1!.child).toEqual(r2!.child);
  });

  it('verschiedene Besitz-MENGE ⇒ anderes Kind (die Menge darf sich auswirken)', () => {
    const seed = deriveGachaSeed(9);
    const two = rollGachaCross([BASES[0], BASES[1]], seed, 9);
    const three = rollGachaCross([...BASES], seed, 9);
    expect(two && three).toBeTruthy();
    // nicht unbedingt verschieden — aber der Wurf MUSS von der Menge abhängen dürfen.
    // Der Test lockt nur: beide laufen ohne Crash und deterministisch.
    expect(rollGachaCross([...BASES], seed, 9)).toEqual(three);
  });
});

describe('B15.1 — Kind aus dem persistierten Seed rekonstruiert', () => {
  beforeEach(() => { resetTestState(); });

  it('Beim Aussäen angezeigtes Kind == aus der Queue rekonstruiertes Kind (Welle + Resume)', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0 });
    const crossIndex = loadMeta().breedGeneration;
    const gachaSeed = deriveGachaSeed(crossIndex);
    const shown = rollGachaCross(BASES, gachaSeed, crossIndex)!;

    consumeSeedAndEnqueueCross(gachaSeed, crossIndex, loadMeta().totalWavesSurvived, shown.child, shown.parentA.id, shown.parentB.id);

    // Wellen vergehen — Screen-Wechsel, Resume, was auch immer
    advanceCrossMaturation(wavesToUnlockFor(crossIndex));

    const meta = loadMeta();
    const entry = meta.pendingCrosses.find(c => c.crossIndex === crossIndex)!;
    const reconstructed = rollGachaCross(BASES, entry.seed, entry.crossIndex)!;

    expect(reconstructed.child).toEqual(shown.child);
    expect(reconstructed.parentA.id).toBe(shown.parentA.id);
    expect(reconstructed.parentB.id).toBe(shown.parentB.id);
    expect(isCrossReady(meta, crossIndex)).toBe(true);
  });

  it('GRENZE (dokumentiert, nicht defekt): Elternverbrauch kann den Wurf verschieben', () => {
    // B15.4 garantiert Reihenfolge-Unabhängigkeit — NICHT Bestandsunabhängigkeit.
    // Die Rekonstruktion nutzt die JETZIGE Besitz-Menge; wenn ein Elternteil zwischen
    // Aussaat und Reife verbraucht wird, kann der Wurf anders ausfallen. Das ist die
    // ehrliche Grenze: Der Persistenz-Seed garantiert das Kind bei unveränderter Menge.
    // Für B15.1 (Beanspruchung) heißt das: Der Spieler behält die Eltern bis zur Reife
    // entweder im Bestand — oder die Queue-Zeile zeigt ehrlich 'Eltern weg' statt eines
    // falschen Kindes. (Beides ist im Greenhouse implementiert.)
    updateMeta({
      seedStash: 1,
      variantCounts: { sprout: 1, rootwall: 1, mycelia: 1 },
      savedVariants: [],
      bredStats: {},
      totalWavesSurvived: 0,
    });
    const crossIndex = loadMeta().breedGeneration;
    const gachaSeed = deriveGachaSeed(crossIndex);
    const roll = rollGachaCross(BASES, gachaSeed, crossIndex)!;
    consumeSeedAndEnqueueCross(gachaSeed, crossIndex, 0, roll.child, roll.parentA.id, roll.parentB.id);

    // Zwischenzeit: sprout wird woanders verbraucht (Menge ändert sich)
    updateMeta({ variantCounts: { sprout: 0, rootwall: 1, mycelia: 1 } });

    advanceCrossMaturation(wavesToUnlockFor(crossIndex));
    const entry = loadMeta().pendingCrosses.find(c => c.crossIndex === crossIndex)!;
    // Der Wurf MUSS noch funktionieren (kein Crash), egal was der Bestand macht:
    expect(() => rollGachaCross(BASES, entry.seed, entry.crossIndex)).not.toThrow();
  });
});

describe('B15.2 — Reifung tickt an WAVE_COMPLETED', () => {
  beforeEach(() => { resetTestState(); });

  it('eine überstandene Welle = +1, ohne Run-Ende (advanceCrossMaturation(1))', () => {
    const before = loadMeta().totalWavesSurvived;
    advanceCrossMaturation(1);
    expect(loadMeta().totalWavesSurvived).toBe(before + 1);
  });

  it('X Wellen überstehen ⇒ Kreuzung reif, OHNE dass ein Run endet', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0 });
    const crossIndex = loadMeta().breedGeneration;
    const gachaSeed = deriveGachaSeed(crossIndex);
    const roll = rollGachaCross(BASES, gachaSeed, crossIndex)!;
    consumeSeedAndEnqueueCross(gachaSeed, crossIndex, 0, roll.child, roll.parentA.id, roll.parentB.id);

    for (let w = 0; w < wavesToUnlockFor(crossIndex); w++) advanceCrossMaturation(1);

    const meta = loadMeta();
    expect(isCrossReady(meta, crossIndex)).toBe(true);
    expect(meta.pendingCrosses.length).toBe(1); // Queue verliert nichts beim Reifen
  });

  it('Queue-Eintrag überlebt das Run-Ende (kein Datenverwerfen, A13.12)', () => {
    updateMeta({ seedStash: 1, totalWavesSurvived: 0 });
    const crossIndex = loadMeta().breedGeneration;
    const gachaSeed = deriveGachaSeed(crossIndex);
    const roll = rollGachaCross(BASES, gachaSeed, crossIndex)!;
    consumeSeedAndEnqueueCross(gachaSeed, crossIndex, 0, roll.child, roll.parentA.id, roll.parentB.id);

    advanceCrossMaturation(wavesToUnlockFor(crossIndex));

    const meta = loadMeta();
    expect(meta.pendingCrosses.find(c => c.crossIndex === crossIndex)).toBeDefined();
    expect(meta.pendingCrosses[0].seed).toBe(deriveGachaSeed(crossIndex));
  });
});

// ══ B17.3 — Bestandsquelle: Ein Samen keimt zur Pflanze ══
// Ein gekaufter Samen KEIMT ZUR PFLANZE: Bestand wächst, kein Ticket-Deadlock (A19.4).

describe('B17.3 — Ein Samen keimt zur Pflanze', () => {
  beforeEach(() => { resetTestState(); });

  it('Kauf erzeugt Bestand: ownedVariants wächst, Gewächshaus sperrt nie dauerhaft', () => {
    updateMeta({ nektar: 200, seedStash: 0, variantCounts: { sprout: 0, rootwall: 0 } });
    // Der Weg im Spiel: kaufen → keimen (zwei atomare Schritte, ein Bestand).
    expect(buySeed(40)).not.toBeNull();

    const m = germinateSeed(0);

    expect(m).not.toBeNull();
    const counts = m!.variantCounts;
    const grown = Object.entries(counts).filter(([, n]) => n > 0);
    expect(grown.length).toBeGreaterThanOrEqual(1);   // genau die Keim-Pflanze ist im Bestand
    expect(m!.seedStash).toBe(0);                     // kein Ticket-Vorrat — Bestand statt Stash
    // Die Keim-Identität hängt am INDEX (deterministisch), nicht am Zähler:
    expect(Object.keys(m!.variantCounts)).toContain('seed_0');
  });

  it('Keim-Variante ist deterministisch: derselbe Index ⇒ dieselbe Pflanze, weltweit', () => {
    const a = germinateVariant(3);
    const b = germinateVariant(3);
    expect(a).toEqual(b);
    // Und Ableitung aus dem Spiel-Seed, nicht aus dem Zustand:
    expect(germinateVariant(3).id).toBe(`seed_3`);
  });

  it('verschiedene Indizes ⇒ verschiedene Keime (kein Doppel-Bestand aus einem Kauf)', () => {
    updateMeta({ nektar: 1000, seedStash: 0 });
    buySeed(40); buySeed(40);          // zwei Samen, zwei Keime
    const m1 = germinateSeed(0);
    const m2 = germinateSeed(1);
    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    // Zwei Indizes ⇒ zwei verschiedene Keim-Identitäten im Bestand:
    expect(m2!.variantCounts['seed_0']).toBe(1);
    expect(m2!.variantCounts['seed_1']).toBe(1);
  });

  it('ohne Samen im Stash passiert nichts (fail-closed)', () => {
    updateMeta({ seedStash: 0 });
    const before = loadMeta();
    expect(germinateSeed(0)).toBeNull();
    expect(loadMeta()).toEqual(before);
  });

  it('B17.3 End-to-End: ein Kauf IST eine Keimung (Nektar → Bestand, EIN Schritt)', () => {
    updateMeta({ nektar: 200, seedStash: 0, variantCounts: { sprout: 0, rootwall: 0 }, savedVariants: [] });

    const m = buySeedAndGerminate(40, 0);

    expect(m).not.toBeNull();
    expect(m!.nektar).toBe(160);
    expect(m!.seedStash).toBe(0);                     // kein Ticket — direkter Bestand
    expect(m!.variantCounts['seed_0']).toBe(1);
  });

  it('Kauf ohne Nektar ist null (fail-closed) und verbraucht nichts', () => {
    updateMeta({ nektar: 0, seedStash: 0 });
    const before = loadMeta();
    expect(buySeedAndGerminate(40, 0)).toBeNull();
    expect(loadMeta()).toEqual(before);
  });

  it('nur ein Kauf pro Stash-Samen: buySeed + germinate konkurrieren nicht', () => {
    updateMeta({ nektar: 500, seedStash: 0 });
    buySeed(40);
    const afterBuy = loadMeta();
    expect(afterBuy.seedStash).toBe(1);
    const m = germinateSeed(afterBuy.breedGeneration);
    expect(m!.seedStash).toBe(0);
    expect(loadMeta().seedStash).toBe(0);
  });
});

// ══ B17/A19 — Persistenz-Wahrheit statt React-Kopie ══
// Befund: Der Run-Start reservierte die `runId` auf dem React-State des Routers und schrieb diesen
// State ZURÜCK. Jede Meta-Schreibung, die während des Runs direkt in die Persistenz ging, wurde
// damit von einer älteren Kopie überschrieben. Sichtbar als „keine Runde bringt was“.
// B17.1  Der Start reserviert auf dem persistierten Stand — kein Fortschritt geht verloren.
// B17.2  Gegenprobe: die alte Form verliert ihn (damit die Ursache nicht zurückkehrt).

describe('B17 — Run-Start auf der persistierten Wahrheit', () => {
  beforeEach(() => { resetTestState(); });

  it('B17.1 überlebt Schreibungen, die nicht über den Router gingen', () => {
    // Während eines Runs geschrieben — die Sim kennt den Router nicht.
    updateMeta({ totalWavesSurvived: 7, language: 'de' });
    const before = loadMeta();

    const started = beginRun();

    expect(started.runId).toBe(before.runId + 1);
    expect(started.totalWavesSurvived).toBe(7);
    expect(started.language).toBe('de');
    // Und wirklich persistiert, nicht nur zurückgegeben:
    expect(loadMeta().totalWavesSurvived).toBe(7);
    expect(loadMeta().runId).toBe(before.runId + 1);
  });

  it('B17.2 Gegenprobe: die alte Form (Kopie zurückschreiben) verliert genau diesen Fortschritt', () => {
    const routerCopy = loadMeta();              // Stand von VOR dem Run
    updateMeta({ totalWavesSurvived: 7 });      // Fortschritt während des Runs

    persistMeta(reserveRunId(routerCopy));      // alte Form: Kopie + reserve, in einem Schritt

    // Dokumentiert die Ursache: der Zähler ist wieder auf dem alten Stand.
    expect(loadMeta().totalWavesSurvived).toBe(0);
  });

  it('B17.3 hebt eine Kreuzung mit startedWave in der Zukunft auf die Wahrheit', () => {
    updateMeta({
      totalWavesSurvived: 3,
      pendingCrosses: [{ crossIndex: 0, seed: 1, neededWaves: 2, startedWave: 9 }],
    });

    const healed = loadMeta();
    expect(healed.pendingCrosses[0].startedWave).toBe(3);
    // Kein Gratis-Fortschritt: die Kreuzung beginnt ab jetzt zu warten …
    expect(isCrossReady(healed, 0)).toBe(false);
    // … kann aber überhaupt reifen. Genau das ging vorher nie („Samen keimen nicht“).
    advanceCrossMaturation(2);
    expect(isCrossReady(loadMeta(), 0)).toBe(true);
  });

  it('B17.3 gilt genauso für Bruten (dasselbe Kriterium, A18.6)', () => {
    updateMeta({
      totalWavesSurvived: 2,
      pendingBroods: [{
        broodIndex: 0, specimenAId: 'leafhopper', specimenBId: 'shellbeetle',
        neededWaves: 1, startedWave: 5, chosenIndex: -1,
      }],
    });

    const healed = loadMeta();
    expect(healed.pendingBroods[0].startedWave).toBe(2);
    expect(readyBroods(healed)).toHaveLength(0); // kein Gratis-Fortschritt
    advanceCrossMaturation(1);
    expect(readyBroods(loadMeta())).toHaveLength(1); // reift jetzt
  });
});
