import { describe, expect, it } from 'vitest';
import { translations } from './translations';

describe('i18n Parität (DE/EN)', () => {
  it('hat exakt dieselben Keys in beiden Sprachen', () => {
    const de = Object.keys(translations.de).sort();
    const en = Object.keys(translations.en).sort();
    expect(de).toEqual(en);
  });

  it('hat dieselben {n}-Placeholder pro Key in beiden Sprachen', () => {
    const placeholderRe = /\{[a-z]\}/g;
    for (const key of Object.keys(translations.en) as (keyof typeof translations.en)[]) {
      const de = (translations.de[key] as string).match(placeholderRe)?.sort() ?? [];
      const en = (translations.en[key] as string).match(placeholderRe)?.sort() ?? [];
      expect(de, `Placeholder-Mismatch bei '${key}' (DE: ${de}, EN: ${en})`).toEqual(en);
    }
  });

  it('hat keine leeren Übersetzungen', () => {
    for (const [lang, dict] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value === 'string' && value.length > 0, `${lang}.${key} ist leer`).toBe(true);
      }
    }
  });
});
