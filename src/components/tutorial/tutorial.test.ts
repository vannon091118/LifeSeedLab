import { describe, expect, it } from 'vitest';
import { TutorialController, type TutorialSnapshot } from './controller';
import { CUE_SELECTORS, TUTORIAL_STEPS, cueSelector } from './script';
import { tutorialTexts, type TutorialTextKey } from '../../i18n/tutorial';

// Zwei Verträge werden hier gelockt:
// 1. Das Schrittmodell ist vollständig — kein Schritt ohne Text (DE + EN) und Cue-Selektor.
// 2. Die Zustandsmaschine schaltet NUR nach ihrer eigenen Bedingung weiter (kein Sim-Schreibrecht).

const base: TutorialSnapshot = { selectedVariant: null, placements: 0, phase: 'prep', paused: false };
const snap = (patch: Partial<TutorialSnapshot> = {}): TutorialSnapshot => ({ ...base, ...patch });

function fresh(): TutorialController {
  return new TutorialController();
}

describe('B21 — Schrittmodell', () => {
  it('hat acht Schritte mit eindeutigen IDs', () => {
    expect(TUTORIAL_STEPS).toHaveLength(8);
    expect(new Set(TUTORIAL_STEPS.map(s => s.id)).size).toBe(8);
  });

  it('endet mit dem Abschluss-Schritt und startet mit dem Ankunfts-Schritt', () => {
    expect(TUTORIAL_STEPS[0].id).toBe('ankunft');
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].id).toBe('abschluss');
  });

  it('hat für JEDEN Schritt Titel und Text in beiden Sprachen', () => {
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
    expect(Object.keys(CUE_SELECTORS)).toHaveLength(5);
  });

  it('hält die Sim nur, solange der Spieler liest (nicht in Handlungsschritten)', () => {
    const holding = TUTORIAL_STEPS.filter(s => s.hold).map(s => s.id);
    expect(holding).toEqual(['ankunft', 'karte', 'pflanzen']);
    // Der Wellen-Schritt muss die Sim laufen lassen — sonst sieht der Spieler die Welle nie.
    expect(TUTORIAL_STEPS.find(s => s.id === 'welle')?.hold).toBe(false);
  });

  it('markiert jeden Handlungsschritt mit dem Signal, das er verlangt', () => {
    expect(TUTORIAL_STEPS.find(s => s.id === 'karte')?.advanceOn).toBe('cardSelected');
    expect(TUTORIAL_STEPS.find(s => s.id === 'pflanzen')?.advanceOn).toBe('placed');
    expect(TUTORIAL_STEPS.find(s => s.id === 'welle')?.advanceOn).toBe('waveStarted');
    expect(TUTORIAL_STEPS.find(s => s.id === 'pause')?.advanceOn).toBe('paused');
    expect(TUTORIAL_STEPS.find(s => s.id === 'weiter')?.advanceOn).toBe('running');
  });
});

describe('B21 — TutorialController', () => {
  it('startet beim Ankunfts-Schritt und hält die Sim an', () => {
    const c = fresh();
    expect(c.view.active).toBe(true);
    expect(c.view.step?.id).toBe('ankunft');
    expect(c.view.index).toBe(0);
    expect(c.hold).toBe(true);
  });

  it('geht NICHT durch bloßes Melden der Signale weiter (Leseschritt)', () => {
    const c = fresh();
    for (let i = 0; i < 5; i++) c.update(snap({ selectedVariant: 'sprout', placements: 9, phase: 'wave', paused: true }));
    expect(c.view.step?.id).toBe('ankunft');
  });

  it('geht nach dem Knopf weiter und lässt erst dann eine Handlung zu', () => {
    const c = fresh();
    c.press(snap());

    expect(c.view.step?.id).toBe('karte');
    expect(c.hold).toBe(true);
    c.update(snap({ selectedVariant: null }));
    expect(c.view.step?.id).toBe('karte'); // ohne Auswahl bleibt der Schritt stehen
    c.update(snap({ selectedVariant: 'sprout' }));
    expect(c.view.step?.id).toBe('pflanzen');
  });

  it('verlangt für „pflanzen" eine NEUE Platzierung (Basis beim Schritt-Eintritt)', () => {
    const c = fresh();
    c.press(snap());
    c.update(snap({ selectedVariant: 'sprout', placements: 4 })); // Eintritt mit Zähler 4
    expect(c.view.step?.id).toBe('pflanzen');

    c.update(snap({ selectedVariant: 'sprout', placements: 4 }));
    expect(c.view.step?.id).toBe('pflanzen'); // gleicher Zähler ist keine neue Platzierung
    c.update(snap({ selectedVariant: 'sprout', placements: 5 }));
    expect(c.view.step?.id).toBe('welle');
  });

  it('nimmt die Welle, die Pause und das Fortsetzen als Handlung an', () => {
    const c = fresh();
    c.press(snap());
    c.update(snap({ selectedVariant: 'sprout' }));
    c.update(snap({ selectedVariant: 'sprout', placements: 1 }));
    expect(c.view.step?.id).toBe('welle');

    c.update(snap({ placements: 1, phase: 'prep' }));
    expect(c.view.step?.id).toBe('welle');
    c.update(snap({ placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('pause');

    c.update(snap({ placements: 1, phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('pause');
    c.update(snap({ placements: 1, phase: 'wave', paused: true }));
    expect(c.view.step?.id).toBe('weiter');

    c.update(snap({ placements: 1, phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('chips');
    expect(c.hold).toBe(false); // ab der Welle läuft die Sim
  });

  it('nimmt mehrere Schritte in EINEM Takt, wenn die Welt schon weiter ist', () => {
    const c = fresh();
    c.press(snap({ phase: 'wave' })); // Welle läuft bereits, bevor der Welle-Schritt erreicht wird
    c.update(snap({ selectedVariant: 'sprout', phase: 'wave' }));
    c.update(snap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));

    // Der Welle-Schritt erfüllt sich sofort, der Pause-Schritt wartet auf den Spieler.
    expect(c.view.step?.id).toBe('pause');
  });

  it('überspringt auf „Überspringen" terminal', () => {
    const c = fresh();
    c.skip();

    expect(c.view.finished).toBe(true);
    expect(c.view.active).toBe(false);
    expect(c.view.step).toBeNull();
    expect(c.hold).toBe(false);
  });

  it('lässt sich nach dem Abschluss nicht wiederbeleben', () => {
    const c = fresh();
    c.press(snap());
    c.press(snap({ selectedVariant: 'sprout' })); // 'karte' verlangt Handlung ⇒ keine Wirkung
    c.update(snap({ selectedVariant: 'sprout' }));
    c.update(snap({ selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    c.update(snap({ placements: 1, phase: 'wave', paused: true }));
    c.update(snap({ placements: 1, phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('chips');
    c.press(snap({ placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('abschluss');
    c.press(snap({ placements: 1, phase: 'wave' }));

    expect(c.view.finished).toBe(true);
    expect(c.hold).toBe(false);
    c.update(snap({ selectedVariant: 'rootwall', placements: 99, phase: 'wave', paused: true }));
    expect(c.view.active).toBe(false);
  });

  it('ignoriert den Knopf in Handlungsschritten (die Anweisung bleibt echt)', () => {
    const c = fresh();
    c.press(snap());
    expect(c.view.step?.id).toBe('karte');
    c.press(snap());
    expect(c.view.step?.id).toBe('karte');
  });
});
