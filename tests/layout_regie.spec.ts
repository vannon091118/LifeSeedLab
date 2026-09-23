import { test, expect } from '@playwright/test';
import { startRun } from './helpers/harness';

// Owner: E2E (Layout-Regie P-24/P-25 + Nachmessung P-5/P-13, 23.09.2026).
// Vertrag der neuen Regie: die Tray wohnt UNTER dem Brett (stage-Fluss) und verdeckt keine
// Zelle mehr (P-25 — vorher lag die Ausgangs-Ecke 0/rows-1 unter ihr); der ✕ wohnt als
// Werkzeug-Tag IN der Tray — die Spawn-Ecke (oben rechts) bleibt Brett (P-24 — vorher lag
// der ✕ als Overlay auf cols-1/0). Gemessen wird an der echten Fläche, nicht am Style-Objekt.
// WICHTIG: jeder evaluate-Body ist in sich geschlossen (Node-Helfer sind im Browser nicht
// im Scope); die Geometrie-Probe gibt bei nicht-finitem Maß eine Diagnose statt NaN.

async function boardGeometry(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const rootRef = (window as unknown as { __simRootRef?: { current?: { getSnapshot: () => { cols: number; rows: number } } } }).__simRootRef;
    const snap = rootRef?.current?.getSnapshot();
    const r = document.querySelector('canvas')!.getBoundingClientRect();
    const pad = 20;
    if (!snap || snap.cols <= 0 || snap.rows <= 0 || r.width <= 0 || r.height <= 0) {
      return { ok: false as const, diag: { hasSnap: !!snap, cols: snap?.cols, rows: snap?.rows, w: r.width, h: r.height } };
    }
    const cell = Math.min((r.width - pad * 2) / snap.cols, (r.height - pad * 2) / snap.rows);
    const ox = (r.width - cell * snap.cols) / 2;
    const oy = (r.height - cell * snap.rows) / 2 + 8;
    const exit = { x: r.left + ox + 0.5 * cell, y: r.top + oy + (snap.rows - 0.5) * cell };
    const spawn = { x: r.left + ox + (snap.cols - 0.5) * cell, y: r.top + oy + 0.5 * cell };
    if (![exit.x, exit.y, spawn.x, spawn.y].every(Number.isFinite)) {
      return { ok: false as const, diag: { cols: snap.cols, rows: snap.rows, w: r.width, h: r.height, cell } };
    }
    return { ok: true as const, exit, spawn };
  });
}

/** Der Tap auf die (x, y) trifft das Brett (CANVAS), nicht ein Overlay? */
async function tagAt(page: import('@playwright/test').Page, p: { x: number; y: number }): Promise<string> {
  return page.evaluate(
    ({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.tagName ?? 'none',
    p,
  );
}

test.describe('Layout-Regie P-24/P-25 (mobil 390×844 — die gebrochene Fläche)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('P-25: die Tray liegt vollständig UNTER dem Brett — keine Zelle verdeckt', async ({ page }) => {
    await startRun(page);
    const rects = await page.evaluate(() => {
      const frame = document.querySelector('canvas')!.parentElement!.getBoundingClientRect();
      const canvas = document.querySelector('canvas')!.getBoundingClientRect();
      const tray = document.querySelector('[aria-label="Pflanzenauswahl"]')!.getBoundingClientRect();
      return { frameBottom: frame.bottom, frameH: frame.height, canvasBottom: canvas.bottom, trayTop: tray.top, canvasH: canvas.height };
    });
    // Zwei echte Verträge statt einer Canvas-Magie-Höhe: das Canvas darf nicht aus seinem
    // Frame ragen (Altmaß-Regression über gameRuntime.frameObserver abgedeckt) und die Tray
    // beginnt unter der Brett-Unterkante.
    expect(rects.canvasBottom, 'Canvas ragt nicht aus seinem Frame (kein Altmaß)').toBeLessThanOrEqual(rects.frameBottom + 1);
    expect(rects.trayTop, 'Tray beginnt unter dem Brett').toBeGreaterThanOrEqual(rects.canvasBottom - 1);
  });

  test('P-25: die Ausgangs-Ecke (unten links) ist frei antippbar — kein Overlay dazwischen', async ({ page }) => {
    await startRun(page);
    const geo = await boardGeometry(page);
    expect(geo.ok, `Geometrie messbar: ${JSON.stringify(geo.ok ? '' : geo.diag)}`).toBe(true);
    if (!geo.ok) return;
    const tag = await tagAt(page, geo.exit);
    // CANVAS = Brett nimmt den Tap; ein Button/Tray-Element davor wäre die alte Überdeckung.
    expect(tag).toBe('CANVAS');
  });

  test('P-13 (Tray-Anteil, nachgemessen an der heutigen Fläche): Karten sind frei, Leiste blockiert sie nicht', async ({ page }) => {
    await startRun(page);
    const free = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[aria-label="Pflanzenauswahl"] button')];
      const covered = cards.filter(c => c.getBoundingClientRect().height > 0).filter(c => {
        const r = c.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el !== null && !c.contains(el) && el !== c;
      });
      return { cards: cards.length, covered: covered.length };
    });
    expect(free.cards).toBeGreaterThan(0);
    expect(free.covered, 'keine sichtbare Karte von einem anderen Element überdeckt').toBe(0);
  });
});

test.describe('Layout-Regie P-24 (Desktop — die gebrochene Ecke)', () => {
  test('P-24: der ✕ wohnt IN der Tray, nicht über der Spawn-Ecke', async ({ page }) => {
    await startRun(page);
    await page.getByRole('button', { name: /FIELD|FELD/i }).first().click();
    const blocker = page.locator('button').filter({ hasText: /Flower Pot|Blumentopf/i }).first();
    await blocker.click();
    await expect(blocker).toHaveAttribute('aria-pressed', 'true');

    const cancel = page.locator('[aria-label="Pflanzenauswahl"] button').filter({ hasText: '✕' }).first();
    await expect(cancel).toBeVisible();

    const geo = await page.evaluate(() => {
      const overlap = (a: DOMRect, b: DOMRect) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const canvas = document.querySelector('canvas')!.getBoundingClientRect();
      const tray = document.querySelector('[aria-label="Pflanzenauswahl"]')!.getBoundingClientRect();
      const cancel = [...document.querySelectorAll('[aria-label="Pflanzenauswahl"] button')]
        .find(b => b.textContent?.includes('✕'))!.getBoundingClientRect();
      return { overCanvas: overlap(cancel, canvas) > 0, inTray: overlap(cancel, tray) > 0 };
    });
    expect(geo.overCanvas, 'der ✕ überdeckt das Brett nicht mehr (Spawn-Ecke frei)').toBe(false);
    expect(geo.inTray, 'der ✕ wohnt in der Tray').toBe(true);

    const board = await boardGeometry(page);
    expect(board.ok, `Geometrie messbar: ${JSON.stringify(board.ok ? '' : board.diag)}`).toBe(true);
    if (!board.ok) return;
    const tag = await tagAt(page, board.spawn);
    expect(tag).toBe('CANVAS');

    // Die Abwahl wirkt: ein Tap auf ✕ löst die Werkzeugwahl (aria-pressed fällt).
    await cancel.click();
    await expect(blocker).toHaveAttribute('aria-pressed', 'false');
  });
});
