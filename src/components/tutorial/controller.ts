// Owner: UI (Tutorial-Zustandsmaschine). LOC ≤ 200.
// Reine Präsentations-Wahrheit: Ein Prompt wartet auf eine Ereigniskante, eine Reaktion wartet
// auf den Klick des Spielers. Kein Sim-Schreibrecht, keine Wanduhr, kein Zufall.

import {
  SCREEN_RANK, TUTORIAL_STEPS, screenRank,
  type TutorialStep, type TutorialStepId,
} from './script';

export interface TutorialSnapshot {
  screen: string;
  langChosen: boolean;
  selectedVariant: string | null;
  placements: number;
  phase: string;
  paused: boolean;
}

export interface TutorialView {
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
  private entrySnapshot: TutorialSnapshot | null = null;
  private cache: TutorialView | null = null;

  constructor(steps: readonly TutorialStep[] = TUTORIAL_STEPS) {
    this.steps = steps;
  }

  get view(): TutorialView {
    const active = !this.finished && this.index < this.steps.length;
    const last = this.cache;
    if (last && last.active === active && last.index === this.index && last.finished === this.finished) return last;
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

  get hold(): boolean {
    const v = this.view;
    return v.active && v.step!.hold && v.step!.screen === 'run';
  }

  stepOn(screen: string): TutorialStep | null {
    const v = this.view;
    return v.step && v.step.screen === screen ? v.step : null;
  }

  /** Verarbeitet einen Takt. Nur ein echter Wechsel nach Schritt-Eintritt löst eine Reaktion aus. */
  update(snapshot: TutorialSnapshot): TutorialView {
    if (!this.entrySnapshot) this.entrySnapshot = { ...snapshot };
    for (let guard = 0; guard <= this.steps.length; guard++) {
      const v = this.view;
      if (!v.active || !v.step || !this.met(v.step, snapshot)) break;
      this.enter(this.index + 1, snapshot);
    }
    return this.view;
  }

  /** Weiter-Funktion der Reaktion bzw. eines reinen Lese-Prompts. */
  press(snapshot: TutorialSnapshot): TutorialView {
    const v = this.view;
    if (!v.active || !v.step || v.step.advanceOn !== 'press' || v.step.screen !== snapshot.screen) return v;
    this.enter(this.index + 1, snapshot);
    return this.update(snapshot);
  }

  skip(): TutorialView {
    this.finished = true;
    this.index = this.steps.length;
    this.entrySnapshot = null;
    return this.view;
  }

  private enter(next: number, snapshot: TutorialSnapshot): void {
    this.index = next;
    this.entrySnapshot = { ...snapshot };
    if (this.index >= this.steps.length) {
      this.finished = true;
      this.index = this.steps.length;
    }
  }

  private met(step: TutorialStep, s: TutorialSnapshot): boolean {
    if (screenRank(s.screen) > SCREEN_RANK[step.screen]) return true;
    if (step.screen !== s.screen) return false;
    const entry = this.entrySnapshot ?? s;
    if (step.skipIfCurrent && this.satisfiedNow(step, s)) return true;
    switch (step.advanceOn) {
      case 'press': return false;
      case 'screenLeft': return entry.screen !== s.screen;
      case 'langChosen': return s.langChosen && !entry.langChosen;
      case 'cardSelected': return s.selectedVariant !== null && entry.selectedVariant === null;
      case 'placed': return s.placements > entry.placements;
      case 'layoutDone': return entry.phase === 'layout' && s.phase !== 'layout';
      case 'waveStarted': return entry.phase !== 'wave' && s.phase === 'wave';
      case 'paused': return !entry.paused && s.paused;
      case 'running': return entry.paused && !s.paused;
    }
  }

  private satisfiedNow(step: TutorialStep, s: TutorialSnapshot): boolean {
    switch (step.advanceOn) {
      case 'cardSelected': return s.selectedVariant !== null;
      case 'layoutDone': return s.phase !== 'layout';
      case 'waveStarted': return s.phase === 'wave';
      case 'paused': return s.paused;
      case 'running': return !s.paused;
      default: return false;
    }
  }
}

export type { TutorialStepId };
