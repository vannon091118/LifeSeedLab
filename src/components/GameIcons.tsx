// Owner: UI (GameIcons — 14px-Glyphen der HUD-Chips). LOC ≤ 100.
// Reine Präsentation, ink stroke auf paper. Kein State, keine Sim-Kopplung.


export function LivesChipIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 11.2C7 11.2 2.3 8.4 2.3 5.6A2.7 2.7 0 017 3.1A2.7 2.7 0 0111.7 5.6C11.7 8.4 7 11.2 7 11.2Z" fill="#5a8f4e" stroke="#2b2b26" strokeWidth="1.2"/><path d="M7 3.1C7 3.1 7.8 4.6 7 6" stroke="#2b2b26" strokeWidth="0.9" strokeLinecap="round"/></svg>;
}

/** B5.1: Nektar-Zähler des Run-HUD — der Anker, an dem die Belohnungsreise ankommt.
 *  Tropfen in Bernstein auf Papier, dieselbe Ink-Kontur wie die Nachbarglyphen. */
export function NektarChipIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 1.6C7 1.6 11.4 6.2 11.4 8.6A4.4 4.4 0 012.6 8.6C2.6 6.2 7 1.6 7 1.6Z" fill="#d9a441" stroke="#2b2b26" strokeWidth="1.2"/><path d="M5.2 8.4A1.9 1.9 0 007 10.4" stroke="#fff8e6" strokeWidth="1" strokeLinecap="round"/></svg>;
}

export function WaveChipIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M1.5 7 Q3.5 3.5 5.5 7 T9.5 7 T12.5 7" stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" fill="none"/><path d="M1.5 9 Q3.5 5.5 5.5 9 T9.5 9 T12.5 9" stroke="#2b2b26" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/></svg>;
}
