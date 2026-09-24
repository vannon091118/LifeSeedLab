# Modul: i18n

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Pfad: `src/i18n/`

## Umfang

9 Dateien · importiert `bus`, `components`, `simulation` +1 · wird importiert von `bus`, `components`, `simulation` +1

## Dateien

| Datei | LOC | Importiert von | Beziehungen |
|---|---|---|---|
| [`b0_tab_labels.test.ts`](./b0_tab_labels.test.ts) | 22 | 0 | CALL 12, IMPORTS 2, PASS 12, READ 10, STRING_REFERENCE 18 |
| [`help.ts`](./help.ts) | 35 | 1 | CALL 2, EXPORTS 3, PASS 2, READ 4, RETURN 1, STRING_REFERENCE 22 |
| [`i18n_texts.test.ts`](./i18n_texts.test.ts) | 129 | 0 | CALL 117, IMPORTS 4, PASS 105, READ 108, STRING_REFERENCE 43 |
| [`texts_codex.ts`](./texts_codex.ts) | 136 | 0 | EXPORTS 1, STRING_REFERENCE 228 |
| [`texts_run.ts`](./texts_run.ts) | 158 | 0 | EXPORTS 1, STRING_REFERENCE 228 |
| [`texts_shell.ts`](./texts_shell.ts) | 88 | 0 | EXPORTS 1, STRING_REFERENCE 144 |
| [`texts_shop.ts`](./texts_shop.ts) | 107 | 0 | EXPORTS 1, STRING_REFERENCE 180 |
| [`translations.ts`](./translations.ts) | 28 | 7 | EXPORTS 4, IMPORTS 4, READ 8, STRING_REFERENCE 6 |
| [`tutorial.ts`](./tutorial.ts) | 122 | 3 | EXPORTS 3, READ 2, RETURN 1, STRING_REFERENCE 214 |

## Öffentliche Symbole

| Symbol | Art | Datei | Zeile |
|---|---|---|---|
| `HelpKey` | type | `src/i18n/help.ts` | 31 |
| `Lang` | type | `src/i18n/translations.ts` | 17 |
| `TEXT_MODULES` | const | `src/i18n/translations.ts` | 21 |
| `TranslationKey` | type | `src/i18n/translations.ts` | 28 |
| `TutorialTextKey` | type | `src/i18n/tutorial.ts` | 118 |
| `codexTexts` | const | `src/i18n/texts_codex.ts` | 7 |
| `helpText` | function | `src/i18n/help.ts` | 33 |
| `helpTexts` | const | `src/i18n/help.ts` | 6 |
| `runTexts` | const | `src/i18n/texts_run.ts` | 7 |
| `shellTexts` | const | `src/i18n/texts_shell.ts` | 7 |
| `shopTexts` | const | `src/i18n/texts_shop.ts` | 7 |
| `translations` | const | `src/i18n/translations.ts` | 23 |
| `tutorialText` | function | `src/i18n/tutorial.ts` | 120 |
| `tutorialTexts` | const | `src/i18n/tutorial.ts` | 5 |

## Datenfluss

Aufrufe mit Argumentfluss (AUFREIFER → [Position] → EMPFÄNGER).
Nur Kanten mit Repository-Ziel: ein Aufruf in `node_modules` ist Libraries,
nicht Projektrelation, und würde den Datenfluss mit fremdem Code fluten.

| Quelle | Zeile | Ausdruck | Position | Ziel | Symbol |
|---|---|---|---|---|---|
| `src/i18n/b0_tab_labels.test.ts` | 11 | `'B0-Wache: i18n-Labels ohne Emoji-Endgrafik (P-30)'` | 1 | [`src/i18n/b0_tab_labels.test.ts`](b0_tab_labels.test.ts) | describe |
| `src/i18n/b0_tab_labels.test.ts` | 13 | ``[${lang}] kein Label trägt ein Emoji oder einen Variation-Selector`` | 1 | [`src/i18n/b0_tab_labels.test.ts`](b0_tab_labels.test.ts) | it |
| `src/i18n/b0_tab_labels.test.ts` | 15 | `entries.length` | 1 | [`src/i18n/b0_tab_labels.test.ts`](b0_tab_labels.test.ts) | expect |
| `src/i18n/b0_tab_labels.test.ts` | 19 | `offenders` | 1 | [`src/i18n/b0_tab_labels.test.ts`](b0_tab_labels.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 11 | `'i18n Parität (DE/EN)'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | describe |
| `src/i18n/i18n_texts.test.ts` | 12 | `'hat exakt dieselben Keys in beiden Sprachen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 15 | `de` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 18 | `'hat dieselben {n}-Placeholder pro Key in beiden Sprachen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 23 | `de` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 30 | `'kein Schlüssel liegt in zwei Text-Modulen (Komposition verliert nichts)'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 35 | `sum` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 36 | `union` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 40 | `'hat keine leeren Übersetzungen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 43 | `typeof value === 'string' && value.length > 0` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 49 | `'i18n-Hilfetexte (DE/EN)'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | describe |
| `src/i18n/i18n_texts.test.ts` | 50 | `'hat exakt dieselben Keys in beiden Sprachen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 51 | `Object.keys(helpTexts.de).sort()` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 54 | `'hat keine leeren Texte'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 57 | `typeof value === 'string' && value.length > 0` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 62 | `'liefert über helpText denselben Text wie das Wörterbuch'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 65 | `helpText(key, 'de')` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 65 | `key` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | helpText |
| `src/i18n/i18n_texts.test.ts` | 66 | `helpText(key, 'en')` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 66 | `key` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | helpText |
| `src/i18n/i18n_texts.test.ts` | 70 | `'erklärt den kostenlosen Loop (Aussaat frei, Reifung durch Wellen, Queue-Limit)'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 71 | `'help.greenhouse'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | helpText |
| `src/i18n/i18n_texts.test.ts` | 72 | `de` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 73 | `de` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 74 | `de` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 78 | `'i18n-Tutorialtexte (DE/EN)'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | describe |
| `src/i18n/i18n_texts.test.ts` | 82 | `'hat exakt dieselben Keys in beiden Sprachen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 83 | `Object.keys(tutorialTexts.de).sort()` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 86 | `'hat dieselben {n}-Placeholder pro Key in beiden Sprachen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 91 | `de` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 95 | `'hat keine leeren Texte'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 98 | `typeof value === 'string' && value.trim().length > 0` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 103 | `'hält Krix knapp: eine Zeile pro Dialog, höchstens 180 Zeichen'` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | it |
| `src/i18n/i18n_texts.test.ts` | 105 | `textKeys` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 109 | `de.length` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
| `src/i18n/i18n_texts.test.ts` | 110 | `en.length` | 1 | [`src/i18n/i18n_texts.test.ts`](i18n_texts.test.ts) | expect |
