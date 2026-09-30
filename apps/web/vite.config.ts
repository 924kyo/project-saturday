import { DEFAULT_LOCALE, localeMessages } from '@project-saturday/game-content/locales';
import react from '@vitejs/plugin-react';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const applicationName = localeMessages[DEFAULT_LOCALE]['app.title'];

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'football-engines',
              test: /[\\/]packages[\\/]game-core[\\/]src[\\/]games[\\/]/,
              priority: 50,
            },
            {
              name: 'game-core',
              test: /[\\/]packages[\\/]game-core[\\/]src[\\/]/,
              priority: 40,
            },
            {
              // Paired ko-KR/en-US copy grows with content; keep each chunk inside the budget.
              name: 'locales',
              test: /[\\/]packages[\\/]game-content[\\/]src[\\/]locales[\\/]/,
              priority: 50,
              maxSize: 400_000,
            },
            {
              name: 'game-content',
              test: /[\\/]packages[\\/]game-content[\\/]src[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-runtime',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  resolve: {
    conditions: ['source', ...defaultClientConditions],
  },
  plugins: [
    react(),
    VitePWA({
      includeManifestIcons: false,
      registerType: 'prompt',
      manifest: {
        id: '/',
        lang: DEFAULT_LOCALE,
        name: applicationName,
        short_name: applicationName,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#071522',
        theme_color: '#071522',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        // Self-hosted display fonts must be precached, or the broadcast face is lost offline.
        globPatterns: ['**/*.{css,html,ico,js,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    css: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
