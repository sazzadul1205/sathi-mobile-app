// playwright.config.js
// End-to-end tests (Chromium). Drives the real app through the Vite dev server
// and a real IndexedDB — no mocks — to verify every page renders and the core
// flow (sign in → plan → medicines → schedule → settings → sign out) works.
import { defineConfig, devices } from '@playwright/test'

const PORT = 5199
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    // The dev server registers a PWA service worker; block it so every test
    // run is deterministic and always hits the latest source.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Dedicated port + strictPort so we never accidentally test another app
    // already running on 5173. Never reuse an existing server.
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})