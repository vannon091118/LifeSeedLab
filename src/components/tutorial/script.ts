// Owner: UI (Tutorial-Schrittmodell). LOC ≤ 200.
// EINE Quelle für die Reihenfolge des Onboardings: welcher Schritt was sagt, wohin er blinkt und
// wodurch er weitergeht. Die Texte liegen in der i18n-Schicht (`i18n/tutorial.ts`, Schlüssel
// `tut.<id>.title|text`) und werden per Test an diese Liste gekoppelt — kein Schritt ohne Text,
// kein Text ohne Schritt.
//
// B21.3: die Tour beginnt auf dem START-SCREEN (Sprachwahl → Startknopf), führt über den HUB und
// erst dann ins Feld. Jeder Schritt liegt auf genau EINEM Screen (`screen`). Wer schneller ist als
// die Tour, wird nicht ausgebremst: Schritte auf bereits passierten Screens werden übersprungen
// (Sprungregel im Controller, `screenRank`).
//
// Warum die Cues als `data-tut`-Selektoren und nicht als Refs: Das Tutorial darf die Bedienelemente
// NICHT besitzen (sie gehören StartScreen/MainMenu/GameTopBar/PlacementTray/GameView). Es zeigt auf
// sie — der Spieler drückt die echten Knöpfe, das Overlay ist ansonsten `pointer-events: none`.

export type StickmanPose = 'arrive' | 'point' | 'cheer' | 'think' | 'thumbsUp' | 'panic';

/** Wo ein Schritt spielt. Menü-Unterseiten zählen als `menu` (Rang), sichtbar ist nur der Hub. */
export type TutorialScreen = 'start' | 'menu' | 'run';

/** Ziel der blinkenden Handlungsanweisung. `none` ⇒ nur der Knopf an der Sprechblase. */
export type TutorialCue = 'none' | 'language' | 'begin' | 'endless' | 'card' | 'board' | 'build' | 'wave' | 'pause' | 'hud';

/** Wodurch ein Schritt weitergeht. `press` = nur der Knopf an der Blase.
 *  `screenLeft` = der Spieler zieht weiter (Sprungregel im Controller — der Schritt wird nie
 *  durch Warten erfüllt, sondern durch den Screen-Wechsel).
 *  `layoutDone` = der Spieler hat die BAU-PHASE verlassen (R1: „Welle starten" startet direkt,
 *  „Bauen beenden ✓" geht in die Vorbereitung) — beide Wege zählen als Handlung.
 *  `waveStarted` = es läuft WIRKLICH eine Welle (`phase === 'wave'`). Vorher hieß es
 *  `phase !== 'prep'`: seit der Run in `layout` beginnt, war das SOFORT wahr — der Wellen-Schritt
 *  erfüllte sich, bevor der Spieler irgendetwas getan hatte. */
export type TutorialSignal =
  | 'press' | 'langChosen' | 'screenLeft' | 'cardSelected' | 'placed' | 'layoutDone' | 'waveStarted' | 'paused' | 'running';

export type BubbleAnchor = 'top' | 'center' | 'bottom';
export type StickAnchor = 'bottomLeft' | 'bottomRight';

export interface TutorialStep {
  /** Zugleich i18n-Schlüssel (`tut.<id>.title`, `tut.<id>.text`). */
  id: TutorialStepId;
  /** Heimat-Screen des Schritts (exakt — nur dort wird er gezeigt). */
  screen: TutorialScreen;
  pose: StickmanPose;
  cue: TutorialCue;
  advanceOn: TutorialSignal;
  /** true ⇒ die Sim steht, solange der Schritt läuft (Lesen ohne Zeitdruck, s. B21.2/6). */
  hold: boolean;
  bubble: BubbleAnchor;
  stick: StickAnchor;
}

export type TutorialStepId =
  | 'ankunft' | 'startknopf' | 'labor'
  | 'karte' | 'pflanzen' | 'bau' | 'welle' | 'pause' | 'weiter' | 'chips' | 'abschluss';

export const SCREEN_RANK: Record<TutorialScreen, number> = { start: 0, menu: 1, run: 2 };

/** Rang eines beliebigen App-Screens: alles außer `start`/`run` ist Menü-Bereich. */
export function screenRank(screen: string): number {
  if (screen === 'start') return SCREEN_RANK.start;
  if (screen === 'run') return SCREEN_RANK.run;
  return SCREEN_RANK.menu;
}

/** Fassung der Tour. Erhöhen ⇒ jeder Spieler sieht die überarbeitete Tour genau einmal neu. */
export const TUTORIAL_VERSION = 3;

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  // ── Start-Screen: Krix kommt, bevor der Spieler das Labor betritt ──
  // Die Blasen dieser drei Stationen sitzen OBEN: die Blase nimmt Zeiger an (Tippen zeigt den
  // ganzen Text) — läge sie über dem Ziel, könnte der Spieler den echten Knopf nicht drücken.
  { id: 'ankunft',    screen: 'start', pose: 'arrive', cue: 'language', advanceOn: 'langChosen',  hold: false, bubble: 'top', stick: 'bottomLeft' },
  { id: 'startknopf', screen: 'start', pose: 'point',  cue: 'begin',    advanceOn: 'screenLeft', hold: false, bubble: 'top', stick: 'bottomRight' },
  // ── Hub: was liegt hier herum ──
  { id: 'labor',      screen: 'menu',  pose: 'cheer',  cue: 'endless',  advanceOn: 'screenLeft', hold: false, bubble: 'top', stick: 'bottomLeft' },
  // ── Feld: die Handgriffe ──
  { id: 'karte',      screen: 'run',   pose: 'point',  cue: 'card',     advanceOn: 'cardSelected', hold: true,  bubble: 'center', stick: 'bottomRight' },
  { id: 'pflanzen',   screen: 'run',   pose: 'point',  cue: 'board',    advanceOn: 'placed',       hold: true,  bubble: 'bottom', stick: 'bottomRight' },
  // R1: Zwischen „etwas gebaut" und „Welle läuft" liegt die Bauphase. Sie fehlte in der Tour —
  // der Spieler stand im Layout und die Blase verlangte „Welle starten", während der Hauptknopf
  // von selbst auf die erste Pflanze wartete.
  { id: 'bau',        screen: 'run',   pose: 'think',  cue: 'build',    advanceOn: 'layoutDone',   hold: false, bubble: 'top',    stick: 'bottomLeft' },
  { id: 'welle',      screen: 'run',   pose: 'cheer',  cue: 'wave',     advanceOn: 'waveStarted',  hold: false, bubble: 'top',    stick: 'bottomLeft' },
  { id: 'pause',      screen: 'run',   pose: 'think',  cue: 'pause',    advanceOn: 'paused',       hold: false, bubble: 'center', stick: 'bottomLeft' },
  { id: 'weiter',     screen: 'run',   pose: 'point',  cue: 'pause',    advanceOn: 'running',      hold: false, bubble: 'center', stick: 'bottomLeft' },
  { id: 'chips',      screen: 'run',   pose: 'point',  cue: 'hud',      advanceOn: 'press',        hold: false, bubble: 'center', stick: 'bottomRight' },
  { id: 'abschluss',  screen: 'run',   pose: 'thumbsUp', cue: 'none',   advanceOn: 'press',        hold: false, bubble: 'center', stick: 'bottomLeft' },
];

/** CSS-Selektoren der Cue-Ziele — genau ein Element je Ziel in seinem Screen. */
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
