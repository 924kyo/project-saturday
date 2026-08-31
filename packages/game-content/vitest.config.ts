import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  root: import.meta.dirname,
  resolve: {
    alias: {
      '@project-saturday/game-core': fileURLToPath(
        new URL('../game-core/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    name: 'game-content',
  },
});
