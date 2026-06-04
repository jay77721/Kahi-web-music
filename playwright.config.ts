import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Kahi Music.
 *
 * - Cross-browser coverage: Chromium (always), WebKit + Firefox (gated by
 *   PW_ALL_BROWSERS=1 so local runs stay fast).
 * - Workers capped at 4 locally and 1 on CI to keep memory predictable.
 * - Reporter: `html` for human review, `list` for local feedback, `dot`
 *   on CI for compact output.
 */

const isCi = !!process.env.CI
const runAllBrowsers = process.env.PW_ALL_BROWSERS === '1'

const baseProjects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
]

const extendedProjects = [
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : 4,
  reporter: isCi
    ? [['dot'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  projects: runAllBrowsers ? [...baseProjects, ...extendedProjects] : baseProjects,
  // Servers are managed externally: backend on :3000, frontend on :3001
  // No webServer config — run pnpm dev manually before testing
})
