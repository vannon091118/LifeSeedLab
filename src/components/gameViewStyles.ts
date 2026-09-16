// Owner: UI (GameView-Styles). LOC ≤ 100.
// Reines Präsentations-Styling des Run-Screens (Paper/Ink-Sprache, B0/B7.4).
// Kein State, keine Logik — nur die CSS-Objekte, die GameView konsumiert.
import type { CSSProperties } from 'react';

export const gameViewStyles: Record<string, CSSProperties> = {
  shell: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', position: 'relative' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: '#fbf6e9', borderBottom: '2px solid var(--ink)', boxShadow: '0 2px 0 rgba(43,43,38,0.06)', zIndex: 2 },
  topLeft: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  logo: { fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0.3 },
  sub: { fontSize: 11, color: '#6b6250', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' },
  topRight: { display: 'flex', gap: 8, alignItems: 'center' },
  btn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', lineHeight: 1, minHeight: 44, minWidth: 44 },
  btnPrimary: { background: 'var(--leaf)', color: '#fff', borderColor: 'var(--ink)' },
  btnBeetle: { background: '#d9a441', color: '#2b2b26', borderColor: 'var(--ink)' },
  // B23.2: während die Welle läuft ist der Knopf eine Anzeige, kein Knopf mehr.
  btnDisabled: { background: '#e6dfc9', color: '#6b6250', cursor: 'not-allowed', boxShadow: 'none' },
  prepHint: { flexBasis: '100%', fontSize: 11, fontWeight: 700, color: '#6b6250', textAlign: 'center', letterSpacing: 0.3 },
  stage: { flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 10px 8px', background: 'var(--paper)' },
  canvasFrame: { position: 'relative', width: '100%', maxWidth: 860, flex: 1, minHeight: 0, background: '#fff', border: '2px solid var(--ink)', borderRadius: 14, boxShadow: '4px 4px 0 var(--ink), 0 14px 32px rgba(43,43,38,0.16)', overflow: 'hidden', display: 'flex' },
  canvas: { width: '100%', height: '100%', display: 'block', touchAction: 'none', flex: 1 },
  hud: { position: 'absolute', top: 10, left: 10, display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 1 },
  // P3QA-08: Ressourcen (Nektar/Leben/Welle) dünner, Werkzeuge (Karten unten) kräftig —
  // der Blick soll zuerst auf die Ressourcen fallen, ohne mit klickbaren Karten zu konkurrieren.
  hudChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 10, boxShadow: '1px 1px 0 var(--ink)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 },
  hudChipCombo: { background: 'var(--paper-warm)', borderColor: 'var(--ink)', color: 'var(--ink)' },
  cancelBtn: { position: 'absolute', top: 10, right: 10, zIndex: 2, padding: '8px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 10, boxShadow: '2px 2px 0 var(--ink)', fontSize: 12, fontWeight: 800, cursor: 'pointer', minHeight: 44 },
  // P3QA-05: Der Erst-Run-Hinweis ist die wichtigste Anleitung — prominent im Feld, nicht
  // als Zettel darunter. Nach dem ersten wellen-Start verblasst er zur Zettel-Version.
  firstRunHint: { position: 'absolute', left: '50%', bottom: 84, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fffbe8', border: '2px solid var(--ink)', borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', fontSize: 14, color: '#2b2b26', fontWeight: 700, maxWidth: '86%', zIndex: 3, textAlign: 'center' as const, pointerEvents: 'none' as const },
  paperNote: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 10, boxShadow: '2px 2px 0 var(--ink)', fontSize: 11, color: '#6b6250', fontWeight: 600, maxWidth: 860, width: '100%', justifyContent: 'center', textAlign: 'center' as const },
  paperNotePin: { width: 8, height: 8, borderRadius: '50%', background: 'var(--nektar)', border: '1.5px solid var(--ink)', display: 'inline-block', flexShrink: 0 },
};
