import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('LifeGameLab');
  });

  test('root element is present in DOM', async ({ page }) => {
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });

  test('page does not show fatal error screen', async ({ page }) => {
    // Check that we don't see the fatal error message
    const errorMessage = page.locator('text=Die Pflanze ist umgeknickt');
    await expect(errorMessage).not.toBeVisible();

    // Or check for the fatal error container
    const fatalContainer = page.locator('div[style*="background:#f5efdc"]');
    await expect(fatalContainer).not.toBeVisible();
  });
});