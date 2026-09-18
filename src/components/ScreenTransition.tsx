import { useEffect, useState } from 'react';

// Owner: UI (ScreenTransition — Papier-Übergang). LOC ≤ 200.
// Collage-Block-Metapher: Beim Screenwechsel wird das neue "Blatt" eingedreht
// (rotate + slide + fade). prefers-reduced-motion ⇒ harter Schnitt.
// Reine Präsentation — kein State-Writer, kein Gameplay-Bezug.

type Props = {
  screenKey: string;          // Wechselt der Key, läuft die Transition
  children: React.ReactNode;
};

export function ScreenTransition({ screenKey, children }: Props) {
  const [phase, setPhase] = useState<'enter' | 'idle'>('enter');
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setPhase('enter');
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')));
    return () => cancelAnimationFrame(raf);
  }, [screenKey]);

  const style: React.CSSProperties = reduce
    ? {}
    : {
        animation: 'screenIn 240ms cubic-bezier(0.2, 0.7, 0.3, 1)',
        transformOrigin: '8% 0%',
      };

  return (
    <div key={screenKey} style={style} aria-live="polite">
      {children}
    </div>
  );
}

// keyframes leben in index.css (screenIn) — eine Quelle für Bewegung.
