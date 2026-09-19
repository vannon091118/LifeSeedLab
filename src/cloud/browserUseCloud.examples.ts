/**
 * Browser Use Cloud — Usage Examples
 *
 * Run with: npx tsx src/cloud/browserUseCloud.examples.ts
 * (requires tsx: npm i -D tsx)
 *
 * Set BROWSER_USE_API_KEY in .env.local first!
 */

import {
  createCloudBrowser,
  runCloudAgent,
  waitForAgentRun,
} from './browserUseCloud';

/**
 * Example 1: Standalone Browser (CDP) — drive with Playwright
 */
export async function exampleStandaloneBrowser() {
  console.log('🌐 Creating cloud browser...');

  const { browser, stop } = await createCloudBrowser({
    proxyCountryCode: 'de',
    browserScreenWidth: 1440,
    browserScreenHeight: 900,
    enableRecording: true,
  });

  console.log('✅ Browser created:', browser.id);
  console.log('🔗 CDP URL:', browser.cdpUrl);
  console.log('👁️  Live view:', browser.liveUrl);

  // --- CONNECT PLAYWRIGHT HERE ---
  // import { chromium } from 'playwright';
  // const pw = await chromium.connectOverCDP(browser.cdpUrl);
  // const page = pw.contexts()[0]?.pages()[0] ?? await pw.newPage();
  // await page.goto('https://example.com');
  // await page.screenshot({ path: 'screenshot.png' });
  // await pw.close();
  // --------------------------------

  console.log('🛑 Stopping browser (ends billing, stitches recording)...');
  const result = await stop();

  if (result.recordingUrl) {
    console.log('🎬 Recording ready:', result.recordingUrl);
  } else {
    console.log('⚠️  No recording available');
  }
}

/**
 * Example 2: Agent Run (autonomous task)
 */
export async function exampleAgentRun() {
  console.log('🤖 Starting agent run...');

  const run = await runCloudAgent({
    task: 'Go to https://github.com/trending and summarize the top 5 repos in German',
    model: 'gpt-5.6-luna',
    browserSettings: {
      proxyCountryCode: 'de',
      enableRecording: true,
    },
    maxSteps: 50,
  });

  console.log('📋 Run started:', run.id, '— status:', run.status);

  const completed = await waitForAgentRun(run.id, { timeoutMs: 600000 });

  console.log('✅ Completed:', completed.status);
  console.log('📝 Output:', completed.output);
  if (completed.recordingUrl) {
    console.log('🎬 Recording:', completed.recordingUrl);
  }
}

/**
 * Example 3: LifeSeedLab-specific — test game in cloud browser
 */
export async function exampleTestLifeSeedLab() {
  const { browser, stop } = await createCloudBrowser({
    browserScreenWidth: 1920,
    browserScreenHeight: 1080,
    enableRecording: true,
  });

  console.log('🎮 Testing LifeSeedLab at http://localhost:5173 ...');
  console.log('🔗 CDP:', browser.cdpUrl);
  console.log('👁️  Live:', browser.liveUrl);

  // import { chromium } from 'playwright';
  // const pw = await chromium.connectOverCDP(browser.cdpUrl);
  // const page = pw.contexts()[0]?.pages()[0] ?? await pw.newPage();
  // await page.goto('http://host.docker.internal:5173'); // or your tunnel URL
  // // Run game tests...
  // await pw.close();

  const result = await stop();
  if (result.recordingUrl) {
    console.log('🎬 Test recording:', result.recordingUrl);
  }
}

// Uncomment to run:
// await exampleStandaloneBrowser();
// await exampleAgentRun();
// await exampleTestLifeSeedLab();