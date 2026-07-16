import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('package.json', import.meta.url)), 'utf8'),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: { alias: { '@': fileURLToPath(new URL('src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/firebase/**'],
    coverage: {
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      include: [
        'src/shared/helpers/**',
        'src/modules/data-access/helpers/**',
        'src/modules/data-access/gateways/local-auth.gateway.ts',
        'src/modules/data-access/gateways/local-data.gateway.ts',
        'src/modules/data-access/gateways/local-database.helper.ts',
        'src/modules/data-access/gateways/local-sharing.gateway.ts',
      ],
      // Ratchet floors: pure generic helpers hold 100%; domain helpers and
      // the instrumented local gateways hold their verified levels. Raise
      // these as coverage grows — never lower them to make a run pass.
      thresholds: {
        statements: 85,
        branches: 72,
        functions: 89,
        lines: 91,
        'src/shared/helpers/**': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/modules/data-access/helpers/**': {
          statements: 95,
          branches: 82,
          functions: 100,
          lines: 96,
        },
      },
    },
  },
});
