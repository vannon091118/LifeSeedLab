import { test, expect } from '@playwright/test';
import { startRun, devValue } from './helpers/harness';

/**
 * E2E — Schnelle Mechanik-Checks (< 30s pro Test)
 *
 * B24: `startRun`/`devValue` kommen aus dem Harness (eine Quelle) — vorher lagen sie
 * dreifach kopiert im Baum und drifteten auseinander.
 */

test.describe('Mechanik-Schnellchecks', () => {

  test('Pause/Resume 5 Zyklen', async ({ page }) => {
    test.setTimeout(30_000);
    await startRun(page);
    await page.getByRole('button', { name: /start wave/i }).click();
    await page.waitForTimeout(2000);

    for (let c = 0; c < 5; c++) {
      await page.getByRole('button', { name: /^Pause$/ }).click();
      const t = await devValue(page, 'TICK');
      await page.waitForTimeout(300);
      expect(await devValue(page, 'TICK'), `Pause #${c}`).toBe(t);

      await page.getByRole('button', { name: /Fortsetzen/ }).click();
      await page.waitForTimeout(500);
      expect(await devValue(page, 'TICK'), `Resume #${c}`).toBeGreaterThan(t);
    }
  });

  test('Canvas rendert 10 Sekunden', async ({ page }) => {
    test.setTimeout(20_000);
    await startRun(page);
    await page.waitForTimeout(10_000);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await devValue(page, 'TICK')).toBeGreaterThan(100);
  });

  test('DevGate finite', async ({ page }) => {
    test.setTimeout(20_000);
    await startRun(page);
    await page.getByRole('button', { name: /start wave/i }).click();
    await page.waitForTimeout(3000);
    for (const l of ['TICK', 'WAVE', 'PLANTS', 'ENEMIES', 'SCORE']) {
      expect(Number.isFinite(await devValue(page, l)), `${l} NaN`).toBe(true);
    }
  });

  test('Resize kein Crash', async ({ page }) => {
    test.setTimeout(20_000);
    await startRun(page);
    for (const s of [{ width: 390, height: 844 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(s);
      await page.waitForTimeout(500);
      await expect(page.locator('canvas')).toHaveCount(1);
    }
  });

  test('Exit Run sauber', async ({ page }) => {
    test.setTimeout(20_000);
    await startRun(page);
    await page.getByRole('button', { name: /Exit Run/i }).click();
    await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('Keine Console-Errors', async ({ page }) => {
    test.setTimeout(20_000);
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await startRun(page);
    await page.getByRole('button', { name: /start wave/i }).click();
    await page.waitForTimeout(3000);
    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0);
  });
});
