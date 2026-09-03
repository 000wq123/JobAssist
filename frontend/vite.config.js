/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ═══════════════════════════════════════════════════════════════════════════
// SEO / Prerender setup
// ───────────────────────────────────────────────────────────────────────────
// The app is a client-side SPA. To make structural routes crawlable for
// search engines and AI search platforms (Perplexity, OpenAI Search, Gemini),
// we run a post-build prerender script (`scripts/prerender.js`) that uses
// Playwright to render each route into static HTML.
//
// NOTE: The service worker (vite-plugin-pwa) was removed. It cached old
// builds and served them long after new code shipped — the root cause of
// "why is the old dashboard still showing". The app now always loads the
// current bundle.
// ═══════════════════════════════════════════════════════════════════════════

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('yoga-layout')) return 'pdf-layout-engine';
          if (
            id.includes('/fontkit/')
            || id.includes('/unicode-properties/')
            || id.includes('/unicode-trie/')
            || id.includes('/dfa/')
            || id.includes('/brotli/')
          ) return 'pdf-font-engine';
          if (id.includes('/@react-pdf/pdfkit/')) return 'pdf-kit';
          if (id.includes('/@react-pdf/')) return 'react-pdf';
          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('/react-router-dom/')
            || id.includes('/react-router/')
            || id.includes('/scheduler/')
          ) return 'vendor';
          if (id.includes('/lucide-react/')) return 'ui';
          return undefined;
        },
      },
    },
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
    include: ['test/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'test-results/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/main.jsx',
        'src/**/index.js',
      ],
      thresholds: {
        lines: 22,
        statements: 21,
        functions: 17,
        branches: 23,
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
