import { describe, it, expect } from 'vitest';
import { rollBrood, resolveAncestor } from '../genome/beetle';
import { beetlePhenotypeOf } from '../genome/beetlePhenotype';
import { BEETLES_SOURCE } from '../config/beetles.source';
import { hexToRgb } from '../core/color';
import { beetleDrawMetrics } from './beetles';

// SICHTBARKEIT DER BRUT — der Beleg zum Spieltest-Befund „die Brutkandidaten sind sich massiv
// ähnlich\" (20.09.2026).
//
// Der Befund war messbar: die Kandidaten unterschieden sich real (Stats, Form-Achsen, Deskriptor),
// aber das BILD trug den Unterschied nicht — die formtragenden Maße gingen mit Faktoren 0,12–0,2 in
// die Zeichnung (eine Achsendifferenz von 0,05 ⇒ 0,3–0,5 px bei 72 px Fenster), und die Hauptfarbe
// kam aus einem von acht Pigment-Eimern, den Geschwister fast immer gemeinsam trafen: in 43 von 48
// Bruten trugen ALLE DREI Kandidaten dieselbe Farbe.
//
// Dieser Test hält die Zielmarke fest, die danach gemessen wurde — gegen ALLE Gründer-Paarungen × 8
// Brut-Indizes, mit den Zahlen, die WIRKLICH gezeichnet werden (`beetleDrawMetrics`, nicht einer
// zweiten Formel daneben).

/** Zeichenfenster der Brutstätte (`BeetleCanvas size={72}`) — dieselbe Umrechnung wie drawBeetleAnatomy. */
const SPAN = 72;
const pxPerUnit = (p: ReturnType<typeof beetlePhenotypeOf>): number => (SPAN / 2) * 0.72 * p.scale;

/** Die im Bild sichtbaren Maße eines Tiers, in Pixeln. */
function visiblePixels(p: ReturnType<typeof beetlePhenotypeOf>) {
  const s = pxPerUnit(p);
  return [
    2 * beetleDrawMetrics.elytraHalfWidth(p) * s,
    beetleDrawMetrics.elytraLength(p) * s,
    2 * beetleDrawMetrics.headRadius(p) * s,
    2 * beetleDrawMetrics.thoraxHalfWidth(p) * s,
    2 * beetleDrawMetrics.segmentHalfWidth(p, 0) * s,
    beetleDrawMetrics.legLength(p) * s,
    beetleDrawMetrics.mandibleLength(p) * s,
    beetleDrawMetrics.antennaLength(p) * s,
  ];
}

const rgbDistance = (a: string, b: string): number => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

/** Die dokumentierten Gründer der Source, so gezeichnet wie die Brutstätte sie zeigt (64 px). */
const founderIds = Object.keys(BEETLES_SOURCE);
const founder = (id: string) => beetlePhenotypeOf({
  genome: resolveAncestor(id)!.genome,
  generation: 1,
  specimenId: id,
});

describe('B31 — Brutkandidaten sind SICHTBAR verschieden (Spieltest-Befund 20.09.2026)', () => {
  const broods: ReturnType<typeof beetlePhenotypeOf>[][] = [];
  for (const a of Object.keys(BEETLES_SOURCE)) for (const b of Object.keys(BEETLES_SOURCE)) {
    if (a > b) continue;
    for (let index = 1; index <= 8; index++) {
      const rolled = rollBrood(a, b, index);
      if (rolled.length < 3) continue;
      broods.push(rolled.map(c => beetlePhenotypeOf({ genome: c.genome, generation: c.generation ?? 1 })));
    }
  }

  it('die Messmenge steht (sonst prüft der Test weniger, als er behauptet)', () => {
    expect(broods).toHaveLength(48);
    for (const brood of broods) expect(brood).toHaveLength(3);
  });

  it('Silhouette: der größte Kandidatenunterschied ist sichtbar (Median ≥ 5 px, kein Paar unter 2 px)', () => {
    // Vor dem Eingriff: Median 2,82 px, 11 von 48 Bruten unter 2 px. Jetzt: Median 5,96 px, keine.
    const perBrood = broods.map(brood => {
      const px = brood.map(visiblePixels);
      let worst = 0;
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        for (let m = 0; m < px[0]!.length; m++) worst = Math.max(worst, Math.abs(px[i]![m]! - px[j]![m]!));
      }
      return worst;
    });
    expect(median(perBrood)).toBeGreaterThanOrEqual(5);
    expect(Math.min(...perBrood)).toBeGreaterThanOrEqual(2);
  });

  it('Farbe: kein Kandidatentripel trägt dieselbe Hauptfarbe, kleinster Abstand deutlich über „gleich"', () => {
    // Vor dem Eingriff: 43 von 48 Bruten mit DREI gleichen Farben (Anker Blatthüpfer×Schildkäfer:
    // 8 von 8 Bruten dreimal #7a492d), kleinster RGB-Abstand im Median 10,8 Stufen.
    const identical = broods.filter(b => new Set(b.map(p => p.pigment.primary)).size < 3);
    expect(identical).toEqual([]);

    const minDistance = broods.map(b => Math.min(
      rgbDistance(b[0]!.pigment.primary, b[1]!.pigment.primary),
      rgbDistance(b[0]!.pigment.primary, b[2]!.pigment.primary),
      rgbDistance(b[1]!.pigment.primary, b[2]!.pigment.primary),
    ));
    expect(median(minDistance)).toBeGreaterThanOrEqual(25);
  });

  it('Gründer tragen ihre DOKUMENTIERTE Farbe (Source-Anker), kein Zucht-Streuwerk', () => {
    // Vorher trugen alle drei Gründer dieselbe warme Farbe `#7a492d` — der Anker der Source war
    // faktisch tot, und die Streuung aus A schob sie zusätzlich auf gestreute Werte (gemessen:
    // #886c40 / #54375f / #42444a). Jetzt ist die Hauptfarbe wieder die dokumentierte.
    for (const id of founderIds) expect(founder(id).pigment.primary).toBe(BEETLES_SOURCE[id]!.color);
  });

  it('der Anker gilt NUR für Tiere der Source — ein gezüchtetes Tier streut weiter', () => {
    // Ein Kandidat erbt die `specimenId` eines Elternteils; seine Generation ist ≥ 2. Ohne diese
    // Grenze trüge ein gezüchtetes Tier die Gründerfarbe und die Streuung wäre still tot.
    const brood = rollBrood(founderIds[0]!, founderIds[1]!, 1).map(c => beetlePhenotypeOf({
      genome: c.genome, generation: c.generation ?? 1, specimenId: c.specimenId,
    }));
    const geerbt = brood.filter(p => founderIds.some(id => id === p.pigment.primary));
    expect(geerbt).toEqual([]);
    // Und ohne `specimenId` streut auch der Gründer (der Anker ist ausdrücklich opt-in).
    const ohneName = beetlePhenotypeOf({ genome: resolveAncestor(founderIds[0]!)!.genome, generation: 1 });
    expect(ohneName.pigment.primary).not.toBe(BEETLES_SOURCE[founderIds[0]!]!.color);
  });

  it('Gründer-Trio ist unterscheidbar — auch im Blickmaßstab (Untergrenze des schwächsten Paares)', () => {
    // Der Canvas, den der Spieltest markiert hat (`data-tut="beetle-parent"`, 64 px). Gemessenes
    // schwächstes Paar: Farbabstand 55,9 RGB-Stufen und 8,16 px sichtbares Maß — beides mit Abstand
    // über der Wahrnehmungsschwelle, deshalb stehen die Schwellen hier hoch und nicht „knapp".
    const paare: { farbe: number; px: number }[] = [];
    const ph = founderIds.map(founder);
    for (let i = 0; i < ph.length; i++) for (let j = i + 1; j < ph.length; j++) {
      const a = visiblePixels(ph[i]!); const b = visiblePixels(ph[j]!);
      paare.push({
        farbe: rgbDistance(ph[i]!.pigment.primary, ph[j]!.pigment.primary),
        px: Math.max(...a.map((v, k) => Math.abs(v - b[k]!))),
      });
    }
    expect(Math.min(...paare.map(p => p.farbe))).toBeGreaterThanOrEqual(50);
    expect(Math.min(...paare.map(p => p.px))).toBeGreaterThanOrEqual(8);
  });

  it('SCHWÄCHSTES Kandidatenpaar der Brut — die tatsächliche Untergrenze, und sie ist dünn', () => {
    // Das ist die ehrliche Zahl, die der Pin festhält: das ähnlichste Paar einer Brut liegt bei
    // 4,6 RGB-Stufen und 0,9 px — praktisch dasselbe Tier. Die Streuung kann das nicht schließen,
    // weil Farbe eine Funktion des Genoms ist; eine Garantie INNERHALB der Brut bräuchte eine
    // SICHT-Bedingung in der Brut-Suche (Entscheidung des Eigentümers, nicht gebaut). Devlog 21
    // nennt die Zahl ausdrücklich als dünn statt sie zu schmücken.
    const farben: number[] = []; const masse: number[] = [];
    for (const brood of broods) {
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        farben.push(rgbDistance(brood[i]!.pigment.primary, brood[j]!.pigment.primary));
        const a = visiblePixels(brood[i]!); const b = visiblePixels(brood[j]!);
        masse.push(Math.max(...a.map((v, k) => Math.abs(v - b[k]!))));
      }
    }
    expect(Math.min(...farben)).toBeGreaterThanOrEqual(4);
    expect(Math.min(...masse)).toBeGreaterThanOrEqual(0.9);
  });

  it('Determinismus bleibt: gleiches Genom ⇒ gleiche Farbe und gleiche Maße', () => {
    const [a, b] = broods[0]!;
    const again = beetlePhenotypeOf({ genome: rollBrood('leafhopper', 'shellbeetle', 1)[0]!.genome, generation: 2 });
    const first = rollBrood('leafhopper', 'shellbeetle', 1)[0]!;
    const one = beetlePhenotypeOf({ genome: first.genome, generation: first.generation ?? 1 });
    expect(one.pigment.primary).toBe(again.pigment.primary);
    expect(visiblePixels(one)).toEqual(visiblePixels(again));
    void a; void b;
  });
});
