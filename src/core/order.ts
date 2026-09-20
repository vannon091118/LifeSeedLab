// Owner: CoreOrdering (deterministische Reihenfolge). LOC ≤ 60.
//
// WARUM ES DIESES MODUL GIBT (Befund 20.09.2026, adversarialer Review):
// `localeCompare` kollationiert SPRACHABHÄNGIG. Dieselben IDs ergaben in cs-CZ, da-DK und
// lt-LT eine andere Reihenfolge als in en-US — und die kanonische Sortierung ist Bestandteil
// von Gültigkeiten, die über den Lauf hinaus gelten: `canonicalGenome` im genome_hash
// (`discovery/chain.ts`), die id-Sortierung im Zustands-Hash (`core/hash.ts`) und der
// Tie-Break des Leitfähigkeits-Dijkstra (`simulation/vectorSystem.ts`). Eine einzige neue
// Gen-ID mit einem Buchstaben, den eine Locale anders einordnet, hätte damit einen anderen
// `genome_hash` ergeben — je nach Browsersprache des Spielers. Das ist dieselbe Fehlerklasse
// wie `Math.pow` in der Simulation (Float-Exaktheit, architecture-contract.md §6) und wird
// genauso durchgesetzt: Gate-Regel „Deterministische Reihenfolge" plus Baum-Test.
//
// Der Vergleich ist ein reiner Code-Unit-Vergleich (UTF-16 über die `<`/`>`-Relation, die die
// Sprachspezifikation als code-unit-weise festschreibt): keine Locale, keine ICU-Kollation,
// keine Plattformabhängigkeit. Gleiche Eingabe ⇒ gleiche Reihenfolge auf jeder Maschine.

/**
 * Deterministischer String-Vergleich: Code-Units, niemals Locale.
 *
 * Rückgabe wie ein Comparator: negativ (a vor b), 0 (gleich), positiv (b vor a). Bewusst nur
 * -1/0/1 — die Größe des Abstands trägt hier keine Bedeutung und wäre eine zweite Wahrheit.
 */
export function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
