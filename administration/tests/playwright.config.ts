import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 10 : undefined, // Resource contention seemed to lead to timeouts at default
  reporter: 'list',
  timeout: process.env.CI ? 2000 : undefined, // DO NOT MODIFY. It is intentionally aggressive.
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
      command: 'cd ../server && DATABASE_PATH=../data/test.db npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_PATH: '../data/test.db',
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
