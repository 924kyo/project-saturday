import { DEFAULT_LOCALE, localeMessages } from '@project-saturday/game-content/locales';
import react from '@vitejs/plugin-react';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const applicationName = localeMessages[DEFAULT_LOCALE]['app.title'];

export default defineConfig({
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
        globPatterns: ['**/*.{css,html,ico,js,png,svg}'],
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
