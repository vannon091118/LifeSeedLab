// Owner: i18n (Barrel). LOC ≤ 200.
// EINE Schlüssel-Wert-Tabelle, komponiert aus den Domänen-Modulen (texts_*.ts). Der Monolith kam
// auf 362 Code-Zeilen — doppelt über dem 200er-Cap für i18n und gleichzeitig für Titel, Shop,
// Lauf und Sammlung zuständig; wer einen Text suchte, las alles. Jetzt gehört jedes Modul einer
// Domäne.
//
// Der Barrel bleibt die EINZIGE Naht nach außen: `translations` ist unverändert das Objekt mit
// `de`/`en`, `TranslationKey` weiterhin die Schlüssel von `en` — kein Konsument musste sich ändern.
// Doppelte Schlüssel über zwei Module hinweg fängt `i18n_texts.test.ts` ab (sonst gewinnt still
// das spätere Modul): die Komposition ist damit so streng wie vorher die eine Datei.

import { shellTexts } from './texts_shell';
import { shopTexts } from './texts_shop';
import { runTexts } from './texts_run';
import { codexTexts } from './texts_codex';

export type Lang = 'de' | 'en';

/** Die Text-Module in Anzeige-Reihenfolge (Shell → Shop → Lauf → Sammlung). Der Paritäts-Test
 *  liest sie, um Schlüssel-Kollisionen zwischen den Modulen zu erkennen. */
export const TEXT_MODULES = { shellTexts, shopTexts, runTexts, codexTexts } as const;

export const translations = {
  de: { ...shellTexts.de, ...shopTexts.de, ...runTexts.de, ...codexTexts.de },
  en: { ...shellTexts.en, ...shopTexts.en, ...runTexts.en, ...codexTexts.en },
};

export type TranslationKey = keyof typeof translations.en;
