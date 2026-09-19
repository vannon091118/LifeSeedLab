import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Meta-Tests — Sub-Domäne „Brut-Identität & Brut-Domäne“ (B32.2/3).
// Konsolidierung Phase 2 (Plan: plan/refactor-test-suite-consolidation-1.md):
// identity.test.ts (Brut-Teile) + genome/genome_brood_domain.test.ts (Seed-Pins, B30).
// Setup je describe über das Testkit — keine lokalen Setup-Kopien mehr.

import {
  resetTestState,
  resetFullTestState,
  writeLegacyEnvelope,
} from '../testing/testkit';
import { ensureLocalStorage } from '../persistence/testDom';
import { fnv1a } from '../core/hash';
import { deriveSeed, makeRng, GAMEPLAY_NAMESPACES, VISUAL_NAMESPACES } from '../core/rng';
import { GAME_SEED } from '../config';
import { BROOD_SEED_NAMESPACE, BEETLE_BREED } from '../config/beetles.source';
import { deriveBroodSeed, rollBrood, broodGenomeHash, toDeploySpec } from '../genome/beetle';
import { loadMeta, updateMeta, resetMeta, META_KEY, META_VERSION } from './store';
import { enqueueBrood, claimBrood } from './run';

const A = 'leafhopper';
const B = 'shellbeetle';
/** Brut-Einträge, wie sie in einem Save stehen (Eingaben, keine Ableitung). */
const STORED_BROOD_INDEXES = [0, 1, 2, 7, 42];

// ══ B14.1/B14.3 — Brut-Identität ist monoton, nie aus einem Fenster abgeleitet ══
// Befund A13.1: `enqueueBrood` leitete den broodIndex aus `Math.max(...pendingBroods) + 1` ab.
// `claimBrood` verkleinert das Fenster ⇒ der verbrauchte Index wurde erneut vergeben ⇒
// identischer Brut-Seed ⇒ identische Specimen-ID. Das Fenster-Maximum ist als Aggregation
// reihenfolge-unabhängig, aber nicht STABIL — Identität gehört in einen monotonen Zähler.

describe('B14 — Brut-Identität', () => {
  beforeEach(() => {
    resetTestState();
    // B39 (QA v0.0.53 #2): die Brut kostet Nektar — diese Tests prüfen Identität/Monotonie,
    // nicht Wirtschaft, deshalb steht der Kontostand hier bewusst hoch.
    updateMeta({ nektar: 5000 });
  });

  it('vergibt einen verbrauchten broodIndex nicht erneut', () => {
    enqueueBrood(A, B, 1);                 // broodIndex 0
    enqueueBrood(A, B, 1);                 // broodIndex 1
    updateMeta({ totalWavesSurvived: 99 }); // A18.1: claim setzt Reife voraus — hier erzwingen
    claimBrood(1, 0);                      // höchster Index fällt aus dem Fenster

    const third = enqueueBrood(A, B, 1);

    // Vorher: max([0]) + 1 = 1 ⇒ Recycling. Jetzt: monotoner Zähler ⇒ 2.
    expect(third.pendingBroods.map(p => p.broodIndex)).toEqual([0, 2]);
    expect(third.broodGeneration).toBe(3);
  });

  it('UNREIFE Brut wird nicht ausgegeben (fail-closed, A18.1)', () => {
    enqueueBrood(A, B, 3);                 // neededWaves 3, Zähler steht bei 0
    const meta = loadMeta();
    const after = claimBrood(0, 0);        // unreif ⇒ unverändert
    expect(after).toStrictEqual(meta);
    expect(loadMeta().beetles.length).toBe(0);
    expect(loadMeta().pendingBroods.length).toBe(1);
  });

  it('UNBEKANNTER broodIndex ändert nichts (fail-closed, A18.1)', () => {
    const before = loadMeta();
    const after = claimBrood(999, 0);
    expect(after).toStrictEqual(before);
  });

  it('UNBEKANNTER Kandidaten-Index wählt NICHT stillschweigend 0 (A18.1)', () => {
    enqueueBrood(A, B, 1);
    updateMeta({ totalWavesSurvived: 99 }); // Reife erzwingen

    const before = loadMeta();
    const after = claimBrood(0, 7);        // Kandidat 7 existiert nicht (nur 0–2)

    expect(after).toStrictEqual(before);
    expect(loadMeta().beetles.length).toBe(0);
    expect(loadMeta().pendingBroods.length).toBe(1);
  });

  it('erzeugt nie zwei Specimen mit identischer ID im Brut-Lager', () => {
    enqueueBrood(A, B, 1);                 // 0
    enqueueBrood(A, B, 1);                 // 1
    updateMeta({ totalWavesSurvived: 99 }); // Reife für die ersten beiden (startedWave 0)
    claimBrood(1, 0);
    enqueueBrood(A, B, 1);                 // 2 (nicht 1 — das war das Recycling; startedWave 99)
    updateMeta({ totalWavesSurvived: 100 }); // und jetzt reift auch die dritte
    claimBrood(2, 0);

    const ids = loadMeta().beetles.map(b => b.id);

    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('schreibt Zähler und Brut-Eintrag im selben Schritt', () => {
    const first = enqueueBrood(A, B, 1);

    expect(first.broodGeneration).toBe(1);
    expect(first.pendingBroods[0].broodIndex).toBe(0);
    claimBrood(0, 0);
    expect(loadMeta().broodGeneration).toBe(1); // Zähler läuft nicht zurück
  });

  it('Vorschau und Enqueue verwenden dieselbe Generation (A13.2)', () => {
    const previewIds = rollBrood(A, B, loadMeta().broodGeneration).map(c => c.id);
    const created = enqueueBrood(A, B, 1);
    const index = created.pendingBroods[created.pendingBroods.length - 1].broodIndex;

    expect(rollBrood(A, B, index).map(c => c.id)).toEqual(previewIds);
  });

  it('derselbe Index ⇒ dieselbe Brut (belegt, warum die Generation stabil bleiben muss)', () => {
    expect(rollBrood(A, B, 1).map(c => c.id)).toEqual(rollBrood(A, B, 1).map(c => c.id));
    expect(rollBrood(A, B, 1).map(c => c.id)).not.toEqual(rollBrood(A, B, 2).map(c => c.id));
  });
});

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

describe('B30 — Brut-Domäne', () => {
  beforeEach(() => {
    resetTestState();
    // B39 (QA v0.0.53 #2): die Brut kostet Nektar — diese Tests prüfen Identität/Monotonie,
    // nicht Wirtschaft, deshalb steht der Kontostand hier bewusst hoch.
    updateMeta({ nektar: 5000 });
  });

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

    // R3-MIGRATION (bewusst, nicht beiläufig): die Kandidaten-Genome laufen jetzt durch den
    // GEMEINSAMEN Zuchtkern (genome/breeding.ts, Neuheitsdruck + Dominanz-Regeln) statt durch
    // den früheren `mergeGenomes`-Sonderweg. Die IDs (Seed-abhängig) bleiben, die Genome ändern
    // sich EINMALIG. Der Seed-Pin oben (905729497) ist unverändert — die Ableitung selbst hat
    // sich nicht bewegt, nur die Auswertung der Gene.
    expect(rollBrood(A, B, 1).map(c => `${c.id}|${broodGenomeHash(c)}`)).toEqual([
      'brood_ez8xcp_0|hyb-81c71438',
      'brood_ez8xcp_1|hyb-802592e0',
      'brood_ez8xcp_2|hyb-4a6b2eec',
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
    // Der gespeicherte Eintrag trägt ausschließlich EINGABEN — keine Seeds, keine Namespaces,
    // keine abgeleiteten Genome der Kinder. R3 ergänzt zwei Eingaben: die VORFAHREN (Genom +
    // Generation je Elternteil). Ohne sie wäre ein gezüchtetes Tier nur eine ID, und die Kette
    // fiele beim nächsten Brüten auf die Gründer zurück — genau der Befund, der behoben wurde.
    enqueueBrood(A, B, 1);
    const stored = loadMeta().pendingBroods[0];
    expect(Object.keys(stored).sort()).toEqual(
      ['broodIndex', 'chosenIndex', 'neededWaves', 'parentAAncestor', 'parentBAncestor',
        'specimenAId', 'specimenBId', 'startedWave'],
    );
    // Und die Vorfahren sind wirklich die Genome der übergebenen Gründer (keine Ableitung):
    // `leafhopper` bringt genau sein Source-Genom mit, Generation 1.
    expect(stored.parentAAncestor!.specimenId).toBe(A);
    expect(stored.parentAAncestor!.genome.map(g => g.id)).toEqual(['sprinter']);
    expect(stored.parentAAncestor!.generation).toBe(1);
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

// ══ B14.2 — Migration v4 → v5 ohne Identitätsverlust ══

describe('B14 — Migration v4 → v5', () => {
  beforeEach(() => {
    resetTestState();
    // B39 (QA v0.0.53 #2): die Brut kostet Nektar — diese Tests prüfen Identität/Monotonie,
    // nicht Wirtschaft, deshalb steht der Kontostand hier bewusst hoch.
    updateMeta({ nektar: 5000 });
  });

  it('leitet broodGeneration aus bereits vergebenen Kennungen ab', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 4, nektar: 123, bestWave: 3, runs: 2, runId: 3, breedGeneration: 1,
      variantCounts: {}, savedVariants: [], loadout: [], language: 'de', audioOn: true,
      pvpPayouts: 0, seedStash: 0, pendingCrosses: [], totalWavesSurvived: 4,
      bredStats: {}, beetleDeployed: null,
      beetles: [{ id: 'brood_legacy', generation: 9 }],
      pendingBroods: [{ broodIndex: 7, specimenAId: A, specimenBId: B, neededWaves: 1, startedWave: 0, chosenIndex: -1 }],
    }, 4);

    const meta = loadMeta();

    expect(meta.version).toBe(META_VERSION);
    expect(meta.nektar).toBe(123);
    expect(meta.broodGeneration).toBe(10); // max(7, 9) + 1
  });

  it('vergibt nach der Migration keine bestehende Kennung erneut', () => {
    writeLegacyEnvelope(META_KEY, {
      version: 4, nektar: 500, pendingBroods: [{ broodIndex: 4, specimenAId: A, specimenBId: B, neededWaves: 1, startedWave: 0, chosenIndex: -1 }],
      beetles: [],
    }, 4);

    const created = enqueueBrood(A, B, 1);
    const indexes = created.pendingBroods.map(p => p.broodIndex);

    expect(indexes).toEqual([4, 5]);
  });

  it('Altsave mit Legacy-Checksumme wird gelesen und beim Schreiben kanonisiert (B14.6)', () => {
    writeLegacyEnvelope(META_KEY, { version: 4, nektar: 77 }, 4);

    expect(loadMeta().nektar).toBe(77);

    const stored = JSON.parse(ensureLocalStorage().getItem(META_KEY) as string) as { v: number; checksum: number; data: unknown };
    expect(stored.v).toBe(META_VERSION);
    // Nach dem Schreiben greift die kanonische Prüfung.
    expect(fnv1a(0x811c9dc5, JSON.stringify(stored.data))).not.toBe(stored.checksum);
  });
});

/**
 * B39 — DER eigentliche QA-Befund (v0.0.53 #2, „free beetle breeding", 3/3 reproduziert):
 * `BeetleLab` prüfte den Kontostand, aber die Abbuchung existierte nirgends — Brut war gratis.
 * Der Vertrag gehört hierhin (Meta-Writer), nicht in den Screen.
 */
describe('B39 — Brut kostet Nektar', () => {
  beforeEach(() => { resetTestState(); });

  it('bucht die Brutkosten ab (Brut ist keine Gratis-Aktion)', () => {
    updateMeta({ nektar: 100 });
    const before = loadMeta().nektar;
    const after = enqueueBrood(A, B, 1);
    expect(after.pendingBroods).toHaveLength(1);
    expect(after.nektar).toBe(before - BEETLE_BREED.nektarCost);
    expect(loadMeta().nektar).toBe(before - BEETLE_BREED.nektarCost);
  });

  it('fail-closed: zu wenig Nektar ⇒ keine Brut, kein Zähler, kein Nektar weg', () => {
    updateMeta({ nektar: BEETLE_BREED.nektarCost - 1 });
    const before = loadMeta();
    const after = enqueueBrood(A, B, 1);
    expect(after.pendingBroods).toHaveLength(0);
    expect(after.broodGeneration).toBe(before.broodGeneration);
    expect(after.nektar).toBe(before.nektar);
  });
});

describe('B14 — Reset-Hygiene der Brut-Identität (voller Testkit-Reset)', () => {
  it('nach resetFullTestState() startet die Brut-Wirtschaft bei null (kein Zähler-Drift)', () => {
    updateMeta({ nektar: 5000 });   // B39: zwei Bruten müssen bezahlbar sein
    enqueueBrood(A, B, 1);
    enqueueBrood(A, B, 1);
    updateMeta({ totalWavesSurvived: 99 });
    claimBrood(1, 0);
    expect(loadMeta().broodGeneration).toBe(2);

    resetFullTestState();

    const fresh = enqueueBrood(A, B, 1);
    expect(fresh.pendingBroods.map(p => p.broodIndex)).toEqual([0]);
    expect(fresh.broodGeneration).toBe(1);
  });

  it('resetMeta allein genügt für einen frischen Meta-Speicher (kein Storage-Rest)', () => {
    updateMeta({ nektar: 5000 });   // B39: die Brut kostet Nektar
    enqueueBrood(A, B, 1);
    resetMeta();
    expect(loadMeta().broodGeneration).toBe(0);
    expect(loadMeta().pendingBroods).toHaveLength(0);
  });
});
