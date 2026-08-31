import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    alias: {
      '@project-saturday/game-content/content': fileURLToPath(
        new URL('../game-content/src/content/index.ts', import.meta.url),
      ),
      '@project-saturday/game-content': fileURLToPath(
        new URL('../game-content/src/index.ts', import.meta.url),
      ),
      '@project-saturday/game-core': fileURLToPath(
        new URL('../game-core/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    name: 'testkit',
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
