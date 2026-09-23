import { test, expect } from '@playwright/test';
import { startRun } from './helpers/harness';

// Owner: E2E (P-5/P-13-Restnachmessung, 23.09.2026).
// P-5 verlangte: die Krix-Blase nach dem Tutorial-Umbau an der HEUTIGEN Fläche messen.
// Vertrag bei 390×844 (die gebrochene Fläche): die sichtbare Blase liegt vollständig im
// Viewport (nichts hängt ins Unklickbare) und verdeckt keine der Tray-Karten.

test.describe('P-5: Krix-Blase bei 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('die Blase bleibt im Viewport und verdeckt keine Tray-Karte', async ({ page }) => {
    // startRun nutzt `?dev=1` — das unterdrückt die Tour (Gate-Werkzeug). Für die P-5-Messung
    // wird die Tour explizit ERZWUNGEN (`?tutorial=1`, src/dev/gate.ts) — danach navigiert der
    // Harness wie gewohnt in den Run.
    await page.goto('/?dev=1&tutorial=1');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start game/i }).click();
    await page.getByRole('button', { name: /endless/i }).first().click();
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.waitForSelector('.tut-bubble', { state: 'visible', timeout: 15_000 });

    const m = await page.evaluate(() => {
      const bubble = document.querySelector('.tut-bubble') as HTMLElement;
      const b = bubble.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const cards = [...document.querySelectorAll('[aria-label="Pflanzenauswahl"] button')];
      const overlapWith = (r: DOMRect, el: HTMLElement) => {
        const c = el.getBoundingClientRect();
        return Math.max(0, Math.min(r.right, c.right) - Math.max(r.left, c.left))
             * Math.max(0, Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top));
      };
      return {
        rect: { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
        viewport: { vw, vh },
        inViewport: b.left >= 0 && b.top >= 0 && b.right <= vw && b.bottom <= vh,
        cardOverlaps: cards.filter(c => overlapWith(b, c) > 0).length,
      };
    });

    expect(m.inViewport, `Blase ragt aus dem Viewport: ${JSON.stringify(m.rect)} vs ${JSON.stringify(m.viewport)}`).toBe(true);
    expect(m.cardOverlaps, 'Blase verdeckt Tray-Karten').toBe(0);
  });
});
