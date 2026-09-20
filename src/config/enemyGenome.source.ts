// Owner: Source (content truth). LOC ≤ 200.
// GEGNER-ERBGUT (P7, 19.09.2026): jeder Creep-Typ trägt ein GENOM in derselben biologischen
// Sprache wie Brut und Käfer. Vorher zeichnete `render/layers/enemies.ts` fünf fest verdrahtete
// Körper — ein Grunt in Welle 3 und einer in Welle 23 waren dasselbe Bild, und eine „Hummel“
// konnte gar kein Insekt sein, weil kein Gegner Flügel, Pelz oder Stachel besaß.
//
// DETERMINISMUS-VERTRAG: dieses Genom ist heute eine PRÄSENTATIONS-Eingabe. HP/Tempo/Schaden
// bleiben allein in `enemies.source.ts`; die Simulation liest hier nichts, und die Ableitung
// benutzt ausschließlich den `visual`-Namespace — die Gegner-Domäne (Spawn/Crit) bleibt
// unberührt. FX ON/OFF und jeder Simulations-Hash sind damit unverändert. Das Genom ist zugleich
// der vorbereitete Anker für PvP: „Brute = Gegner und Käfer sind dieselbe Kreatur“.

// KEINE eigene Union: die Gegner-Typen sind EINE Wahrheit in config/enemies.source.ts.
import type { EnemyTypeId } from './enemies.source';
export type { EnemyTypeId };

interface EnemyGenomeSource {
  /** Gene (BEETLE_GENES_SOURCE-Ids) — sie bestimmen die SICHTBARE Anatomie, nicht die Werte. */
  genes: readonly string[];
  /** Generation der Ableitung: höhere Generation = mehr Eigenständigkeit im Phänotyp. */
  generation: number;
  /** Größe der Zeichnung relativ zur Zelle (Architektur des Archetyps, nicht des Individuums). */
  drawScale: number;
  /** Boss: EINZIGARTIG pro Erscheinen (eigene Streuung + ein Zug aus `individualPool`). */
  individual: boolean;
  /** Zusatz-Gene, aus denen ein individualisiertes Wesen EINES zieht (nur bei `individual`). */
  individualPool?: readonly string[];
}

/**
 * Die fünf Archetypen. Die Genwahl ist die Aussage: der Grunt ist ein gepanzerter Bodenkäfer,
 * `fast` eine stromlinige Sprungform mit Flügeln, `tank` ein breiter Schildträger, `swarm` ein
 * pelziger Flügler (der einzige Schwarm, der wirklich fliegt), der Boss ein gehörnter Einzelgänger.
 */
export const ENEMY_GENOMES_SOURCE: Record<EnemyTypeId, EnemyGenomeSource> = {
  // Grunt ist bewusst die NACKTE Grundform (genau ein Gen): der Tank ist ein Kuppel-Schildträger,
  // `fast` eine Flügel-Sprungform, `swarm` eine pelzige Flüglerin — der Grunt muss sich von allen
  // dreien auf einen Blick unterscheiden. Gleiche Rezepte hätten genau die Konvergenz erzeugt,
  // die auf der Brutstätte als „alle sehen gleich aus" gemeldet wurde.
  grunt:  { genes: ['venomous'], generation: 1, drawScale: 1, individual: false },
  fast:   { genes: ['sprinter', 'jumper', 'winged'], generation: 1, drawScale: 0.95, individual: false },
  tank:   { genes: ['hardshell', 'carapace', 'taunt'], generation: 2, drawScale: 1.35, individual: false },
  swarm:  { genes: ['swarmborn', 'winged', 'furry'], generation: 2, drawScale: 0.8, individual: false },
  boss: {
    genes: ['hardshell', 'mandible', 'phoenix'], generation: 4, drawScale: 2.2, individual: true,
    individualPool: ['sting', 'furry', 'venomous', 'broodhost', 'jumper'],
  },
};

/** Gründer-Power der Archetyp-Gene (Brut nutzt 0.6; Gegner starten schwächer, damit Drift greift). */
export const ENEMY_GENE_POWER = 0.55;

/** Streuung der individualisierten Power (Boss): ±Anteil um ENEMY_GENE_POWER. */
export const ENEMY_INDIVIDUAL_SPREAD = 0.35;

/** Untere/obere Klemme der individuellen Genstärke — kein Gen wird zum Monster oder zur Null. */
export const ENEMY_POWER_RANGE: readonly [number, number] = [0.25, 1] as const;
