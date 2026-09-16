import { describe, it, expect, beforeEach } from 'vitest';

// storage nutzt globalThis.localStorage — Polyfill via Owner-Helfer (persistence/testDom.ts)
import { clearTestStorage } from '../persistence/testDom';
import { deriveSeed, makeRng, GAMEPLAY_NAMESPACES, VISUAL_NAMESPACES } from '../core/rng';
import { GAME_SEED } from '../config';
import { BROOD_SEED_NAMESPACE } from '../config/beetles.source';
import { deriveBroodSeed, rollBrood, broodGenomeHash, toDeploySpec } from './beetle';

const { resetMeta, updateMeta, loadMeta } = await import('../meta/store');
const { enqueueBrood, claimBrood } = await import('../meta/run');

// ══ B30 — Brut-Identität hat eine eigene Domäne ═════════════════════════════
// Befund: unter dem Namespace 'enemy' lagen drei verschiedene Spielbereiche — Gegner-Spawn
// (`enemySystem`), Crit-Rolls (`projectileSystem`) und die Käferzucht (`deriveBroodSeed` und der
// Brut-Stream). Kein Strom wurde dabei geteilt (`makeRng` erzeugt je Aufruf einen unabhängigen
// Strom), aber wer die eine Ableitung ändert, zieht die andere mit. Die Zuchtwirtschaft ist eine
// bezahlte Spielmechanik (35 Nektar), Gegnerverhalten ist es nicht.
//
// Die Migration ist ein SCHARFER SCHNITT (Entscheidung in quality-spec B30): die Eingaben
// (Eltern-IDs, broodIndex) bleiben, nur der Namespace wechselt. Deshalb zeigt ein noch nicht
// abgeholter Wurf einmalig drei andere Kandidaten. Dieser Test friert ein, was dabei gilt:
// der neue Seed, die Kandidaten, die Unverletztheit der Gegner-Domäne — und die Invariante, die
// den Schnitt überhaupt vertretbar macht: jede persistierte Brut bleibt abholbar.

const A = 'leafhopper';
const B = 'shellbeetle';
/** Brut-Einträge, wie sie in einem Save stehen (Eingaben, keine Ableitung). */
const STORED_BROOD_INDEXES = [0, 1, 2, 7, 42];

describe('B30 — Brut-Domäne', () => {
  // Meta-Operationen (enqueue/claim) brauchen einen leeren Store — wie in meta/identity.test.ts.
  beforeEach(() => { resetMeta(); clearTestStorage(); });

  it('führt eine eigene Spiel-Domäne (FX ON/OFF darf sie nie stören)', () => {
    expect(BROOD_SEED_NAMESPACE).toBe('brood');
    expect(GAMEPLAY_NAMESPACES).toContain('brood');
    expect(VISUAL_NAMESPACES).not.toContain('brood');
  });

  it('trennt Brut-, Gegner- und Pflanzen-Domäne bei identischen Eingaben', () => {
    const brood = deriveBroodSeed(A, B, 1);
    expect(brood).not.toBe(deriveSeed(GAME_SEED, 'enemy', A, `${B}:1`, 1));
    expect(brood).not.toBe(deriveSeed(GAME_SEED, 'plant', A, `${B}:1`, 1));
    // Der alte Namespace lieferte genau diesen Wert — er darf nicht mehr herauskommen.
    expect(brood).not.toBe(2357272887);
  });

  it('friert Seed, Kandidaten-IDs und die unberührte Gegner-Domäne ein', () => {
    // Brut-Domäne (neu). Ändert jemand Namespace oder Ableitungs-Argumente, bricht dieser Test.
    expect(deriveBroodSeed(A, B, 1)).toBe(905729497);
    expect(deriveBroodSeed('bumble', B, 3)).toBe(1523112797);

    expect(rollBrood(A, B, 1).map(c => `${c.id}|${broodGenomeHash(c)}`)).toEqual([
      'brood_ez8xcp_0|hyb-4614c77f',
      'brood_ez8xcp_1|hyb-14754f06',
      'brood_ez8xcp_2|hyb-16fe1d7a',
    ]);

    // Gegner-Domäne: unverändert (der Schnitt durfte hier nichts bewegen).
    expect(makeRng('enemy', 12345).next()).toBe(0.6971246670000255);
    // Derselbe Zahlen-Seed in der Brut-Domäne ist ein anderer Strom (Namespace-Qualifizierung).
    expect(makeRng('brood', 12345).next()).toBe(0.6579577717930079);
    expect(makeRng('brood', 12345).next()).not.toBe(makeRng('enemy', 12345).next());
  });

  it('Migrations-Invariante: jede persistierte Brut bleibt abholbar (3 gültige Kandidaten)', () => {
    for (const index of STORED_BROOD_INDEXES) {
      const brood = rollBrood(A, B, index);
      expect(brood, `Brut ${index} liefert keine Kandidaten mehr`).toHaveLength(3);
      expect(new Set(brood.map(c => c.id)).size).toBe(3);
      for (const candidate of brood) {
        expect(candidate.stats.hp).toBeGreaterThan(0);
        expect(toDeploySpec(candidate).cost).toBeGreaterThan(0);
      }
    }
  });

  it('Migrations-Entscheidung: die Brut speichert keine Ableitung (kein Schema-Bump)', () => {
    // Der gespeicherte Eintrag trägt ausschließlich Eingaben. Wer hier ein Seed-/Namespace-Feld
    // ergänzt, baut eine zweite Identitäts-Quelle ein — dann muss diese Sperre bewusst geändert
    // werden, und die Migrationsfrage ist neu zu beantworten (B30).
    enqueueBrood(A, B, 1);
    const stored = loadMeta().pendingBroods[0];
    expect(Object.keys(stored).sort()).toEqual(
      ['broodIndex', 'chosenIndex', 'neededWaves', 'specimenAId', 'specimenBId', 'startedWave'],
    );
  });

  describe('Abholung nach dem Schnitt (echte Meta-Operationen)', () => {
    it('ein unveränderter Alteintrag wird ohne Migration abgeholt — Vorschau == Abholung', () => {
      // Genau der Zustand, den ein Save vor dem Update trägt: Eingaben, kein Seed.
      updateMeta({
        pendingBroods: [{ broodIndex: 7, specimenAId: A, specimenBId: B, neededWaves: 1, startedWave: 0, chosenIndex: -1 }],
        totalWavesSurvived: 5,
        broodGeneration: 8,
      });
      const after = claimBrood(7, 0);
      const claimed = after.beetles[0];
      expect(claimed).toBeDefined();
      expect(claimed.id).toBe(rollBrood(A, B, 7)[0].id);
      expect(after.pendingBroods).toHaveLength(0);
      // Der Zähler bleibt monoton — der Schnitt recycelt keinen Index.
      expect(after.broodGeneration).toBe(8);
    });

    it('eine neu gebuchte Brut reift und wird zum Specimen der neuen Domäne', () => {
      enqueueBrood(A, B, 1);
      updateMeta({ totalWavesSurvived: 3 });
      const after = claimBrood(0, 2);
      expect(after.beetles).toHaveLength(1);
      expect(after.beetles[0].id).toBe(rollBrood(A, B, 0)[2].id);
      expect(after.beetles[0].id.startsWith('brood_')).toBe(true);
    });
  });
});
