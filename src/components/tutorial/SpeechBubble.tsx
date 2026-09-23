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
//
// B42 (Defekt, 19.09.2026): Der Text bleibt im cueMode sichtbar, bis der Spieler ihn explizit
// über „Gelesen“ einklappt. Die Handlung läuft dadurch nicht ins Unlesbare, und der sichere
// Cue-/Layout-Vertrag verhindert gleichzeitig eine Kartenüberdeckung.

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface SpeechBubbleProps {
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
  readLabel: string;
  showLabel: string;
  /** F2: Schritt verlangt eine Handlung am Cue-Ziel ⇒ der Text bleibt sichtbar, aber der
   *  Textkörper ist pointer-durchlässig, damit das echte Ziel klickbar bleibt. */
  cueMode: boolean;
  /** Schwanzrichtung: zeigt zur Figur. */
  tail: 'downLeft' | 'downRight';
  onPress: () => void;
  onSkip: () => void;
}

/**
 * F5-Vertrag (Zonen-Lock): true ⇒ dieser Schritt rendert die DURCHLÄSSIGE Blase
 * (`frameCue`, pointer-events:none); nur die echten Blasen-Knöpfe bleiben interaktiv.
 * Der Gate-Test liest genau diese Entscheidung — die nächste Blasen-Position kann die
 * Cue-Zone nicht wieder verdecken, ohne dass dieser Vertrag rot.
 */
export function bubbleIsPointerTransparent(cueMode: boolean): boolean {
  return cueMode;
}/** F5: der gerenderte Rahmen-Stil — auto (normal) oder durchlässig (cueMode). Messbar gelockt. */
export function bubbleFrameStyle(cueMode: boolean): CSSProperties {
  // `frameCue` ist nur eine Overlay-Eigenschaft. Den Papierrahmen wieder wegzugeben war der
  // direkte Grund für den Screenshot-Befund: Text lag ohne Hintergrund über den Hub-Karten.
  return cueMode ? { ...styles.frame, ...styles.frameCue } : styles.frame;
}

/**
 * B42: Ist der Text SICHTBAR? Vertrag in einer Zeile: nur ein ausdrücklicher Klick des Spielers
 * klappt ihn weg — der cueMode tut es nie (vorher war es umgekehrt und damit unlesbar).
 * Der Gate-Test liest genau diese Entscheidung.
 */
export function bubbleTextVisible(cueMode: boolean, dismissed: boolean): boolean {
  return !(cueMode && dismissed);
}

/**
 * Der Textkörper liegt im cueMode DURCHLÄSSIG (das geführte Ziel bleibt klickbar) und sonst
 * interaktiv (dort ist die Blase selbst der Knopf). Kein Auto-Kollaps, kein toter Aufklapp-Pfad.
 */
function bubbleBodyEvents(cueMode: boolean): CSSProperties {
  return cueMode ? { pointerEvents: 'none', cursor: 'default' } : { cursor: 'pointer' };
}

export function SpeechBubble({
  speaker, role, note, title, text, typing, pressLabel, skipLabel, hint, cueHint, readLabel, showLabel,
  cueMode, tail, onPress, onSkip,
}: SpeechBubbleProps): ReactNode {
  // B42: Der Schritt startet IMMER mit sichtbarem Text. `dismissed` entsteht ausschließlich durch
  // einen Klick auf „Gelesen" (cueMode) — nie automatisch. Der nächste Schritt remountet die
  // Blase (`key={view.index}` im Layer), damit jeder Schritt wieder vollständig dasteht.
  const [dismissed, setDismissed] = useState(false);
  const showText = bubbleTextVisible(cueMode, dismissed);
  return (
    // F5 (F2-Regression, 4/4): Im cueMode ist der Rahmen pointer-durchlässig; nur die beiden
    // echten Blasen-Knöpfe bleiben interaktiv. Das Layout Avoid-Set verhindert zusätzlich jede
    // Verdeckung der als `data-tut-avoid` markierten Karten.
    <div className="tut-bubble" style={bubbleFrameStyle(cueMode)}>
      <span style={tail === 'downLeft' ? styles.tailLeft : styles.tailRight} aria-hidden />
      <div style={styles.header}>
        <span style={styles.namePlate}>{speaker}</span>
        <span style={styles.role}>{role}</span>
        <span style={styles.note}>{note}</span>
      </div>
      {cueMode ? (
        // Handlungsschritt: Text steht (durchlässig, das Ziel bleibt klickbar) — nur der
        // ausdrückliche Klick auf „✕" klappt ihn weg.
        <div style={{ ...styles.body, ...bubbleBodyEvents(cueMode) }} title={hint}>
          <span style={styles.title}>{title}</span>
          {showText && (
            <span style={styles.text}>
              {text}
              {typing && <span className="tut-caret" aria-hidden>▌</span>}
            </span>
          )}
        </div>
      ) : (
        // Leseschritt: die Blase ist der Knopf (Weiter). Text voll lesbar, Klick = weiter.
        <button type="button" onClick={onPress} title={hint} style={styles.body}>
          <span style={styles.title}>{title}</span>
          <span style={styles.text}>
            {text}
            {typing && <span className="tut-caret" aria-hidden>▌</span>}
          </span>
        </button>
      )}
      {cueMode && (
        // F1: der Vorwärts-Hinweis — Pfeil + Cue-Wort, sichtbar statt versteckt im Titel.
        <span style={styles.cueHint} className="tut-cue-hint" aria-live="polite">→ {cueHint}</span>
      )}
      <div style={styles.footer}>
        {cueMode && (
          // B42: der Wegklick-Knopf. Er klappt den Text NUR weg (der Schritt läuft weiter) und
          // holt ihn zurück — pointer-events explizit auto, weil die Blase durchlässig ist.
          <button
            type="button"
            onClick={() => setDismissed(v => !v)}
            style={{ ...styles.btn, ...styles.btnGhostOverride }}
            aria-expanded={showText}
            title={hint}
          >
            {showText ? `✕ ${readLabel}` : `▸ ${showLabel}`}
          </button>
        )}
        {pressLabel && (
          // Der Weiter-Knopf existiert NUR bei `advanceOn: 'press'` — genau dort ist cueMode
          // false (cueMode = advanceOn !== 'press' && cue !== 'none'), der Rahmen nimmt Zeiger
          // an. Es gab hier nie eine Sackgasse: kein Fix, kein Sonderfall.
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
    minHeight: 128,
    maxHeight: 'calc(100dvh - 16px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
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
    gap: 5,
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  namePlate: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'var(--paper-warm)',
    background: 'var(--ink)',
    padding: '3px 8px',
    borderRadius: 6,
  },
  role: { fontSize: 9, fontWeight: 700, color: '#6b6250', textTransform: 'uppercase', letterSpacing: 0.4 },
  note: {
    marginLeft: 'auto',
    fontSize: 9,
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
  // F5: cueMode-Rahmen — die GESAMTE Blase durchlässig (Backdrop passthrough), nicht nur der Text.
  frameCue: { pointerEvents: 'none' } as CSSProperties,
  // F5: Ausnahme vom Backdrop-Passthrough — der Skip-Knopf bleibt im cueMode klickbar.
  btnGhostOverride: { pointerEvents: 'auto' } as CSSProperties,
  // F1: der sichtbare Vorwärts-Hinweis im cueMode.
  cueHint: {
    display: 'inline-block',
    marginTop: 5,
    padding: '3px 8px',
    fontSize: 11,
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
  text: { display: 'block', fontSize: 12, lineHeight: 1.3, fontWeight: 600, color: '#3a3a33', whiteSpace: 'pre-line' },
  footer: { display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' },
  btn: {
    padding: '6px 10px',
    minHeight: 36,
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
