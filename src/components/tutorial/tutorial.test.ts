import { describe, expect, it } from 'vitest';
import { TutorialController, type TutorialSnapshot } from './controller';
import { CUE_SELECTORS, TUTORIAL_STEPS, cueSelector, screenRank } from './script';
import { tutorialTexts, type TutorialTextKey } from '../../i18n/tutorial';

// Drei Verträge werden hier gelockt:
// 1. Das Schrittmodell ist vollständig — kein Schritt ohne Text (DE + EN) und Cue-Selektor.
// 2. Die Zustandsmaschine schaltet NUR nach ihrer eigenen Bedingung weiter (kein Sim-Schreibrecht).
// 3. Die Sprungregel (B21.3): die Tour läuft über Start → Hub → Feld und bremst niemanden aus,
//    der schneller ist als sie. Genau das war der Befund der Erstspieler-Runde: die Notizen
//    begannen erst im Feld, also lange nach der Sprachwahl.

const base: TutorialSnapshot = {
  screen: 'start', langChosen: false, selectedVariant: null, placements: 0, phase: 'prep', paused: false,
};
const snap = (patch: Partial<TutorialSnapshot> = {}): TutorialSnapshot => ({ ...base, ...patch });

function fresh(): TutorialController {
  return new TutorialController();
}

/** Controller direkt im Feld: die Stationen davor sind per Sprungregel vorbei. */
function inRun(): TutorialController {
  const c = fresh();
  c.update(snap({ screen: 'run' }));
  return c;
}

describe('B21 — Schrittmodell', () => {
  it('hat zehn Schritte mit eindeutigen IDs', () => {
    expect(TUTORIAL_STEPS).toHaveLength(10);
    expect(new Set(TUTORIAL_STEPS.map(s => s.id)).size).toBe(10);
  });

  it('beginnt am Titel-Screen und endet im Feld', () => {
    expect(TUTORIAL_STEPS[0].id).toBe('ankunft');
    expect(TUTORIAL_STEPS[0].screen).toBe('start');
    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(last.id).toBe('abschluss');
    expect(last.screen).toBe('run');
  });

  it('verteilt die Stationen auf Start, Hub und Feld', () => {
    const ids = (screen: string) => TUTORIAL_STEPS.filter(s => s.screen === screen).map(s => s.id);
    expect(ids('start')).toEqual(['ankunft', 'startknopf']);
    expect(ids('menu')).toEqual(['labor']);
    expect(ids('run')).toEqual(['karte', 'pflanzen', 'welle', 'pause', 'weiter', 'chips', 'abschluss']);
  });

  it('ordnet die Screens monoton (start < menu < run, Unterseiten = menu)', () => {
    expect(screenRank('start')).toBe(0);
    expect(screenRank('menu')).toBe(1);
    expect(screenRank('greenhouse')).toBe(1);
    expect(screenRank('codex')).toBe(1);
    expect(screenRank('run')).toBe(2);
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
    expect(Object.keys(CUE_SELECTORS)).toHaveLength(8);
  });

  it('hält die Sim nur beim Lesen IM FELD — nie auf Titel oder Hub', () => {
    const holding = TUTORIAL_STEPS.filter(s => s.hold);
    expect(holding.map(s => s.id)).toEqual(['karte', 'pflanzen']);
    expect(holding.every(s => s.screen === 'run')).toBe(true);
    // Der Wellen-Schritt muss die Sim laufen lassen — sonst sieht der Spieler die Welle nie.
    expect(TUTORIAL_STEPS.find(s => s.id === 'welle')?.hold).toBe(false);
  });

  it('markiert jeden Handlungsschritt mit dem Signal, das er verlangt', () => {
    const signalOf = (id: string) => TUTORIAL_STEPS.find(s => s.id === id)?.advanceOn;
    expect(signalOf('ankunft')).toBe('langChosen');
    expect(signalOf('startknopf')).toBe('screenLeft');
    expect(signalOf('labor')).toBe('screenLeft');
    expect(signalOf('karte')).toBe('cardSelected');
    expect(signalOf('pflanzen')).toBe('placed');
    expect(signalOf('welle')).toBe('waveStarted');
    expect(signalOf('pause')).toBe('paused');
    expect(signalOf('weiter')).toBe('running');
  });
});

describe('B21 — TutorialController', () => {
  it('startet auf dem TITEL-Screen mit der Sprachwahl und hält nichts an', () => {
    const c = fresh();
    expect(c.view.active).toBe(true);
    expect(c.view.step?.id).toBe('ankunft');
    expect(c.view.index).toBe(0);
    expect(c.hold).toBe(false);
  });

  it('geht erst weiter, wenn der Spieler wirklich eine Sprache gewählt hat', () => {
    const c = fresh();
    c.update(snap());
    expect(c.view.step?.id).toBe('ankunft');      // vorgewählte Sprache ist keine Wahl
    c.update(snap({ langChosen: true }));
    expect(c.view.step?.id).toBe('startknopf');
  });

  it('lässt den Spieler vorrennen: passierte Screens werden übersprungen', () => {
    const c = fresh();
    c.update(snap({ screen: 'menu' }));            // Sprache nie angefasst, direkt ins Menü
    expect(c.view.step?.id).toBe('labor');
    c.update(snap({ screen: 'run' }));             // Hub übersprungen, direkt ins Feld
    expect(c.view.step?.id).toBe('karte');
  });

  it('wartet auf Menü-Unterseiten, statt den Schritt zu verlieren', () => {
    const c = fresh();
    c.update(snap({ screen: 'menu' }));
    c.update(snap({ screen: 'greenhouse' }));
    expect(c.view.step?.id).toBe('labor');         // der Schritt bleibt offen
    expect(c.stepOn('greenhouse')).toBeNull();     // … ist dort aber nicht sichtbar
    expect(c.stepOn('menu')?.id).toBe('labor');
  });

  it('ist einseitig: ein Feld-Schritt wartet auf dem Rückweg ins Menü', () => {
    const c = inRun();
    expect(c.view.step?.id).toBe('karte');
    c.update(snap({ screen: 'menu' }));
    expect(c.view.step?.id).toBe('karte');         // Run verlassen heißt nicht Tour verloren
    expect(c.stepOn('menu')).toBeNull();
  });

  it('nimmt den Knopf nur auf dem Screen an, der den Schritt zeigt', () => {
    const chips = TUTORIAL_STEPS.find(s => s.id === 'chips')!;
    const c = new TutorialController([chips]);     // Knopf-Schritt, der im Feld liegt
    expect(c.press(snap({ screen: 'menu' })).step?.id).toBe('chips');  // fremder Screen ⇒ keine Wirkung
    expect(c.press(snap({ screen: 'run' })).finished).toBe(true);      // eigener Screen ⇒ Schritt geht
  });

  it('hält die Sim nur im Feld und nur beim Lesen', () => {
    expect(fresh().hold).toBe(false);
    const c = inRun();
    expect(c.hold).toBe(true);                     // 'karte' ist ein Leseschritt
    c.update(snap({ screen: 'run', selectedVariant: 'sprout' }));
    expect(c.view.step?.id).toBe('pflanzen');
    expect(c.hold).toBe(true);
    c.update(snap({ screen: 'run', selectedVariant: 'sprout', placements: 1 }));
    expect(c.view.step?.id).toBe('welle');
    expect(c.hold).toBe(false);                    // ab der Welle läuft die Sim
  });

  it('verlangt für „pflanzen" eine NEUE Platzierung (Basis beim Schritt-Eintritt)', () => {
    const c = inRun();
    c.update(snap({ screen: 'run', selectedVariant: 'sprout', placements: 4 }));
    expect(c.view.step?.id).toBe('pflanzen');

    c.update(snap({ screen: 'run', selectedVariant: 'sprout', placements: 4 }));
    expect(c.view.step?.id).toBe('pflanzen');      // gleicher Zähler ist keine neue Platzierung
    c.update(snap({ screen: 'run', selectedVariant: 'sprout', placements: 5 }));
    expect(c.view.step?.id).toBe('welle');
  });

  it('nimmt die Welle, die Pause und das Fortsetzen als Handlung an', () => {
    const c = inRun();
    const at = (patch: Partial<TutorialSnapshot>) => snap({ screen: 'run', selectedVariant: 'sprout', ...patch });
    c.update(at({}));                              // Eintritt in „pflanzen" (Basis 0)
    c.update(at({ placements: 1 }));               // die eine neue Platzierung
    expect(c.view.step?.id).toBe('welle');

    c.update(at({ placements: 1, phase: 'prep' }));
    expect(c.view.step?.id).toBe('welle');
    c.update(at({ placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('pause');

    c.update(at({ phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('pause');
    c.update(at({ phase: 'wave', paused: true }));
    expect(c.view.step?.id).toBe('weiter');

    c.update(at({ phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('chips');
    expect(c.hold).toBe(false);
  });

  it('nimmt mehrere Schritte in EINEM Takt, wenn die Welt schon weiter ist', () => {
    const c = inRun();
    c.update(snap({ screen: 'run', selectedVariant: 'sprout' }));                       // Eintritt „pflanzen"
    c.update(snap({ screen: 'run', selectedVariant: 'sprout', placements: 1, phase: 'wave' }));
    // Der Welle-Schritt erfüllt sich sofort (Welle läuft schon), der Pause-Schritt wartet.
    expect(c.view.step?.id).toBe('pause');
  });

  it('liefert dieselbe View-Identität, solange sich nichts ändert', () => {
    const c = fresh();
    const first = c.view;
    expect(c.update(snap())).toBe(first);          // sonst rendert der Signal-Eingang endlos
    c.update(snap({ langChosen: true }));
    expect(c.view).not.toBe(first);
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
    const c = inRun();
    const at = (patch: Partial<TutorialSnapshot>) => snap({ screen: 'run', selectedVariant: 'sprout', ...patch });
    c.update(at({ phase: 'wave' }));                  // Eintritt „pflanzen" (Basis 0)
    c.update(at({ placements: 1, phase: 'wave' }));   // ⇒ Welle (läuft schon) ⇒ Pause
    expect(c.view.step?.id).toBe('pause');
    c.update(at({ placements: 1, phase: 'wave', paused: true }));
    expect(c.view.step?.id).toBe('weiter');
    c.update(at({ placements: 1, phase: 'wave', paused: false }));
    expect(c.view.step?.id).toBe('chips');
    c.press(at({ placements: 1, phase: 'wave' }));
    expect(c.view.step?.id).toBe('abschluss');
    c.press(at({ placements: 1, phase: 'wave' }));

    expect(c.view.finished).toBe(true);
    expect(c.hold).toBe(false);
    c.update(snap({ screen: 'run', selectedVariant: 'rootwall', placements: 99, phase: 'wave', paused: true }));
    expect(c.view.active).toBe(false);
  });

  it('ignoriert den Knopf in Handlungsschritten (die Anweisung bleibt echt)', () => {
    const c = inRun();
    expect(c.view.step?.id).toBe('karte');
    c.press(snap({ screen: 'run' }));
    expect(c.view.step?.id).toBe('karte');
  });
});
