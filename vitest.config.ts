/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    env: {
      // Force a stable timezone so date-dependent logic (`getDate`,
      // `getHours`, `Intl.DateTimeFormat`) is deterministic across
      // machines and CI. Node reads `TZ` at process start; this is the
      // closest runtime override vitest exposes.
      TZ: 'UTC',
    },
  },
});
