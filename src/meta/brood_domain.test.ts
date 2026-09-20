import { describe, it, expect, beforeEach } from 'vitest';

// Owner: Meta-Tests — Sub-Domäne „Brut-Domäne & Seed-Pins“ (B32.2/3).
// Ausgelagert aus `brood_identity.test.ts` (19.09.2026): die Datei riss mit 233/200 Code-Zeilen den
// Meta-LOC-Cap. Geteilt wurden die THEMEN, nicht die Zeilen — hier der Namespace-Schnitt (B30) mit
// seinen Seed-Pins und Schnitt-Invarianten, dort die monotone Brut-IDENTITÄT (B14) samt Migration
// und Kosten (B39). Kein Test ist verloren; zusammen sind beide Dateien grün unter dem Cap.

import {
  resetTestState,
} from '../testing/testkit';
import { deriveSeed, makeRng, GAMEPLAY_NAMESPACES, VISUAL_NAMESPACES } from '../core/rng';
import { GAME_SEED } from '../config';
import { BROOD_SEED_NAMESPACE, BEETLES_SOURCE } from '../config/beetles.source';
import { deriveBroodSeed, rollBrood, broodGenomeHash, toDeploySpec } from '../genome/beetle';
import { loadMeta, updateMeta } from './store';
import { enqueueBrood, claimBrood } from './run';

const A = 'leafhopper';
const B = 'shellbeetle';
/** Brut-Einträge, wie sie in einem Save stehen (Eingaben, keine Ableitung). */
const STORED_BROOD_INDEXES = [0, 1, 2, 7, 42];

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
    // POOL-ERWEITERUNG (19.09.2026, bewusster Identitätsbruch): die Gründer tragen jetzt ein
    // ERBGUT (3–4 Gene: Blatthüpfer sprinter+jumper+winged, Schildkäfer carapace+hardshell+taunt)
    // statt eines Einzelgens — sonst blieb `carapaceForm` bei allen auf `flat` und `dress` auf
    // `scaled`. Die IDs (Seed-abhängig) sind unverändert; die Genome dieser Brut ändern sich
    // EINMALIG. Keine Meta-Migration nötig: Specimen sind Daten, kein Nektar/Kontostand berührt.
    // BRUT-VIELFALT (19.09.2026): die Neuheit der Brut prüft zusätzlich das KAMPFPROFIL
    // (`distinct` in genome/beetle.ts) und sucht bei Zwillingen weiter (12 Versuche statt 6).
    // Dieser Pin belegt die GRENZE des Eingriffs: diese Fachkreuzung hatte nie Zwillinge, wird
    // also nicht anders gewürfelt — der Satz ist BITGLEICH zum Stand davor. Bewegt haben sich
    // nur Bruten, die vorher zwei identische Profile trugen (0 von 72 statt 11 von 72;
    // Messmenge: 3 Gründer, alle geordneten Paarungen × 8 Brut-Indizes).
    expect(rollBrood(A, B, 1).map(c => `${c.id}|${broodGenomeHash(c)}`)).toEqual([
      'brood_ez8xcp_0|hyb-8cd10b61',
      'brood_ez8xcp_1|hyb-536bbdff',
      'brood_ez8xcp_2|hyb-9c075925',
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
    // `leafhopper` bringt genau sein SOURCE-Genom mit, Generation 1. Die Erwartung liest die
    // Source selbst (statt ein Literal zu pinnen), damit der Test die ABSICHT prüft und nicht
    // bei jeder Pool-Erweiterung erneut rot wird.
    expect(stored.parentAAncestor!.specimenId).toBe(A);
    expect(stored.parentAAncestor!.genome.map(g => g.id)).toEqual([...BEETLES_SOURCE[A]!.genes]);
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
