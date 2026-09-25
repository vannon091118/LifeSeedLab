import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Eigene Testkonfiguration für das lokale Shinon-Tooling.
 *
 * Die Projekt-Suite (`vitest.config.ts` im Root) prüft ausschließlich `src/**` — sie bleibt
 * unangetastet, weil `tools/` lokales Agent-Tooling ist und in fremden Klonen fehlen darf.
 * Aufruf: `node node_modules/vitest/vitest.mjs run --config tools/vitest.config.ts`
 *
 * Die Timeouts sind bewusst großzügig: die Tests fahren echte Git-Prozesse, und jeder Prozessstart
 * kostet unter Windows mehrere hundert Millisekunden. Sie messen Verhalten, nicht Geschwindigkeit.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../node_modules/.vite', import.meta.url)),
  test: {
    include: ['shinon/**/*.test.ts', 'indexer/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
