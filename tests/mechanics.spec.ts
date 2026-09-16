import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Schnelle Mechanik-Checks (< 30s pro Test)
 * Identisches startRun/devValue wie run.spec.ts.
 */

async function startRun(page: Page): Promise<void> {
  await page.goto('/?dev=1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /start game/i }).click();
  await page.getByRole('button', { name: /endless/i }).first().click();
  await expect(page.locator('canvas')).toHaveCount(1);
}

async function devValue(page: Page, label: string): Promise<number> {
  const text = await page.locator('body').innerText();
  const match = new RegExp(`${label}\\s*\\n\\s*(-?\\d+)`).exec(text);
  expect(match, `DevGate-Wert "${label}" nicht gefunden`).not.toBeNull();
  return Number(match![1]);
}

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
