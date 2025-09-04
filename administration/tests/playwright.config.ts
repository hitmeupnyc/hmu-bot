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
    // Setup project
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: './.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'npm run dev:e2e --workspace=api-server',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev --workspace=client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
