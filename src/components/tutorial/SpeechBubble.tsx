// Owner: UI (Krix — Comic-Sprechblase). LOC ≤ 400.
// B0.7: Notizzettel-Sprache — Papierverschluss, Ink-Kontur, harter Offset-Schatten, keine
// Blur-Glass-Fläche. Schwanz zeigt zur Figur, die Blase ploppt auf (index.css) und der Text
// tippt sich. Zwei Knöpfe in der Blase: der Handlungsknopf (nur bei Leseschritten) und
// „Überspringen" — immer erreichbar, damit niemand im Onboarding festsitzt.

import type { CSSProperties, ReactNode } from 'react';

export interface SpeechBubbleProps {
  speaker: string;
  role: string;
  note: string;
  title: string;
  /** Bereits getippter Textausschnitt (useTypewriter). */
  text: string;
  /** true ⇒ noch am Tippen (Caret blinkt). */
  typing: boolean;
  /** Label des Handlungsknopfs; null ⇒ dieser Schritt verlangt eine Handlung im UI. */
  pressLabel: string | null;
  skipLabel: string;
  hint: string;
  /** Schwanzrichtung: zeigt zur Figur. */
  tail: 'downLeft' | 'downRight';
  onPress: () => void;
  onSkip: () => void;
}

export function SpeechBubble({
  speaker, role, note, title, text, typing, pressLabel, skipLabel, hint, tail, onPress, onSkip,
}: SpeechBubbleProps): ReactNode {
  return (
    <div className="tut-bubble" style={styles.frame}>
      <span style={tail === 'downLeft' ? styles.tailLeft : styles.tailRight} aria-hidden />
      <div style={styles.header}>
        <span style={styles.namePlate}>{speaker}</span>
        <span style={styles.role}>{role}</span>
        <span style={styles.note}>{note}</span>
      </div>
      <button type="button" onClick={onPress} title={hint} style={styles.body}>
        <span style={styles.title}>{title}</span>
        <span style={styles.text}>
          {text}
          {typing && <span className="tut-caret" aria-hidden>▌</span>}
        </span>
      </button>
      <div style={styles.footer}>
        {pressLabel && (
          <button type="button" onClick={onPress} style={{ ...styles.btn, ...styles.btnPrimary }} className="tut-cta">
            {pressLabel}
          </button>
        )}
        <button type="button" onClick={onSkip} style={styles.btn}>{skipLabel}</button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  frame: {
    position: 'relative',
    width: 'min(340px, calc(100vw - 28px))',
    padding: '14px 16px 12px',
    background: 'var(--paper-warm)',
    border: '3px solid var(--ink)',
    borderRadius: 14,
    boxShadow: '5px 5px 0 var(--ink)',
    textAlign: 'left',
    pointerEvents: 'auto',
  },
  tailLeft: {
    position: 'absolute',
    bottom: -13,
    left: 26,
    width: 22,
    height: 22,
    background: 'var(--paper-warm)',
    borderRight: '3px solid var(--ink)',
    borderBottom: '3px solid var(--ink)',
    transform: 'rotate(45deg)',
  },
  tailRight: {
    position: 'absolute',
    bottom: -13,
    right: 26,
    width: 22,
    height: 22,
    background: 'var(--paper-warm)',
    borderRight: '3px solid var(--ink)',
    borderBottom: '3px solid var(--ink)',
    transform: 'rotate(45deg)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  namePlate: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'var(--paper-warm)',
    background: 'var(--ink)',
    padding: '3px 8px',
    borderRadius: 6,
  },
  role: { fontSize: 10, fontWeight: 700, color: '#6b6250', textTransform: 'uppercase', letterSpacing: 0.6 },
  note: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: 800,
    color: 'var(--ink)',
    background: 'var(--nektar)',
    border: '2px solid var(--ink)',
    borderRadius: 6,
    padding: '2px 6px',
    transform: 'rotate(2deg)',
    whiteSpace: 'nowrap',
  },
  body: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    textAlign: 'left',
    cursor: 'pointer',
    color: 'var(--ink)',
  },
  title: { display: 'block', fontSize: 15, fontWeight: 800, marginBottom: 5, letterSpacing: 0.2 },
  text: { display: 'block', fontSize: 13, lineHeight: 1.42, fontWeight: 600, color: '#3a3a33', whiteSpace: 'pre-line' },
  footer: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  btn: {
    padding: '8px 12px',
    minHeight: 40,
    background: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: 9,
    color: 'var(--ink)',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '2px 2px 0 var(--ink)',
    lineHeight: 1,
  },
  btnPrimary: { background: 'var(--leaf)', color: '#fff' },
};
