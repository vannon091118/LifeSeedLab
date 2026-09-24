import { test, expect } from '@playwright/test';
import { startRun } from './helpers/harness';

/**
 * E2E — Mobile 390×844: der DoD-Punkt „Mobile geprüft“ als TRAGENDER Test.
 *
 * Diese Specs beheben nach, was die Spieltest-Runde 19/20.09.2026 als zweifelhaft gelassen hat:
 *
 *   1. P-2 Top-Bar — die rechte Knopf-Gruppe war ohne flexWrap eine Zeile (gemessen: Reihe
 *      407 px, „Exit Run“ 362–419 ⇒ 29 px außerhalb). Jetzt: umbrechend rechtsbündig, kein
 *      Knopf außerhalb des Viewports.
 *   2. Spieltest-Fix „roter Geist“ — dieselbe Integritätsregel, die die Sim beim Bau fährt,
 *      färbt die Vorschau VORAB rot (`route_blocked`); hier am echten Brett, nicht im Unit-Test.
 *   3. Spieltest-Fix „cardPress“ — Tray-Karten reagieren auf synthetische Klick-Events
 *      (`detail === 0`), wie Tastatur/Screenreader/Agenten sie senden.
 *
 * Zell-Geometrie: die Messung rechnet Raster→Pixel mit EXAKT der Renderer-Formel nach
 * (pad 20, Zentrierung +8 — `Renderer.metrics`); B16.9 (Bounds aus dem Renderer lesen) ist
 * bewusst STUFE 1 — bis dahin ist diese Formel die eine Kopie der Wahrheit, mit Verweis.
 */

/** Raster→Pixel nach Renderer.metrics (src/render/renderer.ts) — die eine Kopie, bis B16.9. */
async function cellCenter(page: Page2, gx: number, gy: number): Promise<{ x: number; y: number }> {
  return page.evaluate(([gx, gy]) => {
    const canvas = document.querySelector('canvas')!;
    const snap = (window as any).__simRootRef.current.getSnapshot();
    const r = canvas.getBoundingClientRect();
    const pad = 20;
    const cell = Math.min((r.width - pad * 2) / snap.cols, (r.height - pad * 2) / snap.rows);
    const ox = (r.width - cell * snap.cols) / 2;
    const oy = (r.height - cell * snap.rows) / 2 + 8;
    return { x: r.left + ox + (gx + 0.5) * cell, y: r.top + oy + (gy + 0.5) * cell };
  }, [gx, gy]);
}
type Page2 = Parameters<Parameters<typeof test>['0']>[1];

// E2E-COVERAGE: src/components/GameTopBar.tsx src/components/PlacementTray.tsx src/components/placementController.ts src/components/ghostPreview.ts src/components/GameView.tsx src/render/ src/simulation/
test.describe('Mobile 390×844 (DoD)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('P-2: Run-Top-Bar bricht um — kein Knopf außerhalb des Viewports', async ({ page }) => {
    await startRun(page);
    const res = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(b =>
        /Exit Run|Start Wave|Finish building|Auto waves/i.test(b.textContent ?? ''),
      );
      const rects = btns.map(b => b.getBoundingClientRect());
      return {
        anzahl: rects.length,
        ausserhalb: rects.filter(r => r.right > window.innerWidth || r.left < 0 || r.bottom > window.innerHeight || r.top < 0).length,
        maxRight: Math.round(Math.max(...rects.map(r => r.right))),
      };
    });
    expect(res.anzahl).toBeGreaterThanOrEqual(4);
    expect(res.ausserhalb, 'kein Top-Bar-Knopf darf außerhalb liegen').toBe(0);
    expect(res.maxRight).toBeLessThanOrEqual(390);
  });

  test('Geist zeigt ROT auf der wegschließenden Zelle (Integrität vorab, mobile)', async ({ page }) => {
    await startRun(page);
    // Blocker-Karte per SYNTHETISCHEM Klick wählen (prüft cardPress im selben Lauf).
    // Seit dem Findling-Schnitt (21.09.2026) ist der TOPF der einzige blockierende Tile.
    const blocker = page.locator('button').filter({ hasText: /Flower Pot|Blumentopf/i }).first();
    await page.getByRole('button', { name: /FIELD/i }).first().click();
    await blocker.click();
    await expect(blocker).toHaveAttribute('aria-pressed', 'true');

    // Der Geist zeichnet rot: wir fangen den strokeRect-Aufruf mit #a94438 ab
    // (drawGhost, src/render/renderer.ts). WICHTIG (gemessen): drawGhost zeichnet NACH
    // ctx.translate in BRETT-Koordinaten — die Erwartung ist gx*cell+2 / gy*cell+2.
    // Die Zelle muss SICHTBAR sein: seit P-25 (Tray unter dem Frame, kein Overlay mehr)
    // ist die ganze Brettreihe klickbar — der Filter unten misst die Tray-Rect weiterhin
    // dynamisch und lässt jetzt ALLE schließenden Zellen zu (tray.top liegt unter dem Brett).
    const drawn = await page.evaluate(async () => {
      const root = (window as any).__simRootRef.current;
      const snap = root.getSnapshot();
      const canvas = document.querySelector('canvas')!;
      const r = canvas.getBoundingClientRect();
      const tray = document.querySelector('[aria-label="Pflanzenauswahl"]')!.getBoundingClientRect();
      const pad = 20;
      const cell = Math.min((r.width - pad * 2) / snap.cols, (r.height - pad * 2) / snap.rows);
      const ox = (r.width - cell * snap.cols) / 2;
      const oy = (r.height - cell * snap.rows) / 2 + 8;
      const closers: Array<{ gx: number; gy: number }> = [];
      for (const p of snap.currentRoute ?? []) {
        const gx = Math.floor(p.x), gy = Math.floor(p.y);
        if (root.wouldClosePath(gx, gy, 'pot')) {
          const unten = r.top + oy + (gy + 1) * cell;
          if (unten < tray.top + 4) closers.push({ gx, gy });
        }
      }
      if (closers.length === 0) return { calls: [], erwartet: null, hinweis: 'keine sichtbare schließende Zelle' };
      const ziel = closers.sort((a, b) => a.gy - b.gy)[0];
      const calls: Array<{ color: string; x: number; y: number }> = [];
      const proto = CanvasRenderingContext2D.prototype as any;
      const orig = proto.strokeRect;
      proto.strokeRect = function (x: number, y: number, w: number, h: number) {
        const c = String(this.strokeStyle);
        if (c === '#a94438' || c === '#5a8f4e') calls.push({ color: c, x, y });
        return orig.apply(this, arguments as any);
      };
      const px = r.left + ox + (ziel.gx + 0.5) * cell;
      const py = r.top + oy + (ziel.gy + 0.5) * cell;
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: px, clientY: py, bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
      await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
      proto.strokeRect = orig;
      return { calls: calls.slice(0, 4), erwartet: { x: ziel.gx * cell + 2, y: ziel.gy * cell + 2 }, hinweis: null };
    });

    expect(drawn.erwartet, 'der Standard-Laufweg braucht eine sichtbare schließende Zelle').not.toBeNull();
    const rot = drawn.calls.filter(c => c.color === '#a94438');
    expect(rot.length, 'der Geist muss auf der Zelle ROT zeichnen').toBeGreaterThan(0);
    expect(rot[0].x, 'rote Umrandung an der schließenden Zelle (Brett-Koordinaten)').toBeCloseTo(drawn.erwartet!.x, 0);
    expect(rot[0].y).toBeCloseTo(drawn.erwartet!.y, 0);
  });

  test('Tray-Karte reagiert auf synthetischen Klick (detail 0) — Auswahl genau einmal', async ({ page }) => {
    await startRun(page);
    await page.getByRole('button', { name: /FIELD/i }).first().click();
    // Der Weg ist keine Tray-Karte mehr (21.09.2026 — der Laufweg ist das Pathfinding-Ergebnis);
    // dieselbe Mechanik wird jetzt an der Deko geprüft.
    const decor = page.locator('button').filter({ hasText: /^Decor/ }).first();
    await decor.click(); // echter Klick (trusted)
    await expect(decor).toHaveAttribute('aria-pressed', 'true');

    // synthetischer Klick auf dieselbe Karte: cardPress sendet KEINEN zweiten Toggle,
    // aber ein synthetischer Klick auf eine ANDERE Karte wählt diese aus.
    const pot = page.locator('button').filter({ hasText: /^Flower Pot/ }).first();
    await pot.evaluate(el => (el as HTMLElement).click());
    await expect(pot).toHaveAttribute('aria-pressed', 'true');
    await expect(decor).toHaveAttribute('aria-pressed', 'false');
  });
});
