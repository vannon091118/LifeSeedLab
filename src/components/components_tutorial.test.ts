import { describe, expect, it } from 'vitest';
import { TutorialController, type TutorialSnapshot } from './tutorial/controller';
import { CUE_SELECTORS, TUTORIAL_STEPS, cueSelector, screenRank } from './tutorial/script';
import { placeBubble, rectsOverlap, type TutorialRect } from './tutorial/bubbleLayout';
import { tutorialTexts, type TutorialTextKey } from '../i18n/tutorial.ts';

// Drei Verträge werden hier gelockt:
// 1. Jeder Schritt hat eine eigene Rolle (Prompt oder Reaktion), DE/EN-Text und einen Screen.
// 2. Ein Prompt reagiert nur auf eine Ereigniskante; ein wiederholter Zustand bleibt ohne Reaktion.
// 3. Die Blase sucht eine Position außerhalb der als Karten markierten Flächen.

const base: TutorialSnapshot = {
  screen: 'start', langChosen: false, selectedVariant: null, placements: 0, phase: 'prep', paused: false,
};
const snap = (patch: Partial<TutorialSnapshot> = {}): TutorialSnapshot => ({ ...base, ...patch });
const runSnap = (patch: Partial<TutorialSnapshot> = {}): TutorialSnapshot => snap({ screen: 'run', phase: 'layout', ...patch });

function fresh(): TutorialController {
  return new TutorialController();
}

function inRun(): TutorialController {
  const c = fresh();
  c.update(runSnap());
  return c;
}

describe('B21 — Ereignis-Skript', () => {
  it('hat 20 eindeutige Prompt/Reaktion-Schritte', () => {
    expect(TUTORIAL_STEPS).toHaveLength(20);
    expect(new Set(TUTORIAL_STEPS.map(s => s.id)).size).toBe(20);
    expect(TUTORIAL_STEPS.every((s, i) => s.phase === (i % 2 === 0 ? 'prompt' : 'reaction'))).toBe(true);
  });

  it('beginnt auf dem Titel-Screen und endet nach dem Ergebnis im Feld', () => {
    expect(TUTORIAL_STEPS[0].id).toBe('ankunft');
    expect(TUTORIAL_STEPS[0].screen).toBe('start');
    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(last.id).toBe('abschluss');
    expect(last.phase).toBe('reaction');
    expect(last.screen).toBe('run');
  });

  it('verteilt jede Station sichtbar auf genau einen Screen', () => {
    const ids = (screen: string) => TUTORIAL_STEPS.filter(s => s.screen === screen).map(s => s.id);
    expect(ids('start')).toEqual(['ankunft', 'sprache', 'startknopf']);
    expect(ids('menu')).toEqual(['hub', 'labor']);
    expect(ids('run')).toEqual([
      'feld', 'karte', 'auswahl', 'pflanzen', 'platzierung', 'bau', 'bau_ergebnis',
      'welle', 'welle_ergebnis', 'pause', 'pause_ergebnis', 'weiter', 'weiter_ergebnis',
      'chips', 'abschluss',
    ]);
  });

  it('ordnet die Screen-Ränge monoton; Unterseiten bleiben Menü', () => {
    expect(screenRank('start')).toBe(0);
    expect(screenRank('menu')).toBe(1);
    expect(screenRank('greenhouse')).toBe(1);
    expect(screenRank('codex')).toBe(1);
    expect(screenRank('run')).toBe(2);
  });

  it('hat für jeden Schritt Titel und Text in beiden Sprachen', () => {
    for (const step of TUTORIAL_STEPS) {
      for (const suffix of ['title', 'text'] as const) {
        const key = `tut.${step.id}.${suffix}` as TutorialTextKey;
        expect(tutorialTexts.de[key], `${key} fehlt (DE)`).toBeTruthy();
        expect(tutorialTexts.en[key], `${key} fehlt (EN)`).toBeTruthy();
      }
    }
  });

  it('hat für jedes Cue-Ziel einen Selektor — und keins ohne Ziel', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.cue === 'none') expect(cueSelector(step.cue)).toBeNull();
      else expect(cueSelector(step.cue)).toBe(CUE_SELECTORS[step.cue]);
    }
    expect(Object.keys(CUE_SELECTORS)).toHaveLength(9);
  });

  it('hält die Sim nur für die bewusst lesbaren Feld- und Reaktionsschritte an', () => {
    const holding = TUTORIAL_STEPS.filter(s => s.hold);
    expect(holding.map(s => s.id)).toEqual(['feld', 'karte', 'auswahl', 'pflanzen', 'platzierung']);
    expect(holding.every(s => s.screen === 'run')).toBe(true);
    expect(TUTORIAL_STEPS.find(s => s.id === 'welle')?.hold).toBe(false);
  });

  it('markiert jeden Prompt mit seinem konkreten Ereignis', () => {
    const signalOf = (id: string) => TUTORIAL_STEPS.find(s => s.id === id)?.advanceOn;
    expect(signalOf('ankunft')).toBe('langChosen');
    expect(signalOf('startknopf')).toBe('screenLeft');
    expect(signalOf('labor')).toBe('screenLeft');
    expect(signalOf('karte')).toBe('cardSelected');
    expect(signalOf('pflanzen')).toBe('placed');
    expect(signalOf('bau')).toBe('layoutDone');
    expect(signalOf('welle')).toBe('waveStarted');
    expect(signalOf('pause')).toBe('paused');
    expect(signalOf('weiter')).toBe('running');
    expect(signalOf('chips')).toBe('press');
  });
});

describe('B21 — Ereignis-Controller', () => {
  it('wartet auf die Sprachwahl und zeigt erst danach die Reaktion', () => {
    const c = fresh();
    c.update(snap());
    expect(c.view.step?.id).toBe('ankunft');
    c.update(snap({ langChosen: true }));
    expect(c.view.step?.id).toBe('sprache');
    c.update(snap({ langChosen: true }));
    expect(c.view.step?.id).toBe('sprache'); // gleicher Zustand ist kein neues Ereignis
    c.press(snap({ langChosen: true }));
    expect(c.view.step?.id).toBe('startknopf');
  });

  it('lässt den Spieler vorrennen und wartet auf Unterseiten', () => {
    const c = fresh();
    c.update(snap({ screen: 'menu' }));
    expect(c.view.step?.id).toBe('hub');
    c.update(snap({ screen: 'greenhouse' }));
    expect(c.view.step?.id).toBe('hub');
    expect(c.stepOn('greenhouse')).toBeNull();
    c.update(snap({ screen: 'menu' }));
    expect(c.stepOn('menu')?.id).toBe('hub');
    c.press(snap({ screen: 'menu' }));
    expect(c.view.step?.id).toBe('labor');
    c.update(runSnap());
    expect(c.view.step?.id).toBe('feld');
  });

  it('hält eine Feld-Reaktion auf dem Rückweg zum Menü verborgen, ohne sie zu verlieren', () => {
    const c = inRun();
    expect(c.view.step?.id).toBe('feld');
    c.update(snap({ screen: 'menu' }));
    expect(c.view.step?.id).toBe('feld');
    expect(c.stepOn('menu')).toBeNull();
    c.update(runSnap());
    expect(c.view.step?.id).toBe('feld');
  });

  it('nimmt den Klick einer Reaktion nur auf ihrem Screen an', () => {
    const c = inRun();
    c.press(snap({ screen: 'menu' }));
    expect(c.view.step?.id).toBe('feld');
    c.press(runSnap());
    expect(c.view.step?.id).toBe('karte');
    c.press(runSnap());
    expect(c.view.step?.id).toBe('karte'); // Prompt-Karte verlangt Auswahl, nicht den Blasenknopf
  });

  it('löst nur echte Auswahl- und Platzierungs-Kanten aus', () => {
    const c = inRun();
    c.press(runSnap());
    expect(c.view.step?.id).toBe('karte');
    c.update(runSnap({ selectedVariant: null }));
    expect(c.view.step?.id).toBe('karte');
    c.update(runSnap({ selectedVariant: 'sprout' }));
    expect(c.view.step?.id).toBe('auswahl');
    c.update(runSnap({ selectedVariant: 'sprout' }));
    expect(c.view.step?.id).toBe('auswahl');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 0 }));
    expect(c.view.step?.id).toBe('pflanzen');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 0 }));
    expect(c.view.step?.id).toBe('pflanzen');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1 }));
    expect(c.view.step?.id).toBe('platzierung');
  });

  it('meldet eine abgelehnte Platzierung nicht als Ereignis', () => {
    const c = inRun();
    c.press(runSnap());
    c.update(runSnap({ selectedVariant: 'sprout' }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 0 }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 0 }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 0, phase: 'layout' }));
    expect(c.view.step?.id).toBe('pflanzen');
  });

  it('trennt Bau-Ende, Welle, Pause und Fortsetzen als vier Ereignisse', () => {
    const c = inRun();
    c.press(runSnap());
    c.update(runSnap({ selectedVariant: 'sprout', placements: 0 }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 0 }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1 }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1 }));
    expect(c.view.step?.id).toBe('bau');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'prep' }));
    expect(c.view.step?.id).toBe('bau_ergebnis');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'prep' }));
    expect(c.view.step?.id).toBe('welle');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'prep' }));
    expect(c.view.step?.id).toBe('welle');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('welle_ergebnis');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('pause');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave', paused: true }));
    expect(c.view.step?.id).toBe('pause_ergebnis');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave', paused: true }));
    expect(c.view.step?.id).toBe('weiter');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('weiter_ergebnis');
  });

  it('zeigt bei bereits gestarteter Welle direkt die Ergebnisreaktion', () => {
    const c = inRun();
    c.press(runSnap());
    c.update(runSnap({ selectedVariant: 'sprout', placements: 0, phase: 'wave' }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 0, phase: 'wave' }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('bau_ergebnis');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('welle_ergebnis');
  });

  it('schließt nach HUD-Notiz und Abschluss terminal ab', () => {
    const c = inRun();
    c.press(runSnap());
    c.update(runSnap({ selectedVariant: 'sprout', placements: 0, phase: 'wave' }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 0, phase: 'wave' }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('bau_ergebnis');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('welle_ergebnis');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('pause');
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave', paused: true }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave', paused: true }));
    c.update(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave', paused: false }));
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('chips');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('abschluss');
    c.press(runSnap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    expect(c.view.finished).toBe(true);
    expect(c.hold).toBe(false);
  });

  it('liefert dieselbe View-Identität, solange sich nichts ändert', () => {
    const c = fresh();
    const first = c.update(snap());
    expect(c.update(snap())).toBe(first);
    c.update(snap({ langChosen: true }));
    expect(c.view).not.toBe(first);
  });

  it('überspringt terminal und lässt sich nicht wiederbeleben', () => {
    const c = fresh();
    c.skip();
    expect(c.view.finished).toBe(true);
    expect(c.view.active).toBe(false);
    expect(c.view.step).toBeNull();
    expect(c.hold).toBe(false);
  });
});

describe('P-5 — Bubble-Geometrie', () => {
  it('findet eine Position außerhalb der Karten und im Viewport', () => {
    const size: TutorialRect = { x: 0, y: 0, w: 220, h: 130 };
    const bounds: TutorialRect = { x: 0, y: 0, w: 800, h: 600 };
    const stage: TutorialRect = { x: 0, y: 180, w: 800, h: 360 };
    const preferred: TutorialRect = { x: 260, y: 280, w: 220, h: 130 };
    const avoid: TutorialRect[] = [{ x: 0, y: 240, w: 520, h: 200 }];
    const placed = placeBubble(size, bounds, stage, preferred, avoid);
    expect(placed.x >= 0 && placed.y >= 0).toBe(true);
    expect(placed.x + placed.w <= bounds.w && placed.y + placed.h <= bounds.h).toBe(true);
    expect(rectsOverlap(placed, avoid[0], 10)).toBe(false);
  });
});
