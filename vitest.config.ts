import { defineConfig } from 'vitest/config';

// `fsModuleCache` legt die Transform-Ergebnisse inhaltsgehasht in node_modules ab; ohne das
// transformiert jeder Gate-Lauf (und jeder Hook-Commit) die komplette Modulkette neu (~65 % der
// Laufzeit). Korrektheit bleibt: der Cache schlägt über Hashes fehl, nicht über Zeitstempel.
//
// `isolate: false`: Vorher bekam jede der 41 Testdateien einen eigenen Worker (~3,7 s Spawn+
// Environment je Datei) — ~27 s reiner Overhead vor dem ersten Test, gemessen am 16.09.2026
// (Gate-Lauf 60 s, davon 93 % Teststufe). Ohne Isolation teilen sich die Dateien einen
// Worker-Pool: 60 s → ~10 s, und die Parallelitäts-Timeouts in `meta/capping.test.ts`
// (41 Worker im CPU-Kampf) sind weg. Global-State ist testseitig gekapselt
// (`persistence/testDom.clearTestStorage()` je beforeEach) — Kollisionen nicht beobachtet.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    fsModuleCache: true,
    isolate: false,
  },
});
