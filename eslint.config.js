import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'android', 'ios', '.ai/local'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: { project: ['./tsconfig.app.json', './tsconfig.node.json'] },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // Numbers interpolate safely and are pervasive in UI copy (counts, prices).
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Leading underscore marks intentionally unused (contract params, omit-destructuring).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Context/module files intentionally export a provider component plus its hook.
    files: ['src/state/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // The local-device adapter implements Promise-returning service contracts with
    // synchronous storage; async-without-await is the deliberate pattern there.
    files: ['src/services/localServices.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node, ecmaVersion: 2023 },
  },
);
