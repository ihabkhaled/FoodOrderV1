import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // 1 local retry absorbs cold-start webServer flakes when workers boot in
  // parallel against a just-built preview; CI keeps 2.
  retries: process.env.CI ? 2 : 1,
  reporter: [['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry', actionTimeout: 15_000 },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // E2E always exercises the deterministic local-device adapter, never live Firebase.
    env: { VITE_FORCE_LOCAL_MODE: 'true' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
