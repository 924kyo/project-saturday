import react from '@vitejs/plugin-react';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    conditions: ['source', ...defaultClientConditions],
  },
  plugins: [react(), VitePWA({ registerType: 'prompt' })],
  test: {
    css: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    name: 'web',
    setupFiles: ['./src/test/setup.ts'],
  },
});
