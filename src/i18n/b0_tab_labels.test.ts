// Owner: i18n-Test (B0-Tab-Label-Wache, P-30). LOC ≤ 200.
// Die Hub-/Screen-Titel tragen seit P-30 KEINE Emojis mehr — die Glyphik kommt aus
// `GameIcons` (Ink-SVGs). Diese Wache verhindert den Rückfall: Variation-Selectors (U+FE0F,
// „Emoji-Darstellung“ eines Zeichens) und die konkret entfernten Emojis dürfen in den
// Labels beider Sprachen nicht wieder auftauchen.
import { describe, it, expect } from 'vitest';
import { translations } from './translations';

const FORBIDDEN = ['🛒', '🌱', '🪲', '📖', '🍯', '🌊', '⚔️', '▶️', '🧬', '👤', '⛓', '🥀', '🌟'];

describe('B0-Wache: i18n-Labels ohne Emoji-Endgrafik (P-30)', () => {
  for (const lang of ['de', 'en'] as const) {
    it(`[${lang}] kein Label trägt ein Emoji oder einen Variation-Selector`, () => {
      const entries = Object.entries(translations[lang] as Record<string, string>);
      expect(entries.length).toBeGreaterThan(0);
      const offenders = entries.filter(([, text]) =>
        FORBIDDEN.some(e => text.includes(e)) || /[\u{FE0F}\u{1F300}-\u{1FAFF}]/u.test(text),
      );
      expect(offenders, `Emoji-Verstöße: ${JSON.stringify(offenders)}`).toEqual([]);
    });
  }
});
