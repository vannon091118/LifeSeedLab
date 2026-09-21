// Vertragstest für den Mutations-Drill: das Werkzeug selbst muss beweisbar greifen.
// Der Drill ist Prüf-Werkzeug — ein blindes Prüf-Werkzeug wäre schlimmer als keins.
// Deshalb: Registry-Selbstcheck (find-Muster eindeutig in src), Bilanz-Parser,
// Fail-Collector — alles gegen echte Dateien, keine Mocks.
// (Der schwergewichtige E2E-Drill läuft bewusst NICHT hier, sondern von Hand über die CLI.)
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { registryBefunde, drillKopf, waehleMutationen } from '../drill/registry.ts';
import { bilanz, blockierendeFails, plainAusgabe, baselineBefund } from '../drill/verdict.ts';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

describe('Mutations-Drill — Registry (das Werkzeug darf nicht blind sein)', () => {
  it('jedes find-Muster steht genau einmal in seiner Zieldatei', () => {
    expect(registryBefunde(ROOT)).toEqual([]);
  });

  it('achtzehn Mutationen über acht Klassen (Sim/Ökonomie/Wellen/Persistenz + vier Genom)', () => {
    const kopf = drillKopf();
    expect(kopf.mutationen).toBe(18);
    expect(kopf.klassen.sort()).toEqual(['gacha', 'logik', 'oekonomie', 'persistenz', 'phaenotyp', 'spawn', 'vererbung', 'werte']);
  });

  it('registryBefunde meldet ein Zieldatei-Problem statt still zu laufen (fail-closed)', () => {
    const probleme = registryBefunde(join(ROOT, 'nirgendwo-echt'));
    expect(probleme.length).toBe(18);
    expect(probleme[0]).toContain('Zieldatei fehlt');
  });
});

describe('Mutations-Drill — Auswahl ist fail-closed', () => {
  it('ohne Filter: die ganze Registry', () => {
    expect(waehleMutationen().length).toBe(drillKopf().mutationen);
  });

  it('Klassen-Filter und ID-Filter liefern genau die gewählten Mutationen', () => {
    const nurVererbung = waehleMutationen('vererbung');
    expect(nurVererbung.length).toBeGreaterThan(0);
    expect(new Set(nurVererbung.map(m => m.klasse))).toEqual(new Set(['vererbung']));

    const eine = waehleMutationen(undefined, 'M3-spawn-splice');
    expect(eine.map(m => m.id)).toEqual(['M3-spawn-splice']);

    // Kombination = ODER: Klasse und Einzelmutation nebeneinander.
    const kombi = waehleMutationen('werte', 'M1-bite-reach-x4');
    expect(kombi.map(m => m.id).sort()).toEqual(['M1-bite-reach-x4', 'N4-heil-aura-schwelle-zu', 'N5-wand-reflex-tot']);
  });

  it('ein Tippfehler ist ein Fehler — kein stiller Leerlauf', () => {
    expect(() => waehleMutationen('vererbung,giebt-es-nicht')).toThrow(/Unbekannte Klasse\(n\): giebt-es-nicht/);
    expect(() => waehleMutationen(undefined, 'N1-dominanz-gewicht-im-kraft-indx')).toThrow(/Unbekannte Mutation\(s\)/);
  });

  it('ein leerer oder Whitespace-Filter zählt nicht als Auswahl', () => {
    // Sonst wäre jeder Aufruf mit leerer Variable fatal statt „keine Einschränkung“.
    expect(waehleMutationen('   ', '').length).toBe(drillKopf().mutationen);
  });

  it('jede Klasse der Registry hat Mutationen — sonst gäbe es einen Filter ohne Wirkung', () => {
    for (const klasse of drillKopf().klassen) {
      expect(waehleMutationen(klasse).length, `Klasse ohne Mutation: ${klasse}`).toBeGreaterThan(0);
    }
  });
});

describe('Mutations-Drill — Ausgangsstand ist Pflicht (rote Baseline = nicht bewertbar)', () => {
  it('grüne Baseline ⇒ kein Befund (drillen erlaubt)', () => {
    expect(baselineBefund([])).toBeNull();
  });

  it('rote Baseline ⇒ Abbruchgrund MIT den betroffenen Tests, keiner Bilanz-Zahl', () => {
    const befund = baselineBefund([
      'src/version.test.ts > Produktversion > hat genau eine Nummer: package.json und Anzeige stimmen überein',
    ]);
    expect(befund).not.toBeNull();
    expect(befund).toContain('nicht bewertbar');
    expect(befund).toContain('src/version.test.ts');
    // Die Aussage „kein Test reagiert“ darf hier NICHT auftauchen: eine rote Baseline ist
    // kein blinder Fleck und kein Fang, sondern ein Ausnahmezustand.
    expect(befund).not.toContain('blinder Fleck');
  });

  it('mehrere rote Tests werden alle namentlich genannt', () => {
    const befund = baselineBefund(['a.test.ts > A', 'b.test.ts > B']);
    expect(befund).toContain('2 Test(s)');
    expect(befund).toContain('a.test.ts > A');
    expect(befund).toContain('b.test.ts > B');
  });
});

describe('Mutations-Drill — Bilanz-Parser', () => {
  it('parst die Misch-Bilanz (failed | passed) aus der Vitest-Ausgabe', () => {
    const b = bilanz(' Irgendein Kram\n      Tests  3 failed | 660 passed (663)\n  Duration 8s');
    expect(b).toEqual({ failed: 3, passed: 660, total: 663 });
  });

  it('parst die reine Grün-Bilanz', () => {
    const b = bilanz('      Tests  662 passed (662)\n');
    expect(b).toEqual({ failed: 0, passed: 662, total: 662 });
  });

  it('liefert -1-Bilanz bei unverständlicher Ausgabe (Lauf abgebrochen)', () => {
    expect(bilanz('komplett anderes Format')).toEqual({ failed: -1, passed: -1, total: -1 });
  });

  it('stript ANSI-Farbcodes, bevor Zahlenmuster gesucht werden (FORCE_COLOR-Erbe)', () => {
    const farbig = '      Tests  \u001b[32m662 passed\u001b[39m \u001b[90m(662)\u001b[39m\n';
    expect(bilanz(farbig)).toEqual({ failed: 0, passed: 662, total: 662 });
    const failFarbig = ' FAIL  \u001b[31msrc/simulation/gateB.test.ts\u001b[39m > \u001b[1mGate B\u001b[22m > zweiter Kontostand\n';
    expect(blockierendeFails(failFarbig)).toEqual(['src/simulation/gateB.test.ts > Gate B > zweiter Kontostand']);
    expect(plainAusgabe(farbig)).not.toContain('\u001b');
  });
});

describe('Mutations-Drill — Fail-Collector', () => {
  it('extrahiert Datei + Testname aus FAIL-Zeilen', () => {
    const fails = blockierendeFails([
      'irrelevant',
      ' FAIL  src/simulation/plant_defense.test.ts > P-26 Verhalten > Biss-Kadenz: genau 10 je 30 Ticks',
      'AssertionError: expected 20 to be less than or equal to 10',
    ].join('\n'));
    expect(fails).toEqual(['src/simulation/plant_defense.test.ts > P-26 Verhalten > Biss-Kadenz: genau 10 je 30 Ticks']);
  });

  it('ignoriert Ausgaben ohne FAIL-Zeilen', () => {
    expect(blockierendeFails('alles grün\nTests  1 passed (1)')).toEqual([]);
  });
});
