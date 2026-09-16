// Owner: UI (Tutorial-Overlay). LOC ≤ 400.
// Präsentation eines Schritts: Figur, Sprechblase, blinkender Cue-Ring. Der Schritt kommt von
// außen (TutorialLayer/Controller) — hier wird NICHTS entschieden und nichts fortgeschrieben.
// Der Rahmen ist `pointer-events: none`: der Spieler drückt die ECHTEN Knöpfe; nur Blase und
// Knöpfe nehmen Zeiger an. Der Cue-Ring zeigt auf genau ein `data-tut`-Element, der Arm der Figur
// zeigt dorthin (Winkel aus der gemessenen Zielmitte).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { tutorialText, type TutorialTextKey } from '../../i18n/tutorial';
import { cueSelector, type BubbleAnchor, type TutorialCue, type TutorialStep } from './script';
import { Stickman } from './Stickman';
import { SpeechBubble } from './SpeechBubble';
import { prefersReducedMotion, useTypewriter } from './useTypewriter';

export interface TutorialOverlayProps {
  step: TutorialStep;
  index: number;
  total: number;
  onPress: () => void;
  onSkip: () => void;
}

interface CueRect { x: number; y: number; w: number; h: number }

const RING_PAD = 7;
const STICK_BOTTOM = 142;
/** Über dem Tray (Tray-Kante ≈ 146 px über der Bühnenunterkante, s. gameViewStyles). */
const BUBBLE_BOTTOM = 168;

interface ScreenBox { x: number; y: number; w: number; h: number }

function sameBox(a: CueRect | null, b: CueRect): boolean {
  return a !== null && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Winkel von der Schulter zum Ziel (Grad, 0 = nach rechts, negativ = nach oben). */
function aimDegrees(from: ScreenBox, to: CueRect): number {
  const shoulderX = from.x + from.w * (58 / 120);
  const shoulderY = from.y + from.h * (66 / 190);
  const dx = to.x + to.w / 2 - shoulderX;
  const dy = to.y + to.h / 2 - shoulderY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function TutorialOverlay({ step, index, total, onPress, onSkip }: TutorialOverlayProps) {
  const { lang } = useI18n();
  const [cue, setCue] = useState<CueRect | null>(null);
  const [aim, setAim] = useState<number | null>(null);
  const [box, setBox] = useState<ScreenBox>({ x: 0, y: 0, w: 0, h: 0 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);

  const stepId = step.id;
  const cueKind: TutorialCue = step.cue;
  const stepText = useMemo(
    () => tutorialText(`tut.${stepId}.text` as TutorialTextKey, lang),
    [stepId, lang],
  );
  const typing = useTypewriter(stepText, prefersReducedMotion());

  // Ziel einmal ins Bild holen (der Hub scrollt; ein Cue unterhalb der Falz wäre unsichtbar).
  useEffect(() => {
    if (cueKind === 'none') return;
    const selector = cueSelector(cueKind);
    const target = selector ? document.querySelector(selector) : null;
    if (!target || typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [stepId, cueKind]);

  // ── Cue-Ring messen (Layout kann sich ändern: HUD-Chips wachsen, Tray scrollt, Fenster wechselt) ──
  useEffect(() => {
    if (cueKind === 'none') { setCue(null); return; }
    const selector = cueSelector(cueKind);
    if (!selector) { setCue(null); return; }
    const measure = () => {
      const root = rootRef.current;
      const target = document.querySelector(selector);
      if (!root || !target) { setCue(null); return; }
      const r = root.getBoundingClientRect();
      const a = target.getBoundingClientRect();
      const next: CueRect = { x: a.left - r.left, y: a.top - r.top, w: a.width, h: a.height };
      setCue(prev => (sameBox(prev, next) ? prev : next));
      const roundW = Math.round(r.width);
      const roundH = Math.round(r.height);
      setBox(prev => (prev.w === roundW && prev.h === roundH ? prev : { x: 0, y: 0, w: roundW, h: roundH }));
      const stick = stickRef.current;
      if (stick) {
        const s = stick.getBoundingClientRect();
        setAim(aimDegrees(
          { x: s.left - r.left, y: s.top - r.top, w: s.width, h: s.height },
          next,
        ));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = window.setInterval(measure, 350);
    return () => { window.removeEventListener('resize', measure); window.clearInterval(timer); };
  }, [stepId, cueKind, lang, index]);

  const complete = typing.complete;
  const press = () => {
    if (!complete) { typing.finish(); return; }   // erster Tipp: ganzer Text
    if (step.advanceOn === 'press') onPress();
  };

  const note = tutorialText('tut.note', lang)
    .replace('{n}', String(index + 1))
    .replace('{m}', String(total));
  const tail = step.stick === 'bottomRight' ? 'downRight' : 'downLeft';

  return (
    <div ref={rootRef} style={styles.root} data-tut-overlay={step.id}>
      {/* Blinkende Handlungsanweisung: das Ziel-Element selbst blinkt nicht — der Ring liegt darüber. */}
      {cue && cue.w > 0 && cue.h > 0 && (
        <div className="tut-ring" style={{ left: cue.x - RING_PAD, top: cue.y - RING_PAD, width: cue.w + RING_PAD * 2, height: cue.h + RING_PAD * 2 }}>
          <svg width={cue.w + RING_PAD * 2} height={cue.h + RING_PAD * 2} aria-hidden>
            <rect className="tut-ants" x="2" y="2" width={cue.w + RING_PAD * 2 - 4} height={cue.h + RING_PAD * 2 - 4} rx="14" fill="none" stroke="var(--danger)" strokeWidth="3" />
            <CornerMarks w={cue.w + RING_PAD * 2} h={cue.h + RING_PAD * 2} />
          </svg>
          <span className="tut-cue-chip" style={chipStyle(cue, box)}>{tutorialText('tut.cue', lang)}</span>
        </div>
      )}

      <div
        ref={stickRef}
        className={step.stick === 'bottomRight' ? 'tut-walk-right' : 'tut-walk-left'}
        style={step.stick === 'bottomRight' ? styles.stickRight : styles.stickLeft}
      >
        <Stickman pose={step.pose} aim={aim} speaking={!complete} />
      </div>

      {/* Die Blase ploppt BEI KRICKEZ auf (gleiche Seite wie die Figur) — nicht mittig schwebend:
          er ist am Rand, sie hängt über ihm, der Schwanz zeigt auf ihn. Auf dem Feld bleibt 'center'
          für die Leseschritte, damit Blase und Cue-Ring sich nicht in die Quere kommen. */}
      <div style={step.bubble === 'center' ? bubbleStyle('center') : bubbleBesideStick(step.stick)}>
        <SpeechBubble
          speaker={tutorialText('tut.name', lang)}
          role={tutorialText('tut.role', lang)}
          note={note}
          title={tutorialText(`tut.${stepId}.title` as TutorialTextKey, lang)}
          text={typing.shown}
          typing={!complete}
          pressLabel={step.advanceOn === 'press'
            ? tutorialText(stepId === 'abschluss' ? 'tut.finish' : 'tut.next', lang)
            : null}
          skipLabel={tutorialText('tut.skip', lang)}
          hint={tutorialText('tut.more', lang)}
          tail={tail}
          onPress={press}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
}

/** Ecken-Marker des Rings (Papier-/Nektar-Akzent, blinkt gegen den Rahmen). */
function CornerMarks({ w, h }: { w: number; h: number }) {
  const L = 16;
  const d = [
    `M2 ${L} L2 6 L${L} 6`,
    `M${w - L} 6 L${w - 2} 6 L${w - 2} ${L}`,
    `M${w - 2} ${h - L} L${w - 2} ${h - 2} L${w - L} ${h - 2}`,
    `M${L} ${h - 2} L2 ${h - 2} L2 ${h - L}`,
  ];
  return (
    <g className="tut-corners" fill="none" stroke="var(--nektar)" strokeWidth="4" strokeLinecap="round">
      {d.map((path, i) => <path key={i} d={path} />)}
    </g>
  );
}

/** Label am Ring: über dem Ziel, wenn dort Platz ist, sonst darunter. */
function chipStyle(cue: CueRect, box: ScreenBox): CSSProperties {
  const above = cue.y > 120;
  const left = Math.max(6, Math.min(Math.max(box.w - 150, 6), cue.x + cue.w / 2 - 66));
  return { left, top: above ? cue.y - RING_PAD - 30 : cue.y + cue.h + RING_PAD + 6 };
}

function bubbleStyle(anchor: BubbleAnchor): CSSProperties {
  switch (anchor) {
    case 'top': return { position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom': return { position: 'absolute', bottom: BUBBLE_BOTTOM, left: 10, maxWidth: '72%' };
    default: return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

/**
 * Blase über der Figur am Blattrand (Schwanzrichtung zeigt ohnehin auf sie). 'bottom' behält
 * seinen Platz (Tray-Höhe), 'top' rückt von der Mitte zur Figur-Seite.
 */
function bubbleBesideStick(stick: TutorialStep['stick']): CSSProperties {
  const base: CSSProperties = { position: 'absolute', bottom: BUBBLE_BOTTOM, maxWidth: '72%' };
  return stick === 'bottomRight' ? { ...base, right: 12 } : { ...base, left: 12 };
}

const styles: Record<string, CSSProperties> = {
  root: { position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' },
  stickLeft: { position: 'absolute', left: 2, bottom: STICK_BOTTOM, pointerEvents: 'none' },
  stickRight: { position: 'absolute', right: 2, bottom: STICK_BOTTOM, pointerEvents: 'none' },
};
