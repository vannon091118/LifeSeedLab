// Owner: DiscoveryChain (Pflanzen-Identifier). LOC ≤ 60.
// P2' (Plan „Seed-Identität, HMAC-Pflanzenschutz & Ghost-Map-Multiplayer" §1.2):
// `plant_hmac` ist der ÖFFENTLICHE Identifier einer Kreuzung. Der private Zucht-Seed
// wandert als Eingabe in diesen Beleg, aber NICHT in den Eintrag oder den Share-Text.
//
// WARUM HIER UND NICHT IN gacha.ts: der Seed-Writer bleibt `gacha.ts` (Single Writer,
// Verbot 1). Diese Funktion MISCHT einen Seed zu einem Beleg — sie leitet keinen ab.
// Und WARUM KEIN crypto.subtle: die Entries werden synchron gebaut (createEntry ohne
// await); der FNV-Mix genügt der Epoche-0-Spiegelphase. P3/P4 (Worker mit Account-Root
// und Server-Secret) tauschen GENAU diese eine Funktion gegen echtes HMAC — der Entry
// trägt das Feld schon, es ist kein „kommt später"-Seam.
//
// SCHUTZMODELL (ehrlich, gemessen am Code): auf Epoche 0 ist EPOCH_ROOT öffentlich, und
// `deriveSeed(EPOCH_ROOT, 'plant', a, b, gen)` ist es damit auch — wer Eltern und
// Generation kennt, kann den Seed weiterhin nachrechnen. Der Beleg TRENNT heute die zwei
// Wahrheiten (privater Seed vs. öffentlicher Identifier) und macht die Entry- und
// Share-Struktur serverfertig; echten Schutz gegen Offline-Vorausberechnung gibt erst der
// geheime Account-Root aus P3 (Plan §4.4). Das ist bewusst so dokumentiert, nicht behauptet.

import { fnv1aHex } from '../core/hash';
import { EPOCH_ROOT } from '../config';

/** Der öffentliche Identifier einer Pflanze — fixer Präfix + Mischwert. */
type PlantHmac = string;

/**
 * Mischt den privaten Zucht-Seed mit dem öffentlichen Kreuzungs-Kontext zu einem Beleg.
 * Rein und deterministisch (kein Date.now, kein Math.random): dieselbe Kreuzung ergibt
 * denselben Beleg, eine andere einen anderen. Der Seed ist nicht aus dem Beleg ablesbar.
 */
export function plantHmacOf(
  seed: number,
  parentAId: string,
  parentBId: string,
  generation: number,
): PlantHmac {
  const raw = fnv1aHex(`ph|epoch:${EPOCH_ROOT}|a:${parentAId}|b:${parentBId}|gen:${generation}|seed:${seed}`);
  return `ph-${raw}`;
}
