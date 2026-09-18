// Owner: UI (Tutorial-Naht). LOC ≤ 400.
// EINE Naht zwischen Onboarding und Screens — der Screen-Router (App) ist der Eigentümer:
// er kennt den aktuellen Screen und gibt ihn hinein, die Screens hängen nur noch `TutorialLayer`
// ein. Damit läuft die Tour über Start → Hub → Feld, ohne dass ein Screen sie besitzt oder neu
// startet (früher lag sie in GameView und begann deshalb erst im Feld — und begann bei jedem
// neuen Run wieder von vorn).
//
// Der Provider hält den einzigen Controller und die einzige View. Die Layer melden nur Signale
// (`report`) und zeigen den Schritt, der auf IHREM Screen liegt. Kein Sim-Schreibrecht, kein
// zweiter Speicher: der Hold ist ein Präsentations-Gate, der Abschluss geht als `onDone` hinaus.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { TutorialController, type TutorialSnapshot, type TutorialView } from './controller';
import { TUTORIAL_VERSION, type TutorialStep } from './script';
import { isOnboardingAutoStart } from '../../dev/gate';
import { TutorialOverlay } from './TutorialOverlay';

export interface TutorialApi {
  /** Onboarding darf laufen (Fassung nicht gesehen + nicht hinter dem DevGate abgeschaltet). */
  enabled: boolean;
  view: TutorialView;
  /** Der Schritt, den der aktuelle Screen zeigt (null ⇒ hier ist gerade nichts zu sehen). */
  step: TutorialStep | null;
  press: () => void;
  skip: () => void;
  report: (patch: Partial<TutorialSnapshot>) => void;
}

const DISABLED: TutorialApi = {
  enabled: false,
  view: { active: false, index: 0, total: 0, step: null, finished: true },
  step: null,
  press: () => {},
  skip: () => {},
  report: () => {},
};

const TutorialContext = createContext<TutorialApi>(DISABLED);

export function useTutorial(): TutorialApi {
  return useContext(TutorialContext);
}

export interface TutorialProviderProps {
  /** Aktueller Screen des Routers (`start` | `menu` | `greenhouse` | … | `run`). */
  screen: string;
  /** Gesehene Tour-Fassung aus dem Meta-Save (0 = nie gesehen). */
  seenVersion: number;
  /** Wird genau einmal gerufen: abgeschlossen, übersprungen oder der Lauf ist vorbei. */
  onDone: () => void;
  children: ReactNode;
}

export function TutorialProvider({ screen, seenVersion, onDone, children }: TutorialProviderProps) {
  const [controller] = useState(() => new TutorialController());
  const enabled = useMemo(
    () => seenVersion < TUTORIAL_VERSION && isOnboardingAutoStart(),
    [seenVersion],
  );
  const signals = useRef<TutorialSnapshot>({
    screen,
    langChosen: false,
    selectedVariant: null,
    placements: 0,
    phase: 'prep',
    paused: false,
  });
  const [view, setView] = useState<TutorialView>(() => controller.view);
  const doneRef = useRef(false);

  const report = useCallback((patch: Partial<TutorialSnapshot>) => {
    signals.current = { ...signals.current, ...patch };
    setView(controller.update(signals.current));
    // Lauf vorbei ⇒ die Notizen sind durch. Kein Nachtreten über dem Game-Over-Blatt.
    if (patch.phase === 'gameover') setView(controller.skip());
  }, [controller]);

  // Screen-Wechsel ist Router-Wahrheit: der Controller bekommt sie gereicht, er fragt nie selbst.
  useEffect(() => { report({ screen }); }, [screen, report]);

  useEffect(() => {
    if (!enabled || doneRef.current) return;
    if (view.finished) {
      doneRef.current = true;
      onDone();
    }
  }, [enabled, view.finished, view.index, onDone]);

  const api = useMemo<TutorialApi>(() => ({
    enabled,
    view,
    step: enabled ? controller.stepOn(screen) : null,
    press: () => setView(controller.press(signals.current)),
    skip: () => setView(controller.skip()),
    report,
  }), [enabled, view, controller, screen, report]);

  return <TutorialContext.Provider value={api}>{children}</TutorialContext.Provider>;
}

/** Signale des Feld-Screens (Sim-Phase, Pause) und der Auswahl (UI-Wahrheit). */
export interface TutorialRunSignals {
  selectedVariant: string | null;
  placements: number;
  phase: string;
  paused: boolean;
}

export interface TutorialLayerProps {
  /** Nur der Feld-Screen meldet diese Signale. */
  run?: TutorialRunSignals;
  /** Nur der Start-Screen: hat der Spieler in dieser Sitzung eine Sprache gewählt? */
  langChosen?: boolean;
  /** Nur der Feld-Screen: Präsentations-Gate für die Leseschritte. */
  onHold?: (hold: boolean) => void;
}

/**
 * Hängt das Onboarding in den Screen-Baum des Aufrufers. Rendert NICHTS, wenn hier gerade kein
 * Schritt liegt — so kann jeder Screen sie bedingungslos einhängen.
 */
export function TutorialLayer({ run, langChosen, onHold }: TutorialLayerProps) {
  const { enabled, view, step, press, skip, report } = useTutorial();
  const hasRun = run !== undefined;
  const selectedVariant = run?.selectedVariant ?? null;
  const placements = run?.placements ?? 0;
  const phase = run?.phase ?? 'prep';
  const paused = run?.paused ?? false;

  useEffect(() => {
    if (!hasRun) return;
    report({ selectedVariant, placements, phase, paused });
  }, [hasRun, selectedVariant, placements, phase, paused, report]);

  useEffect(() => {
    if (langChosen === undefined) return;
    report({ langChosen });
  }, [langChosen, report]);

  // Hold: nur ein Leseschritt im Feld hält die Sim an. Ein abgeschaltetes Onboarding NIE —
  // sonst steht die Welt hinter dem DevGate still (B21-Fund).
  const hold = enabled && view.active && step !== null && step.hold;
  useEffect(() => {
    if (!onHold) return;
    onHold(hold);
    return () => onHold(false);
  }, [hold, onHold]);

  if (!enabled || !step) return null;
  // Key = Schrittindex: jede Notiz remountet das Overlay ⇒ Krickz läuft neu ein,
  // die Blase ploppt neu auf (CSS-Animationen hängen am Mount, nicht an Props).
  return <TutorialOverlay key={view.index} step={step} index={view.index} total={view.total} onPress={press} onSkip={skip} />;
}
