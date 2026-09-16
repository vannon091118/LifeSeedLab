// Owner: UI (Zahlendarstellung). LOC ≤ 200.
// Befund beider Spielerberichte: das Game-Over-Blatt zeigte „243.09999999999997". Der Score ist
// eine Kombi-vervielfachte Sim-Größe und deshalb legitim gebrochen — angezeigt wird er aber als
// Spielerzahl. Gerundet wird NUR hier (Anzeige), nie in der Sim: die Wahrheit bleibt genau.

/** Ganzzahl für die Anzeige (Score, Zähler). */
export function formatScore(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value));
}
