/**
 * Browser Use Cloud — Integration Test for LifeSeedLab
 *
 * Run: npx tsx src/cloud/browserUseCloud.manual.ts
 * Requires: BROWSER_USE_API_KEY in .env.local
 *           Playwright installed (npm i -D playwright && npx playwright install chromium)
 *
 * MANUELL, KEIN TEST: die Datei hieß `*.test.ts` und wurde damit von Vitest eingesammelt —
 * ohne API-Key ruft sie `process.exit(1)` und riss den ganzen Testlauf (und damit das Gate) mit.
 * Deshalb `.manual.ts`: sie läuft nur, wenn man sie ausdrücklich startet.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createCloudBrowser } from './browserUseCloud';
import { chromium, Browser, Page } from 'playwright';

async function testLifeSeedLabInCloud() {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    console.error('❌ BROWSER_USE_API_KEY not set in environment');
    console.error('   Create .env.local with: BROWSER_USE_API_KEY=bu_xxx');
    process.exit(1);
  }

  console.log('🌐 Creating NEW cloud browser for LifeSeedLab QA test...');

  const { browser: cloudBrowser, stop } = await createCloudBrowser({
    proxyCountryCode: 'de',
    browserScreenWidth: 1920,
    browserScreenHeight: 1080,
    enableRecording: true,
  });

  console.log('✅ Cloud browser created:', cloudBrowser.id);
  console.log('🔗 CDP URL:', cloudBrowser.cdpUrl);
  console.log('👁️  Live view:', cloudBrowser.liveUrl);

  let pwBrowser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Connect Playwright to cloud browser via CDP
    console.log('🔌 Connecting Playwright...');
    pwBrowser = await chromium.connectOverCDP(cloudBrowser.cdpUrl);
    const contexts = pwBrowser.contexts();
    const context = contexts[0] || await pwBrowser.newContext();
    page = context.pages()[0] || await context.newPage();

    // Navigate to local dev server (via tunnel)
    const testUrl = process.env.TEST_URL ?? 'http://host.docker.internal:5173';
    console.log(`🌍 Navigating to ${testUrl}...`);

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Basic checks
    const title = await page.title();
    console.log('📄 Page title:', title);

    // QA: Wait for game canvas with retry
    console.log('🔍 Waiting for game canvas...');
    let canvas = null;
    for (let i = 0; i < 10; i++) {
      canvas = await page.$('canvas');
      if (canvas) break;
      console.log(`   Attempt ${i + 1}/10 - waiting...`);
      await page.waitForTimeout(2000);
    }

    if (canvas) {
      console.log('✅ Game canvas found');
      const bbox = await canvas.boundingBox();
      console.log('📐 Canvas size:', bbox?.width, 'x', bbox?.height);

      // QA: Check canvas is interactive (not just loading screen)
      const canvasVisible = await canvas.isVisible();
      console.log('👁️ Canvas visible:', canvasVisible);

      // QA: Take screenshot of loaded game
      await page.screenshot({ path: 'cloud-test-game-loaded.png', fullPage: true });
      console.log('📸 Screenshot saved: cloud-test-game-loaded.png');

      // QA: Try to find and click Start/Run button
      console.log('🔍 Looking for Start/Run button...');
      const startSelectors = [
        'button:has-text("Start")',
        'button:has-text("Run")',
        'button:has-text("START")',
        'button:has-text("RUN")',
        '[data-testid="start-run"]',
        'button:has-text("Los")',
        'button:has-text("Spiel starten")',
      ];

      let startButton = null;
      for (const selector of startSelectors) {
        startButton = await page.$(selector);
        if (startButton) {
          console.log(`✅ Start button found with selector: ${selector}`);
          break;
        }
      }

      if (startButton) {
        console.log('🎮 Clicking Start button...');
        await startButton.click();
        await page.waitForTimeout(5000);

        // QA: Check if game actually started (wave indicator, prep phase ended)
        await page.screenshot({ path: 'cloud-test-after-start.png', fullPage: true });
        console.log('📸 Screenshot after start: cloud-test-after-start.png');

        // QA: Look for wave number, energy, prep phase indicator
        const waveElement = await page.$('[data-wave], .wave-number, text=/Welle|Wave/');
        const energyElement = await page.$('[data-energy], .energy, text=/Energie|Energy/');
        const prepElement = await page.$('[data-phase="prep"], .prep-phase, text=/Vorbereitung|Prep/');

        console.log('📊 Wave indicator:', waveElement ? 'found' : 'not found');
        console.log('📊 Energy indicator:', energyElement ? 'found' : 'not found');
        console.log('📊 Prep phase indicator:', prepElement ? 'found' : 'not found');

        // QA: Try placing a plant (click on canvas, then click a slot)
        console.log('🌱 Attempting plant placement test...');
        const bbox = await canvas.boundingBox();
        if (bbox) {
          // Click center of canvas (might open placement)
          await page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'cloud-test-placement-attempt.png', fullPage: true });
          console.log('📸 Screenshot after placement attempt: cloud-test-placement-attempt.png');
        }
      } else {
        console.log('⚠️  No Start button found — game might already be running or different UI');
        // Check for other game state indicators
        const bodyText = await page.textContent('body');
        console.log('📄 Body text preview:', bodyText?.slice(0, 500));
      }

    } else {
      console.log('❌ No canvas found after retries — game failed to load');
      await page.screenshot({ path: 'cloud-test-no-canvas.png', fullPage: true });
      console.log('📸 Error screenshot: cloud-test-no-canvas.png');

      // Debug: Check what's on the page
      const allText = await page.textContent('body');
      console.log('📄 Page content:', allText?.slice(0, 1000));
    }

    console.log('✅ QA test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (page) {
      await page.screenshot({ path: 'cloud-test-error.png', fullPage: true });
      console.log('📸 Error screenshot: cloud-test-error.png');
    }
    throw error;
  } finally {
    if (pwBrowser) {
      await pwBrowser.close();
    }
    console.log('🛑 Stopping cloud browser (ends billing, stitches recording)...');
    const result = await stop();
    if (result.recordingUrl) {
      console.log('🎬 Recording ready:', result.recordingUrl);
    } else {
      console.log('⚠️  No recording available');
    }
  }
}

testLifeSeedLabInCloud().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});