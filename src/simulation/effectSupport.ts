// Owner: SimulationSystem (Effekt-Unterstützung). LOC ≤ 300.
// WELCHER EFFEKT WIRD GERECHNET — und welcher ist bewusst nur Optik?
//
// Vorher gab es auf diese Frage keine Antwort: `effects.source.ts` listet den Wortschatz, aber
// niemand sagte, ob die Simulation ihn benutzt. Drei Effekte wurden in `enemySystem` als
// hartcodierte `if`-Kette behandelt (`SLOW`, `BURN`, `POISON`), zwei in `root.ts` (`PIERCE`,
// `CRIT`), einer in `root.ts` (`CHAIN`) — der Rest fiel still durch. Ein Gen mit einem nicht
// gerechneten Effekt sah aus wie ein Gen ohne Wirkung.
//
// Diese Datei ist die EINE Wahrheit dafür: `EFFECT_SIM_SUPPORT` deklariert je Effekt, ob die
// Simulation ihn trägt oder ob er (noch) Präsentation ist. Der Test `effect_support.test.ts`
// erzwingt Vollständigkeit: ein neuer Effekt in der Source ohne Eintrag hier ist ein Fehler,
// kein Schweigen. Kommt ein Effekt zur Rechnung, wechselt hier EIN Wort.
//
// Trennung der Zuständigkeiten: der WORTschatz liegt in `config/effects.source.ts` (Content),
// die RECHNUNG hier (Simulation). Beide sind Source of Truth für ihre Frage — keine Kopie.

import type { EffectId } from '../config/effects.source';
import { EFFECTS_SOURCE } from '../config/effects.source';

/** `sim` = die Simulation rechnet den Effekt · `visual-only` = bewusst noch Optik (P3/P4/P5). */
export type EffectSupport = 'sim' | 'visual-only';

/**
 * Status-Wirkung eines Effekts auf einen Gegner. `null` = kein Status.
 * `enemySystem` liest NUR diese Ableitung — es gibt keine zweite `if`-Kette mehr, die
 * festlegt, welcher Effekt welchen Status setzt.
 */
export type StatusKind = 'slow' | 'burn' | 'poison';

export interface EffectEntry {
  support: EffectSupport;
  /** Status, den ein Treffer setzt (nur relevant, wenn `support === 'sim'`). */
  status?: StatusKind;
}

/**
 * Vertrag je Effekt. Die acht Wirkungen der zweiten Gen-Gruppe sind hier bewusst GEMISCHT:
 * vier laufen sofort auf dem vorhandenen Statussystem (Säure/Sporen ⇒ Gift, Blüte/Wirbel ⇒
 * Verlangsamung), vier warten auf ihren eigenen Slice (Gravitation ⇒ Pfad-Pull in P4,
 * Echo/Prisma/Titan ⇒ Ballistik in P3). „visual-only" ist damit eine Zusage, kein Versehen.
 */
export const EFFECT_SIM_SUPPORT: Record<EffectId, EffectEntry> = {
  EFFECT_PIERCE:    { support: 'sim' },
  EFFECT_CRIT:      { support: 'sim' },
  EFFECT_CHAIN:     { support: 'sim' },
  EFFECT_SLOW:      { support: 'sim', status: 'slow' },
  EFFECT_BURN:      { support: 'sim', status: 'burn' },
  EFFECT_POISON:    { support: 'sim', status: 'poison' },
  // Grundstock-Effekte ohne eigene Sim-Rechnung: sie tragen Farb-/Klangebene und Stat-Wirkung
  // (Heilung/Schild/Hast/Reflex stecken in den Pflanzen-Stats, nicht im Treffer).
  EFFECT_HEAL:      { support: 'visual-only' },
  EFFECT_SHIELD:    { support: 'visual-only' },
  EFFECT_REFLECT:   { support: 'visual-only' },
  EFFECT_HASTE:     { support: 'visual-only' },
  // Zweite Gen-Gruppe (v9): die vier mit vorhandenem Status laufen mit, die vier anderen sind
  // deklariert und terminierbar (P3 Ballistik / P4 Gefahren).
  EFFECT_ACID:      { support: 'sim', status: 'poison' },
  EFFECT_SPORE:     { support: 'sim', status: 'poison' },
  EFFECT_BLOOM:     { support: 'sim', status: 'slow' },
  EFFECT_VORTEX:    { support: 'sim', status: 'slow' },
  EFFECT_GRAVITY:   { support: 'visual-only' },
  EFFECT_ECHO:      { support: 'visual-only' },
  EFFECT_PRISMATIC: { support: 'visual-only' },
  EFFECT_TITAN:     { support: 'visual-only' },
};

/** Der Status eines Treffers — die einzige Ableitung, die `enemySystem` befragt. */
export function statusForEffect(effectId: string | null): StatusKind | null {
  if (!effectId) return null;
  const entry = EFFECT_SIM_SUPPORT[effectId as EffectId];
  return entry?.support === 'sim' ? entry.status ?? null : null;
}

/**
 * Wirkdauer in Ticks — gelesen aus der Content-Wahrheit (`effects.source`), nicht hier gepflegt
 * (Regel 6: die Literale 90/3/5 standen vorher mitten in `enemySystem.applyDamage`).
 */
export function statusTicksOf(effectId: string | null): number {
  if (!effectId) return 0;
  return EFFECTS_SOURCE[effectId as EffectId]?.statusTicks ?? 0;
}
