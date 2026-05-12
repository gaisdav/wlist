import { defineConfig } from 'vitest/config';

// Root Vitest config. Each package may extend this via packages/<name>/vitest.config.ts
// when it needs DOM, jsdom, or extra setup.
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.{ts,tsx}', 'apps/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/**/src/**/*.{ts,tsx}', 'apps/**/src/**/*.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/generated/**', '**/*.d.ts', '**/index.ts'],
    },
  },
});
