import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/countdown/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  globalSetup: './tests/e2e/serve.ts',
  projects: [
    { name: 'chromium-mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'webkit-mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['iPhone 13'] } },
    { name: 'chromium-desktop', testMatch: /desktop\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'chromium-performance',
      testMatch: /performance\.spec\.ts/,
      dependencies: ['chromium-mobile', 'webkit-mobile', 'chromium-desktop'],
      use: { ...devices['Pixel 7'] },
    },
  ],
})
