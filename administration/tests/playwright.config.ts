import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2, // Resource contention seemed to lead to timeouts at default
  reporter: 'list',
  timeout: 1500, // DO NOT MODIFY. It is intentionally aggressive.
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../server && DATABASE_PATH=../server/data/test.db npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_PATH: '../server/data/test.db',
        NODE_ENV: 'test',
      },
    },
    {
      command: 'cd ../client && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
