// F4 (Spielfluss-Audit): Tray-Labels zweisprachig. Verträge:
// 1. JEDE Source-Zeile (Pflanzen + Tiles) trägt einen i18nKey, der in DE und EN existiert.
// 2. loan_sprout (kein Source-Eintrag) löst über den Extra-Key — N3 (Roh-ID im Tray) tot.
// 3. Der Auflöser gibt null für Unbekannte zurück (Fallback-Kette bleibt bei der Source).
import { describe, expect, it } from 'vitest';
import { PLANTS_SOURCE } from '../config/plants.source';
import { MAP_TILES_SOURCE } from '../config/map.source';
import { translations, type TranslationKey } from '../i18n/translations';
import { plantLabelKey, tileLabelKey } from './plantLabels';

describe('F4 — Source-i18nKeys sind vollständig und zweisprachig', () => {
  it('jede Pflanze in PLANTS_SOURCE hat einen auflösbaren i18nKey (DE + EN)', () => {
    for (const [id, src] of Object.entries(PLANTS_SOURCE)) {
      expect(src.i18nKey, `Pflanze ${id}`).toBeTruthy();
      const key = src.i18nKey as TranslationKey;
      expect(translations.de[key], `${key} (de)`).toBeTruthy();
      expect(translations.en[key], `${key} (en)`).toBeTruthy();
      expect(plantLabelKey(id)).toBe(key);
    }
  });

  it('jedes Feld-Tile in MAP_TILES_SOURCE hat einen auflösbaren i18nKey (DE + EN)', () => {
    for (const [tile, src] of Object.entries(MAP_TILES_SOURCE)) {
      expect(src.i18nKey, `Tile ${tile}`).toBeTruthy();
      const key = src.i18nKey as TranslationKey;
      expect(translations.de[key], `${key} (de)`).toBeTruthy();
      expect(translations.en[key], `${key} (en)`).toBeTruthy();
      expect(tileLabelKey(tile as keyof typeof MAP_TILES_SOURCE)).toBe(key);
    }
  });

  it('N3: loan_sprout löst zu einem sprechenden Label auf — keine Roh-ID im Tray', () => {
    const key = plantLabelKey('loan_sprout');
    expect(key).toBe('plant.loanSprout');
    expect(translations.de[key!]).toBe('Leih-Spross');
    expect(translations.en[key!]).toBe('Loan Sprout');
  });

  it('unbekannte Varianten geben null (Fallback bleibt bei der Source)', () => {
    expect(plantLabelKey('existiert_nicht')).toBeNull();
  });
});
