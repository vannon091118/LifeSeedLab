// Owner: UI-Test (GameIcons-Vertrag, P-30). LOC ≤ 200.
// Die vier Tab-Glyphen sind echte SVG-Komponenten (B0: keine Emojis als Endgrafik) und
// rendern deterministisch — ein Rückfall auf Emoji-Strings in NavIndicators würde der
// Label-Wache in `src/i18n/b0_tab_labels.test.ts` zusätzlich abfangen.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GreenhouseGlyph, ShopGlyph, BeetleGlyph, CodexGlyph, NektarChipIcon } from './GameIcons';

describe('GameIcons — Ink-Glyphen (P-30, B0)', () => {
  const glyphs = [
    ['GreenhouseGlyph', GreenhouseGlyph],
    ['ShopGlyph', ShopGlyph],
    ['BeetleGlyph', BeetleGlyph],
    ['CodexGlyph', CodexGlyph],
  ] as const;

  it.each(glyphs)('%s rendert als echtes SVG in der Ink-Sprache', (_name, Glyph) => {
    const html = renderToStaticMarkup(<Glyph />);
    expect(html.startsWith('<svg')).toBe(true);
    expect(html).toContain('</svg>');
    expect(html).toContain('aria-hidden');
    // B0: keine Emoji-Codepunkte in der Glyphe selbst.
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{FE0F}]/u);
  });

  it('die Nektar-Glyphe bleibt der Anker der Währung (Reise/Shop/HUD teilen sie)', () => {
    const html = renderToStaticMarkup(<NektarChipIcon />);
    expect(html).toContain('#d9a441'); // Amber = eine Farb-Wahrheit für „Währung“
  });
});
