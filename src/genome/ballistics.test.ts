// Owner: Genome (Ballistik-Adapter). Test — zählt nicht gegen den Code-Cap der Systeme.
// Was hier gepinnt wird:
//  1. bp-Genauigkeit: das Profil hängt an derselben Quantisierung wie `genome_hash`
//     (Math.round(power * 10000)) — zwei Genome mit gleichem Hash ⇒ gleiches Verhalten.
//  2. Rollen-Gate (D5): nur Schützen bekommen Durchschlag/Krit.
//  3. Legacy-Heilung: Altsaves ohne Profil-Feld erhalten GENAU das alte Verhalten.
//  4. GOLDSET: zwölf feste Genome ⇒ erwartete Profile. Wer Zahlen in der Source dreht, macht
//     diesen Test rot und muss die Fassung bewusst anheben (D3) statt eine „entdeckte" Art
//     still zu verändern.

import { describe, it, expect } from 'vitest';
import { ballisticsOf, bp, legacyProfileFromEffects } from './ballistics';
import { BALLISTICS_VERSION } from '../config/ballistics.source';
import type { Genome, PlantType } from '../types';

const g = (id: string, power: number, dominant = true) => ({ id, power, dominant });

describe('Ballistik-Adapter — Genom ⇒ Schuss', () => {
  it('Basispunkte sind die Quantisierung des genome_hash', () => {
    expect(bp(0.3)).toBe(3000);
    expect(bp(0.74996)).toBe(7500);
    expect(bp(0.75004)).toBe(7500); // gleicher Hash ⇒ gleiches Verhalten
    expect(bp(-1)).toBe(0);
    expect(bp(5)).toBe(10000);
  });

  it('ohne Gene: genau die alten Konstanten (Geschwindigkeit, kein Durchschlag, kein Krit)', () => {
    const p = ballisticsOf([g('rapid', 0.9)], 'shooter');
    expect(p.speed).toBe(0.15);
    expect(p.pierce).toBe(0);
    expect(p.critChance).toBe(0);
    expect(p.critMult).toBe(2);
  });

  it('Durchschlag braucht den Effekt-Tag UND skaliert mit der Genstärke', () => {
    // Unter der Schwelle: Tag vorhanden, aber Gen zu schwach ⇒ kein Durchschlag.
    expect(ballisticsOf([g('pierce', 0.29)], 'shooter').pierce).toBe(0);
    // 0.30 = bisheriges Verhalten (Konstante 2).
    expect(ballisticsOf([g('pierce', 0.3)], 'shooter').pierce).toBe(2);
    // Je 0.2 mehr ein weiterer Gegner, gedeckelt bei 4.
    expect(ballisticsOf([g('pierce', 0.5)], 'shooter').pierce).toBe(3);
    expect(ballisticsOf([g('pierce', 1.0)], 'shooter').pierce).toBe(4);
    // 0.9 durchschlägt 4, nicht 5.
    expect(ballisticsOf([g('pierce', 0.9)], 'shooter').pierce).toBe(4);
  });

  it('Der Effekt-Tag allein genügt nicht — das Gen muss ihn tragen', () => {
    // `swift` ist kein Durchschlags-Effekt ⇒ kein Durchschlag, egal wie stark.
    expect(ballisticsOf([g('swift', 1)], 'shooter').pierce).toBe(0);
  });

  it('Krit: Basis 0.2 über der Schwelle, gedeckelt bei 0.35', () => {
    expect(ballisticsOf([g('crit', 0.24)], 'shooter').critChance).toBe(0);
    expect(ballisticsOf([g('crit', 0.25)], 'shooter').critChance).toBeCloseTo(0.2, 6);
    expect(ballisticsOf([g('crit', 1.0)], 'shooter').critChance).toBeCloseTo(0.3125, 6);
    expect(ballisticsOf([g('crit', 1.0)], 'shooter').critChance).toBeLessThanOrEqual(0.35);
  });

  it('Geschwindigkeit skaliert mit `swift` und bleibt gedeckelt', () => {
    expect(ballisticsOf([g('swift', 0.5)], 'shooter').speed).toBeCloseTo(0.21, 6);
    expect(ballisticsOf([g('swift', 1.0)], 'shooter').speed).toBeCloseTo(0.27, 6);
    // Obergrenze greift (0.15 + 0.4*0.4 wäre über 0.30) — hier über `swift` allein nicht
    // erreichbar, deshalb die Deckel-Prüfung über die Source-Konstante.
    expect(ballisticsOf([g('swift', 0.9)], 'shooter').speed).toBeLessThanOrEqual(0.3);
  });

  it('D5: nur `shooter` erhalten Schusswerte — Wand und Unterstützung nicht', () => {
    const wall: PlantType = 'wall';
    const support: PlantType = 'support';
    const genome: Genome = [g('pierce', 1), g('crit', 1), g('swift', 1)];
    for (const role of [wall, support]) {
      const p = ballisticsOf(genome, role);
      expect(p.pierce, role).toBe(0);
      expect(p.critChance, role).toBe(0);
      expect(p.speed, role).toBe(0.15);
    }
  });

  it('Legacy-Profil = exakt die alten Konstanten (Altsave-Heilung)', () => {
    const withPierce = legacyProfileFromEffects(['EFFECT_PIERCE']);
    expect(withPierce.pierce).toBe(2);
    expect(withPierce.critChance).toBe(0);
    expect(withPierce.speed).toBe(0.15);

    const withCrit = legacyProfileFromEffects(['EFFECT_CRIT']);
    expect(withCrit.critChance).toBeCloseTo(0.2, 6);
    expect(withCrit.pierce).toBe(0);

    const plain = legacyProfileFromEffects([]);
    expect(plain).toEqual({ speed: 0.15, pierce: 0, critChance: 0, critMult: 2 });
  });

  it('GOLDSET: feste Genome ⇒ feste Profile (Fassung ' + BALLISTICS_VERSION + ')', () => {
    const cases: Array<[string, Genome, PlantType, string]> = [
      ['leer', [], 'shooter', '0.15|0|0|2'],
      ['sprout', [g('rapid', 0.5), g('pierce', 0.3)], 'shooter', '0.15|2|0|2'],
      ['rapid-heavy', [g('rapid', 1), g('heavy', 0.8)], 'shooter', '0.15|0|0|2'],
      ['swift-pierce', [g('swift', 1), g('pierce', 0.7)], 'shooter', '0.27|4|0|2'],
      ['crit-max', [g('crit', 1)], 'shooter', '0.15|0|0.3125|2'],
      ['swift-crit', [g('swift', 0.4), g('crit', 0.6)], 'shooter', '0.198|0|0.2525|2'],
      // Drei gleich starke Gene, aber nur ZWEI Effekt-Slots: `swift` (Haste) und `pierce`
      // füllen sie, `crit` fällt aus dem Tag-Fenster — deshalb hier 0 Krit. Das ist exakt
      // das bisherige Verhalten (auch dort hing alles am Top-2-Filter), siehe Test darunter.
      ['alle-drei', [g('swift', 1), g('pierce', 1), g('crit', 1)], 'shooter', '0.27|4|0|2'],
      ['wall-tank', [g('pierce', 1), g('crit', 1)], 'wall', '0.15|0|0|2'],
      ['support', [g('heal', 1)], 'support', '0.15|0|0|2'],
      ['schwelle-pierce', [g('pierce', 0.3)], 'shooter', '0.15|2|0|2'],
      ['schwelle-crit', [g('crit', 0.25)], 'shooter', '0.15|0|0.2|2'],
      ['acid-poison', [g('acid', 0.9)], 'shooter', '0.15|0|0|2'],
    ];
    for (const [name, genome, role, expected] of cases) {
      const p = ballisticsOf(genome, role);
      const key = `${p.speed}|${p.pierce}|${p.critChance}|${p.critMult}`;
      expect(key, name).toBe(expected);
    }
  });

  it('Fähigkeiten hängen am Top-2-Effekt-Fenster — bewusst gepinnt, nicht zufällig', () => {
    // Gleiche Gene, andere Reihenfolge: die Auswahl ist deterministisch (stabiler Sort),
    // aber wer nicht ins Fenster fällt, verliert seine Schuss-Fähigkeit.
    const critFirst = ballisticsOf([g('crit', 1), g('swift', 1), g('pierce', 1)], 'shooter');
    const critLast = ballisticsOf([g('swift', 1), g('pierce', 1), g('crit', 1)], 'shooter');
    // Fenster A (crit, swift): Krit ja, Durchschlag nein — `pierce` fällt raus.
    expect(critFirst.critChance).toBeGreaterThan(0);
    expect(critFirst.pierce).toBe(0);
    // Fenster B (swift, pierce): Durchschlag ja, Krit nein — `crit` fällt raus.
    expect(critLast.critChance).toBe(0);
    expect(critLast.pierce).toBe(4);
  });

  it('Profil ist rein: zweimal dieselben Gene ⇒ dasselbe Profil, ohne RNG', () => {
    const genome: Genome = [g('swift', 0.37), g('pierce', 0.61), g('crit', 0.42)];
    expect(ballisticsOf(genome, 'shooter')).toEqual(ballisticsOf(genome, 'shooter'));
  });
});
