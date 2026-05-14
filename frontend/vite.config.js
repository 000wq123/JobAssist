/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // Vitest configuration. Vitest 4 reads from this same config file unless a
  // dedicated vitest.config.js is provided; we centralise it here so there is
  // exactly one source of truth.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    // Only run unit/component tests under /test. The /e2e directory is owned
    // by Playwright (see playwright.config.js) and must NOT be picked up by
    // vitest, otherwise Playwright's `test()` API explodes inside the vitest
    // runner.
    include: ['test/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'test-results/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/**/index.js',
        // Manual debug helper, see file header.
        'src/utils/authTest.js',
      ],
      // Floors are calibrated just below the current measured coverage so
      // that any regression fails CI while leaving small natural variance
      // headroom. Ratchet up as new tests land. Run with `npx vitest run
      // --coverage` to see the full report under coverage/ (HTML + lcov).
      //
      // Current measured (2026-05-13): lines 23.27, stmts 22.04, fns 18.21,
      // branches 24.51. The well-tested src/utils/ folder gets its own
      // tighter sub-threshold below to lock that quality in.
      thresholds: {
        lines: 22,
        statements: 21,
        functions: 17,
        branches: 23,
        // Per-glob thresholds: src/utils/ is the most thoroughly unit-tested
        // surface. Locking it in prevents drift in our pure-logic helpers.
        'src/utils/**': {
          lines: 90,
          statements: 90,
          functions: 95,
          branches: 75,
        },
      },
    },
  },
});
