import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Vite config. Base path defaults to '/' (user/org site). For a
// project site (https://<user>.github.io/<repo>/) override at build
// time with VITE_BASE_PATH=/<repo>/.
//
// Example workflow snippet for a project site:
//   env:
//     VITE_BASE_PATH: /overlast-logger/
//   run: npm run build

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Overlast Logger',
        short_name: 'Overlast',
        description: 'Log geluid- en trillingsoverlast en genereer een brief aan de gemeente.',
        lang: 'nl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f5f5',
        theme_color: '#2563eb',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Only cache the app shell. User data lives in IndexedDB
        // and is not part of the precache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Don't cache anything that looks like a runtime API call.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Don't enable the SW in dev — it complicates HMR.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
