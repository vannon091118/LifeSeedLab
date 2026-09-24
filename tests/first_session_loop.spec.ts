import { test, expect } from '@playwright/test';
import { meta, metaWaves, placeOnePlant, plantCard, pumpWave, runToGameOver, startRun, backToMenu } from './helpers/harness';
import { SEED_PRICE } from '../src/config/economy.source';

// E2E-COVERAGE: src/App.tsx src/components/MainMenu.tsx src/components/Greenhouse.tsx src/components/greenhouse/ src/components/SeedShop.tsx src/components/PlacementTray.tsx src/meta/ src/persistence/ src/simulation/ src/config/economy.source.ts src/i18n/

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Erst-Session-Loop', () => {
  test('Kauf → Topf → Einkommen → zweiter Keim → Cross → Claim → Loadout → Run-Platzierung', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/?dev=1&tutorial=0');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start game/i }).click();

    // 1. erster Samen: kaufen und physisch in einen Topf legen.
    await page.getByRole('tab', { name: /shop/i }).click();
    await page.getByRole('button', { name: /seeds/i }).first().click();
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    await page.locator('[data-tut="seedling"]').click();
    await page.locator('[data-tut^="pot-"]:not([disabled])').first().click();
    expect((await meta(page)).pots?.filter(Boolean)).toHaveLength(1);

    // 2. Der erste Leih-Run erzeugt das Nektar für den zweiten Samen. Die Pflanze wird
    //    tatsächlich platziert: ein pflanzenloser Pump-Run würde zwar Wellen zählen, aber
    //    keinen Kill und damit kein Nektar — der Test darf keinen toten Wirtschaftsloop
    //    als Erfolg verkleiden.
    await page.getByRole('button', { name: /close|schließen/i }).click();
    await startRun(page);
    expect(await placeOnePlant(page, 'loan_sprout', 'loan_sprout'), 'Leih-Spross konnte nicht platziert werden').toBe(true);
    await runToGameOver(page);
    await backToMenu(page);
    expect((await meta(page)).nektar ?? 0, 'der Leih-Run muss den zweiten Samen finanzieren').toBeGreaterThanOrEqual(SEED_PRICE);

    await page.getByRole('tab', { name: /shop/i }).click();
    await page.getByRole('button', { name: /seeds/i }).first().click();
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    await page.locator('[data-tut="seedling"]').click();
    await page.locator('[data-tut^="pot-"]:not([disabled])').first().click();
    expect((await meta(page)).pots?.filter(Boolean)).toHaveLength(2);

    // 3. Zwei bewusst gewählte Eltern, deterministischer Cross.
    const parents = page.locator('[data-tut="parent"]');
    await expect(parents).toHaveCount(2);
    await parents.nth(0).click();
    await parents.nth(1).click();
    const sow = page.getByRole('button', { name: /sow|aussäen/i });
    await expect(sow).toBeEnabled();
    await sow.click();
    expect((await meta(page)).pendingCrosses).toHaveLength(1);

    // 4. Die Reifung wird nicht geraten: der Queue-Eintrag nennt seine benötigten Wellen.
    //    Ein pflanzenloser Pump-Run bricht in dieser App genau zwei Wellen an; die Schleife
    //    füllt damit exakt die Source-Schwelle und bleibt auch bei einer Content-Kurve
    //    mit ungerader Länge nachvollziehbar.
    await page.getByRole('button', { name: /close|schließen/i }).click();
    const queued = (await meta(page)).pendingCrosses?.[0];
    expect(queued, 'Aussaat muss einen Queue-Eintrag persistieren').toBeDefined();
    expect(queued?.neededWaves, 'Queue-Eintrag muss eine Reifungsschwelle nennen').toBeGreaterThan(0);
    const maturityStart = (await meta(page)).totalWavesSurvived ?? 0;
    for (let i = 0; i < 10 && await metaWaves(page) < maturityStart + queued!.neededWaves; i++) {
      await pumpWave(page);
    }
    expect(await metaWaves(page)).toBeGreaterThanOrEqual(maturityStart + queued!.neededWaves);
    await page.getByRole('tab', { name: /greenhouse/i }).click();
    const claim = page.getByRole('button', { name: /claim|abholen/i });
    await expect(claim).toBeVisible();
    await claim.click();
    const claimedMeta = await meta(page);
    expect(claimedMeta.pendingCrosses, 'Claim bucht die Queue aus').toHaveLength(0);
    const claimed = claimedMeta.savedVariants ?? [];
    expect(claimed).toHaveLength(3);
    const child = claimed[claimed.length - 1]!;

    // 5. Das Kind in den Loadout nehmen und im nächsten Run tatsächlich platzieren.
    await page.getByRole('button', { name: /close|schließen/i }).click();
    const childCard = page.getByRole('button', { name: new RegExp(escaped(child.name)) });
    await expect(childCard).toBeVisible();
    await childCard.click();
    expect((await meta(page)).loadout).toContain(child.id);

    await startRun(page);
    await expect(plantCard(page, child.id)).toBeVisible();
    expect(await placeOnePlant(page, child.name, child.id)).toBe(true);
  });
});
