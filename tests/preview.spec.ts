import { test, expect } from '@playwright/test';

/**
 * PREVIEW / SMOKE — Stufe 1 des Sprint-Abschlusses (AGENTS.md).
 *
 * Dieser Test ist die maschinelle Vorstufe der Sichtprüfung: Er bootet die echte App über den
 * von Playwright verwalteten Dev-Server, sammelt Konsolen- und Seitenfehler und legt für
 * Desktop + 390×844 Screenshots in `test-results/preview/` ab.
 *
 * Der ausgeschriebene Text wird nur bei `PW_DUMP=1` ausgegeben (Orientierung beim Ausbau der
 * Suite); im Gate-Lauf bleibt die Ausgabe ruhig.
 */

// E2E-COVERAGE: src/main.tsx src/App.tsx src/index.css src/i18n.tsx src/i18n/ src/dev/ src/version.ts src/components/StartScreen.tsx src/components/ScreenTransition.tsx src/components/ErrorBoundary.tsx src/components/MenuScreenShell.tsx src/components/CreatedBy.tsx src/components/NavIndicators.tsx
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test(`Preview ${vp.name}: App bootet ohne Fehler`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: vp.width, height: vp.height });
    // B21.3: Das Onboarding startet jetzt auf dem Titel-Screen. Diese Suite prüft Boot und Layout,
    // nicht die Tour — abgeschaltet über das dokumentierte Gate-Werkzeug `?tutorial=0`.
    await page.goto('/?tutorial=0');
    await page.waitForLoadState('networkidle');

    // Etwas Sichtbares muss gerendert sein (kein leeres Gerüst).
    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);

    // Kein horizontales Überlaufen — die 390×844-Vorgabe des Vertrags (B0.4).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({ path: `test-results/preview/${vp.name}.png`, fullPage: true });

    if (process.env.PW_DUMP === '1') {
      console.log(`----- ${vp.name} TEXT -----\n${body.slice(0, 1200)}\n----- ENDE -----`);
    }

    expect(pageErrors, `Seitenfehler: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Konsolenfehler: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
}
