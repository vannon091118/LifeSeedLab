// E2E-COVERAGE: src/components/Codex.tsx src/discovery/codex.ts src/discovery/chain.ts src/persistence/storage.ts
import { expect, test, type Page } from '@playwright/test';
import { createEntry } from '../src/discovery/chain';
import { fnv1a } from '../src/core/hash';
import type { Genome } from '../src/types';

const CODEX_KEY = 'lifegamelab_codex';
const genome: Genome = [{ id: 'fire', power: 0.5, dominant: true }];
const entry = createEntry({
  genome,
  parents: ['base_shooter', 'base_wall'],
  seed: 4242,
  generation: 0,
  player_id: 'ui-test',
  timestamp: 1,
}, null);
const codexSave = JSON.stringify({ version: 3, chain: [entry] });
const codexEnvelope = JSON.stringify({
  v: 3,
  checksum: fnv1a(0x811c9dc5, codexSave),
  data: JSON.parse(codexSave),
});

async function openCodex(page: Page): Promise<void> {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: CODEX_KEY,
    value: codexEnvelope,
  });
  await page.goto('/?tutorial=0');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page.getByRole('button', { name: /endless/i }).first()).toBeVisible();
  await page.getByRole('tab', { name: /codex/i }).click();
  await expect(page.getByRole('heading', { name: /local codex/i })).toBeVisible();
}

test.describe('Codex Clipboard-Status', () => {
  test('zeigt Kopiert nach echtem Clipboard-Erfolg', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' });
    await openCodex(page);

    const share = page.getByRole('button', { name: /share discovery|fund teilen/i });
    await expect(share).toBeVisible();
    await page.evaluate(() => {
      const state = window as unknown as { __codexCopyStatus?: string; __codexObserver?: MutationObserver };
      state.__codexCopyStatus = '';
      state.__codexObserver = new MutationObserver(() => {
        const button = [...document.querySelectorAll('button')].find(candidate =>
          /share discovery|fund teilen|copied|kopiert/i.test(candidate.textContent ?? ''),
        );
        const text = button?.textContent ?? '';
        if (/copied|kopiert/i.test(text)) state.__codexCopyStatus = text;
      });
      state.__codexObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    await share.click();
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { __codexCopyStatus?: string }).__codexCopyStatus ?? '',
    )).toMatch(/copied!|kopiert!/i);
  });

  test('bleibt beim Share-Button, wenn die Clipboard-API ablehnt', async ({ page }) => {
    await openCodex(page);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('clipboard denied')) },
      });
    });

    const share = page.getByRole('button', { name: /share discovery|fund teilen/i });
    await expect(share).toBeVisible();
    await share.click();
    await expect(share).toHaveText(/share discovery|fund teilen/i);
    await expect(page.getByText(/copied!|kopiert!/i)).toHaveCount(0);
  });
});
