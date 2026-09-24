import { test, expect } from '@playwright/test';
import { startRun, devValue } from './helpers/harness';

/**
 * E2E — Game-Breaker-Schnellchecks (< 20s pro Test)
 *
 * B24: `startRun`/`devValue` kommen aus dem Harness (eine Quelle) — vorher lagen sie
 * dreifach kopiert im Baum und drifteten auseinander.
 */

// E2E-COVERAGE: src/simulation/ src/bus/ src/core/ src/meta/ src/meta.ts src/persistence/ src/genome/
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
