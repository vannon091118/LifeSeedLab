// Owner: VisualGeneratorSystem (Gegner-Zweig). LOC ≤ 200.
// ARCHETYP + ERBGUT = ResolvedBeetleVisual. Die Gegner benutzen DIESELBE Anatomie-Auflösung wie
// Brut und Käfer (visual/beetleGenerator.ts) — nur mit ihrem eigenen Erbgut
// (genome/enemyPhenotype.ts). Es gibt bewusst keinen zweiten Käfer-Zeichenpfad mehr.
//
// Reichweite der Ableitung:
//   • normale Archetypen: EIN Wesen pro Typ, stabil über den ganzen Lauf — eine Art muss
//     erkennbar bleiben, sonst kann der Spieler Bedrohungen nicht lesen.
//   • Boss: individualisiert pro Erscheinen (`individualKey` = Entity-ID). Jeder Boss ist ein
//     Einzelstück, und derselbe Boss-Spawn ergibt immer wieder dasselbe Einzelstück.
//
// Reine Präsentation: kein Zustand in der Sim, kein RNG-Strom, keine Uhr. Der Cache ist reine
// Ableitungs-Memoisation (dieselben Eingaben ⇒ dieselbe Ausgabe), wie render/spriteCache.ts.

import { EPOCH_ROOT } from '../config';
import { ENEMY_GENOMES_SOURCE, type EnemyTypeId } from '../config/enemyGenome.source';
import { enemyAncestorFor } from '../genome/enemyPhenotype';
import { resolveBeetleVisualFor, type ResolvedBeetleVisual } from './beetleGenerator';

const cache = new Map<string, ResolvedBeetleVisual>();

/** Cache-Schlüssel: Archetyp, bei individualisierten Wesen zusätzlich die Erscheinung. */
function keyFor(typeId: EnemyTypeId, individualKey?: string): string {
  return ENEMY_GENOMES_SOURCE[typeId].individual && individualKey
    ? `enemy:${typeId}:${individualKey}`
    : `enemy:${typeId}`;
}

export function enemyVisualFor(typeId: EnemyTypeId, individualKey?: string): ResolvedBeetleVisual {
  const key = keyFor(typeId, individualKey);
  const hit = cache.get(key);
  if (hit) return hit;
  const ancestor = enemyAncestorFor(typeId, individualKey);
  // `visual`-Namespace: die Gegner-Domäne (Spawn/Crit) wird nie berührt.
  const visual = resolveBeetleVisualFor(
    { id: key, genome: ancestor.genome, generation: ancestor.generation },
    EPOCH_ROOT,
    undefined,
    'visual',
  );
  cache.set(key, visual);
  return visual;
}

/** Zeichen-Größe des Archetyps relativ zur Zelle (Source-Wert, keine Ableitung im Renderer). */
export function enemyDrawScale(typeId: EnemyTypeId): number {
  return ENEMY_GENOMES_SOURCE[typeId].drawScale;
}

export function enemyVisualCacheSize(): number {
  return cache.size;
}

export function clearEnemyVisualCache(): void {
  cache.clear();
}
