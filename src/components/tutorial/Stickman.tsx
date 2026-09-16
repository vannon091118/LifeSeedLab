// Owner: UI (Krix — animiertes Strichmännchen). LOC ≤ 400.
// B0.7/B0.9: Fineliner-Ink-Kontur auf Papier, kein Emoji, kein Stock-Icon. Krix wird per
// stroke-dashoffset „gezeichnet" (eingeblendet), atmet danach weiter (Idle-Bob), blinzelt und
// bewegt den Mund, während seine Sprechblase tippt. Alle Posen sind reine Geometrie — kein Zufall,
// keine Zeitlogik im Modul (die bringt index.css als CSS-Animation).

import type { StickmanPose } from './script';

export interface StickmanProps {
  pose: StickmanPose;
  /** Richtung des Zeigearms in Grad (0 = nach rechts, -90 = nach oben); null = keine Zielrichtung. */
  aim?: number | null;
  /** true ⇒ der Mund öffnet und schließt sich (Text wird gerade getippt). */
  speaking?: boolean;
  /** Breite in px; die Höhe folgt dem Seitenverhältnis (120 × 190). */
  size?: number;
}

interface PoseSpec {
  left: string;
  right: string;
  face: 'calm' | 'happy' | 'wide' | 'wink' | 'raised';
  clipboard: { x: number; y: number; rotate: number } | null;
  /** rechter Arm folgt dem Cue-Ziel (`aim`). */
  aimArm?: boolean;
  /** Arm-Wedeln (Ankunft/Panik). */
  wave?: boolean;
  mark?: 'sweat' | 'spark';
}

const POSES: Record<StickmanPose, PoseSpec> = {
  arrive:  { left: 'M58 66 L34 92', right: 'M58 66 L86 42 L96 30', face: 'happy', clipboard: { x: 30, y: 96, rotate: -6 }, wave: true },
  point:   { left: 'M58 66 L34 92', right: 'M58 66 L100 66', face: 'calm', clipboard: { x: 30, y: 96, rotate: -6 }, aimArm: true },
  cheer:   { left: 'M58 66 L36 34', right: 'M58 66 L80 34', face: 'happy', clipboard: null, mark: 'spark' },
  think:   { left: 'M58 66 L34 92', right: 'M58 66 L76 54 L68 46', face: 'raised', clipboard: { x: 28, y: 98, rotate: -10 } },
  thumbsUp:{ left: 'M58 66 L34 92', right: 'M58 66 L88 38', face: 'wink', clipboard: { x: 30, y: 96, rotate: -6 }, mark: 'spark' },
  panic:   { left: 'M58 66 L26 30', right: 'M58 66 L90 30', face: 'wide', clipboard: null, wave: true, mark: 'sweat' },
};

/** Mund-Geometrie je Gesicht — beim Sprechen skaliert sie vertikal (CSS). */
const MOUTH: Record<PoseSpec['face'], string> = {
  calm: 'M49 43 Q58 50 67 43',
  happy: 'M47 42 Q58 54 69 42',
  wide: 'M50 42 Q58 54 66 42',
  wink: 'M48 43 Q58 51 68 43',
  raised: 'M50 44 Q58 47 66 43',
};

const INK = 'var(--ink)';

export function Stickman({ pose, aim, speaking, size = 132 }: StickmanProps) {
  const spec = POSES[pose];
  const face = spec.face;
  const eyeStyle = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

  return (
    <svg
      className="tut-stick"
      width={size}
      height={(size * 190) / 120}
      viewBox="0 0 120 190"
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      <g className="tut-bob">
        {/* Kopf */}
        <circle className="tut-ink tut-fill" pathLength={1} cx="58" cy="34" r="21" fill="var(--paper-warm)" stroke={INK} strokeWidth="3.4" style={{ animationDelay: '40ms' }} />
        {/* Gesicht */}
        <g className="tut-face" style={{ animationDelay: '320ms' }}>
          {face === 'happy' ? (
            <>
              <path className="tut-ink" pathLength={1} d="M44 35 q5 -8 11 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" style={{ animationDelay: '200ms' }} />
              <path className="tut-ink" pathLength={1} d="M61 35 q5 -8 11 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" style={{ animationDelay: '240ms' }} />
            </>
          ) : (
            <g className="tut-eyes" style={eyeStyle}>
              <circle cx="50" cy="33" r={face === 'wide' ? 4.6 : 3.1} fill={INK} />
              {face === 'wink'
                ? <path d="M61 33 q4 -4 9 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
                : <circle cx="66" cy="33" r={face === 'wide' ? 4.6 : 3.1} fill={INK} />}
            </g>
          )}
          {/* Brauen */}
          <path d={face === 'raised' ? 'M43 25 L56 22' : 'M44 26 L55 24'} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d={face === 'wide' ? 'M61 20 L72 24' : 'M62 24 L72 26'} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <g className={speaking ? 'tut-mouth tut-talking' : 'tut-mouth'} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <path d={MOUTH[face]} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>

        {/* Rumpf + Beine — die Beine tragen `tut-leg` (Schritt beim Einlaufen, CSS). */}
        <path className="tut-ink" pathLength={1} d="M58 55 L58 112" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" style={{ animationDelay: '120ms' }} />
        <path className="tut-ink tut-leg tut-legL" pathLength={1} d="M58 112 L45 150 L41 178" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: '160ms' }} />
        <path className="tut-ink tut-leg tut-legR" pathLength={1} d="M58 112 L72 150 L79 178" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: '180ms' }} />
        <path className="tut-ink" pathLength={1} d="M34 179 L46 179" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" style={{ animationDelay: '220ms' }} />
        <path className="tut-ink" pathLength={1} d="M73 179 L85 179" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" style={{ animationDelay: '240ms' }} />

        {/* Arme — der rechte folgt dem Cue-Ziel (point), sonst Pose-Geometrie */}
        <path className="tut-ink" pathLength={1} d={spec.left} fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" style={{ animationDelay: '200ms' }} />
        <g
          className={spec.wave ? 'tut-arm tut-wave' : 'tut-arm'}
          style={spec.aimArm
            ? { transformBox: 'view-box', transformOrigin: '58px 66px', transform: `rotate(${clampAim(aim)}deg)` }
            : { transformBox: 'fill-box', transformOrigin: '40% 20%' }}
        >
          <path className="tut-ink" pathLength={1} d={spec.right} fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" style={{ animationDelay: '220ms' }} />
          <circle className="tut-fill" cx={handOf(spec.right).x} cy={handOf(spec.right).y} r="4.4" fill="var(--paper-warm)" stroke={INK} strokeWidth="3" style={{ animationDelay: '300ms' }} />
        </g>

        {/* Klemmbrett (Krix' Markenzeichen — er hat es selbst gemalt) */}
        {spec.clipboard && (
          <g className="tut-fill" style={{ animationDelay: '380ms' }} transform={`translate(${spec.clipboard.x} ${spec.clipboard.y}) rotate(${spec.clipboard.rotate})`}>
            <rect x="0" y="0" width="30" height="38" rx="3" fill="var(--paper-warm)" stroke={INK} strokeWidth="3" />
            <path d="M11 -3 h8 v7 h-8 z" fill="var(--nektar)" stroke={INK} strokeWidth="2.6" />
            <path d="M6 12 h18 M6 20 h18 M6 28 h12" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )}

        {/* Comic-Marken */}
        {spec.mark === 'spark' && (
          <g className="tut-mark" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M97 18 l7 -7 M100 26 l9 -2" />
            <path d="M22 22 l-7 -7 M18 30 l-9 -2" />
          </g>
        )}
        {spec.mark === 'sweat' && (
          <g className="tut-mark">
            <path d="M86 14 q6 8 0 12 q-6 -4 0 -12" fill="var(--paper-dim)" stroke={INK} strokeWidth="2.4" />
          </g>
        )}
      </g>
    </svg>
  );
}

/** Handposition aus dem Arm-Pfad (letzter Punkt) — eine Quelle, kein zweites Zahlenpaar. */
function handOf(path: string): { x: number; y: number } {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) ?? ['0', '0']).map(Number);
  return { x: numbers[numbers.length - 2] ?? 0, y: numbers[numbers.length - 1] ?? 0 };
}

/** Zeigearm bleibt im plausiblen Winkel — nach hinten kann ein Strichmännchen nicht zeigen. */
function clampAim(aim: number | null | undefined): number {
  if (aim == null || !Number.isFinite(aim)) return -12;
  return Math.max(-78, Math.min(58, aim));
}
