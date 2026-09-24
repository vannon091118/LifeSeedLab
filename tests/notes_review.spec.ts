import { test, expect } from '@playwright/test';

// E2E-COVERAGE: src/App.tsx src/components/MainMenu.tsx src/components/tutorial/ src/i18n/tutorial.ts src/i18n/texts_shell.ts

test.describe('P-15 — freiwillige Krix-Notizen', () => {
  test('Überspringen markiert die Tour als gesehen; der Hub öffnet sie später read-only', async ({ page }) => {
    await page.goto('/?tutorial=1');
    await page.waitForLoadState('networkidle');

    const skip = page.getByRole('button', { name: /later|später/i });
    await expect(skip).toBeVisible();
    await skip.click();
    // Skip beendet die Tour, navigiert aber nicht aus dem Title-Screen. Erst der
    // normale Startknopf führt in den Hub; danach darf kein Krix-Overlay erneut erscheinen.
    await page.getByRole('button', { name: /start game/i }).click();
    await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
    await expect(page.getByText(/notiz 1\/20|note 1\/20/i)).toHaveCount(0);

    const notesButton = page.getByRole('button', { name: /krix notes|krix-notizen/i });
    await expect(notesButton).toBeVisible();
    await notesButton.click();

    const dialog = page.getByRole('dialog', { name: /krix notes|krix-notizen/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('li')).toHaveCount(20);
    await expect(dialog.getByText(/Krix\. Reporting in|Krix\. Ich bin da/)).toBeVisible();

    await dialog.getByRole('button', { name: /close|schließen/i }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
  });
});
