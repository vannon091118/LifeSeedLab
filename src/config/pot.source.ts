// Owner: Source (content truth). LOC ≤ 200.
// BLUMENTOPF (Entscheidung 19.09.2026, „Farbe ⇒ Effekt, Zelle bestimmt Farbe"):
// Der Topf war ein reiner Weg-Blocker (`walkable:false`), während die Source ihn „Platzierfläche
// für Pflanzen" nannte — zwei Lesarten desselben Objekts. Jetzt hat er EINE Wirkung, die man ihm
// ansieht: die Pflanze auf dem Topf wird verstärkt, und die FARBE sagt, wie.
//
// Die Farbe hängt an der ZELLE, nicht am Kauf: jede Topf-Zelle trägt deterministisch eine der
// vier Farben (Ableitung in `simulation/potBoost.ts` aus dem Welt-Seed). Damit gibt es keinen
// zweiten Zustand (kein Farbfeld im Save, kein Schema-Bump), keine Zufallsquelle und keinen
// Vorteil durch Neubauen: dieselbe Zelle hat für immer dieselbe Farbe — auf jedem Rechner.
//
// Die Wirkung greift auf BESTEHENDE Achsen (Schaden, Reichweite, Nachladezeit, Leben). Kein
// neuer Kampfwert, keine Sonderregel: der Topf verschiebt nur, was eine Pflanze ohnehin hat.

/** Wirk-Achsen eines Topfes — exakt die Achsen, die `PlantStats` schon trägt. */
export type PotAxis = 'damage' | 'range' | 'cooldown' | 'hp';

export interface PotBoost {
  axis: PotAxis;
  /** Faktor auf die Achse. `< 1` bei `cooldown` = schneller feuern. */
  factor: number;
  /** i18n-Key der Farbe („Bernstein: +20 % Schaden"). */
  labelKey: string;
}

/**
 * Die vier Topffarben. Reihenfolge = Ableitungs-Reihenfolge (Index = Seed % Länge) — wer sie
 * umsortiert, ändert die Farbe jeder Zelle. Bewusst als Liste, nicht als Objekt: die Reihenfolge
 * ist Teil des Vertrags, nicht Zierde.
 */
export const POT_COLORS = ['amber', 'violet', 'moss', 'rust'] as const;
export type PotColor = (typeof POT_COLORS)[number];

/**
 * Farbe ⇒ Wirkung. Die Faktoren sind der Balance-Anker dieses Bausteins: ein Topf kostet
 * Material und verstärkt GENAU EINE Pflanze um ~20 % auf EINER Achse. `hp` liegt höher, weil
 * Standfestigkeit nicht auf den Ausstoß wirkt, sondern nur darauf, ob die Pflanze den nächsten
 * Biss überlebt (und Gegenstände greifen Pflanzen an).
 */
export const POT_BOOSTS: Record<PotColor, PotBoost> = {
  amber:  { axis: 'damage',   factor: 1.2, labelKey: 'pot.amber' },
  violet: { axis: 'range',    factor: 1.2, labelKey: 'pot.violet' },
  moss:   { axis: 'cooldown', factor: 0.8, labelKey: 'pot.moss' },
  rust:   { axis: 'hp',       factor: 1.3, labelKey: 'pot.rust' },
};

/**
 * Kein Zufall, keine Uhr: die Zell-Ableitung nutzt dieselbe Seed-Maschine wie die Welt
 * (`deriveSeed` im Gameplay-Namespace `world`) und ist damit replay-sicher. Der Wert ist eine
 * Version, kein Streufeld — wird er geändert, ändert sich die Farbe JEDER Zelle einmalig.
 */
export const POT_SEED_VERSION = 1;
