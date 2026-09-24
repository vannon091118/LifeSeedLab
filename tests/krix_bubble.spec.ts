import { test, expect } from '@playwright/test';
import { startRun } from './helpers/harness';

// Owner: E2E (P-5/P-13-Restnachmessung, 23.09.2026).
// P-5 verlangte: die Krix-Blase nach dem Tutorial-Umbau an der HEUTIGEN Fläche messen.
// Vertrag bei 390×844 (die gebrochene Fläche): die sichtbare Blase liegt vollständig im
// Viewport (nichts hängt ins Unklickbare) und verdeckt keine der Tray-Karten.

// E2E-COVERAGE: src/components/tutorial/ src/i18n/ src/i18n.tsx
test.describe('P-5: Krix-Blase bei 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('die Blase bleibt im Viewport und verdeckt keine Tray-Karte', async ({ page }) => {
    // Der Release-Pfad (`?tutorial=1`, ohne DevGate) ist der relevante Beweis: Die Tour startet
    // dort automatisch und die alte Dev-/Popup-Zeile darf nicht in den Hub durchsickern.
    await page.goto('/?tutorial=1');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start game/i }).click();
    await expect(page.getByText(/popup-blocker/i)).toHaveCount(0);
    await expect(page.locator('.tut-bubble')).toContainText(/Flur erreicht|Corridor reached/i);
    const hub = await page.evaluate(() => {
      const bubble = document.querySelector('.tut-bubble') as HTMLElement;
      const b = bubble.getBoundingClientRect();
      const cards = [...document.querySelectorAll('[data-tut-avoid]')] as HTMLElement[];
      const overlap = (r: DOMRect) => cards.filter(card => {
        const c = card.getBoundingClientRect();
        return Math.max(0, Math.min(r.right, c.right) - Math.max(r.left, c.left))
          * Math.max(0, Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top));
      }).length;
      return {
        inViewport: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight,
        cardOverlaps: overlap(b),
      };
    });
    expect(hub.inViewport, 'Hub-Blase ragt aus dem Viewport').toBe(true);
    expect(hub.cardOverlaps, 'Hub-Blase verdeckt Karten').toBe(0);
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
        background: getComputedStyle(bubble).backgroundColor,
        layout: document.querySelector('[data-tutorial-layout]')?.getAttribute('data-tutorial-layout'),
        cardOverlaps: cards.filter(c => overlapWith(b, c) > 0).length,
      };
    });

    expect(m.inViewport, `Blase ragt aus dem Viewport: ${JSON.stringify(m.rect)} vs ${JSON.stringify(m.viewport)}`).toBe(true);
    expect(m.background, 'Blase hat keinen Papierhintergrund').not.toBe('rgba(0, 0, 0, 0)');
    expect(m.layout, 'Blase hat keine sichere Layoutposition').toBe('safe');
    expect(m.cardOverlaps, 'Blase verdeckt Tray-Karten').toBe(0);
  });
});
