import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Screen-Router (Stufe 2 des Sprint-Abschlusses, AGENTS.md).
 *
 * `App.tsx` ist ein `switch (screen)`-Router: immer genau ein Screen ist gemountet. Die Suite
 * sichert, dass jeder Menübereich ein echter Top-Level-Screen bleibt (B0.10) und dass Hin- und
 * Zurücknavigieren keinen Zustandsverlust erzeugt — der Befund A13.12 (unerreichbare Zucht-Schleife)
 * hatte hier seine Wurzel: genau ein Screen gleichzeitig, und kein Zustand überlebt den Wechsel.
 *
 * Navigation läuft über die Notizzettel-Tabs (`role="tab"`, NavIndicators). Die Karten im Hub
 * sind `button` und navigieren auf denselben Screens — die Tests hängen bewusst an den Tabs,
 * weil die auch auf den Unterscreens existieren.
 */

const RUN_CARD = /endless/i;

/**
 * B21.3: Das Onboarding beginnt jetzt auf dem TITEL-Screen — in der Release-Fläche also auch hier.
 * Diese Suite prüft den Router, nicht die Tour, und schaltet sie deshalb über das dokumentierte
 * Gate-Werkzeug ab (`?tutorial=0`, s. dev/gate.ts). Was die Tour selbst leistet, prüft die
 * Tutorial-Suite im Vitest gegen Controller und Schrittmodell.
 */
async function bootToMenu(page: Page): Promise<void> {
  await page.goto('/?tutorial=0');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page.getByRole('button', { name: RUN_CARD }).first()).toBeVisible();
}

test.describe('Screen-Router', () => {
  test('Start → Menü → Gewächshaus → zurück', async ({ page }) => {
    await bootToMenu(page);
    await expect(page.getByText(/LOADOUT/i).first()).toBeVisible();

    await page.getByRole('tab', { name: /greenhouse/i }).click();
    // B18.3: Aussaat ist frei (Kosten beim Behalten) — Label entsprechend geändert.
    await expect(page.getByRole('button', { name: /sow \(crosses two plants/i })).toBeVisible();

    await page.getByRole('button', { name: /^back$/i }).click();
    await expect(page.getByRole('button', { name: RUN_CARD }).first()).toBeVisible();
    await expect(page.getByText(/LOADOUT/i).first()).toBeVisible();
  });

  test('Menü → Samen-Shop → Brutkammer → zurück', async ({ page }) => {
    await bootToMenu(page);

    await page.getByRole('tab', { name: /seed shop/i }).click();
    await expect(page.getByRole('button', { name: /common/i })).toBeVisible();

    await page.getByRole('tab', { name: /brood chamber/i }).click();
    await expect(page.getByRole('button', { name: /breed/i })).toBeVisible();

    await page.getByRole('button', { name: /^back$/i }).click();
    await expect(page.getByRole('button', { name: RUN_CARD }).first()).toBeVisible();
  });

  test('Tabs bleiben bei 390×844 bedienbar (Touch-Ziele ≥ 44 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootToMenu(page);

    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box, `Tab ${i} hat keine Box`).not.toBeNull();
      expect(box!.height, `Tab ${i} (${await tabs.nth(i).innerText()}) ist zu flach`).toBeGreaterThanOrEqual(44);
    }
  });

  test('Auf 390×844 läuft nichts horizontal über', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootToMenu(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
