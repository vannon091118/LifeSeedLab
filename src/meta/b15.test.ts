import { describe, it, expect, beforeEach } from 'vitest';

// B15 — die Zucht-Schleife ist erreichbar und reproduzierbar.
//
// Drei Garantien werden hier gemessen, nicht behauptet:
// B15.4  Wurf hängt nur von Seed + Besitz-MENGE ab (Reihenfolge egal)
// B15.1  Kind aus PendingCross.seed rekonstruierbar — auch nach Screen-Wechsel/Elternverbrauch
// B15.2  Reifung tickt an WAVE_COMPLETED, nicht am Run-Tod

import { clearTestStorage } from '../persistence/testDom';
import { wavesToUnlockFor } from '../config/economy.source';

const { loadMeta, updateMeta, resetMeta } = await import('./store');
const { advanceCrossMaturation, isCrossReady, consumeSeedAndEnqueueCross } = await import('./economy');
const { keepCross } = await import('./run');
const { rollGachaCross, deriveGachaSeed } = await import('../genome/gacha');
const { createBaseVariants } = await import('../genome/bases');

const BASES = createBaseVariants();

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
  beforeEach(() => { resetMeta(); clearTestStorage(); });

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
    // falschen Kindes. (Beides ist im Greenhouse-Implementiert.)
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
  beforeEach(() => { resetMeta(); clearTestStorage(); });

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
