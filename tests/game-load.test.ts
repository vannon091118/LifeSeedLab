import { test, expect } from '@playwright/test';

test('Game loads and shows root element', async ({ page }) => {
  // Navigate to the local dev server
  await page.goto('/');

  // Wait for the root element to be present in DOM
  const root = page.locator('#root');
  await expect(root).toBeAttached(); // More reliable than toBeVisible for initial load

  // Wait for React to render something inside root
  await page.waitForFunction(() =>
    document.getElementById('root')?.children.length > 0
  );
});

test('Page has correct structure', async ({ page }) => {
  await page.goto('/');

  // Check that body has the expected background color from index.html
  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', 'rgb(10, 10, 15)'); // #0a0a0f

  // Check that root element exists
  const root = page.locator('#root');
  await expect(root).toBeAttached();
});

test('Page title is correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('LifeGameLab');
});