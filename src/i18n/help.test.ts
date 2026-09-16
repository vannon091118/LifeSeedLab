import { describe, expect, it } from 'vitest';
import { helpTexts, helpText, type HelpKey } from './help';

describe('i18n-Hilfetexte (DE/EN)', () => {
  it('hat exakt dieselben Keys in beiden Sprachen', () => {
    expect(Object.keys(helpTexts.de).sort()).toEqual(Object.keys(helpTexts.en).sort());
  });

  it('hat keine leeren Texte', () => {
    for (const [lang, dict] of Object.entries(helpTexts)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value === 'string' && value.length > 0, `${lang}.${key} ist leer`).toBe(true);
      }
    }
  });

  it('liefert über helpText denselben Text wie das Wörterbuch', () => {
    const keys = Object.keys(helpTexts.de) as HelpKey[];
    for (const key of keys) {
      expect(helpText(key, 'de')).toBe(helpTexts.de[key]);
      expect(helpText(key, 'en')).toBe(helpTexts.en[key]);
    }
  });

  it('erklärt den kostenlosen Loop (Aussaat frei, Reifung durch Wellen, Queue-Limit)', () => {
    const de = helpText('help.greenhouse', 'de');
    expect(de).toMatch(/kostenlos/);
    expect(de).toMatch(/Welle/);
    expect(de).toMatch(/12/);
  });
});
