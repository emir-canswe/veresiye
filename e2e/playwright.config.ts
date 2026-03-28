import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';

/** Windows'ta Playwright alt sürecinde `npm` bazen çalışmaz; `npm.cmd` + Vite'a host verilir. */
const devCommand =
  process.platform === 'win32'
    ? 'npm.cmd run dev -- --host 127.0.0.1 --strictPort'
    : 'npm run dev -- --host 127.0.0.1 --strictPort';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  globalSetup: require.resolve('./global-setup'),
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: devCommand,
    cwd: path.join(__dirname, '../frontend'),
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
