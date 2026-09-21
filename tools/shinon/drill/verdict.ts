// Owner: Drill (Auswertung). WIE ein Lauf gelesen wird — Vitest-Ausgabe, Baseline-Wache, Verdikt.
//
// Reine Textarbeit: kein Prozess, keine Datei, kein Worktree. Genau deshalb ist dieses Modul
// direkt testbar (`tests/mutate.test.ts`) — und genau deshalb liegt die Verdikt-Leiter hier und
// nicht in der Ablaufsteuerung: „was heißt diese Ausgabe“ gehört zur Ausgabe, nicht zum Ablauf.
//
// Zwei Regeln, die hier durchgesetzt werden:
//   Rote Baseline ⇒ NICHT BEWERTBAR. Ist schon vor der ersten Mutation ein Test rot, ließe sich
//   „kein Test reagiert“ nicht von „lag schon vorher rot“ trennen (Befund der Genom-Runde: vier
//   ungedeckte Hebel tarnten sich so als Rauschen). Der Abbruchgrund wird namentlich geliefert.
//   Grüne Baseline ⇒ `UEBERLEBT` ist beweisbar: kein Test reagiert auf die Mutation.

import type { Ausgabe } from './worktree.ts';
import type { Mutation } from './registry.ts';

/** ANSI-Styling strippen — vitest färbt auch über Pipes (FORCE_COLOR-Erbe), Farbcodes zerlegen
 *  die Zahlenmuster. Die Lane (`scripts/test-lane.mjs`) macht es ebenso; die Lane darf aber
 *  nicht von `tools/` importieren (Agent-Tooling fehlt in fremden Klonen), also bleibt die
 *  Striptung beidseitig — geteilt ist hier der Vertrag „vitest-Ausgabe, farbfrei gelesen“. */
export function plainAusgabe(ausgabe: string): string {
  return ausgabe.replace(/\u001b\[[0-9;]*m/g, '');
}

/** Test-Bilanz einer Vitest-Ausgabe; `total: -1` = Ausgabe ohne erkennbare Bilanz. */
export function bilanz(ausgabe: string): { passed: number; failed: number; total: number } {
  const m = plainAusgabe(ausgabe).match(/Tests\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed\s*\((\d+)\)|Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  if (!m) return { passed: -1, failed: -1, total: -1 };
  if (m[3]) return { failed: Number(m[1]), passed: Number(m[2]), total: Number(m[3]) };
  return { failed: 0, passed: Number(m[4]), total: Number(m[5]) };
}

/** Die vollständigen FAIL-Zeilen (Datei + Testname) — Grundlage jeder Zuordnung von Mutation zu Wächter. */
export function blockierendeFails(ausgabe: string): string[] {
  return [...plainAusgabe(ausgabe).matchAll(/FAIL\s+(\S+\.test\.ts) > (.+)/g)]
    .map(m => `${m[1]} > ${m[2].split('\n')[0]}`);
}

/** Wache über den AUSGANGSSTAND: null = gesund (drillen erlaubt), sonst der Abbruchgrund. */
export function baselineBefund(fails: readonly string[]): string | null {
  if (fails.length === 0) return null;
  return `${fails.length} Test(s) sind schon VOR der Mutation rot — Bite-Bilanz nicht bewertbar`
    + ` („kein Test reagiert“ wäre nicht von „lag schon vorher rot“ zu trennen). Erst den`
    + ` Ausgangsstand grün stellen (fremden oder uncommitteten Arbeitsstand klären), dann drillen:\n  - `
    + [...fails].join('\n  - ');
}

export type DrillStatus = 'GEFANGEN' | 'UEBERLEBT' | 'FEHLGESCHLAGEN';

export interface DrillErgebnis {
  id: string;
  klasse: Mutation['klasse'];
  status: DrillStatus;
  waechter: string[];
  hinweis: string;
}

/**
 * Verdikt EINER Mutation aus der Ausgabe ihres Laufs.
 *
 * `FEHLGESCHLAGEN` heißt „nicht bewertbar“ (Werkzeug-Befund), `UEBERLEBT` heißt „bewiesen
 * ungedeckt“ — die beiden dürfen nie verschwimmen, deshalb entscheidet hier nicht der Ablauf,
 * sondern die Ausgabe selbst.
 */
export function verdiktEinerMutation(m: Mutation, aus: Ausgabe): DrillErgebnis {
  const kopf = { id: m.id, klasse: m.klasse };
  const b = bilanz(aus.text);
  if (b.total === -1) {
    return { ...kopf, status: 'FEHLGESCHLAGEN', waechter: [],
      hinweis: `Keine Vitest-Bilanz (exit=${aus.code}${aus.err ? ', ' + aus.err : ''}) — Ausgabe-Anfang: ${aus.text.slice(0, 300).replace(/\s+/g, ' ')}` };
  }
  if (b.failed === 0) {
    return { ...kopf, status: 'UEBERLEBT', waechter: [], hinweis: 'Suite grün trotz Mutation — blinder Fleck!' };
  }
  const fails = blockierendeFails(aus.text);
  if (fails.length === 0) {
    // Nach der Baseline-Wache kann das nur heißen: es gibt Fehler, aber keine identifizierbare
    // FAIL-Zeile. Nicht bewertbar, deshalb weder Fang noch blinder Fleck.
    return { ...kopf, status: 'FEHLGESCHLAGEN', waechter: [],
      hinweis: `${b.failed} Fehler ohne identifizierbare FAIL-Zeile — nicht bewertbar (nicht als Fang gezählt, nicht als blinder Fleck)` };
  }
  return { ...kopf, status: 'GEFANGEN', waechter: fails, hinweis: `${b.failed} Fehler von ${b.total}` };
}
