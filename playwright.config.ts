import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One local retry absorbs cold-start preview races; CI keeps two for trace-backed diagnosis.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
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
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'webkit',
      // Software-rendered WebKit on loaded CI runners delivers frames slowly,
      // so Playwright's actionability "stable" check (two identical rAF boxes)
      // needs a larger budget than the Chromium projects.
      use: { ...devices['Desktop Safari'], actionTimeout: 30_000 },
    },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Mini'], browserName: 'chromium' },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 15 Pro'],
        browserName: 'webkit',
        actionTimeout: 30_000,
      },
    },
  ],
});
