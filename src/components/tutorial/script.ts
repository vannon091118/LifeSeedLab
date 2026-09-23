// Owner: UI (Tutorial-Schrittmodell). LOC ≤ 200.
// EIN Screen- und Ereignisvertrag für Krix: Ein Prompt erklärt genau eine Handlung. Danach
// wartet die Maschine auf ein echtes Ereignis; erst dann erscheint die kurze Reaktion. Ein
// wiederholter Zustand ist kein Ereignis — Krix bleibt dann still, statt erneut zu erklären.

export type StickmanPose = 'arrive' | 'point' | 'cheer' | 'think' | 'thumbsUp' | 'panic';
export type TutorialScreen = 'start' | 'menu' | 'run';
export type TutorialPhase = 'prompt' | 'reaction';
export type TutorialCue = 'none' | 'language' | 'begin' | 'endless' | 'card' | 'board' | 'build' | 'wave' | 'pause' | 'hud';
export type TutorialSignal =
  | 'press' | 'langChosen' | 'screenLeft' | 'cardSelected' | 'placed'
  | 'layoutDone' | 'waveStarted' | 'paused' | 'running';

type BubbleAnchor = 'top' | 'center' | 'bottom';
type StickAnchor = 'bottomLeft' | 'bottomRight';

export interface TutorialStep {
  id: TutorialStepId;
  screen: TutorialScreen;
  phase: TutorialPhase;
  pose: StickmanPose;
  cue: TutorialCue;
  /** Das konkrete Ereignis, das den Prompt in seine Reaktion überführt. */
  advanceOn: TutorialSignal;
  /** Wenn der Zustand beim Eintritt bereits wahr ist, wird die Reaktion direkt gezeigt. */
  skipIfCurrent?: boolean;
  hold: boolean;
  bubble: BubbleAnchor;
  stick: StickAnchor;
}

export type TutorialStepId =
  | 'ankunft' | 'sprache' | 'startknopf' | 'hub' | 'labor' | 'feld'
  | 'karte' | 'auswahl' | 'pflanzen' | 'platzierung' | 'bau' | 'bau_ergebnis'
  | 'welle' | 'welle_ergebnis' | 'pause' | 'pause_ergebnis' | 'weiter' | 'weiter_ergebnis'
  | 'chips' | 'abschluss';

export const SCREEN_RANK: Record<TutorialScreen, number> = { start: 0, menu: 1, run: 2 };

export function screenRank(screen: string): number {
  if (screen === 'start') return SCREEN_RANK.start;
  if (screen === 'run') return SCREEN_RANK.run;
  return SCREEN_RANK.menu;
}

/** Fassung 5: kurze Prompt/Reaktion-Dialoge, Ereigniskanten und Release-taugliche Krix-Fläche. */
export const TUTORIAL_VERSION = 5;

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'ankunft', screen: 'start', phase: 'prompt', pose: 'arrive', cue: 'language', advanceOn: 'langChosen', hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'sprache', screen: 'start', phase: 'reaction', pose: 'cheer', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'startknopf', screen: 'start', phase: 'prompt', pose: 'point', cue: 'begin', advanceOn: 'screenLeft', hold: false, bubble: 'top', stick: 'bottomRight' },
  { id: 'hub', screen: 'menu', phase: 'reaction', pose: 'cheer', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'labor', screen: 'menu', phase: 'prompt', pose: 'point', cue: 'endless', advanceOn: 'screenLeft', hold: false, bubble: 'top', stick: 'bottomRight' },
  { id: 'feld', screen: 'run', phase: 'reaction', pose: 'arrive', cue: 'none', advanceOn: 'press', hold: true, bubble: 'top', stick: 'bottomLeft' },
  { id: 'karte', screen: 'run', phase: 'prompt', pose: 'point', cue: 'card', advanceOn: 'cardSelected', skipIfCurrent: true, hold: true, bubble: 'top', stick: 'bottomRight' },
  { id: 'auswahl', screen: 'run', phase: 'reaction', pose: 'thumbsUp', cue: 'none', advanceOn: 'press', hold: true, bubble: 'top', stick: 'bottomRight' },
  { id: 'pflanzen', screen: 'run', phase: 'prompt', pose: 'point', cue: 'board', advanceOn: 'placed', hold: true, bubble: 'top', stick: 'bottomRight' },
  { id: 'platzierung', screen: 'run', phase: 'reaction', pose: 'cheer', cue: 'none', advanceOn: 'press', hold: true, bubble: 'top', stick: 'bottomRight' },
  { id: 'bau', screen: 'run', phase: 'prompt', pose: 'think', cue: 'build', advanceOn: 'layoutDone', skipIfCurrent: true, hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'bau_ergebnis', screen: 'run', phase: 'reaction', pose: 'cheer', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'welle', screen: 'run', phase: 'prompt', pose: 'point', cue: 'wave', advanceOn: 'waveStarted', skipIfCurrent: true, hold: false, bubble: 'top', stick: 'bottomRight' },
  { id: 'welle_ergebnis', screen: 'run', phase: 'reaction', pose: 'cheer', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomRight' },
  { id: 'pause', screen: 'run', phase: 'prompt', pose: 'think', cue: 'pause', advanceOn: 'paused', skipIfCurrent: true, hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'pause_ergebnis', screen: 'run', phase: 'reaction', pose: 'think', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'weiter', screen: 'run', phase: 'prompt', pose: 'point', cue: 'pause', advanceOn: 'running', skipIfCurrent: true, hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'weiter_ergebnis', screen: 'run', phase: 'reaction', pose: 'point', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'chips', screen: 'run', phase: 'prompt', pose: 'point', cue: 'hud', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomRight' },
  { id: 'abschluss', screen: 'run', phase: 'reaction', pose: 'thumbsUp', cue: 'none', advanceOn: 'press', hold: false, bubble: 'top', stick: 'bottomLeft' },
];

export const CUE_SELECTORS: Record<Exclude<TutorialCue, 'none'>, string> = {
  language: '[data-tut="language"]',
  begin: '[data-tut="begin"]',
  endless: '[data-tut="endless"]',
  card: '[data-tut="card"]',
  board: '[data-tut="board"]',
  build: '[data-tut="layout-done"]',
  wave: '[data-tut="wave"]',
  pause: '[data-tut="pause"]',
  hud: '[data-tut="hud"]',
};

export function cueSelector(cue: TutorialCue): string | null {
  return cue === 'none' ? null : CUE_SELECTORS[cue];
}
