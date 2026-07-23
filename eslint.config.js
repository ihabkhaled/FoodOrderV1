import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import playwright from 'eslint-plugin-playwright';
import promise from 'eslint-plugin-promise';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import * as regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import architecture from './eslint/architecture-plugin/index.mjs';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'android',
      'ios',
      'functions/lib',
      '.ai/local',
      '.vercel',
      '.worktrees',
      'playwright-report',
      'test-results',
      'ui-shots',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      jsxA11y.flatConfigs.recommended,
      promise.configs['flat/recommended'],
      regexp.configs['flat/recommended'],
      sonarjs.configs.recommended,
      security.configs.recommended,
      unicorn.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
      parserOptions: {
        project: [
          './tsconfig.app.json',
          './tsconfig.node.json',
          './tsconfig.test.json',
          './functions/tsconfig.json',
        ],
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // react-hooks 7's set-state-in-effect fires on guarded mount loaders and
      // profile-synced form initializers; both are benign and test-covered.
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Deterministic import/export ordering (autofixable).
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',

      // TypeScript ergonomics kept from the prior config.
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      // Unicorn: keep the valuable checks, disable rules that fight the
      // established conventions of this codebase (documented, deliberate).
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/no-useless-undefined': ['error', { checkArguments: false }],
      'unicorn/numeric-separators-style': [
        'error',
        {
          onlyIfContainsSeparator: true,
          number: { minimumDigits: 4, groupLength: 3 },
        },
      ],
      'unicorn/prefer-query-selector': 'off',

      // SonarJS: allow the readable nested conditionals and single-line guard
      // clauses this codebase uses deliberately.
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/todo-tag': 'off',
      'sonarjs/no-unenclosed-multiline-block': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/no-floating-point-equality': 'off',
      'sonarjs/no-unused-vars': 'off',

      // Security plugin: object-injection and build-time fs reads are noisy and
      // safe here (typed record access; config files reading package.json).
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

      // Intentional no-op fallbacks (e.g. `.catch(() => {})`) are allowed.
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      // `.then(cb)` as the last handler need not return.
      'promise/always-return': ['error', { ignoreLastCallback: true }],
    },
  },
  {
    files: ['functions/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // v1.6.0 module-first architecture: mechanically enforced on the new
    // layout. Rules are documented in docs/eslint/ and tested in tests/eslint/.
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/modules/**/*.{ts,tsx}',
      'src/shared/**/*.{ts,tsx}',
      'src/platform/**/*.{ts,tsx}',
      'src/packages/**/*.{ts,tsx}',
    ],
    plugins: { architecture },
    rules: {
      'architecture/enforce-file-suffixes': 'error',
      'architecture/no-browser-globals-outside-platform': 'error',
      'architecture/no-cross-module-deep-imports': 'error',
      'architecture/no-env-outside-environment': 'error',
      'architecture/no-hooks-outside-hook-files': 'error',
      'architecture/no-inline-route-strings': 'error',
      'architecture/no-raw-package-imports': 'error',
      'architecture/no-restricted-layer-imports': 'error',
      'architecture/no-typescript-enum': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
  {
    // Public surfaces and providers legitimately export non-component values
    // alongside components (route tables, providers + hooks).
    files: ['src/**/index.ts', 'src/**/*.provider.tsx', 'src/**/*.routes.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Local-device gateways implement async contracts over synchronous storage.
    files: [
      'src/modules/data-access/gateways/local-auth.gateway.ts',
      'src/modules/data-access/gateways/local-data.gateway.ts',
      'src/modules/data-access/gateways/local-order-session.gateway.ts',
      'src/modules/data-access/gateways/local-session-invite.gateway.ts',
      'src/modules/data-access/gateways/local-sharing.gateway.ts',
    ],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  {
    // Unit/integration tests (Vitest + Testing Library). E2E specs use `.spec`
    // and are handled below, so Testing Library never sees Playwright's `page`.
    files: ['tests/**/*.test.{ts,tsx}'],
    extends: [vitest.configs.recommended, testingLibrary.configs['flat/react']],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // ESLint RuleTester registers its cases through vitest dynamically, so
    // SonarJS cannot see any literal `it(...)` calls in these files.
    files: ['tests/eslint/**/*.test.ts'],
    rules: { 'sonarjs/no-empty-test-file': 'off' },
  },
  {
    // jsdom lacks <dialog> methods; prototype polyfills necessarily use
    // `this` inside plain function expressions assigned to the prototype.
    files: ['tests/setup.ts'],
    rules: { 'unicorn/no-this-outside-of-class': 'off' },
  },
  {
    // E2E specs: Playwright conventions.
    files: ['tests/e2e/**/*.spec.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tools/**/*.mjs', 'eslint/**/*.mjs'],
    languageOptions: { globals: globals.node, ecmaVersion: 2024 },
  },
  prettier,
);
