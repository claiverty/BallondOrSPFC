import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5174';
export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run preview -w @awards/web -- --host 127.0.0.1 --port ${new URL(baseURL).port || '5174'} --strictPort`
      : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: { VITE_DEMO_MODE: 'true' },
  },
});
