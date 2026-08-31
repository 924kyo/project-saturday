import eslint from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '.corepack/**',
      '.npm-cache/**',
      '.pnpm-store/**',
      '.playwright-browsers/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: [
      'packages/game-content/src/**/*.{ts,tsx}',
      'packages/game-core/src/**/*.{ts,tsx}',
      'packages/testkit/src/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Gameplay and simulation randomness must use an explicit seeded RNG.',
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      i18next,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      'i18next/no-literal-string': [
        'error',
        {
          framework: 'react',
          mode: 'jsx-only',
          'should-validate-template': true,
          'jsx-attributes': {
            include: [],
            exclude: [
              'className',
              'data-testid',
              'dir',
              'href',
              'id',
              'key',
              'lang',
              'name',
              'rel',
              'role',
              'src',
              'target',
              'type',
            ],
          },
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}', '**/*.config.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
