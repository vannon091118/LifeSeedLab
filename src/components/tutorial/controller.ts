// Owner: UI (Tutorial-Zustandsmaschine). LOC ≤ 200.
// Reine Präsentations-Wahrheit des Onboardings: welcher Schritt gerade läuft und wann er
// weitergeht. Sie liest Sim-Signale (Phase, Pause) und UI-Signale (Screen, Sprachwahl, Auswahl,
// angenommene Platzierung) — sie schreibt NICHTS in Sim oder Meta. Genau wie PlacementController
// ist sie deshalb ohne DOM testbar und deterministisch (keine Wanduhr, kein Zufall).
//
// B21.3: Die Tour läuft über mehrere Screens. Deshalb die SPRUNGREGEL: liegt der aktuelle Schritt
// auf einem Screen, den der Spieler schon hinter sich hat, ist er vorbei — ohne Zutun des Spielers.
// Wer vorrennt (Sprache nicht angefasst, Hub übersprungen), wird nie ausgebremst; wer zurückgeht
// (Run verlassen), findet seinen Schritt unverändert wieder.
//
// Bedienung: `update(snapshot)` bei jedem Render-Takt melden, `press(snapshot)` für den Knopf an
// der Sprechblase, `skip()` für „Überspringen". Ein abgeschlossenes Tutorial ist terminal — es
// kann sich nicht selbst wiederbeleben (sonst liefe es nach dem letzten Schritt erneut an).

import {
  SCREEN_RANK, TUTORIAL_STEPS, screenRank,
  type TutorialStep, type TutorialStepId,
} from './script';

export interface TutorialSnapshot {
  /** Aktueller App-Screen (Screen-Router-Wahrheit — reine Beschreibung, kein Schreibrecht). */
  screen: string;
  /** Der Spieler hat in DIESER Sitzung eine Sprache gewählt. */
  langChosen: boolean;
  /** Ausgewählte Tray-Karte (null = keine Auswahl) — UI-Wahrheit, kein Sim-Zugriff. */
  selectedVariant: string | null;
  /** Zähler ANGENOMMENER Platzierungen. UI-Signal: greift auch bei stehender Sim. */
  placements: number;
  /** RunPhase der Sim (`layout` | `prep` | `wave` | `gameover`). */
  phase: string;
  paused: boolean;
}

export interface TutorialView {
  /** true ⇒ das Overlay ist sichtbar und darf den Hold setzen. */
  active: boolean;
  index: number;
  total: number;
  step: TutorialStep | null;
  finished: boolean;
}

export class TutorialController {
  private readonly steps: readonly TutorialStep[];
  private index = 0;
  private finished = false;
  /** Platzierungs-Zähler beim Eintritt in den aktuellen Schritt (Basis für `placed`). */
  private baselinePlacements = 0;
  /** Identität der zuletzt gelieferten View: unveränderter Zustand ⇒ unverändertes Objekt.
   *  Das ist Pflicht, nicht Kosmetik — sonst rendert der Signal-Eingang endlos weiter. */
  private cache: TutorialView | null = null;

  constructor(steps: readonly TutorialStep[] = TUTORIAL_STEPS) {
    this.steps = steps;
  }

  get view(): TutorialView {
    const active = !this.finished && this.index < this.steps.length;
    const last = this.cache;
    if (last && last.active === active && last.index === this.index && last.finished === this.finished) {
      return last;
    }
    const view: TutorialView = {
      active,
      index: this.index,
      total: this.steps.length,
      step: active ? this.steps[this.index] : null,
      finished: this.finished,
    };
    this.cache = view;
    return view;
  }

  /** true ⇒ die Sim bleibt stehen, solange dieser Schritt läuft (Leseschritt). */
  get hold(): boolean {
    const v = this.view;
    return v.active && v.step!.hold && v.step!.screen === 'run';
  }

  /** Der Schritt, den DIESER Screen zeigt (null ⇒ hier ist gerade nichts zu sehen). */
  stepOn(screen: string): TutorialStep | null {
    const v = this.view;
    return v.step && v.step.screen === screen ? v.step : null;
  }

  /**
   * Ein Takt des Signal-Eingangs. Erfüllte Bedingungen schalten weiter — auch mehrere auf einmal
   * (z. B. läuft die Welle schon, wenn der Welle-Schritt erreicht wird). Der Guard verhindert
   * eine Endlosschleife, falls eine Bedingung dauerhaft wahr ist.
   */
  update(snapshot: TutorialSnapshot): TutorialView {
    for (let guard = 0; guard <= this.steps.length; guard++) {
      const v = this.view;
      if (!v.active || !v.step) break;
      if (!this.met(v.step, snapshot)) break;
      this.enter(this.index + 1, snapshot.placements);
    }
    return this.view;
  }

  /** Knopf an der Sprechblase. Nur Leseschritte (`press`) gehen damit weiter — Handlungsschritte
   *  verlangen ihre Handlung, sonst wäre die Anweisung Dekoration. */
  press(snapshot: TutorialSnapshot): TutorialView {
    const v = this.view;
    if (!v.active || !v.step || v.step.advanceOn !== 'press') return v;
    if (v.step.screen !== snapshot.screen) return v;  // nur der Screen, der den Schritt zeigt
    this.enter(this.index + 1, snapshot.placements);
    return this.update(snapshot);
  }

  /** „Überspringen": terminal, ohne die restlichen Schritte zu zeigen. */
  skip(): TutorialView {
    this.finished = true;
    this.index = this.steps.length;
    return this.view;
  }

  private enter(next: number, placementsNow: number): void {
    this.index = next;
    this.baselinePlacements = placementsNow;
    if (this.index >= this.steps.length) {
      this.finished = true;
      this.index = this.steps.length;
    }
  }

  private met(step: TutorialStep, s: TutorialSnapshot): boolean {
    // Sprungregel: der Schritt liegt auf einem bereits passierten Screen ⇒ vorbei.
    if (screenRank(s.screen) > SCREEN_RANK[step.screen]) return true;
    // Wartet der Spieler auf einem anderen Screen desselben Rangs (Menü-Unterseite), wartet der
    // Schritt — die Bedienelemente, auf die er zeigt, gibt es hier nicht.
    if (step.screen !== s.screen) return false;
    switch (step.advanceOn) {
      case 'press': return false;
      case 'screenLeft': return false;   // nur die Sprungregel löst ihn aus
      case 'langChosen': return s.langChosen;
      case 'cardSelected': return s.selectedVariant !== null;
      case 'placed': return s.placements > this.baselinePlacements;
      // Die Bauphase ist ein eigener Zustand (`layout`), nicht „noch keine Welle": beide Wege
      // hinaus zählen („Welle starten" direkt / „Bauen beenden ✓" in die Vorbereitung).
      case 'layoutDone': return s.phase !== 'layout';
      // Nur eine WIRKLICH laufende Welle erfüllt den Wellen-Schritt (Befund: `!== 'prep'` war im
      // Layout sofort wahr — der Schritt lief durch, ohne dass der Spieler gedrückt hatte).
      case 'waveStarted': return s.phase === 'wave';
      case 'paused': return s.paused;
      case 'running': return !s.paused;
    }
  }
}

export type { TutorialStepId };
