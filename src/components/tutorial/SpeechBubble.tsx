// Owner: UI (Krix — Comic-Sprechblase). LOC ≤ 400.
// B0.7: Notizzettel-Sprache — Papierverschluss, Ink-Kontur, harter Offset-Schatten, keine
// Blur-Glass-Fläche. Schwanz zeigt zur Figur, die Blase ploppt auf (index.css) und der Text
// tippt sich. Zwei Knöpfe in der Blase: der Handlungsknopf (nur bei Leseschritten) und
// „Überspringen" — immer erreichbar, damit niemand im Onboarding festsitzt.
//
// F2 (Spielfluss-Audit): Im cueMode (Schritt verlangt eine Handlung am Cue-Ziel) ist der
// Textkörper POINTER-TRANSPARENT — Klicks/Touches fallen zum echten Ziel durch. Die Blase
// kann das geführte Ziel nie wieder verdecken (Positionsabhängigkeit 1/3 strukturell aus).
// F1: Im cueMode zeigt ein Pfeil-Hinweis aufs Cue-Ziel („→ HIER DRÜCKEN") statt des
// Expandier-Hinweises — der Erstspieler erkennt die passende Aktion.

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
  /** F1: Hinweis-Text, der aufs Cue-Ziel verweist (nur cueMode). */
  cueHint: string;
  /** F2: Schritt verlangt eine Handlung am Cue-Ziel ⇒ Textkörper pointer-durchlässig,
   *  Text eingeklappt (Auto-Kollaps), damit die Blase das Ziel nicht verdeckt. */
  cueMode: boolean;
  /** Schwanzrichtung: zeigt zur Figur. */
  tail: 'downLeft' | 'downRight';
  onPress: () => void;
  onSkip: () => void;
}

/**
 * F5-Vertrag (Zonen-Lock): true ⇒ dieser Schritt rendert die DURCHLÄSSIGE Blase
 * (`frameCue`, pointer-events:none) mit dem Skip als einzigem interaktiven Kind.
 * Der Gate-Test liest genau diese Entscheidung — die nächste Blasen-Position kann die
 * Cue-Zone nicht wieder verdecken, ohne dass dieser Vertrag rot.
 */
export function bubbleIsPointerTransparent(cueMode: boolean): boolean {
  return cueMode;
}

/** F5: der gerenderte Rahmen-Stil — auto (normal) oder durchlässig (cueMode). Messbar gelockt. */
export function bubbleFrameStyle(cueMode: boolean): CSSProperties {
  return cueMode ? styles.frameCue : styles.frame;
}

export function SpeechBubble({
  speaker, role, note, title, text, typing, pressLabel, skipLabel, hint, cueHint, cueMode, tail, onPress, onSkip,
}: SpeechBubbleProps): ReactNode {
  // F2 Auto-Kollaps: im cueMode steht nur der Titel (1 Zeile), der volle Text klappt
  // per Knopf auf — die Blase bleibt klein und das Cue-Ziel frei.
  const collapsed = cueMode;
  return (
    // F5 (F2-Regression, 4/4): Im cueMode ist die GESAMTE Blase pointer-durchlässig — der Rahmen
    // selbst hat `auto` (340×200-Verdeckungszone) und fing jeden Klick aufs geführte Ziel (nur der
    // Textkörper war durchlässig). Interaktiv bleiben NUR die echten Knöpfe (Skip) — Backdrop passthrough,
    // Bedienelemente behalten ihre Funktion.
    <div className="tut-bubble" style={bubbleFrameStyle(cueMode)}>
      <span style={tail === 'downLeft' ? styles.tailLeft : styles.tailRight} aria-hidden />
      <div style={styles.header}>
        <span style={styles.namePlate}>{speaker}</span>
        <span style={styles.role}>{role}</span>
        <span style={styles.note}>{note}</span>
      </div>
      {collapsed ? (
        // F2: pointer-events none — Klicks/Touches erreichen das echte Cue-Ziel.
        <div style={{ ...styles.body, ...styles.bodyGhost }}>
          <span style={styles.title}>{title}</span>
          {typing && <span style={styles.text}>{text}<span className="tut-caret" aria-hidden>▌</span></span>}
        </div>
      ) : (
        <button type="button" onClick={onPress} title={hint} style={styles.body}>
          <span style={styles.title}>{title}</span>
          <span style={styles.text}>
            {text}
            {typing && <span className="tut-caret" aria-hidden>▌</span>}
          </span>
        </button>
      )}
      {collapsed && (
        // F1: der Vorwärts-Hinweis — Pfeil + Cue-Wort, sichtbar statt versteckt im Titel.
        <span style={styles.cueHint} className="tut-cue-hint" aria-live="polite">→ {cueHint}</span>
      )}
      <div style={styles.footer}>
        {pressLabel && (
          <button type="button" onClick={onPress} style={{ ...styles.btn, ...styles.btnPrimary }} className="tut-cta">
            {pressLabel}
          </button>
        )}
        {/* F5: der Skip muss im cueMode klickbar bleiben — er ist der immer erreichbare Notausgang
            (Kommentar oben), deshalb bekommt er hier seinen PE explizit zurück. */}
        <button type="button" onClick={onSkip} style={cueMode ? { ...styles.btn, ...styles.btnGhostOverride } : styles.btn}>{skipLabel}</button>
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
  // F2: cueMode-Körper — Klicks/Touches fallen zum echten Ziel durch.
  bodyGhost: { pointerEvents: 'none', cursor: 'default' } as CSSProperties,
  // F5: cueMode-Rahmen — die GESAMTE Blase durchlässig (Backdrop passthrough), nicht nur der Text.
  frameCue: { pointerEvents: 'none' } as CSSProperties,
  // F5: Ausnahme vom Backdrop-Passthrough — der Skip-Knopf bleibt im cueMode klickbar.
  btnGhostOverride: { pointerEvents: 'auto' } as CSSProperties,
  // F1: der sichtbare Vorwärts-Hinweis im cueMode.
  cueHint: {
    display: 'inline-block',
    marginTop: 8,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    color: 'var(--paper-warm)',
    background: 'var(--danger)',
    border: '2px solid var(--ink)',
    borderRadius: 6,
    boxShadow: '2px 2px 0 var(--ink)',
    pointerEvents: 'none',
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
