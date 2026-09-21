// Owner: Drill (Registry). WAS mutiert wird — Daten, Selbstcheck und Auswahl. Keine Ausführung.
//
// Eine Mutation ist eine chirurgische Falschheit in EINER Wahrheit: `find` muss exakt einmal in
// der Zieldatei stehen (Selbstcheck `registryBefunde` vor jedem Lauf), sonst wäre der Drill
// selbst blind. `replace` ist die Falschheit; `erwarteterWächter` ist reine Befund-Referenz für
// den Menschen — wer wirklich beißt, entscheidet der Lauf, nie diese Zeile.
//
// Auswahl ist fail-closed: ein Tippfehler in `--klasse`/`--id` ist ein Fehler und eine leere
// Auswahl wird abgebrochen — sonst meldete ein Lauf mit null Mutationen eine makellose Bilanz.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type MutationsKlasse =
  | 'logik' | 'oekonomie' | 'spawn' | 'persistenz'   // Simulation, Ökonomie, Wellen, Persistenz
  | 'vererbung' | 'phaenotyp' | 'gacha' | 'werte';   // Genome (Zuchtkern, Ableitung, Wurf, Werte)

export interface Mutation {
  id: string;
  klasse: MutationsKlasse;
  /** Relative Datei (mit /), die mutiert wird. */
  datei: string;
  /** Exakt dieser Text muss genau einmal in der Datei stehen (fail-closed Apply). */
  find: string;
  replace: string;
  /** Ein Testmuster, das die Mutation FANGEN sollte — nur für die Befund-Referenz. */
  erwarteterWächter: string;
}

export const MUTATIONEN: Mutation[] = [
  {
    id: 'M1-bite-reach-x4',
    klasse: 'logik',
    datei: 'src/simulation/enemySystem.ts',
    find: 'const reach2 = ENEMY_BITE.reach * ENEMY_BITE.reach;',
    replace: 'const reach2 = ENEMY_BITE.reach * ENEMY_BITE.reach * 4;',
    erwarteterWächter: 'plant_defense.test.ts (Biss-Kadenz)',
  },
  {
    id: 'M2-nektar-x2',
    klasse: 'oekonomie',
    datei: 'src/simulation/scoreSystem.ts',
    find: 'Math.floor(reward / 5)',
    replace: 'Math.floor(reward / 2)',
    erwarteterWächter: 'gateB.test.ts (kein zweiter Kontostand)',
  },
  {
    id: 'M3-spawn-splice',
    klasse: 'spawn',
    datei: 'src/simulation/waveSystem.ts',
    find: 'state.wave.spawnQueue.shift();',
    replace: 'state.wave.spawnQueue.splice(0, 2);',
    erwarteterWächter: 'wave_flow.test.ts (M3-Vertrag: ΔQueue = ΔGegner)',
  },
  {
    id: 'M4-checksum-seed',
    klasse: 'persistenz',
    datei: 'src/persistence/storage.ts',
    find: 'let h = 0x811c9dc5 >>> 0;',
    replace: 'let h = 0x811c9dc6 >>> 0;',
    erwarteterWächter: 'meta_migrations.test.ts (Legacy-Envelope-Prüfsumme)',
  },

  // ── Genome-Domäne (Zuchtkern · Phänotyp-Ableitung · Gacha · Werte) ──────────────────
  // `vererbung` trifft den geteilten Zuchtkern, der Pflanzen UND Käfer trägt — ein blinder
  // Fleck hier ist doppelt teuer.
  {
    id: 'V1-traeger-daempfung-aus',
    klasse: 'vererbung',
    datei: 'src/genome/breeding.ts',
    find: 'const damping = recessive ? dampRec + drift * wakeGain : dampDom;',
    replace: 'const damping = recessive ? 1 : dampDom;',
    erwarteterWächter: 'breeding.test.ts (rezessive Wiederkehr: verborgen ⇒ erwacht)',
  },
  {
    id: 'V2-kanonische-gen-ordnung',
    klasse: 'vererbung',
    datei: 'src/genome/breeding.ts',
    find: "const ids = Array.from(new Set([...a.map(g => g.id), ...b.map(g => g.id)])).sort();",
    replace: 'const ids = Array.from(new Set([...a.map(g => g.id), ...b.map(g => g.id)]));',
    erwarteterWächter: 'breeding.test.ts (Eltern-Reihenfolge ändert das Kind nicht)',
  },
  {
    id: 'V3-drift-kurve-flach',
    klasse: 'vererbung',
    datei: 'src/config/phenotype.source.ts',
    find: '  return cap - (cap - start) * keep;',
    replace: '  return start;',
    erwarteterWächter: 'breeding.test.ts (stetige Drift: Gen 1 nah, Gen 6 gelöst)',
  },
  {
    id: 'V4-carry-verlust-tot',
    klasse: 'vererbung',
    datei: 'src/genome/breeding.ts',
    find: '      if (rng.next() < BREEDING.carryLoss) continue;',
    replace: '      if (rng.next() < -1) continue;',
    erwarteterWächter: '(keiner — die Suite pinnt nur „Verlust ist selten“, nie „Verlust existiert“)',
  },
  {
    id: 'P1-streu-seed-aus-der-id',
    klasse: 'phaenotyp',
    datei: 'src/genome/plantPhenotype.ts',
    find: "  const rng = makeRng('plant', spreadSeed(genomeKey(input.genome), input.role, input.generation));",
    replace: "  const rng = makeRng('plant', spreadSeed(input.id, input.role, input.generation));",
    erwarteterWächter: 'plantPhenotype.test.ts (Anatomie hängt am Geninhalt, nicht an der ID)',
  },
  {
    id: 'P2-interaktion-mittel-statt-produkt',
    klasse: 'phaenotyp',
    datei: 'src/config/phenotype.source.ts',
    find: '  const value = 0.5 + (axes[rule.a] - 0.5) * (axes[rule.b] - 0.5) * rule.gain;',
    replace: '  const value = 0.5 + ((axes[rule.a] - 0.5) + (axes[rule.b] - 0.5)) * 0.5 * rule.gain;',
    erwarteterWächter: 'plantPhenotype.test.ts (rhythm/guard verlassen das Eltern-Intervall)',
  },
  {
    id: 'P3-gruender-farbanker-aus',
    klasse: 'phaenotyp',
    datei: 'src/genome/beetlePhenotype.ts',
    find: '  const documented = input.generation === 1 && input.specimenId',
    replace: '  const documented = undefined',
    erwarteterWächter: 'beetleVisibility.test.ts (Gründer tragen ihre dokumentierte Farbe)',
  },
  {
    id: 'G1-kanonische-besitz-sortierung',
    klasse: 'gacha',
    datei: 'src/genome/gacha.ts',
    find: 'const canon = [...owned].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));',
    replace: 'const canon = [...owned];',
    erwarteterWächter: 'brood_loop.test.ts (Wurf hängt nur an Seed und Besitz-MENGE)',
  },
  {
    id: 'G2-eltern-ausschluss-tot',
    klasse: 'gacha',
    datei: 'src/genome/gacha.ts',
    find: '      if (!exclude || p.id !== exclude.id) return p;',
    replace: '      return p;',
    erwarteterWächter: 'brood_loop_continuation.test.ts (Kette bleibt bei ≥ 2 Bestand)',
  },

  // ── Tiefensonde: SEMANTISCHE Hebel ohne eingefrorenes Fixture ────────────────────────
  // Die Fixture-lastige Runde (9/9 gefangen) biss fast immer über eingefrorene Stände. Eine
  // Mutation, die einen Balance- oder Verteilungs-Hebel still verschiebt, ohne einen
  // Fixture-Hash zu ändern, wäre dort unsichtbar — genau das prüft diese Gruppe.
  {
    id: 'N1-dominanz-gewicht-im-kraft-index',
    klasse: 'vererbung',
    datei: 'src/genome/breeding.ts',
    find: '  return genome.reduce((s, g) => s + g.power * (g.dominant ? 1.3 : 1), 0);',
    replace: '  return genome.reduce((s, g) => s + g.power, 0);',
    erwarteterWächter: 'breeding.test.ts (Dominanz wiegt im Kraft-Index 1.3)',
  },
  {
    id: 'N2-gacha-eltern-gewicht-weg',
    klasse: 'gacha',
    datei: 'src/genome/gacha.ts',
    find: '  const indexed = canon.map((v) => ({ v, w: 1 / (1 + variantPower(v)) }));',
    replace: '  const indexed = canon.map((v) => ({ v, w: 1 }));',
    erwarteterWächter: 'gacha.test.ts (schwächere Pflanzen werden als Eltern bevorzugt)',
  },
  {
    id: 'N3-typ-vererbung-verschoben',
    klasse: 'gacha',
    datei: 'src/genome/gacha.ts',
    find: "  const childType: PlantType = t < 0.4 ? parentA.type : t < 0.7 ? parentB.type : 'shooter';\n\n  const child: PlantVariant = {\n    id: `cross_${seed.toString(36)}_${crossIndex}`,",
    replace: "  const childType: PlantType = t < 0.5 ? parentA.type : t < 0.8 ? parentB.type : 'shooter';\n\n  const child: PlantVariant = {\n    id: `cross_${seed.toString(36)}_${crossIndex}`,",
    erwarteterWächter: 'gacha.test.ts (Rollen-Vererbung 70/30 des Kindes)',
  },
  {
    id: 'N4-heil-aura-schwelle-zu',
    klasse: 'werte',
    datei: 'src/genome/cross.ts',
    find: "  if (type === 'support' && heal > 0.2) special = 'heal_aura';",
    replace: "  if (type === 'support' && heal > 0.95) special = 'heal_aura';",
    erwarteterWächter: 'cross.test.ts (Unterstützung mit heal-Gen trägt die Aura)',
  },
  {
    id: 'N5-wand-reflex-tot',
    klasse: 'werte',
    datei: 'src/genome/cross.ts',
    find: "  if (type === 'wall' && genePresent(genome, 'thorns')) special = 'reflect';",
    replace: "  if (false && genePresent(genome, 'thorns')) special = 'reflect';",
    erwarteterWächter: 'cross.test.ts (Wand mit thorns reflektiert)',
  },
];

export function drillKopf(): { mutationen: number; klassen: MutationsKlasse[] } {
  return { mutationen: MUTATIONEN.length, klassen: [...new Set(MUTATIONEN.map(m => m.klasse))] };
}

/**
 * Selbstcheck vor jedem Lauf: jedes `find`-Muster muss GENAU EINMAL in seiner Zieldatei stehen.
 *
 * Normalisiert CRLF — ein frischer Worktree checkt unter `core.autocrlf` mit CRLF aus, während
 * die Anker hier LF tragen. Prüfung und Ersetzung (`mutationAnwenden`) lesen dieselbe Wahrheit;
 * sonst wäre der Selbstcheck grün und die Ersetzung griffe bei mehrzeiligen Ankern doch nicht.
 */
export function registryBefunde(root: string): string[] {
  const probleme: string[] = [];
  for (const m of MUTATIONEN) {
    const p = join(root, ...m.datei.split('/'));
    if (!existsSync(p)) { probleme.push(`${m.id}: Zieldatei fehlt (${m.datei})`); continue; }
    const treffer = normalisiere(readFileSync(p, 'utf8')).split(m.find).length - 1;
    if (treffer !== 1) probleme.push(`${m.id}: find-Muster ${treffer}× statt 1× in ${m.datei}`);
  }
  return probleme;
}

/** Zeilenende-Vereinheitlichung für Anker-Vergleiche (siehe `registryBefunde`). */
export function normalisiere(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/**
 * Auswahl aus Klassen und/oder IDs (ODER-Verknüpfung); ohne Filter läuft die ganze Registry.
 * Fail-closed: unbekannter Name ⇒ Fehler; leere Auswahl ⇒ Fehler (keine 0/0-Bilanz).
 */
export function waehleMutationen(klasseFilter?: string, idFilter?: string): Mutation[] {
  // Erst Token bilden, DANN entscheiden: ein Whitespace-Filter ist keine Einschränkung (und
  // darf nicht als leere Auswahl enden — das wäre der stille Leerlauf, den die Wache verhindert).
  const liste = (wert?: string): string[] | null => {
    const teile = (wert ?? '').split(',').map(s => s.trim()).filter(Boolean);
    return teile.length ? teile : null;
  };
  const klassen = liste(klasseFilter);
  const ids = liste(idFilter);
  if (klassen) {
    const unbekannt = klassen.filter(k => !MUTATIONEN.some(m => m.klasse === k));
    if (unbekannt.length) throw new Error(`Unbekannte Klasse(n): ${unbekannt.join(', ')}`);
  }
  if (ids) {
    const unbekannt = ids.filter(id => !MUTATIONEN.some(m => m.id === id));
    if (unbekannt.length) throw new Error(`Unbekannte Mutation(s): ${unbekannt.join(', ')}`);
  }
  // Kein Leerlauf-Schutz nötig: jeder gültige Filter trifft mindestens eine Mutation (jede
  // Klasse und jede ID existiert), und ein leerer Filter zählt als „kein Filter".
  return MUTATIONEN.filter(m =>
    (!klassen && !ids) || (klassen?.includes(m.klasse) ?? false) || (ids?.includes(m.id) ?? false));
}
