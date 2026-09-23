// Owner: UI (Tutorial-Overlay). LOC ≤ 400.
// Präsentiert genau einen Prompt oder genau eine Reaktion. Die eigentliche Event-Entscheidung
// liegt im Controller; hier werden nur Cue, Figur und Blase gezeichnet. Die Blase misst sich
// selbst und wählt über `bubbleLayout` eine freie Position neben `data-tut-avoid`-Karten.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { tutorialText, type TutorialTextKey } from '../../i18n/tutorial';
import { placeBubble, rectsOverlap, type TutorialRect } from './bubbleLayout';
import { cueSelector, type TutorialCue, type TutorialStep } from './script';
import { Stickman } from './Stickman';
import { SpeechBubble } from './SpeechBubble';
import { prefersReducedMotion, useTypewriter } from './useTypewriter';

interface TutorialOverlayProps {
  step: TutorialStep;
  index: number;
  total: number;
  onPress: () => void;
  onSkip: () => void;
}

type ScreenBox = TutorialRect;
type CueRect = TutorialRect;

const RING_PAD = 7;

function sameRect(a: ScreenBox | null, b: ScreenBox): boolean {
  return a !== null && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function sameRectList(a: readonly ScreenBox[], b: readonly ScreenBox[]): boolean {
  return a.length === b.length && a.every((rect, i) => sameRect(rect, b[i]));
}

function localRect(root: DOMRect, element: Element): ScreenBox {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left - root.left),
    y: Math.round(rect.top - root.top),
    w: Math.round(rect.width),
    h: Math.round(rect.height),
  };
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
  const [stage, setStage] = useState<ScreenBox | null>(null);
  const [bubbleSize, setBubbleSize] = useState<ScreenBox | null>(null);
  const [stickSize, setStickSize] = useState<ScreenBox | null>(null);
  const [avoid, setAvoid] = useState<ScreenBox[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const stepId = step.id;
  const cueKind: TutorialCue = step.cue;
  const stepText = useMemo(
    () => tutorialText(`tut.${stepId}.text` as TutorialTextKey, lang),
    [stepId, lang],
  );
  const cueMode = step.phase === 'prompt' && step.advanceOn !== 'press' && cueKind !== 'none';
  const typing = useTypewriter(cueMode ? '' : stepText, prefersReducedMotion());

  useEffect(() => {
    if (cueKind === 'none') return;
    const selector = cueSelector(cueKind);
    const target = selector ? document.querySelector(selector) : null;
    if (!target || typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [stepId, cueKind]);

  // Screen-Bühne und Overlay messen. Der Screen bleibt der geometrische Owner; der Hub scrollt
  // nur seinen Body, während das Overlay am stabilen Rahmen hängt.
  useEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      const nextBox = { x: 0, y: 0, w: Math.round(r.width), h: Math.round(r.height) };
      setBox(prev => sameRect(prev, nextBox) ? prev : nextBox);
      const el = document.querySelector('[data-tut-stage]');
      if (!el) { setStage(null); return; }
      const nextStage = localRect(r, el);
      setStage(prev => sameRect(prev, nextStage) ? prev : nextStage);
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = window.setInterval(measure, 350);
    return () => { window.removeEventListener('resize', measure); window.clearInterval(timer); };
  }, [stepId, index]);

  useEffect(() => {
    if (cueKind === 'none') { setCue(null); return; }
    const selector = cueSelector(cueKind);
    if (!selector) { setCue(null); return; }
    const measure = () => {
      const root = rootRef.current;
      const target = document.querySelector(selector);
      if (!root || !target) { setCue(null); return; }
      const r = root.getBoundingClientRect();
      const next = localRect(r, target);
      setCue(prev => sameRect(prev, next) ? prev : next);
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

  // Bubble-Größe und Kartenflächen messen. `data-tut-avoid` ist die einzige Layout-Ausschluss-
  // quelle: Hub- und Tray-Karten markieren sich selbst, Krix muss sie nicht kennen.
  useEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      const bubble = bubbleRef.current;
      const stick = stickRef.current;
      if (!root || !bubble) return;
      const size = { x: 0, y: 0, w: bubble.offsetWidth, h: bubble.offsetHeight };
      if (size.w > 0 && size.h > 0) setBubbleSize(prev => sameRect(prev, size) ? prev : size);
      if (stick) {
        const stickSizeNow = { x: 0, y: 0, w: stick.offsetWidth, h: stick.offsetHeight };
        if (stickSizeNow.w > 0 && stickSizeNow.h > 0) setStickSize(prev => sameRect(prev, stickSizeNow) ? prev : stickSizeNow);
      }
      const r = root.getBoundingClientRect();
      const nextAvoid = [...document.querySelectorAll('[data-tut-avoid]')]
        .map(element => localRect(r, element))
        .filter(rect => rect.w > 0 && rect.h > 0);
      setAvoid(prev => sameRectList(prev, nextAvoid) ? prev : nextAvoid);
    };
    measure();
    const timer = window.setInterval(measure, 180);
    return () => window.clearInterval(timer);
  }, [stepId, index, box.w, box.h, stage?.x, stage?.y, stage?.w, stage?.h]);

  const complete = typing.complete;
  const press = () => {
    if (!complete) { typing.finish(); return; }
    if (step.advanceOn === 'press') onPress();
  };

  const note = tutorialText('tut.note', lang)
    .replace('{n}', String(index + 1))
    .replace('{m}', String(total));
  const tail = step.stick === 'bottomRight' ? 'downRight' : 'downLeft';
  const anchor = stage ?? { x: 0, y: 0, w: box.w, h: box.h };
  const size = bubbleSize ?? { x: 0, y: 0, w: 340, h: 180 };
  const preferred = preferredBubbleRect(step, anchor, size);
  const avoidRects = cue ? [...avoid, cue] : avoid;
  const bounds = { x: 0, y: 0, w: box.w, h: box.h };
  const bubbleCandidate = bubbleSize && box.w > 0 ? placeBubble(size, bounds, anchor, preferred, avoidRects) : null;
  const placed = bubbleCandidate && !avoidRects.some(rect => rectsOverlap(bubbleCandidate, rect, 10))
    ? bubbleCandidate
    : null;
  const bubbleStyle: CSSProperties = placed
    ? { position: 'absolute', left: placed.x, top: placed.y }
    : { position: 'absolute', left: 0, top: 0, visibility: 'hidden' };
  const stickBox = stickSize ?? { x: 0, y: 0, w: 132, h: 209 };
  const stickPreferred = preferredStickRect(step, anchor, stickBox);
  const stickAvoid = placed ? [...avoidRects, placed] : avoidRects;
  const stickCandidate = stickSize && box.w > 0 ? placeBubble(stickBox, bounds, anchor, stickPreferred, stickAvoid) : null;
  // Wenn die Karten den ganzen Screen bis zur Blase füllen, gibt es ehrlich keinen sicheren
  // Platz für die Figur. Dann wird sie ausgeblendet — lieber kurz unsichtbar als wieder über
  // einer Karte. Die Blase selbst bleibt der sichtbare Krix-Kanal.
  const stickPlaced = stickCandidate && !stickAvoid.some(rect => rectsOverlap(stickCandidate, rect, 10))
    ? stickCandidate
    : null;
  const stickStyle: CSSProperties = stickPlaced
    ? { position: 'absolute', left: stickPlaced.x, top: stickPlaced.y, pointerEvents: 'none' }
    : stickAnchorStyle(step.stick, anchor, box, step.screen);

  return (
    <div ref={rootRef} style={styles.root} data-tut-overlay={step.id} data-tutorial-layout={placed ? 'safe' : 'measuring'}>
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
        style={stickStyle}
        data-tutorial-stick={stickPlaced ? 'safe' : 'measuring'}
      >
        {stickPlaced && <Stickman pose={step.pose} aim={aim} speaking={!complete} />}
      </div>

      <div ref={bubbleRef} style={bubbleStyle} data-tutorial-bubble-slot>
        <SpeechBubble
          speaker={tutorialText('tut.name', lang)}
          role={tutorialText('tut.role', lang)}
          note={note}
          title={tutorialText(`tut.${stepId}.title` as TutorialTextKey, lang)}
          text={cueMode ? stepText : typing.shown}
          typing={!cueMode && !complete}
          pressLabel={step.advanceOn === 'press'
            ? tutorialText(stepId === 'abschluss' ? 'tut.finish' : 'tut.next', lang)
            : null}
          skipLabel={tutorialText('tut.skip', lang)}
          hint={tutorialText('tut.more', lang)}
          cueHint={tutorialText('tut.cueHint', lang)}
          readLabel={tutorialText('tut.read', lang)}
          showLabel={tutorialText('tut.show', lang)}
          cueMode={cueMode}
          tail={tail}
          onPress={press}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
}

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

function chipStyle(cue: CueRect, box: ScreenBox): CSSProperties {
  const above = cue.y > 120;
  const left = Math.max(6, Math.min(Math.max(box.w - 150, 6), cue.x + cue.w / 2 - 66));
  return { left, top: above ? cue.y - RING_PAD - 30 : cue.y + cue.h + RING_PAD + 6 };
}

function preferredBubbleRect(step: TutorialStep, anchor: ScreenBox, size: ScreenBox): ScreenBox {
  const x = step.stick === 'bottomRight'
    ? anchor.x + anchor.w - size.w - 14
    : anchor.x + 14;
  if (step.bubble === 'center') {
    return { x: anchor.x + (anchor.w - size.w) / 2, y: anchor.y + (anchor.h - size.h) / 2, w: size.w, h: size.h };
  }
  return {
    x,
    y: step.bubble === 'top' ? anchor.y + 14 : Math.max(14, anchor.y + anchor.h - size.h - 14),
    w: size.w,
    h: size.h,
  };
}

function preferredStickRect(step: TutorialStep, anchor: ScreenBox, size: ScreenBox): ScreenBox {
  const x = step.stick === 'bottomRight' ? anchor.x + anchor.w - size.w - 2 : anchor.x + 2;
  return {
    x,
    y: Math.max(14, anchor.y + anchor.h - size.h - stickLift(step.screen)),
    w: size.w,
    h: size.h,
  };
}

function stickLift(screen: TutorialStep['screen']): number {
  return screen === 'run' ? 146 : 22;
}

function stageBottomOffset(anchor: ScreenBox, box: ScreenBox): number {
  return Math.max(0, box.h - (anchor.y + anchor.h));
}

function stageRightOffset(anchor: ScreenBox, box: ScreenBox): number {
  return Math.max(0, box.w - (anchor.x + anchor.w));
}

function stickAnchorStyle(stick: TutorialStep['stick'], anchor: ScreenBox, box: ScreenBox, screen: TutorialStep['screen']): CSSProperties {
  const bottom = stageBottomOffset(anchor, box) + stickLift(screen);
  return stick === 'bottomRight'
    ? { position: 'absolute', right: stageRightOffset(anchor, box) + 2, bottom, pointerEvents: 'none' }
    : { position: 'absolute', left: Math.max(2, anchor.x), bottom, pointerEvents: 'none' };
}

const styles: Record<string, CSSProperties> = {
  root: { position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' },
};
