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
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'], coverage: { reporter: ['text', 'html', 'lcov'], include: ['src/lib/**', 'src/services/localServices.ts'] } },
});
