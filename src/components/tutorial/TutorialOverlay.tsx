// Owner: UI (Tutorial-Overlay). LOC ≤ 400.
// Verbindet Schrittmodell (script.ts), Zustandsmaschine (controller.ts) und Figuren-Präsentation.
// Der Rahmen ist `pointer-events: none` — der Spieler drückt die ECHTEN Knöpfe; nur Blase und
// Knöpfe nehmen Zeiger an. Der blinkende Cue-Ring zeigt auf genau ein `data-tut`-Element, der Arm
// der Figur zeigt dorthin (Winkel aus der gemessenen Zielmitte).
//
// Zwei Wirkungen nach außen: `onHold` (Präsentations-Gate im RAF — die Sim steht während der
// Leseschritte) und `onDone` (Onboarding abgeschlossen/übersprungen ⇒ der Aufrufer persistiert
// `tutorialDone`). Kein Sim-Schreibzugriff, kein zweiter Speicher.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { tutorialText, type TutorialTextKey } from '../../i18n/tutorial';
import { TutorialController, type TutorialSnapshot } from './controller';
import { cueSelector, type BubbleAnchor, type StickAnchor, type TutorialCue, type TutorialStepId } from './script';
import { Stickman } from './Stickman';
import { SpeechBubble } from './SpeechBubble';
import { prefersReducedMotion, useTypewriter } from './useTypewriter';

export interface TutorialSignals {
  /** Ausgewählte Tray-Karte (UI-Wahrheit aus dem PlacementController). */
  selectedVariant: string | null;
  /** Anzahl angenommener Platzierungen (UI-Zähler — greift auch bei stehender Sim). */
  placements: number;
  /** RunPhase (`prep` | `wave` | `gameover`). */
  phase: string;
  paused: boolean;
}

export interface TutorialOverlayProps {
  /** Onboarding darf laufen (Sichtbarkeit nach DevGate + `tutorialDone`). */
  enabled: boolean;
  signals: TutorialSignals;
  onHold: (hold: boolean) => void;
  onDone: () => void;
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

export function TutorialOverlay({ enabled, signals, onHold, onDone }: TutorialOverlayProps) {
  const { lang } = useI18n();
  const [controller] = useState(() => new TutorialController());
  const [view, setView] = useState(() => controller.view);
  const [cue, setCue] = useState<CueRect | null>(null);
  const [aim, setAim] = useState<number | null>(null);
  const [box, setBox] = useState<ScreenBox>({ x: 0, y: 0, w: 0, h: 0 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);

  const { selectedVariant, placements, phase, paused } = signals;
  const snapshot: TutorialSnapshot = useMemo(
    () => ({ selectedVariant, placements, phase, paused }),
    [selectedVariant, placements, phase, paused],
  );

  // Signal-Eingang: erfüllte Bedingungen schalten Schritte weiter (UI-Zustand, kein Sim-Zugriff).
  useEffect(() => { setView(controller.update(snapshot)); }, [controller, snapshot]);

  const step = view.step;
  const stepId: TutorialStepId | null = step ? step.id : null;
  const cueKind: TutorialCue = step ? step.cue : 'none';
  const stepText = stepId ? tutorialText(`tut.${stepId}.text` as TutorialTextKey, lang) : '';
  const typing = useTypewriter(stepText, prefersReducedMotion());

  // ── Cue-Ring messen (Layout kann sich ändern: HUD-Chips wachsen, Tray scrollt) ──
  useEffect(() => {
    if (!enabled || !stepId || cueKind === 'none') { setCue(null); return; }
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
  }, [enabled, stepId, cueKind, lang, view.index]);

  // ── Hold: Leseschritte halten die Sim an (Präsentations-Gate, kein Sim-Schreibzugriff) ──
  // `enabled` gehört zwingend dazu: ein abgeschaltetes Onboarding darf die Sim NIE anhalten
  // (sonst steht die Welt im DevGate still, weil die Schrittmaschine bei „ankunft" startet).
  const hold = enabled && view.active && step !== null && step.hold;
  useEffect(() => {
    onHold(hold);
    return () => onHold(false);
  }, [hold, onHold]);

  // ── Abschluss: fertig, übersprungen oder der Run ist vorbei ⇒ genau einmal melden ──
  useEffect(() => {
    if (!enabled || doneRef.current) return;
    if (view.finished || phase === 'gameover') { doneRef.current = true; onDone(); }
  }, [enabled, view.finished, phase, onDone]);

  const press = useCallback(() => {
    if (!view.step) return;
    if (!typing.complete) { typing.finish(); return; }   // erster Tipp: ganzer Text
    if (view.step.advanceOn === 'press') setView(controller.press(snapshot));
  }, [controller, snapshot, typing, view.step]);
  const skip = useCallback(() => setView(controller.skip()), [controller]);

  if (!enabled || !view.active || !step) return null;

  const note = tutorialText('tut.note', lang)
    .replace('{n}', String(view.index + 1))
    .replace('{m}', String(view.total));
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

      <div ref={stickRef} style={step.stick === 'bottomRight' ? styles.stickRight : styles.stickLeft}>
        <Stickman pose={step.pose} aim={aim} speaking={!typing.complete} />
      </div>

      <div style={bubbleStyle(step.bubble)}>
        <SpeechBubble
          speaker={tutorialText('tut.name', lang)}
          role={tutorialText('tut.role', lang)}
          note={note}
          title={tutorialText(`tut.${step.id}.title` as TutorialTextKey, lang)}
          text={typing.shown}
          typing={!typing.complete}
          pressLabel={step.advanceOn === 'press'
            ? tutorialText(step.id === 'abschluss' ? 'tut.finish' : 'tut.next', lang)
            : null}
          skipLabel={tutorialText('tut.skip', lang)}
          hint={tutorialText('tut.more', lang)}
          tail={tail}
          onPress={press}
          onSkip={skip}
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

const styles: Record<string, CSSProperties> = {
  root: { position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' },
  stickLeft: { position: 'absolute', left: 2, bottom: STICK_BOTTOM, pointerEvents: 'none' },
  stickRight: { position: 'absolute', right: 2, bottom: STICK_BOTTOM, pointerEvents: 'none' },
};
