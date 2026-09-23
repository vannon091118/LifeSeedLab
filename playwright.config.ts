import { defineConfig, devices } from '@playwright/test';

/**
 * P-35 (23.09.2026) — Last-Vorbedingung: unter paralleler Last (zweite Playwright-Instanz im
 * selben Worktree) meldete die Lane Zeitüberschreitungen, die isoliert grün sind; ein roter
 * Lauf war nicht mehr von einem echten Defekt unterscheidbar. `globalSetup` nimmt ein PID-Lock
 * (`tests/e2eLock.ts`): ein zweiter Lauf bricht SOFORT mit klarer Meldung ab, statt flaky zu
 * rot — die Lane bleibt unter Last ehrlich (Abbruch statt Scheiterndefekt).
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Playwright hört NUR auf *.spec.ts — die *.test.ts in `tests/` (z. B. der P-35-
   * Garde-Vertragstest) gehören der Vitest-Suite. */
  testMatch: '**/*.spec.ts',
  /* P-35: Last-Vorbedingung — siehe Kommentar oben. */
  globalSetup: './tests/e2eLock.ts',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  /* P-35: die unter Last gemesse Worst-Spec braucht ihr volles Budget auch isoliert —
   * unter Last ALLE Budgets pauschal anzuheben versteckt echte Hänger nur länger. */
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 10000
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1, // Restrict to single worker as requested
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/test-classes. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Headed mode - show browser window.
     * Gate-Standard ist headless (reproduzierbar, ohne Fenster-Fokus); sichtbar via
     * `npm run test:e2e:show` (--headed) oder `PW_HEADED=1`. */
    headless: process.env.PW_HEADED !== '1',
  },

  /* Configure projects for major browsers - limited to single browser as requested */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    // Ensure server is ready before tests
    stdout: pipe => {
      pipe.on('data', data => {
        process.stdout.write(data);
      });
    },
    stderr: pipe => {
      pipe.on('data', data => {
        process.stderr.write(data);
      });
    }
  },
});