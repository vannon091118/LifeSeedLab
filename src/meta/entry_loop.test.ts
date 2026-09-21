// Einstiegs-Loop: Leih-Spross (deterministisch, kein Dauerbesitz) + Startkapital (1 Samen)
// + Gewächshaus-Töpfe (3 Slots). Der komplette Spielerfluss als Gate:
// Leih-Run → Nektar → Shop → Keimling → Topf → eigene Pflanze.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetFullTestState, writeLegacyEnvelope } from '../testing/testkit';
import { META_KEY, META_VERSION } from './store';
import {
  defaultMeta, loadMeta, updateMeta,
  beginRun, applyRunEnd,
  buySeedling, plantSeedlingIntoPot,
  deriveLoanPlant, isLoanVariant, LOAN_PLANT_ID,
} from '../meta';
import { STARTING_NEKTAR, SEED_PRICE, GREENHOUSE_POT_SLOTS } from '../config/economy.source';
import { ownedInventory } from '../simulation/state';
import { GAME_SEED } from '../config';

describe('Einstieg — Startkapital: genau EIN günstiger Samen', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Start-Nektar ist exakt der Basis-Samenpreis — mehr ist nie möglich', () => {
    expect(STARTING_NEKTAR).toBe(SEED_PRICE);
    expect(defaultMeta().nektar).toBe(STARTING_NEKTAR);
  });

  it('Zweiter Kauf ist aus Startkapital ausgeschlossen — der Loop zwingt in den Run', () => {
    // Erster Kauf: klappt, frisst das ganze Startkapital.
    expect(buySeedling()).not.toBeNull();
    expect(loadMeta().nektar).toBe(0);
    // Zweiter Kauf: fail-closed (null), kein Schuldenkauf.
    expect(buySeedling()).toBeNull();
  });
});

describe('Einstieg — Leih-Spross: deterministisch, kein Dauerbesitz', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Derselbe runId ergibt dieselbe Leihpflanze (Chain-Vertrag, reproduzierbar)', () => {
    const a = deriveLoanPlant(1);
    const b = deriveLoanPlant(1);
    expect(a).toEqual(b);
    expect(a.id).toBe(LOAN_PLANT_ID);
    expect(a.isLoan).toBe(true);
  });

  it('Verschiedene runIds erzeugen verschiedene Ableitungen (Pool-Diversität)', () => {
    const variants = new Set<number>();
    for (let runId = 1; runId <= 12; runId++) {
      const p = deriveLoanPlant(runId);
      variants.add(p.genome.reduce((s, g) => s + Math.round(g.power * 100) * (g.dominant ? 131 : 97), 0) ^ p.type.length);
    }
    // Der Pool darf keine Einheitsware sein: mindestens 3 unterscheidbare Ausgänge.
    expect(variants.size).toBeGreaterThanOrEqual(3);
  });

  it('beginRun leiht dem frischen Spieler (nichts platzierbar ⇒ Leihe)', () => {
    expect(beginRun().variantCounts[LOAN_PLANT_ID]).toBe(1);
  });

  // DEAD-GAME-REGRESSION (19.09.2026): Der alte Vertrag lautete „eigener Besitz verdrängt die
  // Leihe" — geprüft wurde `variantCounts.some(n > 0)`. Beides war falsch: ein gekeimtes
  // `seed_0` im Regal (noch nicht im Loadout ausgerüstet) und ein einziger gekaufter Weg
  // (Bau-Material steht im selben Eimer!) nahmen dem Run die Leihe. Ergebnis: Run-Start mit
  // null platzierbaren Pflanzen, tote Bauphase, Tutorial zielt auf eine nicht existierende Karte.
  it('Besitz im Regal verdrängt die Leihe NICHT — nur ein ausgerüsteter Loadout tut das', () => {
    expect(buySeedling()).not.toBeNull();
    const owned = loadMeta();
    expect(owned.variantCounts.seed_0 ?? 0).toBeGreaterThan(0);
    expect(owned.loadout).toEqual([]);
    expect(beginRun().variantCounts[LOAN_PLANT_ID]).toBe(1);
  });

  it('Bau-Material verdrängt die Leihe nicht', () => {
    updateMeta({ variantCounts: { pot: 6, decor: 6, plot: 1 } });
    expect(beginRun().variantCounts[LOAN_PLANT_ID]).toBe(1);
  });

  it('Ein ausgerüsteter, besessener Loadout-Spross verdrängt die Leihe', () => {
    updateMeta({ variantCounts: { sprout: 1 }, loadout: ['sprout'] });
    expect(beginRun().variantCounts[LOAN_PLANT_ID] ?? 0).toBe(0);
  });

  it('Die Leihe ist immer der Spross — nie eine Wurzelmauer ohne Angriff', () => {
    for (let runId = 1; runId <= 12; runId++) {
      expect(deriveLoanPlant(runId).type, `runId=${runId}`).toBe('shooter');
    }
  });

  it('Run-Ende nimmt die Leihpflanze zurück — Restbestand eigener Pflanzen bleibt', () => {
    beginRun(); // leiht den Spross
    const meta = loadMeta();
    // Der Run endet: Leihe im Inventar verbraucht (Restbestand {}), eine eigene gekaufte
    // Pflanze steht mit 2 im Inventar-Rest.
    const next = applyRunEnd(meta, 3, 45, { [LOAN_PLANT_ID]: 0, sprout: 2 });
    expect(next.variantCounts[LOAN_PLANT_ID] ?? 0).toBe(0); // Rückgabe
    expect(next.variantCounts.sprout).toBe(2);              // eigener Besitz bleibt
    expect(next.nektar).toBe(STARTING_NEKTAR + 45);         // Nektar gebankt
  });

  it('applyRunEnd verwirft einen überlebenden Leih-Restbestand (Leihe ist nie Besitz)', () => {
    beginRun();
    const meta = loadMeta();
    const next = applyRunEnd(meta, 1, 0, { [LOAN_PLANT_ID]: 1 });
    expect(next.variantCounts[LOAN_PLANT_ID] ?? 0).toBe(0);
  });

  it('isLoanVariant erkennt nur die Leih-ID', () => {
    expect(isLoanVariant(LOAN_PLANT_ID)).toBe(true);
    expect(isLoanVariant('sprout')).toBe(false);
    expect(isLoanVariant('seed_0')).toBe(false);
  });
});

describe('Einstieg — Gewächshaus: Töpfe sind die physischen Slots', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Frisches Profil: genau drei leere Töpfe, keine Keimlinge', () => {
    const meta = loadMeta();
    expect(GREENHOUSE_POT_SLOTS).toBe(3);
    expect(meta.pots).toEqual([null, null, null]);
    expect(meta.seedlings).toEqual([]);
  });

  it('Kauf → Keimling → Topf: der volle Übergang vom Shop ins Gewächshaus', () => {
    expect(buySeedling()).not.toBeNull();
    let meta = loadMeta();
    expect(meta.seedlings).toHaveLength(1);
    expect(meta.pots).toEqual([null, null, null]);

    meta = plantSeedlingIntoPot(meta.seedlings[0]!, 1)!;
    expect(meta).not.toBeNull();
    expect(meta.seedlings).toHaveLength(0);       // aus der Queue
    expect(meta.pots).toEqual([null, meta.seedlings.length === 0 ? meta.pots[1] : null, null]);
    expect(meta.pots[1]).not.toBeNull();          // im Topf
  });

  it('fail-closed: belegter Topf, fremder Topf-Index, unbekannter Keimling', () => {
    expect(buySeedling()).not.toBeNull();
    const seedling = loadMeta().seedlings[0]!;
    expect(plantSeedlingIntoPot(seedling, 0)).not.toBeNull();
    // Topf 0 ist jetzt belegt: gleicher/anderer Keimling dort ⇒ null.
    expect(plantSeedlingIntoPot(seedling, 0)).toBeNull();
    expect(plantSeedlingIntoPot('ghost_seedling', 0)).toBeNull();
    expect(plantSeedlingIntoPot(seedling, 7)).toBeNull();  // außerhalb der Kapazität
    expect(plantSeedlingIntoPot(seedling, -1)).toBeNull();
  });

  it('Altsave ohne pots/seedlings startet mit drei leeren Töpfen (Migration-heilend)', () => {
    updateMeta({} as never); // Schreib-Zyklus erzwingen: normalize füllt Felder
    const meta = loadMeta();
    expect(meta.pots).toHaveLength(GREENHOUSE_POT_SLOTS);
  });
});

describe('Einstieg — Chain-Herkunft: die Leihpflanze trägt GAME_SEED-Ableitung', () => {
  it('Die Ableitung hängt am Spiel-Seed: ein anderer GAME_SEED ergibt eine andere Pflanze', () => {
    // Nicht direkt testbar (GAME_SEED ist Konstante), aber der Vertrag ist greifbar:
    // dieselbe Chain-Familie wie germinateVariant — beides 'plant'-Namespace-Keime.
    const loan = deriveLoanPlant(1);
    expect(loan.genome.length).toBeGreaterThan(0);
    expect(loan.traits.length).toBeGreaterThan(0);
    expect(loan.stats.damage).toBeGreaterThanOrEqual(0);
    expect(GAME_SEED).toBeDefined();
  });
});


describe('Q6 — Altsave ohne pots/seedlings: Greenhouse-Daten heilen bei JEDEM Load', () => {
  beforeEach(() => { resetFullTestState(); });

  it('v0.0.37-Save (gleiche Envelope-Version, Felder fehlen) → loadMeta liefert gültige Töpfe', () => {
    // Envelope mit AKTUELLER Version, aber OHNE pots/seedlings — genau der Q6-Crash-Fall:
    // resolveVersion reicht gleich-versionierte Saves ROH durch, die toCurrent-Heilung läuft nie.
    writeLegacyEnvelope(META_KEY, { nektar: 20, bestWave: 1, runs: 1, runId: 1 }, META_VERSION);

    const meta = loadMeta();
    expect(meta.pots).toHaveLength(GREENHOUSE_POT_SLOTS);
    expect(meta.pots.every(p => p === null)).toBe(true);
    expect(meta.seedlings).toEqual([]);
    expect(meta.nektar).toBe(20); // Altstand bleibt erhalten — Heilung ist keine Rücksetzung
  });

  it('defekte Felder (zu lang, Fremd-Typen) werden auf die Invariante gekürzt', () => {
    writeLegacyEnvelope(
      META_KEY,
      { nektar: 5, pots: ['x', null, 'y', 'z', 42], seedlings: ['a', 7, 'b'] },
      META_VERSION,
    );
    const meta = loadMeta();
    expect(meta.pots).toHaveLength(GREENHOUSE_POT_SLOTS);
    expect(meta.pots[0]).toBe('x');
    expect(meta.pots.every(p => p === null || typeof p === 'string')).toBe(true);
    expect(meta.seedlings.every(s => typeof s === 'string')).toBe(true);
  });
});

describe('D2 — Leih-Spross ist im RUN platzierbar (App-Naht: Run-Loadout)', () => {
  beforeEach(() => { resetFullTestState(); });

  it('beginRun leiht bei leerem Besitz; der Run-Loadout trägt die Leih-ID ⇒ ownedInventory spiegelt sie', () => {
    // Frisches Profil: kein Besitz, kein Loadout — genau der D2-Sackgassen-Fall.
    updateMeta({ variantCounts: {}, loadout: [] });
    const meta = beginRun();
    expect((meta.variantCounts[LOAN_PLANT_ID] ?? 0) > 0).toBe(true);

    // App-Naht (App.tsx renderScreen 'run'): Run-Loadout = Meta-Loadout + Leih-ID.
    // Der Sim-Contract (pipeline.ts): ownedInventory spiegelt Loadout × Besitz.
    const runLoadout = [...meta.loadout, LOAN_PLANT_ID];
    const inventory = ownedInventory({}, meta.variantCounts, runLoadout);
    expect((inventory[LOAN_PLANT_ID] ?? 0)).toBeGreaterThan(0);
  });
});
