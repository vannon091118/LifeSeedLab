import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Game-Breaker-Schnellchecks (< 20s pro Test)
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

test.describe('Game-Breaker-Schnellchecks', () => {

  test('Tick steigt nach Start', async ({ page }) => {
    test.setTimeout(15_000);
    await startRun(page);
    const t = await devValue(page, 'TICK');
    await page.waitForTimeout(2000);
    expect(await devValue(page, 'TICK')).toBeGreaterThan(t);
  });

  test('Score startet bei 0', async ({ page }) => {
    test.setTimeout(15_000);
    await startRun(page);
    // TICK kann > 0 sein (Sim tickt sofort), aber SCORE und WAVE sind 0
    expect(await devValue(page, 'SCORE')).toBe(0);
    expect(await devValue(page, 'WAVE')).toBe(0);
  });

  test('Meta bleibt valide', async ({ page }) => {
    test.setTimeout(15_000);
    await startRun(page);
    const meta = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('lifegamelab_meta') || '{}'); }
      catch { return null; }
    });
    expect(meta, 'Meta-Corruption').not.toBeNull();
    expect(meta?.data).toBeDefined();
  });
});
