import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Build-Warnungen sind in diesem Projekt keine Hinweise, sondern Fehler.
 * Die inhaltliche Ursache wird im Code behoben; diese Schleuse verhindert,
 * dass eine neue ineffektive Dynamic-Import-Grenze oder ein übergroßer Chunk
 * erneut als "grün" durchrutscht.
 */
export function blockBuildWarnings(): Plugin {
  return {
    name: 'block-build-warnings',
    enforce: 'post',
    configResolved(config) {
      if (config.command !== 'build') return;
      const logger = config.logger;
      const reject = (message: string): never => {
        throw new Error(`Build warning blocked: ${message}`);
      };
      logger.warn = (message, _options) => reject(message);
      logger.warnOnce = (message, _options) => reject(message);
    },
  };
}

export default defineConfig({
  plugins: [react(), blockBuildWarnings()],
  server: {
    host: '0.0.0.0',
    hmr: false,
    allowedHosts: ['silly-subscriber-pilot-story.trycloudflare.com'],
  },
})
