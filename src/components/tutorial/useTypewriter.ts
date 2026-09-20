// Owner: UI (Tutorial-Präsentation). LOC ≤ 200.
// Schreibmaschinen-Reveal für Krix' Sprechblasen. Präsentation-only: keine Sim, kein Zufall.
// `instant` (prefers-reduced-motion) zeigt den Text sofort — niemand muss für eine Animation warten.

import { useCallback, useEffect, useRef, useState } from 'react';

interface TypewriterState {
  /** Der sichtbare Textausschnitt. */
  shown: string;
  /** true ⇒ der ganze Text steht (Tipp beendet oder übersprungen). */
  complete: boolean;
  /** Erster Tipp auf die Blase: Text sofort vollständig. */
  finish: () => void;
}

export function useTypewriter(text: string, instant: boolean, charMs = 13): TypewriterState {
  const [count, setCount] = useState(() => (instant ? text.length : 0));
  const timer = useRef(0);

  useEffect(() => {
    window.clearInterval(timer.current);
    if (instant || charMs <= 0) { setCount(text.length); return; }
    setCount(0);
    timer.current = window.setInterval(() => {
      setCount(c => {
        const next = c + 1;
        if (next >= text.length) window.clearInterval(timer.current);
        return next;
      });
    }, charMs);
    return () => window.clearInterval(timer.current);
  }, [text, instant, charMs]);

  const finish = useCallback(() => {
    window.clearInterval(timer.current);
    setCount(text.length);
  }, [text.length]);

  const shown = count >= text.length ? text : text.slice(0, Math.max(0, count));
  return { shown, complete: count >= text.length, finish };
}

/** prefers-reduced-motion: der Vertrag verlangt einen harten Schnitt statt einer Animation. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
