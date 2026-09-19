// Owner: Genome (Gen → Schuss). LOC ≤ 200.
// Die einzige Ableitung Genom → Ballistik. Rein: kein RNG, kein Zustand, keine Achsen.
//
// D5 (Eigentümer-Entscheid): Der Adapter liest GENE, nicht den Phänotyp. `PlantPhenotype`
// trägt Jitter aus `generation`, `role` und `drift` — Gameplay daran zu hängen hieße: zwei
// Spieler mit demselben `genome_hash`, aber verschiedener Anzeige-Streuung, rechnen anders.
// Die Gene sind die Wahrheit, das Bild ist die Darstellung.
//
// Alle Zahlen kommen aus `config/ballistics.source.ts` (Content-Wahrheit), alle Rechnungen
// laufen in ganzen Basispunkten (bp) — siehe Begründung in der Source. Kein Gleitkomma-Vergleich.
//
// Legacy-Profil: Altsaves kennen kein `ballistics`-Feld. Statt sie auf „schussneutral" zu
// setzen (das würde ihnen Durchschlag und Krit still wegnehmen), rekonstruiert
// `legacyProfileFromEffects` genau das Verhalten, das die bisherigen Konstanten erzeugt haben —
// aus den Effekt-Tags, die seit jeher im Speicher liegen.

import type { BallisticProfile, Genome, PlantType } from '../types';
import { genomeEffectIds } from './effects';
import {
  SPEED_BASE_BP,
  SPEED_GAIN_BP,
  SPEED_MAX_BP,
  PIERCE_BASE,
  PIERCE_MIN_BP,
  PIERCE_STEP_BP,
  PIERCE_MAX,
  CRIT_CHANCE_BASE_BP,
  CRIT_MIN_BP,
  CRIT_GAIN_BP,
  CRIT_CHANCE_MAX_BP,
  CRIT_MULT,
} from '../config/ballistics.source';

/** Basispunkte: dieselbe Quantisierung wie `canonicalGenome` (genome_hash). */
export function bp(power: number): number {
  return Math.round(Math.max(0, Math.min(1, power)) * 10000);
}

/** Genstärke in bp — fehlendes Gen zählt als 0. */
function geneBp(genome: Genome, geneId: string): number {
  const g = genome.find(x => x.id === geneId);
  return g ? bp(g.power) : 0;
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

/**
 * Ballistik einer Pflanze. Rolle-gesteuert nach D5: nur `shooter` schießt — Wand und
 * Unterstützung erhalten das neutrale Profil, damit ein „Durchschlag" nie über einen Effekt-
 * Tag an eine Mauer gerät.
 */
export function ballisticsOf(genome: Genome, role: PlantType): BallisticProfile {
  if (role !== 'shooter') {
    return { speed: SPEED_BASE_BP / 10000, pierce: 0, critChance: 0, critMult: CRIT_MULT };
  }

  const tags = genomeEffectIds(genome);
  const hasPierce = tags.includes('EFFECT_PIERCE');
  const hasCrit = tags.includes('EFFECT_CRIT');

  const speedBp = clamp(
    SPEED_BASE_BP + Math.round((geneBp(genome, 'swift') * SPEED_GAIN_BP) / 10000),
    SPEED_BASE_BP,
    SPEED_MAX_BP,
  );

  const pierceBp = geneBp(genome, 'pierce');
  const pierce = hasPierce && pierceBp >= PIERCE_MIN_BP
    ? Math.min(PIERCE_MAX, PIERCE_BASE + Math.floor((pierceBp - PIERCE_MIN_BP) / PIERCE_STEP_BP))
    : 0;

  const critBp = geneBp(genome, 'crit');
  const critChanceBp = hasCrit && critBp >= CRIT_MIN_BP
    ? Math.min(
        CRIT_CHANCE_MAX_BP,
        CRIT_CHANCE_BASE_BP + Math.round(((critBp - CRIT_MIN_BP) * CRIT_GAIN_BP) / 10000),
      )
    : 0;

  return { speed: speedBp / 10000, pierce, critChance: critChanceBp / 10000, critMult: CRIT_MULT };
}

/**
 * Verhalten eines Speichers ohne Profil-Feld: exakt die alten Konstanten — Durchschlag 2 nur
 * mit Durchschlags-Effekt, Krit-Chance 0.2 nur mit Krit-Effekt, feste Geschwindigkeit.
 */
export function legacyProfileFromEffects(effects: readonly string[]): BallisticProfile {
  return {
    speed: SPEED_BASE_BP / 10000,
    pierce: effects.includes('EFFECT_PIERCE') ? PIERCE_BASE : 0,
    critChance: effects.includes('EFFECT_CRIT') ? CRIT_CHANCE_BASE_BP / 10000 : 0,
    critMult: CRIT_MULT,
  };
}
