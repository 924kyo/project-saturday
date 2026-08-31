import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/game-core/vitest.config.ts',
      'packages/game-content/vitest.config.ts',
      'packages/testkit/vitest.config.ts',
      'apps/web/vitest.config.ts',
    ],
  },
});
