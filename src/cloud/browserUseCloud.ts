/**
 * Browser Use Cloud Integration — TypeScript SDK v4
 *
 * Managed cloud browsers with stealth, residential proxies, persistent profiles
 * and live observability. Two products: Agent (goal → done) and Browser (CDP).
 *
 * Docs: https://docs.browser-use.com/cloud/vibecoding
 * API:  https://api.eu.browser-use.com/api/v4 (EU deployment)
 */

import { BrowserUse, type BrowserSessionItemView, type BrowserSessionView, type RunCreateResponse, type RunSummary, type RunBrowserSettings } from 'browser-use-sdk/v4';

export interface CloudBrowserConfig {
  profileId?: string;
  proxyCountryCode?: string; // "de" for default EU proxy, null to disable
  timeout?: number;          // seconds, max 3600 (4 hours = 240 min)
  browserScreenWidth?: number;
  browserScreenHeight?: number;
  allowResizing?: boolean;
  enableRecording?: boolean;
}

export interface CloudBrowserResult {
  id: string;
  cdpUrl: string;
  liveUrl: string;
  recordingUrl?: string;
  recordingAvailable: boolean;
}

export interface CloudAgentRunConfig {
  task: string;
  model?: string;                    // "gpt-5.6-luna" | "gpt-5.6-sol" | custom provider
  browserSettings?: CloudBrowserConfig;
  maxSteps?: number;
  temperature?: number;
}

export interface CloudAgentRunResult {
  id: string;
  status: 'queued' | 'dispatching' | 'running' | 'completed' | 'failed' | 'cancelled';
  output?: string;
  steps: number;
  recordingUrl?: string;
}

/**
 * Creates a standalone cloud browser (CDP) — you drive it via Playwright/Puppeteer/Selenium.
 * IMPORTANT: Call stop() to end billing and get recording. Dropping CDP does NOT stop billing.
 */
export async function createCloudBrowser(
  config: CloudBrowserConfig = {}
): Promise<{
  browser: CloudBrowserResult;
  stop: () => Promise<CloudBrowserResult>;
}> {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    throw new Error('BROWSER_USE_API_KEY not set. Add to .env.local or environment.');
  }

  const client = new BrowserUse({
    apiKey,
    baseUrl: 'https://api.eu.browser-use.com/api/v4',
  });

  const browser = await client.browsers.create({
    profileId: config.profileId,
    proxyCountryCode: (config.proxyCountryCode ?? 'de') as any,
    timeout: config.timeout ?? 60,
    browserScreenWidth: config.browserScreenWidth ?? 1440,
    browserScreenHeight: config.browserScreenHeight ?? 900,
    allowResizing: config.allowResizing ?? true,
    enableRecording: config.enableRecording ?? true,
  });

  const stop = async (): Promise<CloudBrowserResult> => {
    // stop() returns BrowserSessionView with recordingUrl (stitched after stop)
    const done = await client.browsers.stop(browser.id);
    return {
      id: done.id,
      cdpUrl: done.cdpUrl!,
      liveUrl: done.liveUrl!,
      recordingUrl: done.recordingUrl ?? undefined,
      recordingAvailable: !!done.recordingUrl,
    };
  };

  return {
    browser: {
      id: browser.id,
      cdpUrl: browser.cdpUrl!,
      liveUrl: browser.liveUrl!,
      recordingAvailable: false,
    },
    stop,
  };
}

/**
 * Runs an Agent task (natural language goal → autonomous completion).
 * Returns run ID and status. Poll for completion or use waitForAgentRun().
 */
export async function runCloudAgent(
  config: CloudAgentRunConfig
): Promise<CloudAgentRunResult> {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    throw new Error('BROWSER_USE_API_KEY not set. Add to .env.local or environment.');
  }

  const client = new BrowserUse({
    apiKey,
    baseUrl: 'https://api.eu.browser-use.com/api/v4',
  });

  // Pass model explicitly (TS union may lag behind API)
  const run = await client.runs.create({
    task: config.task,
    model: (config.model ?? 'gpt-5.6-luna') as any,
    browserSettings: config.browserSettings ? {
      profileId: config.browserSettings.profileId,
      proxyCountryCode: (config.browserSettings.proxyCountryCode ?? 'de') as any,
      screenWidth: config.browserSettings.browserScreenWidth,
      screenHeight: config.browserSettings.browserScreenHeight,
      record: config.browserSettings.enableRecording,
    } : undefined,
  } as any);

  return {
    id: run.id,
    status: run.status,
    steps: 0,
  };
}

/**
 * Polls an agent run until completion (or timeout).
 * Uses the SDK's built-in waitForCompletion for efficiency.
 */
export async function waitForAgentRun(
  runId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<CloudAgentRunResult> {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    throw new Error('BROWSER_USE_API_KEY not set.');
  }

  const client = new BrowserUse({
    apiKey,
    baseUrl: 'https://api.eu.browser-use.com/api/v4',
  });

  const run = await client.runs.waitForCompletion(runId, {
    timeout: options.timeoutMs,
    interval: options.intervalMs,
  });

  return {
    id: run.id,
    status: run.status,
    output: run.result ?? undefined,
    steps: run.totalInputTokens + run.totalOutputTokens, // proxy for steps
    recordingUrl: undefined, // not in RunSummary, would need browser lookup
  };
}

/**
 * Connects Playwright to a cloud browser CDP endpoint.
 * Usage:
 *   const { browser, stop } = await createCloudBrowser();
 *   const pw = await chromium.connectOverCDP(browser.cdpUrl);
 *   const page = pw.contexts()[0]?.pages()[0] ?? await pw.newPage();
 *   // ... do stuff ...
 *   await pw.close();
 *   const result = await stop(); // ends billing, returns recording URL
 */
export { BrowserUse } from 'browser-use-sdk/v4';