// Owner: UI (GameIcons — 14px-Glyphen der HUD-Chips). LOC ≤ 100.
// Reine Präsentation, ink stroke auf paper. Kein State, keine Sim-Kopplung.

export function DropChipIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 1.5C7 1.5 2.8 6 2.8 9.1A4.2 4.2 0 0011.2 9.1C11.2 6 7 1.5 7 1.5Z" fill="#d9a441" stroke="#2b2b26" strokeWidth="1.2" strokeLinejoin="round"/><circle cx="5.4" cy="7.2" r="1" fill="white" opacity="0.85"/></svg>;
}

export function LivesChipIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M7 11.2C7 11.2 2.3 8.4 2.3 5.6A2.7 2.7 0 017 3.1A2.7 2.7 0 0111.7 5.6C11.7 8.4 7 11.2 7 11.2Z" fill="#5a8f4e" stroke="#2b2b26" strokeWidth="1.2"/><path d="M7 3.1C7 3.1 7.8 4.6 7 6" stroke="#2b2b26" strokeWidth="0.9" strokeLinecap="round"/></svg>;
}

export function WaveChipIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M1.5 7 Q3.5 3.5 5.5 7 T9.5 7 T12.5 7" stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" fill="none"/><path d="M1.5 9 Q3.5 5.5 5.5 9 T9.5 9 T12.5 9" stroke="#2b2b26" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/></svg>;
}
