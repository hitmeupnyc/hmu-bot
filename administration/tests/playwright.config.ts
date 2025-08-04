import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2, // Limit to 2 concurrent test files
  reporter: 'list',
  timeout: 5000, // Standard timeout for operations
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

  // Set up test database before running tests
  globalSetup: './global-setup.ts',

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
