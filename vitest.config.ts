import { defineConfig } from 'vitest/config';

// Root Vitest config. Each package may extend this via packages/<name>/vitest.config.ts
// when it needs DOM, jsdom, or extra setup.
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'packages/**/*.{test,spec}.{ts,tsx}',
      'apps/**/*.{test,spec}.{ts,tsx}',
      // Pure, runtime-agnostic helpers under supabase/functions/**/_lib are
      // unit-tested with Vitest under Node 22 (same Web Crypto as Deno). The
      // Deno-only entrypoints (index.ts) and any file importing Deno globals
      // are smoke-tested via `supabase functions serve` instead.
      'supabase/functions/**/_lib/*.{test,spec}.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'packages/**/src/**/*.{ts,tsx}',
        'apps/**/src/**/*.{ts,tsx}',
        'supabase/functions/**/_lib/**/*.ts',
      ],
      exclude: ['**/node_modules/**', '**/dist/**', '**/generated/**', '**/*.d.ts', '**/index.ts'],
    },
  },
});
