// Owner: UI (GameIcons — Ink-Glyphen der HUD-Chips und Menü-Tabs). LOC ≤ 100.
// Reine Präsentation, ink stroke auf paper. Kein State, keine Sim-Kopplung.

/**
 * P-30 (23.09.2026): die Hub-/Menü-Tabs trugen Emojis als Endgrafik (B0-Verstoß). Ersatz:
 * vier SVG-Glyphen in derselben Ink-Sprache (Kontur + Fläche + Papier-Highlight), konsumiert
 * von `NavIndicators` (Glyph + Text) statt Emoji-Strings aus i18n. Emojis sind Font-abhängig
 * und tragen fremde Stile — die Glyphen sprechen die Paper/Ink-Regie des Spiels.
 */

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

/** Tab-Glyphe „Gewächshaus“: Topf in Leaf-Grün mit Spross — das Zucht-Haus. */
export function GreenhouseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 9.5A5 5 0 0113 9.5" stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M4.5 9.5H11.5L10.6 13.5H5.4Z" fill="#a8cd86" stroke="#2b2b26" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 9.5C8 9.5 8 7.4 8 6.2" stroke="#2b2b26" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 6.4C8 6.4 6.2 6.1 5.8 4.4C7.4 4.4 8.1 5.3 8 6.4Z" fill="#a8cd86" stroke="#2b2b26" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 6.4C8 6.4 9.8 6.1 10.2 4.4C8.6 4.4 7.9 5.3 8 6.4Z" fill="#a8cd86" stroke="#2b2b26" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/** Tab-Glyphe „Shop“: Marktstand-Baldachin in Amber mit Papier-Highlight. */
export function ShopGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.6 6.2L3.6 2.9H12.4L13.4 6.2" fill="#d9a441" stroke="#2b2b26" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M2.6 6.2H13.4V8H2.6Z" fill="#f0b775" stroke="#2b2b26" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4 8V13H12V8" fill="none" stroke="#2b2b26" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.6 13V10.6H7.2V13" fill="none" stroke="#2b2b26" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M9 9.8H10.6" stroke="#fff8e6" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Tab-Glyphe „Brutstätte“: Käfer-Tier in Violett der Brut-Domäne. */
export function BeetleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.6V4.4" stroke="#2b2b26" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="8" cy="9" rx="4.2" ry="4.6" fill="#a882c9" stroke="#2b2b26" strokeWidth="1.3" />
      <path d="M8 4.6V13.4" stroke="#2b2b26" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M4 7.2C5.4 8 6.6 8 8 7.6C9.4 8 10.6 8 12 7.2" stroke="#2b2b26" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M4.4 10.8C5.6 10.2 6.8 10.2 8 10.6C9.2 10.2 10.4 10.2 11.6 10.8" stroke="#2b2b26" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M3.6 6.4L2.2 5.4M3.6 6.4L2.4 7.8M12.4 6.4L13.8 5.4M12.4 6.4L13.6 7.8" stroke="#2b2b26" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/** Tab-Glyphe „Codex“: Laborbuch mit Lesebändchen in Tinte auf Papier. */
export function CodexGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3.2" y="2.6" width="9.6" height="10.8" rx="1" fill="#fff" stroke="#2b2b26" strokeWidth="1.3" />
      <path d="M3.2 5H12.8" stroke="#2b2b26" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5.6 7.4H10.4M5.6 9.4H10.4" stroke="#2b2b26" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M10.8 2.6V7.2L9.4 6.2L8 7.2V2.6" fill="#a94438" stroke="#2b2b26" strokeWidth="0.9" strokeLinejoin="round" />
    </svg>
  );
}

