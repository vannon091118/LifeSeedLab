// Owner: Source (Produktversion). LOC ≤ 200.
// EINE Quelle der angezeigten Produktversion. Die Nummer steht in `package.json` — die liest jeder
// npm- und Release-Werkzeugweg; die Fußzeile des Hubs zeigt sie an. `version.test.ts` hält beide
// zusammen: ohne diesen Lock veraltet die Anzeige still, und zwei Releases tragen dieselbe Nummer.
//
// Bewusst KEIN Import von package.json im App-Graph: Vite würde die komplette Paket-Beschreibung
// (inklusive Abhängigkeitsbaum) in das Spiel-Bundle ziehen. Die Zahl steht hier, der Abgleich
// passiert im Test.

/** Muss `package.json` → `version` entsprechen (Lock: `version.test.ts`). */
export const APP_VERSION = '0.0.32';

/** Anzeigeform für die Release-Fläche. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
