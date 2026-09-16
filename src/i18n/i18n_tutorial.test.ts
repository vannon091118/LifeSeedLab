import { describe, expect, it } from 'vitest';
import { tutorialTexts, tutorialText, type TutorialTextKey } from './tutorial';

// Dieselbe Paritäts-Pflicht wie translations.test.ts/help.test.ts — das Onboarding ist
// Spielerfläche, nicht Deko: fehlt ein englischer Satz, ist die Release-Fläche halb übersetzt (A17).

describe('i18n-Tutorialtexte (DE/EN)', () => {
  it('hat exakt dieselben Keys in beiden Sprachen', () => {
    expect(Object.keys(tutorialTexts.de).sort()).toEqual(Object.keys(tutorialTexts.en).sort());
  });

  it('hat dieselben {n}-Placeholder pro Key in beiden Sprachen', () => {
    const placeholderRe = /\{[a-z]\}/g;
    for (const key of Object.keys(tutorialTexts.en) as TutorialTextKey[]) {
      const de = (tutorialTexts.de[key] as string).match(placeholderRe)?.sort() ?? [];
      const en = (tutorialTexts.en[key] as string).match(placeholderRe)?.sort() ?? [];
      expect(de, `Placeholder-Mismatch bei '${key}'`).toEqual(en);
    }
  });

  it('hat keine leeren Texte', () => {
    for (const [lang, dict] of Object.entries(tutorialTexts)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value === 'string' && value.trim().length > 0, `${lang}.${key} ist leer`).toBe(true);
      }
    }
  });

  it('schreibt Krix nicht sparsam: jeder Schritt hat mehrere Absätze', () => {
    const stepKeys = Object.keys(tutorialTexts.de).filter(k => k.endsWith('.text'));
    expect(stepKeys.length).toBeGreaterThanOrEqual(8);
    for (const key of stepKeys) {
      const de = tutorialTexts.de[key as TutorialTextKey];
      const en = tutorialTexts.en[key as TutorialTextKey];
      expect(de.split('\n').length, `${key} (DE) ist zu knapp geraten`).toBeGreaterThanOrEqual(2);
      expect(en.split('\n').length, `${key} (EN) ist zu knapp geraten`).toBeGreaterThanOrEqual(2);
      expect(de.length).toBeGreaterThan(80);
    }
  });

  it('liefert über tutorialText denselben Text wie das Wörterbuch', () => {
    for (const key of Object.keys(tutorialTexts.de) as TutorialTextKey[]) {
      expect(tutorialText(key, 'de')).toBe(tutorialTexts.de[key]);
      expect(tutorialText(key, 'en')).toBe(tutorialTexts.en[key]);
    }
  });

  it('nennt die Figur und die Zählung der Feldnotizen', () => {
    expect(tutorialText('tut.name', 'de')).toBe('Krix');
    expect(tutorialText('tut.note', 'de')).toMatch(/\{n\}\/\{m\}/);
    expect(tutorialText('tut.cue', 'en')).toBe('PRESS HERE');
  });
});
