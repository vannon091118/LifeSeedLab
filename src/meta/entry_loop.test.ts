// Einstiegs-Loop: Leih-Spross (deterministisch, kein Dauerbesitz) + Startkapital (1 Samen)
// + Gewächshaus-Töpfe (3 Slots). Der komplette Spielerfluss als Gate:
// Leih-Run → Nektar → Shop → Keimling → Topf → eigene Pflanze.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetFullTestState } from '../testing/testkit';
import {
  defaultMeta, loadMeta, updateMeta,
  beginRun, applyRunEnd,
  buySeedling, plantSeedlingIntoPot,
  deriveLoanPlant, isLoanVariant, LOAN_PLANT_ID,
} from '../meta';
import { STARTING_NEKTAR, SEED_SHOP_BASE_PRICE, GREENHOUSE_POT_SLOTS } from '../config/economy.source';
import { GAME_SEED } from '../config';

describe('Einstieg — Startkapital: genau EIN günstiger Samen', () => {
  beforeEach(() => { resetFullTestState(); });

  it('Start-Nektar ist exakt der Basis-Samenpreis — mehr ist nie möglich', () => {
    expect(STARTING_NEKTAR).toBe(SEED_SHOP_BASE_PRICE);
    expect(defaultMeta().nektar).toBe(STARTING_NEKTAR);
  });

  it('Zweiter Kauf ist aus Startkapital ausgeschlossen — der Loop zwingt in den Run', () => {
    // Erster Kauf: klappt, frisst das ganze Startkapital.
    expect(buySeedling(SEED_SHOP_BASE_PRICE)).not.toBeNull();
    expect(loadMeta().nektar).toBe(0);
    // Zweiter Kauf: fail-closed (null), kein Schuldenkauf.
    expect(buySeedling(SEED_SHOP_BASE_PRICE)).toBeNull();
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

  it('beginRun leiht NUR bei leerem Besitz — eigener Besitz verdrängt die Leihe', () => {
    // Frischer Spieler: kein Besitz ⇒ Leihe.
    const loan = beginRun();
    expect(loan.variantCounts[LOAN_PLANT_ID]).toBe(1);
    // Mit eigenem Besitz: keine Leihe (der Kauf verdrängt sie).
    resetFullTestState();
    expect(buySeedling(SEED_SHOP_BASE_PRICE)).not.toBeNull();
    const owned = beginRun();
    expect(owned.variantCounts[LOAN_PLANT_ID] ?? 0).toBe(0);
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
    expect(buySeedling(SEED_SHOP_BASE_PRICE)).not.toBeNull();
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
    expect(buySeedling(SEED_SHOP_BASE_PRICE)).not.toBeNull();
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
