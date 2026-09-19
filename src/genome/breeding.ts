// Owner: Source (breeding engine — EIN Kern für Pflanzen UND Käfer). LOC ≤ 300.
// Die gemeinsame Zuchtphilosophie, domänen-unabhängig:
//   Vererbung · Dominanz · Rekombination · Mutation · rezessive Trägerschaft ·
//   stetige Generations-Drift · deterministische Kandidaten · echte Neuheitsprüfung.
//
// Was hier NICHT lebt: die biologische Sprache. Wie ein Genom zu einer Pflanze oder zu einem
// Käfer wird, entscheiden die Adapter (genome/plantPhenotype.ts, genome/beetlePhenotype.ts) —
// „eine Zuchtmaschine, zwei biologische Phänotyp-Sprachen".
//
// Determinismus: ausschließlich core/rng (Namespace kommt vom Aufrufer), keine Uhr, keine
// Math.random-Ersatzquelle. Gleiche Eingaben ⇒ gleiche Kandidaten (descriptor- und byte-gleich).

import type { Gene, Genome } from '../types';
import { deriveSeed, makeRng, type Rng, type RngNamespace } from '../core/rng';
import { BREEDING, driftFor } from '../config/phenotype.source';

export { driftFor };

/** Gen-Pool-Eintrag: Dominanz + Gacha-Gewicht (Pflanzen: GENE_POOL, Käfer: BEETLE_GENE_POOL). */
export interface PoolEntry {
  dominant: boolean;
  weight: number;
}
export type GenePool = Record<string, PoolEntry>;

/** Vergleichsvektor eines Phänotyps (0..1 je Achse) — Grundlage der Neuheitsprüfung. */
export type Descriptor = readonly number[];
/** Distanzmaß zweier Deskriptoren (Domänen liefern ihre Gewichtung, Kern bleibt neutral). */
export type Measure = (a: Descriptor, b: Descriptor) => number;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Rekombination EINES Kandidaten. Kanonische Gen-Reihenfolge (nach id) ⇒ das Ergebnis hängt
 * nicht von der Reihenfolge der Eltern-Genome ab, nur von Seed, Generation und Neuheitsdruck.
 *
 * `pressure` (≥ 0) ist der Neuheitsdruck: er wirkt als ZUSÄTZLICHE Drift für diesen einen
 * Entwurf, damit ein zu ähnlicher Kandidat beim nächsten Versuch messbar anders wird. Er ist
 * seed-gebunden, also reproduzierbar — nie Zufall aus der Wanduhr.
 */
export function breedGenome(
  a: Genome,
  b: Genome,
  rng: Rng,
  generation: number,
  pool: GenePool,
  pressure = 0,
): Genome {
  const drift = Math.min(1, driftFor(generation) + pressure * BREEDING.noveltyPressure);
  const ids = Array.from(new Set([...a.map(g => g.id), ...b.map(g => g.id)])).sort();
  const out: Genome = [];

  for (const id of ids) {
    const ga = a.find(g => g.id === id);
    const gb = b.find(g => g.id === id);
    const poolDominant = pool[id]?.dominant ?? false;

    if (!ga || !gb) {
      // Trägerschaft: ein Gen von nur EINEM Elternteil wandert als Allel mit. Ein rezessives
      // Allel startet GEDÄMPFT (unter der Sichtschwelle = Träger) und erwacht mit der Drift —
      // das ist die „rezessive Wiederkehr": die Anlage geht nie verloren, sie ist nur verborgen.
      const src = (ga ?? gb)!;
      if (rng.next() < BREEDING.carryLoss) continue;
      const recessive = !(src.dominant || poolDominant);
      const { recessive: dampRec, dominant: dampDom, wakeGain, blurb } = BREEDING.carryDamping;
      const damping = recessive ? dampRec + drift * wakeGain : dampDom;
      out.push({
        id,
        power: clamp01(src.power * (1 - blurb + rng.next() * blurb) * damping),
        dominant: src.dominant,
      });
      continue;
    }

    const domA = ga.dominant || poolDominant;
    const domB = gb.dominant || poolDominant;
    // Dominanz entscheidet, WESSEN Anlage die Form gibt; Gleichstand ⇒ Münzwurf.
    const winner = domA !== domB ? (domA ? ga : gb) : (rng.next() < 0.5 ? ga : gb);
    // Kraft mischt beide Allele, gewichtet nach Dominanz; die Drift weitet die Streuung.
    // KANONISCHE Reihenfolge: das dominante Allel (bei Gleichstand das stärkere) steht vorne.
    // Ohne diese Ordnung hinge das Ergebnis davon ab, welches Genom der Aufrufer als „A“
    // übergibt — gemessen: gleiche Eltern, vertauscht, ergaben zwei verschiedene Kinder.
    const dominantAllele = domA === domB ? (ga.power >= gb.power ? ga : gb) : (domA ? ga : gb);
    const otherAllele = dominantAllele === ga ? gb : ga;
    const bias = (domA === domB ? 0.5 : 0.68) + (rng.next() - 0.5) * (0.16 + drift * 0.28);
    const power = clamp01(dominantAllele.power * bias + otherAllele.power * (1 - bias));
    // Die Dominanz des Kindes ist eine Eigenschaft der ANLAGE (Pool) und der Eltern-Konstellation
    // — nicht des zufällig gezogenen Elternobjekts. Sonst hinge das Ergebnis davon ab, welches
    // Genom man als „Elternteil A“ übergibt (Reihenfolge-Fehler, gemessen im Test).
    const natural = (ga.dominant && gb.dominant) || poolDominant;
    out.push({
      id: winner.id,
      power,
      // Dominanz selbst kann kippen: früh selten, mit Drift häufiger.
      dominant: rng.next() < 0.12 + drift * 0.18 ? !natural : natural,
    });
  }

  // Mutation: ein NEUES Gen aus dem Pool (Gewichtung = Source) — Häufigkeit und Kraft
  // wachsen mit der Drift, sind aber vollständig seed-bestimmt.
  if (rng.next() < BREEDING.mutationChance * (0.6 + drift)) {
    const candidates = Object.keys(pool).filter(id => !out.some(g => g.id === id));
    if (candidates.length > 0) {
      const picked = rng.pickWeighted(candidates, id => pool[id]!.weight);
      const [lo, hi] = BREEDING.mutationPower;
      out.push({
        id: picked,
        power: clamp01((lo + rng.next() * (hi - lo)) * (0.8 + drift * 0.5)),
        dominant: pool[picked]!.dominant,
      });
    }
  }

  // HERKUNFT IST PFLICHT: Trägerschaft darf nie ALLE Anlagen wegnehmen. Bei Eltern mit
  // disjunkten Gen-Sätzen (jedes Gen von nur einem Elternteil) konnte der Zufall sonst ein
  // Kind ohne jedes Eltern-Erbe liefern — ein Nachkomme, der nicht mehr abstammt. Fällt alles
  // weg, wandert die stärkste Eltern-Anlage als rezessives Allel mit (Familienlinie bleibt).
  const inheritedFromParents = out.some(g => a.some(x => x.id === g.id) || b.some(x => x.id === g.id));
  if (!inheritedFromParents && (a.length > 0 || b.length > 0)) {
    const strongest = [...a, ...b].sort((x, y) => y.power - x.power)[0];
    if (strongest) {
      const { recessive: dampRec, dominant: dampDom, wakeGain } = BREEDING.carryDamping;
      const recessive = !(strongest.dominant || (pool[strongest.id]?.dominant ?? false));
      out.push({
        id: strongest.id,
        power: clamp01(strongest.power * (recessive ? dampRec + drift * wakeGain : dampDom)),
        dominant: strongest.dominant,
      });
    }
  }

  return out.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Sichtbare Gene: über der Wahrnehmungsschwelle (dieselbe Grenze wie die Stat-Ableitung). */
export function expressed(genome: Genome): Genome {
  return genome.filter(g => g.power > BREEDING.visiblePower);
}

/** Kraft eines Genoms (Dominanz gewichtet) — Balance-Anker für Kosten/Stärke. */
export function genomePower(genome: Genome): number {
  return genome.reduce((s, g) => s + g.power * (g.dominant ? 1.3 : 1), 0);
}

/** Nachkommen-Seed EINES Kandidaten: Paar-Seed + Index + Versuch (Neuheitsschleife). */
export function candidateSeed(pairSeed: number, namespace: RngNamespace, index: number, attempt: number): number {
  return deriveSeed(pairSeed, namespace, 'candidate', `${index}:${attempt}`, 1);
}

/** Kandidaten-RNG: eigener Strom je Kandidat/Versuch (kein geteilter Verbrauch). */
export function candidateRng(pairSeed: number, namespace: RngNamespace, index: number, attempt: number): Rng {
  return makeRng(namespace, candidateSeed(pairSeed, namespace, index, attempt));
}

/** Mittlere Achsen-Distanz zweier Deskriptoren (0 = identisch, 1 = maximal verschieden). */
export function descriptorDistance(a: Descriptor, b: Descriptor): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i]! - b[i]!);
  return sum / n;
}

/**
 * GEWICHTETE Distanz: jede Achse zählt so viel, wie sie für den Spieler sichtbar ist.
 * Der Vergleichsvektor einer Domäne bringt seine Gewichte mit (config/*.source.ts); hier steht
 * nur die Arithmetik — keine Domäne kennt die Achsen einer anderen.
 */
export function weightedDistance(a: Descriptor, b: Descriptor, weights: readonly number[]): number {
  const n = Math.min(a.length, b.length, weights.length);
  let sum = 0, total = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i]!;
    total += w;
    sum += w * Math.abs(a[i]! - b[i]!);
  }
  return total === 0 ? 0 : sum / total;
}

/** Nächster Nachbar: kleinste Distanz zu einer Menge bekannter Deskriptoren (∞ wenn leer). */
export function nearestDistance(d: Descriptor, known: readonly Descriptor[], measure: Measure = descriptorDistance): number {
  let best = Infinity;
  for (const k of known) best = Math.min(best, measure(d, k));
  return best;
}

/**
 * Neuheit ist Teil der Zuchtlogik, nicht der Darstellung: ein Kandidat, dessen Phänotyp einem
 * bereits erzeugten (oder bekannten) Individuum zu ähnlich sieht, wird deterministisch neu
 * abgeleitet — und jeder Neuversuch bekommt mehr Neuheitsdruck, damit der nächste Entwurf
 * messbar anders ausfällt statt wieder ein Klon zu werden. Nach `maxAttempts` wird der letzte
 * Entwurf akzeptiert: die Schleife endet IMMER, und derselbe Seed liefert dieselbe Auswahl.
 */
export function rollCandidates<T>(opts: {
  pairSeed: number;
  namespace: RngNamespace;
  count: number;
  known?: readonly Descriptor[];
  measure?: Measure;
  /**
   * Zusatzbedingung der DOMÄNE (optional): `false` ⇒ dieser Entwurf zählt trotz ausreichender
   * Distanz als nicht neu und wird übersprungen. Nötig, wo „anders" mehr heißt als „weit weg":
   * zwei Käferkandidaten mit identischen Kampfwerten sind für den Spieler dieselbe Wahl, selbst
   * wenn der nächste Nachbar ein dritter Kandidat war. Der Kern kennt nur die Bedingung, nie
   * ihre Begründung — die liefert die Domäne.
   */
  distinct?: (candidate: T, accepted: readonly T[]) => boolean;
  /**
   * Suchbudget dieser Domäne (Default `BREEDING.novelty.maxAttempts`). Eine Domäne darf mehr
   * Versuche brauchen, wenn ihr Suchraum enger ist: Greift der Neuheitsdruck nur über Mutation
   * (zwei genetisch gleiche Eltern), braucht „ein anderes Profil" mehr Würfe als „ein anderes
   * Bild". Die Grenze wird nur ausgeschöpft, wenn die Schwelle NICHT erreicht wird — der
   * Normalfall bricht unverändert früh ab.
   */
  maxAttempts?: number;
  /** Erzeugt Kandidat + Deskriptor aus Strom, Index und Versuch (der Versuch = Neuheitsdruck). */
  make: (rng: Rng, index: number, attempt: number) => { candidate: T; descriptor: Descriptor };
}): { candidate: T; descriptor: Descriptor; attempt: number; distance: number; reached: boolean }[] {
  const { pairSeed, namespace, count, known = [] } = opts;
  const attempts = opts.maxAttempts ?? BREEDING.novelty.maxAttempts;
  const measure = opts.measure ?? descriptorDistance;
  const accepted: Descriptor[] = [...known];
  const acceptedCandidates: T[] = [];
  const out: { candidate: T; descriptor: Descriptor; attempt: number; distance: number; reached: boolean }[] = [];

  for (let index = 0; index < count; index++) {
    // Erreicht kein Versuch die Schwelle, wird der UNÄHNLICHSTE akzeptiert — nicht der letzte.
    // Das ist die gleiche Menge an Arbeit, aber die Untergrenze des Ergebnisses steigt messbar:
    // „der letzte Entwurf“ konnte ein Klon sein, „der unähnlichste von sechs“ nie.
    let best: { candidate: T; descriptor: Descriptor } | null = null;
    let bestAttempt = 0;
    let bestDistance = -1;
    let reached = false;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const built = opts.make(candidateRng(pairSeed, namespace, index, attempt), index, attempt);
      // Nicht-distinkter Entwurf verliert JEDEN Vergleich (Distanz 0 statt gemessen) — er kann
      // nur noch gewinnen, wenn ALLE Versuche Zwillinge sind: die Schleife endet immer.
      const ok = opts.distinct ? opts.distinct(built.candidate, acceptedCandidates) : true;
      const distance = ok ? nearestDistance(built.descriptor, accepted, measure) : 0;
      if (distance > bestDistance) { best = built; bestAttempt = attempt; bestDistance = distance; }
      if (ok && distance >= BREEDING.novelty.minDistance) { reached = true; break; }
    }
    const chosen = best!;
    accepted.push(chosen.descriptor);
    acceptedCandidates.push(chosen.candidate);
    out.push({ candidate: chosen.candidate, descriptor: chosen.descriptor, attempt: bestAttempt, distance: bestDistance, reached });
  }
  return out;
}

/**
 * Elternähnlichkeit als Vertrag: in frühen Generationen MUSS ein Kind seinen Eltern erkennbar
 * nahe bleiben (die Drift darf das noch nicht aufreißen). Wird genutzt, um die Drift-Kurve in
 * Tests zu pinnen — und um zu verhindern, dass ein Tuning die Familienlinie still zerlegt.
 */
export function parentSimilarityOk(child: Descriptor, parents: readonly Descriptor[], generation: number, measure: Measure = descriptorDistance): boolean {
  const limit = BREEDING.parentSimilarityFloor + driftFor(generation) * 0.5;
  return nearestDistance(child, parents, measure) <= limit;
}

/** Genom-Kurzschlüssel (stabile Identität fürs Sprite/Discovery — aus dem Inhalt, nicht der ID). */
export function genomeKey(genome: Genome): string {
  return genome.map(g => `${g.id}${g.power.toFixed(3)}${g.dominant ? 'D' : 'r'}`).join(',');
}

/** Träger-Gene: vorhanden, aber unter der Sichtschwelle (für Anzeige/Tests). */
export function carriedGenes(genome: Genome): Gene[] {
  return genome.filter(g => g.power <= BREEDING.visiblePower);
}
