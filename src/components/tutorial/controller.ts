// Owner: UI (Tutorial-Zustandsmaschine). LOC ≤ 200.
// Reine Präsentations-Wahrheit des Onboardings: welcher Schritt gerade läuft und wann er
// weitergeht. Sie liest Sim-Signale (Phase, Pause) und UI-Signale (Auswahl, angenommene
// Platzierung) — sie schreibt NICHTS in Sim oder Meta. Genau wie PlacementController ist sie
// deshalb ohne DOM testbar und deterministisch (keine Wanduhr, kein Zufall).
//
// Bedienung: `update(snapshot)` bei jedem Render-Takt melden, `press(snapshot)` für den Knopf an
// der Sprechblase, `skip()` für „Überspringen". Ein abgeschlossenes Tutorial ist terminal — es
// kann sich nicht selbst wiederbeleben (sonst liefe es nach dem letzten Schritt erneut an).

import { TUTORIAL_STEPS, type TutorialStep } from './script';

export interface TutorialSnapshot {
  /** Ausgewählte Tray-Karte (null = keine Auswahl) — UI-Wahrheit, kein Sim-Zugriff. */
  selectedVariant: string | null;
  /** Zähler ANGENOMMENER Platzierungen. UI-Signal: greift auch bei stehender Sim. */
  placements: number;
  /** RunPhase der Sim (`prep` | `wave` | `gameover`). */
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

  constructor(steps: readonly TutorialStep[] = TUTORIAL_STEPS) {
    this.steps = steps;
  }

  get view(): TutorialView {
    const active = !this.finished && this.index < this.steps.length;
    return {
      active,
      index: this.index,
      total: this.steps.length,
      step: active ? this.steps[this.index] : null,
      finished: this.finished,
    };
  }

  /** true ⇒ die Sim bleibt stehen, solange dieser Schritt läuft (Leseschritt). */
  get hold(): boolean {
    const v = this.view;
    return v.active && v.step!.hold;
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
    switch (step.advanceOn) {
      case 'press': return false;
      case 'cardSelected': return s.selectedVariant !== null;
      case 'placed': return s.placements > this.baselinePlacements;
      case 'waveStarted': return s.phase !== 'prep';
      case 'paused': return s.paused;
      case 'running': return !s.paused;
    }
  }
}
