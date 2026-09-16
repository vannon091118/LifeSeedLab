import { defineConfig } from 'vitest/config';

// `fsModuleCache` legt die Transform-Ergebnisse inhaltsgehasht in node_modules ab; ohne das
// transformiert jeder Gate-Lauf (und jeder Hook-Commit) die komplette Modulkette neu (~65 % der
// Laufzeit). Korrektheit bleibt: der Cache schlägt über Hashes fehl, nicht über Zeitstempel.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    fsModuleCache: true,
  },
});
