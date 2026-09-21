// Shinon Mutations-Drill — wiederholbares Red-Team-Werkzeug („600+ grün“ ist nur dann ein
// Beweis, wenn die Suite beißt).
//
// Dieses File ist nur der ABLAUF: auswählen → Sandkasten aufbauen → Baseline prüfen → je
// Mutation anwenden, Lauf lesen, zurücknehmen → Bilanz. Die drei Zuständigkeiten liegen daneben:
//   drill/registry.ts  WAS mutiert wird (Daten, Selbstcheck, Auswahl)
//   drill/worktree.ts  WO es läuft (isoliert, P-26; anwenden/zurücknehmen/abbauen)
//   drill/verdict.ts   WIE es gelesen wird (Vitest-Ausgabe, Baseline-Wache, Verdikt)
//
// Aufruf:  node tools/shinon/mutate.ts [--klasse vererbung,phaenotyp] [--id V1-…,N4-…]
//          Klassen: logik · oekonomie · spawn · persistenz · vererbung · phaenotyp · gacha · werte
//          Klasse und Mutation sind kombinierbar (ODER); ohne Auswahl läuft die ganze Registry.
// Exit:    0 = alle Mutationen gefangen · 1 = überlebt/fehlgeschlagen · 2 = rote Baseline
//          (nicht bewertbar — der Ausgangsstand war schon rot, gedrillt wurde nichts).

import { execSync } from 'node:child_process';
import { registryBefunde, waehleMutationen } from './drill/registry.ts';
import { fuehreAus, worktreeAnlegen, worktreeAbbauen, mutationAnwenden, mutationZuruecknehmen } from './drill/worktree.ts';
import { baselineBefund, bilanz, blockierendeFails, verdiktEinerMutation } from './drill/verdict.ts';
import type { DrillErgebnis } from './drill/verdict.ts';

const LANE = 'node scripts/test-lane.mjs --full';
const LANE_TIMEOUT_MS = 600_000;

export async function laufeDrill(root: string, klasseFilter?: string, idFilter?: string): Promise<DrillErgebnis[]> {
  // Selbstcheck ZUERST: ein blindes Prüfwerkzeug wäre schlimmer als keins (Anker müssen greifen).
  const probleme = registryBefunde(root);
  if (probleme.length) throw new Error(`Registry blind: ${probleme.join(' · ')}`);
  const gewaehlt = waehleMutationen(klasseFilter, idFilter);

  const wt = worktreeAnlegen(root);
  try {
    const baseline = fuehreAus(wt, LANE, LANE_TIMEOUT_MS);
    if (bilanz(baseline.text).total === -1) {
      throw new Error(`Baseline ohne Vitest-Bilanz (exit=${baseline.code}) — Ausgabe-Anfang: ${baseline.text.slice(0, 400).replace(/\s+/g, ' ')}`);
    }
    // Rote Baseline ⇒ Abbruch VOR der ersten Mutation: kein Ergebnis, das wie ein Befund aussieht.
    const rote = baselineBefund(blockierendeFails(baseline.text));
    if (rote) throw new Error(`BASELINE-ROT: ${rote}`);

    const ergebnisse: DrillErgebnis[] = [];
    for (const m of gewaehlt) {
      if (!mutationAnwenden(wt, m)) {
        ergebnisse.push({ id: m.id, klasse: m.klasse, status: 'FEHLGESCHLAGEN', waechter: [],
          hinweis: 'Ersetzung griff nicht — fail-closed, kein Lauf mit unmutiertem Code' });
        continue;
      }
      const aus = fuehreAus(wt, LANE, LANE_TIMEOUT_MS);
      // Zurücknehmen VOR dem Verdikt: der Worktree muss für die nächste Mutation sauber sein,
      // und ein gescheiterter Restore ist ein Abbruch (nie ein mutierter Stand als Ergebnis).
      mutationZuruecknehmen(wt, m.datei);
      ergebnisse.push(verdiktEinerMutation(m, aus));
    }
    return ergebnisse;
  } finally {
    worktreeAbbauen(root, wt);
  }
}

// CLI-Einstieg (nicht beim Import aus Tests ausführen).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('shinon/mutate.ts')) {
  const arg = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  laufeDrill(root, arg('--klasse'), arg('--id')).then(ergebnisse => {
    console.log('══ Mutations-Drill — Bite-Bilanz ══');
    let nichtGefangen = 0;
    for (const e of ergebnisse) {
      console.log(`[${e.status.padEnd(12)}] ${e.id} (${e.klasse}) — ${e.hinweis}`);
      for (const w of e.waechter) console.log(`               ↳ ${w}`);
      if (e.status !== 'GEFANGEN') nichtGefangen++;
    }
    console.log(`Bilanz: ${ergebnisse.length - nichtGefangen}/${ergebnisse.length} gefangen`);
    process.exit(nichtGefangen > 0 ? 1 : 0);
  }).catch(err => {
    const nachricht = String(err?.message ?? err);
    // Exit 2: nicht bewertbarer Ausnahmezustand (rote Baseline) — unterscheidbar von einem
    // echten Befund (1 = blinder Fleck/Werkzeugfehler) und von grün (0).
    if (nachricht.startsWith('BASELINE-ROT')) {
      console.error('NICHT BEWERTBAR:', nachricht);
      process.exit(2);
    }
    console.error('DRILL-FEHLGESCHLAGEN:', nachricht);
    process.exit(1);
  });
}
