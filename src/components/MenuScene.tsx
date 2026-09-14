// Owner: UI (MenuScene — dekorative Menü-Hintergrundszene). LOC ≤ 100.
// P3: Das Menü soll sich wie das Spiel anfühlen. Reine Präsentation — keine
// Interaktion, keine Gameplay-Bedeutung, deterministisch (statisches SVG).

export function MenuScene() {
  return (
    <svg style={menuSceneStyles.scene} viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <path d="M0 150 Q80 120 160 145 T400 140 V240 H0 Z" fill="#e3d9bd" />
      <path d="M0 175 Q120 150 220 172 T400 168 V240 H0 Z" fill="#d6c9a4" />
      <path d="M0 205 Q140 185 260 202 T400 198 V240 H0 Z" fill="#c4b489" />
      {/* geschotterter Weg — das Spielfeld lädt ins Menü ein */}
      <path d="M0 190 Q60 182 120 188 T240 186 T400 184" stroke="#b7a986" strokeWidth="10" fill="none" opacity="0.7" />
      <g stroke="#2b2b26" strokeWidth="1.4" strokeLinecap="round" opacity="0.5">
        <path d="M60 205 q3 -14 -2 -20 M66 206 q1 -10 6 -15 M72 205 q4 -12 0 -18" fill="none" />
        <path d="M300 208 q3 -12 -2 -18 M306 209 q2 -9 6 -13" fill="none" />
        <path d="M180 200 q2 -12 -3 -17 M186 201 q1 -9 5 -13" fill="none" />
      </g>
      {/* kleine Pflanze auf dem Hügel — Spielmarke */}
      <g transform="translate(330 176)">
        <path d="M0 0 V-12" stroke="#2e4a2a" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 -12 C-6 -18 -12 -20 -18 -18 C-14 -10 -8 -8 0 -10 Z" fill="#5a8f4e" stroke="#2b2b26" strokeWidth="1.8" />
        <path d="M0 -10 C6 -16 12 -18 18 -16 C14 -8 8 -6 0 -8 Z" fill="#7fb069" stroke="#2b2b26" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

const menuSceneStyles: Record<string, React.CSSProperties> = {
  scene: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0.55,
    pointerEvents: 'none',
  },
};
