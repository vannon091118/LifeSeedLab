// Owner: DiscoveryChain (Pflanzen-Identifier). LOC ≤ 60.
// P2' (Plan „Seed-Identität, HMAC-Pflanzenschutz & Ghost-Map-Multiplayer" §1.2):
// `plant_ref` ist der ÖFFENTLICHE Identifier einer Kreuzung. Der private Zucht-Seed wandert
// als Eingabe in diesen Beleg, aber NICHT in den Eintrag oder den Share-Text.
//
// WARUM NICHT MEHR `plant_hmac` (Befund 20.09.2026, adversarialer Review):
// Der alte Name behauptete einen HMAC. Gemessen am Code war es ein FNV-32 OHNE Schlüssel über
// öffentliche Eingaben plus Seed — der Kommentar sagte das ehrlich, aber der FELDNAME überlebte
// den Kommentar und wanderte in Schema, Share-Format und SQL-Spiegel. Ein Name, der eine
// kryptografische Eigenschaft verspricht, die die Funktion nicht hat, ist eine zweite Wahrheit
// über dieselbe Sache. Jetzt heißt die Sache, was sie ist: eine Referenz. Ein echtes HMAC kommt
// mit P3/P4 (Account-Root, Server-Secret) und braucht dann ein neues Feld — nicht dieses.
//
// WARUM HIER UND NICHT IN gacha.ts: der Seed-Writer bleibt `gacha.ts` (Single Writer,
// Verbot 1). Diese Funktion MISCHT einen Seed zu einem Beleg — sie leitet keinen ab.
//
// SCHUTZMODELL (ehrlich, gemessen am Code): auf Epoche 0 ist EPOCH_ROOT öffentlich, und
// `deriveSeed(EPOCH_ROOT, 'plant', a, b, gen)` ist es damit auch — wer Eltern und Generation
// kennt, kann den Seed weiterhin nachrechnen. Der Beleg TRENNT heute die zwei Wahrheiten
// (privater Seed vs. öffentlicher Identifier) und macht die Entry- und Share-Struktur
// serverfertig; echten Schutz gegen Offline-Vorausberechnung gibt erst der geheime
// Account-Root aus P3 (Plan §4.4). Das ist bewusst so dokumentiert, nicht behauptet.

import { fnv1aHex } from '../core/hash';
import { EPOCH_ROOT } from '../config';

/** Der öffentliche Identifier einer Pflanze — fixer Präfix + Mischwert. */
type PlantRef = string;

/**
 * Mischt den privaten Zucht-Seed mit dem öffentlichen Kreuzungs-Kontext zu einem Beleg.
 * Rein und deterministisch (kein Date.now, kein Math.random): dieselbe Kreuzung ergibt
 * denselben Beleg, eine andere einen anderen. Der Seed ist nicht aus dem Beleg ablesbar.
 *
 * Der Präfix ist `pr-` (plant ref). Bis Schema v2 hieß er `ph-` („plant hmac"); die Migration
 * schreibt ihn um, damit auch im Draht-Format kein HMAC-Versprechen zurückbleibt.
 */
export function plantRefOf(
  seed: number,
  parentAId: string,
  parentBId: string,
  generation: number,
): PlantRef {
  const raw = fnv1aHex(`pr|epoch:${EPOCH_ROOT}|a:${parentAId}|b:${parentBId}|gen:${generation}|seed:${seed}`);
  return `pr-${raw}`;
}
