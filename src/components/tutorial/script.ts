// Owner: UI (Tutorial-Schrittmodell). LOC ≤ 200.
// EINE Quelle für die Reihenfolge des Onboardings: welcher Schritt was sagt, wohin er blinkt und
// wodurch er weitergeht. Die Texte liegen in der i18n-Schicht (`i18n/tutorial.ts`, Schlüssel
// `tut.<id>.title|text`) und werden per Test an diese Liste gekoppelt — kein Schritt ohne Text,
// kein Text ohne Schritt.
//
// Warum die Cues als `data-tut`-Selektoren und nicht als Refs: Das Tutorial darf die Bedienelemente
// NICHT besitzen (sie gehören GameTopBar/PlacementTray/GameView). Es zeigt auf sie — der Spieler
// drückt die echten Knöpfe, das Overlay ist ansonsten `pointer-events: none`.

export type StickmanPose = 'arrive' | 'point' | 'cheer' | 'think' | 'thumbsUp' | 'panic';

/** Ziel der blinkenden Handlungsanweisung. `none` ⇒ nur der Knopf an der Sprechblase. */
export type TutorialCue = 'none' | 'card' | 'board' | 'wave' | 'pause' | 'hud';

/** Wodurch ein Schritt weitergeht. `press` = nur der Knopf an der Blase. */
export type TutorialSignal = 'press' | 'cardSelected' | 'placed' | 'waveStarted' | 'paused' | 'running';

export type BubbleAnchor = 'top' | 'center' | 'bottom';
export type StickAnchor = 'bottomLeft' | 'bottomRight';

export interface TutorialStep {
  /** Zugleich i18n-Schlüssel (`tut.<id>.title`, `tut.<id>.text`). */
  id: TutorialStepId;
  pose: StickmanPose;
  cue: TutorialCue;
  advanceOn: TutorialSignal;
  /** true ⇒ die Sim steht, solange der Schritt läuft (Lesen ohne Zeitdruck, s. B21.2/6). */
  hold: boolean;
  bubble: BubbleAnchor;
  stick: StickAnchor;
}

export type TutorialStepId =
  | 'ankunft' | 'karte' | 'pflanzen' | 'welle' | 'pause' | 'weiter' | 'chips' | 'abschluss';

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'ankunft',   pose: 'arrive',   cue: 'none',  advanceOn: 'press',        hold: true,  bubble: 'center', stick: 'bottomLeft' },
  { id: 'karte',     pose: 'point',    cue: 'card',  advanceOn: 'cardSelected', hold: true,  bubble: 'center', stick: 'bottomRight' },
  { id: 'pflanzen',  pose: 'point',    cue: 'board', advanceOn: 'placed',       hold: true,  bubble: 'bottom', stick: 'bottomRight' },
  { id: 'welle',     pose: 'cheer',    cue: 'wave',  advanceOn: 'waveStarted',  hold: false, bubble: 'top',    stick: 'bottomLeft' },
  { id: 'pause',     pose: 'think',    cue: 'pause', advanceOn: 'paused',       hold: false, bubble: 'center', stick: 'bottomLeft' },
  { id: 'weiter',    pose: 'point',    cue: 'pause', advanceOn: 'running',      hold: false, bubble: 'center', stick: 'bottomLeft' },
  { id: 'chips',     pose: 'point',    cue: 'hud',   advanceOn: 'press',        hold: false, bubble: 'center', stick: 'bottomRight' },
  { id: 'abschluss', pose: 'thumbsUp', cue: 'none',  advanceOn: 'press',        hold: false, bubble: 'center', stick: 'bottomLeft' },
];

/** CSS-Selektoren der Cue-Ziele — genau ein Element je Ziel im Run-Screen. */
export const CUE_SELECTORS: Record<Exclude<TutorialCue, 'none'>, string> = {
  card: '[data-tut="card"]',
  board: '[data-tut="board"]',
  wave: '[data-tut="wave"]',
  pause: '[data-tut="pause"]',
  hud: '[data-tut="hud"]',
};

export function cueSelector(cue: TutorialCue): string | null {
  return cue === 'none' ? null : CUE_SELECTORS[cue];
}
