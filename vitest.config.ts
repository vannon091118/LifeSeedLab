import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dirs: ['src'],
    exclude: ['tests/**'],
  },
})